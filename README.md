# Gaav Bajar / गाव बाजार

Android-first local classifieds for Maharashtra, built with Expo, React Native, TypeScript, and Supabase. Marathi by default, Hindi toggle. Google login, listings, private seller contact, Call/WhatsApp, reports, blocking, and account deletion. No payments, Aadhaar collection, delivery, or in-app chat.

## Run locally

Use Node 22.13+ and npm 11. npm 10 may fail resolving optional test-tool peers; `npx npm@11.6.0 ci` avoids that resolver bug without changing system npm. Expo SDK 57 is pinned to a stable published patch.

```sh
npm ci
cp .env.example .env
# Fill public Supabase URL, anon key, and policy website URL.
npm start
```

With no environment values, the app renders an explicit unconfigured state. It does not silently use fake sellers or fake verification. Google OAuth and MMKV require a development/preview Android build; Expo Go is not supported.

## Repository structure

Source uses a feature-first layout: `src/application` composes screens, `src/features` owns product UI, `src/core` holds domain code and a typed Supabase repository, and `src/shared` contains reusable UI primitives. Database migrations and Edge Functions stay under `supabase/`; public policy pages stay under `site/`. See [architecture guide](docs/ARCHITECTURE.md) for dependency rules and where new code belongs.

```sh
npm run check          # TypeScript + domain, real PostgreSQL-engine authorization tests
npm run build:android  # Android JS/assets export, not a signed APK/AAB
npm run build:web      # Browser rendering for local UI checks, not a marketplace launch
```

## Backend setup

1. Create a Supabase project in an appropriate region. Save its project URL and public anon key in `.env`; never include the service-role key in the app or any `EXPO_PUBLIC_*` variable.
2. Install/login to Supabase CLI, then apply migrations and functions:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   npx supabase functions deploy account-delete
   npx supabase functions deploy listing-delete
   ```

3. In Google Cloud, configure OAuth consent screen and a **Web application** OAuth client. Register Supabase's callback (`https://YOUR_PROJECT.supabase.co/auth/v1/callback`) as an authorized redirect URI. Configure client ID/secret in Supabase Google provider settings. Enable Google; disable unused sign-in providers. Configure Google's production/testing audience and test users appropriately.
4. In Supabase Auth URL configuration allow `gaavbajar://auth/callback`. App uses browser OAuth with PKCE and exchanges a one-time authorization code; no embedded Google client secret. Restrict redirect allowlist to actual app/preview URLs.
5. Generate and host public policy pages, then set `EXPO_PUBLIC_POLICY_URL` to their HTTPS origin:

   ```sh
   SUPPORT_EMAIL='zero21studiocompany@gmail.com' APP_OPERATOR='Zero21 Studio' npm run site:build
   ```

   Upload `site/*.html` to a static host. No API key belongs in those files. Operator must monitor the support mailbox and fulfill verified deletion requests within seven days.
6. Confirm grants/RLS and both Edge Functions in a real staging project before onboarding users. `verify_jwt=false` is intentional at the gateway; each deletion function validates bearer token with `auth.getUser` before using service-role privileges.

## Android builds

`in.gaavbajar.app` is the default application ID; confirm ownership/name before first Play upload. Use one application ID permanently once published. Custom Gaav Bajar icon is generated from checked-in SVG using `npm run assets:build`.

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

Put the three public environment variables in the chosen EAS environment before remote builds; local `.env` is gitignored. The preview profile generates an APK. Production generates an AAB. EAS project linking, credentials, signing keys, and Play developer ownership require the owner's account. Never commit signing keys. Build profiles do not contain a fabricated EAS project ID.

## Product and data behavior

- Guests browse and search active listings. Opening a listing, saving a favorite, or entering Sell, Favorites, My listings, or Profile opens Google's account chooser. Signed-in Google users complete name/terms before posting or obtaining consented contact details.
- Buyers can save up to 100 favorite listings after Google login. Favorite IDs stay on that device; the Favorites screen fetches current active listing data and hides sold, removed, blocked, or suspended listings.
- New users may enter one optional influencer coupon/referral code while completing their first profile. Server validates the active code and records one immutable attribution. A counted join means Google login plus accepted terms plus saved profile; it does not mean an install, click, purchase, or unique device. Owner creates codes, reviews counts, and pays influencers manually. See [referral operations](docs/REFERRALS.md).
- First account setup shows a separate, language-matched data and listing notice. User must explicitly accept it or can decline and continue browsing. Server stores user ID, exact notice version/language, and server timestamp once. Listings repeat a short contact-sharing note without asking for consent again. See [consent evidence](docs/CONSENT.md).
- Badge means **Google email verified**, not identity, phone ownership, KYC, or property/animal ownership verification.
- Location data uses 36 districts/358 talukas from Maharashtra Common Village Master; bundled offline. See [location source](docs/LOCATIONS.md).
- A listing allows zero to three JPEGs, each at most 512 KiB; app resizes/compresses selected images to at most 384 KiB so a three-photo base64 draft fits Android AsyncStorage limits. Private bucket serves short-lived signed URLs. Previously issued URLs may remain usable for up to ten minutes after moderation/blocking; deleting objects removes the underlying media.
- Draft content and compressed photos persist on-device per account. Stable listing/photo UUIDs make retries idempotent. Editing never upserts over an existing image. Unused images are cleaned after save/discard; admin also cleans abandoned drafts.
- Supabase sessions, language, and favorite IDs use MMKV. Large base64 photo drafts remain in AsyncStorage so multi-megabyte synchronous writes cannot block the UI thread. Listing images use Expo Image memory/disk caching keyed by stable storage path. Browse uses a virtualized `FlatList` with bounded render batches.
- Server permits at most ten new drafts per rolling day and twenty unfinished/live listings. A private posting log prevents resetting the daily limit by deleting listings.
- Public text is screened for URLs, ten-digit numbers, and a small prohibited-word list. Flags go to `pending`; safe submissions publish immediately. This is deliberately basic screening, not AI image moderation or proof of lawful content. Admin reviews reports daily.
- All application writes use narrow security-definer functions with fixed search paths. Private contacts have no direct client SELECT access. Owners cannot self-clear suspension or directly approve pending/removed content.
- Account deletion first hides seller and stops new publishing/uploads, then removes storage objects, then deletes Auth user with relational cascades. Failures leave a hidden account that can retry. Listing deletion follows the same hide/files/row order.

## Owner launch dependencies

See [release checklist](docs/RELEASE.md) and [moderation runbook](docs/MODERATION.md).

Support owner is Zero21 Studio (zero21studiocompany@gmail.com); its policy pages are generated in `site/`. No cloud project, Google OAuth credentials, real seller content, signing account, or Play Console access were supplied. Nothing has been deployed or submitted automatically. Twenty **real, owner-approved** listings must be collected and posted with sellers' consent; no synthetic production seed is included.

## Verification notes

See [verification results](docs/VERIFICATION.md) for passed checks and outstanding release gates, including Expo's currently unavailable recommended patch versions. Project-local `.npmrc` uses the public npm registry; it does not modify global npm settings.
