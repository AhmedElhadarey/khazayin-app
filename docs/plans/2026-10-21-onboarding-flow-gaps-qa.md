# Onboarding flow gaps — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro
(`EXPO_PUBLIC_VISUAL_AUDIT=1`, mock adapter), branch `feat/onboarding-audio-previews`.
The interactive rows ran at aaa3c97. The A3 fix and the framed routes were verified at
e279937 and re-checked at cd5bc2d. Baseline: same build at 0635ea1.

**No Figma frame covers onboarding.** Each step is judged against the contract named in
the plan (Task 13): `constants/layout.ts` (`PHYSICAL_ROW`, `RTL_TEXT`),
`constants/rtlContracts.ts` (`SELECTABLE_ROW_ORDER`) and the Khazain tokens.

## Regression found and fixed during QA

**A3 — Qira'a rows grew 2 pt.** The first per-pixel diff of step 2 against 0635ea1 read
12.4%: every row was ~2 pt taller. The Task 10 restructure had moved the border onto an
outer card View but left `minHeight: 64` on the inner radio Pressable. Yoga applies
`minHeight` to the border-box, so the card became 64 + 2 × border.

- **4e19c24:** `minHeight` moved to the card. Row heights then matched, but the selected
  row's tick sat one device pixel (⅓ pt) lower. With the border on the card, the radio's
  origin landed on a half pixel (1.5 pt = 4.5 px).
- **e279937:** the border is now an absolutely positioned overlay that is hidden from
  accessibility, and the radio pads by `12 + border` / `16 + border`. This is the
  geometry the base row had.
- **cd5bc2d:** the press scale moved back to the whole card, as at base.

Result: step 2 differs from base **only in the progress-dot band (rows 225–248 of 2556)**,
which is intended: the flow went from 8 steps to 4. Row frames match base exactly
(x 0.061, w 0.878, h 0.075, pitch 0.0846).

## Visual — framed routes

`npm run capture:ios` at e279937, compared per pixel with the 0635ea1 captures (threshold
16/channel, status bar and home indicator excluded): **23 of 23 captured frames at
0.000%**. The 5 transition frames are always skipped.

## Steps

| # | Check | Result |
|---|---|---|
| A1 | Welcome, step 1/4 | ✅ FoundationMark (user-approved deviation, Q6), Wordmark, mission and 4 highlight rows with the gold bullet at the physical right; 4 progress dots; «تخطّي» reachable |
| A2 | Welcome at large text | ✅ approximated on iOS with Dynamic Type accessibility-large (~×1.7). `screen-matrix.mjs` drives an Android emulator, so the 320 pt width was not run. The content scrolls under the footer and nothing is clipped |
| A3 | Qira'a, step 2/4 | ✅ after the fix above: pixel-identical rows, no preview button |
| A4 | Reciter, step 3/4 | ✅ Minshawi, Afasy and Husary carry a preview button at the physical left, with the title still at the right edge; the current pick (Maher Al-Muaiqly) has no button |
| A5 | Channels, step 4/4 | ✅ Telegram opens t.me/Alrahmn (`ChannelsStep` is unchanged from base); «ابدأ» finishes onboarding |
| A6 | Transitions / Reduce Motion | Not run on device. The Reduce Motion branch (`AccessibilityInfo.isReduceMotionEnabled`) is pinned by `onboardingSteps.test.ts` |
| A7 | Step 3 accessibility tree | ✅ the radio row and the preview button are separate elements with Arabic labels («استماع إلى عيّنة من تلاوة …»). A full VoiceOver pass was not run |

| # | Preview action | Result |
|---|---|---|
| B1 | Play on a row | ✅ the native player plays `preview:r3` from the archive.org URL; the row is not selected |
| B2 | Play B while A plays | ✅ A stops and B plays; one sound at a time |
| B3 | Wait 30 s | ✅ the preview stops; player state `none`, queue empty, button back to play |
| B4 | Play, then «متابعة» / «رجوع» / «تخطّي» | ✅ audio stops immediately in each case; after skip, Home loads with the player cleared |
| B5 | Play, then background the app | ✅ audio stops |
| B6 | Airplane mode | Not run on device (the simulator shares the host network). The failure toast is covered by `reciterPreview.test.ts` and `syncBridge.test.ts` |
| B7 | Lecture restored but not played → reset onboarding → preview to the end → finish | ✅ the MiniPlayer still shows «شرح صحيح البخاري», paused. Play resumes it from about 26 s, where it was when the app was killed. Library shows it in progress, not completed |
| B8 | Lecture playing in the tabs → reset onboarding → step 3 | ✅ no preview buttons; the lecture keeps playing (16 s) |
| B9 | Kill on step 3, relaunch | ✅ resumes on step 3/4 |
| B10 | Android swipe-away | Not run (no Android emulator in this pass) |

**Migration (Step 3):** wrote `{"onboardingComplete":false,"onboardingStep":6,"schemaVersion":3}`
into a fresh install. The app launched on step 4/4 (Channels) without a crash. ✅

Gates at cd5bc2d: `npx jest` 79 suites, 938 passed / 1 skipped; `npx tsc --noEmit` clean; the plan's lint grep prints nothing; the residue grep matches only the tests that assert `FeatureStep` is gone.

Not run in this pass: A6 (Reduce Motion), B6 on device, B10 and the Android rows, and a
full VoiceOver pass.
