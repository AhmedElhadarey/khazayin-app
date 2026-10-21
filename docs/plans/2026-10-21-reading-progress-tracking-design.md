# Reading & Listening Progress Tracking — gap-closing design

- **Date:** 2026-10-21
- **Ticket:** "Reading & Listening Progress Tracking" — https://trello.com/c/HKTMbpu6 (marked Done, failed the acceptance audit)
- **Branch / worktree:** `feat/progress-page-tracking` at `khazayin-worktrees/progress`
- **Base:** `fix/real-device-layout-2026-09-12` @ `0635ea1` (baseline `npx jest`: 73 suites, 828 passed, 1 skipped)
- **Prior work:** spec `001-progress-tracking` (SQLite event log + aggregates), Library tab, `app/(tabs)/more/settings-progress.tsx` reset.

---

## 1. Problem

The audit found two criteria PARTIAL and one interpretation open. The rest is done and stays as it is.

| # | Audit finding | Evidence |
|---|---|---|
| 1 | **Page tracking is not page tracking.** The only recorder is `ReadingView`, which calls `notePageRead(surahStartPage(surah))` once, 400 ms after a surah opens. Reading all of Al-Baqarah logs one page (page 2). The DB dedupes `(local_day, page_number)`, so juz completion (which needs every page in the juz) can never be reached, and the "أكملت الجزء N" achievement can never fire. | `app/(tabs)/sections/mushaf.tsx:153-176`, `db/repositories/pageReads.ts:26-79`, `db/helpers/juz.ts:8-23`, `db/repositories/achievements.ts:55-56` |
| 2 | **StatCards don't show pages read or lectures listened.** The Library summary row is تذكيراتي / ورد القرآن (streak) / ملاحظاتي. The one other card is "محاضرات مكتملة". `pagesToday`, `completedJuzCount` and `totalListenedMinutes` are computed in the store but never shown. | `app/(tabs)/library.tsx:273-305`, `:617-629`; `store/progressStore.ts:37-53` |
| 3 | **"Lectures listened" means "lectures completed".** `completedCount()` counts only sessions that reached 95 %. | `db/repositories/lectureSessions.ts:105-110` |

Two more defects turned up while planning. Both sit directly under criterion 6 (juz level):

| # | Finding | Evidence |
|---|---|---|
| 4 | `JUZ_PAGE_RANGES` is described as "roughly 20 pages". It is wrong at four boundaries where a juz begins mid-page: juz 3 should end on page 62 (it says 61), juz 7 should start on 121 (it says 122), juz 11 should start on 201 (it says 202), and juz 25 should end on 502 (it says 501). With real page tracking, juz 7 could be marked complete before its first ayah (5:82, on page 121) had been read. | `constants/progress.ts:39-79` vs. Tanzil `QuranData.Juz` + `QuranData.Page` (see §4.1) |
| 5 | `last_read_page` only updates when a page is read for the first time that day. Re-reading page 2 after reading page 30 leaves the "بدء الورد" target and the FR-009 auto-resume on page 30. The open-once recorder hid this; per-page tracking would show it. | `db/repositories/pageReads.ts:40` (early `return` comes before the `last_read_page` upsert at `:68-72`); `db/web-shim.ts:157-159` |

## 2. Acceptance criteria (verbatim) and status after this plan

| Criterion (verbatim) | Before | After |
|---|---|---|
| Library tab StatCards show real counts: pages read, lectures listened, notes created | PARTIAL (notes only) | Notes: frame card (unchanged). Pages read + lectures listened (+ juz): new `progressStats` StatCard row (§4.4) |
| CircularProgress shows wird completion for the current day | DONE | Unchanged. It is now fed by real per-page reads |
| AudioProgressCard shows the currently in-progress lecture with real playback position | DONE | Unchanged. **Recorded as acceptable:** "متابعة" restores the track and position but loads it paused (`library.tsx:311-322`). The user presses play in the MiniPlayer |
| Daily reading streak is tracked and displayed (consecutive days with Quran reading) | DONE | Unchanged |
| Progress persists across app restarts (Zustand + AsyncStorage) | DONE via SQLite | **Accepted deviation:** SQLite (`expo-sqlite`) is the store on native and an AsyncStorage-backed shim is used on web (`db/web-shim.ts`). Zustand is the read model |
| Quran reading progress is tracked at the page and juz level | PARTIAL | Each Madani page is recorded as its ayat are read in the scrolling reader (§4.2–4.3). Juz completion is derived from corrected page ranges (§4.1) and shown on the Library (§4.4) |
| Progress resets gracefully at user request (settings option) | DONE | Unchanged (`app/(tabs)/more/settings-progress.tsx`). The new aggregates read from tables that reset already clears (`khz_days`, `khz_page_reads`, `khz_lecture_sessions`). A test pins this (Task 7) |

## 3. Constraints that shaped the design

- **The ayat data is a mock.** `data/content/quran.ts:66-74` holds ayat only for Al-Baqarah 1–5. The other 29 listed surahs return `[]` and render "لا توجد آيات لهذه السورة". The HTTP adapter (`services/api/httpAdapter.quran.ts:27-29`) is inert because `EXPO_PUBLIC_API_BASE` is unset. So until real text arrives, **only page 2 can be read in the app.** The tracking mechanism has to be correct for full text but can only be shown end to end on page 2. Juz completion is proved by tests and a seeded QA step (implementation plan, Task 11).
- **The reader is one flowing paragraph.** All ayat are inline fragments of a single `<Text>` (`mushaf.tsx:227-240`). React Native has no per-fragment layout, so per-ayah visibility cannot be read off it.
- **Out of scope:** a page-swipe Mushaf. That is the separate "Real Mushaf / Quran Reading Experience" card. This design stays inside the existing vertical `ScrollView`.
- **No new dependencies.** `@testing-library/react-native` is not installed, so React wiring is kept thin and the logic lives in pure, unit-tested modules.

## 4. Approach

### 4.1 A static ayah → page table (option (a), chosen)

New file **`constants/quranPages.ts`**, generated from Tanzil's metadata:

- `QURAN_PAGE_STARTS: readonly AyahRef[]` (`AyahRef = readonly [surah, ayah]`) — 604 entries. Entry *i* is the first ayah of page *i + 1*.
- `JUZ_START_AYAHS` — 30 entries.
- `pageForAyah(surah, ayah): number | null` — binary search over the table. Returns `null` outside 1:1..114:6.
- `QURAN_PAGE_DATA_CREDIT` — the Arabic attribution line (§4.6).

**Source and licence.** Tanzil Quran Metadata v1.0, `https://tanzil.net/res/text/metadata/quran-data.js`, fetched 2026-10-21, sha256 `9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4`. Header: `Copyright (C) 2008-2009 Tanzil.info — License: Creative Commons Attribution 3.0`. CC BY 3.0 permits redistribution and commercial use. It requires credit to the author, a link to the licence, and a note of any changes. We drop the sentinel entries and convert the arrays to TypeScript. All three go in the file header, and a user-visible credit goes in About (§4.6). It does not require share-alike, so the app's own code is not affected.

**Independent cross-checks** (run during planning, and pinned as tests in Task 1):
- The surah start page derived from `QURAN_PAGE_STARTS` matches the in-repo `SURAH_START_PAGES` (`constants/progress.ts:90-104`) for **all 114 surahs**. That table was written separately, so this is real corroboration.
- Juz start pages derived from the table are 1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, …, 582. This is the standard Madani division.
- Total ayat = 6236 (Kufan count, Hafs).

**Juz ranges corrected (finding 4).** Juz *N* spans from the page holding its first ayah to the page holding the ayah before juz *N + 1* starts. Four juz begin mid-page (4, 7, 11, 26), so ranges share a boundary page:

```
3: 42–62   4: 62–81   6: 102–121   7: 121–141   10: 182–201   11: 201–221   25: 482–502   26: 502–521
```

The other 22 ranges are unchanged. `JUZ_PAGE_RANGES` stays a literal in `constants/progress.ts` with the four values corrected. A test re-derives every range from `quranPages.ts`, so the two cannot drift apart. `countCompletedJuz` / `completedJuzList` need no change, because they already test page coverage per range. A shared page simply has to be read for both juz.

**Rejected — (b) proportional estimate** (`page ≈ start + (ayah / ayahCount) × span`). Madani pages hold between 1 and 22 ayat. The estimate puts boundary ayat on the wrong page, which breaks juz completion — the very thing we are fixing. Option (a) is possible, so (b) is excluded.

**Rejected — (c) a `page` field on `Ayah` from the backend.** No backend exists yet (`EXPO_PUBLIC_API_BASE` unset), and the mock would need the table anyway. Madani pagination is fixed reference data, so a client-side table is the authority whatever the server sends. `types/content.ts` `Ayah` is **not** changed.

### 4.2 Page segments in the existing reader

`ReadingView` renders the ayat as **one `<Text>` per Madani page** (a "page segment"), stacked in the same `ScrollView`. The single paragraph goes away. Each segment keeps today's `ayatBody` style and the `AyahNum` markers, and segments sit flush (no divider, no added gap).

- `groupAyatByPage(surahNumber, ayat) → { page, ayat }[]` is a pure function in **`services/mushafPageTracking.ts`**. Consecutive ayat that share a page form one segment. Ayat the table cannot place (malformed data) join the previous segment and are never dropped.
- Each segment reports its `onLayout` (y, height). The segment list is wrapped in a plain `View` (no style) whose `onLayout` y converts segment offsets into scroll-content coordinates. `AsyncContent`'s success wrapper has no padding (`components/khazain/state/AsyncContent.tsx:68-79,116-120`), so segment y is relative to that wrapper.

**Visual delta (accepted):** a paragraph break now appears at each page boundary. This affects only the reading body. Node 2349:982's body is unrendered in the export (the reference PNG is black between header and footer), so there is no pixel spec for it. The header, meta line and footer are untouched. The open state is unchanged for Al-Baqarah 1–5 (one segment).

**Rejected — FlatList with one row per ayah + `onViewableItemsChanged`.** This breaks the inline mushaf flow into a list of separate ayah rows, which is a much larger visual change than a break per page. It would also change the scroll container type in a frame-covered screen.

**Rejected — `onTextLayout` line mapping on the single paragraph.** The line objects carry text, not source offsets. Mapping lines back to ayat by string matching is fragile with diacritics, justification and the inline ayah markers, and behaves differently on iOS and Android.

### 4.3 Recording a page: in view + dwell, not on open

The page-read event moves from "surah opened" to "**page segment was in view long enough to have been read**".

- `pagesInView(segments, scrollY, viewportHeight) → number[]` (pure). A segment counts as in view when its visible part is **≥ 50 % of the viewport height** (tall segments) or **≥ 90 % of its own height** (short segments, such as a page shared with the previous surah or the last segment at the bottom of the scroll).
- `PageDwellTracker` (plain class, injected clock, in `services/mushafPageTracking.ts`). It adds up how long each page has been in view and calls `onRead(page)` **once per page per reader session** when the total reaches `PAGE_READ_DWELL_MS`.
  - The total does not have to be continuous. A reader who scrolls up and down within a tall page still builds it up.
  - Each `update()` adds at most `PAGE_DWELL_MAX_STEP_MS` (2000 ms). A stalled JS thread, or a background period the AppState event missed, can't credit a page in one jump.
  - `pause(now)` stops all accrual. It is called when `AppState` leaves `active`.
- The wiring is in `ReadingView`: a 1 s interval plus `onScroll` (`scrollEventThrottle={250}`) feed `tracker.update(pagesInView(...), Date.now())`. `onRead` calls the existing `useProgressStore.notePageRead(page)`, which is already serialized and already runs wird recompute, suggestion and achievements (`store/progressStore.ts:161-208`).
- Opening a surah and staying on the first screen still records that page once the dwell passes. Flinging through a surah records nothing.
- The 400 ms open-time recorder (`mushaf.tsx:155-176`) is **deleted**. `surahStartPage` stays in use for the meta line (`mushaf.tsx:159,188-192`).

New constants in `constants/progress.ts`: `PAGE_READ_DWELL_MS = 8000`, `PAGE_IN_VIEW_VIEWPORT_SHARE = 0.5`, `PAGE_IN_VIEW_SELF_SHARE = 0.9`, `PAGE_DWELL_MAX_STEP_MS = 2000`.

**`last_read_page` (finding 5):** `recordPageRead` will upsert `last_read_page` even when the `(day, page)` row already exists, so the most recently read page always wins. Native: `db/repositories/pageReads.ts:40`. Web shim: `db/web-shim.ts:157-159`. The return value (`inserted`) keeps its meaning, so wird and achievement logic are not affected.

### 4.4 Library: where pages, juz and lectures appear

**Criterion ↔ Figma conflict.** Frame **06 Library 2031:4659** draws exactly three summary cards, physical left → right: **تذكيراتي "٣ تذكيرات نشطة"**, **ورد القرآن "٧ أيام متتالية"**, **ملاحظاتي "٢٤ ملاحظة"** (read from `docs/KHAZAYIN.fig` with `scripts/figma/extract-text-styles.js`). The criterion asks for pages read, lectures listened and notes created. The labels do not allow swapping values in: the ورد القرآن card's frame copy is a streak, and the streak is itself a criterion. The frame's filter rail (الكل, المحفوظات, المفضلة, قوائم التشغيل, المكتمل, ملاحظاتي, تذكيراتي) has no stats view, and the app's السجل filter has no frame.

**Resolution (Figma wins on the covered region):**
1. The frame's summary row is **not changed**. ملاحظاتي already gives "notes created" (`library.tsx:296-303`). ورد القرآن gives the streak.
2. The extension section `completedLectures` (`library.tsx:617-629`) becomes a section named **`progressStats`**: a row of three StatCards built with the same `StatCard` component, `STAT_CARD` geometry and `PHYSICAL_ROW` as the frame's row. Physical left → right:
   - **محاضرات مسموعة** — `"{listened} محاضرة • {completed} مكتملة"`. The completed count is folded in here, so the old card's metric is kept, not lost.
   - **الأجزاء المكتملة** — `"{n} من ٣٠"`.
   - **صفحات مقروءة** — `"{total} صفحة"`.
3. `progressStats` takes `completedLectures`' slot in `LIBRARY_SECTION_ORDER`, after `smartReminders`, the frame's last section. It keeps the same visibility (all four filters), so nothing that was visible becomes hidden. The existing test "places every newer section below the whole reference hierarchy" (`__tests__/libraryPresentation.test.ts:36-44`) keeps enforcing that it never moves above the frame.
4. The frame's first viewport, which the visual harness captures, and the frame's section order stay pixel-identical. The new row sits below the frame's last section, where the frame has no content.

**Rejected — replacing ورد القرآن's subtitle with pages.** It contradicts the frame copy and removes the streak display.
**Rejected — a fourth card in the frame's row.** It breaks the 3 × 115 pt geometry (`statCardWidth`, `libraryLayout.ts:86-88`) and the frame.
**Rejected — stats only under السجل.** That would hide the counts by default and hide the lecture-completed metric under three filters where it shows today.

### 4.5 "Lectures listened" — definition (finding 3)

A lecture is **listened** when `completed = 1` **or** `forward_listened_sec ≥ MIN(LECTURE_LISTENED_MIN_SEC, duration_sec)` with `duration_sec > 0`, where `LECTURE_LISTENED_MIN_SEC = 60`.

- `forward_listened_sec` already counts only real forward listening: a jump larger than one tick is treated as a seek and credited 0 (`store/playerStore.ts:80-82`). Scrubbing to the end does not inflate it.
- 60 s means a lecture opened by mistake doesn't count. A clip shorter than 60 s counts once it has been played through.
- The card shows both numbers: "N محاضرة • M مكتملة". The completed number is the existing 95 % latch (`COMPLETION_THRESHOLD`). Neither definition is lost.

New repository method: `LectureSessionsRepository.listenedCount()` — native `db/repositories/lectureSessions.ts` and web `db/web-shim.ts:331-342`.

### 4.6 Data and store changes

| Layer | Change |
|---|---|
| `constants/quranPages.ts` (new, generated) | `QURAN_PAGE_STARTS`, `JUZ_START_AYAHS`, `pageForAyah`, `QURAN_PAGE_DATA_CREDIT` |
| `constants/progress.ts` | correct 4 values in `JUZ_PAGE_RANGES` (`:44-79`); add `PAGE_READ_DWELL_MS`, `PAGE_IN_VIEW_*`, `PAGE_DWELL_MAX_STEP_MS`, `LECTURE_LISTENED_MIN_SEC` |
| `services/mushafPageTracking.ts` (new) | `groupAyatByPage`, `pagesInView`, `PageDwellTracker` |
| `db/types.ts` | `PageReadsRepository.totalPagesRead(): Promise<number>` (= `SUM(khz_days.pages_read)`); `LectureSessionsRepository.listenedCount(): Promise<number>` |
| `db/repositories/pageReads.ts`, `db/repositories/lectureSessions.ts`, `db/web-shim.ts` | implement the two methods; `last_read_page` upsert on dedupe |
| `store/progressStore.ts` | snapshot gains `totalPagesRead`, `listenedLectureCount`; refreshed in `hydrate`, `notePageRead`, `noteLectureTick` |
| `services/libraryStats.ts` (new) | pure Arabic subtitle formatters for the three new cards |
| `constants/libraryPresentation.ts` | `completedLectures` → `progressStats`; new `LIBRARY_PROGRESS_STAT_ORDER` |
| `app/(tabs)/library.tsx` | render `progressStats` row |
| `app/(tabs)/sections/mushaf.tsx` | page segments + tracker; delete open-time recorder |
| `app/settings-about.tsx` | one credit card: `QURAN_PAGE_DATA_CREDIT` |

**"Pages read" = all-time `SUM(khz_days.pages_read)`.** That is pages read summed over days, so re-reading a page on a new day counts again. The same unit drives wird, streak and the 28-day trend. Coverage of the Quran (distinct pages) is what the juz card expresses.

**No schema change, no migration.** Both new aggregates read existing columns. Reset already clears both tables, and Task 7 adds a test for it.

**Attribution UI.** `app/settings-about.tsx` (a modal with no Figma frame; governed by `constants/layout.ts` `PHYSICAL_BOX` and `constants/typography.ts`) gets one more card under "موقع المؤسسة", using the existing `linkCard` style: title `مصادر البيانات` and body `QURAN_PAGE_DATA_CREDIT` = `"تقسيم صفحات المصحف وأجزائه: Tanzil.net — رخصة CC BY 3.0"`.

## 5. Figma frames affected

| Frame | Node | Must remain pixel-identical | Change |
|---|---|---|---|
| 06 Library | 2031:4659 | Entire first viewport (header, search, summary row, wird card, quick-note top) and the reference section order | Only the extension row below `smartReminders` changes, and it lies outside the frame's content |
| 16 Mushaf reader — loaded | 2349:982 | Header, meta line (`مكية • … • صفحة ٢ من ٦٠٤` — current behaviour kept), footer (الفهرس / الانتقال للعلامة / حفظ علامة) | Body becomes page segments. The export renders no body (black), so there is no pixel spec. A paragraph break at page boundaries is accepted |
| 15 Mushaf reader — loading | 2349:829 | Whole frame | None. The resume path (`mushaf.tsx:57-86,97-101`) is not touched |

Screens without a frame that this touches: the Library extension row (contract: `components/khazain/library/libraryLayout.ts` `STAT_CARD`, `constants/layout.ts` `PHYSICAL_ROW`, `constants/typography.ts` via `StatCard`), and `app/settings-about.tsx` (contract: `PHYSICAL_BOX`, `textStyle`). Nothing here may be described as "matches Figma".

## 6. RTL

- The `progressStats` row spreads `PHYSICAL_ROW` (it reuses `styles.statsRow`, `library.tsx:721-726`). Children are authored in **physical left → right** order from the new constant `LIBRARY_PROGRESS_STAT_ORDER = ['lectures', 'juz', 'pages']` (same pattern as `LIBRARY_SUMMARY_CARD_ORDER`, `constants/libraryPresentation.ts:61-65`), so صفحات مقروءة reads first at the physical right. Text inside `StatCard` keeps its own centred RTL (`StatCard.tsx:57-64`).
- Page segments are vertical blocks, so there is no row-direction question. Each segment spreads the existing `ayatBody` (`writingDirection: 'rtl'`, `textAlign: 'justify'`, `mushaf.tsx:353-361`).
- Count separators use `•`, not `·`. The middle dot reads as `٠` between Arabic-Indic digits (see `services/mushafNavigation.ts:63-65`).
- No `I18nManager` reads are introduced.

## 7. Risks

| Risk | Mitigation |
|---|---|
| With mock content, only page 2 can be read. Wird can reach 1 page a day at most, and the ring caps at 10 % of the default 10-page goal. Before, opening 10 surahs filled it. **This is a demo-visible regression** | It is truthful. The old behaviour credited pages nobody read. See open question Q1 |
| The dwell value is a judgement call. Too low overcounts flicks; too high undercounts quick readers | One constant; pinned by tests; open question Q2 |
| Segment `onLayout` offsets go stale after a font-size change (`useFontScale`) | Layout re-fires on re-render. Offsets are kept in a ref keyed by page and overwritten on every `onLayout` |
| JS interval while the reader is open | 1 Hz, cleared on unmount; `update()` is O(pages in surah) ≤ 48 for Al-Baqarah |
| Juz range fix changes `completedJuzCount` for an existing user | Only someone holding exactly the old boundary pages could gain or lose a juz. With open-once tracking, no user can have completed a juz |
| Tanzil data provenance | Hash recorded; generator refuses to run if the licence header changes; 114-surah cross-check against an independent in-repo table |

## 8. Out of scope

- Page-swipe / page-image Mushaf, bookmarks, the footer buttons' behaviour ("Real Mushaf / Quran Reading Experience" card).
- Bundling the full Quran text, or any change to `data/content/quran.ts` or the HTTP adapter.
- Making the reader meta line ("صفحة N من ٦٠٤") follow the scroll position. It keeps showing the surah's start page, as frame 2349:982 does.
- Starting playback automatically from "متابعة" (resume-paused is accepted).
- A schema migration, cloud sync, or moving persistence to AsyncStorage.
- Changing the Library filter chip set to match the frame (المفضلة / المكتمل …).
- Showing total listened minutes (computed, still not shown — no criterion asks for it).

## 9. Open questions (defaults let work proceed)

| # | Question | Default used by the plan |
|---|---|---|
| Q1 | Should opening a surah with **no ayat** (mock data) still credit its start page, to keep the demo's wird ring moving? | **No.** Record only pages whose text was on screen. For demos, QA seeds progress with the dev step in Task 11, not with fake reads |
| Q2 | Dwell threshold per page | **8 s** of total in-view time (`PAGE_READ_DWELL_MS`) |
| Q3 | "Lectures listened" threshold | **≥ 60 s forward listening (or full play-through of a shorter clip), or completed** |
| Q4 | Where the CC BY attribution is shown to users | **One card in `app/settings-about.tsx`** plus the source-file header |
| Q5 | "Pages read" = pages summed over days, or distinct pages ever read | **Summed over days** (same unit as wird/streak). Coverage is shown by the juz card |
