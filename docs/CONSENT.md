# Consent evidence

Account setup presents one prominent data and listing notice before a user can open listings, save favorites, contact sellers, or post. The user can decline and continue browsing public search results.

`onboarding-v2` explains the collected data, public listing fields, accepted-buyer phone/WhatsApp audience, purposes, processors, refusal, withdrawal, and the limit on recalling copies already obtained by buyers. Marathi, Hindi, and English notices are stored in `consent_notices`; tests require database text to exactly match app text. Existing `onboarding-v1` evidence remains immutable.

On acceptance, `save_profile` records:

- authenticated Google user ID
- notice version and language
- server-generated acceptance timestamp
- one immutable `consent_events` row

Client roles cannot read or edit consent evidence. A profile cannot use member features until terms and the current `onboarding-v2` data consent are recorded. Existing `onboarding-v1` members must accept v2 before using member actions because bids add buyer amount, location, and optional-note data. Re-saving the same version does not create another event; accepting a new version preserves the older event. Account deletion removes the events with the profile. Each listing form repeats a short phone/WhatsApp sharing note; it does not request fresh consent.

This design supports audit evidence; it is not a legal certification. Release review must keep app behavior, privacy policy, Play Data safety answers, and stored notice text aligned. Google Play requires an in-app disclosure of relevant data access, collection, use, and sharing, followed by clear affirmative consent where its prominent-disclosure rule applies; the privacy policy and Play Data safety form remain separate requirements. India’s DPDP Act requires clear notice and consent that is free, specific, informed, unconditional, and unambiguous. The final DPDP Rules were notified in November 2025 with phased commencement; Rule 3's standalone, plain-language, itemised notice requirements are scheduled to commence eighteen months after notification. The v2 notice is written to align early, but counsel and Play Console review remain release gates.

Sources: [Google Play disclosure and consent guidance](https://support.google.com/googleplay/android-developer/answer/11150561), [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311), [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111), [Digital Personal Data Protection Act, 2023](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf), and [Digital Personal Data Protection Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
