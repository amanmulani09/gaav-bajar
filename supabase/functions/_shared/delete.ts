import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
export function deleteHandler(account: boolean) {
  return async (request: Request): Promise<Response> => {
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (request.method === "OPTIONS") return new Response("ok", { headers });
    if (request.method !== "POST") return reply({ error: "invalid" }, 405);
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer /i, "");
    if (!token) return reply({ error: "loginRequired" }, 401);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);
    if (authError || !user) return reply({ error: "loginRequired" }, 401);
    try {
      const input = await request.json();
      if (input.confirm !== true) return reply({ error: "invalid" }, 400);
      let prefix = user.id;
      if (account) {
        // Hide content and disallow new uploads before deleting files. Retry remains possible.
        const { error } = await admin
          .from("profiles")
          .update({ deleting: true })
          .eq("id", user.id);
        if (error) throw error;
      } else {
        if (typeof input.id !== "string")
          return reply({ error: "invalid" }, 400);
        const { data, error } = await admin
          .from("listings")
          .select("id")
          .eq("id", input.id)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return reply({ ok: true }); // Idempotent retry after successful deletion.
        const { error: hideError } = await admin
          .from("listings")
          .update({ status: "removed" })
          .eq("id", input.id)
          .eq("owner_id", user.id);
        if (hideError) throw hideError;
        prefix += `/${data.id}`;
      }
      const bucket = admin.storage.from("listing-photos");
      async function clear(folder: string): Promise<void> {
        for (;;) {
          const { data, error } = await bucket.list(folder, { limit: 100 });
          if (error) throw error;
          if (!data?.length) break;
          const files = data
            .filter((item) => item.id)
            .map((item) => `${folder}/${item.name}`);
          if (files.length) {
            const { error: removeError } = await bucket.remove(files);
            if (removeError) throw removeError;
          }
          for (const child of data.filter((item) => !item.id))
            await clear(`${folder}/${child.name}`);
        }
      }
      await clear(prefix);
      if (account) {
        const { error } = await admin.auth.admin.deleteUser(user.id);
        if (error) throw error;
      } else {
        const { error } = await admin
          .from("listings")
          .delete()
          .eq("id", input.id)
          .eq("owner_id", user.id);
        if (error) throw error;
      }
      return reply({ ok: true });
    } catch {
      // Never log tokens, phone numbers, or request payloads.
      return reply({ error: "deleteRetry" }, 500);
    }
  };
}
