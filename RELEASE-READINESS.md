# Release Readiness — production hardening handoff

The `prodfix-boot-resilience` branch completed all code-authorable items from the
2026-06-17 production-readiness audit (Phases 1–7), each code-reviewed. This file
is the turnkey checklist for the remaining items whose deliverable is **not source
code** — a secret, a URL, a credential, a dependency install, a cloud build, a
tooling run, a device test, or a server action. Do these, then merge.

> Status legend: ☐ you do this · ⟳ ping the assistant to do the paired code change

---

## 1. Security (Phase 0)

- ☐ **Rotate the Nextcloud share token** (server-side). The old token was removed
  from `README.md` but remains in git history (commit `45bc50c`); rotation is the
  real remediation. If the repo will be public, also purge history (BFG /
  `git filter-repo`).
- ☐ **Create the Sentry auth token as an EAS secret** (T0.2):
  ```
  eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token> --type string
  ```
  ⟳ Then I remove `SENTRY_DISABLE_AUTO_UPLOAD=true` from the **production** profile
  in `eas.json` (kept on dev/preview) in one commit. Don't flip it before the secret
  exists — the build fails without the token.
- ☐ **Privacy-policy URL** (T0.4): set `KhazainConfig.privacyPolicyUrl` to a live URL
  (must disclose Sentry diagnostic-data collection). Required for App Store / Play
  submission. ⟳ I can wire it once you have the URL.
- ☐ **Store submit config** (T0.3): `eas.json` `submit.production` is empty (works via
  interactive prompt). For non-interactive submit, add `android` (service-account key
  / track) and `ios` (ascAppId, appleTeamId) — these are your credentials.

## 2. Build / size (Phase 6)

- ✅ **WebP optimization (T6.1) — DONE.** `sharp` added (devDep, user-authorized);
  `scripts/optimize-assets.mjs` run; 7 in-app art PNGs (heroes, dawah, emblem) →
  WebP, `require()` sites rewired, source PNGs removed. **~2.4 MB off the bundled
  assets** (`assets/khazain` 5.1M → 2.8M), tsc clean, 112/112 tests. App icons /
  splash / favicon under `assets/images` correctly left as PNG (Expo requires it).
  Still ☐ for you: an on-device glance that the heroes/dawah/emblem render correctly
  from WebP (part of the QA pass in §4).
- ☐ **Verify the real download size** (T6.2 — answers the original "100 MB" question):
  ```
  eas build --profile production --platform android      # produces an AAB
  bundletool build-apks --bundle=app.aab --output=app.apks --mode=default
  bundletool get-size total --apks=app.apks              # expect ~30–45 MB
  ```
  The 100 MB you saw was a universal/dev APK (all 4 ABIs). Play split-delivery from
  the AAB ships one ABI per device.
- ✅ **ABI split (T6.3) — RESOLVED, no action.** Superseded by the AAB above: Play
  Store split-delivery already gives each device only its ABI. Only relevant if you
  hand out raw APKs (not the Play track), in which case it needs `expo-build-properties`.

## 3. Tooling (Phase 7)

- ☐ **Regenerate typed routes** (T7.6): run `npx expo start` once so
  `.expo/types/router.d.ts` regenerates. ⟳ I then remove the `router.push(... as any)`
  casts that now type-check (CLAUDE.md keeps them until the types include the route).
- (T7.10 vector-icons removal stays parked — tied to legacy-screen retirement, your call.)

## 4. On-device QA (mandatory per CLAUDE.md — tsc/lint can't verify RTL/layout)

Run the branch on a device/simulator and confirm:
- ☐ Section lists (scholar / reciter / lectures) scroll smoothly; the right-rail
  `LetterIndex` overlays correctly (T3.1).
- ☐ Hero/poster images paint with no load-flash (T3.4).
- ☐ Tab-bar + MiniPlayer touch targets and the `12px` tab-label / BookCard wrap look
  right (T4.6/T4.7/T4.9/T5.5).
- ☐ The four design-system rows (settings/list/reminder) keep correct RTL order on
  **Expo-web** too (T5.1), and the InlineHeader back-chevron reads as "back" (T5.4).
- ☐ Wird/audio progress fills anchor to the right edge (T5.6).
- ☐ **TalkBack + VoiceOver sweep** — validates the Phase 4 a11y work: every control
  announces a role + Arabic name; toggles announce on/off; reduce-motion stops the
  skeleton shimmer.

---

When any ⟳ item is unblocked, ping me with the input and I'll land the paired code
change (with a review) immediately.

## 5. Prayer notifications — the gate (US3)

The prayer-time **engine** is complete, reviewed, and tested (36 suites / 274 tests).
Prayer **notifications** are deliberately incapable of firing. Three independent
guards hold them shut; do not lift any one of them alone.

- ☐ **Client-approved Arabic notification copy** (FR-068 / T069). This is the only
  blocker. Today `services/notificationScheduler.ts:76` ships
  `PRAYER_BODY_PLACEHOLDER = 'حان وقت الصلاة'`. Five strings are needed — one body per
  prayer, or one body reused with the prayer name as title (titles already exist as
  `labelAr` in `services/notificationRegistry.ts`; they need no approval).

  ⟳ When the copy lands, ping me. **All three of these change in ONE commit:**
  1. replace `PRAYER_BODY_PLACEHOLDER` with the approved copy;
  2. flip `available: false → true` on the five `prayer-*` entries in
     `services/notificationRegistry.ts`;
  3. install the provider — call `setPrayerTimesProvider(createPrayerTimesProvider(cfg))`
     from a real boot site, re-installing whenever `settings.prayer` changes.

  **Why together:** the five categories are `defaultOn: true`, so a user's stored
  preference is already `true` on every install. `available` is the *scheduling*
  guard (`services/horizonOrchestrator.ts:138-143` masks the preference by it), and
  the null provider is the *data* guard. Flipping `available` while the copy is still
  the placeholder fires `حان وقت الصلاة` to every user. Installing the provider without
  flipping `available` arms nothing. Test `T-HO-7` binds the mask; keep it.

  Then, per the phase-exit protocol: spec-compliance review → code-quality review →
  on-device QA. Notifications cannot be verified in Expo Go for *exact-alarm* and
  boot-rescheduling behaviour (local delivery does work there); confirm on a dev build.

- ☐ **macOS-only:** verify `UIBackgroundModes` in the generated `ios/*/Info.plist`
  contains `processing` **and** that `BGTaskSchedulerPermittedIdentifiers` lists the
  `expo-background-task` identifier (T123). Without it the iOS horizon top-up silently
  never runs — the app keeps working, notifications just stop after the armed horizon
  drains. Cannot be checked from Windows: `npx expo prebuild -p ios` needs macOS.

- ☐ **Play Console data-safety declaration** (T124): the app now reads coarse location
  (2 dp, ~1.1 km) for prayer times, and `Location.reverseGeocodeAsync` **transmits that
  coordinate off-device** (CLGeocoder on iOS, Play Services on Android) to resolve the
  country for the default calculation method. Both platforms treat their own geocoder
  as OS functionality rather than developer collection, so this is very likely not a
  declarable event — but it is a transmission, and the earlier "coordinates never leave
  the device" claim was wrong. Decide deliberately; do not inherit that claim.

### Known gaps, accepted and documented
- **Levant → Muslim World League.** `adhan` ships no Levant method. Deliberate fallback.
- **`HighLatitudeRule.recommended()` tests `latitude > 48`, not `Math.abs(latitude)`.**
  Southern-hemisphere high latitudes never get `SeventhOfTheNight`. Upstream adhan
  asymmetry; negligible for an Arabic-first audience.
- **`localDay` is a grouping key, not a claim about when the instant occurs.** At high
  latitude isha crosses local midnight (verified: Svalbard, isha for `2026-06-21` fires
  `00:02` on the 22nd), and the same happens in ordinary European summers. Test
  `T-PT-CROSSDAY` pins this. **Do not "fix" it by dropping entries whose `fireAt`
  escapes their `localDay` — that deletes isha at high latitudes.**
- **Umm al-Qurā vs the printed Saudi Taqwim.** Even with the Ramadan +30, expect 1–2 min
  residual differences; the official calendar carries manual adjustments. Not a bug.
