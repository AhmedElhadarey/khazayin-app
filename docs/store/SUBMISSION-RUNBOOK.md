# Submission runbook: مكتبة خزائن الرحمن v1.0.0

Track `store-submission_20261024` · design `docs/plans/2026-10-24-store-submission-design.md` (§0 is authoritative).
Store identifier on both platforms: **`com.khazayin.app`**. Publisher: **مؤسسة «خزائن الرحمن» العلمية**.

The repo side is done: config, privacy manifest, permissions, copy, privacy and rating answers, assets tooling.
Everything below needs an account, a credential, a console form or the Foundation, so a person does it.
Work top to bottom. A step marked ⛔ blocks submission.

```
node scripts/store/check-release-config.mjs   # must print 0 open gates before a release build
node scripts/store/validate-copy.mjs          # must exit 0 after any copy edit
```

---

## 0. Release blockers (status 2026-10-24)

| # | Blocker | Owner | How it is closed |
|---|---|---|---|
| ⛔ B1 | **Mushaf text.** Only البقرة 1–5 is bundled (`data/content/quran.ts`); every other surah shows «لا توجد آيات لهذه السورة». | content track (next) | Bundle the full Uthmani text (Tanzil, verbatim, with attribution; already credited in About), verify on device, then add the `PENDING_FULL_QURAN_TEXT` lines from `PENDING.md`. |
| ⛔ B2 | **Recitation audio.** No reciter has a source, so every surah tap shows «لا يتوفر تسجيل صوتي لهذه المادة». | Foundation → content track | The Foundation supplies licensed reciter files (e.g. its archive.org account `@user_42102`). Wire them in, then add the `PENDING_RECITATION_AUDIO` lines. |
| ⛔ B3 | **Contact values.** The email and phone are placeholders (`constants/foundationContact.ts`), so the contact screen shows only the Telegram fallback. | Foundation | Supply both. `+20 111 142 4312` (from the @Alrahmn channel) is a candidate the user has not confirmed. |
| ⛔ B4 | **Privacy policy URL.** | Foundation | Fill the 12 highlighted placeholders in `privacy/privacy-policy.ar.html`, host it at a stable HTTPS URL (e.g. `https://khazayin.com/privacy`), then set `EXPO_PUBLIC_PRIVACY_POLICY_URL` in `eas.json` → `build.production.env`. |
| ⛔ B5 | **Sentry upload.** The `SENTRY_AUTH_TOKEN` EAS secret does not exist yet. | developer | §3 below. |
| ⛔ B6 | **Content rights** (Guideline 5.2): the archive.org lectures, the Quran text source and the Mushaf-publishing approval rules (e.g. Al-Azhar; see design §7). | Foundation, with counsel | Written confirmation, filed with the release. |
| B7 | **Submit IDs** in `eas.json` (`ascAppId`, `appleTeamId`). | developer | §5.1 below. |
| B8 | **YouTube scholar channels.** Five handles are unverified, so production shows only the Foundation channel. | Foundation | Supply verified URLs, or leave as is. |

**App Review risks kept by decision** (the user chose to keep these screens). Re-read them before submitting:
- Sections without a route show «قريباً بإذن الله».
- Dawah download and details show «قريباً».
- Audiobooks and Exclusive are mock rows with no audio.
- Static counts that overstate the content:
  - «٦٥ قناة» in the More row and About
  - «٩ تخطيط» for a month that lists 3 designs
  - section episode counts
- The scholar list shows «عبد المحسن العباد البدر» three times (`data/content/scholars.ts:24-26`: ids s1–s3 share one name).

Each of these is a Guideline 2.1 "incomplete" or 2.3 "inaccurate metadata" risk. Fix the counts and the duplicate in the content track. They are data, not design.

---

## 1. Accounts (Foundation)

1. **Apple Developer Program, Organization** (not Individual):
   - Needs a **D-U-N-S number** for the Foundation's legal entity. It is free and takes up to ~2 weeks.
   - The legal name must match D-U-N-S exactly.
   - Enrol at least two Admins. The account holder accepts all agreements, including the Paid/Free Apps agreement.
2. **Google Play Console, Organization** account. A Personal account created after Nov 2023 must run a 12-tester, 14-day closed test before production.
3. **Expo organization** with 2+ owners. Transfer the EAS project there (`eas project:info`, then the project settings on expo.dev) **before** generating any credential, so the credentials belong to the Foundation and not to a personal Expo account. Then add `"owner": "<org>"` to `app.json`.
4. **Sentry organization** owned by the Foundation, and the DSN rotated to that project if it changes. Accept Sentry's DPA.

## 2. Code signing (EAS-managed)

### iOS
1. In App Store Connect → Users and Access → Integrations, create an **App Store Connect API key** with the Admin role. Store the `.p8` in the Foundation vault.
2. Run `eas credentials -p ios`, profile production, and choose to let EAS manage credentials. EAS will:
   - register `com.khazayin.app` and create the App ID
   - create the **Distribution certificate** and the **App Store provisioning profile**
3. When asked about a **Push Notifications key (APNs)**, choose **No**. All notifications are local. `expo-notifications` adds the `aps-environment` entitlement and EAS enables the capability on the App ID; no key is needed.
4. Record the Team ID in `eas.json` → `submit.production.ios.appleTeamId`.

### Android
1. Run `eas credentials -p android`, profile production, and choose to generate a new **upload keystore** managed by EAS.
2. **Back it up immediately.** In the same menu, download the keystore and store the `.jks` and its passwords in the Foundation vault. Losing it is recoverable only through a Play upload-key reset request.
3. **Play App Signing** is mandatory for new apps and turns on when the first AAB is uploaded (§6.2). Google holds the app-signing key and EAS holds the upload key.
4. Record four fingerprints in the vault: SHA-1 and SHA-256 for both the upload key and the app-signing key (Play Console → Setup → App signing).
5. For `eas submit`:
   - Create a Google Cloud service account with Play Console access (§6.6).
   - Upload its JSON key through `eas credentials`, Android → Google Service Account. This is preferred.
   - The fallback is `./secrets/play-service-account.json`, which is gitignored and easignored. Never commit it.

## 3. Sentry (before the first production build)

1. Create an org auth token with project:releases and org:read scopes.
2. `eas env:set --environment production --name SENTRY_AUTH_TOKEN --value <token> --visibility secret`. On eas-cli 25, `env:create` still works but is deprecated.
3. Set `SENTRY_ORG` and `SENTRY_PROJECT` the same way, as plain-text variables.
4. Remove `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json` → `build.production.env` only. Keep it on dev and preview.
5. In the Sentry project settings:
   - turn on **Prevent storing of IP addresses**
   - note the **data retention** period, which the privacy policy needs
6. Re-run `node scripts/store/check-release-config.mjs`. The sentry-upload gate closes.

## 4. Build

```
node scripts/store/check-release-config.mjs        # 0 open gates
npx jest && npx tsc --noEmit --pretty false
eas build --platform ios --profile production
eas build --platform android --profile production  # AAB
```

- EAS now runs a **clean prebuild in the cloud**: `/ios` and `/android` are in `.easignore`, and every native setting lives in `app.json` or a plugin.
- To refresh the local folders for QA: `npx expo prebuild --clean`, then `cd ios && pod install`. They still carry the old ID until you do.
- Check the first build log:
  - The Xcode version must be **26 or later**. Apple has required the iOS 26 SDK since April 2026. If it isn't, pin `build.production.ios.image`.
  - targetSdk must be 36.
- Android download size check (RELEASE-READINESS §2): `bundletool build-apks --bundle=app.aab --output=app.apks --mode=default && bundletool get-size total --apks=app.apks`
- Merged-manifest check: `aapt dump permissions` on a universal APK built from the AAB.
  - Expected: INTERNET, ACCESS_COARSE_LOCATION, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, VIBRATE, POST_NOTIFICATIONS, WAKE_LOCK, ACCESS_NETWORK_STATE, RECEIVE_BOOT_COMPLETED, plus library launcher-badge permissions.
  - **Absent:** FINE / BACKGROUND location, USE/SCHEDULE_EXACT_ALARM, SYSTEM_ALERT_WINDOW, storage, FOREGROUND_SERVICE_LOCATION.

## 5. App Store Connect

### 5.1 Create the app
- My Apps → + → New App:
  - Platform iOS
  - Name «مكتبة خزائن الرحمن»
  - Primary language **Arabic**
  - Bundle ID `com.khazayin.app`
  - SKU `khazayin-library-ios`
  - User access: Full
- Copy the **Apple ID** (numeric) into `eas.json` → `submit.production.ios.ascAppId`.

### 5.2 Listing (Arabic)
- Paste from `app-store/ar-SA/`: name, subtitle, keywords, promotional text, description, release notes, support URL (⛔ placeholder), marketing URL, copyright.
- Categories (from `listing.json`): primary **Reference**, secondary **Education**.
- Screenshots:
  - 6.9″ iPhone (1320×2868): `assets/ios-6.9/`
  - 13″ iPad (2064×2752): `assets/ipad-13/`
  - ⚠️ The current set is a **draft**. Re-shoot every slot after B1/B2 land (§8).

### 5.3 App Privacy
- Answer exactly as in `privacy/app-store-privacy-label.md`: **Diagnostics only** (crash, performance, other diagnostic data), not linked, no tracking, App Functionality. **No location** and **no identifiers**.
- Privacy Policy URL: the B4 URL.

### 5.4 Age rating, compliance, availability
- **Age rating:** `rating/apple-age-rating.md` gives the expected result **4+**. Confirm with the Foundation that no lecture describes violence graphically; if one does, the rating is 9+.
- **Export compliance:** `ITSAppUsesNonExemptEncryption=false` is in Info.plist, so there is nothing to answer per build.
- **Pricing:** Free.
- **Availability:**
  - All countries and regions **except China mainland**, which needs an MIIT/ICP filing number.
  - Confirm every GCC and MENA storefront in `listing.json` is ticked.
- **EU Digital Services Act trader status** (⛔ Foundation decision, ideally with counsel):
  - If the Foundation declares as a trader, its address, phone and email are shown in EU storefronts.
  - If it declares as a non-trader, the app is still distributed in the EU.
  - If it makes no declaration, the app is withheld from the EU.

### 5.5 App Review information
- Sign-in required: **No**.
- Contact: a Foundation person, phone and email.
- Notes (English, for the reviewer):

  > No account or login. All content is in Arabic. Lectures stream from the Foundation's archive.org collection and need an internet connection. Location is optional and used only to compute prayer times on the device (More → الإعدادات → مواقيت الصلاة). Notifications are local (daily reading reminder). The app has no in-app purchases, ads or user-generated content.

- Release: **Manually release this version**.
- Phased release does not apply to 1.0, which reaches all new downloads at once. So **TestFlight is the only staging step on iOS.**

### 5.6 TestFlight and submit
- `eas submit -p ios --profile production --latest`
- Run internal testing of that exact build on at least the devices in memory `qa-device-matrix`, then Submit for Review.

## 6. Google Play Console

### 6.1 Create the app
- Create app:
  - name «مكتبة خزائن الرحمن»
  - default language **Arabic (ar)**
  - App, Free
  - accept the declarations
- Package name `com.khazayin.app`. It is **permanent** after the first upload.

### 6.2 First upload (manual)
The Play API cannot create the first release, so the first build goes up by hand:
1. Testing → Internal testing → Create release → upload the production **AAB** from EAS. This enrols Play App Signing.
2. Add testers and roll out the internal release.
3. Then do §6.6 and use `eas submit -p android --profile production --latest` from then on. The submit profile uses `track: internal`, `releaseStatus: draft`.

### 6.3 Main store listing (Arabic)
- From `play/ar/`: title, short description, full description.
- App icon: `assets/play/icon-512.png`.
- Feature graphic: `assets/play/feature-graphic.png` (1024×500).
- Screenshots:
  - Phone (1080×1920, 9:16): `assets/play-phone/`
  - 10″ tablet (1600×2560): `assets/play-tablet/`
  - ⚠️ Both are re-shot after B1/B2 (§8).
- Category: **Books & Reference**. Tags from `listing.json`.
- Contact email (⛔ placeholder) and website `https://khazayin.com`.

### 6.4 App content (Policy → App content)

| Form | Answer source |
|---|---|
| Privacy policy | B4 URL |
| Ads | No ads |
| App access | All functionality available without special access |
| Content rating (IARC) | `rating/play-iarc.md`: category Reference, all "No". Expected Everyone / PEGI 3 / USK 0 |
| Target audience | **13–15, 16–17, 18+** only. Choosing under-13 brings in the Families policy |
| Data safety | `privacy/play-data-safety.md`: crash logs + diagnostics (Analytics, required); approximate location (App functionality, optional, processed ephemerally). No identifiers, no sharing, encrypted in transit, deletion request: No |
| Foreground service | `privacy/play-foreground-service-declaration.md`: **media playback**, with a 30–60 s demo video per the shot list |
| Exact alarms | Not requested in v1 (permissions blocked). See `privacy/play-exact-alarm-note.md` for the future release |
| Government app / Financial features / Health / News | No / None / None / No |

### 6.5 Countries
- Production → Countries/regions → **all**. Confirm the GCC/MENA list in `listing.json`.
- Price: free.

### 6.6 Service account (for `eas submit`)
1. Google Cloud: create a service account and a JSON key.
2. Play Console → Users and permissions: invite the service-account email with release permissions for this app.
3. Store the key in EAS (§2, Android step 5).

### 6.7 Production rollout
- Promote the tested internal release to Production with a **staged rollout**: 5% → 20% → 50% → 100%, at least 24–48 h per step.
- **Halt** if crash-free sessions fall below **99.5%** or ANR rises above **0.47%** (Play vitals bad-behaviour threshold). Watch Sentry and Play vitals.

## 7. After approval
- Keep the upload keystore, the ASC API key and the service-account key in the Foundation vault, with two people able to reach them.
- Update `RELEASE-READINESS.md` and close the track in `conductor/tracks.md`.

## 8. Re-shooting store screenshots (after B1/B2)

Captures must come from a **production bundle** (`__DEV__` false), so dev-only community and the scholar YouTube rows never appear:

```
EXPO_PUBLIC_SENTRY_DSN= EXPO_PUBLIC_VISUAL_AUDIT=1 npx expo start --port 8082 --no-dev --minify
```

- **iOS:** launch the installed build with `-RCT_jsLocation localhost:8082`.
- **Android:** run `adb reverse tcp:8081 tcp:8082` so the debug build reaches the production bundle.
- **Status bar:**
  - iOS: `xcrun simctl status_bar <udid> override --time 9:41 …`
  - Android: demo mode (`adb shell settings put global sysui_demo_allowed 1` plus `am broadcast -a com.android.systemui.demo …`)
- **Devices:**

  | Slot | Device | Size |
  |---|---|---|
  | iPhone 6.9″ | iPhone 17 Pro Max | 1320×2868 |
  | iPad 13″ | iPad Pro 13″ (M5) | 2064×2752 |
  | Play phone | Pixel 7 AVD | 1080×1920 after composing |
  | Play 10″ tablet | Pixel Tablet AVD | 1600×2560 |

- Save raw captures as `assets/raw/<slot>/<NN-name>.png`, with captions in `assets/captions.json`. Then run `node scripts/store/compose-screenshots.mjs`, which composes, flattens alpha and asserts every size.
- Shot list:
  1. Home
  2. Mushaf page (a full page, e.g. `?surah=67`, once the text exists)
  3. Sections
  4. A scholar's lectures with the MiniPlayer playing
  5. Library with a real note
  6. Home lower rails
- Use **real usage only**: no faked progress or UI. Captions must stay true. Recitation and Mushaf lines are gated by `PENDING.md`.

---

## Acceptance criteria → where they close

| Acceptance criterion | Repo (done) | Remaining step |
|---|---|---|
| App Store metadata (ar title, subtitle, description, keywords) | `app-store/ar-SA/*`, validator + test | §5.2 paste; support URL (Foundation) |
| Play listing (ar description, feature graphic, screenshots) | `play/ar/*`, `assets/play/*`, composer | §6.3; re-shoot screenshots after B1/B2 |
| Screenshots for all required sizes | composer for all four slots (iPhone set drafted, iPad started) | §8 after B1/B2 |
| Privacy declarations accurate | `app.json` privacy manifest, blocked permissions, Sentry install-ID stripped, `privacy/*` answers + policy | B4 host policy; §5.3, §6.4 |
| Content rating, both stores | `rating/*` | §5.4, §6.4 |
| EAS production builds configured | `eas.json` production + submit, CNG, `check-release-config` gates | §3, §4 |
| Code signing set up | EAS-managed design, `secrets/` ignored | §1–§2 (needs Foundation accounts and logins) |
| Available in all GCC/MENA stores | `listing.json` availability | §5.4, §6.5 (China mainland excluded on Apple; EU DSA decision) |
