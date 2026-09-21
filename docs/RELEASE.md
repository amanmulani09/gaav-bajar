# Release gate

## Automated

- `npm ci`, `npm run check`, `npm run build:android`.
- Database tests run migrations in PGlite (real PostgreSQL compiled to WASM) with mocked Supabase auth/storage schemas. They check SQL functions, grants, RLS and constraints. They do not replace hosted Storage, GoTrue, or Edge Function integration tests.

## Real staging backend and signed Android build — required

- Fresh install: browse as guest, switch Marathi/Hindi, restart app, retain chosen language.
- Google login on signed preview build; OAuth return, cancel, logout, expired session, network failure. Backend records must show confirmed Google identity.
- Accept terms, save profile. Submit priced/contact-for-price listings, with zero/three photos, and separate/default WhatsApp numbers. Check all 36 districts; Mumbai City allows no taluka.
- Upgrade an `onboarding-v1` account: member actions must remain blocked until the user accepts the language-matched `onboarding-v2` notice. Confirm both consent events remain in the audit table.
- With two buyers, submit and update private bids containing amount, district, tahsil, location, and optional note. Confirm only the buyer and seller can read each bid; reject/resubmit one, accept the other, and verify only the accepted buyer can reveal contact. Acceptance must not be presented as payment, reservation, or a completed/guaranteed sale.
- Kill connection during each photo upload and during save; retry same draft. Exactly one listing, no duplicate photo records. Relaunch and resume draft; discard it. Edit existing listing while offline, then retry online. Replace three photos and verify old files removed.
- Guest cannot query private contacts, obtain contact RPC, or read draft/pending/sold/removed content through REST. Second account cannot edit/sell/delete first account's listing or attach first account's photos.
- Basic URL/prohibited text goes to pending; administrator can review/approve/remove. Report listing and seller; block/unblock; verify feed, details, contact and signed-image access policies. Verify suspended account cannot publish.
- Before bid acceptance, call/WhatsApp must remain unavailable. After acceptance, call opens the dialer without initiating a call and WhatsApp opens a composed enquiry without sending it. Test with and without WhatsApp installed; phone alternative stays visible.
- Mark sold; disappears from public search. Delete listing; photos and row gone. Delete account with active/draft/sold listings; Auth/profile/contact/storage content gone. Simulate storage cleanup failure; content hidden, retry possible, no false success message.
- Small Android screen, large font setting, keyboard, back button, screen-reader labels, 3G/slow network. Native Marathi/Hindi speaker reviews copy.
- Public privacy/terms/deletion URLs work without app. Request arrives at real support inbox; owner can fulfill it.

## Play Console

- Confirm application ID, brand assets, operator and support details. Link owner's EAS account and use its signing credentials.
- Upload production AAB. Complete privacy URL, Data safety, content rating, target audience (adult users), app access instructions, support contact, and Marathi/Hindi store text/screenshots.
- Data safety must accurately describe personal information (email, name, seller phone and listing location, buyer bid location), user content (listings, photos, bid amount/note, reports), user IDs, and app interactions processed by the app. Bid data is shared only with the relevant buyer and seller; seller contact is shared only with the accepted buyer. Do not claim zero collection, identity verification, a binding sale, or transaction guarantees. No ads/payment/tracking SDKs are included.
- Current new-personal-account rule: 12 opted-in testers for 14 continuous days before applying for production access. Check your account's current requirements; review/approval timing is outside the app's control.
- Provide reviewers actual access instructions for Google sign-in and a functioning backend; do not bypass RLS or ship production demo accounts.
- Recruit real testers; seed 20 seller-approved real listings using their Google accounts/contact consent. Check each photo and seller contact. No invented production listings.
- Assign daily moderation owner and deletion inbox owner. Confirm free-tier capacity and storage usage before expanding rollout.

## Suggested store text (review with a native speaker)

Marathi short description: महाराष्ट्रातील शेतीची साधने, जनावरे व मालमत्तेसाठी स्थानिक संपर्क बाजार.

Hindi short description: महाराष्ट्र में खेती के औजार, पशु और संपत्ति के लिए स्थानीय संपर्क बाजार।

Long-description points: browse by location/category; post local listings; send private offers; seller-approved phone/WhatsApp contact; Marathi/Hindi UI; no payments, reservation, or delivery; Google-email verification only; report and block inappropriate content.

## Official references

- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/9876937
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://supabase.com/pricing
