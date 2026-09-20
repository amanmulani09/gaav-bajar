import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  legacy: new Map<string, string>(),
  encrypted: new Map<string, string>(),
  getKey: vi.fn(), setKey: vi.fn(), create: vi.fn(), set: vi.fn(), random: vi.fn(), trim: vi.fn(),
}));
vi.mock("../src/core/storage/local", () => ({ localStorage: {
  getString: (key: string) => mocks.legacy.get(key),
  remove: (key: string) => mocks.legacy.delete(key),
  trim: mocks.trim,
} }));
vi.mock("react-native-mmkv", () => ({ createMMKV: mocks.create }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: mocks.getKey, setItemAsync: mocks.setKey,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
}));
vi.mock("expo-crypto", () => ({ getRandomBytesAsync: mocks.random }));

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  mocks.legacy.clear(); mocks.encrypted.clear();
  mocks.getKey.mockResolvedValue(null);
  mocks.random.mockResolvedValue(new Uint8Array(16).fill(42));
  mocks.set.mockImplementation((key: string, value: string) => mocks.encrypted.set(key, value));
  mocks.create.mockReturnValue({ getString: (key: string) => mocks.encrypted.get(key), set: mocks.set, remove: (key: string) => mocks.encrypted.delete(key) });
});

it("migrates a large legacy session only after encrypted persistence succeeds", async () => {
  const value = "session".repeat(1000);
  mocks.legacy.set("session", value);
  const { supabaseStorage } = await import("../src/core/storage/auth.native");
  expect(await supabaseStorage.getItem("session")).toBe(value);
  expect(mocks.encrypted.get("session")).toBe(value);
  expect(mocks.legacy.has("session")).toBe(false);
  expect(mocks.trim).toHaveBeenCalledOnce();
  expect(mocks.create).toHaveBeenCalledWith({ id: "gaav-bajar-auth", encryptionKey: "2a".repeat(16), encryptionType: "AES-256" });
  expect(mocks.setKey).toHaveBeenCalledWith(expect.any(String), "2a".repeat(16), { keychainAccessible: "device-only" });
});

it("initializes one encryption key for concurrent requests and removes both copies on logout", async () => {
  const { supabaseStorage } = await import("../src/core/storage/auth.native");
  await Promise.all([supabaseStorage.setItem("session", "new"), supabaseStorage.setItem("verifier", "pkce")]);
  expect(mocks.setKey).toHaveBeenCalledOnce();
  mocks.legacy.set("session", "stale");
  await supabaseStorage.removeItem("session");
  expect(await supabaseStorage.getItem("session")).toBeNull();
  expect(mocks.legacy.has("session")).toBe(false);
});

it("reuses the key and never replaces an updated encrypted session with stale plaintext", async () => {
  mocks.getKey.mockResolvedValue("existing-key");
  mocks.encrypted.set("session", "new"); mocks.legacy.set("session", "old");
  const { supabaseStorage } = await import("../src/core/storage/auth.native");
  expect(await supabaseStorage.getItem("session")).toBe("new");
  expect(mocks.legacy.has("session")).toBe(false);
  expect(mocks.setKey).not.toHaveBeenCalled();
});

it("fails closed when key storage fails and permits a later retry", async () => {
  mocks.setKey.mockRejectedValueOnce(new Error("locked"));
  mocks.legacy.set("session", "old");
  const { supabaseStorage } = await import("../src/core/storage/auth.native");
  await expect(supabaseStorage.getItem("session")).rejects.toThrow("locked");
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.legacy.get("session")).toBe("old");
  expect(await supabaseStorage.getItem("session")).toBe("old");
});

it("retains legacy data if encrypted migration fails", async () => {
  mocks.set.mockImplementation(() => { throw new Error("write failed"); });
  mocks.legacy.set("session", "old");
  const { supabaseStorage } = await import("../src/core/storage/auth.native");
  await expect(supabaseStorage.getItem("session")).rejects.toThrow("write failed");
  expect(mocks.legacy.get("session")).toBe("old");
});
