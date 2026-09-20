import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { supabaseStorage } from "../storage/auth";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const configured = (() => {
  if (!url || !key || /YOUR_|PLACEHOLDER/i.test(`${url} ${key}`)) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      !key.startsWith("sb_secret_")
    );
  } catch {
    return false;
  }
})();
export const supabase = createClient(
  configured ? url! : "https://not-configured.supabase.co",
  configured ? key! : "not-configured",
  {
    auth: {
      storage: supabaseStorage,
      persistSession: configured,
      autoRefreshToken: configured,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  },
);
if (configured && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
