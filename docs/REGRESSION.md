# Web regression — 2026-09-20

## Advertisement sharing follow-up

- Added WhatsApp sharing with public title, price, location, shortened description, and canonical advertisement link. Other apps use the platform share sheet; unsupported web browsers fall back to copy link. No seller phone/email or signed photo URL is included.
- Links use `https://gaav-bajar.vercel.app/?listing=<uuid>` and open public details without requiring login. Contact actions still require Google login and the existing server-side authorization.
- 77 automated tests passed, plus web and Android exports. Production shared-link navigation and Copy link success were verified. WhatsApp message encoding is unit tested; no message was sent and native share targets still need device testing.
- Deployed as `dpl_HeRKTgN4oLHxkgZbEtb6ZnVK4Xbd`.

## Scope and environment

Production: https://gaav-bajar.vercel.app. Browser checks used desktop Chrome, including a 390 × 844 viewport, with an existing signed-in account. This is not an Android Chrome device test.

## Results

| Check | Result |
| --- | --- |
| TypeScript and automated tests | Passed: 70 tests across 9 files, including database authorization, retry behavior, analytics redaction, error classification, and photo sizing |
| Fresh web export / Android bundle export | Passed |
| Browse and existing listing details | Loaded successfully |
| Favorites | Add, retrieve, and remove passed; original empty favorites restored |
| Sell | Editor opened; no listing published |
| My listings | Loaded expected empty state for the desktop account |
| Account | Existing profile and saved consent loaded |
| Public Supabase health | Listings HTTP 200 in 0.90s; districts HTTP 200 in 0.18s |
| Supabase logs | Observed successful profile, listing, and block-list requests; no matching failed storage upload in inspected last-hour logs |
| Local image preparation | Real Expo web conversion from a blob URL, JPEG/base64 generation, UUID creation, and AsyncStorage write/remove passed using a harmless PNG fixture |
| Web analytics | Production script loaded; Vercel dashboard recorded 3 visitors and 3 page views |

## Fixes

- Unknown exceptions no longer incorrectly claim a connection failure. Browser storage, expired authentication, and network errors have separate translated messages.
- Photo resizing preserves the longest-edge bound for tall portraits, avoids enlarging small images, and reports unreadable images as photo errors.
- Web analytics excludes authentication callback events and strips query parameters/fragments. Privacy disclosure updated in Marathi, Hindi, and English.

## Remaining reproduction gap

The user's Android Chrome photo failure has not been reproduced with their original image. Browser extension file URL access blocked automated selection in the real picker. No successful authenticated photo upload or publish is claimed. Testing the original image on the affected phone, including the exact post-fix error message, is still required. No account deletion, real listing modification, report submission, call, or WhatsApp message was performed.

## Camera and gallery — 2026-09-20

- Added separate Gallery and Take photo actions, sharing the existing compression and three-photo limit. Marathi, Hindi, and English labels included.
- `npm run check`: 81 tests passed. Camera tests cover synchronous web launch, native permission grant/denial, gallery after denial, and cancellation.
- Web and Android exports passed. Clean Expo Android prebuild removed the old generated CAMERA denial; expo-image-picker supplies the camera permission. Microphone remains blocked. Installed native apps require a rebuild.
- Production deployment: `dpl_2bvVx3P8CMtz64rAe8NgP55outRQ` at https://gaav-bajar.vercel.app.
- Live Chrome: both controls visible; Take photo opens a file chooser with `accept=",image/*"` and `capture="environment"` (rear-camera intent).
- Real mobile camera capture, preview, and Supabase upload still require device verification. Desktop file chooser inspection does not establish end-to-end phone capture success.

## App-link social preview — 2026-09-20

- Added static Open Graph and Twitter card tags in Expo's `public/index.html` template, plus a branded 1200×630 PNG. Crawlers do not need JavaScript or authentication.
- `npm run check`: 81 tests passed; web export passed. Exported HTML retains the app bundle and preview metadata. No native code changed.
- Production deployment: `dpl_4pswh8eXA4BDQjs7YvVteDwqWfog`.
- Live homepage returned HTTP 200 with preview tags using WhatsApp, Facebook, and Twitter crawler user agents. Public PNG returned HTTP 200 with image/png and verified 1200×630 dimensions.
- Verification covers crawler-accessible metadata/assets, not actual delivery inside social apps. Existing platform preview caches may delay updates. This is an app-level preview, not a listing-specific image.

## Image input size and format update — 2026-09-20

- Input maximum: 10 MiB (10,485,760 bytes) per image. No app MIME whitelist; formats require the device/browser decoder. Inputs are converted to JPEG and adaptively compressed for local draft storage. Animated/transparency source properties are not preserved in JPEG output. Existing three-photo listing count remains unchanged.
- Supabase migration `202609200006_image_upload_limits.sql` applied and verified live: private bucket, `image/*`, 10 MiB; `save_listing` accepts matching image metadata. Stored migration MD5 matches local file: `001bb091b9b00a4c76f52209a6cefd64`.
- `npm run check`: 100 tests passed, including exact 10 MiB acceptance, over-limit rejection, source-size precedence, adaptive compression, decoder errors, SQL image MIME acceptance and non-image rejection. Conversion unit tests use a mocked decoder; they do not certify individual codecs.
- Web and Android bundle exports passed. Production deployment `dpl_4NRfYU7oEKAEJ7CG2Fui6PwHZJ2J`; canonical app serves web bundle `index-94d867e53a0a18ad9fd0f996b9d97a44.js` with security headers preserved. Live Sell form shows gallery/camera controls and 10 MB guidance.
- Physical mobile camera, HEIC/AVIF codec support, and selected-file-to-published-ad end-to-end upload remain unverified for this update. Browser extension file upload permission was unavailable in the prior attempt.
