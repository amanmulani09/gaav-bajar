# Supabase connectivity and Google authentication plan

Reviewed 20 September 2026 against commit `68eb312`. The working tree was clean before review; there is no separate pending diff or earlier implementation to compare. This is a review of the current implementation, focused on connectivity and authentication.

## Scope and decision

Assume Android-first delivery, a hosted staging Supabase project first, and the existing browser-based Google OAuth flow. Keep PKCE: it is already implemented and avoids adding a native Google SDK and another credential configuration. Native Google sign-in can be a separate product decision if its account-selection experience becomes necessary. Web production authentication is outside this plan.

Success means a signed Android preview build can browse staging data, sign in with Google, survive restart and token refresh, complete consent/profile setup, and perform authorized marketplace operations. A second account and a guest must fail forbidden operations.

## Current implementation and findings

- `src/core/supabase/client.ts` already provides persistent MMKV sessions, PKCE, token refresh, and foreground/background refresh handling. It uses public URL/key environment variables.
- `src/core/marketplace/repository.ts` already launches Google through Supabase, requests the account chooser, exchanges the authorization code, and deduplicates simultaneous delivery of the same code.
- `src/application/MarketApp.tsx` listens for warm and cold deep links and auth state changes. Profile creation happens through `save_profile` after explicit consent, not automatically on first Google login.
- Four SQL migrations define marketplace data, location data, referrals, consent, grants, RLS, and private photo storage. SQL checks confirmed email plus a Google identity. Deletion functions validate the bearer token before privileged operations.
- **Setup blocker:** README instructs copying `.env.example`, but that file is missing. `.gitignore` contains only `node_modules`, contrary to README's claim that `.env` is ignored. Fix before adding credentials.
- **Configuration failure:** the client checks only truthiness and one URL placeholder. A malformed nonempty URL can reach `createClient` during module initialization instead of showing the setup screen. Validate configuration before constructing the configured client.
- **Cancellation behavior:** `login()` returns null on browser cancellation, but `requireGoogle()` turns that into `loginFailed`. Make cancellation a neutral return to the prior screen.
- **Callback hardening/test gap:** `finishGoogleLogin()` extracts a code without validating callback origin/path or interpreting OAuth errors. The Linking entry point filters a prefix; the browser-return entry point does not. Centralize validation and cover denied consent, missing code, wrong callback, exchange failure, retry, and duplicate delivery.
- **Session lifecycle test gap:** existing auth tests cover successful login and duplicate callback exchange. They do not establish restart, expired/revoked sessions, cold callback, or refresh behavior on Android. Guard delayed profile loads so a response from an old account cannot repopulate state after logout/account switching.
- Local Supabase config has the redirect but no Google provider configuration. Hosted provider settings must be configured explicitly; `db push` does not configure hosted Google OAuth.
- EAS profiles do not explicitly select environments. Pin preview to staging and production to production before remote builds.

## Ordered delivery plan

### 1. Make configuration reproducible

Add `.env.example` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_POLICY_URL`. Ignore local environment files while retaining the example. Validate missing, placeholder, and malformed configuration without logging values. Document the public key type used and keep the existing variable name for compatibility.

Never put the Google client secret or Supabase service-role/secret key in the mobile app or any `EXPO_PUBLIC_*` variable. Configure Google secrets in Supabase and privileged keys only in server environments.

Verify: a fresh checkout follows README successfully; missing/invalid configuration renders setup guidance; local environment files are ignored.

### 2. Provision staging Supabase

Select the owner's staging project, inspect existing migration history, link it, and apply all four migrations in order. Deploy `account-delete` and `listing-delete`. Verify `listing-photos` remains private with JPEG and size limits, and verify grants/RLS on the hosted database. Set the public URL/key in the staging build environment. Use authenticated owner CLI/dashboard access; do not copy server secrets into this repository.

Verify: guest REST browsing succeeds; direct private-contact reads and unauthorized writes fail. Both functions reject invalid bearer tokens despite gateway `verify_jwt=false`.

### 3. Configure Google and redirects

Configure Google consent branding, support details, public policy links, testing audience, and test users. Create a Web application OAuth client for the existing Supabase browser flow. Register the exact callback shown by the Supabase dashboard, normally `https://<project-ref>.supabase.co/auth/v1/callback`, in Google. Save client ID/secret in the Supabase Google provider; enable Google and disable unused providers.

Allow `gaavbajar://auth/callback` in hosted Supabase Auth redirect settings. Configure the intended site/fallback URL explicitly. The Google callback and the app callback are different URLs and belong in different consoles. Existing Android package/scheme remain unchanged. Android SHA fingerprints are not required by this browser/Web-client flow; native Google sign-in would introduce separate configuration.

Verify: OAuth reaches Google's account chooser, returns to the signed preview app, exchanges the code once, and produces a user with a Google identity and confirmed email. Profile remains incomplete until consent is saved.

### 4. Fix auth edge cases

Implement the minimal configuration, cancellation, callback validation, and stale-profile-response fixes above. Keep Marathi and Hindi messages consistent. Add focused regression tests for each failure path and retain duplicate-callback coverage. Test restoration and refresh before changing storage or adding concurrency mechanisms; add only fixes demonstrated by failures.

Verify: cancel causes no error banner; denial and network failures are recoverable; unrelated links do not trigger exchange; logout/account switching cannot restore an old profile. Restart preserves a valid session, and expired/revoked sessions return to a usable sign-in state.

### 5. Prove end-to-end authorization on Android

Build a signed preview APK against staging. Test warm/cold OAuth return, app restart, foreground refresh, offline login, logout, and re-login. Use two Google test accounts plus guest access. Complete consent, post zero/three-photo listings, fetch signed images, retrieve authorized contacts, and verify cross-account edit/delete/upload attempts fail. Exercise both deletion functions and cleanup-failure retry using disposable staging data.

Verify: `npm run check` and Android export pass, plus recorded hosted and device results. A JavaScript bundle export alone is insufficient.

### 6. Promote verified configuration

Create or select the production project, review/apply the same migrations and functions, configure production Google credentials/callbacks, and assign explicit EAS production variables. Rebuild because public variables are embedded in the bundle. Confirm policy URLs and repeat a production smoke test with approved accounts before launch.

## Review verification and remaining inputs

- `npm run check`: passed TypeScript and 45 tests across five test files.
- `npm run build:android`: passed Hermes bundle export.
- Hosted Supabase, Google credentials, signed-device authentication, and refresh behavior were not verified during this review. PGlite uses stubbed auth/storage schemas; network tests use mocks.
- Required for execution: owner-selected Supabase project/access, Google Cloud project/consent configuration, hosted policy origin, EAS project/build environment, Android device, and two Google test accounts. Provide access through authenticated tooling; do not paste secrets into chat.
- Existing `docs/VERIFICATION.md` says 40 tests; update its count and hosted evidence when implementation is complete.

## Official references checked

- [Expo SDK 57 AuthSession](https://docs.expo.dev/versions/v57.0.0/sdk/auth-session/): browser OAuth, custom schemes, and native rebuild requirements.
- [Supabase Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google): Web OAuth client, Google callback, provider settings, and PKCE exchange.
- [Supabase mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking): app redirect allowlisting and mobile callback integration.

## Implementation status — 20 September 2026

Local configuration template/ignore rules, configuration validation, explicit EAS environments, neutral browser cancellation, shared callback validation, stale-profile response guards, and initial-session race protection are implemented. Focused tests cover invalid configuration, OAuth denial/malformed callbacks, cancellation, exchange retry, duplicate exchange, and missing sessions. Existing Marathi/Hindi `loginFailed` and setup messages remain in use.

Hosted deployment and signed-device acceptance remain pending: no project was linked, no local environment file was provided, and no Supabase/EAS CLI executable was found during implementation. Project selection and authenticated owner access are required before deployment. Preview and production can initially share one backend, with the shared-data limitations documented in README; separate EAS environments are retained to allow a later split.

### Hosted progress

The owner supplied project `kzfajcdbnkbchfywgbjz`. Database migrations, private Storage bucket, both Edge Functions, mobile callback allowlist, local public environment values, and live guest/invalid-token checks are now complete. See `VERIFICATION.md` for evidence. Google Cloud client configuration, public policy hosting, EAS remote environment values, and signed-device/two-account checks remain pending.
