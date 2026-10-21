# Reading & Listening Progress Tracking — gap-closing design (v2)

- **Date:** 2026-10-21
- **Ticket:** "Reading & Listening Progress Tracking" — https://trello.com/c/HKTMbpu6 (marked Done, failed the acceptance audit)
- **Branch / worktree:** `feat/progress-page-tracking` at `khazayin-worktrees/progress`
- **Base:** `fix/real-device-layout-2026-09-12` @ `0635ea1` (baseline `npx jest`: 73 suites, 828 passed, 1 skipped)
- **Prior work:** spec `001-progress-tracking` (SQLite event log + aggregates), Library tab, `app/(tabs)/more/settings-progress.tsx` reset.
- **Revision:** v2 applies the CTO review ("APPROVE WITH CHANGES"):
  - reading time counts only while the reader screen is focused and its ayat are on screen (§4.3)
  - the full CC BY 3.0 notice appears in the app (§4.6)
  - juz boundaries are pinned with literal tests, and the juz-4 edition choice is recorded as decision D1 (§4.1)
  - Arabic number agreement (§4.4)
  - merge order with the contextual-notes and settings branches (§10)
  - `lastReadPage` is held in the progress store (§4.3)
  - the shared-page approximation, a release note, and the below-the-fold placement are written down

---

## 1. Problem

The audit found two criteria PARTIAL and one definition open. Everything else is done and stays as it is.

| # | Audit finding | Evidence |
|---|---|---|
| 1 | **Page tracking is not page tracking.** The only recorder is `ReadingView`, which calls `notePageRead(surahStartPage(surah))` once, 400 ms after a surah opens. Reading all of Al-Baqarah logs one page (page 2). The DB dedupes `(local_day, page_number)`. Juz completion needs every page of a juz, so it can never happen, and the "أكملت الجزء N" achievement can never fire. | `app/(tabs)/sections/mushaf.tsx:153-176`, `db/repositories/pageReads.ts:26-79`, `db/helpers/juz.ts:8-23`, `db/repositories/achievements.ts:55-56` |
| 2 | **StatCards don't show pages read or lectures listened.** The Library summary row is تذكيراتي / ورد القرآن (streak) / ملاحظاتي. The only other card is "محاضرات مكتملة". `pagesToday`, `completedJuzCount` and `totalListenedMinutes` are computed but never shown. | `app/(tabs)/library.tsx:273-305`, `:617-629`; `store/progressStore.ts:37-53` |
| 3 | **"Lectures listened" counts only finished lectures.** `completedCount()` counts sessions that reached 95 % and nothing else. | `db/repositories/lectureSessions.ts:105-110` |

Two more defects turned up during planning, both under criterion 6 (juz level):

| # | Finding | Evidence |
|---|---|---|
| 4 | `JUZ_PAGE_RANGES` is described as "roughly 20 pages" and is wrong at four boundaries where a juz begins mid-page: juz 3 ends on page 62, not 61; juz 7 starts on 121, not 122; juz 11 starts on 201, not 202; juz 25 ends on 502, not 501. With real page tracking, juz 7 could be marked complete before its first ayah (5:82, page 121) had been read. | `constants/progress.ts:39-79` vs. Tanzil `QuranData.Juz` + `QuranData.Page` (§4.1) |
| 5 | `last_read_page` updates only the first time a page is read in a day. So re-reading page 2 after page 30 leaves both the Library wird card ("سورة … — صفحة N") and the FR-009 resume pointing at page 30. The Library also reads the value with an ad-hoc effect keyed on `todayPct`, which doesn't change on a deduped read. | `db/repositories/pageReads.ts:40` (early `return` before the upsert at `:68-72`); `db/web-shim.ts:157-159`; `app/(tabs)/library.tsx:103,194-207` |

## 2. Acceptance criteria (verbatim) and status after this plan

| Criterion (verbatim) | Before | After |
|---|---|---|
| Library tab StatCards show real counts: pages read, lectures listened, notes created | PARTIAL (notes only) | Notes: the frame's card, unchanged. Pages read and lectures listened, plus juz: a new `progressStats` StatCard row (§4.4) |
| CircularProgress shows wird completion for the current day | DONE | Unchanged; now fed by real per-page reads |
| AudioProgressCard shows the currently in-progress lecture with real playback position | DONE | Unchanged. **Accepted as is:** "متابعة" restores the track and position but loads it paused (`library.tsx:311-322`) |
| Daily reading streak is tracked and displayed (consecutive days with Quran reading) | DONE | Unchanged |
| Progress persists across app restarts (Zustand + AsyncStorage) | DONE via SQLite | **Accepted deviation:** SQLite (`expo-sqlite`) on native, an AsyncStorage-backed shim on web (`db/web-shim.ts`); Zustand is the read model |
| Quran reading progress is tracked at the page and juz level | PARTIAL | Each Madani page is recorded as its ayat are read in the scrolling reader (§4.2–4.3). Juz completion comes from corrected page ranges (§4.1) and is shown on the Library (§4.4) |
| Progress resets gracefully at user request (settings option) | DONE | Unchanged (`app/(tabs)/more/settings-progress.tsx`). The new totals read tables that reset already clears. A test pins this (implementation plan Task 9) |

## 3. Constraints that shaped the design

- **The ayat data is a mock.** `data/content/quran.ts:66-74` has ayat only for Al-Baqarah 1–5. The other 29 listed surahs return `[]`. The HTTP adapter (`services/api/httpAdapter.quran.ts:27-29`) is inert because `EXPO_PUBLIC_API_BASE` is unset. So until real text arrives, **only page 2 can be read in the app**. The mechanism must be correct for full text; tests and a seeded QA step (implementation plan Task 15) prove juz completion.
- **The reader is one flowing paragraph.** All ayat are inline fragments of a single `<Text>` (`mushaf.tsx:227-240`), and React Native exposes no layout for individual fragments.
- **The reader stays mounted behind other tabs.** `app/(tabs)/sections/_layout.tsx` is a Stack inside the tab navigator. Switching to another tab leaves `ReadingView` mounted, so timers and listeners have to follow screen focus, not mount and unmount.
- **`AsyncContent` unmounts its children while loading and on error** (`components/khazain/state/AsyncContent.tsx:99-114`). Layouts measured during a successful render go stale on a refetch.
- **Out of scope:** a page-swipe Mushaf. That belongs to the separate "Real Mushaf / Quran Reading Experience" card.
- **No new dependencies.** `@testing-library/react-native` isn't installed, so all gating logic lives in pure classes with behaviour tests. React only forwards events to them.

## 4. Approach

### 4.1 A static ayah → page table (option (a), chosen)

New generated file **`constants/quranPageData.ts`**, plus a hand-written **`constants/quranPages.ts`**:

- `QURAN_PAGE_STARTS: readonly AyahRef[]` (`AyahRef = readonly [surah, ayah]`) — 604 entries. Entry *i* is the first ayah of page *i + 1*.
- `JUZ_START_AYAHS: readonly AyahRef[]` — 30 entries.
- `pageForAyah(surah, ayah): number | null` — a binary search.
- The licence notice constants (§4.6).

**Source and licence.** Tanzil Quran Metadata v1.0, `https://tanzil.net/res/text/metadata/quran-data.js`, fetched 2026-10-21, sha256 `9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4`. The file header reads `Copyright (C) 2008-2009 Tanzil.info — License: Creative Commons Attribution 3.0`. CC BY 3.0 allows redistribution and commercial use. It requires credit, the licence URI, and a note of any changes (§4.6). It has no share-alike term.

**Independent cross-checks** (run during planning, pinned as tests):
- Surah start pages derived from the table match the in-repo `SURAH_START_PAGES` (`constants/progress.ts:90-104`), which was written separately, for **all 114 surahs**.
- Juz start pages are **1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582** — the standard Madani division. This is pinned as a literal list, not re-derived.
- Mid-page boundaries, checked ayah by ayah: 3:92 and 3:93 are both on page 62; 5:81 and 5:82 on 121; 9:92 and 9:93 on 201; 45:37 and 46:1 on 502. Total ayat = 6236 (Kufan count, Hafs).

**Juz ranges corrected (finding 4).** Juz *N* runs from the page holding its first ayah to the page holding the ayah just before juz *N + 1*. Juz 4, 7, 11 and 26 begin mid-page, so each shares a page with the juz before it:

```
3: 42–62   4: 62–81   6: 102–121   7: 121–141   10: 182–201   11: 201–221   25: 482–502   26: 502–521
```

The other 22 ranges don't change. `JUZ_PAGE_RANGES` stays a literal in `constants/progress.ts`. A test re-derives every range from the table and checks the literal start-page list. `countCompletedJuz` / `completedJuzList` need no change: a shared page must simply be read for both juz.

**Decision D1 — where juz 4 begins (3:92 or 3:93).** Editions disagree. Tanzil (and apps built on it, such as quran.com) start juz 4 at **3:93** ("كُلُّ الطَّعَامِ"). Some printed editions put the juz-4 marker at **3:92** ("لَن تَنَالُوا الْبِرَّ"), which is the first ayah of page 62. **Both put juz 4 on pages 62–81.** The only difference is whether page 62 also belongs to juz 3. **Chosen: 3:93, as in the source of record.** Under this choice juz 3 = 42–62. Of the two options it is the stricter: juz 3 is never declared complete without its last ayah under either reading. A test pins `JUZ_START_AYAHS[3]` to `[3, 93]`, so changing this decision is a single, visible edit.

**Rejected — (b) proportional estimate** (`page ≈ start + (ayah / ayahCount) × span`). Madani pages hold 1 to 22 ayat, so the estimate puts boundary ayat on the wrong page and breaks juz completion.
**Rejected — (c) a `page` field on `Ayah` from the backend.** There is no backend yet, and the mock would need the table anyway. `types/content.ts` `Ayah` is **not** changed.

### 4.2 Page segments in the existing reader

`ReadingView` renders **one `<Text>` per Madani page** (a "page segment"), stacked in the same `ScrollView`. Each segment keeps today's `ayatBody` style and `AyahNum` markers, flush with no divider.

- `groupAyatByPage(surahNumber, ayat)` (pure, `services/mushafPageTracking.ts`). Consecutive ayat on the same page form one segment. An ayah the table can't place joins the previous segment, so text is never dropped.
- Each segment reports its `onLayout`. A plain `View` around `AsyncContent` reports `bodyY`, which converts segment offsets to scroll-content coordinates. The success wrapper inside `AsyncContent` has no padding (`AsyncContent.tsx:68-79,116-120`).

**Visual change (accepted):** a paragraph break appears at each page boundary. It affects only the reading body. In node 2349:982 the body is not rendered in the export (the PNG is black between header and footer), so there is no pixel spec to break. Header, meta line and footer are untouched. Al-Baqarah 1–5 is one segment, so the open state looks exactly as before.

**Rejected — FlatList, one row per ayah + `onViewableItemsChanged`.** It breaks the flowing mushaf text and changes the scroll container on a screen covered by a frame.
**Rejected — `onTextLayout` line mapping.** Lines carry text, not source offsets, and diacritics, justification and markers make string matching fragile across platforms.

### 4.3 Recording a page: in view + dwell, gated by focus, app state and content

A page is recorded when its segment has been in view long enough to have been read — not when the surah opens.

- `pagesInView(segments, scrollY, viewportHeight)` (pure). A segment is in view when its visible part covers **≥ 50 % of the viewport** (tall segments) or **≥ 90 % of the segment itself** (short segments).
- `PageDwellTracker` (pure class with an injected clock). It adds up in-view time per page and calls `onRead(page)` **once per page per reader session** when the total reaches `PAGE_READ_DWELL_MS` (8 s). The time doesn't need to be continuous. Each update credits at most `PAGE_DWELL_MAX_STEP_MS` (2 s), and `pause()` stops all crediting.
- **`MushafPageTrackingController`** (pure class, new in v2). It holds the tracker, the segment layouts and the scroll and viewport state. It credits time **only while all three gates are open**:
  1. **focused** — `useFocusEffect` (from `expo-router`) calls `setFocused(true)` and starts the 1 s tick on focus. On blur it clears the tick and calls `setFocused(false)`, which pauses the tracker. This covers a tab switch, which leaves the reader mounted.
  2. **app active** — an `AppState` `change` listener calls `setAppActive`.
  3. **content ready** — `setContentReady(ayatStatus === 'success')`. When the status isn't `success`, the controller **clears its stored layouts**, because `AsyncContent` has unmounted the segments, and pauses.

  When a gate opens, the clock restarts from zero: no time is credited for the period while it was closed. `ReadingView` only forwards events (`onLayout`, `onScroll`, focus, AppState, status) to the controller. Every gate has a behaviour test.
- The controller also exposes **`contentYForPage(page)`** — the y position of a page's first line in scroll-content coordinates, or `null` if it hasn't been laid out. The contextual-notes branch will use it to scroll to a page (§10).
- `onRead` calls the existing `useProgressStore.notePageRead(page)`. It is already serialized and already runs wird recompute, suggestions and achievements (`store/progressStore.ts:161-208`).
- The open-time recorder (`mushaf.tsx:155-176`) is **deleted**. `surahStartPage` is still used for the meta line (`mushaf.tsx:159,188-192`), and its value stays as frame 2349:982 shows it.

**Shared-page approximation (accepted).** A page holding the end of one surah and the start of the next counts as read when its segment in either surah is read. A short surah that shares its page (for example 112–114 on page 604) credits the whole page. The precision unit is the page, the same unit as wird and juz, so finer tracking would have nothing to feed.

**`lastReadPage` lives in the progress store (finding 5).**
- Repository: `recordPageRead` upserts `last_read_page` even when the `(day, page)` row already exists, on native (`pageReads.ts:40`) and in the web shim (`web-shim.ts:157-159`). The return value (`inserted`) keeps its meaning.
- Store: `ProgressSnapshot.lastReadPage` is hydrated from `getLastReadPage()` and **set on every recorded page**, deduped or not.
- Library: the wird card reads `useProgressStore((s) => s.lastReadPage)`. The local `useState` and the `todayPct`-keyed effect (`library.tsx:103,194-207`) are removed. A same-day re-read now updates both the wird card and the resume target.

New constants in `constants/progress.ts`: `PAGE_READ_DWELL_MS = 8000`, `PAGE_IN_VIEW_VIEWPORT_SHARE = 0.5`, `PAGE_IN_VIEW_SELF_SHARE = 0.9`, `PAGE_DWELL_MAX_STEP_MS = 2000`.

### 4.4 Library: where pages, juz and lectures appear

**Criterion ↔ Figma conflict.** Frame **06 Library 2031:4659** draws exactly three summary cards, physical left → right: **تذكيراتي "٣ تذكيرات نشطة"**, **ورد القرآن "٧ أيام متتالية"**, **ملاحظاتي "٢٤ ملاحظة"** (read from `docs/KHAZAYIN.fig` with `scripts/figma/extract-text-styles.js`). The criterion asks for pages read, lectures listened and notes created. Swapping values into those cards doesn't work: the frame text on the ورد القرآن card is a streak, and the streak is itself a criterion. The frame's filter rail (الكل, المحفوظات, المفضلة, قوائم التشغيل, المكتمل, ملاحظاتي, تذكيراتي) has no stats view, and the app's السجل filter has no frame.

**Resolution (Figma wins on the region it covers):**
1. The frame's summary row is **unchanged**. ملاحظاتي covers "notes created"; ورد القرآن covers the streak.
2. The extension section `completedLectures` (`library.tsx:617-629`) becomes **`progressStats`**: three StatCards using the same `StatCard`, `STAT_CARD` geometry and `PHYSICAL_ROW` as the frame row. Physical left → right:
   - **محاضرات مسموعة** — e.g. "١٢ محاضرة • المكتملة ٤". The old card's completed count is kept inside this one.
   - **الأجزاء المكتملة** — "٣ من ٣٠".
   - **صفحات مقروءة** — e.g. "٢١ صفحة".
3. `progressStats` takes the slot of `completedLectures` in `LIBRARY_SECTION_ORDER`, after `smartReminders`, which is the frame's last section. It has the same visibility (all four filters), and the existing ordering test keeps it from ever moving above the frame.
4. **Below the fold (accepted).** On the default الكل view the row is at the bottom of the page, below التذكيرات الذكية. It is reached by scrolling and is not in the first viewport. That is a direct result of the frame owning the first viewport. The ticket asks for real counts on StatCards; it says nothing about where on the page they sit.

**Arabic number agreement.** Counted nouns agree with the number: **1** → "صفحة واحدة" / "محاضرة واحدة"; **2** → "صفحتان" / "محاضرتان"; when the last two digits are **3–10** → "٣ صفحات" / "٤ محاضرات" (also "١٠٣ صفحات"); everything else **≥ 11** → "١١ صفحة" / "٢١ محاضرة". Zero has its own text: "لم تبدأ بعد" / "لم تستمع بعد". The completed count is written "المكتملة N", which avoids an adjective that would have to agree with the number. Juz is written "N من ٣٠". Separators are `•`, never `·`, because a middle dot reads as `٠` between Arabic-Indic digits (`services/mushafNavigation.ts:63-65`).

**Rejected:** putting pages into ورد القرآن's subtitle (contradicts the frame text and drops the streak); a fourth card in the frame row (breaks the 3 × 115 pt geometry, `libraryLayout.ts:86-88`); stats only under السجل (hides the counts by default and hides the lecture metric under three filters where it shows today).

### 4.5 "Lectures listened" — definition (finding 3)

A lecture counts as **listened** when `completed = 1`, **or** when `forward_listened_sec ≥ MIN(LECTURE_LISTENED_MIN_SEC, duration_sec)` with `duration_sec > 0` (`LECTURE_LISTENED_MIN_SEC = 60`).

- `forward_listened_sec` already counts only real forward listening. A jump larger than one tick is treated as a seek and credited 0 (`store/playerStore.ts:80-82`).
- The card shows both numbers, so the 95 % completion measure (`COMPLETION_THRESHOLD`) is kept.
- New repository method: `listenedCount()`, on native and in the web shim. One shared predicate, `isListened()` in `db/helpers/lectureCompletion.ts`, mirrors the SQL.

### 4.6 Data, store and About changes

| Layer | Change |
|---|---|
| `constants/quranPageData.ts` (new, generated) | `QURAN_PAGE_STARTS`, `JUZ_START_AYAHS`, licence header |
| `constants/quranPages.ts` (new) | `pageForAyah`; notice constants `QURAN_PAGE_DATA_CREDIT`, `QURAN_PAGE_DATA_CHANGES`, `QURAN_PAGE_DATA_LICENSE_LABEL`, `QURAN_PAGE_DATA_LICENSE_URL` |
| `constants/progress.ts` | 4 values in `JUZ_PAGE_RANGES` corrected; dwell / in-view constants; `LECTURE_LISTENED_MIN_SEC` |
| `services/mushafPageTracking.ts` (new) | `groupAyatByPage`, `pagesInView`, `PageDwellTracker`, `MushafPageTrackingController` |
| `db/types.ts`, `db/repositories/{pageReads,lectureSessions}.ts`, `db/web-shim.ts` | `totalPagesRead()` (= `SUM(khz_days.pages_read)`), `listenedCount()`; `last_read_page` upserted on a deduped read |
| `db/helpers/lectureCompletion.ts` | `isListened()` |
| `store/progressStore.ts` | snapshot gains `lastReadPage`, `totalPagesRead`, `listenedLectureCount` |
| `services/libraryStats.ts` (new) | `arabicCount` and the three subtitle formatters |
| `constants/libraryPresentation.ts` | `completedLectures` → `progressStats`; `LIBRARY_PROGRESS_STAT_ORDER` |
| `app/(tabs)/library.tsx` | `progressStats` row; `lastReadPage` read from the store |
| `app/(tabs)/sections/mushaf.tsx` | page segments; event forwarding to the controller; open-time recorder deleted |
| `app/settings-about.tsx` | "مصادر البيانات" card with the full CC BY notice |

**"Pages read" = all-time `SUM(khz_days.pages_read)`** — pages read, added up day by day. It is the same unit as wird, streak and the trend. The juz card expresses how much of the Quran has been covered.

**No schema change, no migration.**

**CC BY 3.0 notice in the app.** `app/settings-about.tsx` has no Figma frame and follows the contracts `PHYSICAL_BOX`, `textStyle` and the existing `linkCard` style. Under "موقع المؤسسة" it gets a card titled **مصادر البيانات** with:
- credit and source: `QURAN_PAGE_DATA_CREDIT` = "تقسيم صفحات المصحف وأجزائه: بيانات Tanzil.net (Quran Metadata 1.0، ٢٠٠٨–٢٠٠٩)"
- a changes note: `QURAN_PAGE_DATA_CHANGES` = "التعديلات: تحويل الصيغة فقط دون تغيير القيم."
- a **tappable** licence line `QURAN_PAGE_DATA_LICENSE_LABEL` = "الرخصة: CC BY 3.0", which opens `QURAN_PAGE_DATA_LICENSE_URL` = `https://creativecommons.org/licenses/by/3.0/`. It uses the screen's existing `canOpenURL` + Arabic `Alert` fallback, generalised from `openFoundationWebsite` (`settings-about.tsx:24-34`) into `openExternalUrl(url)`.

## 5. Figma frames affected

| Frame | Node | Must remain pixel-identical | Change |
|---|---|---|---|
| 06 Library | 2031:4659 | Entire first viewport and the reference section order | Only the extension row below `smartReminders` changes, and it is outside the frame's content. The wird card's text now comes from the store; the copy format is unchanged |
| 16 Mushaf reader — loaded | 2349:982 | Header, meta line (`… • صفحة ٢ من ٦٠٤`, current behaviour), footer (الفهرس / الانتقال للعلامة / حفظ علامة) | Body becomes page segments. The export renders no body, so there is no pixel spec. A paragraph break at page boundaries is accepted |
| 15 Mushaf reader — loading | 2349:829 | Whole frame | None (the resume path `mushaf.tsx:41-108` is untouched) |

Changed screens with no frame: the Library extension row (contracts `libraryLayout.ts` `STAT_CARD`, `constants/layout.ts` `PHYSICAL_ROW`, `constants/typography.ts` via `StatCard`) and `app/settings-about.tsx` (`PHYSICAL_BOX`, `textStyle`). Neither may be described as "matches Figma".

## 6. RTL

- `progressStats` reuses `styles.statsRow` (`PHYSICAL_ROW`, `library.tsx:721-726`). Its children are authored physically left → right from `LIBRARY_PROGRESS_STAT_ORDER = ['lectures', 'juz', 'pages']` (the same pattern as `LIBRARY_SUMMARY_CARD_ORDER`, `constants/libraryPresentation.ts:61-65`), so صفحات مقروءة reads first, at the physical right.
- Page segments are vertical blocks. Each spreads the existing `ayatBody` (`writingDirection: 'rtl'`, `mushaf.tsx:353-361`).
- The About card reuses `linkCard`, which spreads `PHYSICAL_BOX` and `alignItems: 'flex-end'` (`settings-about.tsx:131-140`). The Latin runs inside the Arabic lines ("Tanzil.net", "CC BY 3.0") are left to bidi.
- No new `I18nManager` reads.

## 7. Risks and release note

| Risk | Mitigation |
|---|---|
| With mock content only page 2 can be read, so the wird ring reaches at most 10 % a day against the default 10-page goal (it used to fill when 10 surahs were opened) — a **demo-visible change** | It is now truthful. QA seeds progress (Task 15). See Q1 |
| The dwell value is a judgement call | It is one constant, pinned by tests; see Q2 |
| Segment layouts go stale after a font-size change or refetch | Layouts are overwritten on every `onLayout`, pruned with `retainPages`, and cleared whenever the status isn't `success` |
| A 1 s interval runs while the reader is open | It runs only while the screen is focused (`useFocusEffect`), and each tick costs O(pages in the surah) — at most 48 for Al-Baqarah |
| The juz range fix changes `completedJuzCount` for existing users | No user could have completed a juz under open-once tracking |
| Tanzil data provenance | The hash is recorded; the generator refuses to run if the licence header changes; all 114 surah start pages are cross-checked; the juz start pages are pinned as a literal list |

**Release note (record in the changelog / tester notes):** "Quran reading is now counted page by page as you read, instead of one page per surah opened. Days recorded by earlier builds are kept as they are: each surah opened back then counted one page — its first — whether or not it was read. Those entries still count towards streaks, the 28-day trend and 'pages read'. Use تقدّم القراءة → إعادة الضبط to start clean."

## 8. Out of scope

- Page-swipe or page-image Mushaf, bookmarks, and the footer buttons' behaviour ("Real Mushaf" card).
- Bundling the full Quran text, or changing `data/content/quran.ts` / the HTTP adapter.
- A reader meta line that follows the scroll position ("صفحة N من ٦٠٤" keeps showing the start page, as in frame 2349:982).
- Auto-play from "متابعة".
- A schema migration, cloud sync, or moving persistence to AsyncStorage.
- Changing the Library filter chip set to match the frame.
- Showing total listened minutes.
- Rewriting history recorded under open-once tracking (see the release note).

## 9. Open questions (defaults let work proceed)

| # | Question | Default used by the plan |
|---|---|---|
| Q1 | Should opening a surah with **no ayat** (mock data) still credit its start page, to keep the demo ring moving? | **No.** Only pages whose text was on screen are recorded. QA seeds progress instead (Task 15) |
| Q2 | Dwell per page | **8 s** of in-view time in total |
| Q3 | "Lectures listened" threshold | **≥ 60 s forward listening (or the full clip if shorter), or completed** |
| Q4 | Where the CC BY notice is shown | **The About modal (`app/settings-about.tsx`)**, plus the source-file header |
| Q5 | "Pages read" as pages added up per day, or distinct pages | **Added up per day.** The juz card shows coverage |

## 10. Merge order and cross-branch coordination

- **This branch lands BEFORE the contextual-notes branch.** That branch rebases onto this one and scrolls to a note's page through this branch's page segments: `MushafPageTrackingController.contentYForPage(page)`, held by `ReadingView`. It must not add a second set of segment measurements, and it must not move `groupAyatByPage`, the segment `onLayout` forwarding, or the `bodyY` wrapper. If it needs the controller outside `ReadingView`, it lifts the controller instance; it does not duplicate it.
- **The settings branch also edits `app/settings-about.tsx`.** The conflict is trivial: **keep both cards** (theirs and مصادر البيانات), and keep the shared `openExternalUrl` helper introduced here. If the settings branch lands first, this branch rebases and resolves it the same way.
