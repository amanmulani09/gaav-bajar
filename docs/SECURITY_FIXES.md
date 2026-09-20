# Minimal security fixes — 20 September 2026

## Implemented

| Risk | Fix | Release status |
|---|---|---|
| Contact harvesting | `get_contact` enforces 20 distinct new advertisement contacts per buyer in a rolling 24-hour window. Repeat views in that window and owner access do not consume additional capacity. Requests are serialized on the buyer's profile row; clients cannot read or clear the budget table. | Applied to hosted Supabase as migration `202609200005_contact_limits` |
| Browser framing/script exposure | Enforced CSP, framing denial, `nosniff`, referrer policy, and permissions policy. Camera is allowed for the site; microphone/geolocation disabled. No COOP restriction was added that would sever the Google popup relationship. | Deployed to production web |
| Native plaintext sessions | Separate AES-256 MMKV store; randomly generated encryption key stored in Expo SecureStore (Android Keystore/iOS Keychain). Large sessions stay out of SecureStore's value-size constraints. Existing session keys migrate on access; old values are removed and the old store compacted. Secure-storage failures do not fall back to plaintext. | Included in native source and Android export; new native binary required |
| Debug-signed native releases | Expo config plugin adds a Gradle guard that rejects release packaging with missing credentials, the debug alias, or an Android Debug certificate. Debug builds remain available. No production signing key was generated or committed. | Generated Android source updated; production EAS credentials still required |

Repository remains public and licensing remains unchanged. Public frontend code/images remain copyable. Low-priority audit items were not folded into these changes.

## Verification

- `npm run check`: 87 tests passed. New checks cover quota exhaustion, repeat views, owner exemption, restored capacity after expiry, denied log-table access, large-session migration, concurrent key initialization, logout, stale legacy values, and storage failure recovery.
- Web and Android Expo exports passed.
- Isolated Gradle tests: debug build allowed; debug-signed release blocked; missing signing blocked; disposable non-debug signer accepted. Test signing material lives only in a temporary directory and is not production credentials.
- Full Android release-task dry-run was not completed: offline configuration lacked cached Android Gradle Plugin 9.2.1; the online retry was stopped while resolving dependencies/installing missing Android SDK components. The guard was tested in an isolated real Gradle project, not a completed Android release build.
- Hosted migration checksum matches the checked-in SQL: `5507fd7bcbe30f76210c8f696e3d4d82`. Read-only verification confirmed RLS enabled, no anonymous table/contact-function access, no client budget deletion, and the new limit present in the function.
- Production `contact_reveals` and `private_contacts` requests without a session return HTTP 401.
- Production response headers exactly match `vercel.json`; auth callback, social image, and analytics script return HTTP 200.
- Browser smoke check: public feed, real listing photo, ad detail, authenticated state, and seller editor with Camera/Gallery rendered. No captured CSP errors. No advertisement was published or deleted.
- Web deployment: `dpl_4Q6KDhhEEnp45JGw8b45rk8SG3Ff`, https://gaav-bajar.vercel.app.

## Deployment and remaining limits

- **Web:** already live. Static-export deployments must copy the repository's `headers` and `rewrites` into their deployment `vercel.json`; replacing that file with rewrite-only configuration would remove these protections. The CSP currently permits the configured production Supabase host; update it deliberately when introducing another backend.
- **Database:** migration is applied and recorded in hosted migration history. Future databases should apply it in normal migration order.
- **Native:** rebuild/reinstall after adding SecureStore. Verify login, background/foreground refresh, upgrade migration, and logout on a real device. Validate the final release certificate before distributing an APK/AAB. A web deployment cannot change an installed native app.
- Quotas reduce harvesting by one account, not coordinated abuse across many Google accounts. Downloaded contacts/photos cannot be recalled. Events store viewer/listing IDs, not contact values; rows expire on the viewer's next contact request and cascade on account/listing deletion.
- Browser sessions remain JavaScript-readable, as before. CSP reduces injection exposure but does not provide HttpOnly-cookie isolation. Draft photos/contact fields still use AsyncStorage; this change protects native session credentials specifically.
- Native credential-store behavior and full OAuth/device end-to-end acceptance remain release checks; mocked unit tests and exports are not substitutes.

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the original audit and intentionally deferred findings.
