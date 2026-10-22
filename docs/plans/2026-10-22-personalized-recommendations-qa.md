# Personalized recommendations — QA record

**Date:** 2026-10-22
**Branch:** `feat/personalized-recommendations-2026-10-22` (stacked on `feat/tablet-layout-2026-10-22`)
**Design:** `docs/plans/2026-10-22-personalized-recommendations-design.md`. Cases: design §10.4.
**Captures:** `docs/audit/2026-10-22-recommendations/` (untracked, like the tablet captures).

Spec authority: no frame in `docs/KHAZAYIN.fig` covers a recommendations section, so nothing
below claims "matches Figma". Layout is checked against the design's own rules (§6) and the
`constants/*` contracts; the row reuses the scholar-detail `RibbonCard`.

Content runs on the mock adapter (`EXPO_PUBLIC_API_BASE` unset). The mock has ayat only for
surah 002 (`data/content/quran.ts` `AYAT_BY_SURAH`), which bounds cases 7 and 9.

## Automated

| Check | Result |
|---|---|
| `npx jest` | 149 suites, 1865 tests, all pass |
| `npx tsc --noEmit --pretty false` | clean |

## Devices

| Device | Build | Orientation |
|---|---|---|
| iPhone 16 sim, iOS 26.5 (393pt) | dev client | portrait |
| Realme Note 50-class AVD, API 36 (360×800dp) | dev client | portrait (locked) |
| iPad Pro 13-inch (M5) sim (1032×1376pt) | dev client | portrait, landscape |
| Pixel Tablet AVD, API 36 (800×1280dp) | dev client | landscape, portrait |

## Cases (design §10.4)

| # | Case | iPhone | Realme 360dp | iPad | Pixel Tablet | Capture |
|---|---|---|---|---|---|---|
| 1 | Fresh install: hint row, no shift when activity resolves | ✓ | ✓ | ✓ | ✓ | `ios-01-fresh-hint`, `ipad-01-hint` |
| 2 | First save → skeleton → ≤3 rows (phone) / ≤4 in 2 cols (tablet), first at physical right, one scholar row | ✓ (after fix 1) | ✓ (after fix 1) | ✓ | ✓ | `ios-02c-rows`, `realme-02-rows-after-home-save`, `pixeltab-13a-landscape-grid` |
| 3 | × dismisses, toast «تم إخفاء الاقتراح» + «تراجع» restores | ✓ | — | — | — | `ios-03-dismiss-toast` |
| 4 | Dismiss everything → «لا توجد اقتراحات جديدة الآن», same section height | ✓ | — | — | — | `ios-04-all-dismissed-empty` |
| 5 | Long-press a recommendation row does nothing | ✓ | — | — | — | — |
| 6 | Listen ≥60s, return Home → list updates with «لأنك استمعت إلى «series»» | ✓ (after fix 3) | — | — | — | `ios-06-listened-reason-tab-bug` (before), `ios-06b-listened-reason-series-title` (after) |
| 7 | End of surah: «السورة التالية: سورة …» + one tafsir row; tafsir opens the scholar page, MiniPlayer returns there | ✓ on 002 | — | — | — | `ios-07-surah-end-002`, `ios-07b-scholar-from-mushaf-player-visible` |
| 8 | Next surah then Back returns to the opener; MiniPlayer hidden over Mushaf incl. under the note editor | ✓ | — | — | — | `ios-08-after-note-editor-player-hidden`, `ios-08b-back-to-sections` |
| 9 | An-Nas end: no next-surah row | mock has no ayat for 114; unit-tested (`nextSurahParams`) | | | | — |
| 10 | Settings «إعادة عرض الاقتراحات المخفية» restores dismissed | ✓ | — | — | — | `ios-10-reset-toast` |
| 11 | Progress reset: listening/reading rows go, save rows stay | ✓ | — | — | — | `ios-11-after-progress-reset` |
| 12 | 360dp at the largest font level: reason secondary, no clipping, × keeps 44pt | — | ✓ after an app restart (see finding 4) | — | — | `realme-12*` |
| 13 | Tablet rotate: grid reflows, right-anchored | — | — | ✓ portrait + landscape | ✓ landscape + portrait | `ipad-13a-portrait-grid`, `ipad-13b-landscape-grid`, `pixeltab-13a-landscape-grid`, `pixeltab-13b-portrait` |
| 14 | Airplane mode cold start | N/A: the mock adapter makes no network calls; the loader's `aborted` path is unit-tested | | | | — |

"—" means not repeated on that device: the behaviour is platform-independent JS and was run on
the iPhone; the phone/tablet-specific cases (1, 2, 12, 13) ran on every relevant device.

## Findings and fixes

Each fix has its own failing test first.

| # | Finding | Fix | Commit |
|---|---|---|---|
| 1 | Saving the first item **on Home** left a permanent skeleton: the catalogue load was only tried on focus | Home subscribes to the saved, notes and activity stores (`watchSignals`) and tries the gated load when a first signal appears | `7da9242` |
| 2 | Untopical saves (e.g. «الإعجاز العلمي في السنة النبوية», «فقه العبادات») produced no recommendations | Topic phrases for sunnah, worship fiqh, the Arba'in, the three usul and seerah titles | `3b57f2c`, `2158307` |
| 3 | The listening reason quoted the episode title with its raw TAB («1-\tعنوان الكتاب…») | Session signals use the resolved series title; `cut()` collapses whitespace and trims | `51577a8`, `3a1725e` |
| 4 | Review: the Home activity filter was the only guard against `loadCatalogue` re-entering itself | `inFlight` is assigned before the first store write | `5be03b7` |
| 5 | "Because you saved X" recommended X itself: the Home books rail (`lectures.ts` `b2`) and the catalogue (`books.ts` `bk5`) carry the same work under different ids | A saved book hides its own Home-rail row by id and same-titled books and non-scholar lecture rows; scholar series are never hidden by title (different recordings of «شرح رياض الصالحين» stay), and unresolved session titles never title-match | `ee4c62d` |
| 6 | Doc drift between design §5.1 and the shipped topic map; "focused" vs "mounted" | Design synced | `d17dfd3` |
| 7 | **Android (Pixel Tablet, API 36):** after a rotation, or any relayout that narrows the column, the scholar row's title «عبد العزيز بن عبد الله بن باز» drew without «باز». Pre-existing and app-wide (also on `feat/tablet-layout-2026-10-22` and the scholar lists; the tablet QA record logged it as out of scope). Root cause: with `targetSdk` ≥ 35, Android 15+ breaks lines by glyph ink bounds (`useBoundsForWidth`) while RN 0.81 measures by advances, so a shrink-wrapped Text gets a box one line wide and Android draws two | `RibbonCard`'s title block stretches its Texts to the full column (identical rendering, they right-align through `textStyle`). Verified cold landscape → portrait on Home, the scholar list and scholar-detail lecture rows. The upstream fix (RN `matchLineBreakingToMeasurement`) is not in 0.81–0.83; the scholar-detail header name and «كل الشرح» stay exposed until an RN upgrade (dependency change, owner's decision). Capture: `pixeltab-07-rotate-L-to-P-after-fix` | `28e18fe` |

## Observations (no change)

- **Blank band under short rows (fixed after QA).** `RECOMMENDATION_SLOT_HEIGHT` reserved a two-line
  title, so three one-line rows left ~90pt blank above «أنت ملكة» on the iPhone 16. The slot is now
  one typical one-line row (71pt, pinned to `RibbonCard` by `__tests__/recommendationSlotHeight.test.ts`);
  re-checked on the iPhone 16 after a clean build: the gap under the section matches the other Home
  sections. A wrapped title now grows its row once the items arrive (§6.5 residual).
- **Repeated titles from different scholars** («شرح رياض الصالحين» by Ibn Baz and by Ibn
  Uthaymin) can sit side by side; the meta line names the scholar. Intended (different recordings).
- **Realme font clipping at 1.3–2.0 font scale** appeared only after changing the system font
  scale while the app was running; after a restart nothing clipped. The app caps scaling at
  `MAX_FONT_SCALE = 1.2`. A relayout after a font-scale change fits the same mechanism as
  finding 7 (the Realme AVD is API 36).
- **Rapid × taps** (under ~1s apart) were sometimes dropped on the iPhone simulator while the
  list re-laid out; single taps always dismissed.
- **Pre-existing:** the Library «١٠ صفحة» count reads singular after a number above 10. Not in scope.

## Not run in this pass

- VoiceOver / TalkBack: the «تم إخفاء الاقتراح» announcement (case 3) is covered by the
  `useScreenReaderOn` + `dismissRecommendation({announce})` unit tests, not walked live.
- iPad Split View (case 13): walked afterwards on iPadOS 26 (see below).
- Case 4 on tablets: the empty state uses the same `limit × slot` height rule as the grid.

## Pending Foundation review (copy)

- Cold-start hint: «احفظ درسًا أو استمع إليه لتظهر هنا اقتراحات تناسبك».
- Empty state: «لا توجد اقتراحات جديدة الآن».

## iPad windowing (iPadOS 26)

Home with «مقترح لك» rows was walked on the iPad Pro 13 sim, tiled with Safari and in free windows at
about ⅓, ½ and full width, portrait and landscape: ✓. Below 600pt the section uses the phone list
(3 rows), at 600pt and up the two-column grid. The bell hidden by the iPadOS window controls is a
header issue, fixed on the tablet branch (`3222e49`, PR #17). Captures:
`docs/audit/2026-10-22-community/splitview-p1-home-*` (untracked).

