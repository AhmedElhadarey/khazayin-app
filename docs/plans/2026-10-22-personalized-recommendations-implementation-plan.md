# Personalized content recommendations: implementation plan

**Design:** `docs/plans/2026-10-22-personalized-recommendations-design.md` (v3).
**Branch:** `feat/personalized-recommendations-2026-10-22`, cut from `feat/tablet-layout-2026-10-22`. Never `main`.
**Ticket:** Trello qJseYPyw "Personalized Content Recommendations"

**Every task works the same way.**

- **TDD.** Write the failing test first and run it. It must fail for the stated reason, not for a typo or import path. Then implement the minimum and run it until it passes.
- **Checks after every task, all green:**
  - `npx jest` reports no failures. The suite count only goes up.
  - `npx tsc --noEmit --pretty false` prints nothing and exits 0.
  - `npx eslint <touched files>` prints nothing.
- **No new dependencies.** `package.json` and the lockfile do not change. Everything here uses zustand 5, AsyncStorage, react-native and expo-router, which are already installed.
- **Staging.** Use `git add <explicit paths>`, never `git add -A` or `git add .`. Never stage `.argent/`, `assets/figma/KHAZAYIN.fig`, `docs/22-10-audit/` or `metro.config.js`. Check `git status --short` before every commit.
- **Commit.** One commit per task, in conventional format, with no `Co-Authored-By` and no AI attribution. Never `--no-verify`.
- **Style.** Match the surrounding code style and comment density. Header comments say *why*, as in `store/notesStore.ts` and `services/savedToggle.ts`. Arabic copy lives in one frozen constant per module. Every Text style spreads `RTL_TEXT`. No `I18nManager` reads, and no literal `row-reverse` outside `constants/layout.ts`.
- **Phone and tablet invariants.** Every existing screen renders as it does on the base branch, except for the new Home section and the new Mushaf end block.

Order: T1 → T2 → T3 → T4 → T5 → T6 → T7a → T7b → T8 → T9 → T10. T3 depends only on `db/` and may run any time after T1. T5 needs only T1.

---

## T1. Topic map and recommendation constants

**Files:**
- `constants/recommendationTopics.ts` (new); also exports frozen `SCHOLAR_ONLY_SERIES`
- `constants/recommendations.ts` (new)
- `__tests__/recommendationTopics.test.ts` (new)

**Build:**
- `RECOMMENDATION_TOPICS` (design §5.1), `TopicId`, `CATEGORY_FALLBACK_TOPIC = { prophet: 'seerah' }`, and `topicsForTitle(title, category?)`.
  - Both sides go through `normalize()` from `services/search/normalize.ts:71`.
  - Keywords match as substrings. Results are de-duplicated, in map key order.
  - The category fallback applies only when no keyword matched.
- `constants/recommendations.ts`, all frozen:
  - `WEIGHTS = { saved: 3, note: 2, completed: 2.5, listened: 1.5, read: 1 }`
  - `HALF_LIFE_MS = 21 * DAY_MS`, `MAX_SIGNAL_AGE_MS = 120 * DAY_MS`
  - `TOPIC_CAP = 8`, `SCHOLAR_CAP = 6`, `MIN_SCORE = 0.3`
  - `HOME_LIMIT_PHONE = 3`, `HOME_LIMIT_TABLET = 4`, `DISMISS_CAP = 300`, `LISTEN_LIMIT = 50`, `PAGE_READ_LIMIT = 604`
  - `RECOMMENDATION_SLOT_HEIGHT`, derived from `TYPOGRAPHY` line heights (caption + 2 × bodyCompact + caption + 24 padding), not a literal
  - `RECOMMENDATIONS_ENABLED = true`
  - `RECOMMENDATION_COPY`, holding every Arabic string in design §4.7, §6.5 and §7.3

**Failing test first:**

```ts
import { topicsForTitle, RECOMMENDATION_TOPICS, SCHOLAR_ONLY_SERIES } from '@/constants/recommendationTopics';
import * as C from '@/constants/recommendations';
import { normalize } from '@/services/search/normalize';
import { LECTURES_BY_SCHOLAR } from '@/data/content/scholars';

describe('topicsForTitle', () => {
  it('matches full phrases through normalize()', () => {
    expect(topicsForTitle('شرح رياض الصالحين')).toEqual(['riyad']);
    expect(topicsForTitle('شَرْحُ رِيَاضِ الصَّالِحِينَ')).toEqual(['riyad']);
    expect(topicsForTitle('تفسير آيات الأحكام')).toEqual(['tafsir', 'fiqh']);
    expect(topicsForTitle('تفسير ايات الاحكام')).toEqual(['tafsir', 'fiqh']);
  });
  it('keeps the two زاد titles apart', () => {
    expect(topicsForTitle('شرح زاد المستقنع')).toEqual(['fiqh']);
    expect(topicsForTitle('مختصر زاد المعاد')).toEqual(['seerah']);
  });
  it('uses the category only when no keyword matched', () => {
    expect(topicsForTitle('غزوة بدر', 'prophet')).toEqual(['seerah']);
    expect(topicsForTitle('تفسير القرآن الكريم', 'prophet')).toEqual(['tafsir']);
    expect(topicsForTitle('درس عام', 'radio')).toEqual([]);
  });
  it('maps every archive-backed scholar lecture to a topic, bar the scholar-only series', () => {
    const unmapped = Object.values(LECTURES_BY_SCHOLAR).flat()
      .filter((l) => l.archiveId && !SCHOLAR_ONLY_SERIES.has(l.archiveId)
        && topicsForTitle(l.title, l.category).length === 0)
      .map((l) => l.title);
    expect(unmapped).toEqual([]);
  });
  it('lists only real scholar series that map to no topic', () => {
    expect([...SCHOLAR_ONLY_SERIES].sort()).toEqual(
      ['0001_20230715', '012_20230905', '0006_20231225', '169_20210628', '361_20250211'].sort(),
    );
    const all = Object.values(LECTURES_BY_SCHOLAR).flat();
    for (const id of SCHOLAR_ONLY_SERIES) {
      const lecture = all.find((l) => l.archiveId === id);
      expect(lecture).toBeDefined();
      expect(lecture?.scholarId).toBeTruthy();
      expect(topicsForTitle(lecture!.title, lecture!.category)).toEqual([]);
    }
  });
  it('has no keyword that normalises to empty', () => {
    for (const t of Object.values(RECOMMENDATION_TOPICS)) {
      for (const k of t.keywords) expect(normalize(k)).not.toBe('');
    }
  });
  it('deep-freezes the topic map', () => {
    expect(Object.isFrozen(RECOMMENDATION_TOPICS)).toBe(true);
    for (const t of Object.values(RECOMMENDATION_TOPICS)) {
      expect(Object.isFrozen(t)).toBe(true);
      expect(Object.isFrozen(t.keywords)).toBe(true);
    }
  });
  it('never uses a bare زاد keyword', () => {
    for (const t of Object.values(RECOMMENDATION_TOPICS)) expect(t.keywords).not.toContain('زاد');
  });
});

describe('recommendation constants', () => {
  it('are frozen and on', () => {
    expect(Object.isFrozen(C.WEIGHTS)).toBe(true);
    expect(Object.isFrozen(C.RECOMMENDATION_COPY)).toBe(true);
    expect(C.RECOMMENDATIONS_ENABLED).toBe(true);
    expect(C.PAGE_READ_LIMIT).toBe(604);
  });
  it('carries the exact section copy', () => {
    expect(C.RECOMMENDATION_COPY.sectionTitle).toBe('مقترح لك');
    expect(C.RECOMMENDATION_COPY.hint).toBe('احفظ درسًا أو استمع إليه لتظهر هنا اقتراحات تناسبك');
    expect(C.RECOMMENDATION_COPY.empty).toBe('لا توجد اقتراحات جديدة الآن');
  });
});
```

**Run:**
- `npx jest __tests__/recommendationTopics.test.ts`. Before the build: FAIL, `Cannot find module '@/constants/recommendationTopics'`. After: PASS, 9 tests.
- If the coverage test lists titles, extend a keyword phrase. Never add a bare word.
- Then run the three global checks.

**Commit:** `feat(recs): add topic map and recommendation constants`

## T2. Pure engine

**Files:**
- `services/recommendations/types.ts` (new): `Signal`, `SignalKind`, `CatalogueSnapshot`, `CatalogueIndex`, `Recommendation`
- `services/recommendations/recommend.ts` (new): `indexCatalogue`, `surahLastPage`, `surahsRead`, `recommend`
- `__tests__/recommendations.test.ts` (new) and `__tests__/fixtures/recommendationCatalogue.ts` (new; built from `data/content/*` so ids are real)

**Build (design §4, §5.3):**
- `recommend(signals, index, nowMs, dismissed, limit, contextSurah?)`. The file has no imports from React, zustand, `db/` or `contentService`.
- Scoring uses decay, caps and **max** over topics.
- Exclusions: saved items, dismissed keys, and signal targets.
- Diversity: at most ⌈n/3⌉ per scholar, per primary topic, and of kind `scholar`. For n ≥ 3, one slot is reserved for the best qualifying scholar.
- Order: score rounded to 1e-6 desc, then kind, then key. Pools are sorted by key before the `surah mod k` pick.
- `surahLastPage(n)` uses only `SURAH_START_PAGES` and `QURAN_PAGE_STARTS`.

**Failing test first (selected; write all of design §10.1):**

```ts
import { indexCatalogue, recommend, surahLastPage, surahsRead } from '@/services/recommendations/recommend';
import { catalogue } from './fixtures/recommendationCatalogue';
import type { Signal } from '@/services/recommendations/types';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 22);
const index = indexCatalogue(catalogue);
const saved = (id: string, label: string, ageDays = 0): Signal =>
  ({ kind: 'saved', target: { type: 'lecture', id }, atMs: NOW - ageDays * DAY, label });
const none = new Set<string>();

it('returns nothing without signals', () => {
  expect(recommend([], index, NOW, none, 3)).toEqual([]);
});

it('a saved Riyad series surfaces other Riyad series and reserves a scholar slot', () => {
  const out = recommend([saved('sl5-2', 'شرح رياض الصالحين')], index, NOW, none, 3);
  expect(out[0].reason).toBe('لأنك حفظت «شرح رياض الصالحين»');
  expect(out.map((r) => r.key)).not.toContain('lecture:011_20210710'); // the signal target itself
  const scholar = out.find((r) => r.kind === 'scholar');
  expect(scholar?.reason).toBe('له دروس في رياض الصالحين');
  expect(scholar?.entityId).not.toBe('s5');
});

it('reserves no scholar slot at n = 1', () => {
  expect(recommend([saved('sl5-2', 'شرح رياض الصالحين')], index, NOW, none, 1)[0].kind).not.toBe('scholar');
});

it('halves at 21 days and drops at 120', () => {
  const s0 = recommend([saved('sl5-2', 'x', 0)], index, NOW, none, 3)[0].score;
  const s21 = recommend([saved('sl5-2', 'x', 21)], index, NOW, none, 3)[0].score;
  expect(s21).toBeCloseTo(s0 / 2, 6);
  expect(recommend([saved('sl5-2', 'x', 121)], index, NOW, none, 3)).toEqual([]);
});

it('is order-independent', () => {
  const sigs = [saved('sl5-2', 'a'), saved('sl4-4', 'b', 3), saved('sl6-4', 'c', 9)];
  const base = recommend(sigs, index, NOW, none, 4);
  for (let i = 0; i < 20; i++) {
    const shuffled = [...sigs].sort(() => Math.random() - 0.5);
    expect(recommend(shuffled, indexCatalogue(shuffleCatalogue(catalogue)), NOW, none, 4)).toEqual(base);
  }
});

it('keeps at most ceil(n/3) per scholar', () => {
  const out = recommend([saved('sl5-2', 'a'), saved('sl5-3', 'b')], index, NOW, none, 4);
  const per = out.reduce<Record<string, number>>((m, r) => ((m[r.scholarId ?? r.entityId] = (m[r.scholarId ?? r.entityId] ?? 0) + 1), m), {});
  expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2);
});

it('drops dismissed keys', () => {
  const first = recommend([saved('sl5-2', 'a')], index, NOW, none, 3)[0];
  expect(recommend([saved('sl5-2', 'a')], index, NOW, new Set([first.key]), 3).map((r) => r.key)).not.toContain(first.key);
});

it('rotates the surah-context tafsir pick by surah mod k over key-sorted pools', () => {
  const a = recommend([], index, NOW, none, 1, 2)[0];
  const b = recommend([], index, NOW, none, 1, 3)[0];
  expect(a.reason).toBe('للاستزادة في تفسير ما قرأت');
  expect(a.key).not.toBe(b.key);
  expect(recommend([], index, NOW, none, 1, 2)).toEqual([a]);
});

it('derives a surah last page from the static tables', () => {
  expect(surahLastPage(1)).toBe(1);
  expect(surahLastPage(2)).toBe(49);
  expect(surahLastPage(114)).toBe(604);
  expect(surahsRead([{ page: 604, atMs: NOW }]).map((s) => s.number)).toEqual([112, 113, 114]);
  expect(surahsRead([{ page: 49, atMs: NOW }])).toEqual([]); // al-Baqarah also needs page 2
});
```

`shuffleCatalogue` is a local helper that reverses every array in the snapshot. Add the remaining §10.1 cases: Q5 `لأنك تتابع …`, caps, max-not-sum, unknown items, and the S6 non-listened session.

**Run:**
- `npx jest __tests__/recommendations.test.ts`. Before: FAIL, `Cannot find module '@/services/recommendations/recommend'`. After: PASS.
- `grep -nE "from '(react|zustand|@/db|@/services/contentService)" services/recommendations/recommend.ts` prints nothing.
- Then the global checks.

**Commit:** `feat(recs): add pure on-device recommendation engine`

## T3. Read-only repo methods

**Files:**
- `db/types.ts`: `listRecent(limit)` on `LectureSessionsRepository` (`:90-105`), and `recentPageReads(sinceMs, limit)` on `PageReadsRepository` (`:58-89`)
- `db/repositories/lectureSessions.ts`, `db/repositories/pageReads.ts`
- `db/web-shim.ts`
- `__tests__/recommendationRepos.test.ts` (new)

**Build:** the SQL from design §7.8, with no schema or migration change. The web shim mirrors it: sort `lectures` by `lastListenedAt` desc and slice; group `pageReads` by `pageNumber`, take the max `recordedAt`, filter `>= sinceMs`, sort desc, and slice.

**Failing test first** (web shim behaviour, using the `pageReadsRepo.test.ts` mocks; native SQL through a fake db):

```ts
it('web shim: recentPageReads groups by page, keeps the latest time, filters and limits', async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 20, 10) });
  const { pageReads } = createWebRepos();
  await pageReads.recordPageRead(5);
  jest.setSystemTime(new Date(2026, 9, 21, 10));
  await pageReads.recordPageRead(5);
  await pageReads.recordPageRead(7);
  const out = await pageReads.recentPageReads(0, 604);
  expect(out).toEqual([
    { page: 5, atMs: new Date(2026, 9, 21, 10).getTime() },
    { page: 7, atMs: new Date(2026, 9, 21, 10).getTime() },
  ]);
  expect(await pageReads.recentPageReads(new Date(2026, 9, 22).getTime(), 604)).toEqual([]);
  expect(await pageReads.recentPageReads(0, 1)).toHaveLength(1);
});

it('web shim: listRecent orders by lastListenedAt desc', async () => {
  const { lectureSessions } = createWebRepos();
  await lectureSessions.upsertSession({ lectureId: 'A/1.mp3', title: 'a', author: '', durationSec: 600, positionSec: 10, forwardListenedDelta: 10, nowMs: 1 });
  await lectureSessions.upsertSession({ lectureId: 'B/1.mp3', title: 'b', author: '', durationSec: 600, positionSec: 10, forwardListenedDelta: 10, nowMs: 2 });
  expect((await lectureSessions.listRecent(50)).map((s) => s.lectureId)).toEqual(['B/1.mp3', 'A/1.mp3']);
});

it('native: issues the documented read-only SQL', async () => {
  const getAllAsync = jest.fn(async () => []);
  const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;
  await createPageReadsRepository(db).recentPageReads(123, 604);
  expect(getAllAsync.mock.calls[0][0]).toMatch(/GROUP BY page_number ORDER BY at DESC, page_number ASC LIMIT \?/);
  expect(getAllAsync.mock.calls[0].slice(1)).toEqual([123, 604]);
  await createLectureSessionsRepository(db).listRecent(50);
  expect(getAllAsync.mock.calls[1][0]).toMatch(/ORDER BY last_listened_at DESC, lecture_id ASC LIMIT \?/);
});
```

Order ties by page number asc, so the expected array is deterministic.

**Run:** `npx jest __tests__/recommendationRepos.test.ts`. Before: FAIL, `pageReads.recentPageReads is not a function`. After: PASS. `npx jest __tests__/pageReadsRepo.test.ts __tests__/webShimAchievements.test.ts` still pass. Then the global checks.

**Commit:** `feat(db): add listRecent and recentPageReads queries`

## T4. Signal adapters

**Files:**
- `services/recommendations/signals.ts` (new): `toSignals(saved, notes, activity, index)`
- `__tests__/recommendationSignals.test.ts` (new)

**Build (design §4.2):**
- Saved lecture, scholar, book and surah items map to `saved`. Dawah is ignored.
- Notes **with a `ref`** map to `note`, and the label is `ref.label` only.
- Sessions map through `isListened()` (`db/helpers/lectureCompletion.ts:26`) to `completed` or `listened`.
- Page reads go through `surahsRead` to `read`.
- Dedupe per `(kind, target)`, keeping the newest. Apply the input caps from design §4.3.

**Failing test first:**

```ts
import { makeAyahRef } from '@/services/noteRefs';

it('labels a note signal from NoteRef.label only (C8)', () => {
  const note = { id: 'n1', title: 'سرّي', body: 'نص خاص', createdAt: 1, updatedAt: 5, ref: makeAyahRef('002') };
  const [s] = toSignals([], [note], null, index);
  expect(s).toMatchObject({ kind: 'note', atMs: 5, label: note.ref.label });
  const all = JSON.stringify(recommend(toSignals([], [note], null, index), index, NOW, new Set(), 3, 2));
  expect(all).not.toContain('سرّي');
  expect(all).not.toContain('نص خاص');
});

it('ignores ref-less notes and saved dawah', () => {
  expect(toSignals([dawahItem], [{ id: 'n', title: 't', body: 'b', createdAt: 1, updatedAt: 1 }], null, index)).toEqual([]);
});

it('uses isListened for sessions (S6)', () => {
  const s = (sec: number, completed = false) => ({ lectureId: '485_20210705/01.mp3', title: 'تفسير القرآن الكريم', author: '', durationSec: 900, positionSec: sec, forwardListenedSec: sec, completed, lastListenedAt: 9 });
  expect(toSignals([], [], { sessions: [s(30)], pageReads: [], failed: false }, index)).toEqual([]);
  expect(toSignals([], [], { sessions: [s(60)], pageReads: [], failed: false }, index)[0].kind).toBe('listened');
  expect(toSignals([], [], { sessions: [s(900, true)], pageReads: [], failed: false }, index)[0].kind).toBe('completed');
});

it('keeps the newest per (kind, target)', () => { /* two saves of one id → one signal at the later savedAt */ });
```

**Run:** `npx jest __tests__/recommendationSignals.test.ts`. Before: FAIL, missing module. After: PASS. Then the global checks.

**Commit:** `feat(recs): map saved items, notes and activity to signals`

## T5. Dismissal store, dismiss service, Settings reset

**Files:**
- `store/recommendationsStore.ts` (new)
- `services/recommendations/dismiss.ts` (new)
- `app/(tabs)/more/settings.tsx`: one `ListRowCard` in «البيانات» (`:229-243`), rendered only when `RECOMMENDATIONS_ENABLED`
- `__tests__/recommendationsStore.test.ts` (new)
- `__tests__/recommendationDismiss.test.ts` (new)

**Build (design §7.1–7.3):**
- `dismissed: Record<string, number>`, with `dismiss`, `restore` and `clearDismissed`. The cap drops the oldest `dismissedAt`.
- Persist key `@khazain/recommendations`, through `createJSONStorage(() => AsyncStorage)`. **No `version`/`migrate`.**
- `merge: (p, c) => isRecord(p) ? { ...c, dismissed: coerceDismissed(p) } : c`, copying `store/notesStore.ts:85-100`.
- `dismissRecommendation(rec, { announce })` shows the toast `{ message, durationMs: 5000, action: { label: 'تراجع', onPress: restore } }`. It announces only when `announce` is true, using the queued-announce fallback copied from `savedToggle.ts:74-81`.

**Failing tests first:**

```ts
// recommendationsStore.test.ts (AsyncStorage mocked as in notesStore.test.ts)
it('dismisses, restores and clears', () => {
  const s = useRecommendationsStore.getState();
  s.dismiss('lecture:A'); expect(useRecommendationsStore.getState().dismissed).toHaveProperty('lecture:A');
  s.restore('lecture:A'); expect(useRecommendationsStore.getState().dismissed).toEqual({});
  s.dismiss('book:b1'); s.clearDismissed(); expect(useRecommendationsStore.getState().dismissed).toEqual({});
});
it('drops the oldest at the 300 cap', () => {
  for (let i = 0; i < 301; i++) { now = i; useRecommendationsStore.getState().dismiss(`k${i}`); }
  const d = useRecommendationsStore.getState().dismissed;
  expect(Object.keys(d)).toHaveLength(300);
  expect(d).not.toHaveProperty('k0');
});
it('coerces garbage without throwing', () => {
  expect(coerceDismissed(null)).toEqual({});
  expect(coerceDismissed({ dismissed: [1] })).toEqual({});
  expect(coerceDismissed({ dismissed: { a: 1, '': 2, b: NaN, c: 'x' } })).toEqual({ a: 1 });
});
it('keeps in-memory dismissals when nothing is persisted', async () => {
  useRecommendationsStore.getState().dismiss('k');
  await useRecommendationsStore.persist.rehydrate();
  expect(useRecommendationsStore.getState().dismissed).toHaveProperty('k');
});
it('persists under @khazain/recommendations without version or migrate', () => {
  const src = read('store/recommendationsStore.ts');
  expect(src).toContain("name: '@khazain/recommendations'");
  expect(src).not.toMatch(/\bversion:|\bmigrate:/);
});

// recommendationDismiss.test.ts (mocks as in savedToggle.test.ts)
it('dismisses with a 5s undo toast that restores', () => {
  dismissRecommendation(rec, { announce: false });
  const t = useToastStore.getState().current!;
  expect(t).toMatchObject({ message: 'تم إخفاء الاقتراح', durationMs: 5000, action: { label: 'تراجع' } });
  t.action!.onPress();
  expect(useRecommendationsStore.getState().dismissed).toEqual({});
});
it('announces on request', () => {
  const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  dismissRecommendation(rec, { announce: true });
  expect(spy).toHaveBeenCalledWith('تم إخفاء الاقتراح');
});
it('Settings carries the reset row', () => {
  expect(read('app/(tabs)/more/settings.tsx')).toContain('إعادة عرض الاقتراحات المخفية');
});
```

**Run:** `npx jest __tests__/recommendationsStore.test.ts __tests__/recommendationDismiss.test.ts`. Before: FAIL, missing modules. After: PASS. `npx jest __tests__/cacheFacade.test.ts` still passes. Then the global checks.

**Commit:** `feat(recs): persist dismissed recommendations with undo and reset`

## T6. Inputs store, guarded loader, ready trigger

**Files:**
- `store/recommendationInputsStore.ts` (new): `activity`, `catalogue`, `catalogueStatus`, `nowMs`, `refreshActivity()`, `loadCatalogue({ signalCount, contextSurah })`, `startActivityWatch()`
- `services/recommendations/catalogue.ts` (new): `shouldLoadCatalogue(signalCount, contextSurah)`, `toCatalogueSnapshot(...)` (pure), and `runPool(tasks, 4, isFatal)`
- `app/_layout.tsx`: call `startActivityWatch()` once, inside the hydration effect next to `useProgressStore.getState().hydrate()` (`:310-319`), behind `RECOMMENDATIONS_ENABLED`
- `app/(tabs)/more/settings-progress.tsx`: `refreshActivity()` beside `refreshAll()` (`:74`)
- `__tests__/recommendationInputs.test.ts` (new)

**Build (design §7.4):**
- **`refreshActivity`:** `await getRepos()`, then `lectureRepo.listRecent(LISTEN_LIMIT)` and `progressRepo.recentPageReads(now − MAX_SIGNAL_AGE_MS, PAGE_READ_LIMIT)`. It sets `nowMs = Date.now()`. On a throw, or when `dbFailed`, it sets `{ sessions: [], pageReads: [], failed: true }`.
- **`loadCatalogue`:**
  - Gate: `shouldLoadCatalogue(signalCount, contextSurah)`, i.e. `signalCount > 0 || contextSurah != null` (N1).
  - Single-flight through a module-level promise, and a no-op after `ready` or `aborted`.
  - Fetch tasks: scholars list, then per-scholar lecture stores, books, surahs, and the four paginated stores' `fetch()`. Always `fetch()`, never `refresh()`.
  - Pool of 4 with `Promise.allSettled`. After each batch, if any store's `error` satisfies `isApiError(e) && (e.code === 'auth' || e.code === 'forbidden')`, the remaining batches are skipped and the status becomes `aborted`.
  - The snapshot is built from whatever loaded.
- **`startActivityWatch`:** `useProgressStore.subscribe((s, prev) => { if (s.ready && !prev.ready) refreshActivity(); })`. If `ready` is already true, it calls `refreshActivity()` at once. It is idempotent and returns the unsubscribe function.

**Failing test first** (mock `@/db` with `getRepos`, `lectureRepo`, `progressRepo`; mock `@/services/contentService` with counting fakes):

```ts
it('gates the catalogue on signals or a surah context (N1)', async () => {
  expect(shouldLoadCatalogue(0, undefined)).toBe(false);
  expect(shouldLoadCatalogue(1, undefined)).toBe(true);
  expect(shouldLoadCatalogue(0, 2)).toBe(true);
  await useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 0 });
  expect(fetchCount()).toBe(0);
  expect(useRecommendationInputsStore.getState().catalogueStatus).toBe('idle');
  await useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 0, contextSurah: 1 });
  expect(useRecommendationInputsStore.getState().catalogueStatus).toBe('ready');
});

it('is single-flight and then a no-op', async () => {
  const s = useRecommendationInputsStore.getState();
  await Promise.all([s.loadCatalogue({ signalCount: 1 }), s.loadCatalogue({ signalCount: 1, contextSurah: 2 })]);
  const n = fetchCount();
  await s.loadCatalogue({ signalCount: 1 });
  expect(fetchCount()).toBe(n);
});

it('fetches page 1 of all four lecture stores without any screen mounted', async () => {
  await useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
  for (const c of ['prophet', 'book', 'queen', 'radio']) expect(pageByCategory).toHaveBeenCalledWith(c, null, expect.anything());
});

it('never runs more than 4 requests at once', async () => {
  await useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
  expect(maxInFlight()).toBeLessThanOrEqual(4);
});

it('stops on the first 401 and keeps a partial snapshot', async () => {
  failScholarLectures('s1', makeApiError('auth', 401));
  await useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
  const st = useRecommendationInputsStore.getState();
  expect(st.catalogueStatus).toBe('aborted');
  expect(st.catalogue?.scholars.length).toBeGreaterThan(0);
  expect(listLecturesCalls()).toBeLessThan(SCHOLARS.length);
});

it('awaits getRepos before reading activity, and marks a failed DB', async () => {
  await useRecommendationInputsStore.getState().refreshActivity();
  expect(getRepos.mock.invocationCallOrder[0]).toBeLessThan(listRecent.mock.invocationCallOrder[0]);
  listRecent.mockRejectedValueOnce(new Error('db'));
  await useRecommendationInputsStore.getState().refreshActivity();
  expect(useRecommendationInputsStore.getState().activity?.failed).toBe(true);
});

it('re-runs refreshActivity when progressStore.ready turns true', () => {
  const spy = jest.spyOn(useRecommendationInputsStore.getState(), 'refreshActivity');
  useProgressStore.setState({ ready: false });
  const stop = startActivityWatch();
  useProgressStore.setState({ ready: true });
  useProgressStore.setState({ ready: true });
  expect(spy).toHaveBeenCalledTimes(1);
  stop();
});

it('never calls refresh()', () => {
  expect(read('store/recommendationInputsStore.ts')).not.toMatch(/\.refresh\(/);
});
```

**Run:** `npx jest __tests__/recommendationInputs.test.ts`. Before: FAIL, missing module. After: PASS. `npx jest __tests__/progressStore-dbFailed.test.ts __tests__/reset.test.ts` still pass. Then the global checks.

**Commit:** `feat(recs): load catalogue and activity with fetch guardrails`

## T7a. Hook, section state, routing

**Files:**
- `services/recommendations/sectionState.ts` (new)
- `services/recommendations/target.ts` (new)
- `services/recommendations/useRecommendations.ts` (new)
- `__tests__/recommendationSectionState.test.ts` (new)
- `__tests__/recommendationTarget.test.ts` (new)

**Build:**
- **`sectionState`:** the five rules in design §6.5.
- **`recommendationTarget(rec, surface)`:**
  - On Home it delegates to `searchTargetFor` (`services/search/searchTarget.ts:21`).
  - On the Mushaf it sends a lecture to `/sections/scholar/{scholarId}` and a book to `bookDetailHref`.
  - A lecture without a `scholarId` gets `null` on the Mushaf, and the row is not shown.
- **`useRecommendations(limit, contextSurah?)`:** one selector per field, then `useMemo` for `indexCatalogue`, `toSignals` and `recommend`, with the primitive deps from design §7.6. It returns `{ items, hasSignals, activityResolved, catalogueStatus }`. It is not unit-rendered; its logic is the pure functions above.

**Failing tests first:**

```ts
const base = { hasSignals: false, activityResolved: false, catalogueStatus: 'idle' as const, items: [] };
it.each([
  [base, 'skeletonOne'],
  [{ ...base, activityResolved: true }, 'hint'],
  [{ ...base, hasSignals: true, catalogueStatus: 'loading' as const }, 'skeletonFull'],
  [{ ...base, hasSignals: true, catalogueStatus: 'idle' as const }, 'skeletonFull'],
  [{ ...base, hasSignals: true, catalogueStatus: 'ready' as const, items: [rec] }, 'items'],
  [{ ...base, hasSignals: true, catalogueStatus: 'ready' as const }, 'empty'],
  [{ ...base, hasSignals: true, catalogueStatus: 'aborted' as const }, 'empty'],
])('sectionState(%o) → %s', (input, expected) => expect(sectionState(input)).toBe(expected));

it('items win even before activity resolves', () =>
  expect(sectionState({ ...base, hasSignals: true, items: [rec] })).toBe('items'));

// recommendationTarget.test.ts
it('Home plays a lecture and routes the rest', () => {
  expect(recommendationTarget(lectureRec, 'home')).toEqual({ kind: 'play', lecture: lectureRec.lecture });
  expect(recommendationTarget(scholarRec, 'home')).toEqual({ kind: 'route', href: '/sections/scholar/s9' });
  expect(recommendationTarget(bookRec, 'home')).toEqual({ kind: 'route', href: bookDetailHref('bk2') });
});
it('the Mushaf never plays', () => {
  expect(recommendationTarget(lectureRec, 'mushaf')).toEqual({ kind: 'route', href: '/sections/scholar/s5' });
  expect(recommendationTarget({ ...lectureRec, scholarId: undefined }, 'mushaf')).toBeNull();
});
it('the hook memoises on primitives, not an options object', () => {
  const src = read('services/recommendations/useRecommendations.ts');
  expect(src).toMatch(/useMemo\(\(\) => indexCatalogue\(catalogue\), \[catalogue\]\)/);
  expect(src).toMatch(/\[signals, index, nowMs, dismissed, limit, contextSurah\]/);
  expect(src).not.toMatch(/useShallow/);
});
```

**Run:** `npx jest __tests__/recommendationSectionState.test.ts __tests__/recommendationTarget.test.ts`. Before: FAIL, missing modules. After: PASS. Then the global checks.

**Commit:** `feat(recs): add the recommendations hook, section state and routing`

## T7b. Row and section components

**Files:**
- `constants/rtlContracts.ts`: `RECOMMENDATION_ROW_ORDER = Object.freeze(['dismiss', 'card'] as const)` with a left → right comment, in the style of `LECTURE_CARD_ORDER` (`:23`)
- `components/khazain/recommendations/RecommendationRow.tsx` (new)
- `components/khazain/recommendations/RecommendedSection.tsx` (new)
- `components/khazain/recommendations/index.ts` (new)
- `__tests__/recommendationComponents.test.ts` (new); the existing `__tests__/rtlVisualContracts.test.ts` gets one pin

**Build (design §6.2, §6.3, §6.5, §8):**
- **`RecommendationRow`:** a `View` with `READING_ROW` holding `<RibbonCard pretitle={reason} title meta onPress />` (wrapped in `flex: 1`) and then `<Pressable accessibilityRole="button" accessibilityLabel={`إخفاء الاقتراح: ${title}`} hitSlop to 44×44><CloseIcon size={14} color={KhazainColors.ink500} /></Pressable>`. **No `save` prop.** The dismiss button calls `dismissRecommendation(rec, { announce: screenReaderOn })`, where `screenReaderOn` comes from `AccessibilityInfo.isScreenReaderEnabled()`, cached in state.
- **`RecommendedSection`:**
  - Content: `HomeSectionHeader title={RECOMMENDATION_COPY.sectionTitle}`, then a `switch (sectionState(...))`.
  - Skeletons: `SkeletonRibbonList` with `RECOMMENDATION_SLOT_HEIGHT`.
  - Hint and empty states: a plain `Text` with `textStyle('bodyCompact')` + `RTL_TEXT` in ink500.
  - Rows: phones stack them; tablets use `gridColumns(width, 340, 2)` columns in `READING_ROW` rows, where `width` is the hook's screen width.
  - Body height: `limit × slot + gaps` whenever `hasSignals`.
  - `limit` is `isTablet ? HOME_LIMIT_TABLET : HOME_LIMIT_PHONE`.

**Failing tests first (source scans; behaviour is covered by T7a):**

```ts
it('RecommendationRow never saves and orders card then dismiss', () => {
  const src = read('components/khazain/recommendations/RecommendationRow.tsx');
  expect(src).not.toMatch(/\bsave=|useSaveGesture|saveGestureProps|onLongPress/);
  expect(src).toContain('...READING_ROW');
  expect(src).not.toContain('row-reverse');
  expect(src.indexOf('<RibbonCard')).toBeLessThan(src.indexOf('accessibilityLabel={`إخفاء الاقتراح: '));
  expect(src).not.toMatch(/accessibilityActions/);
});
it('RecommendedSection switches on sectionState and keeps hint/empty non-interactive', () => {
  const src = read('components/khazain/recommendations/RecommendedSection.tsx');
  expect(src).toMatch(/switch \(sectionState\(/);
  expect(src).toMatch(/gridColumns\(width, 340, 2\)/);
  expect(src).not.toMatch(/homeColumnWidth/);
  const hintBlock = src.slice(src.indexOf("case 'hint'"), src.indexOf("case 'skeletonFull'"));
  expect(hintBlock).not.toContain('Pressable');
});
// rtlVisualContracts.test.ts
it('pins the recommendation row order', () => {
  expect(RECOMMENDATION_ROW_ORDER).toEqual(['dismiss', 'card']);
  expect(Object.isFrozen(RECOMMENDATION_ROW_ORDER)).toBe(true);
});
```

**Run:** `npx jest __tests__/recommendationComponents.test.ts __tests__/rtlVisualContracts.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/contextualNotesInvariants.test.ts __tests__/fontRegistry.test.ts`. Before: FAIL, ENOENT on the component files and the missing export. After: PASS. Then the global checks.

**Commit:** `feat(recs): add the recommendation row and section components`

## T8. Home wiring

**Files:**
- `constants/homePresentation.ts`: insert `'recommended'` after `'books'`
- `app/(tabs)/index.tsx`:
  - `sections.recommended = RECOMMENDATIONS_ENABLED ? <RecommendedSection /> : null`
  - both render loops skip `null` section nodes
  - the mount effect chains `Promise.allSettled([fetchScholars(), fetchBooks(), fetchDawah()])` → `InteractionManager.runAfterInteractions(() => loadCatalogue({ signalCount }))`
  - `useFocusEffect` → `refreshActivity()`
- `__tests__/homePresentation.test.ts`, `__tests__/homeTablet.test.ts`: the new entry only
- `__tests__/homeRecommendations.test.ts` (new)

**Failing tests first:**

```ts
// homePresentation.test.ts:15-24 — expected array becomes
['header', 'quranHero', 'prophetHero', 'scholars', 'books', 'recommended', 'queen', 'quickChips', 'dawah']
// homeTablet.test.ts:11-18 — expected rows become
['header', ['quranHero', 'prophetHero'], 'scholars', 'books', 'recommended', ['queen', 'quickChips'], 'dawah']

// homeRecommendations.test.ts
const src = read('app/(tabs)/index.tsx');
it('renders the section behind the kill switch and skips null nodes', () => {
  expect(src).toMatch(/recommended: RECOMMENDATIONS_ENABLED \? <RecommendedSection/);
  expect(src).toContain('homeTabletRows(HOME_SECTION_ORDER)'); // unchanged literal
  expect(src).not.toMatch(/visibleOrder/);
  expect(src.match(/== null \? null/g)?.length).toBe(2);       // both loops
});
it('loads the catalogue only after Home first fetches settle, after interactions', () => {
  expect(src).toMatch(/Promise\.allSettled\(\[fetchScholars\(\), fetchBooks\(\), fetchDawah\(\)\]\)/);
  expect(src).toMatch(/InteractionManager\.runAfterInteractions\(/);
  expect(src).toMatch(/loadCatalogue\(\{ signalCount/);
});
```

**Run:**
- `npx jest __tests__/homePresentation.test.ts __tests__/homeTablet.test.ts __tests__/homeRecommendations.test.ts`. Before the build: FAIL, because the arrays differ by `'recommended'` and the source scans fail. After: PASS.
- Confirm no other assertion in `homeTablet.test.ts` was edited: `git diff --stat __tests__/homeTablet.test.ts` shows only the one hunk.
- Then the global checks.

Note: Home re-attempts `loadCatalogue` after each focus refresh once the first-fetch gate has opened.

**Commit:** `feat(home): add the recommended-for-you section`

## T9. Mushaf end block

**Files:**
- `components/khazain/recommendations/SurahEndSuggestions.tsx` (new): next-surah row via `router.setParams({ surah, ayah: undefined })`, omitted for 114. Plus one `useRecommendations(1, surahNumber)` row through `recommendationTarget(rec, 'mushaf')`, shown only once `catalogueStatus` is `ready` or `aborted`. No `save`.
- `app/(tabs)/sections/mushaf.tsx`:
  - render `<SurahEndSuggestions surahNumber={surahNumber} />` directly after `<SurahNotesFooter …/>` (`:498`)
  - `useEffect` on mount → `refreshActivity()` and `loadCatalogue({ signalCount, contextSurah: surahNumber })`
- `components/khazain/recommendations/index.ts`: export it
- `__tests__/contextualNotesInvariants.test.ts`: additions only

**Failing tests first:**

```ts
describe('mushaf recommendations', () => {
  const mushaf = read('app/(tabs)/sections/mushaf.tsx');
  const block = read('components/khazain/recommendations/SurahEndSuggestions.tsx');
  it('the end block follows the notes footer (S3)', () => {
    expect(mushaf.indexOf('<SurahEndSuggestions')).toBeGreaterThan(mushaf.indexOf('<SurahNotesFooter'));
    expect(mushaf.indexOf('<SurahNotesFooter')).toBeGreaterThan(-1);
  });
  it('the end block takes no save gesture (NOTE surface)', () => {
    expect(block).not.toMatch(/\bsave=|useSaveGesture|saveGestureProps|onLongPress/);
  });
  it('next surah replaces params instead of pushing (C1)', () => {
    expect(block).toMatch(/router\.setParams\(\{ surah: [^}]*ayah: undefined/);
    expect(block).not.toMatch(/router\.push\(/);
  });
  it('routes through the Mushaf target, which never plays', () => {
    expect(block).toContain("recommendationTarget(rec, 'mushaf')");
    expect(block).not.toMatch(/startLecturePlayback/);
  });
  it('the Mushaf gates the catalogue with its surah context (N1)', () => {
    expect(mushaf).toMatch(/loadCatalogue\(\{ signalCount[^}]*contextSurah: surahNumber/);
  });
});
```

**Run:**
- `npx jest __tests__/contextualNotesInvariants.test.ts`. Before: FAIL, ENOENT on `SurahEndSuggestions.tsx`. After: PASS, with **every pre-existing assertion unchanged**.
- `npx jest __tests__/mushafPageTrackingWiring.test.ts __tests__/mushafTablet.test.ts __tests__/mushafPresentation.test.ts` still pass.
- Then the global checks.

**Commit:** `feat(mushaf): suggest the next surah and a tafsir series at surah end`

## T10. Docs, then device QA

**Files:**
- `CLAUDE.md`:
  - **State:** `recommendationsStore` (persisted `@khazain/recommendations`, no version, the reason why) and `recommendationInputsStore` (not persisted).
  - **File layout:** `components/khazain/recommendations/`, `services/recommendations/`.
  - **Long-press means:** recommendation rows take no long-press, and the Mushaf end block never saves.
- `docs/plans/2026-05-10-backend-integration-activation-design.md`: append the design §7.5 text as a new section, "Proposed: bulk scholar lectures endpoint". `docs/api-contract.md` does not exist; do not create it.

**Tests:** none new. `npx jest __tests__/contextualNotesInvariants.test.ts` must stay green, because it greps CLAUDE.md for the long-press rule.

**Run:** the global checks. `git status --short` must show only the two doc paths.

**Commit:** `docs: record recommendation stores and bulk lectures endpoint proposal`

**Then device QA** (design §10.4, all 14 cases) on the iPhone 16 sim, the Realme Note 50-class 360×800dp AVD, the Pixel Tablet AVD and the iPad Pro 13 sim, using argent:
- Record the results in `docs/plans/2026-10-22-personalized-recommendations-qa.md`. Put captures in `docs/audit/2026-10-22-recommendations/` (untracked, like the tablet captures).
- Fix what QA finds, each fix with its own failing test and commit.

**Commit:** `docs(plans): record recommendations QA`
