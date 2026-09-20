import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { decode } from "base64-arraybuffer";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import {
  Draft,
  Listing,
  ListingStatus,
  Profile,
  normalizePhone,
} from "./domain";

WebBrowser.maybeCompleteAuthSession();
let exchange: { code: string; promise: Promise<void> } | null = null;
export async function finishGoogleLogin(url: string): Promise<void> {
  const code = new URL(url).searchParams.get("code");
  if (!code) throw new Error("loginFailed");
  if (exchange?.code === code) return exchange.promise;
  const promise = (async () => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  })();
  exchange = { code, promise };
  try {
    await promise;
  } catch (error) {
    if (exchange?.code === code) exchange = null;
    throw error;
  }
}

export async function login(): Promise<Session | null> {
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: "gaavbajar",
    path: "auth/callback",
  });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "success") {
    await finishGoogleLogin(result.url);
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    return sessionData.session;
  }
  return null;
}
export async function rpc(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export type ListingFilters = {
  category?: string;
  district?: string;
  taluka?: string;
  search?: string;
};

export async function getListings(
  filters: ListingFilters,
  offset: number,
  limit: number,
): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select("*,listing_photos(path,position)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + limit - 1);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.district) query = query.eq("district_id", filters.district);
  if (filters.taluka) query = query.eq("taluka_id", filters.taluka);
  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[\\%_]/g, "\\$&");
    query = query.ilike("search_text", `%${escaped}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return withPhotos(data as Listing[]);
}

export async function getMyListings(
  ownerId: string,
  offset: number,
  limit: number,
): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*,listing_photos(path,position)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return withPhotos(data as Listing[]);
}

export async function getFavoriteListings(ids: string[]): Promise<Listing[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*,listing_photos(path,position)")
    .eq("status", "active")
    .in("id", ids);
  if (error) throw error;
  const listings = await withPhotos(data as Listing[]);
  const byId = new Map(listings.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*,listing_photos(path,position)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await withPhotos([data as Listing]))[0];
}

export async function getListingStatus(
  id: string,
): Promise<ListingStatus | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as ListingStatus | undefined) || null;
}

export async function getListingPhotoPaths(
  id: string,
): Promise<{ path: string }[]> {
  const { data, error } = await supabase
    .from("listing_photos")
    .select("path")
    .eq("listing_id", id);
  if (error) throw error;
  return data || [];
}
export async function withPhotos(rows: Listing[]): Promise<Listing[]> {
  const paths = rows.flatMap((row) =>
    row.listing_photos.map((photo) => photo.path),
  );
  if (!paths.length) return rows;
  const { data, error } = await supabase.storage
    .from("listing-photos")
    .createSignedUrls(paths, 600);
  if (error) throw error;
  const urls = new Map(data?.map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({
    ...row,
    listing_photos: [...row.listing_photos]
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({ ...photo, url: urls.get(photo.path) || undefined })),
  }));
}
export async function saveDraft(draft: Draft): Promise<string> {
  await rpc("begin_listing", { target: draft.id });
  const uploaded = new Set<string>();
  if (draft.photos.length) {
    const folder = draft.photos[0].path.split("/").slice(0, 2).join("/");
    const { data, error } = await supabase.storage
      .from("listing-photos")
      .list(folder);
    if (error) throw error;
    for (const file of data || []) uploaded.add(`${folder}/${file.name}`);
  }
  for (const photo of draft.photos) {
    if (!photo.base64 || uploaded.has(photo.path)) continue;
    const { error } = await supabase.storage
      .from("listing-photos")
      .upload(photo.path, decode(photo.base64), {
        contentType: "image/jpeg",
        upsert: false,
      });
    // Immutable UUID paths belong to this persisted draft: duplicate means prior retry uploaded it.
    if (error && !("statusCode" in error && String(error.statusCode) === "409"))
      throw error;
  }
  const status = await rpc("save_listing", {
    target: draft.id,
    payload: {
      ...draft,
      // Publishing is allowed only for profiles with recorded onboarding consent.
      // Kept for compatibility with the first database function version.
      consent: true,
      photos: undefined,
      phone: normalizePhone(draft.phone),
      whatsapp: draft.whatsapp ? normalizePhone(draft.whatsapp) : "",
    },
    paths: draft.photos.map((photo) => photo.path),
  });
  // Cleanup is best effort: successful listing publish must not become a failed save.
  await cleanupUnused(draft).catch(() => undefined);
  return status;
}
export async function cleanupUnused(draft: Draft) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const folder = `${user.id}/${draft.id}`;
  const { data, error } = await supabase.storage
    .from("listing-photos")
    .list(folder);
  if (error) throw error;
  const unused =
    data
      ?.map((file) => `${folder}/${file.name}`)
      .filter((path) => !draft.photos.some((photo) => photo.path === path)) ||
    [];
  if (unused.length) {
    const { error: removeError } = await supabase.storage
      .from("listing-photos")
      .remove(unused);
    if (removeError) throw removeError;
  }
}
export async function deleteRemote(id?: string) {
  const { data, error } = await supabase.functions.invoke(
    id ? "listing-delete" : "account-delete",
    { body: { id, confirm: true } },
  );
  if (error || data?.error) throw new Error("deleteRetry");
}
