# App Store Connect: App Privacy answers

App: مكتبة خزائن الرحمن · bundle `com.khazayin.app` · v1.0.0
Source of truth: design `docs/plans/2026-10-24-store-submission-design.md` §0 and §3. These answers must match `app.json` → `ios.privacyManifests` (`NSPrivacyCollectedDataTypes` = CrashData, PerformanceData, OtherDiagnosticData; `NSPrivacyTracking: false`). If the two ever disagree, fix the manifest or this file before you submit.

Where: App Store Connect → the app → **App Privacy**.

## 1. Privacy Policy URL

`«[يُستكمل: privacy policy URL on khazayin.com]»`. It must be the same https URL as `EXPO_PUBLIC_PRIVACY_POLICY_URL` in the production EAS profile. Host `privacy/privacy-policy.ar.html` there.

## 2. "Do you or your third-party partners collect data from this app?"

**Yes, we collect data from this app.**

## 3. Data types

Tick **Diagnostics** only, with these three sub-types:

| Data type | Ticked |
| --- | --- |
| Diagnostics → Crash Data | Yes |
| Diagnostics → Performance Data | Yes |
| Diagnostics → Other Diagnostic Data | Yes |
| Every other category: Contact Info, Health & Fitness, Financial Info, Location, Sensitive Info, Contacts, User Content, Browsing History, Search History, Identifiers, Purchases, Usage Data, Other Data | **No** |

## 4. Answers per data type (identical for all three)

| Question | Answer |
| --- | --- |
| How is this data used? | **App Functionality** only. Not Third-Party Advertising, Developer's Advertising or Marketing, Analytics, Product Personalization, or Other Purposes. |
| Is this data linked to the user's identity? | **No** |
| Is this data used for tracking? | **No** |

Rationale:
- The data goes to Sentry (`@sentry/react-native`), with `sendDefaultPii: false` and `tracesSampleRate: 0.2`. It is disabled in development builds.
- `services/sentryOptions.ts` replaces the per-install `user.id` with the fixed value `anonymous`. It does this on the native scope (`setUser`) and in `beforeSend`/`beforeSendTransaction`, so no event can be tied to a device or person.
- No IP is stored: the SDK sends `infer_ip: 'never'`, and the Sentry project setting "Prevent storing IP addresses" is a second safeguard (runbook gate).
- Purpose is App Functionality, which Apple's definition covers ("…minimize app crashes, improve scalability and performance…"). The data never feeds analytics dashboards about user behaviour.

## 5. Why Location is NOT declared

- `expo-location` reads a coarse, when-in-use location only. iOS grants approximate accuracy by default (`NSLocationDefaultAccuracyReduced: true`). The app rounds the coordinate to 2 decimals (~1.1 km), stores it in local settings, and computes prayer times on the device.
- The rounded coordinate goes to **CLGeocoder**, Apple's own OS service, to resolve the country. The Foundation never receives it, and it is not sent to Sentry.
- Apple's definition: data is "collected" only when it is transmitted off the device in a way that allows the developer or its partners to access it beyond servicing the request in real time. Neither the Foundation nor any partner of it can access the coordinate, so the answer is **not collected**.
- The privacy policy still discloses the geocoder transmission in full (§4 of the policy). Do not put "location never leaves the device" anywhere.

## 6. Why no Identifiers and no Usage Data

- **Device ID:** none. Sentry's install ID is stripped (see §4 above). There is no IDFA or ATT prompt, and no advertising SDK.
- **User ID:** none. There are no accounts.
- **Usage Data / Product Interaction:** none is sent. Sentry breadcrumbs (screen names, archive.org request URLs) travel only inside crash and performance events, so they are Diagnostics, not a separate usage-analytics stream.
- **User Content:** notes, saved items and progress stay on the device (AsyncStorage + SQLite). There is no in-app contact form; it was removed in v1.
- **Audio streaming:** archive.org receives IP, user-agent and the requested item as a direct request from the device. The Foundation does not receive this. It is disclosed in the policy, but it is not developer collection.

## 7. Tracking

**No.** There is no tracking, no ATT prompt, no `NSUserTrackingUsageDescription`, no data broker, and no ad network. `NSPrivacyTracking: false`, and `NSPrivacyTrackingDomains` is empty.

## 8. Resulting label (what users will see)

- **Data Not Linked to You:** Diagnostics
- **Data Used to Track You:** none
- **Data Linked to You:** none

## 9. Re-check before every release

- [ ] `ios.privacyManifests` in `app.json` still lists exactly the three Diagnostics types, and the built `PrivacyInfo.xcprivacy` (`plutil -p`) agrees.
- [ ] No new SDK has been added (analytics, ads, auth, push).
- [ ] Community (dev-only) is still `off` in production. If it ships, User Content and Identifiers must be re-answered.
- [ ] Prayer notifications are still off. Enabling them adds no data type, but re-read §5 anyway.
