# Store submission readiness: design

Track `store-submission_20261024` · branch `feat/store-submission-2026-10-24`
Status: **v2**, after the release-engineering review (APPROVE WITH CONDITIONS) and the privacy/policy review (REVISE). The §0 revisions **supersede** v1 wherever they conflict.

## 0. v2 revisions (2026-10-24)

User decisions taken after review:
- **D3 reversed.** Drop `USE_EXACT_ALARM` and `SCHEDULE_EXACT_ALARM` for v1: remove `./plugins/withExactAlarmPermissions` from `app.json` plugins (keep the file) and add both to `blockedPermissions`. They come back together with prayer notifications.
- **Sentry install ID stripped.** At init, override the user so no per-install ID leaves the device. Declarations stay Diagnostics-only.
- **Contact form removed.** Keep only the email and WhatsApp rows. Real values come from one constants module, and the release check fails while any value is a placeholder. *Deliberate addition:* placeholder rows are hidden in production, so a single «تواصل معنا عبر قناتنا الرسمية» row (opening the verified `t.me/Alrahmn`) appears when both rows are hidden. Without it the screen would be empty, and that row disappears once the real values land.
- **Publisher name** is **مؤسسة «خزائن الرحمن» العلمية**. Fix the wordmark and the share text, which say العالمية.
- **"Coming soon" screens are kept** (Sections without a route, dawah download/details, mock audiobooks/exclusive). The runbook lists them as a guideline 2.1 risk.
- **Verified channel URLs** (from the khazayin.com footer, checked live):
  - Telegram `t.me/Alrahmn` (main) and `t.me/khazayinsci` (العلمية)
  - WhatsApp channel `whatsapp.com/channel/0029Va5gnMH7dmec2xxICO0a`
  - SoundCloud `soundcloud.com/khazayin`. The app had `khazain`, which is someone else's account.
  - YouTube `@khazayin`
  - The scholar YouTube handles are unverified and stay as gated placeholders until the user supplies values.
  - The phone `+20 111 142 4312` is unconfirmed and stays a gated placeholder.

Reviewer corrections adopted:
- **§3/§4.2 Apple: declare no location.** It is processed on device, and CLGeocoder answers in real time with no developer access. `NSPrivacyCollectedDataTypes` = CrashData, PerformanceData, OtherDiagnosticData; not linked, not tracking, purpose AppFunctionality. Keep the four accessed-API reason entries from the current `PrivacyInfo.xcprivacy` in `app.json`.
- **§3 Play: declare approximate location** (collected, not shared, processed ephemerally, optional, App functionality). Crash logs and diagnostics are declared under purpose **Analytics**, not App functionality.
- **§3 accuracy:**
  - Sentry sends `infer_ip: 'never'` under `sendDefaultPii: false`, so the IP is not stored. Keep the "Prevent storing IP addresses" project setting as a second safeguard.
  - Sentry also sends session/release-health pings, HTTP breadcrumbs (archive.org URLs) and device context. Ingest is in the US.
  - archive.org receives IP, user-agent and the requested item: disclose it in the policy, though it is not label "collection".
  - Android `allowBackup` and iCloud backup apply: disclose in the policy.
- **§4.2 iOS location strings:** set `expo-location` plugin `locationAlwaysAndWhenInUsePermission: false` and `locationAlwaysPermission: false`. When-in-use text: «يستخدم التطبيق موقعك التقريبي لحساب مواقيت الصلاة في مدينتك، ولا يُرسَل إلى المؤسسة.»
- **§4.2 language:** `infoPlist.CFBundleDevelopmentRegion: "ar"`, plus `expo.locales.ar` with Arabic InfoPlist strings (`CFBundleDisplayName`, the location usage string).
- **§4.3:** also remove expo-location's `LocationTaskService` (foregroundServiceType=location) from the merged manifest with a `tools:node="remove"` plugin. Background location is unused. The §9 check asserts the full merged permission list, including the absence of `ACCESS_BACKGROUND_LOCATION` and `FOREGROUND_SERVICE_LOCATION`.
- **§4.1 hand-edit check: done, clean.** A clean prebuild of the pre-change config in a temp dir, diffed against `ios/` and `android/`: Android is identical; on iOS only `pod install` integration and `PrivacyInfo.xcprivacy` differ. So the **release switches to cloud prebuild (CNG):** add `/ios` and `/android` to `.easignore`, and correct the wrong comment in `plugins/withTabletRotation.js`. Local `ios/` and `android/` are regenerated with `npx expo prebuild --clean` after the ID change, for local QA only.
- **§4.4:**
  - `check-release-config.mjs` gates three things: the privacy URL (https), the `SENTRY_AUTH_TOKEN` EAS secret (via `eas env:list`/`eas secret:list` when available, otherwise a manual-confirm flag), and every contact/link placeholder.
  - It parses the generated `PrivacyInfo.xcprivacy` when present, because the prebuild merge only adds keys.
  - Keep the Play service-account key in EAS credentials. `secrets/` stays gitignored as a fallback.
- **§4.5:** add `!scripts/store/` to `.gitignore` (`scripts/*` is ignored today).
- **§5 availability:** **exclude China mainland** on Apple (ICP filing). Add a runbook gate for the **EU DSA trader status** decision. Play target audience: 13–15, 16–17, 18+ (no under-13s, so the Families policy doesn't apply). Draft the other Play App-content forms: App access, Ads, Financial, Health, Government. Answer Apple's 2025 age-rating questionnaire (expected 4+), with a caveat if lectures contain graphic narratives.
- **§6:** the Play phone canvas is **1080×1920** (Play caps the long side at 2× the short side). Every store image is flattened to RGB with no alpha.
- **§7 additions:**
  - Signing ownership: transfer the EAS project to a Foundation Expo org with 2+ admins; use an App Store Connect API key; decline the APNs key; back up the upload keystore and record SHA-1/SHA-256 for upload and app-signing keys.
  - The first AAB is uploaded **manually** to Internal testing before `eas submit` can work.
  - Rollout: TestFlight and internal testing of the exact production binaries, then a Play staged rollout 5→20→50→100% with halt thresholds (crash-free sessions ≥ 99.5%, ANR ≤ 0.47%). iOS 1.0 has no staging beyond TestFlight.
  - A Personal Play account created after Nov 2023 needs a 12-tester, 14-day closed test, so the Foundation must use an Organization account.
  - Rights: Mushaf publishing approval regimes (e.g. Al-Azhar) are a question for counsel.

## 1. Goal

Get v1.0.0 of مكتبة خزائن الرحمن ready to submit to the App Store and Google Play.
The Foundation publishes it in every territory, including all GCC and MENA stores.
Everything that can be written as code or text gets done and committed on this branch.
The steps that need an account, a credential or a console form become a runbook
whose answers are already drafted.

## 2. Decisions taken (user, 2026-10-24)

| # | Decision | Consequence |
|---|---|---|
| D1 | The Foundation's own Apple (Organization) and Play accounts publish. The identifier becomes **`com.khazayin.app`** | It is permanent after the first upload. A fresh EAS credentials set is needed. Dev installs under the old ID become a separate app. Local QA scripts move to the new ID. |
| D2 | Claude drafts the Arabic privacy policy and the client hosts it on khazayin.com | The URL goes in `EXPO_PUBLIC_PRIVACY_POLICY_URL` on the production EAS profile **before** the release build, because there is no OTA path. |
| D3 | **Keep** the exact-alarm permissions (`USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM` max 32) | A Play restricted-permission declaration is required. The risk is in §7 R1, with a fallback ready. |
| D4 | Do every code-authorable item now. Nothing is committed or pushed without the user's OK | |

## 3. What the app actually does with data (the source of every privacy answer)

Verified in source on 2026-10-24:

| Data | Where | Leaves the device? |
|---|---|---|
| Crash reports, performance traces (20% sampled), device/OS diagnostics | `@sentry/react-native`, `app/_layout.tsx:79`, `sendDefaultPii: false`, disabled in `__DEV__` | **Yes**, to sentry.io. Not linked to identity, no tracking. Sentry receives the client IP: turn on *Prevent storing IP addresses* in the Sentry project (runbook). |
| Coarse location (rounded to 2 dp, ~1.1 km) | `expo-location`, prayer times | Computed on device. `reverseGeocodeAsync` sends the rounded coordinate to the **OS geocoder** (CLGeocoder / Play Services) to resolve the country. |
| Notes, bookmarks, saved items, settings, reading/listening progress | AsyncStorage + SQLite | No. |
| Audio streaming | archive.org | The request goes to archive.org. No user data is sent. |
| Content API (`services/api/*`) | inert: `EXPO_PUBLIC_API_BASE` unset → mock adapter | No. |
| Community | `__DEV__` only, mode `off` in production | No. Not shipped. |
| Accounts / login / payments / ads / analytics SDKs | none | n/a |

**Declaration stance: conservative.** Under-declaring is a rejection or removal risk.
Over-declaring a non-linked, optional data type costs nothing. Both stores therefore
declare:
- **Diagnostics** (crash, performance, other diagnostic data): collected, not linked, not used for tracking, purpose App Functionality.
- **Coarse/approximate location**: collected, not linked, not used for tracking, purpose App Functionality. On Play it is also *processed ephemerally* and *optional*.

The policy text says exactly this. It does not say "location never leaves the device";
RELEASE-READINESS.md §5 already records that claim as wrong.

## 4. Changes in the repo

`ios/` and `android/` are gitignored, but EAS builds from them (see `.easignore`). So
every native change is made in **`app.json` or a config plugin**, then applied by a
prebuild. A hand edit under `ios/` or `android/` never reaches git.

### 4.1 Identifier (D1)
- Set `app.json` `ios.bundleIdentifier` and `android.package` to `com.khazayin.app`. The scheme `khazayinapp` stays: deep links, tests and docs depend on it, and it is invisible to users.
- Read the package from one constant in the QA scripts (`scripts/visual-audit/{capture-ios,capture-android,screen-matrix}.mjs`, `skip-onboarding-ios.sh`). Old docs under `docs/plans/` are history and stay as they are.
- Regenerate native: `npx expo prebuild` (no `--clean`) into a temp copy, diff it against the current `ios/` and `android/` to surface any hand edits, then apply. The new Android namespace changes the Kotlin package path; prebuild handles that.

### 4.2 iOS privacy and compliance (`app.json` → `ios`)
- `privacyManifests.NSPrivacyCollectedDataTypes`: CrashData, PerformanceData, OtherDiagnosticData, CoarseLocation, each with `Linked: false`, `Tracking: false`, purpose `NSPrivacyCollectedDataTypePurposeAppFunctionality`. `NSPrivacyTracking: false`. The accessed-API reasons already generated (FileTimestamp, UserDefaults, DiskSpace, SystemBootTime) move into `app.json` too, so a clean prebuild keeps them.
- `infoPlist.ITSAppUsesNonExemptEncryption: false`. The app uses only HTTPS through OS APIs, which is exempt, so App Store Connect stops asking about export compliance on every build.
- `infoPlist.NSLocationDefaultAccuracyReduced: true`: iOS grants approximate location by default, which matches the coarse-only engine.

### 4.3 Android permissions (`app.json` → `android.blockedPermissions`)
Block these prebuild and library defaults, which the app does not use:
`SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `ACCESS_FINE_LOCATION`.
Keep: `INTERNET`, `VIBRATE`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS` (from expo-notifications),
`USE_EXACT_ALARM`, and `SCHEDULE_EXACT_ALARM` max 32 (D3).
Before blocking, check the other location callers: Fine has to be unused, and any
`Accuracy.High` request would break.

### 4.4 `eas.json`
- `build.production.env.EXPO_PUBLIC_PRIVACY_POLICY_URL`: left **absent** until the client gives the URL. The runbook makes it a pre-build gate. A guard script `scripts/store/check-release-config.mjs` fails a production release when it is unset or not https.
- `submit.production.ios`: `{ "ascAppId": "<fill>", "appleTeamId": "<fill>", "language": "ar-SA" }` placeholders. These are not secrets.
- `submit.production.android`: `{ "serviceAccountKeyPath": "./secrets/play-service-account.json", "track": "internal", "releaseStatus": "draft" }`. Add `secrets/` to `.gitignore` and `.easignore`.
- `SENTRY_DISABLE_AUTO_UPLOAD` stays until the `SENTRY_AUTH_TOKEN` EAS secret exists (RELEASE-READINESS §1).

### 4.5 Guard tests (`__tests__/storeReleaseConfig.test.ts`)
Each test reads `app.json` and `eas.json`, following the pattern in `splashConfig.test.ts`:
- the identifiers equal `com.khazayin.app` on both platforms
- the privacy manifest declares exactly the §3 data types, every one non-linked and non-tracking
- `ITSAppUsesNonExemptEncryption === false`
- every §4.3 permission is blocked, and none of the kept permissions is blocked
- the production profile builds an app-bundle with autoIncrement, and its submit block has ios and android entries
- the store-copy files exist and are within their limits (§5)

## 5. Store text (`docs/store/`)

All copy is Modern Standard Arabic, in the Foundation's voice, and claims only features
that exist. Files:

```
docs/store/
  app-store/ar-SA/  name.txt subtitle.txt keywords.txt promotional_text.txt
                    description.txt release_notes.txt support_url.txt marketing_url.txt
  play/ar/          title.txt short_description.txt full_description.txt
  listing.json      categories, contact email/website, age-rating answers, availability
  privacy/          privacy-policy.ar.md  privacy-policy.ar.html
                    app-store-privacy-label.md  play-data-safety.md
                    play-exact-alarm-declaration.md  play-foreground-service-declaration.md
  rating/           apple-age-rating.md  play-iarc.md
  SUBMISSION-RUNBOOK.md
```

Limits enforced by `scripts/store/validate-copy.mjs`, which the test also runs.
Counts are UTF-16 code units, which is what both consoles count:

| Field | Limit |
|---|---|
| App Store name | 30 |
| App Store subtitle | 30 |
| App Store keywords | 100 |
| App Store promotional text | 170 |
| App Store description | 4000 |
| App Store release notes | 4000 |
| Play title | 30 |
| Play short description | 80 |
| Play full description | 4000 |

Keyword rules: comma-separated, no space after a comma, and no word repeated from the
name or subtitle, because Apple already indexes those.

Categories:
- App Store: primary **Reference**, secondary **Education**
- Play: **Books & Reference**

Age rating: Apple **4+**; IARC expected **Everyone / PEGI 3**. There is no UGC in
production (community is dev-only), no web browsing beyond the privacy-policy link,
no ads, no purchases.

Availability: every territory on both stores, explicitly including SA, AE, KW, QA, BH,
OM, EG, JO, LB, IQ, MA, DZ, TN, LY, SD, YE and PS (Play), and no pre-order. Price: free.
Nothing in the app needs a regional licence. *(Superseded by §0: China mainland is
excluded on Apple because it needs an ICP filing, and the EU DSA trader status is a
Foundation decision.)*

## 6. Store images (`docs/store/assets/`, generated by `scripts/store/`)

| Store slot | Device / source | Pixels |
|---|---|---|
| iPhone 6.9″ (required) | iPhone 17 Pro Max simulator | 1320×2868 |
| iPad 13″ (required: `supportsTablet: true`) | iPad Pro 13″ simulator | 2064×2752 |
| Play phone (2–8) | Pixel 7 AVD | 1080×2400 |
| Play 10″ tablet | Pixel Tablet AVD | 2560×1600 → portrait capture 1600×2560 |
| Play feature graphic | generated | 1024×500 PNG/JPG, no alpha |
| Play hi-res icon | from `assets/images/icon-khazain.png` | 512×512 PNG |

Screens, in this order: Home · Mushaf reader · reciter surah list · Sections ·
Library (progress) · scholar / lectures · note editor · dawah posters.

- **Raw captures** are taken with argent. The status bar is cleaned up first: `simctl status_bar override` on iOS and demo mode on Android.
- **Captioned versions** have an Arabic headline band and a navy/cream frame, built by `scripts/store/compose-screenshots.mjs`. The script uses `sharp`, an existing devDependency, so nothing new is added. Captions use the bundled Noto Sans Arabic (OFL), rendered through SVG with the font embedded.

Rules:
- No licence-blocked art in any capture: the Mushaf page shows the shipped renderer, not the .fig publisher images.
- Library captures use real progress produced by reading, never faked UI.

## 7. Risks (written into the runbook; not solvable in code)

- **R1 USE_EXACT_ALARM (D3).** Play limits it to apps whose *core* function is alarms or calendar, and in v1 prayer notifications are gated off. A reviewer may reject it. The declaration text argues the prayer-time engine as the core function. The fallback, if rejected, is one plugin change: drop `USE_EXACT_ALARM` and remove the `maxSdkVersion` cap on `SCHEDULE_EXACT_ALARM`. It is documented with its exact diff.
- **R2 Content rights (Guideline 5.2).** Two things need written permission or an attribution check: the archive.org recordings the app streams, and the Quran text source (the Tanzil licence requires attribution and no modification). This needs the Foundation's confirmation. The runbook lists it as a pre-submit gate.
- **R3 Pending client files.** The licensed fonts and the Mushaf page art (see memory `figma-parity-blocked-items`). Shipping the Noto substitutes is fine for review.
- **R4 Guideline 4.2 / 2.1.** The reviewer must see real content. The mock adapter is the bundled real catalogue, but any placeholder text or `example.com` URL reachable from a production route would fail review. Grep and verify (task T5).
- **R5 Identifier change (D1).** Anything keyed to the old ID moves with it: Sentry release names (`<bundleId>@<version>+<build>`), the EAS credentials set, and local scripts.

## 8. Out of scope

Creating accounts, D-U-N-S, entering credentials, Play App Signing enrolment, filling
and submitting console forms, hosting the policy, the store-listing video, and any
commit or push without the user's OK.

## 9. Verification

- `npx tsc --noEmit --pretty false`
- `npx jest`, with no new failures
- `node scripts/store/validate-copy.mjs`
- `node scripts/store/check-release-config.mjs` (expected to report the privacy-URL gate as open)
- a prebuild diff
- `aapt dump permissions` on a local release build (or the merged manifest) to prove §4.3
- `plutil -p` on the built `PrivacyInfo.xcprivacy`
- pixel sizes of every image checked by the compose script
