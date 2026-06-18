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

- ☐ **WebP optimization** (T6.1, ~3–5 MB): pick the converter (**D1**), then:
  ```
  npm i -D sharp                              # USER_ONLY dependency add
  node scripts/optimize-assets.mjs --dry-run  # preview savings
  node scripts/optimize-assets.mjs            # convert + print rewire checklist
  ```
  The script is conversion-only (never touches sources). ⟳ I then rewire the
  `require('...png')` sites to `.webp`, run `tsc`, and we visually verify before
  deleting the PNGs.
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
