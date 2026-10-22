# Tablet and iPad layout

**Date:** 2026-10-22
**Branch:** `feat/tablet-layout-2026-10-22` (off `origin/main` dfbf72f)
**Ticket:** "Tablet & iPad Layout Optimization", https://trello.com/c/qK3f1cpc
**Status:** v3, approved. v2 folded in the architect review (APPROVE WITH CHANGES, R1–R9) and the
board review (APPROVED WITH CONDITIONS 5–0, C1–C7). v3 folds in the architect's re-review of v2
(three remaining changes and four suggestions). v4 records three fixes found in device QA
(§3.1 column insets, §3.8 iPad page sheets, the settings apply bar). §6 lists every change and
where it landed.

**Spec authority.** No frame in `docs/KHAZAYIN.fig` is wider than 393pt. Nothing here can claim
"matches Figma" on a tablet. The authority is the phone frames plus `constants/layout.ts`,
`constants/typography.ts` and `constants/rtlContracts.ts`. The tablet rules below are this
project's own and are named as such.

## 1. What the ticket asks, and what is possible

| # | Acceptance criterion | Decision |
|---|---|---|
| A1 | The Sections grid uses 3–4 columns on tablets, not 2 | **In.** The phone list stays one column. On a tablet, Sections becomes a grid of **section tiles**: the same card ground, radius, 64pt disc and type roles, stacked vertically so a tile works at 220pt. The column count comes from that minimum. The result is 3 at 744–834pt (10–11" portrait), 3 at 800dp (Pixel Tablet portrait), and 4 at 1032pt and wider (13" iPad portrait, every tablet in landscape), capped at 4. |
| A2 | The Mushaf renders larger pages using the tablet's screen | **In.** A wider page sheet, with the type scaled to it and capped (§3.4). |
| A3 | The scholar profile shows its content panels side by side on a landscape tablet | **In, adapted.** The profile has no tabs. In landscape on a tablet it splits into a scholar panel (name, search, lecture count, the notes linked to the lectures) and the lectures. |
| A4 | Card scrollers (scholars, books) show more items without scrolling | **In.** The book row shows as many cards as fit in the Home column. The scholar row shows all 3 scholars that have name art: that is a data limit, not a layout one. On tablets the rows start at the physical right, as on phones. |
| A5 | All screens are tested on an iPad Pro 12.9" and common Android tablets | **In.** See §5. |
| A6 | No hardcoded widths: every dimension comes from a responsive calculation | **In** for tablet geometry. The Figma phone values (216.1/192 cards, 67pt tab) remain the spec. |
| A7 | The tab bar and MiniPlayer scale for tablet widths | **In.** |
| — | Quran text and translation side by side (user story 3) | **Out, blocked on content.** No translation or tafsir data exists: `Ayah` is `{surahId, number, text}`. A translation must come from a licensed, scholar-approved source the Foundation chooses. The app must not invent or machine-generate one. The ticket comment asks the Foundation to confirm the source. The split-pane layout in §3.3 is where it will go. |

## 2. Today's tablet behaviour

Captures are in `docs/audit/2026-10-22-tablet/baseline/`.

- **Hero cards.** `HeroShell` scales its layers by `width/361`, about 2.7× at 1000pt.
- **Carousels.** The scholar and book rows sit at the physical *left* of a 1032pt row. When `RtlCarousel`'s content is narrower than its viewport, nothing anchors it to the right.
- **Tab bar.** Four 67pt tabs spread about 300pt apart. The MiniPlayer spans the full width.
- **Lists.** Every list stretches its rows to 1000pt.
- **Page art.** `HeaderArt` magnifies a non-seamless 392×549 tile 2.6×. Its corners keep phone `left` offsets, so the small one floats mid-screen.
- **Orientation.** The iPad already rotates, because Expo writes all four orientations to `~ipad`. The app targets SDK 36, and Android 16 ignores orientation locks at 600dp and wider. The Pixel Tablet AVD runs the app in landscape today. The manifest's portrait lock still applies to Android 12–15 tablets.

## 3. Design

### 3.1 The responsive module, and the phone invariant

`constants/responsive.ts` holds pure functions and frozen constants. `hooks/useResponsiveLayout.ts`
wraps `useWindowDimensions` and `useSafeAreaInsets`.

The **available width** is `window.width − insets.left − insets.right`. Every helper takes this
width, so Android's landscape side navigation bar and iPad Stage Manager margins come off before
any column is computed (C5).

Centring must account for those insets too. Most screens use `edges={['top']}`, so their
container still spans the whole window. The hook's `reading.inset` is measured from the
window's physical right edge, `side + (available − width) / 2` with `side = max(insets.left,
insets.right)`, and that is what `HeaderArt` and the letter rails anchor to (v3).

**How the column is applied (v4, found in device QA).** The reading and Home columns are
`insetColumn(available, width, sideInsets)`: equal transparent side borders of `reading.inset`
on a view that keeps spanning its parent. Yoga lays border out like padding but adds it to the
view's own padding instead of replacing it. The v3 form — a narrower box from `width: '100%'`,
`maxWidth` and `alignSelf: 'center'` — rendered against the right edge on every iPad list:
`RCTScrollViewComponentView` takes the content container's frame origin from the children's
bounding rect and the content view keeps its own x, so any x offset of a content container is
applied twice. Plain margins fail the same way. The chrome (tab row, MiniPlayer, sheets) keeps
`centredColumn`, because those are plain Views outside any ScrollView. A column style never goes
on a ScrollView's own `style` (`SegmentTabs` wraps its strip in a View for this).

**Below 600 the column styles are `{}`** (v3, architect R3). A phone screen already pads its
content by 16. Applying `width: w − 2g` as a `maxWidth` on top would shrink the content by
another 32, because Yoga counts padding inside `maxWidth`. The invariant test asserts deep
equality with `{}` for both `columnStyle` and the Home column style. The layout is chosen by window width, not by device type: a narrow
Split View pane on an iPad gets the phone layout.

```ts
TABLET_MIN_WIDTH = 600
isTabletWidth(w)                      // w >= 600
screenGutter(w)                       // horizontalGutter(w) below 600; 24 at and above
centredColumn(maxWidth, insets?)      // chrome only: { width: '100%', maxWidth, alignSelf: 'center', marginLeft/Right: insets } (R7)
insetColumn(w, columnWidth, insets)   // reading/Home/Mushaf columns: equal transparent side borders (v4)
readingColumn(w)                      // { width: min(w − 2g, 720), inset: (w − width) / 2 }; phone: { width: w − 2g, inset: g }
gridColumns(w, minColumn, maxColumns) // 1 below 600
sectionGridColumns(w)                 // gridColumns(w, 220, 4)
homeColumnWidth(w)                    // min(w − 2g, 1100); phone: w − 2g
carouselVisibleCount(columnWidth, kind, itemCount) // phone: 3; tablet: min(itemCount, cards that fit)
dawahStageWidth(w)                    // phone: w (exactly today); tablet: min(w − 2g, 600)
mushafSheet(w, fontSize, lineHeight)  // phone: { width: w − 2g, fontSize, lineHeight }; tablet: see §3.4
splitPane(w, h)                       // null unless w >= 900 && w > h; then { side: 340, gap: 24 }
tabBarRow(w)                          // phone: { itemWidth: 67, maxWidth: undefined }; tablet: { itemWidth: 96, maxWidth: 4·96 + 3·24 }
miniPlayerMaxWidth(w)                 // phone: undefined; tablet: 600
sheetMaxWidth(w)                      // phone: undefined; tablet: 600
```

**Phone invariant (R2, C4).** A table test runs every helper at 320, 360, 375, 393, 411, 430,
480 and 599, and asserts it returns exactly what the phone uses today:

- the current gutter
- one column
- no cap
- no split pane
- three carousel cards
- the Dawah stage equal to the window
- the user's own Mushaf font size and line height
- tab item 67 with no row cap
- no MiniPlayer or sheet cap

`CONTENT_MAX_WIDTH`, `contentWidth()` and their tests are untouched. Only the comment at
`layout.ts:149` is reworded so it no longer suggests that 480 is what tablets centre to.

**Visual phone proof (C4).** Screenshot-diff baselines are taken on the iPhone 16 and the
360×800 AVD *before* the first code commit, then re-compared on the finished branch:

- Home
- Sections
- Mushaf reader
- scholar profile
- Library
- More

### 3.2 Reading-order rows (R1, C2)

A row that must render its children right to left, *and* keep that order for VoiceOver and
TalkBack, gets a new frozen contract in `constants/layout.ts`:

```ts
export const READING_ROW = Object.freeze({ flexDirection: 'row-reverse', direction: 'ltr' } as const);
export const READING_GRID = Object.freeze({ ...READING_ROW, flexWrap: 'wrap' } as const);
```

Children are authored in reading order. With the container pinned to `ltr`, `row-reverse`
places the first child at the physical right, and a short last row packs to the right with no
helper at all.

- `__tests__/rtlPhysicalContract.test.ts` still bans the literal `row-reverse` in screens, so this constant is the only way to get it.
- A new test pins its value. The split pane, the Sections grid, the hero row and the queen-and-chips row all use it.
- Accessibility order is the child order, which is reading order. QA checks it with VoiceOver and TalkBack (§5).

### 3.3 Per-surface behaviour at 600pt and wider

| Surface | Tablet behaviour |
|---|---|
| **Tab bar** | The bar stays full-bleed navy. The row is `centredColumn(tabBarRow.maxWidth)` with 96pt items, so the controls height and inset rule don't change. |
| **MiniPlayer** | `centredColumn(600)`, both in the tab bar wrapper and in `MiniPlayerDock`. |
| **HeaderArt** | It gets an `inset` prop: the page's column inset. The default comes from the hook's reading column. On tablets the tile is drawn at its 393pt design width, and the tile and both corners are anchored from the **physical right** at `inset − 16` (the column's outer edge). The corners convert to `right = 393 − left − width`, which is 213 and 0. Phones keep today's `left` anchors (R8d). |
| **Sections root (A1)** | A `READING_GRID` of `SectionTile` (new primitive) at `sectionGridColumns(w)`, 12 gap, each tile at `gridItemWidth`. The tile uses the section card tokens and is 64pt disc + title + subtitle (2 lines max) + count, with `minHeight` 176. A matching tile skeleton grid prevents a jump on load. |
| **Home** | The column is `insetColumn(homeColumnWidth)`. The heroes share a `READING_ROW` at half width each with `alignItems: 'stretch'` (Quran first, so physical right). The queen card and the three quick chips share the next `READING_ROW` (queen first). The scholar and book rows show `carouselVisibleCount` items. The Dawah fan runs on `dawahStageWidth` (§3.5). |
| **RtlCarousel (R3)** | `flexGrow: 1` on its content container, on every platform. When the content is narrower than the viewport, `flex-start` is then the physical right in both of its branches. On phones this is a fix too. Any row with fewer cards than the screen holds now starts at the right instead of the left. Every Home row that has data overflows the viewport, so it renders as before. That is proven by the phone diff plus paired iOS, Android and **web** captures, as CLAUDE.md requires for this exception. |
| **Mushaf reader (A2)** | The page sheet is `insetColumn(mushafSheet.width)`, with the footer centred in the same width. Type follows §3.4. Rotation and resize keep the reader's place (§3.6). The surah index is in the reading column. |
| **Scholar profile (A3)** | The side-panel View is always mounted at index 0 and the FlatList at index 1, at every width (R8c). When `splitPane` applies, the container becomes a `READING_ROW`: the panel is at the physical right, first for screen readers, and holds the name, search, lecture count and the linked notes. Below the split, the panel holds only the name and search above the list, and the linked notes stay in the list's `ListFooterComponent`, below the lectures, as on `main`. |
| **Lists and other screens** | `useResponsiveLayout().columnStyle` (the `insetColumn` of the reading column) goes on the **`contentContainerStyle`**, not around the ScrollView, so the side margins still scroll (R8a). Headers and search blocks get the same style separately. Railed lists put the rail at `right: inset` (R8b). Covered: books, prophet, queen, radio, audiobooks, exclusive, scholar list, reciter list, reciter/[id], qiraat, dawah, dawah/[month], book/[id], Library, More and its four sub-screens, settings-progress, the eight settings modals, content-search, and the Mushaf index. The settings modals are iOS page sheets, which iPadOS already narrows; they read `usePageSheetLayout()`, which drops the column on iOS (Android shows them full screen and keeps it). |
| **Library** | It sits in the reading column. The two 3-up stat rows keep `flex: 1` inside 720, so they come out about 230pt each. |
| **Bottom sheets** | `SheetShell`, note editor and notes viewer use `centredColumn(sheetMaxWidth)` and stay pinned to the bottom. The note editor's `minHeight: '50%'` becomes `min(50%, 420)` on tablets, so a landscape keyboard still leaves the editor usable. |
| **Onboarding** | The steps are in the reading column. The hero band stays full-bleed. |
| **LaunchSequence** | It already lays out from window height. QA checks a landscape cold start on both tablets. |

### 3.4 Mushaf type on tablets (C1)

The reader's inline style comes from `useFontScale()`, and the stylesheet's 22/48 never
applies. The levels in `FONT_SIZE_SCALE` are 24/28/32/36/40, and the default is level 3.

The cap goes on the **scale**, not the result (v3, architect R1). A capped result would
flatten levels 3–5 to the same size and override the user's choice. On tablets:

```
typeScale  = min(clamp(sheetWidth / 361, 1, 1.5), MUSHAF_TABLET_MAX_FONT / 40)   // 48 / 40 = 1.2
fontSize   = userFontSize × typeScale
lineHeight = userLineHeight × typeScale
```

On any sheet wider than about 433pt the five levels render at 28.8/33.6/38.4/43.2/48. All five
are distinct, and the largest is 48. Level 3 becomes 38.4/67.2. A test pins that the five
tablet sizes strictly increase. The system font scale stacks on top as it does on phones,
unchanged. Phones get `typeScale` 1 (R2).

### 3.5 Dawah fan on a fixed stage (R4)

`DawahCarousel` takes a `stageWidth` prop, and every viewport value uses it:

- `dawahLayout`
- the `scrollTo` centring
- `handleMomentumEnd`
- `Slot`'s `viewportWidth`

The ScrollView gets `width: stageWidth` and is centred. The slot-layout reset is keyed on
`stageWidth`. The ref holds `{ stage, centres }`, and `onSlotLayout` clears `centres` when it sees
a new stage. That keeps render pure, which `reactCompiler: true` in `app.json` requires; the
compiler skips a component that writes a ref during render. It also means the reset can't race
`onLayout`.
After a stage change, the fan re-anchors to the poster that was in focus, not to `FIRST_REAL`.
On phones `stageWidth` equals the window width, so the fan behaves exactly as it does today.

### 3.6 Keeping state through rotation and resize (R5, C3)

- **Mushaf.** When the sheet width or the computed font size changes:
  - If there is an ayah target, `scrolledAyahRef` is re-armed, and `tryScroll` re-applies it once the new layouts arrive.
  - Otherwise the first page in view and the fraction through it are recorded before the reflow, from the tracker's segment layouts. The position is restored once the new layouts arrive.
  - Page tracking already re-measures on layout and is unchanged.
- **Android activity.** `configChanges` gains `smallestScreenSize`, which `screenLayout` already sits beside. Multi-window and resize then don't recreate the activity and lose navigation state.
- **Stable trees.** No component changes its tree type at 600 or 900pt, only styles and optional siblings. Rotation doesn't remount a list.

### 3.7 Android tablets rotate like the iPad (R6, C7)

`plugins/withTabletRotation.js` keeps the manifest's portrait lock, which protects phones from a
landscape starting window, and unlocks tablets at runtime:

- **`withMainActivity` (Kotlin only).** It throws if the language isn't `kt` or its anchor isn't found.
  - It inserts `applyTabletRotation(resources.configuration.smallestScreenWidthDp)` before `super.onCreate(null)`.
  - It adds an `onConfigurationChanged(newConfig)` override that calls `super.onConfigurationChanged(newConfig)` **first** (`ReactActivity` forwards it, and Dimensions depend on it), then `applyTabletRotation(newConfig.smallestScreenWidthDp)`.
  - The helper sets the orientation both ways (v3, architect R2), so a foldable's narrow cover screen re-locks:
    `requestedOrientation = if (sw >= 600) SCREEN_ORIENTATION_FULL_USER else SCREEN_ORIENTATION_PORTRAIT`.
  - The override is added only when the file has no `onConfigurationChanged` yet, because two overrides do not compile.
  - The import and body are guarded by a marker comment plus `includes()`, so a second prebuild adds nothing.
- **`withAndroidManifest`.** It adds `smallestScreenSize` to MainActivity's `configChanges` (§3.6).
- **No deep import.** It uses only the `expo/config-plugins` exports, as `withSplashWindowBackground.js` does.
- **Plugin test.** The test runs the mods twice on a fixture `MainActivity.kt` and manifest. It checks:
  - exactly one copy
  - a throw on a missing anchor and on Java
  - that `super.onConfigurationChanged` comes before the rotation call
  - the portrait re-lock branch, for the fold and unfold case
  - that an existing `onConfigurationChanged` is not duplicated
- **Release.** This is a native change, so it ships in a new binary through EAS, not an OTA update.
- **Known limitation.** On Android 12–15 tablets, a landscape cold start shows the starting window in portrait for a moment, then rotates. QA records it on an API 35 tablet AVD.

### 3.8 iPad page sheets under RTL (v4, found in device QA)

`presentation: 'modal'` is a page sheet on iPad, narrower than the window (about 935 of 1032pt
in portrait). react-native-screens hands a presented modal React's layout metrics, origin
included, and under `forceRTL` Yoga anchors the sheet-sized screen to the window's right edge.
Every settings sheet was drawn about 97pt to the right with its right side clipped — on main
too. `patches/react-native-screens+4.16.0.patch` zeroes the origin for native modals, whose frame
UIKit owns. iPhone sheets are window-wide, so their origin was already 0. Native change: it
ships in a new iOS binary.

## 4. Out of scope

- Quran translation (§1).
- Any change to phone geometry, enforced by the invariant test and the phone diff.
- Tablet Figma frames. If the client supplies them, they supersede §3.3.
- A two-page Mushaf spread. It would break the single-column offset model that page tracking and `?ayah=` depend on.
- Refreshing the iPad App Store and Play large-screen listing screenshots. That is a release task, noted for the ticket owner.

## 5. QA matrix

| Device | Size | Orientations |
|---|---|---|
| iPad Pro 13-inch (M5), iOS 26.5 | 1032×1376pt | portrait and landscape |
| Pixel Tablet AVD, API 36 | 800×1280dp | portrait and landscape |
| Pixel Tablet AVD, API 35 | 800×1280dp | portrait and landscape (plugin path, R6a) |
| iPhone 16, iOS 26.5 | 393×852pt | portrait, screenshot diff |
| Realme Note 50-class AVD, API 36 | 360×800dp | portrait, screenshot diff |
| Web (Expo web) | 1280 and 393 wide | RtlCarousel rows only |

**On each tablet, check these screens:**
- Home, including the Dawah fan
- Sections
- the Mushaf index and reader (with `?ayah=`)
- a scholar profile
- a railed list
- `dawah/[month]`
- Library and More
- a settings modal, content-search, the note editor with the keyboard up, and a share sheet
- onboarding
- a cold start in landscape

**Also check:**
- Rotation on a pushed list (the scroll is kept), on the Mushaf (the place is kept), and on the Dawah fan (focus is kept).
- VoiceOver on the iPad and TalkBack on the Pixel Tablet over the Sections grid, the Home hero row and the scholar split pane. Order must be first section, then second, …, panel, then list.

## 6. Change log (v2–v4)

| Finding | Where it landed |
|---|---|
| R1 / C2: contradictory reading order; short rows at the left | §3.2 `READING_ROW` / `READING_GRID`. `gridRows` was dropped. |
| R2: phone invariant leaks (Mushaf scale, carousel count) | §3.1 table test; §3.4 tablets only |
| R3: no mechanism for the RtlCarousel fix; web capture | §3.3 RtlCarousel row; §5 web |
| R4: DawahCarousel used the window everywhere | §3.5 |
| R5 / C3: Mushaf place lost on rotation | §3.6 |
| R6 / C7: plugin design and a QA device that exercises it | §3.7; §5 API 35 AVD |
| R7: `maxWidth` alone hugs the start edge | §3.1 `centredColumn` |
| R8 / C5: dead gutters, the rail, stable trees, corner anchoring, insets | §3.1 available width; §3.3; §3.6 |
| R9: missing surfaces | §3.3 and §5 |
| C1: uncapped Mushaf type; wrong worked example | §3.4 |
| C4: visual proof for phones | §3.1 phone diff; §5 |
| C6 / A1: 2 columns in 10–11" portrait | §1 A1: section tiles give 3 at 744–834 |
| CPO: sign-off on translation | §1: ticket comment |
| COO: native rebuild; store screenshots | §3.7; §4 |
| Optional: `CONTENT_MAX_WIDTH` comment, grid skeleton, stretch hero row | §3.1, §3.3 |
| v3 R1: the font cap flattened levels 3–5 | §3.4: cap the scale at 48/40; the five levels strictly increase |
| v3 R2: the plugin never re-locked; `super` was missing; a duplicate override | §3.7 |
| v3 R3: phone `columnStyle` must be `{}` | §3.1 |
| v3 suggestions: React Compiler-safe reset, inset-aware centring, scholar notes placement, `itemCount` name, RtlCarousel phone wording | §3.5, §3.1, §3.3 |
| v4 (device QA): iOS doubles a content container's x offset, so the centred column sat at the right edge on iPad | §3.1 `insetColumn` side borders |
| v4 (device QA): iPad page sheets shifted right under RTL (pre-existing) | §3.8 react-native-screens patch; `usePageSheetLayout` |
| v4 (device QA): settings apply bar spanned the full tablet width | §3.3 lists row: footer button in the column |
