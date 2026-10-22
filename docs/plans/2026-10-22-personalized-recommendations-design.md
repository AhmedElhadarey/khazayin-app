# Personalized Content Recommendations — design (v3)

- Ticket: Trello qJseYPyw "Personalized Content Recommendations"
- Branch base: `feat/tablet-layout-2026-10-22` (this feature stacks on it)
- Status: v3. Board 5-0 (C1–C8) and CTO (B1, S1–S10) were applied in v2. The CTO re-check of v2 approved it with the changes applied here.
- Plan: `docs/plans/2026-10-22-personalized-recommendations-implementation-plan.md`
- Date: 2026-10-22

## Change log v2 → v3

| Ref | Change | Section |
|---|---|---|
| T1 topics | `hadith` and `adhkar` are added to the §5.1 map so every topical archive-backed series maps; the topic map is deep-frozen. | §5.1 |
| T1 scholar-only | Five name-only scholar series are listed in the read-only `SCHOLAR_ONLY_SERIES` and feed scholar affinity only; the coverage test excludes them and a second test guards the list. | §5.2 |
| N1 | The catalogue gate is now `signals.length > 0 \|\| contextSurah != null`, through the pure `shouldLoadCatalogue`. On a fresh install the Mushaf loads the catalogue, so the cold-start tafsir fallback can run. Tested in T6. | §6.4, §7.4, §13 |
| QA #8 | Back returns to wherever the reader was opened from (the Mushaf index when opened from there). The MiniPlayer stays hidden while any Mushaf is on screen, including under root overlays. | §6.4, §10.4 |
| T7 split | T7 becomes T7a (hook + `target.ts`, pure tests) and T7b (row and section components). | §13 |
| Section state | The five Home states come from a pure `sectionState({ hasSignals, activityResolved, catalogueStatus, items })`, tested directly with no render tests. | §6.5, §10.2, §10.3 |
| Ready trigger | "Re-run `refreshActivity` when `progressStore.ready` turns true" is assigned to T6, in the inputs store, not to a screen. | §7.4, §13 |

## Change log v1 → v2

| Ref | Change | Section |
|---|---|---|
| B1 / C7 | Cold start: the section is now **always rendered**. It shows a hint row when there are no signals, an empty line when everything has been dismissed, and a fixed-height skeleton while loading. `visibleOrder` is removed. | §6.1, §6.5 |
| S1 / C2 | Dismiss is a sibling 44pt × button labelled «إخفاء الاقتراح: {title}». No custom accessibilityAction and no RibbonCard API change. | §6.3, §8 |
| S5 / C3 | Home rows pass **no `save`**. Tap opens or plays only. Focus management after dismiss is replaced by an announcement. | §6.2, §8 |
| C1 | The next-surah row uses `router.setParams`, not push. A back-press / MiniPlayer QA case is added. | §6.4, §10.4 |
| C4 | The catalogue is fetched explicitly (page 1 of every lecture store) and no longer depends on which screens were visited. Guardrails: ≥1 signal, after interactions, once per session, cache-first, pool of 4, stop on 401/403. The bulk endpoint is written up as a proposal. | §7.4, §7.5 |
| C6 / S9 | `refreshActivity` awaits `getRepos()` and re-runs when `progressStore.ready` becomes true. The counter triggers are dropped. `loadCatalogue` is idempotent and single-flight. | §7.4, §7.6 |
| C8 | The note signal's label comes from `NoteRef.label` only. A test covers it. | §4.2, §10.1 |
| S3 | The Mushaf invariant is anchored on `<SurahNotesFooter`. | §10.3 |
| S4 | `gridColumns(width, 340, 2)` now takes the screen width. | §6.2 |
| S6 | "Completed series" exclusion is removed. A series is excluded only if it is a signal target, using `isListened()`. | §4.2, §4.6 |
| S7 | A surah's last page comes from the static page tables, with no catalogue dependency. | §5.3 |
| S8 | Candidates are sorted by key before the fallback pick. Memo deps are primitives. | §4.6, §7.6 |
| S10 | One slot is reserved for the best qualifying scholar. Tested. | §4.6 |
| Nits | `indexCatalogue` memo; max-not-sum topic score; tafsir pick `surah mod k`; page-read limit 604; diversity cap ⌈n/3⌉; Q5 decided (saved scholar's series gets its own reason); dismissal edge cases and toast replacement documented; `RECOMMENDATIONS_ENABLED` kill switch; caption hierarchy QA at 360dp. | various |
| Plan | §13 is split into 10 dependency-ordered tasks, each with files, tests and a commit message. | §13 |

## 0. Corrections to the scoping notes

1. **"Continue listening" is shown on Library only, not Home.** It is read at `app/(tabs)/library.tsx:199` and rendered at `:332`. `app/(tabs)/index.tsx` does not import `useProgressStore`.
2. **`savedStore` sets `version: 1`** (`store/savedStore.ts:191`). Only `notesStore` follows the "no version/migrate" rule (`store/notesStore.ts:88-99`). The new store copies notesStore.
3. **`db/helpers/suggestion.ts` is a template for shape only.** It is a pure function over one input object that returns a decision with a reason code (`:22-76`). No code is shared.
4. **The Home `ScholarCard` cannot show an arbitrary scholar.** `nameArt` is a required calligraphy image (`components/khazain/home/ScholarCard.tsx:29`). Three scholars have one, and all three render the Ibn Baz lockup (`app/(tabs)/index.tsx:50-56`).

## 1. Goals and non-goals

**Goals:** G1 the Home section «مقترح لك» (AC1). G2 an end-of-surah suggestion block in the Mushaf (AC2). G3 scholar recommendations from engaged topics (AC3). G4 recompute on activity (AC4). G5 per-item dismiss with undo and a reset (AC5). G6 a pure, deterministic on-device engine with no new dependency and no backend (AC6).

**Non-goals (v1):**
- Learned models, embeddings, or server ranking.
- Signals from surah audio. `NoAudioError` is thrown on every surah play.
- `recentSearchesStore`. It stores bare strings with no timestamps (`store/recentSearchesStore.ts:19,40`), and they are the most sensitive input we have.
- `preferredReciterId`. Reciters have no audio to recommend.
- Dawah posters, as signals or as candidates.
- A per-surah tafsir mapping. The catalogue's tafsir series cover the whole Quran (e.g. `data/content/scholars.ts:67`).
- A "continue listening/reading" card.
- A Settings toggle that hides the section (open question Q2). The compile-time kill switch (§7.7) covers emergencies.
- Saving from recommendation rows.

## 2. Design authority

No Figma frame exists for either surface. The authorities are:
- `constants/layout.ts`: `PHYSICAL_ROW` / `READING_ROW` / `RTL_TEXT` (`:112-141`).
- `constants/typography.ts`: existing `textStyle` roles only.
- `constants/rtlContracts.ts`: one new slot order (§6.3).
- The existing components `HomeSectionHeader`, `RibbonCard` and `SkeletonRibbonList`.

QA records and PR text must not say "matches Figma".

## 3. Architecture

```
signals (local)                               catalogue (contentService via existing SWR stores)
 savedStore.items, notesStore.notes ──┐        scholars + per-scholar lectures, books, surahs,
 lectureRepo.listRecent()      (new) ─┤        page 1 of the 4 lecture stores  ← loadCatalogue()
 progressRepo.recentPageReads() (new) ┘                      │ single-flight, guarded (§7.4)
        │ toSignals() (pure)                                 ▼ indexCatalogue() (pure, own memo)
        └──────────► recommend(signals, index, nowMs, dismissed, limit, contextSurah) ← pure
                                         │
                       useRecommendations({ limit, contextSurah })
                          │                                │
              Home «مقترح لك» section             Mushaf <SurahEndSuggestions>
                          │
        recommendationsStore (persisted dismissals, @khazain/recommendations)
```

The dependency rule: `services/recommendations/recommend.ts` and `constants/recommendation*.ts` import nothing from React, Zustand, `db/`, or `contentService`. The adapters (`signals.ts`, `catalogue.ts`) translate store and repo shapes into the pure types. The precedents are `services/mushafPageTracking.ts:1-7` and `services/search/searchAll.ts:4`.

## 4. Signal model

### 4.1 Types

```ts
type SignalKind = 'saved' | 'note' | 'listened' | 'completed' | 'read';
type SignalTarget =
  | { type: 'lecture'; id: string; archiveId?: string; title?: string }
  | { type: 'scholar'; id: string } | { type: 'book'; id: string; title?: string }
  | { type: 'surah'; number: number };
interface Signal { kind: SignalKind; target: SignalTarget; atMs: number; label: string } // label: Arabic, reason line
```

### 4.2 Sources and weights

| Source | Read from | Kind | Weight | Time | Label |
|---|---|---|---|---|---|
| Saved lecture / scholar / book / surah | `useSavedStore(s => s.items)` (`types/content.ts:181-187`) | `saved` | 3.0 | `savedAt` | snapshot title / name |
| Note with a `ref` (lecture / book / ayah) | `useNotesStore(s => s.notes)` | `note` | 2.0 | `updatedAt` | **`NoteRef.label` only** (C8) |
| Session where `isListened()` holds and it is completed | `lectureRepo.listRecent(50)` **(new)** | `completed` | 2.5 | `lastListenedAt` | session `title` |
| Session where `isListened()` holds, not completed | same | `listened` | 1.5 | `lastListenedAt` | session `title` |
| Surah read (derived, §5.3) | `progressRepo.recentPageReads(sinceMs, 604)` **(new)** | `read` | 1.0 | latest `recorded_at` | surah name |

- `isListened()` (`db/helpers/lectureCompletion.ts:26-34`) is reused as-is. It is the same predicate as `listenedCount()`, so "listened" means one thing everywhere. Sessions that fail it produce no signal.
- **C8:** a note's `title` and `body` are free text the user wrote, so they are never read. The label is the frozen Arabic `NoteRef.label` that is stored with the ref (`services/noteRefs.ts`, e.g. `lectureRefLabel` at `:56`). A note without a `ref` produces no signal.
- Dedupe: one signal per `(kind, target)`, keeping the newest.

### 4.3 Decay and caps

- `c(s) = weight × 0.5^(max(0, nowMs − atMs) / HALF_LIFE_MS)`, with `HALF_LIFE_MS = 21 days`. A future timestamp counts as age 0. Signals older than 120 days are dropped.
- `topicAff[t]` is capped at `TOPIC_CAP = 8` and `scholarAff[σ]` at `SCHOLAR_CAP = 6`.
- Input caps: 200 saved items, 100 notes, 50 sessions, page reads from the last 120 days (at most 604 rows, one per page).

### 4.4 Resolution: target → topics and scholar

`indexCatalogue(snapshot)` (pure) builds `byLectureId`, `byArchiveId`, `bookById`, `lecturesByScholar` and `scholarById`.
- **Lecture:** resolve by `id`. For an episode id `${archiveId}/${file}` (`services/noteRefs.ts:67-71`, built at `services/archive/episodeResolver.ts:85`), use `archiveIdOfEpisode` → `byArchiveId`. That yields `scholarId` (`types/content.ts:97`) and the title. If nothing resolves, match keywords on the snapshot or session title, with no scholar.
- **Scholar:** the union of that scholar's lecture topics.
- **Book:** title keywords (`types/content.ts:105-109`).
- **Surah or ayah:** `tafsir`.

### 4.5 Scoring (max, not sum)

```
topicAff[t]   = min(TOPIC_CAP,   Σ c(s) over signals whose topics include t)
scholarAff[σ] = min(SCHOLAR_CAP, Σ c(s) over signals resolved to scholar σ)
lecture series L: score = max_{t∈T(L)} topicAff[t] + 0.5 × scholarAff[σ(L)]
book B:           score = max_{t∈T(B)} topicAff[t]
scholar S:        score = 0.8 × max_{t∈T(S)} topicAff[t]   (only if S is not saved and scholarAff[S] = 0)
```

The max keeps a title that matches two topics (`تفسير آيات الأحكام`) from being counted twice. A candidate needs `score ≥ MIN_SCORE = 0.3`.

### 4.6 Exclusions, diversity, determinism

- **Exclude** anything saved, any key in `dismissed`, and any item that is itself a signal target. Because listened and completed sessions are signal targets, this also excludes a series the user has listened to past `isListened()`, and with it the series Library shows as in-progress (once past 60s). There is no separate "completed series" rule (S6).
- **Diversity:** with `n = limit`, a greedy pass allows at most ⌈n/3⌉ items per scholar, per primary topic, and of kind `scholar`.
- **Reserved scholar slot (S10):** when `n ≥ 3` and some scholar candidate qualifies, the best one is guaranteed a place. If the greedy pass did not pick it, it replaces the lowest-ranked item.
- **Order:** scores are rounded to 1e-6, then sorted by score desc → kind (`lecture` < `book` < `scholar`) → `key` asc. Every candidate pool is **sorted by key before any fallback or rotation pick** (S8), so input order never matters.
- `nowMs` is a parameter. The engine never reads the clock (§7.6).

### 4.7 Output and reasons

```ts
interface Recommendation {
  key: string;            // dismissal key: `lecture:${archiveId ?? id}` | `book:${id}` | `scholar:${id}`
  kind: 'lecture' | 'book' | 'scholar';
  entityId: string; title: string; meta: string; reason: string; score: number;
  lecture?: Lecture; scholarId?: string;
}
export function recommend(signals: readonly Signal[], index: CatalogueIndex, nowMs: number,
  dismissed: ReadonlySet<string>, limit: number, contextSurah?: number): Recommendation[];
```

Lecture keys use `archiveId` when one exists. The Internet Archive id is real data, so it should outlive the mock lecture ids (§7.2). The reason comes from the signal that contributes most (ties: saved > note > completed > listened > read, then key). The templates live in `RECOMMENDATION_COPY`:

| Top contribution | Reason |
|---|---|
| `saved` item | `لأنك حفظت «{label}»` |
| `saved` scholar, candidate is one of their series (Q5) | `لأنك تتابع {name}` |
| `note` | `لأنك دوّنت ملاحظة على «{label}»` |
| `completed` / `listened` | `لأنك استمعت إلى «{label}»` |
| `read` | `لقراءتك سورة {name}` |
| scholar candidate | `له دروس في {topicLabel}` |
| Mushaf fallback (§6.4) | `للاستزادة في تفسير ما قرأت` |

`{label}` is cut to 32 characters plus `…`.

## 5. Topic map

### 5.1 `constants/recommendationTopics.ts`

```ts
export const RECOMMENDATION_TOPICS = Object.freeze({
  tafsir:   { label: 'التفسير',          keywords: ['تفسير', 'التفسير'] },
  riyad:    { label: 'رياض الصالحين',    keywords: ['رياض الصالحين'] },
  bulugh:   { label: 'بلوغ المرام',      keywords: ['بلوغ المرام'] },
  sahihayn: { label: 'الصحيحين',         keywords: ['صحيح البخاري', 'صحيح مسلم'] },
  fatawa:   { label: 'الفتاوى',          keywords: ['فتاوى', 'نور على الدرب'] },
  fiqh:     { label: 'الفقه',            keywords: ['زاد المستقنع', 'آيات الأحكام', 'فقه العبادات'] },
  tawhid:   { label: 'التوحيد والعقيدة', keywords: ['التوحيد', 'العقيدة', 'ثلاثة الأصول'] },
  seerah:   { label: 'السيرة النبوية',   keywords: ['السيرة', 'زاد المعاد', 'سيرة ابن هشام', 'الرحيق المختوم'] },
  hadith:   { label: 'شروح السنن والحديث', keywords: ['شرح سنن', 'الأدب المفرد', 'السنة النبوية', 'الأحاديث النبوية', 'الأربعين النووية'] },
  adhkar:   { label: 'الأذكار والأدعية', keywords: ['فقه الأدعية والأذكار'] },
} as const);
export const SCHOLAR_ONLY_SERIES: ReadonlySet<string>; // read-only archiveIds, see §5.2
export const CATEGORY_FALLBACK_TOPIC: Partial<Record<Lecture['category'], TopicId>> = { prophet: 'seerah' };
export function topicsForTitle(title: string, category?: Lecture['category']): TopicId[];
```

- `hadith` and `adhkar` were added to the original eight: the archive-backed catalogue has the four Sunan commentaries, الأدب المفرد and فقه الأدعية والأذكار, which fit no existing topic, and the coverage test (§5.2) requires every topical series to map. Later additions, all full phrases, so a first save of a book or lecture titled by them yields a topic: `فقه العبادات` (fiqh), `ثلاثة الأصول` (tawhid), `سيرة ابن هشام` and `الرحيق المختوم` (seerah), `السنة النبوية`, `الأحاديث النبوية` and `الأربعين النووية` (hadith). Titles with no safe phrase stay unmapped (e.g. `إضاءات على طريق العباد`). Existing topics also gained `لقاء الباب المفتوح` (fatawa) and `اقتضاء الصراط المستقيم` / `معارج القبول` (tawhid).
- The map, each topic object and each keyword array are deep-frozen.
- Both sides go through `normalize()` (`services/search/normalize.ts:71`), and keywords match as substrings. Ambiguous single words are never keywords: `زاد` alone would merge fiqh and seerah. Results are de-duplicated, in map key order.
- The category fallback applies only when no keyword matched. `prophet` is not reliably seerah: `p4 تفسير القرآن الكريم` is in that category (`data/content/lectures.ts:26`).

### 5.2 Unknown items

An item with no topic and no scholar produces no affinity. It is skipped and never throws. An item with no topic but a known `scholarId` still feeds `scholarAff`. A coverage test asserts that every archive-backed lecture in `data/content/scholars.ts` maps to at least one topic, except the **scholar-only series**. Five series are titled only by the scholar's name (`محاضرات ابن باز`, `محاضرات ابن عثيمين`, `محاضرات الألباني`, `فوائد الألباني`, `محاضرات عبد الرزاق البدر`). A name is not a topic, and mapping it would double-count scholar affinity. Their archiveIds are listed in the read-only `SCHOLAR_ONLY_SERIES` set (`0006_20231225`, `361_20250211`, `169_20210628`, `0001_20230715`, `012_20230905`) and feed `scholarAff` only. A second test asserts that each listed id exists, has a `scholarId`, and maps to no topic, so the list cannot go stale.

### 5.3 Surah "read" derivation (static tables, S7)

`surahLastPage(n)` uses only `SURAH_START_PAGES` (`constants/progress.ts:113`) and `QURAN_PAGE_STARTS` (`constants/quranPageData.ts:18`, re-exported by `constants/quranPages.ts:7`):
- `n = 114` → 604.
- Otherwise `p = SURAH_START_PAGES[n+1]`. The last page is `p − 1` if `QURAN_PAGE_STARTS[p−1]` is `[n+1, 1]` (the next surah opens page p), and `p` if it does not.

Surah *n* counts as read when its last page has a read row. A surah longer than one page also needs a read row for its start page. This is approximate: one Juz 'Amma page marks several surahs. That is acceptable for a weight-1.0 signal, and is why the reason wording is soft. A persisted "finished surah" log was rejected because it would duplicate reading history outside SQLite.

## 6. Surfaces

### 6.1 Home placement

`'recommended'` goes into `HOME_SECTION_ORDER` (`constants/homePresentation.ts:9-18`) between `'books'` and `'queen'`:

```
header, quranHero, prophetHero, scholars, books, recommended, queen, quickChips, dawah
```

- The Figma opening is unchanged, and the hero-before-carousel test (`homePresentation.test.ts:27-32`) still holds.
- The `['queen','quickChips']` tablet pair (`homePresentation.ts:25-28`) stays adjacent.
- The section is **always rendered** (B1/C7), so both render paths (`index.tsx:206`, `:225`) consume `HOME_SECTION_ORDER` unchanged. The only exception is the compile-time kill switch (§7.7).

### 6.2 Card choice

A carousel of `ScholarCard` / `BookCard` was rejected. ScholarCard needs calligraphy that 12 of 15 scholars lack (§0.4). BookCard shows one shared title image (`index.tsx:58-61`). Neither card has room for a reason line.

**Chosen: `RibbonCard` rows**, using `pretitle={reason}`, `title`, `meta`, and the default gold ribbon. The card uses its existing `textStyle('caption'/'bodyCompact')` styles (`RibbonCard.tsx:137-139`). There is **no restyle, no new prop, and no `save`** (S5/C3), so long-press does nothing on these rows. Tapping follows §6.6.

- Phone: up to **3** rows.
- Tablet: up to **4** items in `gridColumns(width, 340, 2)` columns, where `width` is the **screen width**. `gridColumns` subtracts the gutter itself (`constants/responsive.ts:127-131`) (S4).
- Each grid row is a `READING_ROW`, so the first item sits on the physical right and screen-reader order follows (`layout.ts:134-141`). `carouselVisibleCount` is not used: it is keyed to carousel card widths (`layout.ts:46-49`).
- Header: `<HomeSectionHeader title="مقترح لك" />`, using the title-only branch (`HomeSectionHeader.tsx:28`).

### 6.3 Row and dismiss control (S1/C2)

`RecommendationRow` = `[RibbonCard, DismissButton]` as **siblings**, authored in reading order inside a `READING_ROW`. The card is on the physical right and the button on the physical left. A screen reader reaches the card's texts (reason → title → meta) and then the button.

- New contract in `constants/rtlContracts.ts`: `RECOMMENDATION_ROW_ORDER = Object.freeze(['dismiss', 'card'] as const)` (physical left → right), in the style of `LECTURE_CARD_ORDER` (`:23`).
- DismissButton: `CloseIcon` (`components/khazain/icons/index.tsx:275`) at 14pt in a 44×44 hit area, `KhazainColors.ink500`, `accessibilityRole="button"`, `accessibilityLabel={`إخفاء الاقتراح: ${title}`}`.
- Dismiss is never a long-press (`__tests__/contextualNotesInvariants.test.ts:127-140`). Existing RibbonCard call sites are untouched.

### 6.4 After finishing a surah — Mushaf end block

- **Where:** `<SurahEndSuggestions surahNumber=… />` goes right after `<SurahNotesFooter …/>` (`app/(tabs)/sections/mushaf.tsx:498`). It is inside the ScrollView and outside the measured body (`:442`, comment `:496`), and renders only when `ayatStatus === 'success'`.
- **Detection:** reaching the block is the detection. There is no new reader state or timer. Home's `read` signal comes from the existing page tracking (`mushaf.tsx:215-222`) and §5.3.
- **Rows (2 at most):**
  1. `السورة التالية: سورة {name}` → `router.setParams({ surah: NNN, ayah: undefined })` (C1). `ReadingView` is keyed by surah (`mushaf.tsx:118`), so it remounts. `MushafScreen` stays mounted and focused, so its focus-based MiniPlayer hide (`:69-73`) neither re-runs nor restores. No history entry is pushed, so Back returns to wherever the reader was opened from: the Mushaf index when opened from there, otherwise the opening screen. The MiniPlayer stays hidden while any Mushaf (reader or index) is on screen, including under root overlays (note editor, notes viewer, sheets), which blur the tab group but leave the Mushaf visible (`releaseMiniPlayerOnBlur`). It comes back when focus moves to another screen: a scholar or book screen pushed over the Mushaf, or leaving the Mushaf. Omitted for surah 114. Not dismissible.
  2. One recommendation: `recommend(..., limit 1, contextSurah)`. The context limits candidates to `tafsir` lecture series and books. Among the qualifying candidates, the top `k ≤ 3` by the §4.6 order are taken and index `surah mod k` is picked. If none qualifies, the fallback pool is every non-dismissed tafsir candidate **sorted by key**, again picking `surah mod k`, with the fallback reason. The rotation varies the row from surah to surah and is deterministic. The row can be dismissed.
- **Loading:** the block calls `loadCatalogue({ signalCount, contextSurah })` (single-flight, §7.4). `contextSurah` is always set here, so the gate is always open and a fresh install still gets the tafsir fallback (N1). Until the load resolves, only row 1 shows. No skeleton appears here because the block is at the end of the scroll.
- **Routing inside the Mushaf:** a lecture recommendation opens `/sections/scholar/{scholarId}` and **does not play**, because the Mushaf hides the MiniPlayer. Books go to `bookDetailHref` (`services/bookDetail.ts:18`).
- **No save gesture** on this NOTE surface (§10.3).
- **Avoiding nagging:** no modal, toast, haptic or notification. The block is inline at the bottom, shows one recommendation at most, and a dismissed item stays gone.

### 6.5 Home section states (B1/C7)

The state is chosen by a pure function in `services/recommendations/sectionState.ts`, tested directly:

```ts
type SectionState = 'skeletonOne' | 'hint' | 'skeletonFull' | 'items' | 'empty';
export function sectionState(i: { hasSignals: boolean; activityResolved: boolean;
  catalogueStatus: 'idle' | 'loading' | 'ready' | 'aborted'; items: readonly unknown[] }): SectionState;
```

The rules, in order:
1. `items.length > 0` → `items`.
2. `!hasSignals && !activityResolved` → `skeletonOne`.
3. `!hasSignals` → `hint`.
4. `catalogueStatus` is `idle` or `loading` → `skeletonFull`.
5. Otherwise → `empty`.

`RecommendedSection` only switches on the result.

| State | Body | Height |
|---|---|---|
| No signal yet and activity unresolved | `SkeletonRibbonList` (`components/khazain/state/SkeletonRibbon.tsx:70`), 1 slot | 1 slot |
| No signals (activity resolved or failed) | Hint row, **not dismissible**: «احفظ درسًا أو استمع إليه لتظهر هنا اقتراحات تناسبك» *(copy pending Foundation review)* | 1 slot |
| ≥1 signal, catalogue loading | `SkeletonRibbonList` with `limit` slots | `limit` slots |
| ≥1 signal, items available | up to `limit` `RecommendationRow`s | `limit` slots |
| ≥1 signal, every candidate dismissed or none qualifies | «لا توجد اقتراحات جديدة الآن» | `limit` slots |

- `RECOMMENDATION_SLOT_HEIGHT` is defined once in `constants/recommendations.ts`. It is derived from the row's line heights: caption reason, two lines of `bodyCompact` title, caption meta, plus padding. Every with-signal state uses the same `limit × slot + gaps` height, so the skeleton → content swap does not move the sections below.
- Residuals that are accepted and written down:
  - The 1-slot → `limit`-slot change on the first activity resolve, for a user whose only history is listening.
  - Trailing blank space when fewer than `limit` items qualify.
  - Growth at very large OS font scales, recorded in QA #12.
- The hint and empty lines use `textStyle('bodyCompact')` + `RTL_TEXT` in `KhazainColors.ink500`, with no Pressable.

### 6.6 Routing

`recommendationTarget(rec, surface)` in `services/recommendations/target.ts`. On Home it delegates to `searchTargetFor` (`services/search/searchTarget.ts:21-28`) with a one-item group:
- scholar → `/sections/scholar/{id}`
- book → `bookDetailHref`
- lecture → play via `startLecturePlayback` (`services/lecturePlayback.ts:12`)

On the Mushaf it applies the §6.4 override.

## 7. State, persistence, triggers

### 7.1 `store/recommendationsStore.ts` (persisted)

```ts
type RecommendationsState = {
  dismissed: Record<string, number>;   // key → dismissedAt (ms)
  dismiss(key: string): void;          // cap 300, oldest dropped
  restore(key: string): void;          // undo
  clearDismissed(): void;              // Settings reset
};
```

Persist key `@khazain/recommendations`, through `createJSONStorage(() => AsyncStorage)`. **No `version`/`migrate`.** It uses `merge` plus `coerceDismissed()`, which keeps entries with a non-empty string key and a finite number and never throws. With nothing persisted it keeps the in-memory state, exactly as `notesStore.ts:85-100` does. A dismissal is permanent per item. The timestamp is kept so that an expiry can be added without migrating data.

### 7.2 Dismissal edge cases (documented, accepted)

- **The cap brings items back.** The 301st dismissal drops the oldest one, and that item can be recommended again. 300 is well past realistic use.
- **Ids change when the backend arrives.** Mock lecture ids (e.g. `sl5-2`) will not match backend ids, so those dismissals will be orphaned and the items can come back. Lecture keys use `archiveId` where present (§4.7) to limit this. Book and scholar ids have no stable alternative. Orphaned keys are harmless and are dropped through the cap.

### 7.3 Dismiss, undo, reset

- `dismissRecommendation(rec)` calls `dismiss(key)` and then `toastStore.show({ message: 'تم إخفاء الاقتراح', durationMs: 5000, action: { label: 'تراجع', onPress: () => restore(key) } })`. This mirrors unsave (`services/savedToggle.ts:48-57`).
- It also announces «تم إخفاء الاقتراح» with the queued-announce helper pattern (`savedToggle.ts:74-81`), because the toast has no live region. There is no focus management.
- **Toast replacement:** `show()` replaces the current toast and has no queue (`store/toastStore.ts:7-8`). Two quick dismissals leave only the second undo available. The first can be brought back through Settings, the same trade-off saved items already make.
- **Reset:** Settings → «البيانات» (`app/(tabs)/more/settings.tsx:229-243`) gets a new `ListRowCard` «إعادة عرض الاقتراحات المخفية». It calls `clearDismissed()` and shows the toast «تمت إعادة عرض الاقتراحات». No confirmation.

### 7.4 Inputs — `store/recommendationInputsStore.ts` (not persisted)

```ts
{ activity: { sessions: LectureSession[]; pageReads: { page: number; atMs: number }[]; failed: boolean } | null;
  catalogue: CatalogueSnapshot | null; catalogueStatus: 'idle' | 'loading' | 'ready' | 'aborted';
  nowMs: number; refreshActivity(): Promise<void>; loadCatalogue(): Promise<void>; }
```

**`refreshActivity()` (C6/S9)**
- It awaits `getRepos()` before touching `lectureRepo` / `progressRepo`. Those are Proxies that throw before hydration (`db/index.ts:69-80`); the pattern is at `mushaf.tsx:90-95`. It then reads `listRecent(50)` and `recentPageReads(now − 120d, 604)` and sets `nowMs = Date.now()`. `nowMs` is seeded at store creation; refreshed by `refreshActivity`. Nothing else in the feature reads the clock.
- On error, or when `progressStore.dbFailed` is set (`store/progressStore.ts:171`), it sets `activity = { sessions: [], pageReads: [], failed: true }`. The engine then runs on saved items and notes only.
- **Triggers:** Home focus (`useFocusEffect`), Mushaf mount, and once when `progressStore.ready` turns `true` (`progressStore.ts:53,165`). The ready trigger lives in the inputs store, not in a screen. `startActivityWatch()` subscribes with `useProgressStore.subscribe` and calls `refreshActivity()` on a `false → true` transition, or at once if `ready` is already `true`. It is called once from `app/_layout.tsx` next to the existing hydration. The v1 `totalPagesRead` / `listenedLectureCount` triggers are removed. Listening activity that happens while Home stays focused (MiniPlayer playing on Home) appears on the next focus; this is accepted. A signal created while Home is focused (a save or note) is different: Home subscribes to `useSavedStore`, `useNotesStore` and the inputs store's `activity` through `services/recommendations/watchSignals.ts`, and once the first-fetch gate is open the change triggers the load immediately.

**`loadCatalogue()` (C4/S9): idempotent and single-flight**
- A module-level in-flight promise means concurrent callers (Home, Mushaf) share one run. After `ready` or `aborted`, the call is a no-op for the rest of the session.
- **Gate (N1):** `loadCatalogue({ signalCount, contextSurah })` returns at once unless `shouldLoadCatalogue(signalCount, contextSurah)` holds, i.e. `signalCount > 0 || contextSurah != null`. Home passes no `contextSurah`, so a Home with no signals never fetches. The Mushaf block always passes one. On Home it is scheduled after `Promise.allSettled([fetchScholars(), fetchBooks(), fetchDawah()])`, the existing first fetches (`index.tsx:76-80`), inside `InteractionManager.runAfterInteractions`. Home re-attempts `loadCatalogue` after each focus refresh, and on each change to saved items, notes or activity, once the first-fetch gate has opened.
- **Explicit fetch list**, so the result does not depend on which screens were visited:
  - `useScholarsStore.fetch()`, then `useScholarLecturesStore(id).getState().fetch()` for every scholar (`store/scholarStore.ts:31-45`).
  - `useBooksStore.fetch()` and `useSurahsStore.fetch()`.
  - `fetch()` on each of the four paginated lecture stores, which loads page 1 and is idempotent (`store/paginated.ts:32`).
  - That is at most 22 requests today.
- **Cache-first:** `fetch()` serves the SWR cache immediately when present and revalidates in the background (`store/createAsyncStore.ts:213-240`). `refresh()` is never called.
- **Pool of 4:** batches of at most 4 calls, each settled with `Promise.allSettled`. A failed scholar simply contributes no lectures, because a partial catalogue is valid input.
- **Stop on auth:** if a store ends in `error` with `isApiError(e) && (e.code === 'auth' || e.code === 'forbidden')` (`services/api/errors.ts:56`, `services/api/types.ts:37-38`), the remaining batches are skipped, the status becomes `aborted`, and the snapshot is built from whatever loaded.

### 7.5 Proposed backend addition (to copy into `docs/plans/2026-05-10-backend-integration-activation-design.md` as a new "Proposed: bulk scholar lectures" section; `docs/api-contract.md` does not exist)

> `GET /scholars/lectures?cursor=` returns `Paged<Lecture>` (the shape in §4.1 of that doc) with `scholarId` and `archiveId` always populated, under the manifest hash key `scholar-lectures`. `ContentService.scholars.listAllLectures(cursor)` becomes the recommender's only lecture source. It replaces the N per-scholar calls and the 4 page-1 calls. Until it ships, the client keeps the guarded fan-out in §7.4.

### 7.6 Hook and memoisation — `services/recommendations/useRecommendations.ts`

```ts
export function useRecommendations(limit: number, contextSurah?: number) {
  const saved = useSavedStore((s) => s.items);
  const notes = useNotesStore((s) => s.notes);
  const dismissed = useRecommendationsStore((s) => s.dismissed);
  const activity = useRecommendationInputsStore((s) => s.activity);   // one selector per field:
  const catalogue = useRecommendationInputsStore((s) => s.catalogue); // the repo never uses useShallow
  const nowMs = useRecommendationInputsStore((s) => s.nowMs);
  const catalogueStatus = useRecommendationInputsStore((s) => s.catalogueStatus);
  const index = useMemo(() => indexCatalogue(catalogue), [catalogue]);
  const signals = useMemo(() => toSignals(saved, notes, activity, index), [saved, notes, activity, index]);
  const items = useMemo(() => recommend(signals, index, nowMs, new Set(Object.keys(dismissed)), limit, contextSurah),
                        [signals, index, nowMs, dismissed, limit, contextSurah]);
  return { items, hasSignals: signals.length > 0, activityResolved: activity !== null, catalogueStatus };
}
```

- Selectors return stored references only. Nothing is filtered or computed **inside a zustand selector** (`store/notesStore.ts:119-126`, CLAUDE.md "State").
- The deps are primitives and stable references, never an options object (S8). With React Compiler on, the explicit memos are redundant but harmless, and they document the boundary.

### 7.7 Kill switch

`RECOMMENDATIONS_ENABLED` in `constants/recommendations.ts` is a compile-time `true`. When it is `false`:
- `sections.recommended` is `null`, and Home's two render loops skip `null` section nodes. That is a generic rule, so `homeTabletRows(HOME_SECTION_ORDER)` stays literal (`homeTablet.test.ts:79`).
- The Mushaf block shows the next-surah row only.
- `loadCatalogue` / `refreshActivity` are never scheduled.
- The Settings reset row is hidden.

### 7.8 New repo methods (read-only, no schema change)

- `LectureSessionsRepository.listRecent(limit)`: `SELECT * FROM khz_lecture_sessions ORDER BY last_listened_at DESC, lecture_id ASC LIMIT ?` (ties by lecture id ascending).
- `PageReadsRepository.recentPageReads(sinceMs, limit)`: `SELECT page_number, MAX(recorded_at) AS at FROM khz_page_reads WHERE recorded_at >= ? GROUP BY page_number ORDER BY at DESC, page_number ASC LIMIT ?` (ties by page ascending), with the caller passing 604. The GROUP BY makes 604 the true maximum.
- `db/web-shim.ts` gets the same semantics over its arrays (`:40,150,304-331`).
- No migration is needed, and raw SQL stays in `db/`.

## 8. Accessibility

- Order: section title (`HomeSectionHeader`), then for each row the card's texts (reason, title, meta, in RibbonCard child order) followed by the dismiss button.
- The dismiss button is the only accessible dismiss path: role `button`, label «إخفاء الاقتراح: {title}», 44×44 target. It is reachable by VoiceOver, TalkBack, Switch Control and keyboard. No custom action is added and RibbonCard's API is unchanged.
- After a dismiss: a queued announcement «تم إخفاء الاقتراح». No programmatic focus move.
- Hint and empty lines are plain `Text` (no button role), so they do not suggest an action.
- Every text spreads `RTL_TEXT`. **Caption hierarchy** check: the reason (caption, ink500) must still read as secondary to the title (bodyCompact) at 360dp with the largest font level (QA #12).

## 9. Privacy and data lifecycle

- Everything stays on the device. The only network traffic is the existing `contentService` catalogue calls. Logs contain no titles, keys or labels. Note bodies and titles are never read (C8).
- Dismissals live in plaintext AsyncStorage. That is less sensitive than notes, and CLAUDE.md already accepts the risk for notes.
- **Progress reset** (`settings-progress.tsx:73`, `db/repositories/reset.ts:6-26`) empties the sessions and page-read tables, so the derived signals disappear. `refreshActivity()` is called next to `refreshAll()` (`:74`). Saved-item and note signals remain, which matches the dialog copy «الملاحظات والمحفوظات لن تتأثر» (`:65`).
- **Clear cache** (`services/cacheFacade.ts`) never touches dismissals. No cache root is registered.

## 10. Testing strategy

### 10.1 Pure engine — `__tests__/recommendations.test.ts`

- No signals gives `[]`.
- One saved `شرح رياض الصالحين` (s5) puts other Riyad series first, with reason `لأنك حفظت «…»`. s9 appears as the reserved scholar slot with `له دروس في رياض الصالحين`, and s5 never appears as a scholar candidate.
- Saved scholar s4: s4's series appear with `لأنك تتابع …` (Q5).
- Decay: half at 21d, dropped at 120d. Caps: 20 same-topic saves stay ≤ 8.
- Max-not-sum: a two-topic title scores as its best topic.
- Diversity at n = 3 and n = 4 stays within ⌈n/3⌉ per scholar, topic and scholar kind.
- **S10:** the best qualifying scholar is present at n ≥ 3, even when lecture scores are higher; absent at n = 1.
- Exclusions: saved, dismissed, signal targets. A session that fails `isListened()` is neither a signal nor excluded (S6).
- Determinism: 20 shuffles give identical output, and ties resolve by kind, then key.
- Unknown items do not throw. A topic-less item with a `scholarId` lifts that scholar.
- `contextSurah`: tafsir only. The rotation is `surah mod k` over key-sorted pools, so surah 2 and surah 3 pick different items when k ≥ 2. The fallback reason appears when nothing qualifies.
- `surahLastPage`: 1 → 1; 2 → 49; 114 → 604; a surah whose successor opens mid-page shares that page. Multi-page surahs need start and end. Page 604 marks 112–114.

### 10.2 Adapters, stores, loader

- `signals.test.ts` **(C8)**: a note with title `سرّي` and body `نص خاص` and `ref.label = 'سورة البقرة'` yields a signal labelled `'سورة البقرة'`. No reason string anywhere contains the title or body. A ref-less note yields nothing.
- `recommendationTopics.test.ts`: normalisation (diacritics, «شرح»); `تفسير آيات الأحكام` → `['tafsir','fiqh']`; fallback only without a keyword match; coverage over `data/content/scholars.ts`.
- `recommendationsStore.test.ts`: dismiss / restore / clear; the cap drops the oldest; `coerceDismissed` on garbage; `merge` keeps in-memory state; the source contains no `version:` / `migrate`.
- `recommendationInputs.test.ts`:
  - `loadCatalogue` single-flight: two calls share one run, and a third after `ready` is a no-op.
  - Gate (N1):
    - `shouldLoadCatalogue(0, undefined)` is `false`.
    - `shouldLoadCatalogue(1, undefined)` and `shouldLoadCatalogue(0, 2)` are `true`.
    - `loadCatalogue({ signalCount: 0 })` makes no fetch.
    - `loadCatalogue({ signalCount: 0, contextSurah: 1 })` fetches and reaches `ready`.
  - `startActivityWatch`: one `refreshActivity` call on `ready: false → true`, none on `true → true`, and an immediate call when already ready.
  - Concurrency: never more than 4 in flight.
  - A 401 on scholar #2 aborts the remaining batches and still builds a partial snapshot.
  - Uses `fetch()`, never `refresh()`.
  - Fetches page 1 of all four lecture stores without any screen having mounted.
  - `refreshActivity` awaits `getRepos()`; a `dbFailed` run gives `failed: true`; it re-runs on `ready` → true.
- Repos: native `listRecent` / `recentPageReads` (`pageReadsRepo.test.ts` pattern) and web-shim parity (`webShimAchievements.test.ts` pattern).
- `dismissRecommendation`: toast config, undo, announce.

### 10.3 Invariants (updated deliberately, never loosened)

- `homePresentation.test.ts:15-24` and `homeTablet.test.ts:11-18`: **only** the new `'recommended'` entry after `'books'` is added. Nothing else in `homeTablet.test.ts` changes.
- The five §6.5 states are covered by pure `sectionState` tests (`__tests__/recommendationSectionState.test.ts`, T7a). There are no render tests.
- Source scans:
  - `RecommendationRow` passes no `save=`.
  - The hint and empty lines are not `Pressable`.
  - The kill switch skips the `null` node in both Home loops.
- `contextualNotesInvariants.test.ts`: every existing assertion stays green with no edits. New assertions:
  - `src.indexOf('<SurahEndSuggestions') > src.indexOf('<SurahNotesFooter')` in `mushaf.tsx` (S3).
  - `SurahEndSuggestions.tsx` and `RecommendationRow.tsx` contain no `save=`, `useSaveGesture` or `saveGestureProps`.
  - The next-surah row uses `setParams`, never `router.push`, in `SurahEndSuggestions.tsx`.
- `rtlVisualContracts` / `rtlPhysicalContract`: `RECOMMENDATION_ROW_ORDER` is frozen, and the row uses `READING_ROW` with no literal `row-reverse`.
- `fontRegistry.test.ts`: no new families.

### 10.4 On-device QA (argent): iPhone 16 sim, Realme Note 50-class 360×800dp AVD, Pixel Tablet AVD, iPad Pro 13 sim

| # | Scenario | Expect |
|---|---|---|
| 1 | Fresh install, Home | «مقترح لك» with the hint row; sections below do not shift when activity resolves |
| 2 | Save `شرح رياض الصالحين`, return Home | 3-slot skeleton then ≤3 rows (phone) / ≤4 in 2 cols (tablet), first at physical right, reason visible, one scholar row |
| 3 | Tap × | Row leaves, toast + «تراجع»; undo restores; screen reader hears «تم إخفاء الاقتراح» |
| 4 | Dismiss every item | «لا توجد اقتراحات جديدة الآن», same section height |
| 5 | Long-press a Home recommendation row | Nothing happens (no save) |
| 6 | Listen ≥60s elsewhere, return to Home | List updates on focus |
| 7 | Read Al-Fatiha to the end | «السورة التالية: سورة البقرة» + one tafsir row; tafsir opens the scholar page, no audio |
| 8 | From the Mushaf index open a surah, tap next surah, read, press Back | Back returns to where the reader was opened from (here the index), not to the previous surah; the MiniPlayer stays hidden while any Mushaf screen is showing, including under the note editor and sheets (no dock flash on open or dismiss), and returns when a scholar or book screen opens over it or the Mushaf is left (C1) |
| 9 | Read An-Nas to the end | No next-surah row |
| 10 | Settings → «إعادة عرض الاقتراحات المخفية» | Dismissed items return |
| 11 | Progress reset | Listening/reading-driven rows go; save-driven rows stay |
| 12 | 360dp, largest font level | Reason stays visually secondary to the title; no clipping; × keeps 44pt; record any height growth |
| 13 | Tablet rotate / Split View | Grid reflows 2↔1 columns, right-anchored |
| 14 | Airplane mode, cold start with one save | Rows from cached catalogue, or skeleton → partial results; no error UI |

## 11. Risks

- **R1. Fan-out.** At most 22 cache-first requests, once per session, after interactions, through a pool of 4. The mock adds `mockDelay: 300` each (`services/contentService.ts:240`). The real fix is §7.5.
- **R2. Keyword coverage.** Unknown backend titles degrade to scholar affinity, and the coverage test guards only mock data.
- **R3. "Read" is approximate** (§5.3). It has a low weight and a soft reason.
- **R4. Same title from several scholars** (`شرح رياض الصالحين` × s4/s5/s9). Handled by the ⌈n/3⌉ per-topic cap.
- **R5. Home is now state-dependent.** Screenshot baselines must state their seed (fresh install = hint row).
- **R6. Id churn at backend switch-over** (§7.2).

## 12. Open questions

- Q1. Foundation review of the hint copy (§6.5).
- Q2. A user-facing toggle to turn the section off. This would go through `settingsStore`'s `schemaVersion` gate (`settingsStore.ts:181-184`) as its own change.
- Q3. Backend agreement on §7.5.
- Q4. Ownership of the topic keyword list once the real catalogue lands. Proposal: it lives in code, and the coverage test is the review gate.

## 13. Implementation tasks (dependency order)

Every task follows CLAUDE.md §4: failing test → minimal code → green → `npx tsc --noEmit --pretty false` → full `npx jest` → commit, with no co-author trailer.

| # | Task (est.) | Files | Tests | Commit |
|---|---|---|---|---|
| T1 | Topic map and tuning constants (1h) | `constants/recommendationTopics.ts`, `constants/recommendations.ts` (weights, half-life, caps, `MIN_SCORE`, limits, slot height, `RECOMMENDATIONS_ENABLED`, `RECOMMENDATION_COPY`) | `__tests__/recommendationTopics.test.ts` | `feat(recs): add topic map and recommendation constants` |
| T2 | Pure engine (2h) | `services/recommendations/types.ts`, `services/recommendations/recommend.ts` (`indexCatalogue`, `surahLastPage`, `surahsRead`, `recommend`) | `__tests__/recommendations.test.ts` (§10.1) | `feat(recs): add pure on-device recommendation engine` |
| T3 | Read-only repo methods (1h) | `db/types.ts`, `db/repositories/lectureSessions.ts`, `db/repositories/pageReads.ts`, `db/web-shim.ts` | repo + web-shim parity tests | `feat(db): add listRecent and recentPageReads queries` |
| T4 | Signal adapters (1h) | `services/recommendations/signals.ts` (uses `isListened`, `NoteRef.label`) | `__tests__/recommendationSignals.test.ts` incl. C8 | `feat(recs): map saved items, notes and activity to signals` |
| T5 | Dismissal store, dismiss service, Settings reset (1.5h) | `store/recommendationsStore.ts`, `services/recommendations/dismiss.ts`, `app/(tabs)/more/settings.tsx` | `__tests__/recommendationsStore.test.ts`, dismiss toast/undo/announce test | `feat(recs): persist dismissed recommendations with undo and reset` |
| T6 | Inputs store, guarded loader, ready trigger (2h) | `store/recommendationInputsStore.ts` (incl. `startActivityWatch`), `services/recommendations/catalogue.ts` (`shouldLoadCatalogue`), `app/_layout.tsx` (one `startActivityWatch()` call), `app/(tabs)/more/settings-progress.tsx` (`refreshActivity` after reset) | `__tests__/recommendationInputs.test.ts` (§10.2, incl. N1 gate and ready trigger) | `feat(recs): load catalogue and activity with fetch guardrails` |
| T7a | Hook, section state, routing (1.5h) | `services/recommendations/useRecommendations.ts`, `services/recommendations/sectionState.ts`, `services/recommendations/target.ts` | `__tests__/recommendationSectionState.test.ts`, `__tests__/recommendationTarget.test.ts` (pure) | `feat(recs): add the recommendations hook, section state and routing` |
| T7b | Row and section components (1.5h) | `constants/rtlContracts.ts`, `components/khazain/recommendations/{RecommendationRow,RecommendedSection,index}.tsx` | `rtlVisualContracts` addition; no-`save` / non-Pressable source scans | `feat(recs): add the recommendation row and section components` |
| T8 | Home wiring (1.5h) | `constants/homePresentation.ts`, `app/(tabs)/index.tsx` (section entry, chained fetch → `runAfterInteractions`, null-node skip, focus refresh) | `homePresentation.test.ts` + `homeTablet.test.ts` (new entry only); kill-switch test | `feat(home): add the recommended-for-you section` |
| T9 | Mushaf end block (1.5h) | `components/khazain/recommendations/SurahEndSuggestions.tsx`, `app/(tabs)/sections/mushaf.tsx` (render after `<SurahNotesFooter`, `refreshActivity` on mount) | `contextualNotesInvariants.test.ts` additions (§10.3) | `feat(mushaf): suggest the next surah and a tafsir series at surah end` |
| T10 | Docs (30m) | `CLAUDE.md` (State, File layout, Long-press means: recommendation rows take no gesture), `docs/plans/2026-05-10-backend-integration-activation-design.md` (§7.5 text as a proposed section) | n/a (CLAUDE.md long-press test stays green) | `docs: record recommendation stores and bulk lectures endpoint proposal` |

After T9, run on-device QA §10.4 on all four devices and write the results to `docs/plans/2026-10-22-recommendations-qa.md`.
