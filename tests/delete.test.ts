import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
import { deleteHandler } from "../supabase/functions/_shared/delete";

let files: Set<string>,
  events: string[],
  failStorage: boolean,
  authenticated: boolean,
  owned: boolean;
const user = "11111111-1111-4111-8111-111111111111";
const listing = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function request(input: unknown, token = true) {
  return new Request("https://example.test/delete", {
    method: "POST",
    headers: token ? { Authorization: "Bearer test-token" } : {},
    body: JSON.stringify(input),
  });
}
beforeEach(() => {
  files = new Set([`${user}/${listing}/one.jpg`, `${user}/other/two.jpg`]);
  events = [];
  failStorage = false;
  authenticated = true;
  owned = true;
  vi.stubGlobal("Deno", { env: { get: () => "test-value" } });
  mocks.createClient.mockReturnValue({
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: user } : null },
        error: null,
      }),
      admin: {
        deleteUser: async () => {
          events.push("delete-auth");
          return { error: null };
        },
      },
    },
    from: (table: string) => {
      let operation = "";
      const builder = {
        select: () => builder,
        update: () => {
          operation = `hide-${table}`;
          return builder;
        },
        delete: () => {
          operation = `delete-${table}`;
          return builder;
        },
        eq: () => builder,
        maybeSingle: async () => ({
          data: owned ? { id: listing } : null,
          error: null,
        }),
        then: (resolve: (value: { error: null }) => void) => {
          events.push(operation);
          resolve({ error: null });
        },
      };
      return builder;
    },
    storage: {
      from: () => ({
        list: async (prefix: string) => {
          const names = new Map<string, { id: string | null; name: string }>();
          for (const file of files)
            if (file.startsWith(`${prefix}/`)) {
              const rest = file.slice(prefix.length + 1),
                [name] = rest.split("/");
              names.set(name, { id: rest.includes("/") ? null : "file", name });
            }
          return { data: [...names.values()], error: null };
        },
        remove: async (paths: string[]) => {
          events.push("remove-files");
          if (failStorage) return { error: new Error("storage down") };
          paths.forEach((path) => files.delete(path));
          return { error: null };
        },
      }),
    },
  });
});
describe("deletion handlers", () => {
  it("rejects missing or invalid auth before mutations", async () => {
    expect(
      (await deleteHandler(true)(request({ confirm: true }, false))).status,
    ).toBe(401);
    authenticated = false;
    expect((await deleteHandler(true)(request({ confirm: true }))).status).toBe(
      401,
    );
    expect(events).toEqual([]);
  });
  it("requires explicit destructive-action confirmation", async () => {
    expect((await deleteHandler(true)(request({}))).status).toBe(400);
    expect(events).toEqual([]);
  });
  it("hides account, removes every storage folder, then deletes auth", async () => {
    const response = await deleteHandler(true)(request({ confirm: true }));
    expect(response.status).toBe(200);
    expect(files.size).toBe(0);
    expect(events[0]).toBe("hide-profiles");
    expect(events.at(-1)).toBe("delete-auth");
  });
  it("does not delete account on failed storage cleanup and succeeds on retry", async () => {
    failStorage = true;
    expect((await deleteHandler(true)(request({ confirm: true }))).status).toBe(
      500,
    );
    expect(events).not.toContain("delete-auth");
    expect(files.size).toBe(2);
    failStorage = false;
    expect((await deleteHandler(true)(request({ confirm: true }))).status).toBe(
      200,
    );
    expect(files.size).toBe(0);
  });
  it("deletes only owned listing folder before its row", async () => {
    expect(
      (await deleteHandler(false)(request({ id: listing, confirm: true })))
        .status,
    ).toBe(200);
    expect([...files]).toEqual([`${user}/other/two.jpg`]);
    expect(events).toEqual([
      "hide-listings",
      "remove-files",
      "delete-listings",
    ]);
  });
  it("does not mutate missing or foreign listings", async () => {
    owned = false;
    expect(
      (await deleteHandler(false)(request({ id: listing, confirm: true })))
        .status,
    ).toBe(200);
    expect(events).toEqual([]);
    expect(files.size).toBe(2);
  });
});
