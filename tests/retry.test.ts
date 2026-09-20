import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
  makeRedirectUri: vi.fn(),
}));
vi.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: mocks.openAuthSessionAsync,
}));
vi.mock("expo-auth-session", () => ({
  makeRedirectUri: mocks.makeRedirectUri,
}));
vi.mock("../src/core/supabase/client.ts", () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: {
      getUser: mocks.getUser,
      getSession: mocks.getSession,
      signInWithOAuth: mocks.signInWithOAuth,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
    },
    storage: {
      from: () => ({
        upload: mocks.upload,
        list: mocks.list,
        remove: mocks.remove,
      }),
    },
  },
}));
import {
  finishGoogleLogin,
  login,
  saveDraft,
} from "../src/core/marketplace/repository";
import { emptyDraft } from "../src/core/marketplace/domain";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.list.mockResolvedValue({ data: [], error: null });
  mocks.makeRedirectUri.mockReturnValue("gaavbajar://auth/callback");
});
it("retries same draft/photo IDs after interrupted publish without upserting", async () => {
  const draft = {
    ...emptyDraft("stable-listing"),
    photos: [
      { path: "owner/stable-listing/stable-photo.jpg", base64: "aGVsbG8=" },
    ],
  };
  mocks.rpc
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: null, error: new Error("offline") });
  mocks.upload.mockResolvedValueOnce({ error: null });
  await expect(saveDraft(draft)).rejects.toThrow("offline");
  mocks.rpc
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: "active", error: null });
  mocks.upload.mockResolvedValueOnce({ error: { statusCode: "409" } });
  expect(await saveDraft(draft)).toBe("active");
  expect(mocks.upload).toHaveBeenCalledTimes(2);
  for (const [path, , options] of mocks.upload.mock.calls) {
    expect(path).toBe(draft.photos[0].path);
    expect(options.upsert).toBe(false);
  }
  expect(
    mocks.rpc.mock.calls
      .filter(([name]) => name === "begin_listing")
      .map(([, args]) => args.target),
  ).toEqual(["stable-listing", "stable-listing"]);
});
it("stops before publish when photo upload fails", async () => {
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.upload.mockResolvedValue({ error: new Error("offline") });
  await expect(
    saveDraft({
      ...emptyDraft("id"),
      photos: [{ path: "photo", base64: "aGVsbG8=" }],
    }),
  ).rejects.toThrow("offline");
  expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(["begin_listing"]);
});

it("skips already uploaded immutable photos when retry staging quota is full", async () => {
  mocks.rpc
    .mockResolvedValueOnce({ error: null })
    .mockResolvedValueOnce({ data: "active", error: null });
  mocks.list.mockResolvedValue({ data: [{ name: "photo.jpg" }], error: null });
  expect(
    await saveDraft({
      ...emptyDraft("id"),
      photos: [{ path: "owner/id/photo.jpg", base64: "aGVsbG8=" }],
    }),
  ).toBe("active");
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("exchanges OAuth code once when browser callback and deep link both arrive", async () => {
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  await Promise.all([
    finishGoogleLogin("gaavbajar://auth/callback?code=once"),
    finishGoogleLogin("gaavbajar://auth/callback?code=once"),
  ]);
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1);
});
it("asks Google to show account chooser and returns authenticated session", async () => {
  const session = { user: { id: "owner" } };
  mocks.signInWithOAuth.mockResolvedValue({
    data: { url: "https://accounts.google.com/oauth" },
    error: null,
  });
  mocks.openAuthSessionAsync.mockResolvedValue({
    type: "success",
    url: "gaavbajar://auth/callback?code=new-code",
  });
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({
    data: { session },
    error: null,
  });

  expect(await login()).toBe(session);
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: {
      redirectTo: "gaavbajar://auth/callback",
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
});

it.each(["cancel", "dismiss"])("returns no session when browser %s", async (type) => {
  mocks.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com/oauth" }, error: null });
  mocks.openAuthSessionAsync.mockResolvedValue({ type });
  expect(await login()).toBeNull();
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(mocks.getSession).not.toHaveBeenCalled();
});
it.each([
  "https://evil.example/auth/callback?code=bad",
  "gaavbajar://auth/other?code=bad",
  "gaavbajar://user@auth/callback?code=bad",
  "not a url",
  "gaavbajar://auth/callback",
  "gaavbajar://auth/callback?error=access_denied&code=bad",
  "gaavbajar://auth/callback?code=bad#error=access_denied",
])("rejects invalid OAuth callback without exchanging: %s", async (url) => {
  await expect(finishGoogleLogin(url)).rejects.toThrow("loginFailed");
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});
it("allows a failed exchange to retry", async () => {
  mocks.exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("offline") }).mockResolvedValueOnce({ error: null });
  const url = "gaavbajar://auth/callback?code=retry-code";
  await expect(finishGoogleLogin(url)).rejects.toThrow("offline");
  await finishGoogleLogin(url);
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(2);
});
it("does not treat a successful callback without a session as cancellation", async () => {
  mocks.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com/oauth" }, error: null });
  mocks.openAuthSessionAsync.mockResolvedValue({ type: "success", url: "gaavbajar://auth/callback?code=no-session" });
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  await expect(login()).rejects.toThrow("loginFailed");
});
