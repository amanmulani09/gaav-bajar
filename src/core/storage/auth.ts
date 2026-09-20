// Browser sessions remain origin-scoped. Native uses auth.native.ts instead.
import { localStorage } from "./local";

export const supabaseStorage = {
  getItem: (key: string) => localStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => localStorage.set(key, value),
  removeItem: (key: string) => { localStorage.remove(key); },
};
