# Settings screen gaps: design

- **Ticket:** "Settings Screen" (https://trello.com/c/JIMyPFTs). Marked Done, but it failed the acceptance-criteria audit.
- **Slug:** `settings-screen-gaps`
- **Branch:** `fix/settings-privacy-build-number`
- **Date:** 2026-10-21

---

## 1. Acceptance criteria (verbatim)

- Settings screen is accessible from More tab navigation
- Default qira'a can be selected from supported qira'at list
- Preferred reciter can be selected from available reciters
- Quran text font size is adjustable (3-5 size levels)
- App version and build number are displayed
- Privacy policy link opens in-app browser
- Clear cache action works with confirmation dialog in Arabic

## 2. Audit status and the problem

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Reachable from More | PASS | `data/content/sections.ts:138-156` (`MORE_EXTENSION_ROWS` → `/(tabs)/more/settings`) |
| 2 | Default qira'a | PASS | `app/(tabs)/more/settings.tsx:166-172` → `app/settings-qiraa.tsx` |
| 3 | Preferred reciter | PASS (minor, see §8) | `app/(tabs)/more/settings.tsx:173-179` → `app/settings-reciter.tsx` |
| 4 | Font size 3-5 levels | PASS (minor, see §8) | 5 levels, `app/(tabs)/more/settings.tsx:31-37`, `store/settingsStore.ts:308` |
| 5 | Version **and build number** | **PARTIAL** | see gap B |
| 6 | Privacy policy in in-app browser | **PARTIAL** | see gap A |
| 7 | Clear cache + Arabic confirm | PASS | `app/(tabs)/more/settings.tsx:99-115` |

### Gap A: the privacy policy never opens

`constants/config.ts:1-3` hard-codes `privacyPolicyUrl: ''`. That makes `openPrivacyPolicy` (`app/(tabs)/more/settings.tsx:86-97`) take its empty-URL branch every time and show `Alert('سياسة الخصوصية', 'سياسة الخصوصية ستُضاف قريبًا.')`. `WebBrowser.openBrowserAsync` is never reached. `RELEASE-READINESS.md:26-28` already lists the URL as a store-submission blocker.

**Is there a URL anywhere?** No. Places searched:
- Repo-wide grep for `privacy` / `خصوصية` / `khazayin.com`. The only hits are the empty config, the alert copy, the legacy `app/(tabs)/settings.tsx:371-373` row, and the readiness note.
- The foundation website is `https://khazayin.com` (`data/content/sections.ts:163`, `app/settings-about.tsx:72`). A live fetch on 2026-10-21 found **no privacy-policy link** on that site. Its footer has social links only.
- `constants/settings.ts:66-68` holds channel URLs (Telegram, YouTube, WhatsApp). None of them is a policy host.
- `app.json` and `eas.json` contain no URL.

Guessing a path such as `https://khazayin.com/privacy` would put a 404 behind a legal link, so this plan does **not** invent one.

### Gap B: the build number row never renders

`app/settings-about.tsx:14-22` reads the build number only from `Constants.expoConfig.ios.buildNumber` / `android.versionCode`. `app.json` sets neither field. `eas.json:4` uses `"appVersionSource": "remote"`, so EAS writes the build number straight into the native project (Info.plist `CFBundleVersion`, `build.gradle` `versionCode`) and the embedded app config never carries it. `resolveBuildNumber()` therefore returns `''`, and the `{build ? … : null}` guard at `app/settings-about.tsx:56-61` hides the row on every build.

The obvious fix is `expo-application`. It sits in `node_modules` as a transitive dependency but is **not** in `package.json`, so the project rules count it as a new dependency, which needs user approval.

## 3. Governing contracts (no Figma frame)

The Settings screen (`/(tabs)/more/settings`), `app/settings-about.tsx` and the in-app browser have **no frame** in `KHAZAYIN.fig`. The More root frame **2102:2711** (`docs/audit/2026-09-09/figma-reference/25-2102-2711.png`) covers only the eight reference rows in `MORE_ROWS` (`data/content/sections.ts:120-129`). The Settings entry row is a `MORE_EXTENSION_ROWS` item that renders *after* the reference group (`data/content/sections.ts:131-156`), outside the frame.

Contracts that govern this work:
- `constants/layout.ts`: `PHYSICAL_ROW` / `PHYSICAL_BOX`. The About card and version rows already spread them (`app/settings-about.tsx:101-104,119-125`). `__tests__/rtlPhysicalContract.test.ts:39` pins `app/settings-about.tsx`.
- `constants/typography.ts`: `textStyle('cardTitle' | 'bodyCompact')`, already in use on the version row (`app/settings-about.tsx:126-130`).
- `theme.ts` / `constants/theme.ts`: Khazain color tokens.

**Pixel-identical requirement:** the More root's eight reference rows (frame 2102:2711) must not change. This plan does not touch `data/content/sections.ts` or `app/(tabs)/more/index.tsx`. Visual change is limited to one new row on the About modal: "رقم البناء", which now always renders.

**Criterion ↔ Figma conflicts:** none. Neither gap touches a framed screen.

## 4. Approach

### A. Privacy policy: configurable URL, validated, logic extracted

1. `constants/config.ts` reads `process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL` (inlined into the bundle at build time, the same mechanism as `EXPO_PUBLIC_SENTRY_DSN` in the tracked `.env`). It runs the value through a pure `normalizePrivacyPolicyUrl(raw)` that:
   - trims whitespace
   - accepts only `https://` URLs. The check uses a regex, not `new URL()`, because React Native's `URL` polyfill throws on `.protocol` and friends.
   - returns `string | null` and never `''`
2. The tap handler moves out of the screen into `services/privacyPolicy.ts`, following the extract-to-test pattern of `services/contactForm.ts`. It becomes `openPrivacyPolicy({ url, openBrowser, alert })` and returns `'opened' | 'pending' | 'failed'`. The Arabic copy becomes frozen constants. The screen (`app/(tabs)/more/settings.tsx:86-97`) becomes a one-line call that passes `WebBrowser.openBrowserAsync` and `Alert.alert`. Behaviour is unchanged while the URL is unset. Once the URL is set, the policy opens in `expo-web-browser`, which is the in-app browser.
3. The env var is documented in a commented line in `.env`, and `RELEASE-READINESS.md:26-28` is updated to name it.

**Fallback while no URL exists:** keep the existing Arabic "coming soon" alert. Alternative A2 below was considered and rejected.

### B. Build number: native value, no new dependency

The new `services/appBuildInfo.ts` reads the **native** build number. Native wins over the app config because OTA updates can change the config but never the binary.

| Platform | Source | Why it is trustworthy |
|---|---|---|
| iOS | `Constants.platform.ios.buildNumber` (expo-constants 18.0.13, already a dependency) | Documented API. Native code returns `NSBundle.mainBundle.infoDictionary[CFBundleVersion]` (`node_modules/expo-constants/ios/EXConstantsService.m:49-59`), which is the value EAS remote versioning writes. |
| Android | `RNSentry.fetchNativeRelease().build` through `TurboModuleRegistry.get('RNSentry')` (`@sentry/react-native` ~7.2.0, already a dependency) | expo-constants returns an **empty** map on Android (`node_modules/expo-constants/android/src/main/java/expo/modules/constants/ConstantsService.kt:46`). Sentry's native module returns `String.valueOf(packageInfo.versionCode)` from `PackageManager` (`node_modules/@sentry/react-native/android/src/main/java/io/sentry/react/RNSentryModuleImpl.java:477-483`). `packageInfo` is set in the module constructor, so the call works whether or not `Sentry.init` is enabled. `app/_layout.tsx:74` disables Sentry in dev and without a DSN. |
| Either, fallback | `Constants.expoConfig.ios.buildNumber` / `android.versionCode` | The existing behaviour, kept in case a future `app.json` sets the field. |
| Web / Expo Go | none | Returns `null`. |

Design:
- `pickBuildNumber(sources)` is a pure function with the precedence native → `expoConfig` → `null`. It treats `''`, `'null'`, `'undefined'` and `'0'` as absent.
- `readNativeBuildNumber(deps)` is async. Its dependencies are injected (`os`, `iosBuildNumber()`, `getSentryNative()`), and every native access is wrapped in try/catch so it never throws.
- `hooks/useAppBuildNumber.ts` seeds state from the synchronous sources (the iOS value is synchronous), then upgrades it from `readNativeBuildNumber()` on mount.
- `app/settings-about.tsx` **always** renders the "رقم البناء" row. The value is the build number, or `—` while unresolved (web / Expo Go). Rendering the row unconditionally removes the hide-when-empty guard that caused the audit failure, and avoids a layout jump when the Android value arrives. Digits stay Latin to match the existing version row (`app/settings-about.tsx:53`), which shows `1.0.0` verbatim.
- A **contract-pin test** reads `node_modules/@sentry/react-native/dist/js/NativeRNSentry.d.ts` and asserts that `fetchNativeRelease(): Promise<NativeReleaseResponse>` and `build: string` still exist. A Sentry upgrade that renames the method then fails CI instead of silently blanking the row.

### Alternatives rejected

- **A2. Bundled in-app Arabic privacy policy screen.** No policy text exists. Writing one means inventing a legal document for a real foundation, and it would have to disclose Sentry diagnostics accurately (`RELEASE-READINESS.md:27`). That is the foundation's content to supply. The configurable URL keeps the criterion's mechanism ("opens in-app browser") intact and needs no code change once the URL arrives.
- **A3. Default to a guessed `https://khazayin.com/privacy`.** The site has no such page today, and a 404 behind a legal link is worse than an honest "coming soon".
- **B2. Add `expo-application`.** This is the cleanest API, but it is a new dependency (USER_ONLY per CLAUDE.md "Things NOT to do"; `conductor/authority-matrix.md` is referenced there but not in this tree). It is listed as an open question, and the plan proceeds without it.
- **B3. Convert `app.json` to `app.config.js` and scrape `android/app/build.gradle` for `versionCode` during expo-constants' `createExpoConfig` gradle task.** This relies on gradle task ordering and on EAS's native-file rewrite happening first, and it is invisible in local `expo run`. Too fragile, and it changes the project's config format for one number.
- **B4. Ask EAS for an env var.** EAS sets no documented build-number env var (`EAS_BUILD_ID`, `EAS_BUILD_PROFILE` and similar exist, but none carries the build number), so there is nothing reliable to inject.

## 5. Data, route and store changes

- **Routes:** none.
- **Stores:** none.
- **Config:** `KhazainConfig.privacyPolicyUrl` changes type from `''` to `string | null`. Its only consumer is `app/(tabs)/more/settings.tsx:87`, which already checks for a falsy value.
- **New modules:** `services/privacyPolicy.ts`, `services/appBuildInfo.ts`, `hooks/useAppBuildNumber.ts`.
- **Env:** the new optional `EXPO_PUBLIC_PRIVACY_POLICY_URL`. It is public by design: it is a URL, not a secret.

## 6. RTL considerations

- The always-rendered build row reuses `styles.versionRow` (`PHYSICAL_ROW`, physical left → right: value, label) and needs no new layout.
- `—` and Latin digits are direction-neutral. The label keeps `textStyle(...)`, which already carries `RTL_TEXT`.
- The in-app browser is a native sheet and follows the system direction. Nothing to pin.

## 7. Risks

| Risk | Mitigation |
|---|---|
| A Sentry upgrade renames or removes `fetchNativeRelease`. | The contract-pin test fails. At runtime the try/catch returns `null` and the row shows `—`. |
| `TurboModuleRegistry.get('RNSentry')` is `null` on some arch. | The reader returns `null`. Task 7 verifies the call on an iOS simulator and an Android emulator. |
| Dev builds report build `1`. | Correct: that is the dev binary's real `versionCode` / `CFBundleVersion`. |
| The privacy URL stays unset at submission. | `RELEASE-READINESS.md` names the env var explicitly. The behaviour stays the honest alert. |

## 8. Recorded decisions on minor findings

- **Preferred reciter is not used as the default for playback** (finding 3). The criterion asks only that the reciter "can be selected from available reciters". That passes: it is selectable from Settings (`app/settings-reciter.tsx:15`), during onboarding (`components/khazain/onboarding/ReciterStep.tsx:19`), and it is marked in the reciters list (`app/(tabs)/sections/reciter.tsx:83`). Routing playback through it means touching the audio boundary (`store/playerStore.ts` JSDoc) and `services/surahPlayback.ts`, which is a behaviour change outside this ticket. **Out of scope. File it as a follow-up ticket.**
- **Font size applies only to the Mushaf reading view** (finding 4). The criterion says "**Quran text** font size". `useFontScale()` is consumed by `app/(tabs)/sections/mushaf.tsx:154`, the Quran text surface. This is acceptable as specified. No change.

## 9. Out of scope

- Writing or hosting a privacy policy, and choosing its URL.
- Adding `expo-application` or any other dependency.
- Wiring the preferred reciter into playback defaults.
- Applying font scale outside the Mushaf.
- Reading the version from native (`CFBundleShortVersionString`). The version row already works from `app.json`'s `version`.
- Any change to the More root, its eight reference rows, or `MORE_EXTENSION_ROWS`.
- Legacy `app/(tabs)/settings.tsx` (preserved per CLAUDE.md).

## 10. Open questions (each has a default so work can proceed)

1. **What is the privacy policy URL?** Default: leave `EXPO_PUBLIC_PRIVACY_POLICY_URL` unset and keep the Arabic "coming soon" alert. All code ships; setting the URL in `.env` (or the EAS profile `env`) and rebuilding is the only remaining step. Suggestion for the foundation: publish the policy at a stable `https://khazayin.com/...` path. It must disclose Sentry crash and diagnostic collection.
2. **May we add `expo-application`** to replace the Sentry-module read on Android? Default: **no**. Use the no-dependency approach in §4B. If it is approved later, swap the Android branch of `readNativeBuildNumber` for `Application.nativeBuildVersion`. The function signature and its tests stay as they are.
