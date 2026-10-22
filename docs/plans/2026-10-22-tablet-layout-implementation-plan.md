# Tablet and iPad layout: implementation plan

**Design:** `docs/plans/2026-10-22-tablet-layout-design.md` (v3)
**Branch:** `feat/tablet-layout-2026-10-22`
**Ticket:** https://trello.com/c/qK3f1cpc

**Every task works the same way.**

- **TDD.** Write the failing test, watch it fail for the expected reason, implement, then watch it pass.
- **Checks.** Run `npx jest`, `npx tsc --noEmit --pretty false` and `npx eslint <touched files>`.
- **Commit.** Each task is one commit in conventional format, with no `Co-Authored-By` and no AI attribution.
- **Phone invariant.** Below 600pt, nothing renders differently from `main`.

Order: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9. T2 is independent and may run any time after T1.

---

## T1. Responsive foundation

**Files:**
- `constants/responsive.ts` (new)
- `hooks/useResponsiveLayout.ts` (new)
- `constants/layout.ts`: add `READING_ROW` and `READING_GRID`, and reword the comment at `:149`
- `__tests__/responsiveTablet.test.ts` (new)

**Build:**
- **Constants:** `TABLET_MIN_WIDTH = 600`, `TABLET_GUTTER = 24`, `READING_COLUMN_MAX = 720`, `HOME_COLUMN_MAX = 1100`, `DAWAH_STAGE_MAX = 600`, `MUSHAF_SHEET_MAX = 760`, `MUSHAF_TABLET_MAX_FONT = 48`, `SPLIT_MIN_WIDTH = 900`, `SPLIT_SIDE = 340`, `SPLIT_GAP = 24`, `SECTION_TILE_MIN = 220`, `GRID_GAP = 12`, `TABLET_TAB_ITEM = 96`, `TABLET_TAB_GAP = 24`, `MINI_PLAYER_MAX = 600`, `SHEET_MAX = 600`. Freeze the grouped ones.
- **Pure functions:** `isTabletWidth`, `screenGutter`, `centredColumn`, `readingColumn`, `gridColumns`, `gridItemWidth`, `sectionGridColumns`, `homeColumnWidth`, `carouselVisibleCount`, `dawahStageWidth`, `mushafType`, `mushafSheetWidth`, `splitPane`, `tabBarRow`, `miniPlayerMaxWidth`, `sheetMaxWidth`. Signatures and values are in design §3.1 and §3.4.
- **`useResponsiveLayout()`:** reads `useWindowDimensions()` and `useSafeAreaInsets()`, computes `available = width − insets.left − insets.right`, and returns:
  `{ width: available, height, isTablet, gutter, reading: { width, inset }, columnStyle, homeColumnStyle, splitPane }`
  `columnStyle` is `centredColumn(reading.width, insets)` on tablets and `{}` on phones. `reading.inset` is measured from the window's physical right edge: `insets.right + (available − width) / 2`.
- **Reading rows:** `READING_ROW = { flexDirection: 'row-reverse', direction: 'ltr' }` and `READING_GRID = { ...READING_ROW, flexWrap: 'wrap' }`, both frozen.

**Tests:**
- **Phone invariant.** At 320, 360, 375, 393, 411, 430, 480 and 599, each helper returns today's phone value:
  - the gutter equals `horizontalGutter`
  - 1 column
  - `carouselVisibleCount` is 3
  - `dawahStageWidth(w) === w`
  - `mushafType` returns the user's size and line height unchanged
  - `splitPane` is null
  - `tabBarRow` is `{ itemWidth: 67, maxWidth: undefined }`
  - the MiniPlayer and sheet caps are undefined
  - `readingColumn` is `{ width: w − 2g, inset: g }`
  - the hook's `columnStyle` and the Home column style deep-equal `{}`
- **Tablet values:**
  - `sectionGridColumns`: 3 at 744, 800 and 834; 4 at 1032, 1280 and 1376
  - `gridColumns` never exceeds its maximum
  - `readingColumn(1032)` is 720 wide with an inset of 156
  - `splitPane` is non-null only when w ≥ 900 and w > h
  - `mushafType(1032, 32, 56)` is 38.4/67.2; level 5 (40/72) is 48/86.4
  - the five levels (24/28/32/36/40) strictly increase on a tablet, and `typeScale` is never below 1
  - `dawahStageWidth(1032)` is 600
  - `homeColumnWidth(1376)` is 1100
- **Contract pins:** `READING_ROW` and `READING_GRID` are frozen and have the stated values.

**Commit:** `feat(layout): add the tablet responsive module and reading-order rows`

## T2. Android tablets unlock rotation

**Files:**
- `plugins/withTabletRotation.js` (new)
- `app.json`: register the plugin after `withSplashWindowBackground`
- `__tests__/tabletRotationPlugin.test.ts` (new) with fixture strings inline

**Build, per design §3.7:**
- Export pure helpers for the tests:
  - `addTabletRotation(kotlinSrc)`:
    - inserts the imports `android.content.pm.ActivityInfo` and `android.content.res.Configuration` if missing
    - adds a private `applyTabletRotation(sw: Int)` that sets FULL_USER when sw ≥ 600 and PORTRAIT otherwise
    - calls it with `resources.configuration.smallestScreenWidthDp` before `super.onCreate(null)`
    - adds `override fun onConfigurationChanged(newConfig: Configuration)` that calls `super.onConfigurationChanged(newConfig)` first, then `applyTabletRotation(newConfig.smallestScreenWidthDp)`, only when no override exists
    - keeps everything inside `// @khazain-tablet-rotation` marker comments
  - `addSmallestScreenSize(configChanges)`.
- Wire them with `withMainActivity` and `withAndroidManifest` from `expo/config-plugins`.
- Throw if `language !== 'kt'` or if the `super.onCreate(` anchor is missing.

**Tests:**
- Inserted once, and a second run is a no-op.
- `super.onConfigurationChanged` comes before the rotation call; both branches (FULL_USER and PORTRAIT) exist; an existing override is not duplicated.
- It throws on Java and on a missing anchor.
- `smallestScreenSize` is added once and the existing flags are kept.
- `app.json` lists the plugin.

**Commit:** `feat(android): let tablets rotate while phones stay portrait`

## T3. Chrome: tab bar, MiniPlayer, sheets, page art

**Files:**
- `components/khazain/primitives/CustomTabBar.tsx`
- `components/khazain/sheets/SheetShell.tsx`
- `app/note-editor.tsx`
- `app/notes-viewer.tsx`
- `components/khazain/patterns/HeaderArt.tsx`
- `__tests__/tabletChrome.test.ts` (new; pure checks on any helper you add, plus source scans that the files use the responsive helpers)

**Build:**
- **Tab bar.** The row gets `centredColumn(tabBarRow(w).maxWidth)` when it is defined. Each `tabWrap` gets `maxWidth: tabBarRow(w).itemWidth`.
- **MiniPlayer.** The wrapper (`miniPlayerWrap`) and `MiniPlayerDock` get `centredColumn(600)` on tablets.
- **Sheets.**
  - `SheetShell.sheetWrap` gets `centredColumn(sheetMaxWidth)` on tablets.
  - The note editor and notes viewer `sheetOuter` get the same. On tablets the note editor's `minHeight` becomes `Math.min(height * 0.5, 420)`.
- **HeaderArt.**
  - Add an optional `inset?: number` prop. Its default is `useResponsiveLayout().reading.inset`.
  - On tablets the tile becomes `{ position: 'absolute', top: 0, right: inset − 16, width: 393, height: 549 }`, the large corner `right: inset − 16 + 213`, and the small corner `right: inset − 16`. The single-corner `top` rule is unchanged.
  - On phones every style is byte-for-byte today's.

**Commit:** `feat(chrome): size the tab bar, MiniPlayer, sheets and page art for tablets`

## T4. Sections grid (A1)

**Files:**
- `components/khazain/primitives/SectionTile.tsx` (new; export it from `primitives/index.ts`)
- a skeleton tile grid next to the existing skeletons
- `app/(tabs)/sections/index.tsx`
- `__tests__/sectionsTabletGrid.test.ts` (new)

**Build:**
- **SectionTile.** Uses the section card tokens (`CARD_DENSITY.sectionCardRadius`, the card ground and shadow `ListRowCard` uses, the 64pt disc, the same `textStyle` roles for title, subtitle and count). It stacks the disc, the title (1 line), the subtitle (2 lines max) and the count, centred, with `minHeight` 176 and padding 16. Its accessibility label matches `ListRowCard`'s label for the same entry.
- **Screen.** On tablets it renders a `READING_GRID` with gap 12, each tile `width: gridItemWidth(...)`, with the grid's container width `w − 2·gutter`. On phones it renders the existing column of `ListRowCard` unchanged.
- **Skeleton.** A tile skeleton grid on tablets, and `SkeletonRibbonList` on phones as today.

**Tests:**
- Column counts per design.
- A source scan that the screen uses `READING_GRID` and `sectionGridColumns`, and keeps `ListRowCard` for phones.
- `SectionTile` uses `CARD_DENSITY` tokens, not literals, for radius and disc.

**Commit:** `feat(sections): show the sections as a tile grid on tablets`

## T5. Home on tablets (A4)

**Files:**
- `app/(tabs)/index.tsx`
- `components/khazain/primitives/RtlCarousel.tsx`
- `components/khazain/home/DawahCarousel.tsx`
- `__tests__/homeTablet.test.ts` (new)

**Build:**
- **Column.** On tablets the ScrollView content container gets the hook's `homeColumnStyle`. It is `{}` on phones.
- **Heroes.** The two heroes go in one `READING_ROW` with `gap: 12`, `alignItems: 'stretch'`, each `flex: 1`. The Quran hero is authored first.
- **Queen card and chips.** The queen card and the quick-chip row share one `READING_ROW`, each `flex: 1`. The queen card is authored first, and the chips keep their `PHYSICAL_ROW`.
- **Phones.** The current vertical order and markup render unchanged.
- **Book row.** It renders `bookLectures.slice(0, carouselVisibleCount(width, 'book', bookLectures.length))`, where `width` is the hook's **available window width**. `carouselVisibleCount` works out the Home column itself (as shipped in T1), so do not pass `homeColumnWidth`. The scholar row uses `carouselVisibleCount(width, 'scholar', featuredScholars.length)`.
- **RtlCarousel.** Add `flexGrow: 1` to the content container base style.
- **DawahCarousel.**
  - Add the `stageWidth` prop. Home passes `dawahStageWidth(w)`.
  - Replace every viewport use of `windowWidth` with `stageWidth`, give the ScrollView `width: stageWidth` with `alignSelf: 'center'`, and keep `{ stage, centres }` in a ref, which `onSlotLayout` resets when the stage changes. Nothing writes a ref during render (`reactCompiler: true`).
  - After a stage change, re-centre the focused poster.
  - On phones `stageWidth === windowWidth`, so behaviour is identical.

**Tests:**
- A source scan that DawahCarousel no longer uses `windowWidth` for viewport maths.
- `RtlCarousel` content style includes `flexGrow: 1`.
- Home uses `READING_ROW` for the hero row only behind `isTablet`.
- The pure count helper is covered in T1.

**Commit:** `feat(home): lay Home out for tablets and anchor short carousels right`

## T6. Mushaf on tablets (A2)

**Files:**
- `app/(tabs)/sections/mushaf.tsx`
- `services/mushafNavigation.ts` or a new pure helper for "first page in view + fraction" and its restore offset
- `__tests__/mushafTablet.test.ts` (new)

**Build:**
- **Reader.**
  - `pageContent` and the footer get `centredColumn(mushafSheetWidth(w))` on tablets.
  - The ayah `Text` uses `mushafType(w, fontSize, lineHeight)`. On phones that returns the user values unchanged.
- **Reflow.** When the sheet width or the computed font size changes:
  - With an ayah target, reset `scrolledAyahRef.current = null` and `scrolledPreciseRef.current = false` so `tryScroll` re-applies.
  - Without one, capture `{ page, fraction }` of the first page in view from `layoutsRef` and the last scroll y *before* the change. Restore `y = layout(page).y + fraction × layout(page).height + bodyY` once that page's new layout arrives.
  - Put the capture and restore maths in a pure, tested function.
- **Index.** The `ListView` header, search and list get the reading `columnStyle`.

**Tests:**
- The pure anchor capture and restore round-trips.
- A source scan that the reader uses `mushafType` and re-arms the ayah on a width change.
- Phone values are unchanged (via T1's helper).

**Commit:** `feat(mushaf): give tablets a larger page and keep the place on rotation`

## T7. Scholar profile split pane (A3)

**Files:**
- `app/(tabs)/sections/scholar/[id].tsx`
- `__tests__/scholarSplitPane.test.ts` (new)

**Build:**
- **Tree.** Keep the FlatList at the same tree position at every width.
- **Container.** A `View` whose style is `READING_ROW` + `{ flex: 1, gap: 24 }` when `splitPane` applies, and `{ flex: 1 }` otherwise.
- **Side panel.**
  - First child: pretitle, name, search, the lecture count (`${toArabicDigits(n)} درس`) and `LinkedNotesSection`.
  - In split mode it renders as a panel of width 340.
  - In single mode it renders the existing head and search blocks above the list in the reading column. In that mode the notes stay in the FlatList footer, as today.
- **List.** In split mode it is `flex: 1`, and its footer no longer repeats the notes.
- **Phones.** The phone tree output is unchanged apart from the wrapper `View`, which has no style effect.

**Tests:**
- A source scan for `READING_ROW` behind `splitPane`.
- The notes render exactly once in each mode, through a small pure "where do notes go" helper.

**Commit:** `feat(scholar): split the scholar profile into panel and lectures on landscape tablets`

## T8. Reading column everywhere else

**Files** (the design §3.3 list):
- `app/(tabs)/sections/{books,prophet,queen,radio,audiobooks,exclusive,scholar,reciter,qiraat,dawah}.tsx`
- `app/(tabs)/sections/reciter/[id].tsx`, `dawah/[month].tsx`, `book/[id].tsx`
- `components/khazain/sections/RailedLectureList.tsx`
- `app/(tabs)/library.tsx`
- `app/(tabs)/more/{index,about,archive,contact,settings,settings-progress}.tsx`
- the eight `app/settings-*.tsx` modals
- `app/content-search.tsx`
- `app/onboarding.tsx` and its step container

**Build:**
- **Lists.** Apply `columnStyle` to each list's `contentContainerStyle`, and separately to its fixed header and search blocks.
- **Rails.** In `RailedLectureList` and the scholar and reciter lists, the absolute rail's physical `right` becomes `reading.inset` on tablets. Today it is 16, which equals the phone inset.
- **Phones.** `columnStyle` is `undefined`, so nothing changes.

**Tests:** extend a source-scan test: every listed screen imports `useResponsiveLayout`, and no list wraps its ScrollView in the column (`contentContainerStyle` only).

**Commit:** `feat(layout): centre every list screen in a reading column on tablets`

## T9. Device QA and QA record

**File:** `docs/plans/2026-10-22-tablet-layout-qa.md`

**Run:**
- The design §5 matrix, with captures in `docs/audit/2026-10-22-tablet/`.
- The phone screenshot diffs against the baselines.
- VoiceOver and TalkBack order.
- Rotation checks.
- A web capture of the carousel rows.

Fix what QA finds, each fix with its own test and commit.

**Commit:** `docs(plans): record tablet layout QA`
