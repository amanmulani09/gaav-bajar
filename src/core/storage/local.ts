import { createMMKV } from "react-native-mmkv";

export const localStorage = createMMKV({ id: "gaav-bajar" });

export const supabaseStorage = {
  getItem: (key: string) => localStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => localStorage.set(key, value),
  removeItem: (key: string) => {
    localStorage.remove(key);
  },
};
