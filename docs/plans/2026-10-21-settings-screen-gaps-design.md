# Settings screen gaps: design

- **Ticket:** "Settings Screen" (https://trello.com/c/JIMyPFTs). Marked Done, but it failed the acceptance-criteria audit.
- **Slug:** `settings-screen-gaps`
- **Branch:** `fix/settings-privacy-build-number`
- **Date:** 2026-10-21
- **Revision:** v2, after CTO review and user decisions (expo-application approved; privacy URL deferred to the client)

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

The obvious fix is `expo-application`. It sits in `node_modules` as a transitive dependency but was **not** in `package.json`, so the project rules count it as a new dependency. **v2:** the user approved adding it (§4B).

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

1. `constants/config.ts` reads `process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL`. The value is **inlined into the JS bundle at build time**, the same mechanism as `EXPO_PUBLIC_SENTRY_DSN` in the tracked `.env`. Changing it needs a new build, because `expo-updates` is not installed. It runs the value through a pure `normalizePrivacyPolicyUrl(raw)` that:
   - trims whitespace
   - accepts only `https://` URLs. The check uses a regex, not `new URL()`, because React Native's `URL` polyfill throws on `.protocol` and friends.
   - returns `string | null` and never `''`
2. The tap handler moves out of the screen into `services/privacyPolicy.ts`, following the extract-to-test pattern of `services/contactForm.ts`. It becomes `openPrivacyPolicy({ url, openBrowser, alert })` and returns `'opened' | 'pending' | 'failed'`. The Arabic copy becomes frozen constants. The screen (`app/(tabs)/more/settings.tsx:86-97`) becomes a one-line call that passes `WebBrowser.openBrowserAsync` and `Alert.alert`. Behaviour is unchanged while the URL is unset. Once the URL is set, the policy opens in `expo-web-browser`, which is the in-app browser.
3. The env var is documented in a commented line in `.env`, and `RELEASE-READINESS.md:26-28` is updated to name it.

**Fallback while no URL exists:** keep the existing Arabic "coming soon" alert. Alternative A2 below was considered and rejected.

### B. Build number: `expo-application`, synchronous (v2, after CTO review)

**User decision (2026-10-21):** adding `expo-application` is approved. It is already linked into both native projects, transitively: `expo-notifications` declares `"expo-application": "~7.0.8"` (`node_modules/expo-notifications/package.json:51`). As a result:
- `package-lock.json:7746-7749` already resolves `node_modules/expo-application` to **7.0.8**.
- The main checkout's `ios/Podfile.lock` already has `EXApplication (7.0.8)`. That file lives only in the main checkout, because `/ios` is git-ignored.

Promoting it to a direct dependency with `npx expo install expo-application` therefore changes `package.json` (and possibly the root entry in `package-lock.json`), and nothing native.

The new `services/appBuildInfo.ts` exports one pure, synchronous function:

```ts
resolveBuildNumber({ executionEnvironment, nativeBuildVersion, expoConfig }): string | null
```

| Precedence | Source | Why |
|---|---|---|
| 0. Guard | `Constants.executionEnvironment === 'storeClient'` → `null` | In Expo Go, `nativeBuildVersion` is **Expo Go's own** build number, not this app's. Showing it would be a wrong number, which is worse than `—`. |
| 1 | `Application.nativeBuildVersion` | The documented API. iOS returns `CFBundleVersion` and Android returns `versionCode`, read from the installed binary. These are exactly the values EAS remote versioning (`eas.json:4`) writes into the native project. The call is synchronous, so there is no loading state. |
| 2 | `Constants.expoConfig.ios.buildNumber` / `android.versionCode` | The existing fallback, kept in case a future `app.json` sets the field. |
| 3 | `null` | Web (where `nativeBuildVersion` is `null`), Expo Go, or nothing usable. |

Values `''`, whitespace, `'null'`, `'undefined'` and `'0'` count as absent at every tier.

`app/settings-about.tsx` calls `resolveBuildNumber` once at render, with the real `Constants` and `Application` values. Its local `resolveBuildNumber` at lines 14-22 and the `{build ? … : null}` guard at lines 56-61 are removed. The "رقم البناء" row **always** renders, showing `{build ?? '—'}`.
- `—` appears only when the number is genuinely unavailable (web, Expo Go). There is no async flash.
- Digits stay Latin, matching the existing version row (`app/settings-about.tsx:53`, which shows `1.0.0` verbatim).

**Not used (v1 approach, dropped in v2):** the Sentry `RNSentry.fetchNativeRelease()` route, the async `readNativeBuildNumber`, `hooks/useAppBuildNumber.ts`, and the Sentry contract-pin test. All of these existed only to avoid the dependency the user has now approved.

### Alternatives rejected

- **A2. Bundled in-app Arabic privacy policy screen.** No policy text exists. Writing one means inventing a legal document for a real foundation, and it would have to disclose Sentry diagnostics accurately (`RELEASE-READINESS.md:27`). That is the foundation's content to supply. The configurable URL keeps the criterion's mechanism intact.
- **A3. Default to a guessed `https://khazayin.com/privacy`.** The site has no such page today, and a 404 behind a legal link is worse than an honest "coming soon".
- **B2. Without the dependency: read `Constants.platform.ios.buildNumber` on iOS and Sentry's undocumented `RNSentry.fetchNativeRelease()` on Android.** This was the v1 plan. Dropped: it relied on an undocumented third-party native API with an async read, while a documented, already-linked module exists.
- **B3. Convert `app.json` to `app.config.js` and scrape `android/app/build.gradle` during expo-constants' `createExpoConfig` gradle task.** Depends on gradle task ordering and is invisible in local `expo run`. Too fragile.
- **B4. An EAS env var.** EAS sets no documented build-number env var.

## 5. Data, route and store changes

- **Routes:** none.
- **Stores:** none.
- **Config:** `KhazainConfig.privacyPolicyUrl` changes type from `''` to `string | null`. Its only consumer is `app/(tabs)/more/settings.tsx:87`, which already checks for a falsy value.
- **New modules:** `services/privacyPolicy.ts` and `services/appBuildInfo.ts`.
- **Dependency:** `expo-application` (~7.0.8) is promoted from transitive to direct. User-approved. No native change.
- **Env:** the new optional `EXPO_PUBLIC_PRIVACY_POLICY_URL`.
  - It is public by design (a URL, not a secret).
  - It is **inlined into the JS bundle at build time.** Changing it needs a new binary build: `expo-updates` is not installed (it is absent from `package.json`), so there is no OTA path.

## 6. RTL considerations

- The always-rendered build row reuses `styles.versionRow` (`PHYSICAL_ROW`, physical left → right: value, label). No new layout.
- `—` and Latin digits are direction-neutral. The label keeps `textStyle(...)`, which already carries `RTL_TEXT`.
- The in-app browser is a native sheet and follows the system direction. Nothing to pin.

## 7. Risks

| Risk | Mitigation |
|---|---|
| `npx expo install` picks a version other than 7.0.x, causing a native diff. | Task 4 asserts that `package.json`, `package-lock.json` and the main checkout's `ios/Podfile.lock` all read 7.0.8. If they differ, stop and report. |
| Expo Go shows Expo Go's own build number. | The `storeClient` guard returns `null`, and a unit test pins it. |
| Local dev builds report build `1`. | Correct: that is the local binary's real `versionCode` / `CFBundleVersion`. The remote-managed number (> 1) can only be proven on an EAS build (Task 7 follow-up). |
| The privacy URL stays unset at submission. | `RELEASE-READINESS.md:26` stays **unchecked** and names the env var. The behaviour stays the honest alert. |

## 8. Recorded decisions on minor findings

- **Preferred reciter is not used as the default for playback** (finding 3). The criterion asks only that the reciter "can be selected from available reciters". That passes: it is selectable from Settings (`app/settings-reciter.tsx:15`), during onboarding (`components/khazain/onboarding/ReciterStep.tsx:19`), and it is marked in the reciters list (`app/(tabs)/sections/reciter.tsx:83`). Routing playback through it touches the audio boundary (`store/playerStore.ts` JSDoc, `services/surahPlayback.ts`). **Out of scope. File it as a follow-up ticket.**
- **Font size applies only to the Mushaf reading view** (finding 4). The criterion says "**Quran text** font size". `useFontScale()` is consumed by `app/(tabs)/sections/mushaf.tsx:154`. This is acceptable as specified. No change.

## 9. Out of scope

- Writing or hosting a privacy policy, and choosing its URL.
- Any dependency other than `expo-application`.
- Wiring the preferred reciter into playback defaults.
- Applying font scale outside the Mushaf.
- Reading the version from native (`Application.nativeApplicationVersion`). The version row already works from `app.json`'s `version`.
- Any change to the More root, its eight reference rows, or `MORE_EXTENSION_ROWS`.
- Legacy `app/(tabs)/settings.tsx` (preserved per CLAUDE.md).

## 10. Done when (per criterion)

| Criterion | Done when | Status after this plan |
|---|---|---|
| App version and build number are displayed | "رقم البناء" renders on `/settings-about` with `Application.nativeBuildVersion`, verified on a local iOS simulator and Android emulator (value `1` / local `CFBundleVersion`). | **Code-complete.** Proof of a remote-managed `versionCode` > 1 on an EAS preview APK is a **manual follow-up** (Task 7). |
| Privacy policy link opens in-app browser | `openPrivacyPolicy` opens `expo-web-browser` whenever `EXPO_PUBLIC_PRIVACY_POLICY_URL` is a valid https URL. Unit-tested, and demonstrated on a simulator with a temporary local URL. | **Code-complete, BLOCKED on the client's URL.** It closes only when the client supplies the URL, it is set in `.env` or the EAS profile `env`, and a **new build** ships (the value is inlined at bundle time; no expo-updates). `RELEASE-READINESS.md:26` stays ☐. |
| The other five | Already passing (§2). Regression-checked in Task 8. | PASS |

## 11. Decisions and remaining open questions

1. **Privacy policy URL.** *Decided by the user:* keep `EXPO_PUBLIC_PRIVACY_POLICY_URL` and the Arabic "coming soon" alert, and the user supplies the URL later. *Still open:* the URL itself. Suggestion for the foundation: a stable `https://khazayin.com/...` path that discloses Sentry crash and diagnostic collection.
2. **`expo-application`.** *Decided by the user:* approved, added with `npx expo install expo-application`.
