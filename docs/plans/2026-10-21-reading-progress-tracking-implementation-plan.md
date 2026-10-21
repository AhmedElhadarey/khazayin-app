# Reading & Listening Progress Tracking: Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Follow the repo's NON-NEGOTIABLE loop (CLAUDE.md §4): fresh implementer per task, TDD inside it, then spec review, then quality review. Commits carry **no** `Co-Authored-By` or any AI attribution. Never `--no-verify`. Do not push.

**Goal:** Close the audit gaps on Trello card HKTMbpu6. That means real per-page Quran reading tracking inside the existing scrolling reader, correct juz completion, and Library StatCards for pages read, juz completed and lectures listened. The Figma frames 2031:4659, 2349:982 and 2349:829 must stay intact.

**Architecture:** A generated Madani page table (Tanzil, CC BY 3.0) maps every ayah to its page. The reader renders one `<Text>` per page, and a pure `PageDwellTracker` records a page once it has been in view for 8 s. Two new SQLite aggregates, `totalPagesRead` and `listenedCount`, feed new store fields. A new extension StatCard row sits below the Library frame's last section.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, Zustand 5, expo-sqlite plus the web shim, jest-expo. No new dependencies.

**Design:** `docs/plans/2026-10-21-reading-progress-tracking-design.md`. Read it for the rationale. Every decision used below is already recorded there.

**Baseline (before Task 1):** `npx jest` gives 73 suites, 828 passed, 1 skipped. `npx tsc --noEmit --pretty false` is clean.

**Planning dry run:** every code block in Tasks 1–12 was applied to a throwaway worktree of `0635ea1` during planning. The result was `npx jest` with 80 suites, 880 passed, 1 skipped; `tsc` clean; and no new lint warnings in touched files. The data file was already typed `readonly AyahRef[]` and the `lectureCompletion` import already merged. Treat a different result as a signal to look closer, not as license to adjust the expectation.

**Worktree:** `/Users/ahmedelhadarey/samer/khazayin-worktrees/progress`, branch `feat/progress-page-tracking`. All paths below are relative to it.

---

## Task 0: Capture visual baselines (no code)

The frames must stay pixel-identical, so capture today's app first. That gives an app-vs-app diff alongside the Figma comparison.

1. Build and run on the iOS simulator (argent: `list-devices`, then load the `argent-ios-simulator-setup` and `argent-react-native-app-workflow` skills). Start Metro with `EXPO_PUBLIC_VISUAL_AUDIT=1 npm start`.
2. Run:
   ```bash
   npm run capture:ios -- --out /tmp/khazayin-capture/progress-before --node 2031:4659
   npm run capture:ios -- --out /tmp/khazayin-capture/progress-before --node 2349:982
   ```
3. With argent, take a full-resolution `screenshot` (scale 1.0, `includeImageInContext: false`) for each of these:
   - `/library` scrolled to the bottom, filter الكل → `library-bottom-before.png`
   - `/library` with filter السجل, scrolled to the bottom → `library-history-before.png`
   - `/settings-about` → `about-before.png`
4. Save everything under `/tmp/khazayin-capture/progress-before/`. Commit nothing.

---

## Task 1: Madani page table and `pageForAyah`

**Files:**
- Create: `constants/quranPageData.ts` (GENERATED — never hand-edit)
- Create: `constants/quranPages.ts`
- Test: `__tests__/quranPages.test.ts`

**Step 1: Write the failing test** at `__tests__/quranPages.test.ts`:

```ts
import { SURAH_START_PAGES } from '@/constants/progress';
import {
  JUZ_START_AYAHS,
  QURAN_PAGE_DATA_CREDIT,
  QURAN_PAGE_STARTS,
  pageForAyah,
} from '@/constants/quranPages';

/** Tanzil quran-data.js v1.0 (CC BY 3.0) — see the design doc §4.1. */
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
    expect(pageForAyah(3, 92)).toBe(62);
    expect(pageForAyah(3, 93)).toBe(62); // juz 4 begins mid-page
    expect(pageForAyah(5, 82)).toBe(121); // juz 7 begins mid-page
    expect(pageForAyah(114, 6)).toBe(604);
  });

  it('returns null for refs that are not ayat', () => {
    expect(pageForAyah(0, 1)).toBeNull();
    expect(pageForAyah(115, 1)).toBeNull();
    expect(pageForAyah(2, 0)).toBeNull();
    expect(pageForAyah(1.5, 1)).toBeNull();
    expect(pageForAyah(Number.NaN, 1)).toBeNull();
  });

  it('credits Tanzil under CC BY 3.0', () => {
    expect(QURAN_PAGE_DATA_CREDIT).toContain('Tanzil.net');
    expect(QURAN_PAGE_DATA_CREDIT).toContain('CC BY 3.0');
  });
});
```

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/quranPages.test.ts`
Expected: FAIL with `Cannot find module '@/constants/quranPages'`.

**Step 3: Generate `constants/quranPageData.ts`.** The download is untrusted data, so it goes into its own empty directory. The generator lives in a different directory and runs with `python3 -I`. The script below is the generator of record. Keep it in the scratchpad; do not commit it.

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
 * Attribution is shown to users in app/settings-about.tsx (QURAN_PAGE_DATA_CREDIT).
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

Run (cwd is the scratchpad tools dir, not the download dir):

```bash
cd "$SCRATCH/tools" && python3 -I gen_quran_pages.py "$SCRATCH/tanzil-dl/quran-data.js" /Users/ahmedelhadarey/samer/khazayin-worktrees/progress/constants/quranPageData.ts
```

Expected output: `ok 604 30 9e9930c5…ca4`. The arrays are typed `readonly AyahRef[]`, not `ReadonlyArray<…>`, which the repo's `@typescript-eslint/array-type` rule flags. The file is about 103 lines, and its first data row is `[1, 1], [2, 1], [2, 6], [2, 17], [2, 25], [2, 30], [2, 38], [2, 49],`.

**Step 4: Write `constants/quranPages.ts`** (hand-written):

```ts
/**
 * Ayah → Madani page lookup. The data lives in the generated
 * `quranPageData.ts`; this module adds the lookup and the user-facing credit
 * the CC BY 3.0 licence requires.
 */
import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, type AyahRef } from './quranPageData';

export { JUZ_START_AYAHS, QURAN_PAGE_STARTS, type AyahRef };

/** Shown in app/settings-about.tsx. Required by CC BY 3.0 (Tanzil). */
export const QURAN_PAGE_DATA_CREDIT = 'تقسيم صفحات المصحف وأجزائه: Tanzil.net — رخصة CC BY 3.0';

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

**Step 5: Run it and confirm it passes**

Run: `npx jest __tests__/quranPages.test.ts && npx tsc --noEmit --pretty false`
Expected: 7 tests PASS; tsc prints nothing.

**Step 6: Commit**

```bash
git add constants/quranPageData.ts constants/quranPages.ts __tests__/quranPages.test.ts
git commit -m "feat(progress): add Madani ayah-to-page table from Tanzil (CC BY 3.0)"
```

---

## Task 2: Correct the four mid-page juz boundaries

**Files:**
- Modify: `constants/progress.ts:34-79` (doc comment and 4 entries in `JUZ_PAGE_RANGES`)
- Test: `__tests__/juz.test.ts:4-13` (replace the contiguity block; keep the rest)

**Step 1: Write the failing test.** In `__tests__/juz.test.ts`, replace the `describe('JUZ_PAGE_RANGES data integrity', …)` block (lines 4-13) with the block below, and add `import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, pageForAyah } from '../constants/quranPages';` to the imports.

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

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/juz.test.ts`
Expected: FAIL. "matches the Madani page table" fails on juz 3 (`endPage` 61 vs 62); "shares a boundary page" fails (`[]` vs `[4, 7, 11, 26]`); "needs the shared page" fails.

**Step 3: Minimal implementation** in `constants/progress.ts`:
- Change exactly these entries: juz 3 `endPage: 61` → `62`; juz 7 `startPage: 122` → `121`; juz 11 `startPage: 202` → `201`; juz 25 `endPage: 501` → `502`.
- Replace the doc comment at `:39-43` with:

```ts
/**
 * Page ranges (1-based, inclusive) of the 30 ajzāʾ of the 604-page Madani
 * Mushaf. Juz 4, 7, 11 and 26 begin mid-page, so each shares its first page
 * with the end of the previous juz — a juz is complete only when that shared
 * page has been read too. Pinned to `constants/quranPages.ts` (Tanzil) by
 * `__tests__/juz.test.ts`. Used by `completedJuzCount()` (FR-005).
 */
```

Leave `JUZ_PRESET_PAGES` and its comment (`:13-30`) alone. Its "juz 1 spans 21 pages" remark is still true.

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/juz.test.ts __tests__/quranPages.test.ts`
Expected: all PASS. The existing `countCompletedJuz` / `completedJuzList` tests still pass unchanged.

**Step 5: Commit**

```bash
git add constants/progress.ts __tests__/juz.test.ts
git commit -m "fix(progress): share the boundary page where a juz begins mid-page"
```

---

## Task 3: Group ayat into page segments; detect which segments are in view

**Files:**
- Modify: `constants/progress.ts` (append after `STREAK_MILESTONES`, `:81-82`)
- Create: `services/mushafPageTracking.ts`
- Test: `__tests__/mushafPageTracking.test.ts`

**Step 1: Write the failing test** at `__tests__/mushafPageTracking.test.ts`:

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

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/mushafPageTracking.test.ts`
Expected: FAIL with `Cannot find module '@/services/mushafPageTracking'`.

**Step 3: Minimal implementation.**

Append to `constants/progress.ts` after `STREAK_MILESTONES`:

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
 * <Text> per page segment, feeds measured layouts through `pagesInView`, and
 * hands the result to a `PageDwellTracker`.
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

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/mushafPageTracking.test.ts && npx tsc --noEmit --pretty false`
Expected: 11 tests PASS; tsc clean.

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

**Step 1: Write the failing test.** Append to `__tests__/mushafPageTracking.test.ts`, and add `PageDwellTracker` to the import:

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
    run(t, [2], 0, 4000); // 4 s
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

How the time adds up: each update credits the time since the previous update to the pages that were in view **at that previous update**. In "adds up time…", the updates from 1000 to 5000 credit 5 s. That includes the 4000 → 5000 step, because page 2 was in view at 4000. The updates at 6000 and 7000 credit nothing, since `[]` was in view before each. The updates at 8000 and 9000 add 2 s, for 7 s. The update at 10000 reaches 8 s and fires. These expectations were checked against a JS replica of the class during planning.

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/mushafPageTracking.test.ts -t PageDwellTracker`
Expected: FAIL with `PageDwellTracker is not a constructor` (or a TS export error).

**Step 3: Minimal implementation.** Append to `services/mushafPageTracking.ts`, and extend the progress import with `PAGE_DWELL_MAX_STEP_MS, PAGE_READ_DWELL_MS`:

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

  /** App left the foreground or the reader unmounted: credit nothing further. */
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

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/mushafPageTracking.test.ts && npx tsc --noEmit --pretty false`
Expected: 17 tests PASS; tsc clean.

**Step 5: Commit**

```bash
git add services/mushafPageTracking.ts __tests__/mushafPageTracking.test.ts
git commit -m "feat(mushaf): add PageDwellTracker for page-read detection"
```

---

## Task 5: Keep `last_read_page` on the most recent page, even on a same-day re-read

**Files:**
- Modify: `db/repositories/pageReads.ts:40` (the `if (before.changes === 0) return;` line)
- Modify: `db/web-shim.ts:157-159` (the `if (exists) return false;` branch)
- Test: `__tests__/pageReadsRepo.test.ts` (new; uses the web shim, the established pattern in `__tests__/reset.test.ts:11-34`)

**Step 1: Write the failing test** at `__tests__/pageReadsRepo.test.ts`:

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

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/pageReadsRepo.test.ts`
Expected: FAIL. `getLastReadPage()` returns `7`, not `5`.

**Step 3: Minimal implementation.**

`db/web-shim.ts`, inside `recordPageRead`, replace `if (exists) return false;` with:

```ts
      if (exists) {
        // A re-read today still moves the resume point (design §4.3).
        s.settings.last_read_page = pageNumber;
        scheduleFlush();
        return false;
      }
```

`db/repositories/pageReads.ts`, inside the transaction, replace `if (before.changes === 0) return;` with:

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

The return value (`inserted`) is unchanged, so `notePageRead` still skips its refresh for a deduped page (`store/progressStore.ts:163-164`).

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/pageReadsRepo.test.ts __tests__/reset.test.ts && npx tsc --noEmit --pretty false`
Expected: PASS; tsc clean.

**Step 5: Commit**

```bash
git add db/repositories/pageReads.ts db/web-shim.ts __tests__/pageReadsRepo.test.ts
git commit -m "fix(progress): move last_read_page on a same-day re-read"
```

---

## Task 6: Record pages from the reader, not on open

**Files:**
- Modify: `app/(tabs)/sections/mushaf.tsx`: imports `:1-28`, `ReadingView` `:148-256` (remove `:153` and the recorder `:166-176`, body `:204-242`)
- Test: `__tests__/mushafPageTrackingWiring.test.ts` (source contract — same technique as `__tests__/rtlPhysicalContract.test.ts:66-72`)

**Step 1: Write the failing test** at `__tests__/mushafPageTrackingWiring.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

/**
 * The reader's page-read wiring, pinned on source text (no RN renderer in
 * this repo). Design 2026-10-21 §4.2-4.3.
 */
const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/mushaf.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('Mushaf reader page tracking', () => {
  it('no longer credits the surah start page on open', () => {
    expect(src).not.toMatch(/notePageRead\(\s*currentPage\s*\)/);
    expect(src).not.toMatch(/debounceRef/);
  });

  it('renders one segment per page and records through the dwell tracker', () => {
    expect(src).toMatch(/groupAyatByPage\(\s*surahNumber\s*,\s*ayat\s*\)/);
    expect(src).toMatch(/new PageDwellTracker\(/);
    expect(src).toMatch(/pagesInView\(/);
    expect(src).toMatch(/notePageRead\(\s*page\s*\)/);
  });

  it('only accrues while the app is in the foreground', () => {
    expect(src).toMatch(/AppState\.addEventListener\(\s*'change'/);
    expect(src).toMatch(/AppState\.currentState\s*!==\s*'active'/);
    expect(src).toMatch(/clearInterval\(/);
  });

  it('keeps the meta line on the surah start page (frame 2349:982)', () => {
    expect(src).toMatch(/surahStartPage\(\s*surahNumber\s*\)/);
  });
});
```

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/mushafPageTrackingWiring.test.ts`
Expected: FAIL on the first three tests (the current source has `notePageRead(currentPage)` and `debounceRef`, and no tracker).

**Step 3: Implementation** in `app/(tabs)/sections/mushaf.tsx`:

1. Imports:
   - `:25` becomes `import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';`
   - `:26` becomes `import { AppState, type AppStateStatus, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';`
   - Add `import { PageDwellTracker, groupAyatByPage, pagesInView, type SegmentLayout } from '@/services/mushafPageTracking';`
2. In `ReadingView`, delete `const notePageRead = useProgressStore((s) => s.notePageRead);` (`:153`). Replace the comment at `:156-157` with `// The meta line shows the surah's first page (frame 2349:982); reading is tracked per page below.` Delete the whole debounced recorder (`:166-176`).
3. After `const displayName = …` (`:160`), add:

```tsx
  const segments = useMemo(() => groupAyatByPage(surahNumber, ayat), [surahNumber, ayat]);

  // ── Page-read tracking (design 2026-10-21 §4.3) ──
  // Segment offsets are relative to the body wrapper; bodyY lifts them into
  // scroll-content coordinates. Refs, not state: none of this renders.
  const layoutsRef = useRef(new Map<number, { y: number; height: number }>());
  const bodyYRef = useRef(0);
  const scrollYRef = useRef(0);
  const viewportHRef = useRef(0);
  const trackerRef = useRef<PageDwellTracker | null>(null);
  if (trackerRef.current === null) {
    trackerRef.current = new PageDwellTracker({
      onRead: (page) => {
        useProgressStore.getState().notePageRead(page).catch(() => undefined);
      },
    });
  }

  const observe = useCallback(() => {
    if (AppState.currentState !== 'active') return;
    const laid: SegmentLayout[] = [];
    layoutsRef.current.forEach((l, page) => {
      laid.push({ page, y: bodyYRef.current + l.y, height: l.height });
    });
    trackerRef.current?.update(
      pagesInView(laid, scrollYRef.current, viewportHRef.current),
      Date.now(),
    );
  }, []);

  useEffect(() => {
    const tick = setInterval(observe, 1000);
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') observe();
      else trackerRef.current?.pause(Date.now());
    });
    return () => {
      clearInterval(tick);
      sub.remove();
      trackerRef.current?.pause(Date.now());
    };
  }, [observe]);

  // A refetch can change which pages are rendered; forget stale layouts.
  useEffect(() => {
    const live = new Set(segments.map((s) => s.page));
    for (const page of [...layoutsRef.current.keys()]) {
      if (!live.has(page)) layoutsRef.current.delete(page);
    }
  }, [segments]);
```

4. `ScrollView` (`:204`) gains:

```tsx
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={250}
        onLayout={(e) => {
          viewportHRef.current = e.nativeEvent.layout.height;
        }}
        onScroll={(e) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
          observe();
        }}
      >
```

5. Wrap `<AsyncContent …>` (`:219-241`) in `<View onLayout={(e) => { bodyYRef.current = e.nativeEvent.layout.y; }}> … </View>` (no style). Replace its single `<Text>` child (`:227-240`) with:

```tsx
          {segments.map((segment) => (
            <Text
              key={segment.page}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                layoutsRef.current.set(segment.page, { y, height });
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

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/mushafPageTrackingWiring.test.ts __tests__/mushafPresentation.test.ts __tests__/designTokens.test.ts && npx tsc --noEmit --pretty false && npm run lint 2>&1 | grep -E "sections/mushaf.tsx" -A 2`
Expected: tests PASS; tsc clean; lint prints nothing for `mushaf.tsx`. If lint flags `react-hooks/exhaustive-deps` on the `useMemo` because `ayat` comes from the store, leave it: the dependency is correct.

**Step 5: Commit**

```bash
git add "app/(tabs)/sections/mushaf.tsx" __tests__/mushafPageTrackingWiring.test.ts
git commit -m "feat(mushaf): record each page as it is read instead of on open"
```

---

## Task 7: Repository aggregates: total pages read, lectures listened

**Files:**
- Modify: `constants/progress.ts` (append `LECTURE_LISTENED_MIN_SEC`)
- Modify: `db/helpers/lectureCompletion.ts` (add `isListened`)
- Modify: `db/types.ts:58-86` (`totalPagesRead`), `:88-101` (`listenedCount`)
- Modify: `db/repositories/pageReads.ts` (method after `pagesReadInMonth`, `:89-92`)
- Modify: `db/repositories/lectureSessions.ts` (method after `completedCount`, `:105-110`)
- Modify: `db/web-shim.ts` (`pageReads` object ~`:178-185`; `lectureSessions` `:331-342`)
- Test: `__tests__/lecture-completion.test.ts` (append), `__tests__/pageReadsRepo.test.ts` (append)

**Step 1: Write the failing tests.**

Append to `__tests__/lecture-completion.test.ts` (and import `isListened`):

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
describe('progress aggregates (web shim)', () => {
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

  it('listenedCount counts listened lectures and reset clears both aggregates', async () => {
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

**Step 2: Run them and confirm they fail**

Run: `npx jest __tests__/lecture-completion.test.ts __tests__/pageReadsRepo.test.ts`
Expected: FAIL. `isListened` is not exported, and `pageReads.totalPagesRead is not a function`.

**Step 3: Minimal implementation.**

`constants/progress.ts`, append after `COMPLETION_THRESHOLD` (`:32`):

```ts
/**
 * A lecture counts as "listened" (Library card محاضرات مسموعة) once this much
 * real forward listening is recorded — or the whole clip, if shorter — or it
 * reached COMPLETION_THRESHOLD. Design 2026-10-21 §4.5.
 */
export const LECTURE_LISTENED_MIN_SEC = 60;
```

`db/helpers/lectureCompletion.ts`: extend the existing import on line 6 to `import { COMPLETION_THRESHOLD, LECTURE_LISTENED_MIN_SEC } from '@/constants/progress';` (a second import of the same module trips `import/no-duplicates`), then append:

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

`db/types.ts`. Add to `PageReadsRepository` after `pagesReadInMonth`:

```ts
  /** All-time SUM(khz_days.pages_read) — pages read summed over days. */
  totalPagesRead(): Promise<number>;
```

Add to `LectureSessionsRepository` after `completedCount`:

```ts
  /** Sessions that are completed or have ≥ LECTURE_LISTENED_MIN_SEC (or the whole clip) of forward listening. */
  listenedCount(): Promise<number>;
```

`db/repositories/pageReads.ts`, after `pagesReadInMonth`:

```ts
    async totalPagesRead() {
      const row = await db.getFirstAsync<{ n: number | null }>(
        'SELECT COALESCE(SUM(pages_read), 0) AS n FROM khz_days',
      );
      return row?.n ?? 0;
    },
```

`db/repositories/lectureSessions.ts`, after `completedCount` (import `LECTURE_LISTENED_MIN_SEC` from `@/constants/progress`):

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

`db/web-shim.ts`. In `pageReads`, after `pagesReadInMonth`:

```ts
    async totalPagesRead() {
      await load();
      return Object.values(ensure().days).reduce((acc, d) => acc + d.pagesRead, 0);
    },
```

In `lectureSessions`, after `completedCount` (add `isListened` to the existing `lectureCompletion` import):

```ts
    async listenedCount() {
      await load();
      return Object.values(ensure().lectures).filter(isListened).length;
    },
```

**Step 4: Run them and confirm they pass**

Run: `npx jest __tests__/lecture-completion.test.ts __tests__/pageReadsRepo.test.ts __tests__/reset.test.ts && npx tsc --noEmit --pretty false`
Expected: PASS. tsc may report the `@/db` test mocks in `__tests__/progressStore-dbFailed.test.ts` / `__tests__/wirdStore.test.ts` only if they are typed against the interfaces. They are untyped `jest.mock` factories, so tsc should be clean.

**Step 5: Commit**

```bash
git add constants/progress.ts db/helpers/lectureCompletion.ts db/types.ts db/repositories/pageReads.ts db/repositories/lectureSessions.ts db/web-shim.ts __tests__/lecture-completion.test.ts __tests__/pageReadsRepo.test.ts
git commit -m "feat(progress): add total-pages-read and lectures-listened aggregates"
```

---

## Task 8: Expose the new aggregates from `progressStore`

**Files:**
- Modify: `store/progressStore.ts`: `ProgressSnapshot` `:37-53`, `EMPTY` `:77-91`, `hydrate` `:105-158`, `notePageRead` `:161-208`, `noteLectureTick` `:210-231`
- Modify: `__tests__/progressStore-dbFailed.test.ts:9-28` (add the two new repo mocks so hydration still succeeds)
- Test: `__tests__/progressStore-stats.test.ts` (new)

**Step 1: Write the failing test** at `__tests__/progressStore-stats.test.ts`:

```ts
const mockTotalPagesRead = jest.fn(async () => 0);
const mockListenedCount = jest.fn(async () => 0);
const mockRecordPageRead = jest.fn(async () => true);

jest.mock('@/db', () => ({
  getRepos: jest.fn(async () => ({})),
  progressRepo: {
    recordPageRead: (...a: unknown[]) => mockRecordPageRead(...(a as [])),
    pagesReadToday: jest.fn(async () => 0),
    pagesReadInMonth: jest.fn(async () => 0),
    totalPagesRead: () => mockTotalPagesRead(),
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

describe('progressStore library stats', () => {
  it('hydrates totalPagesRead and listenedLectureCount', async () => {
    mockTotalPagesRead.mockResolvedValueOnce(42);
    mockListenedCount.mockResolvedValueOnce(5);
    await useProgressStore.getState().hydrate();
    expect(useProgressStore.getState().totalPagesRead).toBe(42);
    expect(useProgressStore.getState().listenedLectureCount).toBe(5);
  });

  it('refreshes totalPagesRead after a newly recorded page', async () => {
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

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/progressStore-stats.test.ts`
Expected: FAIL. `totalPagesRead` is `undefined` (not 42).

**Step 3: Minimal implementation** in `store/progressStore.ts`:
- `ProgressSnapshot`: add `totalPagesRead: number;` after `pagesToday`, and `listenedLectureCount: number;` after `completedLectureCount`.
- `EMPTY`: add `totalPagesRead: 0,` and `listenedLectureCount: 0,`.
- `hydrate`: add `progressRepo.totalPagesRead()` and `lectureRepo.listenedCount()` to the `Promise.all` and the destructuring, then set both.
- `notePageRead`: add `progressRepo.totalPagesRead()` to its `Promise.all` and set `totalPagesRead`.
- `noteLectureTick`: add `lectureRepo.listenedCount()` to its `Promise.all` and set `listenedLectureCount`.

Then in `__tests__/progressStore-dbFailed.test.ts`, add `totalPagesRead: jest.fn(async () => 0),` to `progressRepo` and `listenedCount: jest.fn(async () => 0),` to `lectureRepo`.

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/progressStore-stats.test.ts __tests__/progressStore-dbFailed.test.ts __tests__/wirdStore.test.ts && npx tsc --noEmit --pretty false`
Expected: PASS; tsc clean.

**Step 5: Commit**

```bash
git add store/progressStore.ts __tests__/progressStore-stats.test.ts __tests__/progressStore-dbFailed.test.ts
git commit -m "feat(progress): expose total pages read and lectures listened in the store"
```

---

## Task 9: Arabic subtitles for the new StatCards

**Files:**
- Create: `services/libraryStats.ts`
- Test: `__tests__/libraryStats.test.ts`

**Step 1: Write the failing test** at `__tests__/libraryStats.test.ts`:

```ts
import {
  juzCompletedSubtitle,
  lecturesListenedSubtitle,
  pagesReadSubtitle,
} from '@/services/libraryStats';

describe('Library progress subtitles', () => {
  it('pages: zero state, then Arabic-Indic count', () => {
    expect(pagesReadSubtitle(0)).toBe('لم تبدأ بعد');
    expect(pagesReadSubtitle(142)).toBe('١٤٢ صفحة');
  });

  it('juz: always out of thirty', () => {
    expect(juzCompletedSubtitle(0)).toBe('٠ من ٣٠');
    expect(juzCompletedSubtitle(3)).toBe('٣ من ٣٠');
  });

  it('lectures: zero state, listened only, listened and completed', () => {
    expect(lecturesListenedSubtitle(0, 0)).toBe('لم تستمع بعد');
    expect(lecturesListenedSubtitle(4, 0)).toBe('٤ محاضرة');
    expect(lecturesListenedSubtitle(12, 4)).toBe('١٢ محاضرة • ٤ مكتملة');
  });

  it('never uses the middle dot, which reads as ٠ between Arabic digits', () => {
    expect(lecturesListenedSubtitle(12, 4)).not.toContain('·');
  });
});
```

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/libraryStats.test.ts`
Expected: FAIL with `Cannot find module '@/services/libraryStats'`.

**Step 3: Minimal implementation** at `services/libraryStats.ts`:

```ts
/**
 * Subtitles for the Library `progressStats` row (design 2026-10-21 §4.4).
 * Pure so the copy is pinned without rendering. Separators use `•`: the
 * middle dot reads as ٠ between Arabic-Indic digits (see mushafNavigation).
 */
import { JUZ_PAGE_RANGES, toArabicDigits } from '@/constants/progress';

export function pagesReadSubtitle(total: number): string {
  return total > 0 ? `${toArabicDigits(total)} صفحة` : 'لم تبدأ بعد';
}

export function juzCompletedSubtitle(completed: number): string {
  return `${toArabicDigits(completed)} من ${toArabicDigits(JUZ_PAGE_RANGES.length)}`;
}

export function lecturesListenedSubtitle(listened: number, completed: number): string {
  if (listened <= 0) return 'لم تستمع بعد';
  const head = `${toArabicDigits(listened)} محاضرة`;
  return completed > 0 ? `${head} • ${toArabicDigits(completed)} مكتملة` : head;
}
```

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/libraryStats.test.ts`
Expected: 4 PASS.

**Step 5: Commit**

```bash
git add services/libraryStats.ts __tests__/libraryStats.test.ts
git commit -m "feat(library): add Arabic subtitles for the progress stat cards"
```

---

## Task 10: `progressStats` section in the Library presentation contract

**Files:**
- Modify: `constants/libraryPresentation.ts:27-33`, `:40-56` (rename `completedLectures` → `progressStats`), add `LIBRARY_PROGRESS_STAT_ORDER` after `:61-67`
- Test: `__tests__/libraryPresentation.test.ts:44-52`, `:69-73`, `:104-117`

**Step 1: Write the failing test.** In `__tests__/libraryPresentation.test.ts`:
- In "keeps the newer metrics rather than deleting them" (`:44-52`), replace `'completedLectures'` with `'progressStats'` and keep the array sorted: `['insights', 'progressStats', 'wirdHistory', 'wirdSuggestion', 'wirdTrend']`.
- In "keeps the audiobook, reminder, and suggestion sections as visible as before" (`:104-117`), replace `'completedLectures'` with `'progressStats'`.
- Add `LIBRARY_PROGRESS_STAT_ORDER` to the import, and below the "Library summary cards" describe (`:69-73`) add:

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

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/libraryPresentation.test.ts`
Expected: FAIL. `LIBRARY_PROGRESS_STAT_ORDER` is undefined, and the order still contains `completedLectures`.

**Step 3: Minimal implementation** in `constants/libraryPresentation.ts`:
- In both `LIBRARY_EXTENSION_SECTIONS` and `LIBRARY_SECTION_ORDER`, replace `'completedLectures'` with `'progressStats'` (same position, last).
- After `LibrarySummaryCardKey`, add:

```ts
/**
 * The progress row below the frame (no Figma frame — contract:
 * libraryLayout STAT_CARD + PHYSICAL_ROW). Physical left → right:
 * محاضرات مسموعة، الأجزاء المكتملة، صفحات مقروءة.
 */
export const LIBRARY_PROGRESS_STAT_ORDER = Object.freeze(['lectures', 'juz', 'pages'] as const);

export type LibraryProgressStatKey = (typeof LIBRARY_PROGRESS_STAT_ORDER)[number];
```

`SECTION_FILTERS` stays as it is. `progressStats` is absent from it, so it stays visible under every filter, as `completedLectures` was.

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/libraryPresentation.test.ts`
Expected: PASS. tsc **will** now fail in `app/(tabs)/library.tsx:617` (`completedLectures` is not a `LibrarySectionKey`). That is expected; Task 11 fixes it. Run Task 11 before committing, or commit both together. **Commit Tasks 10 and 11 as one commit** so no commit on the branch fails typecheck.

---

## Task 11: Render the `progressStats` row on the Library

**Files:**
- Modify: `app/(tabs)/library.tsx`: imports `:20-26` and `:61`, selectors `:176-192`, `completedLectures` section `:617-629`
- Test: `__tests__/libraryProgressStatsWiring.test.ts` (source contract)

**Step 1: Write the failing test** at `__tests__/libraryProgressStatsWiring.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/library.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

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

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/libraryProgressStatsWiring.test.ts`
Expected: FAIL on the first two tests.

**Step 3: Implementation** in `app/(tabs)/library.tsx`:
1. In the `@/constants/libraryPresentation` import (`:20-26`), add `LIBRARY_PROGRESS_STAT_ORDER` and `type LibraryProgressStatKey`. Add `import { juzCompletedSubtitle, lecturesListenedSubtitle, pagesReadSubtitle } from '@/services/libraryStats';`.
2. After `const completedLectureCount = …` (`:189`), add:

```tsx
  const totalPagesRead = useProgressStore((s) => s.totalPagesRead);
  const completedJuzCount = useProgressStore((s) => s.completedJuzCount);
  const listenedLectureCount = useProgressStore((s) => s.listenedLectureCount);
```

3. After the `summaryCards` record (`:305`), add:

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

(`SectionQuran` and `LibraryWird` are monochrome in `components/khazain/icons/generated/figmaIcons.ts`, so `color` applies.)

4. Replace the `completedLectures: ( … )` entry (`:617-629`) with:

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

Leave `HeadphonesGlyph` (`:662-672`), `styles`, and every frame section untouched.

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/libraryProgressStatsWiring.test.ts __tests__/libraryPresentation.test.ts __tests__/fontScaleChrome.test.ts __tests__/rtlPhysicalContract.test.ts && npx tsc --noEmit --pretty false && npm run lint 2>&1 | grep -E "\(tabs\)/library.tsx|libraryPresentation|libraryStats" -A 2`
Expected: PASS; tsc clean; no lint output for these paths.

**Step 5: Commit (Tasks 10 and 11 together)**

```bash
git add constants/libraryPresentation.ts __tests__/libraryPresentation.test.ts "app/(tabs)/library.tsx" __tests__/libraryProgressStatsWiring.test.ts
git commit -m "feat(library): show pages read, juz completed and lectures listened"
```

---

## Task 12: Credit the page data in About

**Files:**
- Modify: `app/settings-about.tsx`: imports `:1-8`, body after the `موقع المؤسسة` `Pressable` (`:63-74`), styles (`:131-143`)
- Test: `__tests__/quranPages.test.ts` (append)

**Step 1: Write the failing test.** Append to `__tests__/quranPages.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('CC BY 3.0 attribution', () => {
  it('is rendered on the About screen', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../app/settings-about.tsx'), 'utf8');
    expect(src).toMatch(/\{QURAN_PAGE_DATA_CREDIT\}/);
    expect(src).toMatch(/مصادر البيانات/);
  });
});
```

**Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/quranPages.test.ts -t attribution`
Expected: FAIL.

**Step 3: Implementation** in `app/settings-about.tsx`:
- Import: `import { QURAN_PAGE_DATA_CREDIT } from '@/constants/quranPages';`
- After the `موقع المؤسسة` `</Pressable>`, add:

```tsx
        {/* CC BY 3.0 requires visible credit for the page/juz table (constants/quranPageData.ts). */}
        <View style={[styles.linkCard, KhazainShadows.card]}>
          <Text style={styles.linkTitle}>مصادر البيانات</Text>
          <Text style={styles.creditValue}>{QURAN_PAGE_DATA_CREDIT}</Text>
        </View>
```

- Styles, after `linkValue`: `creditValue: textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),`

`linkCard` already spreads `PHYSICAL_BOX` with `alignItems: 'flex-end'` (`:131-140`), so the card is right-anchored. No new RTL handling is needed.

**Step 4: Run it and confirm it passes**

Run: `npx jest __tests__/quranPages.test.ts __tests__/rtlPhysicalContract.test.ts && npx tsc --noEmit --pretty false && npm run lint 2>&1 | grep -E "settings-about" -A 2`
Expected: PASS; clean.

**Step 5: Commit**

```bash
git add app/settings-about.tsx __tests__/quranPages.test.ts
git commit -m "feat(about): credit Tanzil for the mushaf page data (CC BY 3.0)"
```

---

## Task 13: Full verification and visual QA

**Step 1: Automated gates**

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "constants/(progress|quranPages|quranPageData|libraryPresentation)\.ts|services/(mushafPageTracking|libraryStats)\.ts|db/(types|web-shim)\.ts|db/repositories/(pageReads|lectureSessions)\.ts|db/helpers/lectureCompletion\.ts|store/progressStore\.ts|sections/mushaf\.tsx|\(tabs\)/library\.tsx|settings-about\.tsx" -A 2
git log --oneline 0635ea1..HEAD
```

Expected: jest passes everything: 80 suites, 880 passed, 1 skipped, i.e. 7 new suites and 52 new tests on the 73 / 828 baseline. tsc is clean. The lint grep prints nothing. `git log` shows 11 commits plus the plan commit: Tasks 1–9 and 12 one each, 10+11 together.

**Step 2: Visual QA on the iOS simulator** (argent: `list-devices` and prefer a booted simulator; load `argent-device-interact`, `argent-react-native-app-workflow`, `argent-screenshot-diff`). Rebuild if native code changed (it did not). Otherwise reload Metro. `EXPO_PUBLIC_VISUAL_AUDIT=1 npm start`.

| # | Route / state | Compare against | Must hold |
|---|---|---|---|
| V1 | `/library`, filter الكل, first viewport | `docs/audit/2026-09-09/figma-reference/06-2031-4659.png` (main checkout) **and** `/tmp/khazayin-capture/progress-before` (Task 0) | `npm run capture:ios -- --out /tmp/khazayin-capture/progress-after --node 2031:4659` then `screenshot-diff` vs before: **no diff** outside live data (counts / relative times). Summary row still تذكيراتي / ورد القرآن / ملاحظاتي |
| V2 | `/library`, الكل, scrolled to bottom | no frame — contract `libraryLayout.ts` `STAT_CARD`, `constants/layout.ts` `PHYSICAL_ROW`, `constants/typography.ts` via `StatCard` | Below التذكيرات الذكية: one row of three 115-wide cards, physical left → right محاضرات مسموعة / الأجزاء المكتملة / صفحات مقروءة. Icons navy. No horizontal overflow at 393 pt. The old "محاضرات مكتملة" card is gone |
| V3 | `/library`, filter السجل, bottom | no frame — same contracts | `progressStats` row present after the history/trend/insights extras |
| V4 | V2 at the largest Dynamic Type size (Settings → Accessibility, or `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`) | contract `fontScaleChrome` (`CHROME_MAX_FONT_SCALE`) | Captions stay inside their cards, and the cards grow |
| V5 | `/sections/mushaf?surah=2`, loaded | `16-2349-982.png` + Task 0 capture | `npm run capture:ios -- --out /tmp/khazayin-capture/progress-after --node 2349:982`. Header `سورة البقرة`, meta `مدنية • ٥ آية • صفحة ٢ من ٦٠٤` (as before), footer الفهرس / الانتقال للعلامة / حفظ علامة: **identical** to Task 0. Body: the 5 ayat as before (one segment) |
| V6 | Cold start with `last_read_page > 1`, open the Mushaf tab with no `surah` | `15-2349-829.png` | Plain page surface during resume, no list flash. Unchanged |
| V7 | `/settings-about` | no frame — contract `PHYSICAL_BOX`, `textStyle` | New card مصادر البيانات, right-anchored, Latin "Tanzil.net" and "CC BY 3.0" readable inside the Arabic line |

**Step 3: Functional QA** (same simulator):

1. **Reset:** More → الإعدادات → تقدّم القراءة → reset. The Library shows صفحات مقروءة "لم تبدأ بعد", الأجزاء المكتملة "٠ من ٣٠", محاضرات مسموعة "لم تستمع بعد", and a ring at 0 %.
2. **Fling is not reading:** open البقرة, back out within 3 s. The Library is still at 0.
3. **Dwell reads a page:** open البقرة and wait ≥ 9 s on screen. Back on the Library: صفحات مقروءة "١ صفحة", the ring at 10 % (default goal 10), ورد القرآن "يوم واحد متتالي", and the wird card "سورة البقرة — صفحة ٢".
4. **Background pauses:** reset. Open البقرة, wait 4 s, send to home (`button: home`) for 20 s, return, wait 3 s, back out. The Library is still 0, because 7 s < 8 s. Wait the remaining time and it records.
5. **Juz completion and achievement (seeded, since mock text only reaches page 2).** Terminate the app, then seed pages 1 and 3–21 for yesterday:
   ```bash
   DB="$(xcrun simctl get_app_container booted com.ahmed.elhadarey94.khazayinapp data)/Documents/SQLite/khazain.db"
   Y=$(date -v-1d +%F)
   sqlite3 "$DB" "INSERT OR IGNORE INTO khz_page_reads (local_day,page_number,recorded_at) SELECT '$Y', value, 0 FROM (WITH RECURSIVE n(value) AS (SELECT 1 UNION ALL SELECT value+1 FROM n WHERE value<21) SELECT value FROM n WHERE value<>2); INSERT OR REPLACE INTO khz_days (local_day,pages_read,wird_target_at_day,wird_completed) VALUES ('$Y',20,10,1);"
   ```
   Relaunch (`launch-app`). Open البقرة and wait ≥ 9 s. Expect the toast **"أكملت الجزء ١"**. The Library shows الأجزاء المكتملة "١ من ٣٠", صفحات مقروءة "٢١ صفحة", and a streak of 2 days. (If the `Documents/SQLite` path differs, locate it with `find "$(xcrun simctl get_app_container booted com.ahmed.elhadarey94.khazayinapp data)" -name khazain.db`.)
6. **Lectures listened:** play any lecture with an audio source for ≥ 70 s of real playback (no seeking). The Library shows محاضرات مسموعة "١ محاضرة". Seek to 96 % and wait for a tick: "١ محاضرة • ١ مكتملة". The AudioProgressCard disappears for that lecture, because completed lectures are not "in progress". This is existing behaviour.
7. **Restart persists:** `restart-app`. All values from steps 5–6 survive.
8. **Reset again:** everything returns to the zero states in step 1.

Record the results, with screenshots and diff outputs, in `docs/plans/2026-10-21-reading-progress-tracking-qa.md`, mirroring `docs/plans/2026-09-12-more-screen-qa.md`, and commit it as `docs(qa): reading progress tracking QA record`. When done, call `stop-all-simulator-servers` with `devices: [<the simulator UDID used>]`.

---

## Task index

0. Capture visual baselines (no code)
1. Madani page table and `pageForAyah`
2. Correct the four mid-page juz boundaries
3. Group ayat into page segments; detect pages in view
4. `PageDwellTracker`
5. `last_read_page` follows a same-day re-read
6. Record pages from the reader, not on open
7. Repository aggregates: total pages read, lectures listened
8. Expose the aggregates from `progressStore`
9. Arabic subtitles for the new StatCards
10. `progressStats` section in the Library presentation contract (committed with 11)
11. Render the `progressStats` row on the Library
12. Credit the page data in About
13. Full verification and visual QA
