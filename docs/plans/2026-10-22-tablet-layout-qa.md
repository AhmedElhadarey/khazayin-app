# Tablet and iPad layout — QA record

**Date:** 2026-10-22
**Branch:** `feat/tablet-layout-2026-10-22`
**Design:** `docs/plans/2026-10-22-tablet-layout-design.md` (v4). Matrix: design §5.

Spec authority: no frame in `docs/KHAZAYIN.fig` is wider than 393pt, so nothing below claims
"matches Figma" on a tablet. Tablet results are checked against the design's own rules
(`constants/responsive.ts`); phone results against pre-branch screenshot baselines.

## Automated

| Check | Result |
|---|---|
| `npx jest` | 134 suites, 1704 tests, all pass |
| `npx tsc --noEmit` | clean |
| `npm run lint` | 0 errors (14 pre-existing warnings) |
| `patch-package` | `react-native-screens@4.16.0 ✔`, `react-native-track-player@4.1.2 ✔` |

## Phones — the invariant (design §3.1, C4)

Baselines in `docs/audit/2026-10-22-tablet/phone-baseline/` were captured before the first code
commit and re-compared on the finished branch with `screenshot-diff`.

| Screen | iPhone 16 (393pt) | Realme Note 50-class AVD (360dp, API 36) |
|---|---|---|
| Home | 0% | 0.04%: one 1px row on the scholar cards' gold bar. It reproduces on `origin/main` on the same device, so it is environment, not branch |
| Sections | 0% | 0% |
| Mushaf reader (Al-Baqarah) | 0% | 0% |
| Scholar profile (`s4`) | 0% | 0% |
| More | 0% | 0% |
| Library | 0.28%, data only (streak, wird %, last read changed through QA reading) | not re-diffed (same data-only regions) |

Realme with the plugin build: `requestedOrientation=SCREEN_ORIENTATION_PORTRAIT`; forcing
`user_rotation 1` leaves the display at `ROTATION_0`. Phones stay portrait-locked.

## Tablets

| Device | Orientation(s) | Notes |
|---|---|---|
| iPad Pro 13-inch (M5), iOS 26.5, 1032×1376pt | portrait, landscape | rebuilt with the react-native-screens patch |
| Pixel Tablet AVD, API 36, 800×1280dp | landscape | plugin build; `requestedOrientation=FULL_USER` |
| Pixel Tablet AVD, API 35, 800×1280dp | landscape, portrait, rotation both ways | plugin path (R6a): `FULL_USER`; display rotates to `ROTATION_90` and back |

Screens checked, all pass after the fixes below:

- **Home.** Paired heroes, right-anchored scholar and book rows (3 and 4–5 cards), queen + chips
  row, centred Dawah stage, centred 96pt tab row. iPad landscape column centred (1100pt).
  Android 15 portrait and landscape.
- **Sections.** 4 columns at 1280dp/1032pt, 3 at 800dp portrait, first tile top-right.
- **Mushaf** index in the reading column; reader sheet centred (iPad landscape 0.235–0.765 of
  the width), header over the sheet, type scaled; Android 15 portrait → landscape reflow.
- **Scholar profile.** Split pane at 1280dp landscape (panel 340 on the physical right, list
  left) on Android and iPad; stacked when rotated to portrait.
- **Railed lists** (scholars, reciters, audiobooks): column centred, rail at the column's right
  edge, rows reserve the rail. Reciter `SegmentTabs` aligned to the column on iPad and Android.
- **Library, More, More › Settings, settings modals** (font size, wird goal), **share sheet**
  (capped 600, bottom), **note editor** with the keyboard up (capped 600, editor visible),
  **onboarding** welcome step (content and footer in the column, gradient full width).

## Findings and fixes

| # | Finding | Fix | Commit |
|---|---|---|---|
| 1 | Settings apply bar (font size, wird goal, wird reminder) spanned the full tablet width under a 720pt column | Button wrapped in the column; the bar's rule stays full width. Test: `tabletReadingColumn` `footer` spec | `c846e32` |
| 2 | **iOS:** every reading column sat against the right edge on iPad (More: 0.318–0.985 of the width). `RCTScrollViewComponentView` applies a content container's x offset twice; margins fail the same way | Columns inset by equal transparent side borders (`insetColumn`); `SegmentTabs` keeps the style off its ScrollView. Tests: `responsiveTablet`, `responsiveLayoutMaths`, `mushafTablet`, `tabletReadingColumn` | `a9727b9` |
| 3 | **iOS, pre-existing (on main):** iPad page-sheet modals drawn ~97pt right, right side clipped (RTL origin from react-native-screens) | `patches/react-native-screens+4.16.0.patch` zeroes a native modal's origin; `usePageSheetLayout` drops the column on iOS sheets. Verified after an iOS rebuild | `bfd3469`, `1de745f` |
| 4 | Final review: HeaderArt defaulted to the phone inset on tablets; search "no results" outside the column; phone Home capped scholars; MiniPlayer lost its 10pt side margin on asymmetric insets; stale "centred by margins" comments | `headerArtInset` defaults to the reading inset + 16; `noResultsWrap` takes the column; scholars uncapped on phones; `MINI_PLAYER_MARGIN` floor; comments reworded | `8b07e96` |

## Web (RtlCarousel — CLAUDE.md requires a paired capture)

`RtlCarousel` gained `flexGrow: 1` on its content container. Captured with Playwright on Expo
web at 1280×900 and 393×852:

- **1280:** Home scholar row (3 cards) and book row packed against the column's right edge;
  Library filter row (الكل, المحفوظات, قوائم التشغيل, السجل) packed right, الكل right-most.
- **393:** every row starts at the right edge and overflows to the left, as before.

Expo web does not start on this branch or on `main` without local changes: `shaka-player`
(pulled in by track-player's web build) is not installed, and zustand's ESM build trips
`import.meta`. The capture used a throwaway, uncommitted `metro.config.js` that stubbed
`shaka-player` and resolved CommonJS builds. Separate ticket if web is a target.

## Not fixed here (pre-existing, out of scope)

- **Android clips the last word of some Arabic names** ("عبد المحسن العباد البدر" shows as
  "عبد المحسن العباد", "…بن باز" without "باز") on phones and tablets: the Text node is measured
  narrower than it draws. Reproduced on `origin/main` on the same device. Separate ticket.

## Not run on device in this pass

- VoiceOver / TalkBack walk-throughs. Reading order rests on the structural tests for
  `READING_ROW` / `READING_GRID` (child order = reading order); it was not walked with a live
  screen reader.
- Rotation keeping Dawah focus and the Mushaf `?ayah=` place: covered by unit tests
  (`homeTablet`, `mushafTablet`, `services/mushafAnchor`), not re-walked on device.
- Landscape cold start on the API 35 tablet (the known brief portrait starting window, design §3.7).

## Release notes

- Native changes: the Android rotation plugin and the iOS react-native-screens patch need new
  binaries (EAS), not an OTA update.
- Store large-screen screenshots (iPad, Play tablet) should be refreshed by the ticket owner.
- Quran translation side-by-side stays out of scope until a licensed source is confirmed.
