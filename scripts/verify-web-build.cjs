const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!url || !key || /YOUR_|PLACEHOLDER/i.test(`${url} ${key}`)) {
  throw new Error(
    "Web build is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}
if (key.startsWith("sb_secret_")) {
  throw new Error("A Supabase secret key must never be embedded in the web app.");
}

const folder = "dist/_expo/static/js/web";
const bundle = readdirSync(folder).find((name) => name.endsWith(".js"));
if (!bundle) throw new Error("Web JavaScript bundle was not generated.");
const source = readFileSync(join(folder, bundle), "utf8");
if (!source.includes(url) || !source.includes(key)) {
  throw new Error("Web bundle does not contain the configured public Supabase values.");
}

console.log("Verified public Supabase configuration in the web bundle.");
