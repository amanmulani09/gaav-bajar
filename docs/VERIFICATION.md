# Verification — 20 September 2026

## Passed locally

- TypeScript strict type check.
- 63 automated tests: input/location/translation/WhatsApp validation; actual migration execution and RLS/grant behavior in PGlite; posting limits; moderation; private contact access; blocking; suspension; idempotent photo retries; OAuth callback validation/deduplication, cancellation, exchange retry, invalid configuration; deletion order and cleanup failure retry.
- Android Hermes JavaScript/assets export and web export.
- Expo Android prebuild/config generation.
- Browser UI at a 360px viewport: Marathi/Hindi switch, district selector, guest account screen, in-app Hindi privacy policy with Zero21 Studio contact. Language preference persisted on reload.
- Generated public policy pages use Zero21 Studio and zero21studiocompany@gmail.com. They are local files, not hosted yet.

## Remaining release checks

- Hosted Supabase deployment and unauthenticated smoke checks passed (see below). Google OAuth credentials, authenticated Storage workflows, and signed Android integration remain pending. Local SQL tests still stub auth/storage schemas and local deletion tests mock network APIs.
- Signed Android device workflow, photo picker on real hardware, telephone/WhatsApp handoff, and Play submission are not verified by a JavaScript export.
- Owner must host public policy pages, provide Google/Play/EAS setup, review translations, and collect 20 real consented listings.
- Expo Doctor: 20/21 checks pass. Its compatibility service requests `expo@57.0.24`, `expo-image-picker@57.0.19`, and `expo-image-manipulator@57.0.19`; npm returns 404 for each at verification time. Project pins available stable versions 57.0.23/57.0.18/57.0.18. Do not switch to preview SDK 58 to silence this. Upgrade to the matching stable patches when published, then rerun checks.
- Dependency audit after patched test/image tooling: 0 critical, 0 high, 10 moderate (Expo/xcode/uuid toolchain), 1 low (esbuild development server). Do not apply audit's suggested Expo downgrade to SDK 46. Review upstream fixes before release; do not expose dev servers publicly.

See RELEASE.md for real-device and production acceptance steps. No production listings or fake KYC claims are included.

## Hosted Supabase setup — 20 September 2026

Project: `kzfajcdbnkbchfywgbjz` (`gaav-bajar`), Mumbai region. Setup used the owner's signed-in Supabase dashboard.

- Preflight found zero public tables, Auth users, and Storage buckets.
- Applied the four repository migrations in one transaction. Recorded their versions and source in `supabase_migrations.schema_migrations` so future CLI pushes can recognize them. Migration history has RLS and no public/anon/authenticated access.
- Verified 13 public tables, all with RLS; 36 districts; 358 talukas; four migration records; private `listing-photos` bucket.
- Deployed `account-delete` and `listing-delete`. Browser editor deployments inline the unchanged shared handler and append the appropriate `Deno.serve(deleteHandler(...))` entry point. Future CLI deployments should use the checked-in shared files and config.
- Both functions use `verify_jwt=false` at the legacy gateway and retain server-side `auth.getUser(token)` authentication before privileged operations.
- Saved exact redirects `gaavbajar://auth/callback` and `https://gaav-bajar.vercel.app/auth/callback`. Existing Site URL remains `http://localhost:3000`; the app passes its explicit callback.

## Web deployment — 2026-09-20

- Branding update deployed as `dpl_H15raEWyniw9PoHauj7TGFfQPHWt`: header uses the existing custom house-and-leaf logo, favicon source is 256px, and public privacy/terms/account-deletion pages are included in web exports. Web and Android exports passed; 63 tests passed. Live header visually verified.
- Google Branding now has the production homepage, privacy policy, terms links, and `gaav-bajar.vercel.app` authorized domain. App name is `Gaav Bajar`. Logo upload is blocked by Chrome extension file URL access. Google brand verification/publication is still pending; do not claim the Supabase domain label has been replaced.

- Published the current local Expo web export at https://gaav-bajar.vercel.app through Vercel CLI. Deployment `dpl_8sSHrfPtdioABGM3R2FYiC32CqyZ` is Ready; Git auto-deploy is not connected.
- `npm run check`: 63 tests passed. Fresh web export succeeded. Exported app rendered and loaded Supabase districts; production home page rendered and `/auth/callback` returned HTTP 200.
- Google provider and exact production callback are configured. End-to-end Google login and native-device checks remain pending.
- Wrote project URL and publishable key to ignored local `.env`; public policy origin remains blank until hosted.
- Live REST checks: districts HTTP 200 (36), talukas HTTP 200 (358), listings HTTP 200 (empty), private contacts HTTP 401 for guest. SQL also confirms authenticated users have no direct private-contact SELECT grant.
- Both deployed functions returned HTTP 401 with `loginRequired` for absent and invalid bearer tokens. No account or listing was deleted during checks.

Google provider is now enabled with the Web OAuth client from Google Cloud project `gaav-bajar`. Credentials were transferred directly from the Google client-creation dialog into Supabase; no secret was written to the repository. Google displayed testing-mode restrictions; tester access and end-to-end sign-in still need verification. Email provider retains its default setting. Full Google login, two-account authorization, authenticated uploads/deletions, session refresh, and native Android checks remain open. EAS remote environment variables have not been configured.

- After environment setup, TypeScript and all 63 tests passed. Android export with `--clear` passed and its Hermes bundle contains the configured project URL. Restart local Expo with `npx expo start --clear` to replace any cached unconfigured bundle.
