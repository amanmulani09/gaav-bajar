import { createMMKV } from "react-native-mmkv";
import * as SecureStore from "expo-secure-store";
import { getRandomBytesAsync } from "expo-crypto";
import { localStorage } from "./local";

const keyName = "gaav-bajar.auth-encryption-key";
let storage: Promise<ReturnType<typeof createMMKV>> | undefined;

function removeLegacy(key: string) {
  if (localStorage.getString(key) === undefined) return;
  localStorage.remove(key);
  localStorage.trim();
}

function authStorage() {
  return storage ??= (async () => {
    let key = await SecureStore.getItemAsync(keyName);
    if (!key) {
      const bytes = await getRandomBytesAsync(16);
      key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      await SecureStore.setItemAsync(keyName, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    return createMMKV({ id: "gaav-bajar-auth", encryptionKey: key, encryptionType: "AES-256" });
  })().catch((error) => {
    storage = undefined;
    throw error; // Never fall back to plaintext if secure storage fails.
  });
}

export const supabaseStorage = {
  async getItem(key: string) {
    const secure = await authStorage();
    const existing = secure.getString(key);
    const legacy = localStorage.getString(key);
    if (existing !== undefined) {
      removeLegacy(key);
      return existing;
    }
    if (legacy === undefined) return null;
    secure.set(key, legacy);
    removeLegacy(key);
    return legacy;
  },
  async setItem(key: string, value: string) {
    (await authStorage()).set(key, value);
    removeLegacy(key);
  },
  async removeItem(key: string) {
    (await authStorage()).remove(key);
    removeLegacy(key);
  },
};
