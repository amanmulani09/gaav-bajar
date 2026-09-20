# Consent evidence

Account setup presents one prominent data and listing notice before a user can open listings, save favorites, contact sellers, or post. The user can decline and continue browsing public search results.

`onboarding-v1` explains the collected data, public listing fields, phone/WhatsApp audience, purposes, processors, refusal, withdrawal, and the limit on recalling copies already obtained by buyers. Marathi, Hindi, and English notices are stored in `consent_notices`; tests require database text to exactly match app text.

On acceptance, `save_profile` records:

- authenticated Google user ID
- notice version and language
- server-generated acceptance timestamp
- one immutable `consent_events` row

Client roles cannot read or edit consent evidence. A profile cannot use member features until terms and data consent are recorded. Later profile saves do not create another event. Account deletion removes the event with the profile. Each listing form repeats a short phone/WhatsApp sharing note; it does not request fresh consent.

This design supports audit evidence; it is not a legal certification. Release review must keep app behavior, privacy policy, Play Data safety answers, and stored notice text aligned. Google Play recommends disclosure immediately before the relevant collection, clear affirmative choice, a decline path, and explanations of what data is collected, why, and how it is used. India’s DPDP Act requires clear, plain-language notice and consent that is free, specific, informed, unconditional, and unambiguous.

Sources: [Google Play disclosure and consent guidance](https://support.google.com/googleplay/android-developer/answer/11150561), [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311), [Digital Personal Data Protection Act, 2023](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf).
