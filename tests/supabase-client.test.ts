import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn(() => ({ auth: {} })), addEventListener: vi.fn() }));
vi.mock("react-native-url-polyfill/auto", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("react-native", () => ({ Platform: { OS: "android" }, AppState: { addEventListener: mocks.addEventListener } }));
vi.mock("../src/core/storage/auth", () => ({ supabaseStorage: {} }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.resetModules(); });
it.each([
  [undefined, undefined],
  ["not a url", "public-key"],
  ["https://YOUR_PROJECT.supabase.co", "YOUR_PUBLIC_KEY"],
  ["ftp://project.supabase.co", "public-key"],
  ["https://project.supabase.co", ""],
  ["https://project.supabase.co", "sb_secret_private"],
])("keeps invalid configuration offline (%s)", async (url, key) => {
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", key);
  const client = await import("../src/core/supabase/client");
  expect(client.configured).toBe(false);
  expect(mocks.createClient).toHaveBeenCalledWith("https://not-configured.supabase.co", "not-configured", expect.objectContaining({ auth: expect.objectContaining({ persistSession: false, autoRefreshToken: false }) }));
  expect(mocks.addEventListener).not.toHaveBeenCalled();
});
it("uses trimmed public configuration and persistent PKCE", async () => {
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", " https://project.supabase.co ");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", " sb_publishable_test ");
  expect((await import("../src/core/supabase/client")).configured).toBe(true);
  expect(mocks.createClient).toHaveBeenCalledWith("https://project.supabase.co", "sb_publishable_test", expect.objectContaining({ auth: expect.objectContaining({ persistSession: true, autoRefreshToken: true, flowType: "pkce" }) }));
  expect(mocks.addEventListener).toHaveBeenCalledTimes(1);
});
