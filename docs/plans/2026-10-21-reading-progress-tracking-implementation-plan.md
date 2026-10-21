# Reading & Listening Progress Tracking — Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Follow the repo's NON-NEGOTIABLE loop (CLAUDE.md §4): fresh implementer per task → TDD inside → spec review → quality review. Commits carry **no** `Co-Authored-By` or any AI attribution. Never `--no-verify`. Do not push.

**Goal:** Close the audit gaps on Trello card HKTMbpu6. Quran reading is tracked per page inside the existing scrolling reader. Juz completion is correct. The Library gets StatCards for pages read, juz completed and lectures listened. Figma frames 2031:4659, 2349:982 and 2349:829 stay intact.

**Architecture:** A generated Madani page table (Tanzil, CC BY 3.0) maps every ayah to its page. The reader renders one `<Text>` per page. A pure `MushafPageTrackingController` decides when reading time counts — the screen is focused, the app is in the foreground and the ayat are on screen. Through a `PageDwellTracker` it records a page after 8 s in view. Two new SQLite totals and `lastReadPage` feed the progress store. A new extension StatCard row sits below the Library frame.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, expo-router 6 (`useFocusEffect`), TypeScript 5.9, Zustand 5, expo-sqlite + web shim, jest-expo. No new dependencies.

**Design:** `docs/plans/2026-10-21-reading-progress-tracking-design.md` (v2). Read it for the rationale and decisions D1 / Q1–Q5.

**Baseline (before Task 1):** `npx jest` → 73 suites, 828 passed, 1 skipped. `npx tsc --noEmit --pretty false` → clean.

**Planning dry run:** before this plan was committed, every v2 code block (Tasks 1–14, data generated with the Task 1 script) was applied to a throwaway worktree of `0635ea1`. Results: `npx jest` 81 suites / 897 passed / 1 skipped, tsc clean, and no lint warnings in the production files this plan touches. If your result differs, investigate why — don't just update the expected number.

**Merge order (design §10):** this branch lands **before** the contextual-notes branch, which rebases onto it and scrolls to pages via `MushafPageTrackingController.contentYForPage(page)`. The settings branch also edits `app/settings-about.tsx`. The conflict is trivial: keep both cards and the shared `openExternalUrl` helper.

**Worktree:** `/Users/ahmedelhadarey/samer/khazayin-worktrees/progress`, branch `feat/progress-page-tracking`. Paths below are relative to it. QA captures go to `$QA=/private/tmp/claude-501/-Users-ahmedelhadarey-samer-khazayin-app/ad126e66-b973-46e5-9731-c506a3e034d8/scratchpad/qa`.

---

## Task 0: Visual baselines — **DONE**

The baselines already exist in `$QA/baseline/`. They include `06-2031-4659__library.png` and `16-2349-982__sections-mushaf__surah-2.png`, plus `capture-summary.json`. Frame 15 (2349:829) is a transition state with no app route, so it is checked by eye in Task 15. Nothing to do.

---

## Task 1: Madani page table and `pageForAyah`

**Files:**
- Create: `constants/quranPageData.ts` (GENERATED — never hand-edit)
- Create: `constants/quranPages.ts`
- Test: `__tests__/quranPages.test.ts`

**Step 1: Write the failing test** `__tests__/quranPages.test.ts`:

```ts
import { SURAH_START_PAGES } from '@/constants/progress';
import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, pageForAyah } from '@/constants/quranPages';

/** Tanzil quran-data.js v1.0 (CC BY 3.0) — design §4.1. */
describe('Madani page table', () => {
  it('has 604 page starts and 30 juz starts', () => {
    expect(QURAN_PAGE_STARTS).toHaveLength(604);
    expect(JUZ_START_AYAHS).toHaveLength(30);
  });

  it('starts page 1 at al-Fatiha 1 and page 604 at al-Ikhlas 1', () => {
    expect(QURAN_PAGE_STARTS[0]).toEqual([1, 1]);
    expect(QURAN_PAGE_STARTS[603]).toEqual([112, 1]);
  });

  it('is strictly increasing in mushaf order', () => {
    for (let i = 1; i < QURAN_PAGE_STARTS.length; i += 1) {
      const [s0, a0] = QURAN_PAGE_STARTS[i - 1];
      const [s1, a1] = QURAN_PAGE_STARTS[i];
      expect([i, s1 > s0 || (s1 === s0 && a1 > a0)]).toEqual([i, true]);
    }
  });

  // Independent corroboration: SURAH_START_PAGES was written separately.
  it('agrees with SURAH_START_PAGES for all 114 surahs', () => {
    for (let n = 1; n <= 114; n += 1) {
      expect([n, pageForAyah(n, 1)]).toEqual([n, SURAH_START_PAGES[n]]);
    }
  });

  it('places known boundary ayat on the right page', () => {
    expect(pageForAyah(2, 5)).toBe(2);
    expect(pageForAyah(2, 6)).toBe(3);
    expect(pageForAyah(2, 286)).toBe(49);
    expect(pageForAyah(114, 6)).toBe(604);
  });

  it('returns null for refs that are not ayat', () => {
    expect(pageForAyah(0, 1)).toBeNull();
    expect(pageForAyah(115, 1)).toBeNull();
    expect(pageForAyah(2, 0)).toBeNull();
    expect(pageForAyah(1.5, 1)).toBeNull();
    expect(pageForAyah(Number.NaN, 1)).toBeNull();
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/quranPages.test.ts`
Expected: FAIL with `Cannot find module '@/constants/quranPages'`.

**Step 3: Generate `constants/quranPageData.ts`.** Treat the download as untrusted data. It goes into its own empty directory, and the generator lives in a different directory and runs with `python3 -I`. The script below is the one that produces the file. Keep it in the scratchpad and do not commit it.

```bash
SCRATCH=/private/tmp/claude-501/-Users-ahmedelhadarey-samer-khazayin-app/ad126e66-b973-46e5-9731-c506a3e034d8/scratchpad
mkdir -p "$SCRATCH/tanzil-dl" "$SCRATCH/tools"
curl -sSL -m 30 -o "$SCRATCH/tanzil-dl/quran-data.js" https://tanzil.net/res/text/metadata/quran-data.js
shasum -a 256 "$SCRATCH/tanzil-dl/quran-data.js"
# expect 9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4
```

`$SCRATCH/tools/gen_quran_pages.py`:

```python
# Usage: python3 -I gen_quran_pages.py <quran-data.js> <out.ts>
import re, sys, hashlib
src_bytes = open(sys.argv[1], 'rb').read()
src = src_bytes.decode('utf-8')
assert 'License: Creative Commons Attribution 3.0' in src, 'licence header changed - stop and re-check'
def block(name):
    m = re.search(r'QuranData\.' + name + r' = \[(.*?)\];', src, re.S)
    return [(int(a), int(b)) for a, b in re.findall(r'\[(\d+),\s*(\d+)\]', m.group(1))]
pages = block('Page')
juz = block('Juz')
assert len(pages) == 605 and pages[-1] == (115, 1), 'expected 604 pages + sentinel'
assert len(juz) == 31 and juz[-1] == (115, 1), 'expected 30 juz + sentinel'
pages, juz = pages[:604], juz[:30]
sha = hashlib.sha256(src_bytes).hexdigest()
def rows(pairs, per=8):
    cells = [f'[{s}, {a}]' for s, a in pairs]
    return '\n'.join('  ' + ', '.join(cells[i:i + per]) + ',' for i in range(0, len(cells), per))
out = f'''/**
 * Madani Mushaf (604-page, Hafs) page and juz boundaries, as [surah, ayah]
 * pairs. GENERATED — do not hand-edit; regenerate with the script recorded in
 * docs/plans/2026-10-21-reading-progress-tracking-implementation-plan.md (Task 1).
 *
 * Source: Tanzil Quran Metadata v1.0, https://tanzil.net/res/text/metadata/quran-data.js
 *   (QuranData.Page and QuranData.Juz; sentinel entries dropped)
 *   sha256 {sha}
 * Copyright (C) 2008-2009 Tanzil.info. Licensed under Creative Commons
 * Attribution 3.0 (https://creativecommons.org/licenses/by/3.0/).
 * Changes: sentinel entries removed, arrays converted to TypeScript.
 * The in-app notice lives in app/settings-about.tsx (constants/quranPages.ts).
 */

export type AyahRef = readonly [surah: number, ayah: number];

/** Index i = the first ayah of page i + 1. 604 entries. */
export const QURAN_PAGE_STARTS: readonly AyahRef[] = [
{rows(pages)}
];

/** Index i = the first ayah of juz i + 1. 30 entries. */
export const JUZ_START_AYAHS: readonly AyahRef[] = [
{rows(juz)}
];
'''
open(sys.argv[2], 'w', encoding='utf-8').write(out)
print('ok', len(pages), len(juz), sha)
```

Run it with the scratchpad tools directory as the working directory, not the download directory:

```bash
cd "$SCRATCH/tools" && python3 -I gen_quran_pages.py "$SCRATCH/tanzil-dl/quran-data.js" /Users/ahmedelhadarey/samer/khazayin-worktrees/progress/constants/quranPageData.ts
```

Expected: `ok 604 30 9e9930c5…ca4`, and a file of about 103 lines whose first data row is `[1, 1], [2, 1], [2, 6], [2, 17], [2, 25], [2, 30], [2, 38], [2, 49],`. The arrays are typed `readonly AyahRef[]`, not `ReadonlyArray<…>`, because the repo's `@typescript-eslint/array-type` rule flags the latter.

**Step 4: Write `constants/quranPages.ts`** (hand-written):

```ts
/**
 * Ayah → Madani page lookup over the generated `quranPageData.ts`.
 * The CC BY 3.0 notice constants are added in Task 14.
 */
import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, type AyahRef } from './quranPageData';

export { JUZ_START_AYAHS, QURAN_PAGE_STARTS, type AyahRef };

function compareRef(s1: number, a1: number, s2: number, a2: number): number {
  return s1 !== s2 ? s1 - s2 : a1 - a2;
}

/**
 * The 1-based Madani page an ayah is printed on, or null when `surah`/`ayah`
 * are not a valid reference. Does not check that `ayah` exists in the surah —
 * an over-long ayah number lands on the surah's last page.
 */
export function pageForAyah(surah: number, ayah: number): number | null {
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  let lo = 0;
  let hi = QURAN_PAGE_STARTS.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, a] = QURAN_PAGE_STARTS[mid];
    if (compareRef(s, a, surah, ayah) <= 0) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found < 0 ? null : found + 1;
}
```

**Step 5: Run it — it must pass**

Run: `npx jest __tests__/quranPages.test.ts && npx tsc --noEmit --pretty false`
Expected: 6 PASS; tsc prints nothing.

**Step 6: Commit**

```bash
git add constants/quranPageData.ts constants/quranPages.ts __tests__/quranPages.test.ts
git commit -m "feat(progress): add Madani ayah-to-page table from Tanzil (CC BY 3.0)"
```

---

## Task 2: Correct the mid-page juz boundaries, with literal cross-checks

**Files:**
- Modify: `constants/progress.ts:39-79` (doc comment and 4 entries of `JUZ_PAGE_RANGES`)
- Test: `__tests__/juz.test.ts:4-13` (replace the contiguity block; keep the rest)

**Step 1: Write the failing test.** In `__tests__/juz.test.ts`:
- Add `import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, pageForAyah } from '../constants/quranPages';` at the top.
- Replace the `describe('JUZ_PAGE_RANGES data integrity', …)` block (lines 4-13) with:

```ts
/** First and last page of juz `j` (1-based), derived from the Tanzil table. */
function derivedRange(j: number): { startPage: number; endPage: number } {
  const [s, a] = JUZ_START_AYAHS[j - 1];
  const startPage = pageForAyah(s, a)!;
  if (j === 30) return { startPage, endPage: 604 };
  const [ns, na] = JUZ_START_AYAHS[j];
  const nextStart = pageForAyah(ns, na)!;
  const [ps, pa] = QURAN_PAGE_STARTS[nextStart - 1];
  const nextBeginsPage = ps === ns && pa === na;
  return { startPage, endPage: nextBeginsPage ? nextStart - 1 : nextStart };
}

describe('JUZ_PAGE_RANGES data integrity', () => {
  it('has 30 juz spanning pages 1..604', () => {
    expect(JUZ_PAGE_RANGES).toHaveLength(30);
    expect(JUZ_PAGE_RANGES[0].startPage).toBe(1);
    expect(JUZ_PAGE_RANGES[29].endPage).toBe(604);
  });

  // Literal, not derived: the standard Madani juz openings.
  it('starts every juz on the standard Madani page', () => {
    expect(JUZ_PAGE_RANGES.map((r) => r.startPage)).toEqual([
      1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
      302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
    ]);
  });

  it('prints each mid-page juz opening and the ayah before it on the shared page', () => {
    expect([pageForAyah(3, 92), pageForAyah(3, 93)]).toEqual([62, 62]);
    expect([pageForAyah(5, 81), pageForAyah(5, 82)]).toEqual([121, 121]);
    expect([pageForAyah(9, 92), pageForAyah(9, 93)]).toEqual([201, 201]);
    expect([pageForAyah(45, 37), pageForAyah(46, 1)]).toEqual([502, 502]);
  });

  it('opens juz 4 at 3:93, as Tanzil does (design decision D1)', () => {
    expect(JUZ_START_AYAHS[3]).toEqual([3, 93]);
  });

  it('matches the Madani page table for every juz', () => {
    JUZ_PAGE_RANGES.forEach(({ juz, startPage, endPage }) => {
      expect({ juz, startPage, endPage }).toEqual({ juz, ...derivedRange(juz) });
    });
  });

  it('shares a boundary page exactly where a juz begins mid-page', () => {
    const shared = JUZ_PAGE_RANGES.filter(
      (r, i) => i > 0 && r.startPage === JUZ_PAGE_RANGES[i - 1].endPage,
    ).map((r) => r.juz);
    expect(shared).toEqual([4, 7, 11, 26]);
    JUZ_PAGE_RANGES.forEach((r, i) => {
      if (i === 0) return;
      expect([r.juz, r.startPage - JUZ_PAGE_RANGES[i - 1].endPage]).toEqual(
        [r.juz, shared.includes(r.juz) ? 0 : 1],
      );
    });
  });

  it('needs the shared page before either neighbour is complete', () => {
    const pages: number[] = [];
    for (let p = 42; p <= 61; p += 1) pages.push(p); // juz 3 minus page 62
    expect(completedJuzList(pages)).not.toContain(3);
    pages.push(62);
    expect(completedJuzList(pages)).toContain(3);
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/juz.test.ts`
Expected: FAIL. "starts every juz…" fails at index 6 (122 vs 121). "matches the Madani page table" fails on juz 3. "shares a boundary page" fails (`[]` vs `[4, 7, 11, 26]`). "needs the shared page" fails.

**Step 3: Minimal implementation** in `constants/progress.ts`. Change exactly these four values: juz 3 `endPage: 61` → `62`; juz 7 `startPage: 122` → `121`; juz 11 `startPage: 202` → `201`; juz 25 `endPage: 501` → `502`. Then replace the doc comment at `:39-43` with:

```ts
/**
 * Page ranges (1-based, inclusive) of the 30 ajzāʾ of the 604-page Madani
 * Mushaf. Juz 4, 7, 11 and 26 begin mid-page, so each shares its first page
 * with the end of the previous juz — a juz is complete only when that shared
 * page has been read too. Juz 4 opens at 3:93 as in Tanzil (design decision
 * D1). Pinned to `constants/quranPages.ts` by `__tests__/juz.test.ts`.
 * Used by `completedJuzCount()` (FR-005).
 */
```

Leave `JUZ_PRESET_PAGES` (`:13-30`) unchanged.

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/juz.test.ts __tests__/quranPages.test.ts`
Expected: all PASS. The existing `countCompletedJuz` / `completedJuzList` tests still pass as they are.

**Step 5: Commit**

```bash
git add constants/progress.ts __tests__/juz.test.ts
git commit -m "fix(progress): share the boundary page where a juz begins mid-page"
```

---

## Task 3: Page segments and in-view detection

**Files:**
- Modify: `constants/progress.ts` (append after `STREAK_MILESTONES`, `:81-82`)
- Create: `services/mushafPageTracking.ts`
- Test: `__tests__/mushafPageTracking.test.ts`

**Step 1: Write the failing test** `__tests__/mushafPageTracking.test.ts`:

```ts
import { groupAyatByPage, pagesInView } from '@/services/mushafPageTracking';
import type { Ayah } from '@/types/content';

const ayah = (surah: number, n: number): Ayah => ({
  surahId: String(surah).padStart(3, '0'),
  number: n,
  text: `a${n}`,
});
const range = (surah: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ayah(surah, from + i));

describe('groupAyatByPage', () => {
  it('returns no segments for no ayat', () => {
    expect(groupAyatByPage(2, [])).toEqual([]);
  });

  it('keeps the mock al-Baqarah 1-5 on page 2 as one segment', () => {
    const segs = groupAyatByPage(2, range(2, 1, 5));
    expect(segs.map((s) => s.page)).toEqual([2]);
    expect(segs[0].ayat.map((a) => a.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('starts a new segment where a page starts', () => {
    const segs = groupAyatByPage(2, range(2, 1, 7));
    expect(segs.map((s) => [s.page, s.ayat.map((a) => a.number)])).toEqual([
      [2, [1, 2, 3, 4, 5]],
      [3, [6, 7]],
    ]);
  });

  it("places a surah's first ayah on the surah's start page", () => {
    expect(groupAyatByPage(3, range(3, 1, 2)).map((s) => s.page)).toEqual([50]);
  });

  it('never drops an ayah the table cannot place', () => {
    const bad: Ayah = { surahId: '002', number: 0, text: 'x' };
    const segs = groupAyatByPage(2, [ayah(2, 1), bad]);
    expect(segs).toHaveLength(1);
    expect(segs[0].ayat).toHaveLength(2);
  });

  it('falls back to the surah start page when the first ayah cannot be placed', () => {
    const bad: Ayah = { surahId: '002', number: 0, text: 'x' };
    expect(groupAyatByPage(2, [bad]).map((s) => s.page)).toEqual([2]);
  });
});

describe('pagesInView', () => {
  const VIEW = 800;

  it('counts a tall segment that fills at least half the viewport', () => {
    expect(pagesInView([{ page: 2, y: 0, height: 2000 }], 0, VIEW)).toEqual([2]);
    expect(pagesInView([{ page: 2, y: 0, height: 2000 }], 1600, VIEW)).toEqual([2]); // 400 visible
  });

  it('does not count a tall segment showing less than half the viewport', () => {
    expect(pagesInView([{ page: 2, y: 0, height: 2000 }], 1601, VIEW)).toEqual([]);
  });

  it('counts a short segment that is at least 90% visible', () => {
    expect(pagesInView([{ page: 604, y: 100, height: 200 }], 0, VIEW)).toEqual([604]);
    expect(pagesInView([{ page: 604, y: 780, height: 200 }], 0, VIEW)).toEqual([]); // 20 visible
  });

  it('can report several short segments at once', () => {
    const segs = [
      { page: 603, y: 0, height: 300 },
      { page: 604, y: 300, height: 300 },
    ];
    expect(pagesInView(segs, 0, VIEW)).toEqual([603, 604]);
  });

  it('ignores off-screen and zero-height segments, and an unmeasured viewport', () => {
    expect(pagesInView([{ page: 3, y: 5000, height: 900 }], 0, VIEW)).toEqual([]);
    expect(pagesInView([{ page: 3, y: 0, height: 0 }], 0, VIEW)).toEqual([]);
    expect(pagesInView([{ page: 3, y: 0, height: 900 }], 0, 0)).toEqual([]);
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/mushafPageTracking.test.ts`
Expected: FAIL with `Cannot find module '@/services/mushafPageTracking'`.

**Step 3: Minimal implementation.** Append to `constants/progress.ts` after `STREAK_MILESTONES`:

```ts
/**
 * Mushaf page-read detection (design 2026-10-21 §4.3). A page counts as read
 * once its segment has been in view for PAGE_READ_DWELL_MS in total within one
 * reader session. "In view" = the visible part is at least
 * PAGE_IN_VIEW_VIEWPORT_SHARE of the viewport (tall segments) or at least
 * PAGE_IN_VIEW_SELF_SHARE of the segment itself (short segments).
 */
export const PAGE_READ_DWELL_MS = 8000;
export const PAGE_IN_VIEW_VIEWPORT_SHARE = 0.5;
export const PAGE_IN_VIEW_SELF_SHARE = 0.9;
/** Longest gap credited by one tracker update — guards JS stalls/backgrounding. */
export const PAGE_DWELL_MAX_STEP_MS = 2000;
```

Create `services/mushafPageTracking.ts`:

```ts
/**
 * Page-level reading detection for the scrolling Mushaf reader.
 *
 * Pure: no React, no storage. `app/(tabs)/sections/mushaf.tsx` renders one
 * <Text> per page segment and forwards its events to a
 * `MushafPageTrackingController` (below), which owns every gate.
 */
import {
  PAGE_IN_VIEW_SELF_SHARE,
  PAGE_IN_VIEW_VIEWPORT_SHARE,
  surahStartPage,
} from '@/constants/progress';
import { pageForAyah } from '@/constants/quranPages';
import type { Ayah } from '@/types/content';

export type PageSegment = { page: number; ayat: Ayah[] };
export type SegmentLayout = { page: number; y: number; height: number };

/**
 * Consecutive ayat on the same Madani page form one segment. An ayah the
 * table cannot place joins the previous segment (or the surah's start page
 * when it is first) — text is never dropped.
 */
export function groupAyatByPage(surahNumber: number, ayat: readonly Ayah[]): PageSegment[] {
  const segments: PageSegment[] = [];
  for (const a of ayat) {
    const last = segments[segments.length - 1];
    const page = pageForAyah(surahNumber, a.number) ?? last?.page ?? surahStartPage(surahNumber);
    if (last && last.page === page) last.ayat.push(a);
    else segments.push({ page, ayat: [a] });
  }
  return segments;
}

/** Pages whose segment is "in view" for the given scroll position. */
export function pagesInView(
  segments: readonly SegmentLayout[],
  scrollY: number,
  viewportHeight: number,
): number[] {
  if (!(viewportHeight > 0)) return [];
  const top = scrollY;
  const bottom = scrollY + viewportHeight;
  const out: number[] = [];
  for (const s of segments) {
    if (!(s.height > 0)) continue;
    const visible = Math.max(0, Math.min(bottom, s.y + s.height) - Math.max(top, s.y));
    if (visible <= 0) continue;
    if (
      visible >= viewportHeight * PAGE_IN_VIEW_VIEWPORT_SHARE ||
      visible >= s.height * PAGE_IN_VIEW_SELF_SHARE
    ) {
      out.push(s.page);
    }
  }
  return out;
}
```

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/mushafPageTracking.test.ts && npx tsc --noEmit --pretty false`
Expected: 11 PASS; tsc clean.

**Step 5: Commit**

```bash
git add constants/progress.ts services/mushafPageTracking.ts __tests__/mushafPageTracking.test.ts
git commit -m "feat(mushaf): group ayat into page segments and detect pages in view"
```

---

## Task 4: `PageDwellTracker`

**Files:**
- Modify: `services/mushafPageTracking.ts` (append)
- Test: `__tests__/mushafPageTracking.test.ts` (append a `describe`)

**Step 1: Write the failing test.** Add `PageDwellTracker` to the import, then append:

```ts
describe('PageDwellTracker', () => {
  const make = () => {
    const read: number[] = [];
    const t = new PageDwellTracker({ dwellMs: 8000, maxStepMs: 2000, onRead: (p) => read.push(p) });
    return { t, read };
  };
  /** Feed `inView` once a second from `from` to `to` (inclusive). */
  const run = (t: PageDwellTracker, inView: number[], from: number, to: number) => {
    for (let ms = from; ms <= to; ms += 1000) t.update(inView, ms);
  };

  it('records a page once it has been in view for the dwell', () => {
    const { t, read } = make();
    run(t, [2], 0, 7000);
    expect(read).toEqual([]);
    t.update([2], 8000);
    expect(read).toEqual([2]);
  });

  it('records each page at most once per session', () => {
    const { t, read } = make();
    run(t, [2], 0, 30000);
    expect(read).toEqual([2]);
  });

  it('adds up time that is not continuous', () => {
    const { t, read } = make();
    run(t, [2], 0, 4000);
    run(t, [], 5000, 6000); // the 4000 → 5000 step still credits page 2: 5 s
    run(t, [2], 7000, 9000); // 6 → 7 credits nothing; 7 → 9 credits 2 s: 7 s
    expect(read).toEqual([]);
    t.update([2], 10000);
    expect(read).toEqual([2]);
  });

  it('caps one update so a stalled thread cannot credit a page in a jump', () => {
    const { t, read } = make();
    t.update([2], 0);
    t.update([2], 60000);
    expect(read).toEqual([]);
  });

  it('stops accruing while paused', () => {
    const { t, read } = make();
    run(t, [2], 0, 3000); // 3 s
    t.pause(3000);
    t.update([2], 30000); // first update after a pause only re-arms the clock
    run(t, [2], 31000, 34000); // + 4 s = 7 s
    expect(read).toEqual([]);
    t.update([2], 35000); // 8 s
    expect(read).toEqual([2]);
  });

  it('credits every page in view and nothing else', () => {
    const { t, read } = make();
    run(t, [603, 604], 0, 8000);
    expect(read.sort()).toEqual([603, 604]);
  });
});
```

How the time adds up: each update credits the elapsed time to the pages that were in view **at the previous update**, capped at `maxStepMs`. These expectations were checked against a JS replica of the class while planning.

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/mushafPageTracking.test.ts -t PageDwellTracker`
Expected: FAIL (`PageDwellTracker` is not exported).

**Step 3: Minimal implementation.** Add `PAGE_DWELL_MAX_STEP_MS, PAGE_READ_DWELL_MS` to the `@/constants/progress` import, then append:

```ts
/**
 * Adds up how long each page has been in view and calls `onRead` once per
 * page per instance (one instance = one reader session) when the total
 * reaches `dwellMs`. Time between two updates is credited to the pages that
 * were in view at the earlier one, capped at `maxStepMs`.
 */
export class PageDwellTracker {
  private readonly accrued = new Map<number, number>();
  private readonly fired = new Set<number>();
  private current: readonly number[] = [];
  private lastAt: number | null = null;
  private readonly dwellMs: number;
  private readonly maxStepMs: number;
  private readonly onRead: (page: number) => void;

  constructor(opts: { onRead: (page: number) => void; dwellMs?: number; maxStepMs?: number }) {
    this.onRead = opts.onRead;
    this.dwellMs = opts.dwellMs ?? PAGE_READ_DWELL_MS;
    this.maxStepMs = opts.maxStepMs ?? PAGE_DWELL_MAX_STEP_MS;
  }

  update(inView: readonly number[], nowMs: number): void {
    this.accrue(nowMs);
    this.current = [...inView];
    this.lastAt = nowMs;
  }

  /** Credit nothing further until the next update re-arms the clock. */
  pause(nowMs: number): void {
    this.accrue(nowMs);
    this.current = [];
    this.lastAt = null;
  }

  private accrue(nowMs: number): void {
    if (this.lastAt === null) return;
    const step = Math.min(Math.max(0, nowMs - this.lastAt), this.maxStepMs);
    if (step === 0) return;
    for (const page of this.current) {
      if (this.fired.has(page)) continue;
      const total = (this.accrued.get(page) ?? 0) + step;
      this.accrued.set(page, total);
      if (total >= this.dwellMs) {
        this.fired.add(page);
        this.onRead(page);
      }
    }
  }
}
```

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/mushafPageTracking.test.ts && npx tsc --noEmit --pretty false`
Expected: 17 PASS; tsc clean.

**Step 5: Commit**

```bash
git add services/mushafPageTracking.ts __tests__/mushafPageTracking.test.ts
git commit -m "feat(mushaf): add PageDwellTracker for page-read detection"
```

---

## Task 5: `MushafPageTrackingController` — focus, app-state and content gates

This puts every gating rule into a pure class, so the rules get behaviour tests instead of regex checks on source (design §4.3).

**Files:**
- Modify: `services/mushafPageTracking.ts` (append)
- Test: `__tests__/mushafPageTracking.test.ts` (append a `describe`)

**Step 1: Write the failing test.** Add `MushafPageTrackingController` to the import, then append:

```ts
describe('MushafPageTrackingController', () => {
  const VIEW = 800;
  const make = () => {
    const read: number[] = [];
    const c = new MushafPageTrackingController({
      dwellMs: 8000,
      maxStepMs: 2000,
      onRead: (p) => read.push(p),
    });
    c.setViewportHeight(VIEW);
    c.setSegmentLayout(2, 0, 2000);
    return { c, read };
  };
  const ticks = (c: MushafPageTrackingController, from: number, to: number) => {
    for (let ms = from; ms <= to; ms += 1000) c.tick(ms);
  };
  /** Focused, foreground and showing content from `at`. */
  const open = (c: MushafPageTrackingController, at: number) => {
    c.setFocused(true, at);
    c.setContentReady(true, at);
  };

  it('credits nothing until focused, in the foreground and showing content', () => {
    const { c, read } = make();
    ticks(c, 0, 20000);
    c.setFocused(true, 20000);
    ticks(c, 21000, 40000); // content still loading
    expect(read).toEqual([]);
    expect(c.isObserving).toBe(false);
    c.setContentReady(true, 40000);
    expect(c.isObserving).toBe(true);
    ticks(c, 41000, 47000);
    expect(read).toEqual([]);
    c.tick(48000);
    expect(read).toEqual([2]);
  });

  it('pauses on blur — a tab switch leaves the reader mounted', () => {
    const { c, read } = make();
    open(c, 0);
    ticks(c, 1000, 5000); // 5 s
    c.setFocused(false, 5000);
    ticks(c, 6000, 60000); // on another tab: nothing counts
    c.setFocused(true, 60000); // re-arms only
    ticks(c, 61000, 62000); // 7 s
    expect(read).toEqual([]);
    c.tick(63000);
    expect(read).toEqual([2]);
  });

  it('pauses while the app is in the background', () => {
    const { c, read } = make();
    open(c, 0);
    ticks(c, 1000, 5000); // 5 s
    c.setAppActive(false, 5000);
    ticks(c, 6000, 60000);
    c.setAppActive(true, 60000);
    ticks(c, 61000, 62000); // 7 s
    expect(read).toEqual([]);
    c.tick(63000);
    expect(read).toEqual([2]);
  });

  it('drops layouts while the ayat are not on screen, and needs fresh ones after', () => {
    const { c, read } = make();
    open(c, 0);
    ticks(c, 1000, 3000); // 3 s
    c.setContentReady(false, 3000); // refetch: AsyncContent unmounted the segments
    expect(c.contentYForPage(2)).toBeNull();
    c.setContentReady(true, 10000);
    ticks(c, 11000, 30000); // no layouts → nothing in view
    expect(read).toEqual([]);
    c.setSegmentLayout(2, 0, 2000);
    ticks(c, 31000, 35000); // 31 re-arms with [2]; 32..35 → 7 s
    expect(read).toEqual([]);
    c.tick(36000);
    expect(read).toEqual([2]);
  });

  it('places segments below the body offset in scroll coordinates', () => {
    const read: number[] = [];
    const c = new MushafPageTrackingController({ dwellMs: 8000, maxStepMs: 2000, onRead: (p) => read.push(p) });
    c.setViewportHeight(VIEW);
    c.setBodyY(1000);
    c.setSegmentLayout(5, 0, 300);
    open(c, 0);
    ticks(c, 1000, 10000); // segment sits at 1000..1300, below the viewport
    expect(read).toEqual([]);
    c.onScroll(900, 10000);
    ticks(c, 11000, 17000); // 7 s
    expect(read).toEqual([]);
    c.tick(18000);
    expect(read).toEqual([5]);
    expect(c.contentYForPage(5)).toBe(1000);
    expect(c.contentYForPage(6)).toBeNull();
  });

  it('forgets layouts of pages that are no longer rendered', () => {
    const { c } = make();
    c.setSegmentLayout(3, 2000, 500);
    c.retainPages([2]);
    expect(c.contentYForPage(3)).toBeNull();
    expect(c.contentYForPage(2)).toBe(0);
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/mushafPageTracking.test.ts -t MushafPageTrackingController`
Expected: FAIL (`MushafPageTrackingController` is not exported).

**Step 3: Minimal implementation.** Append to `services/mushafPageTracking.ts`:

```ts
/**
 * Decides WHEN reading time counts, so ReadingView only forwards events.
 * Time is credited only while all three gates are open:
 *   focused      — tabs keep the reader mounted behind other tabs
 *   appActive    — the app is in the foreground
 *   contentReady — the ayat are on screen (AsyncContent unmounts them while
 *                  loading, empty or on error)
 * Reopening a gate re-arms the clock; the closed period is never credited.
 *
 * `contentYForPage` is the seam the contextual-notes branch scrolls with
 * (design §10) — do not add a second set of segment measurements.
 */
export class MushafPageTrackingController {
  private readonly tracker: PageDwellTracker;
  private readonly layouts = new Map<number, { y: number; height: number }>();
  private bodyY = 0;
  private scrollY = 0;
  private viewportHeight = 0;
  private focused = false;
  private appActive = true;
  private contentReady = false;

  constructor(opts: { onRead: (page: number) => void; dwellMs?: number; maxStepMs?: number }) {
    this.tracker = new PageDwellTracker(opts);
  }

  get isObserving(): boolean {
    return this.focused && this.appActive && this.contentReady;
  }

  setFocused(focused: boolean, nowMs: number): void {
    this.focused = focused;
    this.sync(nowMs);
  }

  setAppActive(active: boolean, nowMs: number): void {
    this.appActive = active;
    this.sync(nowMs);
  }

  /** `false` drops every stored layout: the segments have been unmounted. */
  setContentReady(ready: boolean, nowMs: number): void {
    this.contentReady = ready;
    if (!ready) this.layouts.clear();
    this.sync(nowMs);
  }

  setViewportHeight(height: number): void {
    this.viewportHeight = height;
  }

  setBodyY(y: number): void {
    this.bodyY = y;
  }

  setSegmentLayout(page: number, y: number, height: number): void {
    this.layouts.set(page, { y, height });
  }

  /** Forget layouts of pages that are no longer rendered. */
  retainPages(pages: readonly number[]): void {
    const live = new Set(pages);
    for (const page of [...this.layouts.keys()]) {
      if (!live.has(page)) this.layouts.delete(page);
    }
  }

  onScroll(y: number, nowMs: number): void {
    this.scrollY = y;
    this.tick(nowMs);
  }

  /** Scroll-content y of a page's segment, or null when it is not laid out. */
  contentYForPage(page: number): number | null {
    const l = this.layouts.get(page);
    return l ? this.bodyY + l.y : null;
  }

  tick(nowMs: number): void {
    if (!this.isObserving) return;
    const laid: SegmentLayout[] = [];
    this.layouts.forEach((l, page) => {
      laid.push({ page, y: this.bodyY + l.y, height: l.height });
    });
    this.tracker.update(pagesInView(laid, this.scrollY, this.viewportHeight), nowMs);
  }

  private sync(nowMs: number): void {
    if (this.isObserving) this.tick(nowMs);
    else this.tracker.pause(nowMs);
  }
}
```

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/mushafPageTracking.test.ts && npx tsc --noEmit --pretty false`
Expected: 23 PASS; tsc clean.

**Step 5: Commit**

```bash
git add services/mushafPageTracking.ts __tests__/mushafPageTracking.test.ts
git commit -m "feat(mushaf): gate page tracking on focus, app state and loaded content"
```

---

## Task 6: `last_read_page` moves on a same-day re-read (repository)

**Files:**
- Modify: `db/repositories/pageReads.ts:40` (`if (before.changes === 0) return;`)
- Modify: `db/web-shim.ts:157-159` (`if (exists) return false;`)
- Test: `__tests__/pageReadsRepo.test.ts` (new; web-shim pattern from `__tests__/reset.test.ts:11-34`)

**Step 1: Write the failing test** `__tests__/pageReadsRepo.test.ts`:

```ts
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore[k] = v;
    }),
    removeItem: jest.fn(async (k: string) => {
      delete mockStore[k];
    }),
  },
}));

import { __resetWebShimForTesting, createWebRepos } from '../db/web-shim';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  __resetWebShimForTesting();
});

describe('recordPageRead and last_read_page', () => {
  it('moves last_read_page back to a page already read today', async () => {
    const { pageReads } = createWebRepos();
    expect(await pageReads.recordPageRead(5)).toBe(true);
    expect(await pageReads.recordPageRead(7)).toBe(true);
    expect(await pageReads.recordPageRead(5)).toBe(false); // deduped
    expect(await pageReads.getLastReadPage()).toBe(5);
    expect(await pageReads.pagesReadToday()).toBe(2);
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/pageReadsRepo.test.ts`
Expected: FAIL. `getLastReadPage()` returns `7`, not `5`.

**Step 3: Minimal implementation.**

`db/web-shim.ts`: replace `if (exists) return false;` with:

```ts
      if (exists) {
        // A re-read today still moves the resume point (design §4.3).
        s.settings.last_read_page = pageNumber;
        scheduleFlush();
        return false;
      }
```

`db/repositories/pageReads.ts`: replace `if (before.changes === 0) return;` with:

```ts
        if (before.changes === 0) {
          // Already counted today — but it is still the page being read now,
          // so the resume point moves (design 2026-10-21 §4.3).
          await db.runAsync(
            `INSERT INTO khz_settings (key, value) VALUES ('last_read_page', ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            JSON.stringify(pageNumber),
          );
          return;
        }
```

The return value (`inserted`) is unchanged.

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/pageReadsRepo.test.ts __tests__/reset.test.ts && npx tsc --noEmit --pretty false`
Expected: PASS; clean.

**Step 5: Commit**

```bash
git add db/repositories/pageReads.ts db/web-shim.ts __tests__/pageReadsRepo.test.ts
git commit -m "fix(progress): move last_read_page on a same-day re-read"
```

---

## Task 7: `lastReadPage` in the progress store; the Library wird card reads it

**Files:**
- Modify: `store/progressStore.ts`: `ProgressSnapshot` `:37-53`, `EMPTY` `:77-91`, `hydrate` `:105-158`, `notePageRead` `:161-165`
- Modify: `app/(tabs)/library.tsx`: delete `:103` (`useState` for `lastReadPage`) and `:194-207` (the `todayPct`-keyed effect); add a store selector beside the other progress selectors (`:180-192`)
- Modify: `__tests__/progressStore-dbFailed.test.ts:13-28` (mocks)
- Test: `__tests__/progressStore-stats.test.ts` (new), `__tests__/libraryProgressWiring.test.ts` (new)

**Step 1: Write the failing tests.**

`__tests__/progressStore-stats.test.ts` (Task 10 extends this file):

```ts
const mockRecordPageRead = jest.fn(async (_page: number) => true);
const mockGetLastReadPage = jest.fn(async () => 1);
const mockTotalPagesRead = jest.fn(async () => 0);
const mockListenedCount = jest.fn(async () => 0);

jest.mock('@/db', () => ({
  getRepos: jest.fn(async () => ({})),
  progressRepo: {
    recordPageRead: (page: number) => mockRecordPageRead(page),
    getLastReadPage: () => mockGetLastReadPage(),
    totalPagesRead: () => mockTotalPagesRead(),
    pagesReadToday: jest.fn(async () => 0),
    pagesReadInMonth: jest.fn(async () => 0),
    currentStreak: jest.fn(async () => 0),
    completedJuzCount: jest.fn(async () => 0),
    longestStreakEver: jest.fn(async () => 0),
    bestWirdDay: jest.fn(async () => null),
    trendLastNDays: jest.fn(async () => []),
  },
  lectureRepo: {
    upsertSession: jest.fn(async () => ({})),
    findInProgress: jest.fn(async () => null),
    totalListenedSec: jest.fn(async () => 0),
    completedCount: jest.fn(async () => 0),
    listenedCount: () => mockListenedCount(),
  },
  achievementsRepo: { evaluateAll: jest.fn(async () => []) },
}));
jest.mock('@/store/wirdStore', () => ({
  useWirdStore: {
    getState: () => ({
      recomputeTodayPct: jest.fn(async () => undefined),
      reevaluateSuggestion: jest.fn(async () => undefined),
    }),
  },
}));
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({ show: jest.fn() }) } }));

import { useProgressStore } from '@/store/progressStore';

describe('progressStore lastReadPage', () => {
  it('hydrates lastReadPage from the repository', async () => {
    mockGetLastReadPage.mockResolvedValueOnce(30);
    await useProgressStore.getState().hydrate();
    expect(useProgressStore.getState().lastReadPage).toBe(30);
  });

  it('moves lastReadPage on a newly recorded page', async () => {
    mockRecordPageRead.mockResolvedValueOnce(true);
    await useProgressStore.getState().notePageRead(31);
    expect(useProgressStore.getState().lastReadPage).toBe(31);
  });

  it('moves lastReadPage on a same-day re-read the DB deduped', async () => {
    mockRecordPageRead.mockResolvedValueOnce(false);
    await useProgressStore.getState().notePageRead(2);
    expect(useProgressStore.getState().lastReadPage).toBe(2);
  });
});
```

`__tests__/libraryProgressWiring.test.ts` (Task 13 extends this file):

```ts
import fs from 'fs';
import path from 'path';

/** Library ↔ progress store wiring, pinned on source text (no RN renderer in this repo). */
const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/library.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('Library wird card', () => {
  it('reads lastReadPage from the progress store, not a local effect', () => {
    expect(src).toMatch(/useProgressStore\(\(s\) => s\.lastReadPage\)/);
    expect(src).not.toMatch(/setLastReadPage/);
    expect(src).not.toMatch(/getLastReadPage\(/);
  });
});
```

**Step 2: Run them — they must fail**

Run: `npx jest __tests__/progressStore-stats.test.ts __tests__/libraryProgressWiring.test.ts`
Expected: FAIL. `lastReadPage` is `undefined`, and `library.tsx` still contains `setLastReadPage`.

**Step 3: Minimal implementation.**

`store/progressStore.ts`:
- `ProgressSnapshot`: add `lastReadPage: number;` after `pagesToday`. `EMPTY`: add `lastReadPage: 1,`.
- `hydrate`: add `progressRepo.getLastReadPage()` to the `Promise.all` and the destructuring, and set `lastReadPage`.
- `notePageRead`: directly after `const inserted = await progressRepo.recordPageRead(pageNumber);`, add:

```ts
        // Every recorded page is the current reading position, deduped or not
        // (design §4.3) — the wird card and resume follow it.
        set({ lastReadPage: pageNumber });
```

`app/(tabs)/library.tsx`:
- Delete `const [lastReadPage, setLastReadPage] = useState<number>(1);` (`:103`).
- Delete the comment and `useEffect` block at `:194-207` (`// last_read_page lives in settings …` through `}, [todayPct]);`).
- After `const currentStreak = useProgressStore((s) => s.currentStreak);` (`:180`), add `const lastReadPage = useProgressStore((s) => s.lastReadPage);`.
- Keep the `getRepos, progressRepo` import (`:64`); the السجل history effect still uses it.

`__tests__/progressStore-dbFailed.test.ts`: add `getLastReadPage: jest.fn(async () => 1),` and `totalPagesRead: jest.fn(async () => 0),` to `progressRepo`, and `listenedCount: jest.fn(async () => 0),` to `lectureRepo`. Task 10 needs the last two, and adding them now means this file is edited once.

**Step 4: Run them — they must pass**

Run: `npx jest __tests__/progressStore-stats.test.ts __tests__/libraryProgressWiring.test.ts __tests__/progressStore-dbFailed.test.ts __tests__/wirdStore.test.ts && npx tsc --noEmit --pretty false && npm run lint 2>&1 | grep -E "\(tabs\)/library.tsx|progressStore" -A 2`
Expected: PASS; tsc clean; no lint output (in particular, no unused `useState` / `useEffect`, since both are still used elsewhere in `library.tsx`).

**Step 5: Commit**

```bash
git add store/progressStore.ts "app/(tabs)/library.tsx" __tests__/progressStore-stats.test.ts __tests__/libraryProgressWiring.test.ts __tests__/progressStore-dbFailed.test.ts
git commit -m "fix(library): follow the last read page from the progress store"
```

---

## Task 8: Record pages from the reader, not on open

**Files:**
- Modify: `app/(tabs)/sections/mushaf.tsx`: imports `:24-26`, `ReadingView` `:148-256` (remove `:153` and `:166-176`, add the forwarding, body `:204-242`)
- Test: `__tests__/mushafPageTrackingWiring.test.ts` (source contract — the gating behaviour itself is tested in Task 5)

**Step 1: Write the failing test** `__tests__/mushafPageTrackingWiring.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

/**
 * ReadingView must only forward events to MushafPageTrackingController,
 * whose gates are behaviour-tested in mushafPageTracking.test.ts. This pins
 * that every event is forwarded. Design 2026-10-21 §4.2-4.3.
 */
const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/mushaf.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('Mushaf reader page tracking wiring', () => {
  it('no longer credits the surah start page on open', () => {
    expect(src).not.toMatch(/notePageRead\(\s*currentPage\s*\)/);
    expect(src).not.toMatch(/debounceRef/);
  });

  it('renders one segment per page and records through the controller', () => {
    expect(src).toMatch(/groupAyatByPage\(\s*surahNumber\s*,\s*ayat\s*\)/);
    expect(src).toMatch(/new MushafPageTrackingController\(/);
    expect(src).toMatch(/notePageRead\(\s*page\s*\)/);
  });

  it('follows screen focus, because tabs keep the reader mounted', () => {
    expect(src).toMatch(/useFocusEffect\(/);
    expect(src).toMatch(/setFocused\(\s*true/);
    expect(src).toMatch(/setFocused\(\s*false/);
    expect(src).toMatch(/clearInterval\(/);
  });

  it('forwards app state and the ayat load status', () => {
    expect(src).toMatch(/AppState\.addEventListener\(\s*'change'/);
    expect(src).toMatch(/setAppActive\(/);
    expect(src).toMatch(/setContentReady\(\s*ayatStatus === 'success'/);
  });

  it('forwards every layout and scroll measurement', () => {
    expect(src).toMatch(/setSegmentLayout\(\s*segment\.page/);
    expect(src).toMatch(/setBodyY\(/);
    expect(src).toMatch(/setViewportHeight\(/);
    expect(src).toMatch(/onScroll\(\s*e\.nativeEvent\.contentOffset\.y/);
    expect(src).toMatch(/retainPages\(/);
  });

  it('keeps the meta line on the surah start page (frame 2349:982)', () => {
    expect(src).toMatch(/surahStartPage\(\s*surahNumber\s*\)/);
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/mushafPageTrackingWiring.test.ts`
Expected: FAIL on every test except the last.

**Step 3: Implementation** in `app/(tabs)/sections/mushaf.tsx`:

1. Imports:
   - `:24` → `import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';`
   - `:25` → `import React, { useCallback, useEffect, useMemo, useState } from 'react';` (`useRef` is removed; its only user was the deleted debounce)
   - `:26` → `import { AppState, type AppStateStatus, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
   - add `import { MushafPageTrackingController, groupAyatByPage } from '@/services/mushafPageTracking';`
2. In `ReadingView`:
   - Delete `const notePageRead = useProgressStore((s) => s.notePageRead);` (`:153`).
   - Replace the comment at `:156-157` with `// The meta line shows the surah's first page (frame 2349:982); reading is tracked per page below.`
   - Delete the debounced recorder (`:166-176`).
3. After `const displayName = …` (`:160`), add:

```tsx
  const segments = useMemo(() => groupAyatByPage(surahNumber, ayat), [surahNumber, ayat]);

  // Page-read tracking (design 2026-10-21 §4.3). Every gate lives in the
  // controller; this component only forwards events to it.
  const [tracking] = useState(
    () =>
      new MushafPageTrackingController({
        onRead: (page) => {
          useProgressStore.getState().notePageRead(page).catch(() => undefined);
        },
      }),
  );

  // Tabs keep this screen mounted behind other tabs: count time only while focused.
  useFocusEffect(
    useCallback(() => {
      tracking.setFocused(true, Date.now());
      const tick = setInterval(() => tracking.tick(Date.now()), 1000);
      return () => {
        clearInterval(tick);
        tracking.setFocused(false, Date.now());
      };
    }, [tracking]),
  );

  useEffect(() => {
    tracking.setAppActive(AppState.currentState === 'active', Date.now());
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      tracking.setAppActive(s === 'active', Date.now());
    });
    return () => sub.remove();
  }, [tracking]);

  // AsyncContent unmounts the segments unless the status is 'success'.
  useEffect(() => {
    tracking.setContentReady(ayatStatus === 'success', Date.now());
  }, [tracking, ayatStatus]);

  useEffect(() => {
    tracking.retainPages(segments.map((s) => s.page));
  }, [tracking, segments]);
```

4. `ScrollView` (`:204`):

```tsx
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={250}
        onLayout={(e) => tracking.setViewportHeight(e.nativeEvent.layout.height)}
        onScroll={(e) => tracking.onScroll(e.nativeEvent.contentOffset.y, Date.now())}
      >
```

5. Wrap `<AsyncContent …>` (`:219-241`) in `<View onLayout={(e) => tracking.setBodyY(e.nativeEvent.layout.y)}> … </View>` (no style). Replace its single `<Text>` child (`:227-240`) with:

```tsx
          {segments.map((segment) => (
            <Text
              key={segment.page}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                tracking.setSegmentLayout(segment.page, y, height);
              }}
              style={[
                styles.ayatBody,
                { fontSize: ayatFontSize, lineHeight: ayatLineHeight },
              ]}
            >
              {segment.ayat.map((a, i) => (
                <React.Fragment key={a.number}>
                  {a.text}
                  <AyahNum n={String(a.number)} />
                  {i < segment.ayat.length - 1 ? ' ' : ''}
                </React.Fragment>
              ))}
            </Text>
          ))}
```

Do not touch `styles` (`:300-386`), the header, the meta line (`:188-193`), the footer (`:244-254`), `ListView`, or the resume path (`:41-108`).

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/mushafPageTrackingWiring.test.ts __tests__/mushafPageTracking.test.ts __tests__/mushafPresentation.test.ts __tests__/designTokens.test.ts && npx tsc --noEmit --pretty false && npm run lint 2>&1 | grep -E "sections/mushaf.tsx" -A 2`
Expected: PASS; tsc clean; no lint output for `mushaf.tsx`.

**Step 5: Commit**

```bash
git add "app/(tabs)/sections/mushaf.tsx" __tests__/mushafPageTrackingWiring.test.ts
git commit -m "feat(mushaf): record each page as it is read instead of on open"
```

---

## Task 9: Repository totals — pages read, lectures listened

**Files:**
- Modify: `constants/progress.ts` (append `LECTURE_LISTENED_MIN_SEC` after `COMPLETION_THRESHOLD`, `:32`)
- Modify: `db/helpers/lectureCompletion.ts` (import on line 6; add `isListened`)
- Modify: `db/types.ts:58-86` (`totalPagesRead`), `:88-101` (`listenedCount`)
- Modify: `db/repositories/pageReads.ts` (method before `currentStreak`, `:94`)
- Modify: `db/repositories/lectureSessions.ts` (import; method before `totalListenedSec`, `:112`)
- Modify: `db/web-shim.ts` (`pageReads` before `currentStreak`; `lectureSessions` before `totalListenedSec`, `:336`; the `lectureCompletion` import)
- Test: `__tests__/lecture-completion.test.ts` (append), `__tests__/pageReadsRepo.test.ts` (append)

**Step 1: Write the failing tests.**

In `__tests__/lecture-completion.test.ts`, change the import to `import { forwardDelta, isCompleted, isListened } from '../db/helpers/lectureCompletion';` and append:

```ts
describe('isListened', () => {
  const s = (over: Partial<{ durationSec: number; forwardListenedSec: number; completed: boolean }>) => ({
    durationSec: 1000,
    forwardListenedSec: 0,
    completed: false,
    ...over,
  });

  it('counts 60 s of forward listening', () => {
    expect(isListened(s({ forwardListenedSec: 60 }))).toBe(true);
  });

  it('does not count 59 s', () => {
    expect(isListened(s({ forwardListenedSec: 59 }))).toBe(false);
  });

  it('counts a completed lecture whatever its forward time', () => {
    expect(isListened(s({ completed: true, forwardListenedSec: 0 }))).toBe(true);
  });

  it('counts a clip shorter than 60 s once played through', () => {
    expect(isListened(s({ durationSec: 45, forwardListenedSec: 45 }))).toBe(true);
    expect(isListened(s({ durationSec: 45, forwardListenedSec: 44 }))).toBe(false);
  });

  it('never counts a zero-duration session', () => {
    expect(isListened(s({ durationSec: 0, forwardListenedSec: 0 }))).toBe(false);
  });
});
```

Append to `__tests__/pageReadsRepo.test.ts`:

```ts
describe('progress totals (web shim)', () => {
  afterEach(() => jest.useRealTimers());

  it('totalPagesRead sums pages over days, counting a re-read on a new day', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 20, 10, 0, 0) });
    const { pageReads } = createWebRepos();
    await pageReads.recordPageRead(1);
    await pageReads.recordPageRead(2);
    jest.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));
    await pageReads.recordPageRead(1);
    expect(await pageReads.totalPagesRead()).toBe(3);
  });

  it('listenedCount counts listened lectures and reset clears both totals', async () => {
    const repos = createWebRepos();
    const base = { title: 't', author: 'a', durationSec: 1000, nowMs: 1 };
    await repos.lectureSessions.upsertSession({ ...base, lectureId: 'l1', positionSec: 60, forwardListenedDelta: 60 });
    await repos.lectureSessions.upsertSession({ ...base, lectureId: 'l2', positionSec: 30, forwardListenedDelta: 30 });
    await repos.lectureSessions.upsertSession({ ...base, lectureId: 'l3', positionSec: 960, forwardListenedDelta: 0 });
    await repos.pageReads.recordPageRead(9);
    expect(await repos.lectureSessions.listenedCount()).toBe(2); // l1 (60 s) + l3 (completed)
    expect(await repos.lectureSessions.completedCount()).toBe(1);
    expect(await repos.pageReads.totalPagesRead()).toBe(1);

    await repos.reset.resetAll(5000);
    expect(await repos.lectureSessions.listenedCount()).toBe(0);
    expect(await repos.pageReads.totalPagesRead()).toBe(0);
  });
});
```

**Step 2: Run them — they must fail**

Run: `npx jest __tests__/lecture-completion.test.ts __tests__/pageReadsRepo.test.ts`
Expected: FAIL (`isListened` is not exported; `pageReads.totalPagesRead is not a function`).

**Step 3: Minimal implementation.**

`constants/progress.ts`, after `COMPLETION_THRESHOLD`:

```ts
/**
 * A lecture counts as "listened" (Library card محاضرات مسموعة) once this much
 * real forward listening is recorded — or the whole clip, if shorter — or it
 * reached COMPLETION_THRESHOLD. Design 2026-10-21 §4.5.
 */
export const LECTURE_LISTENED_MIN_SEC = 60;
```

`db/helpers/lectureCompletion.ts`: change line 6 to `import { COMPLETION_THRESHOLD, LECTURE_LISTENED_MIN_SEC } from '@/constants/progress';` (a second import line for the same module trips `import/no-duplicates`), then append:

```ts
/** Mirrors the SQL predicate in `lectureSessions.listenedCount()`. */
export function isListened(s: {
  durationSec: number;
  forwardListenedSec: number;
  completed: boolean;
}): boolean {
  if (s.completed) return true;
  if (!(s.durationSec > 0)) return false;
  return s.forwardListenedSec >= Math.min(LECTURE_LISTENED_MIN_SEC, s.durationSec);
}
```

`db/types.ts`: in `PageReadsRepository`, after `pagesReadInMonth`:

```ts
  /** All-time SUM(khz_days.pages_read) — pages read summed over days. */
  totalPagesRead(): Promise<number>;
```

In `LectureSessionsRepository`, after `completedCount`:

```ts
  /** Sessions that are completed or have ≥ LECTURE_LISTENED_MIN_SEC (or the whole clip) of forward listening. */
  listenedCount(): Promise<number>;
```

`db/repositories/pageReads.ts`, before `async currentStreak()`:

```ts
    async totalPagesRead() {
      const row = await db.getFirstAsync<{ n: number | null }>(
        'SELECT COALESCE(SUM(pages_read), 0) AS n FROM khz_days',
      );
      return row?.n ?? 0;
    },
```

`db/repositories/lectureSessions.ts`: add `import { LECTURE_LISTENED_MIN_SEC } from '@/constants/progress';`, and before `async totalListenedSec()`:

```ts
    async listenedCount() {
      // Mirrors isListened() in ../helpers/lectureCompletion.
      const row = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM khz_lecture_sessions
           WHERE completed = 1
              OR (duration_sec > 0 AND forward_listened_sec >= MIN(?, duration_sec))`,
        LECTURE_LISTENED_MIN_SEC,
      );
      return row?.n ?? 0;
    },
```

`db/web-shim.ts`: add `isListened` to the existing `./helpers/lectureCompletion` import. In `pageReads`, before `async currentStreak()`:

```ts
    async totalPagesRead() {
      await load();
      return Object.values(ensure().days).reduce((acc, d) => acc + d.pagesRead, 0);
    },
```

In `lectureSessions`, before `async totalListenedSec()`:

```ts
    async listenedCount() {
      await load();
      return Object.values(ensure().lectures).filter(isListened).length;
    },
```

**Step 4: Run them — they must pass**

Run: `npx jest __tests__/lecture-completion.test.ts __tests__/pageReadsRepo.test.ts __tests__/reset.test.ts && npx tsc --noEmit --pretty false`
Expected: PASS; clean.

**Step 5: Commit**

```bash
git add constants/progress.ts db/helpers/lectureCompletion.ts db/types.ts db/repositories/pageReads.ts db/repositories/lectureSessions.ts db/web-shim.ts __tests__/lecture-completion.test.ts __tests__/pageReadsRepo.test.ts
git commit -m "feat(progress): add total-pages-read and lectures-listened aggregates"
```

---

## Task 10: Expose the totals from `progressStore`

**Files:**
- Modify: `store/progressStore.ts`: `ProgressSnapshot`, `EMPTY`, `hydrate`, `notePageRead`, `noteLectureTick` (`:210-231`)
- Test: `__tests__/progressStore-stats.test.ts` (append; its mocks already include `totalPagesRead` / `listenedCount` from Task 7)

**Step 1: Write the failing test.** Append:

```ts
describe('progressStore library stats', () => {
  it('hydrates totalPagesRead and listenedLectureCount', async () => {
    mockTotalPagesRead.mockResolvedValueOnce(42);
    mockListenedCount.mockResolvedValueOnce(5);
    await useProgressStore.getState().hydrate();
    expect(useProgressStore.getState().totalPagesRead).toBe(42);
    expect(useProgressStore.getState().listenedLectureCount).toBe(5);
  });

  it('refreshes totalPagesRead after a newly recorded page', async () => {
    mockRecordPageRead.mockResolvedValueOnce(true);
    mockTotalPagesRead.mockResolvedValue(43);
    await useProgressStore.getState().notePageRead(3);
    expect(useProgressStore.getState().totalPagesRead).toBe(43);
  });

  it('refreshes listenedLectureCount on a lecture tick', async () => {
    await useProgressStore.getState().refreshAll(); // resets the tick throttle
    mockListenedCount.mockResolvedValue(6);
    await useProgressStore.getState().noteLectureTick({
      lectureId: 'l1', title: 't', author: 'a', durationSec: 1000, positionSec: 70, forwardListenedDelta: 1,
    });
    expect(useProgressStore.getState().listenedLectureCount).toBe(6);
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/progressStore-stats.test.ts`
Expected: the new tests FAIL (`totalPagesRead` is `undefined`); the Task 7 tests still pass.

**Step 3: Minimal implementation** in `store/progressStore.ts`:
- `ProgressSnapshot`: add `totalPagesRead: number;` and `listenedLectureCount: number;`. Add both as `0` in `EMPTY`.
- `hydrate`: add `progressRepo.totalPagesRead()` and `lectureRepo.listenedCount()` to the `Promise.all` and the destructuring, and set both.
- `notePageRead`: add `progressRepo.totalPagesRead()` to its refresh `Promise.all` and set `totalPagesRead`.
- `noteLectureTick`: add `lectureRepo.listenedCount()` to its `Promise.all` and set `listenedLectureCount`.

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/progressStore-stats.test.ts __tests__/progressStore-dbFailed.test.ts __tests__/wirdStore.test.ts && npx tsc --noEmit --pretty false`
Expected: PASS; clean.

**Step 5: Commit**

```bash
git add store/progressStore.ts __tests__/progressStore-stats.test.ts
git commit -m "feat(progress): expose total pages read and lectures listened in the store"
```

---

## Task 11: Arabic number agreement and card subtitles

**Files:**
- Create: `services/libraryStats.ts`
- Test: `__tests__/libraryStats.test.ts`

**Step 1: Write the failing test** `__tests__/libraryStats.test.ts`:

```ts
import {
  juzCompletedSubtitle,
  lecturesListenedSubtitle,
  pagesReadSubtitle,
} from '@/services/libraryStats';

describe('Library progress subtitles (design §4.4)', () => {
  it('pages: zero state, then 1 / 2 / 3–10 / 11+ agreement', () => {
    expect(pagesReadSubtitle(0)).toBe('لم تبدأ بعد');
    expect(pagesReadSubtitle(1)).toBe('صفحة واحدة');
    expect(pagesReadSubtitle(2)).toBe('صفحتان');
    expect(pagesReadSubtitle(3)).toBe('٣ صفحات');
    expect(pagesReadSubtitle(10)).toBe('١٠ صفحات');
    expect(pagesReadSubtitle(11)).toBe('١١ صفحة');
    expect(pagesReadSubtitle(21)).toBe('٢١ صفحة');
    expect(pagesReadSubtitle(100)).toBe('١٠٠ صفحة');
    expect(pagesReadSubtitle(103)).toBe('١٠٣ صفحات');
  });

  it('lectures: zero state, agreement, and the completed count', () => {
    expect(lecturesListenedSubtitle(0, 0)).toBe('لم تستمع بعد');
    expect(lecturesListenedSubtitle(1, 0)).toBe('محاضرة واحدة');
    expect(lecturesListenedSubtitle(2, 0)).toBe('محاضرتان');
    expect(lecturesListenedSubtitle(4, 0)).toBe('٤ محاضرات');
    expect(lecturesListenedSubtitle(11, 0)).toBe('١١ محاضرة');
    expect(lecturesListenedSubtitle(1, 1)).toBe('محاضرة واحدة • المكتملة ١');
    expect(lecturesListenedSubtitle(12, 4)).toBe('١٢ محاضرة • المكتملة ٤');
  });

  it('juz: always out of thirty', () => {
    expect(juzCompletedSubtitle(0)).toBe('٠ من ٣٠');
    expect(juzCompletedSubtitle(3)).toBe('٣ من ٣٠');
  });

  it('never uses the middle dot, which reads as ٠ between Arabic digits', () => {
    expect(lecturesListenedSubtitle(12, 4)).not.toContain('·');
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/libraryStats.test.ts`
Expected: FAIL with `Cannot find module '@/services/libraryStats'`.

**Step 3: Minimal implementation** `services/libraryStats.ts`:

```ts
/**
 * Subtitles for the Library `progressStats` row (design 2026-10-21 §4.4).
 * Pure so the copy is pinned without rendering. Separators use `•`: the
 * middle dot reads as ٠ between Arabic-Indic digits (see mushafNavigation).
 */
import { JUZ_PAGE_RANGES, toArabicDigits } from '@/constants/progress';

export type CountForms = { one: string; two: string; few: string; many: string };

/**
 * Arabic number–noun agreement for n ≥ 1: 1 and 2 have their own words
 * (واحدة / the dual); when the last two digits are 3–10 the noun is plural
 * (٣ صفحات، ١٠٣ صفحات); otherwise it is singular (١١ صفحة، ١٠٠ صفحة).
 */
export function arabicCount(n: number, forms: CountForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const lastTwo = n % 100;
  const noun = lastTwo >= 3 && lastTwo <= 10 ? forms.few : forms.many;
  return `${toArabicDigits(n)} ${noun}`;
}

const PAGE_FORMS: CountForms = { one: 'صفحة واحدة', two: 'صفحتان', few: 'صفحات', many: 'صفحة' };
const LECTURE_FORMS: CountForms = {
  one: 'محاضرة واحدة',
  two: 'محاضرتان',
  few: 'محاضرات',
  many: 'محاضرة',
};

export function pagesReadSubtitle(total: number): string {
  return total > 0 ? arabicCount(total, PAGE_FORMS) : 'لم تبدأ بعد';
}

export function juzCompletedSubtitle(completed: number): string {
  return `${toArabicDigits(completed)} من ${toArabicDigits(JUZ_PAGE_RANGES.length)}`;
}

/** "المكتملة N" avoids an adjective that would have to agree with N. */
export function lecturesListenedSubtitle(listened: number, completed: number): string {
  if (listened <= 0) return 'لم تستمع بعد';
  const head = arabicCount(listened, LECTURE_FORMS);
  return completed > 0 ? `${head} • المكتملة ${toArabicDigits(completed)}` : head;
}
```

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/libraryStats.test.ts`
Expected: 4 PASS.

**Step 5: Commit**

```bash
git add services/libraryStats.ts __tests__/libraryStats.test.ts
git commit -m "feat(library): Arabic number agreement for the progress stat cards"
```

---

## Task 12: `progressStats` in the Library presentation contract

**Files:**
- Modify: `constants/libraryPresentation.ts:27-33`, `:40-56` (`completedLectures` → `progressStats`); add `LIBRARY_PROGRESS_STAT_ORDER` after `:61-67`
- Test: `__tests__/libraryPresentation.test.ts:44-52`, `:69-73`, `:104-117`

**Step 1: Write the failing test.** In `__tests__/libraryPresentation.test.ts`:
- "keeps the newer metrics rather than deleting them" (`:44-52`): the expected sorted array becomes `['insights', 'progressStats', 'wirdHistory', 'wirdSuggestion', 'wirdTrend']`.
- "keeps the audiobook, reminder, and suggestion sections as visible as before" (`:104-117`): change `'completedLectures'` to `'progressStats'`.
- Add `LIBRARY_PROGRESS_STAT_ORDER` to the import. After the "Library summary cards" describe (`:69-73`), add:

```ts
describe('Library progress stats row (no frame — design 2026-10-21 §4.4)', () => {
  it('orders the cards physical left to right so pages read first at the right', () => {
    expect(LIBRARY_PROGRESS_STAT_ORDER).toEqual(['lectures', 'juz', 'pages']);
  });

  it('sits where completedLectures sat: last, below the whole frame', () => {
    expect(LIBRARY_SECTION_ORDER[LIBRARY_SECTION_ORDER.length - 1]).toBe('progressStats');
    expect(LIBRARY_SECTION_ORDER).not.toContain('completedLectures');
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/libraryPresentation.test.ts`
Expected: FAIL.

**Step 3: Minimal implementation** in `constants/libraryPresentation.ts`. Replace `'completedLectures'` with `'progressStats'` in `LIBRARY_EXTENSION_SECTIONS` and `LIBRARY_SECTION_ORDER`, keeping the same (last) position. After `LibrarySummaryCardKey`, add:

```ts
/**
 * The progress row below the frame (no Figma frame — contract:
 * libraryLayout STAT_CARD + PHYSICAL_ROW). Physical left → right:
 * محاضرات مسموعة، الأجزاء المكتملة، صفحات مقروءة.
 */
export const LIBRARY_PROGRESS_STAT_ORDER = Object.freeze(['lectures', 'juz', 'pages'] as const);

export type LibraryProgressStatKey = (typeof LIBRARY_PROGRESS_STAT_ORDER)[number];
```

Leave `SECTION_FILTERS` alone: `progressStats` isn't in it, so it shows under every filter, as `completedLectures` did.

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/libraryPresentation.test.ts`
Expected: PASS. tsc **will** now fail in `app/(tabs)/library.tsx` (`completedLectures` is no longer a `LibrarySectionKey`). That is expected. **Do not commit yet** — Task 13 fixes the error, and Tasks 12 and 13 go into one commit so no commit on the branch fails typecheck.

---

## Task 13: Render the `progressStats` row

**Files:**
- Modify: `app/(tabs)/library.tsx`: imports `:20-26` and near `:61`; selectors after `completedLectureCount`; `progressStatCards` after the `summaryCards` record; the `completedLectures` section (`:617-629` before Task 7's deletions, so look it up by name)
- Test: `__tests__/libraryProgressWiring.test.ts` (append)

**Step 1: Write the failing test.** Append to `__tests__/libraryProgressWiring.test.ts`:

```ts
describe('Library progressStats row', () => {
  it('renders the three cards from the physical-order contract inside the frame row style', () => {
    expect(src).toMatch(/progressStats:\s*\(\s*<View style=\{styles\.statsRow\}>/);
    expect(src).toMatch(/LIBRARY_PROGRESS_STAT_ORDER\.map\(/);
  });

  it('feeds every card from the progress store, not a literal', () => {
    expect(src).toMatch(/pagesReadSubtitle\(\s*totalPagesRead\s*\)/);
    expect(src).toMatch(/juzCompletedSubtitle\(\s*completedJuzCount\s*\)/);
    expect(src).toMatch(/lecturesListenedSubtitle\(\s*listenedLectureCount\s*,\s*completedLectureCount\s*\)/);
  });

  it('leaves the frame summary row untouched', () => {
    expect(src).toMatch(/LIBRARY_SUMMARY_CARD_ORDER\.map\(/);
    expect(src).toMatch(/title="ورد القرآن"/);
    expect(src).toMatch(/title="ملاحظاتي"/);
    expect(src).toMatch(/title="تذكيراتي"/);
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/libraryProgressWiring.test.ts`
Expected: the first two new tests FAIL.

**Step 3: Implementation** in `app/(tabs)/library.tsx`:
1. Add `LIBRARY_PROGRESS_STAT_ORDER` and `type LibraryProgressStatKey` to the `@/constants/libraryPresentation` import. Add `import { juzCompletedSubtitle, lecturesListenedSubtitle, pagesReadSubtitle } from '@/services/libraryStats';`.
2. After `const completedLectureCount = …`, add:

```tsx
  const totalPagesRead = useProgressStore((s) => s.totalPagesRead);
  const completedJuzCount = useProgressStore((s) => s.completedJuzCount);
  const listenedLectureCount = useProgressStore((s) => s.listenedLectureCount);
```

3. After the `summaryCards` record, add:

```tsx
  // Below the frame (no Figma frame — design 2026-10-21 §4.4). Same StatCard,
  // geometry and PHYSICAL_ROW as the frame's summary row.
  const progressStatCards: Record<LibraryProgressStatKey, React.ReactNode> = {
    lectures: (
      <StatCard
        title="محاضرات مسموعة"
        subtitle={lecturesListenedSubtitle(listenedLectureCount, completedLectureCount)}
        icon={<HeadphonesGlyph size={STAT_GLYPH} />}
      />
    ),
    juz: (
      <StatCard
        title="الأجزاء المكتملة"
        subtitle={juzCompletedSubtitle(completedJuzCount)}
        icon={<FigmaIcon name="SectionQuran" size={STAT_GLYPH} color={KhazainColors.navy800} />}
      />
    ),
    pages: (
      <StatCard
        title="صفحات مقروءة"
        subtitle={pagesReadSubtitle(totalPagesRead)}
        icon={<FigmaIcon name="LibraryWird" size={STAT_GLYPH} color={KhazainColors.navy800} />}
      />
    ),
  };
```

`SectionQuran` and `LibraryWird` are both monochrome (`components/khazain/icons/generated/figmaIcons.ts`), so `color` takes effect.

4. Replace the `completedLectures: ( … ),` entry with:

```tsx
    // Physical left → right: محاضرات مسموعة، الأجزاء المكتملة، صفحات مقروءة.
    progressStats: (
      <View style={styles.statsRow}>
        {LIBRARY_PROGRESS_STAT_ORDER.map((key) => (
          <React.Fragment key={key}>{progressStatCards[key]}</React.Fragment>
        ))}
      </View>
    ),
```

Leave `HeadphonesGlyph`, `styles`, and every frame section as they are.

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/libraryProgressWiring.test.ts __tests__/libraryPresentation.test.ts __tests__/fontScaleChrome.test.ts __tests__/rtlPhysicalContract.test.ts && npx tsc --noEmit --pretty false && npm run lint 2>&1 | grep -E "\(tabs\)/library.tsx|libraryPresentation|libraryStats" -A 2`
Expected: PASS; tsc clean; no lint output.

**Step 5: Commit (Tasks 12 + 13 together)**

```bash
git add constants/libraryPresentation.ts __tests__/libraryPresentation.test.ts "app/(tabs)/library.tsx" __tests__/libraryProgressWiring.test.ts
git commit -m "feat(library): show pages read, juz completed and lectures listened"
```

---

## Task 14: Full CC BY 3.0 notice on About

**Files:**
- Modify: `constants/quranPages.ts` (append the notice constants)
- Modify: `app/settings-about.tsx`: imports `:1-8`; generalise `openFoundationWebsite` (`:24-34`) into `openExternalUrl`; new card after the `موقع المؤسسة` `Pressable` (`:63-74`); styles (`:131-143`)
- Test: `__tests__/quranPageNotice.test.ts` (new; `fs`/`path` imported at the top)

**Step 1: Write the failing test** `__tests__/quranPageNotice.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
import {
  QURAN_PAGE_DATA_CHANGES,
  QURAN_PAGE_DATA_CREDIT,
  QURAN_PAGE_DATA_LICENSE_LABEL,
  QURAN_PAGE_DATA_LICENSE_URL,
} from '@/constants/quranPages';

const about = fs.readFileSync(path.resolve(__dirname, '../app/settings-about.tsx'), 'utf8');
const data = fs.readFileSync(path.resolve(__dirname, '../constants/quranPageData.ts'), 'utf8');

/** CC BY 3.0 requires credit, the licence URI and a note of changes (design §4.6). */
describe('CC BY 3.0 notice for the Tanzil page data', () => {
  it('names the source, the licence URI and the changes', () => {
    expect(QURAN_PAGE_DATA_CREDIT).toContain('Tanzil.net');
    expect(QURAN_PAGE_DATA_LICENSE_URL).toBe('https://creativecommons.org/licenses/by/3.0/');
    expect(QURAN_PAGE_DATA_LICENSE_LABEL).toContain('CC BY 3.0');
    expect(QURAN_PAGE_DATA_CHANGES.length).toBeGreaterThan(0);
  });

  it('is rendered on About with a tappable licence link', () => {
    expect(about).toMatch(/مصادر البيانات/);
    expect(about).toMatch(/\{QURAN_PAGE_DATA_CREDIT\}/);
    expect(about).toMatch(/\{QURAN_PAGE_DATA_CHANGES\}/);
    expect(about).toMatch(/accessibilityRole="link"/);
    expect(about).toMatch(/openExternalUrl\(\s*QURAN_PAGE_DATA_LICENSE_URL\s*\)/);
  });

  it('opens links through canOpenURL with the Arabic fallback alert', () => {
    expect(about).toMatch(/async function openExternalUrl\(url: string\)/);
    expect(about).toMatch(/Linking\.canOpenURL\(url\)/);
    expect(about).toMatch(/Alert\.alert\('الرابط غير متاح'/);
  });

  it('keeps the licence and source in the generated data header', () => {
    expect(data).toContain('Creative Commons');
    expect(data).toContain('https://creativecommons.org/licenses/by/3.0/');
    expect(data).toContain('https://tanzil.net/res/text/metadata/quran-data.js');
  });
});
```

**Step 2: Run it — it must fail**

Run: `npx jest __tests__/quranPageNotice.test.ts`
Expected: FAIL (the constants are not exported).

**Step 3: Implementation.**

Append to `constants/quranPages.ts`:

```ts
/**
 * CC BY 3.0 notice for the page/juz data, rendered in app/settings-about.tsx.
 * The licence requires credit, the licence URI and a note of changes.
 */
export const QURAN_PAGE_DATA_CREDIT =
  'تقسيم صفحات المصحف وأجزائه: بيانات Tanzil.net (Quran Metadata 1.0، ٢٠٠٨–٢٠٠٩)';
export const QURAN_PAGE_DATA_CHANGES = 'التعديلات: تحويل الصيغة فقط دون تغيير القيم.';
export const QURAN_PAGE_DATA_LICENSE_LABEL = 'الرخصة: CC BY 3.0';
export const QURAN_PAGE_DATA_LICENSE_URL = 'https://creativecommons.org/licenses/by/3.0/';
```

In `app/settings-about.tsx`:
- Add the import:

```ts
import {
  QURAN_PAGE_DATA_CHANGES,
  QURAN_PAGE_DATA_CREDIT,
  QURAN_PAGE_DATA_LICENSE_LABEL,
  QURAN_PAGE_DATA_LICENSE_URL,
} from '@/constants/quranPages';
```

- Replace `openFoundationWebsite` (`:24-34`) with:

```ts
/** canOpenURL + Arabic fallback alert — the repo's external-link pattern. */
async function openExternalUrl(url: string) {
  if (!url) return;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) throw new Error('cannot open');
    await Linking.openURL(url);
  } catch {
    Alert.alert('الرابط غير متاح', 'تعذّر فتح الرابط على هذا الجهاز.');
  }
}

function openFoundationWebsite() {
  void openExternalUrl(MORE_EXTERNAL_URLS.web);
}
```

- After the `موقع المؤسسة` `</Pressable>`, add:

```tsx
        {/* CC BY 3.0 notice for the mushaf page/juz data (constants/quranPageData.ts). */}
        <View style={[styles.linkCard, KhazainShadows.card]}>
          <Text style={styles.linkTitle}>مصادر البيانات</Text>
          <Text style={styles.creditValue}>{QURAN_PAGE_DATA_CREDIT}</Text>
          <Text style={styles.creditValue}>{QURAN_PAGE_DATA_CHANGES}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={QURAN_PAGE_DATA_LICENSE_LABEL}
            hitSlop={8}
            onPress={() => void openExternalUrl(QURAN_PAGE_DATA_LICENSE_URL)}
          >
            <Text style={styles.linkValue}>{QURAN_PAGE_DATA_LICENSE_LABEL}</Text>
          </Pressable>
        </View>
```

- Styles, after `linkValue`: `creditValue: textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),`

`linkCard` already spreads `PHYSICAL_BOX` with `alignItems: 'flex-end'` (`:131-140`), so the card sits at the physical right with no extra work. **Settings-branch conflict (design §10):** keep both cards and this `openExternalUrl` helper.

**Step 4: Run it — it must pass**

Run: `npx jest __tests__/quranPageNotice.test.ts __tests__/rtlPhysicalContract.test.ts && npx tsc --noEmit --pretty false && npm run lint 2>&1 | grep -E "settings-about|quranPages" -A 2`
Expected: PASS; clean.

**Step 5: Commit**

```bash
git add constants/quranPages.ts app/settings-about.tsx __tests__/quranPageNotice.test.ts
git commit -m "feat(about): show the CC BY 3.0 notice for the mushaf page data"
```

---

## Task 15: Full verification and QA

**Step 1: Automated gates**

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "constants/(progress|quranPages|quranPageData|libraryPresentation)\.ts|services/(mushafPageTracking|libraryStats)\.ts|db/(types|web-shim)\.ts|db/repositories/(pageReads|lectureSessions)\.ts|db/helpers/lectureCompletion\.ts|store/progressStore\.ts|sections/mushaf\.tsx|\(tabs\)/library\.tsx|settings-about\.tsx" -A 2
git log --oneline 0635ea1..HEAD
```

Expected:
- jest: **81 suites, 897 passed, 1 skipped** (planning dry run of v2; baseline 73 / 828).
- tsc: clean.
- The lint grep prints only the pre-existing `@typescript-eslint/array-type` warnings on the untouched `JUZ_PAGE_RANGES` / `STREAK_MILESTONES` / `SURAH_START_PAGES` declarations in `constants/progress.ts`, the pre-existing unused `median` in `db/web-shim.ts`, and `import/first` on the new `jest.mock`-before-import test files (`pageReadsRepo`, `progressStore-stats` — the same pattern `progressStore-dbFailed.test.ts` already warns on). Nothing in production code this plan adds.
- `git log`: the plan commits plus **13** task commits (Tasks 1–11 and 14 one each, 12+13 together).

**Step 2: Visual QA — iOS simulator.** Use argent: run `list-devices` and prefer a simulator that is already booted. Load the `argent-device-interact`, `argent-react-native-app-workflow` and `argent-screenshot-diff` skills. No native code changed, so a Metro reload is enough. Run `EXPO_PUBLIC_VISUAL_AUDIT=1 npm start`.

| # | Route / state | Compare against | Must hold |
|---|---|---|---|
| V1 | `/library`, filter الكل, first viewport | `docs/audit/2026-09-09/figma-reference/06-2031-4659.png` (main checkout) and `$QA/baseline/06-2031-4659__library.png` | `npm run capture:ios -- --out $QA/after --node 2031:4659`, then `screenshot-diff` against the baseline: **no diff** except live data (counts, relative times, the wird-card page). The summary row is still تذكيراتي / ورد القرآن / ملاحظاتي |
| V2 | `/library`, الكل, scrolled to the bottom (below the fold) | No frame. Contract: `libraryLayout.ts` `STAT_CARD`, `constants/layout.ts` `PHYSICAL_ROW`, `constants/typography.ts` via `StatCard` | One row of three 115-wide cards under التذكيرات الذكية, physical left → right محاضرات مسموعة / الأجزاء المكتملة / صفحات مقروءة. Navy icons. No horizontal overflow at 393 pt. "محاضرات مكتملة" is gone |
| V3 | `/library`, filter السجل, bottom | No frame; same contracts | The `progressStats` row comes after the history, trend and insight extras |
| V4 | V2 at the largest Dynamic Type size (`xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`) | Contract `fontScaleChrome` (`CHROME_MAX_FONT_SCALE`) | Captions stay inside their cards, which grow to fit |
| V5 | `/sections/mushaf?surah=2`, loaded | `16-2349-982.png` and `$QA/baseline/16-2349-982__sections-mushaf__surah-2.png` | `npm run capture:ios -- --out $QA/after --node 2349:982`. Header, meta (`… • صفحة ٢ من ٦٠٤`) and footer are **identical** to the baseline. The body shows the 5 ayat as before |
| V6 | Cold start with `last_read_page > 1`, then open the Mushaf from الأقسام without a `surah` param | `15-2349-829.png` (by eye — a transition with no route) | A plain page surface while resuming, with no flash of the list |
| V7 | `/settings-about` | No frame. Contract: `PHYSICAL_BOX`, `textStyle` | The مصادر البيانات card sits at the physical right. "Tanzil.net" and "CC BY 3.0" are readable inside the Arabic lines. Tapping "الرخصة: CC BY 3.0" opens `creativecommons.org/licenses/by/3.0/` in the browser |

**Step 3: Functional QA** (same simulator; save screenshots under `$QA/after/functional/`):

1. **Reset:** More → الإعدادات → تقدّم القراءة → reset. The Library shows صفحات مقروءة "لم تبدأ بعد", الأجزاء المكتملة "٠ من ٣٠", محاضرات مسموعة "لم تستمع بعد", and the ring at 0 %.
2. **A fling is not a read:** open البقرة and back out within 3 s → nothing changes.
3. **Dwell reads a page:** open البقرة and wait at least 9 s. The Library then shows صفحات مقروءة "**صفحة واحدة**", the ring at 10 %, ورد القرآن "يوم واحد متتالي", and the wird card "سورة البقرة — صفحة ٢".
4. **Blur pauses (reader stays mounted):** reset. Open البقرة and wait 4 s. Switch to the مكتبتي tab for 20 s, then go back to الأقسام — the reader is still open. Wait 3 s and check the Library: still 0, because 7 s < 8 s. Return to the reader and wait 2 s more: it records.
5. **Background pauses:** reset. Open البقرة and wait 4 s. Press `button: home` and wait 20 s. Return, wait 3 s and check: still 0.
6. **A same-day re-read moves the wird card:** after step 3, terminate the app and run `sqlite3 "$DB" "UPDATE khz_settings SET value='77' WHERE key='last_read_page';"` (find `$DB` as in step 7). Relaunch. The wird card shows "سورة النساء — صفحة ٧٧". Go to الأقسام → قراءة القرآن → البقرة and wait at least 9 s. The Library wird card shows "سورة البقرة — صفحة ٢", and صفحات مقروءة stays "صفحة واحدة" (deduped).
7. **Juz completion and achievement (seeded, because the mock text only reaches page 2):** reset, terminate the app, then seed pages 1 and 3–21 as read yesterday:
   ```bash
   DB="$(xcrun simctl get_app_container booted com.ahmed.elhadarey94.khazayinapp data)/Documents/SQLite/khazain.db"
   Y=$(date -v-1d +%F)
   sqlite3 "$DB" "INSERT OR IGNORE INTO khz_page_reads (local_day,page_number,recorded_at) SELECT '$Y', value, 0 FROM (WITH RECURSIVE n(value) AS (SELECT 1 UNION ALL SELECT value+1 FROM n WHERE value<21) SELECT value FROM n WHERE value<>2); INSERT OR REPLACE INTO khz_days (local_day,pages_read,wird_target_at_day,wird_completed) VALUES ('$Y',20,10,1);"
   ```
   Relaunch, open البقرة and wait at least 9 s. Expect the toast **"أكملت الجزء ١"**. The Library shows الأجزاء المكتملة "١ من ٣٠", صفحات مقروءة "٢١ صفحة", and a streak of "٢ يوم متتالي". If the path is different, find it with `find "$(xcrun simctl get_app_container booted com.ahmed.elhadarey94.khazayinapp data)" -name khazain.db`.
8. **Lectures listened:** play a lecture that has an audio source for at least 70 s of real playback, without seeking. The Library shows محاضرات مسموعة "**محاضرة واحدة**". Seek to 96 % and wait for a tick: it shows "محاضرة واحدة • المكتملة ١".
9. **Restart keeps everything:** `restart-app`. The values from steps 7–8 are still there.
10. **Reset again:** everything goes back to the zero states from step 1.

Record the results, with screenshots and diff output, in `docs/plans/2026-10-21-reading-progress-tracking-qa.md` (mirror `docs/plans/2026-09-12-more-screen-qa.md`), including the **release note** from design §7. Commit with `docs(qa): reading progress tracking QA record`. When you're done, call `stop-all-simulator-servers` with `devices: [<the simulator UDID used>]`.

---

## Task index

0. Visual baselines — **DONE** (`$QA/baseline`)
1. Madani page table and `pageForAyah`
2. Correct the mid-page juz boundaries, with literal cross-checks (D1)
3. Page segments and in-view detection
4. `PageDwellTracker`
5. `MushafPageTrackingController` — focus, app-state and content gates
6. `last_read_page` moves on a same-day re-read (repository)
7. `lastReadPage` in the progress store; the Library wird card reads it
8. Record pages from the reader, not on open (`useFocusEffect` wiring)
9. Repository totals — pages read, lectures listened
10. Expose the totals from `progressStore`
11. Arabic number agreement and card subtitles
12. `progressStats` in the Library presentation contract (committed with 13)
13. Render the `progressStats` row
14. Full CC BY 3.0 notice on About
15. Full verification and QA

---

## Deviations (recorded during implementation)

1. **Task 1 — data provenance confirmed.** `quran-data.js` was fetched from Tanzil on 2026-10-21 and its sha256 matched the recorded `9e9930c5…4ca4`. The generator printed `ok 604 30 <same hash>` and produced a 103-line file. No deviation; this note records the check.
2. **Task 14 — `constants/quranPages.ts` header.** The Task 1 header said the notice constants "are added in Task 14". Once they were added, it became stale, so it was reworded in the Task 14 commit. The comment is the only change; no code changed.
3. **Task 14 — red step.** The fourth notice test ("keeps the licence and source in the generated data header") already passed at the red step, because Task 1 generated that header. The other three failed as the plan expected.
4. **Task 15 — lint expectation.** The plan predicted some pre-existing warnings would appear in the lint grep: `array-type` warnings in `constants/progress.ts`, the unused `median` in `db/web-shim.ts`, and `import/first` in the new test files. None of these is reported by this checkout's lint config. The grep over every touched production and test file printed nothing. The whole repo shows 0 errors and 15 warnings, all in files this branch does not touch.
5. **Task 15 — final counts.** `npx jest`: 81 suites, 897 passed, 1 skipped. This matches the planning dry run exactly. tsc exits 0.
