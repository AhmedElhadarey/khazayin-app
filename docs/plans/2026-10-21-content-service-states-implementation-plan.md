# Content Service States Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Follow the CLAUDE.md "Development Workflow §4" loop for every task: fresh implementer → spec review → quality review.

**Goal:** Close the audit gaps on Trello ticket "Content Service Layer & Data Architecture" (https://trello.com/c/dTT57wsY). The work adds loading, error-with-retry and not-found states to the reciter surah list, adds an Arabic per-tab empty state to the reciters list, stops English error text reaching the UI, and adds unit tests for the adapter swap point, `AsyncContent` state selection and HTTP adapter mapping.

**Architecture:** Branching logic moves into two pure, dependency-free modules: `components/khazain/state/asyncView.ts` and `services/reciterScreenState.ts`. They get ordinary jest tests. Screens stay thin and are pinned with source-contract tests (the repo's existing `readFileSync` pattern). Loaded states render their original `FlatList` JSX verbatim, so frames 2031:6193, 2102:3187 and 2207:5270 stay pixel-identical.

**Tech Stack:** TypeScript 5.9, React Native 0.81.5 / Expo SDK 54, Zustand 5 (`createAsyncStore`), jest 29 + `jest-expo` preset. No new dependencies: `react-test-renderer` sits in `node_modules` only as a transitive dependency and must **not** be imported.

**Design doc:** `docs/plans/2026-10-21-content-service-states-design.md`

**Baseline (2026-10-21, this worktree):** `npx jest` → 73 suites, 828 passed, 1 skipped. `npx tsc --noEmit --pretty false` → 0 errors.

**Commit rules:** conventional commits, **no `Co-Authored-By` or any AI attribution**, no `--no-verify`, do not push.

---

## Task list

0. Pre-change baseline captures, all 28 frames (no code) — **DONE by the orchestrator**
1. `isApiError` guard and Arabic simulated mock error
2. Characterization tests: adapter swap point and HTTP adapter mapping
3. `resolveAsyncView`, with `AsyncContent` delegating to it
4. `reciterScreenState` pure helpers
5. Wire the per-tab empty state into `reciter.tsx`
6. Wire loading, error, not-found and empty states into `reciter/[id].tsx`
7. Full verification and visual QA

---

### Task 0: Pre-change baseline captures (no code, no commit) — **DONE (by the orchestrator)**

Purpose: "pixel-identical" is measured against the app **before** this branch's code changes. The `AsyncContent` change in Task 3 touches ~18 screens, so the baseline covers **all 28 frames**, not just the three reciter frames.

**Status:** the baseline already exists at
`/private/tmp/claude-501/-Users-ahmedelhadarey-samer-khazayin-app/ad126e66-b973-46e5-9731-c506a3e034d8/scratchpad/qa/baseline`.
It holds 23 captured frames (`05-2001-940__home.png` … `28-2558-1334__more-archive.png`) plus `capture-summary.json`. The 5 transition frames (`2001:835`, `2001:888`, `2001:914`, `2007:511`, `2349:829`) are `skip` in the manifest (see `scripts/visual-audit/README.md`, "What is not captured automatically"). **Do not recapture or overwrite it.** Task 7 diffs against it.

For reference, it was produced with the full-manifest run (no `--node`):
```bash
EXPO_PUBLIC_VISUAL_AUDIT=1 npm start          # Metro, audit mode
npm run capture:ios -- --out <baseline dir>   # all 28 manifest frames; 5 transition frames skipped
```
No native rebuild is needed for this branch: every change is JS-only, so Metro reload picks it up.

---

### Task 1: `isApiError` guard and Arabic simulated mock error

Closes audit gap 3 and supplies the guard that Task 3 uses.

**Files**
- Modify: `services/api/errors.ts` (add `isApiError` after `arabicCopyForCode`, `:47-49`)
- Modify: `services/contentService.ts:138-143` (`maybeError`); add the export `SIMULATED_ERROR_MESSAGE`; extend the type import at `:48-52` with `ApiError`
- Test: `__tests__/contentServiceErrors.test.ts` (new)

**Step 1: Write the failing test** at `__tests__/contentServiceErrors.test.ts`

```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { isApiError, toApiError } from '@/services/api/errors';
import { mockAdapter, SIMULATED_ERROR_MESSAGE } from '@/services/contentService';

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

describe('isApiError', () => {
  it('accepts errors built by toApiError', () => {
    expect(isApiError(toApiError(new TypeError('offline')))).toBe(true);
  });
  it('rejects plain Errors, nullish and non-errors', () => {
    expect(isApiError(new Error('boom'))).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError({ name: 'ApiError', code: 'unknown' })).toBe(false); // not an Error
  });
});

describe('mockAdapter.simulateError (audit gap 3)', () => {
  const saved = { delay: mockAdapter.mockDelay, sim: mockAdapter.simulateError };
  beforeEach(() => { mockAdapter.mockDelay = 0; mockAdapter.simulateError = true; });
  afterEach(() => { mockAdapter.mockDelay = saved.delay; mockAdapter.simulateError = saved.sim; });

  it('the simulated message is Arabic with no Latin letters', () => {
    expect(SIMULATED_ERROR_MESSAGE).toMatch(ARABIC);
    expect(SIMULATED_ERROR_MESSAGE).not.toMatch(LATIN);
  });

  it('throws an ApiError carrying the Arabic copy', async () => {
    const err = await mockAdapter.quran.listReciters().catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    expect((err as Error).message).toBe(SIMULATED_ERROR_MESSAGE);
  });
});
```

**Step 2: Run it and confirm it fails**

`npx jest __tests__/contentServiceErrors.test.ts`
Expected: FAIL. TypeScript/Babel resolves `isApiError` and `SIMULATED_ERROR_MESSAGE` as `undefined` ("isApiError is not a function").

**Step 3: Minimal implementation**

`services/api/errors.ts`, after `arabicCopyForCode`:
```ts
/**
 * True for errors built by `toApiError` (or shaped like them). Their `message`
 * is always Arabic copy from ARABIC_COPY, so the UI may show it verbatim.
 * Any other Error may carry English developer text and must not be shown.
 */
export function isApiError(e: unknown): e is ApiError {
  return (
    e instanceof Error &&
    e.name === 'ApiError' &&
    typeof (e as Partial<ApiError>).code === 'string'
  );
}
```

`services/contentService.ts`: add `ApiError` to the `./api/types` type import, then replace `:138-143`:
```ts
/**
 * Arabic copy for the dev-only simulated failure. "(خطأ تجريبي)" tells a
 * developer the failure came from the knob, not the network.
 */
export const SIMULATED_ERROR_MESSAGE = 'تعذر تحميل المحتوى (خطأ تجريبي). حاول مجدداً.';

/** Throws an ApiError-shaped error if simulateError is set. */
function maybeError(): void {
  if (mockAdapter.simulateError) {
    const err = new Error(SIMULATED_ERROR_MESSAGE) as ApiError;
    err.name = 'ApiError';
    err.code = 'unknown';
    err.retriable = true;
    throw err;
  }
}
```

**Step 4: Run it and confirm it passes**

`npx jest __tests__/contentServiceErrors.test.ts` → PASS (4 tests).
`npx tsc --noEmit --pretty false` → 0 errors.
`npx jest` → 74 suites, no regressions.

**Step 5: Commit**
```bash
git add services/api/errors.ts services/contentService.ts __tests__/contentServiceErrors.test.ts
git commit -m "fix(content): throw an Arabic ApiError from the simulated mock failure"
```

---

### Task 2: Characterization tests for the adapter swap point and HTTP adapter mapping

Closes audit gap 4 (swap point and `httpAdapter` mapping). This task is test-only, so the tests pass on the first run. **Required:** prove each describe block can fail by applying the listed mutation, watching it go red, then reverting it.

**Files**
- Test: `__tests__/contentServiceSwap.test.ts` (new)
- Test: `__tests__/httpAdapterMapping.test.ts` (new)
- No production change.

**Step 1: Write the tests**

`__tests__/contentServiceSwap.test.ts` (technique proven by a planning probe: jest-expo does not inline `EXPO_PUBLIC_*`):
```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** services/contentService.ts:394-409 — the single swap point. */
describe('contentService swap point', () => {
  const saved = process.env.EXPO_PUBLIC_API_BASE;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_API_BASE;
    else process.env.EXPO_PUBLIC_API_BASE = saved;
  });

  const load = () => {
    let out!: { service: unknown; mock: unknown; http: unknown };
    jest.isolateModules(() => {
      const cs = require('@/services/contentService');
      const { httpAdapter } = require('@/services/api/httpAdapter');
      out = { service: cs.contentService, mock: cs.mockAdapter, http: httpAdapter };
    });
    return out;
  };

  it('uses the mock adapter when EXPO_PUBLIC_API_BASE is unset', () => {
    delete process.env.EXPO_PUBLIC_API_BASE;
    const { service, mock } = load();
    expect(service).toBe(mock);
  });

  it('uses the mock adapter when EXPO_PUBLIC_API_BASE is the empty string', () => {
    process.env.EXPO_PUBLIC_API_BASE = '';
    const { service, mock } = load();
    expect(service).toBe(mock);
  });

  it('uses the HTTP adapter when EXPO_PUBLIC_API_BASE is set', () => {
    process.env.EXPO_PUBLIC_API_BASE = 'https://api.example.test';
    const { service, http } = load();
    expect(service).toBe(http);
  });
});
```
(No method-list parity test: both adapters are typed `ContentService`, so tsc already enforces that they match. Dropped after the CTO review.)

`__tests__/httpAdapterMapping.test.ts`:
```ts
import { quranAdapter } from '@/services/api/httpAdapter.quran';
import { httpAdapter } from '@/services/api/httpAdapter';
import { isNotModified } from '@/services/api/types';

type Stub = { status: number; body?: unknown; etag?: string | null };

function stubFetch(...responses: Stub[]) {
  const fn = jest.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      headers: {
        get: (k: string) => (k === 'ETag' ? r.etag ?? null : null),
      },
      json: async () => r.body,
    });
  }
  (global as any).fetch = fn;
  return fn;
}

const BASE = 'https://api.example.test';
const savedBase = process.env.EXPO_PUBLIC_API_BASE;
const savedFetch = (global as any).fetch;
beforeEach(() => { process.env.EXPO_PUBLIC_API_BASE = BASE; });
afterEach(() => {
  (global as any).fetch = savedFetch;
  if (savedBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE;
  else process.env.EXPO_PUBLIC_API_BASE = savedBase;
});

const urlOf = (fn: jest.Mock, call = 0) => new URL(fn.mock.calls[call][0] as string);
const headersOf = (fn: jest.Mock, call = 0) =>
  (fn.mock.calls[call][1] as { headers: Record<string, string> }).headers;

describe('quranAdapter', () => {
  it('listSurahs unwraps Paged.items and carries the ETag', async () => {
    const surah = { id: '001', number: 1, displayNumber: '٠١', name: 'الفاتحة', meta: '', revelationType: 'meccan', ayahCount: 7 };
    const f = stubFetch({ status: 200, etag: '"s1"', body: { items: [surah], nextCursor: null } });
    const res = await quranAdapter.listSurahs();
    expect(urlOf(f).pathname).toBe('/v1/surahs');
    expect(res).toEqual({ data: [surah], etag: '"s1"' });
  });

  it('listAyahs hits the per-surah path and unwraps items', async () => {
    const f = stubFetch({ status: 200, etag: null, body: { items: [{ surahId: '002', number: 1, text: 'الم' }], nextCursor: null } });
    const res = await quranAdapter.listAyahs('002');
    expect(urlOf(f).pathname).toBe('/v1/surahs/002/ayat');
    expect(isNotModified(res)).toBe(false);
    expect((res as { data: unknown[] }).data).toHaveLength(1);
  });

  it('listQiraat returns the array body as-is', async () => {
    const q = [{ id: 'q1', name: 'حفص عن عاصم' }];
    stubFetch({ status: 200, etag: '"q"', body: q });
    expect(await quranAdapter.listQiraat()).toEqual({ data: q, etag: '"q"' });
  });

  it('listReciters sends ?style= only when a style is given', async () => {
    const f = stubFetch({ status: 200, body: [] }, { status: 200, body: [] });
    await quranAdapter.listReciters('murattal');
    await quranAdapter.listReciters();
    expect(urlOf(f, 0).pathname).toBe('/v1/reciters');
    expect(urlOf(f, 0).searchParams.get('style')).toBe('murattal');
    expect(urlOf(f, 1).searchParams.has('style')).toBe(false);
  });

  it('forwards If-None-Match and passes a 304 through as NotModifiedMarker', async () => {
    const f = stubFetch({ status: 304, etag: '"r1"' });
    const res = await quranAdapter.listReciters(undefined, { ifNoneMatch: '"r1"' });
    expect(headersOf(f)['If-None-Match']).toBe('"r1"');
    expect(isNotModified(res)).toBe(true);
  });
});

describe('dawahAdapter mapping (the only field-renaming adapter)', () => {
  it('listFeatured maps imageUrl → imageSource { uri }', async () => {
    stubFetch({ status: 200, body: [
      { id: 'd1', tone: 'navy', title: 'ت', body: 'ب', imageUrl: 'https://cdn.test/1.png' },
      { id: 'd2', tone: 'gold', title: 'ت', body: 'ب' },
    ] });
    const res = await httpAdapter.dawah.listFeatured();
    const data = (res as { data: any[] }).data;
    expect(data[0].imageSource).toEqual({ uri: 'https://cdn.test/1.png' });
    expect(data[0]).not.toHaveProperty('imageUrl');
    expect(data[1].imageSource).toBeUndefined();
  });

  it('listByMonth URL-encodes the month and unwraps Paged.items', async () => {
    const f = stubFetch({ status: 200, body: { items: [{ id: 'd3', tone: 'navy', title: 'ت', body: 'ب', month: 'رمضان' }], nextCursor: null } });
    const res = await httpAdapter.dawah.listByMonth('رمضان');
    expect(urlOf(f).pathname).toBe(`/v1/dawah/months/${encodeURIComponent('رمضان')}/posters`);
    expect((res as { data: any[] }).data[0].month).toBe('رمضان');
  });
});
```

**Step 2: Run them.** Expected: PASS on the first run (characterization).
`npx jest __tests__/contentServiceSwap.test.ts __tests__/httpAdapterMapping.test.ts`

**Step 3: Prove the tests can fail** (do not commit these mutations)
- In `services/contentService.ts:409`, change the export to `= mockAdapter;`. The "uses the HTTP adapter" test must FAIL. Revert.
- In `services/api/httpAdapter.quran.ts:24`, change `result.data.items` to `result.data as any`. "listSurahs unwraps" must FAIL. Revert.
- In `services/api/httpAdapter.dawah.ts:34`, change `{ uri: p.imageUrl }` to `p.imageUrl as any`. "maps imageUrl" must FAIL. Revert.
- `git diff --stat -- services/` must be empty afterwards.

**Step 4: Verify**
`npx jest` → no regressions. `npx tsc --noEmit --pretty false` → 0 errors.

**Step 5: Commit**
```bash
git add __tests__/contentServiceSwap.test.ts __tests__/httpAdapterMapping.test.ts
git commit -m "test(content): pin the adapter swap point and HTTP adapter mapping"
```

---

### Task 3: `resolveAsyncView`, with `AsyncContent` delegating to it

Closes audit gap 4 (`AsyncContent` state rendering, via pure logic) and finishes gap 3: English `Error.message` never reaches `ErrorState`.

**Files**
- Create: `components/khazain/state/asyncView.ts`
- Modify: `components/khazain/state/AsyncContent.tsx:12` (imports) and `:97-121` (body)
- Modify: `components/khazain/state/index.ts` (add `export * from './asyncView';`)
- Modify: `app/foundations-sandbox.tsx:211` (plain `Error` → `toApiError(undefined, 500)`)
- Test: `__tests__/asyncView.test.ts` (new); regression check `__tests__/moreLayout.test.ts`

**Step 1: Write the failing test** at `__tests__/asyncView.test.ts`

```ts
import fs from 'fs';
import path from 'path';
import { resolveAsyncView, userFacingErrorMessage } from '@/components/khazain/state/asyncView';
import { toApiError } from '@/services/api/errors';

describe('resolveAsyncView', () => {
  it.each(['idle', 'loading'] as const)('%s → skeleton (C5a: idle shares the loading path)', (s) => {
    expect(resolveAsyncView(s)).toEqual({ kind: 'skeleton' });
  });
  it('empty → empty', () => {
    expect(resolveAsyncView('empty')).toEqual({ kind: 'empty' });
  });
  it('success → content', () => {
    expect(resolveAsyncView('success')).toEqual({ kind: 'content' });
  });
  it('error with an ApiError → its Arabic message', () => {
    const err = toApiError(new TypeError('offline'));
    expect(resolveAsyncView('error', { error: err })).toEqual({ kind: 'error', message: err.message });
  });
  it('error with a plain English Error → undefined, so ErrorState uses its Arabic default', () => {
    expect(resolveAsyncView('error', { error: new Error('Unexpected 304 with no cached entry') }))
      .toEqual({ kind: 'error', message: undefined });
  });
  it('an explicit errorMessage wins over any error', () => {
    expect(resolveAsyncView('error', { error: toApiError(undefined, 500), errorMessage: 'رسالة' }))
      .toEqual({ kind: 'error', message: 'رسالة' });
  });
});

describe('userFacingErrorMessage', () => {
  it('returns undefined for null and undefined errors', () => {
    expect(userFacingErrorMessage(null)).toBeUndefined();
    expect(userFacingErrorMessage(undefined)).toBeUndefined();
  });
});

describe('AsyncContent delegates to resolveAsyncView', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'components/khazain/state/AsyncContent.tsx'), 'utf8');
  it('branches on the resolved view, not on raw status', () => {
    expect(src).toContain('resolveAsyncView(');
    // Neither `error?.message` nor `error.message` may be read in the component.
    expect(src).not.toMatch(/error\??\.message/);
  });
  it('warns in dev when a non-ApiError reaches the error state', () => {
    expect(src).toMatch(/__DEV__[\s\S]{0,200}isApiError\(error\)/);
    expect(src).toContain('console.warn(');
  });
});

describe('foundations sandbox drives the error state with an ApiError', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/foundations-sandbox.tsx'), 'utf8');
  it('does not hand AsyncContent a plain Error', () => {
    expect(src).not.toContain("new Error('خطأ تجريبي')");
    expect(src).toContain('toApiError(');
  });
});
```

**Step 2: Run it and confirm it fails**

`npx jest __tests__/asyncView.test.ts` → FAIL: "Cannot find module '@/components/khazain/state/asyncView'".

**Step 3: Minimal implementation**

`components/khazain/state/asyncView.ts`:
```ts
/**
 * Pure state selection for <AsyncContent>. No React Native imports, so it
 * runs under plain jest without a renderer (the repo has none in package.json).
 */
import { isApiError } from '@/services/api/errors';
import type { LoadState } from '@/types/content';

export type AsyncView =
  | { kind: 'skeleton' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string | undefined }
  | { kind: 'content' };

/**
 * Only ApiError messages are user-facing: they come from the Arabic table in
 * services/api/errors.ts. Any other Error may carry English developer text;
 * return undefined so ErrorState shows its Arabic default.
 */
export function userFacingErrorMessage(
  error: Error | null | undefined,
  override?: string,
): string | undefined {
  if (override) return override;
  return isApiError(error) ? error.message : undefined;
}

export function resolveAsyncView(
  status: LoadState,
  opts: { error?: Error | null; errorMessage?: string } = {},
): AsyncView {
  switch (status) {
    case 'idle':
    case 'loading':
      return { kind: 'skeleton' };
    case 'empty':
      return { kind: 'empty' };
    case 'error':
      return { kind: 'error', message: userFacingErrorMessage(opts.error, opts.errorMessage) };
    case 'success':
      return { kind: 'content' };
  }
}
```

`components/khazain/state/AsyncContent.tsx`: import `resolveAsyncView` from `./asyncView`, then replace `:98-121` with:
```tsx
  const view = resolveAsyncView(status, { error, errorMessage });

  switch (view.kind) {
    // C5a: idle is treated identically to loading
    case 'skeleton':
      return <>{skeleton ?? <SkeletonRowList count={3} />}</>;
    case 'empty':
      return <>{empty ?? <EmptyState message={emptyMessage} />}</>;
    case 'error':
      // Keep resolveAsyncView pure; the dev-only diagnostic lives here. A
      // non-ApiError's text is hidden from the user, so tell the developer.
      if (__DEV__ && error && !isApiError(error)) {
        console.warn(
          '[AsyncContent] non-ApiError reached the error state; showing the Arabic default instead of:',
          error,
        );
      }
      return <ErrorState message={view.message} onRetry={onRetry} />;
    case 'content':
      return (
        <FadeInView enabled={fadeIn} style={style}>
          {children}
        </FadeInView>
      );
  }
```
Also import `isApiError` from `@/services/api/errors`. Keep the props type and doc comment unchanged, and the `<FadeInView enabled={fadeIn} style={style}>` line **verbatim**: `__tests__/moreLayout.test.ts:129-131` pins it. Update the `errorMessage` prop doc to "(overrides an ApiError's message; non-ApiError messages are never shown)". Add `export * from './asyncView';` to `components/khazain/state/index.ts`.

**`app/foundations-sandbox.tsx:211`** (dev smoke screen, not on the legacy list): it passes `new Error('خطأ تجريبي')`. Under the guard, that plain Error's text would be replaced by ErrorState's default and would trigger the new warning. Change it to `toApiError(undefined, 500)` (import from `@/services/api/errors`). **Recorded output change:** the sandbox error card now reads "حدث خطأ في الخادم. يرجى المحاولة مجدداً بعد قليل." (`services/api/errors.ts:37`) instead of "خطأ تجريبي". This is a dev-only screen.

**Step 4: Run it and confirm it passes**

`npx jest __tests__/asyncView.test.ts __tests__/moreLayout.test.ts` → PASS (`moreLayout` pins the FadeInView line, `:131`).
`npx jest` → no regressions (every `AsyncContent` consumer is unchanged in the non-error states).
`npx tsc --noEmit --pretty false` → 0 errors. The exhaustive `switch` needs no default because `LoadState` is a closed union (`types/content.ts:19`). `__DEV__` is a global in RN typings.

**Step 5: Commit**
```bash
git add components/khazain/state/asyncView.ts components/khazain/state/AsyncContent.tsx components/khazain/state/index.ts app/foundations-sandbox.tsx __tests__/asyncView.test.ts
git commit -m "fix(state): select AsyncContent views in a pure helper and keep English errors off screen"
```

---

### Task 4: `reciterScreenState` pure helpers

**Files**
- Create: `services/reciterScreenState.ts`
- Test: `__tests__/reciterScreenState.test.ts` (new; Tasks 5 and 6 append to it)

**Step 1: Write the failing test** at `__tests__/reciterScreenState.test.ts`

```ts
import { RECITERS } from '@/data/content/quran';
import {
  RECITER_STATE_COPY,
  reciterDetailAsyncProps,
  reciterDetailState,
  reciterListView,
  retryTargets,
  type ReciterDetailInput,
} from '@/services/reciterScreenState';
import type { Reciter } from '@/types/content';

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
const r1 = RECITERS.find((r) => r.id === 'r1')!;

describe('RECITER_STATE_COPY', () => {
  it.each(Object.entries(RECITER_STATE_COPY))('%s is Arabic-only', (_k, v) => {
    expect(v).toMatch(ARABIC);
    expect(v).not.toMatch(LATIN);
  });
  it('keeps the not-found copy the screen already shipped', () => {
    expect(RECITER_STATE_COPY.notFound).toBe('لم يتم العثور على هذا القارئ');
  });
});

describe('reciterListView (audit gap 2)', () => {
  it.each(['idle', 'loading', 'empty', 'error'] as const)('%s → async (AsyncContent owns it)', (s) => {
    expect(reciterListView(s, RECITERS, 'tajweed')).toEqual({ kind: 'async' });
  });
  it('success with reciters in the tab → list filtered to that tab', () => {
    const v = reciterListView('success', RECITERS, 'murattal');
    expect(v.kind).toBe('list');
    const list = (v as { reciters: Reciter[] }).reciters;
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.style === 'murattal')).toBe(true);
  });
  it('success but the active tab is empty → tabEmpty, not a blank list', () => {
    const onlyTajweed = RECITERS.filter((r) => r.style === 'tajweed');
    expect(reciterListView('success', onlyTajweed, 'muallam')).toEqual({ kind: 'tabEmpty' });
  });
});

const base: ReciterDetailInput = {
  id: 'r1', reciters: RECITERS, recitersStatus: 'success', recitersError: null,
  surahsStatus: 'success', surahsError: null,
};

describe('reciterDetailState (audit gap 1)', () => {
  it.each(['idle', 'loading'] as const)('reciters %s → loading, never notFound', (s) => {
    expect(reciterDetailState({ ...base, reciters: [], recitersStatus: s })).toEqual({ kind: 'loading' });
  });
  it('reciters error → error carrying that error', () => {
    const e = new Error('x');
    expect(reciterDetailState({ ...base, reciters: [], recitersStatus: 'error', recitersError: e }))
      .toEqual({ kind: 'error', error: e });
  });
  it('unknown id once reciters loaded → notFound', () => {
    expect(reciterDetailState({ ...base, id: 'nope' })).toEqual({ kind: 'notFound' });
  });
  it('missing id → notFound', () => {
    expect(reciterDetailState({ ...base, id: undefined })).toEqual({ kind: 'notFound' });
  });
  it('reciters store empty → notFound', () => {
    expect(reciterDetailState({ ...base, reciters: [], recitersStatus: 'empty' })).toEqual({ kind: 'notFound' });
  });
  it('notFound wins over a surahs failure (retry cannot fix a bad id)', () => {
    expect(reciterDetailState({ ...base, id: 'nope', surahsStatus: 'error', surahsError: new Error('s') }))
      .toEqual({ kind: 'notFound' });
  });
  it.each(['idle', 'loading'] as const)('surahs %s → loading', (s) => {
    expect(reciterDetailState({ ...base, surahsStatus: s })).toEqual({ kind: 'loading' });
  });
  it('surahs error → error carrying the surahs error', () => {
    const e = new Error('s');
    expect(reciterDetailState({ ...base, surahsStatus: 'error', surahsError: e })).toEqual({ kind: 'error', error: e });
  });
  it('surahs empty → surahsEmpty', () => {
    expect(reciterDetailState({ ...base, surahsStatus: 'empty' })).toEqual({ kind: 'surahsEmpty' });
  });
  it('all loaded → ready with the reciter', () => {
    expect(reciterDetailState(base)).toEqual({ kind: 'ready', reciter: r1 });
  });
});

describe('reciterDetailAsyncProps', () => {
  it('maps every non-ready state onto AsyncContent props', () => {
    const e = new Error('x');
    expect(reciterDetailAsyncProps({ kind: 'loading' })).toEqual({ status: 'loading' });
    expect(reciterDetailAsyncProps({ kind: 'error', error: e })).toEqual({ status: 'error', error: e });
    expect(reciterDetailAsyncProps({ kind: 'notFound' }))
      .toEqual({ status: 'empty', emptyMessage: RECITER_STATE_COPY.notFound });
    expect(reciterDetailAsyncProps({ kind: 'surahsEmpty' }))
      .toEqual({ status: 'empty', emptyMessage: RECITER_STATE_COPY.surahsEmpty });
  });
});

describe('retryTargets', () => {
  it('refreshes every failed store and only those', () => {
    expect(retryTargets('error', 'error')).toEqual(['reciters', 'surahs']);
    expect(retryTargets('error', 'success')).toEqual(['reciters']);
    expect(retryTargets('success', 'error')).toEqual(['surahs']);
    expect(retryTargets('success', 'loading')).toEqual([]);
  });
});
```

**Step 2: Run it and confirm it fails**

`npx jest __tests__/reciterScreenState.test.ts` → FAIL: "Cannot find module '@/services/reciterScreenState'".

**Step 3: Minimal implementation** at `services/reciterScreenState.ts`

```ts
/**
 * services/reciterScreenState.ts
 * ------------------------------
 * Pure state selection for the reciters list (/sections/reciter, nodes
 * 2031:6193 / 2102:3187) and a reciter's surah list (/sections/reciter/[id],
 * node 2207:5270). The loaded states are Figma frames. The states below have
 * no frame: they follow constants/layout.ts and the shared state primitives.
 */
import type { LoadState, Reciter } from '@/types/content';

export const RECITER_STATE_COPY = Object.freeze({
  /** The store holds no reciters at all. */
  listEmpty: 'لا يوجد قراء حالياً',
  /** Reciters loaded, but none in the active tab. */
  tabEmpty: 'لا يوجد قراء في هذا التصنيف',
  /** The route's id matches no reciter. */
  notFound: 'لم يتم العثور على هذا القارئ',
  /** The reciter exists but there are no surahs to list. */
  surahsEmpty: 'لا توجد سور متاحة لهذا القارئ',
});

export type ReciterListView =
  | { kind: 'async' }
  | { kind: 'tabEmpty' }
  | { kind: 'list'; reciters: Reciter[] };

/** The store's `empty` is computed on the whole dataset; a tab can still be empty. */
export function reciterListView(
  status: LoadState,
  data: readonly Reciter[],
  tab: string,
): ReciterListView {
  if (status !== 'success') return { kind: 'async' };
  const reciters = data.filter((r) => r.style === tab);
  return reciters.length === 0 ? { kind: 'tabEmpty' } : { kind: 'list', reciters };
}

export type ReciterDetailInput = {
  id: string | undefined;
  reciters: readonly Reciter[];
  recitersStatus: LoadState;
  recitersError: Error | null;
  surahsStatus: LoadState;
  surahsError: Error | null;
};

export type ReciterDetailState =
  | { kind: 'loading' }
  | { kind: 'error'; error: Error | null }
  | { kind: 'notFound' }
  | { kind: 'surahsEmpty' }
  | { kind: 'ready'; reciter: Reciter };

const pending = (s: LoadState) => s === 'idle' || s === 'loading';

/** First match wins. See design §3.3 for why notFound outranks a surahs error. */
export function reciterDetailState(i: ReciterDetailInput): ReciterDetailState {
  if (pending(i.recitersStatus)) return { kind: 'loading' };
  if (i.recitersStatus === 'error') return { kind: 'error', error: i.recitersError };
  const reciter = i.id ? i.reciters.find((r) => r.id === i.id) : undefined;
  if (!reciter) return { kind: 'notFound' };
  if (pending(i.surahsStatus)) return { kind: 'loading' };
  if (i.surahsStatus === 'error') return { kind: 'error', error: i.surahsError };
  if (i.surahsStatus === 'empty') return { kind: 'surahsEmpty' };
  return { kind: 'ready', reciter };
}

export type ReciterDetailAsyncProps = {
  status: LoadState;
  error?: Error | null;
  emptyMessage?: string;
};

export function reciterDetailAsyncProps(
  state: Exclude<ReciterDetailState, { kind: 'ready' }>,
): ReciterDetailAsyncProps {
  switch (state.kind) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', error: state.error };
    case 'notFound':
      return { status: 'empty', emptyMessage: RECITER_STATE_COPY.notFound };
    case 'surahsEmpty':
      return { status: 'empty', emptyMessage: RECITER_STATE_COPY.surahsEmpty };
  }
}

export type ReciterDetailSource = 'reciters' | 'surahs';

/** One retry tap refreshes every failed store, and nothing that succeeded. */
export function retryTargets(
  recitersStatus: LoadState,
  surahsStatus: LoadState,
): ReciterDetailSource[] {
  const out: ReciterDetailSource[] = [];
  if (recitersStatus === 'error') out.push('reciters');
  if (surahsStatus === 'error') out.push('surahs');
  return out;
}
```

**Step 4: Run it and confirm it passes**

`npx jest __tests__/reciterScreenState.test.ts` → PASS. `npx tsc --noEmit --pretty false` → 0. `npx jest` → no regressions.

**Step 5: Commit**
```bash
git add services/reciterScreenState.ts __tests__/reciterScreenState.test.ts
git commit -m "feat(reciter): add pure state selection for the reciter list and surah list"
```

---

### Task 5: Wire the per-tab empty state into `reciter.tsx`

Closes audit gap 2.

**Files**
- Modify: `app/(tabs)/sections/reciter.tsx`
  - `:1-9`: add `EmptyState` to the `@/components/khazain` import
  - `:15`: add `import { RECITER_STATE_COPY, reciterListView } from '@/services/reciterScreenState';`
  - `:54-55`: replace `filtered` with `const view = reciterListView(status, data, active);`
  - `:75-103`: three-way branch
- Test: append to `__tests__/reciterScreenState.test.ts`

**Step 1: Write the failing source-contract test** (append)

```ts
import fs from 'fs';
import path from 'path';
const readApp = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('reciter.tsx wiring (nodes 2031:6193 / 2102:3187)', () => {
  const src = readApp('app/(tabs)/sections/reciter.tsx');
  it('selects its body through reciterListView', () => {
    expect(src).toContain('reciterListView(status, data, active)');
    expect(src).not.toMatch(/data\.filter\(\(r\) => r\.style === active\)/);
  });
  it('renders the per-tab Arabic empty state', () => {
    expect(src).toContain('RECITER_STATE_COPY.tabEmpty');
    expect(src).toContain('RECITER_STATE_COPY.listEmpty');
  });
  it('keeps the loaded FlatList geometry untouched', () => {
    expect(src).toContain('contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}');
  });
});
```

(Move the `fs`/`path` imports to the top of the file to satisfy `import/first` lint.)

**Step 2: Run it and confirm it fails**

`npx jest __tests__/reciterScreenState.test.ts -t "reciter.tsx wiring"` → FAIL (the source lacks `reciterListView`).

**Step 3: Implementation.** Replace `:75-103` with:
```tsx
        {view.kind === 'list' ? (
          <FlatList
            data={view.reciters}
            keyExtractor={(r) => r.id}
            renderItem={({ item: r }) => (
              <ReciterRow
                title={r.name}
                subtitle={r.styleLabel}
                isDefault={r.id === preferredReciterId}
                onPress={() => onPickReciter(r)}
              />
            )}
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
            showsVerticalScrollIndicator={false}
          />
        ) : view.kind === 'tabEmpty' ? (
          // Reciters loaded, but none in this tab: the store's `empty` is
          // whole-dataset, so this case needs its own card (no frame —
          // EmptyState tokens, letter-rail inset from styles.list).
          <View style={styles.list}>
            <EmptyState message={RECITER_STATE_COPY.tabEmpty} />
          </View>
        ) : (
          <View style={styles.list}>
            <AsyncContent
              status={status}
              error={error}
              onRetry={refresh}
              skeleton={<SkeletonRibbonList count={6} />}
              emptyMessage={RECITER_STATE_COPY.listEmpty}
            >
              {null}
            </AsyncContent>
          </View>
        )}
```
Update the comment at `:73-74` to name all three branches. Leave `styles` unchanged.

**Step 4: Run and confirm it passes**

`npx jest __tests__/reciterScreenState.test.ts` → PASS. `npx jest __tests__/rtlPhysicalContract.test.ts __tests__/sectionsLayout.test.ts __tests__/reciterNavigation.test.ts` → PASS. `npx tsc --noEmit --pretty false` → 0.

**Step 5: Commit**
```bash
git add "app/(tabs)/sections/reciter.tsx" __tests__/reciterScreenState.test.ts
git commit -m "fix(reciter): show an Arabic empty state for a reciter tab with no reciters"
```

---

### Task 6: Wire loading, error, not-found and empty states into `reciter/[id].tsx`

Closes audit gap 1.

**Files**
- Modify: `app/(tabs)/sections/reciter/[id].tsx`
  - `:1-3`: import `AsyncContent, SkeletonRibbonList` from `@/components/khazain` and drop the direct `EmptyState` import
  - add `import { reciterDetailAsyncProps, reciterDetailState, retryTargets } from '@/services/reciterScreenState';`
  - `:23-24`: destructure `status`, `error` and `refresh` from both stores
  - `:31`: keep `reciter` for the header; add `state` and `onRetry`
  - `:39-56`: branch on `state`
  - `:61-69`: add `stateBlock` style
- Test: append to `__tests__/reciterScreenState.test.ts`

**Step 1: Write the failing source-contract test** (append)

```ts
describe('reciter/[id].tsx wiring (node 2207:5270)', () => {
  const src = readApp('app/(tabs)/sections/reciter/[id].tsx');
  it('derives its body from reciterDetailState and renders non-ready states through AsyncContent', () => {
    expect(src).toContain('reciterDetailState(');
    expect(src).toContain('reciterDetailAsyncProps(');
    expect(src).toContain('<AsyncContent');
  });
  it('retries only the failed stores', () => {
    expect(src).toContain('retryTargets(recitersStatus, surahsStatus)');
  });
  it('renders the list only when the derived state is ready (not merely when the reciter is found)', () => {
    expect(src).toContain("state.kind === 'ready'");
    expect(src).not.toMatch(/\{reciter \? \(/);
  });
  it('keeps the loaded FlatList geometry untouched', () => {
    expect(src).toContain('contentContainerStyle={[styles.list, { paddingBottom: 24 }]}');
  });
});
```

**Step 2: Run it and confirm it fails**

`npx jest __tests__/reciterScreenState.test.ts -t "reciter/\[id\]"` → FAIL.

**Step 3: Implementation** (body of `ReciterSurahListScreen`):
```tsx
  const {
    data: reciters, status: recitersStatus, error: recitersError,
    fetch: fetchReciters, refresh: refreshReciters,
  } = useRecitersStore();
  const {
    data: surahs, status: surahsStatus, error: surahsError,
    fetch: fetchSurahs, refresh: refreshSurahs,
  } = useSurahsStore();

  useEffect(() => {
    fetchReciters();
    fetchSurahs();
  }, [fetchReciters, fetchSurahs]);

  // Header keeps its original expression so the loaded frame is unchanged.
  const reciter = reciters.find((r) => r.id === id);
  const state = reciterDetailState({
    id, reciters, recitersStatus, recitersError, surahsStatus, surahsError,
  });

  const onRetry = () => {
    for (const target of retryTargets(recitersStatus, surahsStatus)) {
      if (target === 'reciters') refreshReciters();
      else refreshSurahs();
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title={reciter?.name ?? 'القرآن حياة'} onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      {state.kind === 'ready' ? (
        <FlatList
          data={surahs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          renderItem={({ item }) => (
            <ReciterSurahRow
              surah={item}
              reciterName={state.reciter.name}
              onPress={() => startSurahPlayback(state.reciter, item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // Loading / error+retry / not-found / no-surahs. No frame: geometry
        // from CARD_DENSITY (surah row 60, gap 6), cards from EmptyState /
        // ErrorState tokens. Not wrapped around the FlatList: the fade
        // wrapper has no flex and would break scrolling.
        <View style={styles.stateBlock}>
          <AsyncContent
            {...reciterDetailAsyncProps(state)}
            onRetry={onRetry}
            skeleton={
              <SkeletonRibbonList
                count={8}
                height={CARD_DENSITY.surahRowMinHeight}
                gap={CARD_DENSITY.lectureListGap}
              />
            }
          >
            {null}
          </AsyncContent>
        </View>
      )}
    </SafeAreaView>
  );
```
`state` is a `const`, so the `state.kind === 'ready'` check narrows it inside the `renderItem` closure and inside the else branch (where `reciterDetailAsyncProps` accepts the non-ready union). No casts are needed; if tsc disagrees, hoist `const readyReciter = state.reciter` inside the branch instead of casting. Add `stateBlock: { paddingHorizontal: 16, paddingTop: 4 }` to `styles`; it mirrors `styles.list` padding. Update the header comment (`:13-18`) to mention the states.

**Step 4: Run and confirm it passes**

`npx jest __tests__/reciterScreenState.test.ts __tests__/reciterNavigation.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/sectionsLayout.test.ts __tests__/miniPlayerReach.test.ts` → PASS. `npx tsc --noEmit --pretty false` → 0.

**Step 5: Commit**
```bash
git add "app/(tabs)/sections/reciter/[id].tsx" __tests__/reciterScreenState.test.ts
git commit -m "fix(reciter): add loading, error-retry and not-found states to the surah list"
```

---

### Task 7: Full verification and visual QA

**Step 1: Automated gates**
```bash
npx jest                                   # expect 78 suites (73 + 5 new), 0 failures
npx tsc --noEmit --pretty false            # expect 0 errors
npm run lint 2>&1 | grep -E "sections/reciter|state/(AsyncContent|asyncView|index)|foundations-sandbox|services/(contentService|reciterScreenState|api/errors)|__tests__/(contentServiceErrors|contentServiceSwap|httpAdapterMapping|asyncView|reciterScreenState)" -A 2
                                           # expect no output (no new lint findings)
git log --oneline fix/real-device-layout-2026-09-12..HEAD   # 6 code commits + the plan-docs commit
```

**Step 2: Loaded-state regression on all 28 frames (must be pixel-identical to the Task 0 baseline)**

Task 3 changes `AsyncContent`, which ~18 screens render, so every manifest frame is re-captured, not only the three reciter frames. Load the `argent-device-interact` and `argent-screenshot-diff` skills first. Use the **same simulator** and Metro mode as the baseline (`EXPO_PUBLIC_VISUAL_AUDIT=1 npm start`, **without** `EXPO_PUBLIC_API_BASE`). The changes are JS-only, so no native rebuild is needed: reload Metro on this branch.

```bash
BASE=/private/tmp/claude-501/-Users-ahmedelhadarey-samer-khazayin-app/ad126e66-b973-46e5-9731-c506a3e034d8/scratchpad/qa
npm run capture:ios -- --out "$BASE/after"            # all 28; the same 5 transition frames are skipped
npm run compare:figma -- \
  --ios "$BASE/after" \
  --reference /Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference \
  --out "$BASE/compare"
```
`--reference` is required: the reference PNGs are untracked and live only in the main checkout, and the script's default (`docs/audit/2026-09-09/figma-reference`, `scripts/visual-audit/compare.mjs:45`) resolves inside the worktree, where they do not exist.

**Before/after diff (the gate).** For each of the 23 PNGs in `$BASE/baseline`, run argent `screenshot-diff` with the baseline file as `baseline` and the same-named file in `$BASE/after` as `current`, for example `08-2031-6193__sections-reciter__tab-tajweed.png` against `08-2031-6193__sections-reciter__tab-tajweed.png`. Pass: changed pixels fall **only** inside the device-chrome mask bands recorded in `capture-summary.json` (status-bar clock, home indicator). Any changed pixel in app content is a regression. Stop, fix it, and rerun.

Then check the `capture-summary.json` files: `$BASE/after/capture-summary.json` must list the same 23 captured and 5 skipped node ids as `$BASE/baseline/capture-summary.json`.

The Figma side-by-sides in `$BASE/compare/side-by-side/` and `overlay/` are **reviewed, not gated**. The app already differs from the exports in documented ways. Look closely at:

| Route (deep link `khazayinapp:///…`) | Figma reference PNG |
|---|---|
| `sections/reciter` (tajweed) | `08-2031-6193.png` |
| `sections/reciter?tab=murattal` | `10-2102-3187.png` |
| `sections/reciter/r1` | `13-2207-5270.png` |

**Step 3: New states via a local stub API (no frame; the governing contract is named per row)**

The audit simulator's SWR cache holds mock data, which would hide every loading, error and empty state. Use a **dedicated QA simulator** with a fresh install, then run `bash scripts/visual-audit/skip-onboarding-ios.sh`. `clearAppCache` (`services/cacheFacade.ts`) clears only the image cache, so it cannot reset this.

*3a. The stub server.* It uses only `node:http`, so it adds no dependency. It lives in the scratchpad at `$BASE/stub/khazayin-stub.mjs` and is **never committed**. The mode switches at runtime, with no restart:

```js
// $BASE/stub/khazayin-stub.mjs — QA-only; never commit.
import http from 'node:http';
const PORT = Number(process.env.PORT ?? 8787);
let mode = process.argv[2] ?? 'hang'; // hang | fail500 | data | tabEmpty | listEmpty | surahsEmpty

const R = (id, name, style, styleLabel) => ({ id, name, style, styleLabel });
const TAJWEED = [
  R('r1', 'الشيخ عبد الباسط عبد الصمد', 'tajweed', 'المصحف المجوّد'),
  R('r2', 'الشيخ محمود خليل الحصري', 'tajweed', 'المصحف المجوّد'),
];
const ALL = [...TAJWEED, R('r3', 'الشيخ محمد صديق المنشاوي', 'murattal', 'المصحف المرتل')];
const SURAHS = [
  { id: '001', number: 1, displayNumber: '٠١', name: 'سورة الفاتحة', meta: 'مكية · ٧ آيات', revelationType: 'meccan', ayahCount: 7 },
  { id: '002', number: 2, displayNumber: '٠٢', name: 'سورة البقرة', meta: 'مدنية · ٢٨٦ آية', revelationType: 'medinan', ayahCount: 286 },
];
const page = (items) => ({ items, nextCursor: null });

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (pathname.startsWith('/__mode/')) {           // curl -X POST .../__mode/<mode>
    mode = pathname.slice('/__mode/'.length);
    return json(res, 200, { mode });
  }
  console.log(mode, req.method, req.url);
  if (mode === 'hang') return;                      // never respond → client 15 s timeout
  if (mode === 'fail500') return json(res, 500, { error: { code: 'INTERNAL' } });
  if (pathname === '/v1/reciters') {
    if (mode === 'listEmpty') return json(res, 200, []);
    if (mode === 'tabEmpty' || mode === 'surahsEmpty') return json(res, 200, TAJWEED);
    return json(res, 200, ALL);                     // data
  }
  if (pathname === '/v1/surahs') {
    return json(res, 200, page(mode === 'surahsEmpty' ? [] : SURAHS));
  }
  return json(res, 404, { error: { code: 'NOT_FOUND' } }); // every other domain: Arabic notFound ApiError
}).listen(PORT, '127.0.0.1', () => console.log(`stub on :${PORT} mode=${mode}`));
```

Run it with `node "$BASE/stub/khazayin-stub.mjs" hang`. In a second terminal, start Metro pointed at it: `EXPO_PUBLIC_API_BASE=http://127.0.0.1:8787 npx expo start --clear`. `--clear` is required so the variable is inlined; the simulator shares the host loopback. Switch modes with `curl -X POST http://127.0.0.1:8787/__mode/<mode>`.

**Cache rule:** a **successful** response (any mode except `hang` and `fail500`) is written to the SWR cache for 24 h. Once that has happened, a later mode is served from the cache. Do a **fresh install** (argent `reinstall-app`, then `skip-onboarding-ios.sh`) before each of the install groups below. The `hang` and `fail500` modes write nothing, so they can share an install.

*3b. QA matrix* (all on the QA simulator, deep links via argent `open-url`)

| # | Install group / stub mode | Route | Expected | Governing contract |
|---|---|---|---|---|
| a | Any install, **no stub** (Metro without `EXPO_PUBLIC_API_BASE`, mock mode) | `sections/reciter/zzz` | Header "القرآن حياة", search pill, cream card "لم يتم العثور على هذا القارئ", **no** retry button | `EmptyState` tokens (`theme.ts` KhazainColors/Radius/Spacing); `[id]` `stateBlock` padding 16 |
| b | **G1** fresh install · `hang` | `sections/reciter/r1` | About 15 s of 8 shimmer ribbons, 60 tall and 6 apart, under the search pill | `CARD_DENSITY.surahRowMinHeight` / `lectureListGap` (`constants/layout.ts:303,337`) |
| c | G1 · `hang` (continue b) | `sections/reciter/r1` | After the timeout: ErrorState "انتهت مهلة الطلب. يرجى المحاولة مجدداً." with a navy "حاول مجدداً" pill. Tapping it returns to the skeleton (b) | `ErrorState` tokens; copy `services/api/errors.ts:32` |
| d | G1 · `hang` | `sections/reciter` | Tabs visible, 6 ribbons 56 tall, letter rail on the **physical right** | `CARD_DENSITY.skeletonRibbonHeight`, `LETTER_INDEX_EDGE` (`constants/rtlContracts.ts`) |
| e | G1 · `fail500` | `sections/reciter` | After about 1 s (3 attempts; backoff 250 + 500 ms ±25%): ErrorState "حدث خطأ في الخادم. يرجى المحاولة مجدداً بعد قليل." in the list column, clear of the rail | copy `services/api/errors.ts:37`; `RESERVED_COLUMNS.letterRailInset`, `PHYSICAL_BOX` |
| f | G1 · `fail500` → `curl …/__mode/data` → tap "حاول مجدداً" | `sections/reciter/r1` | Retry recovers: the surah list renders (2 rows), header shows the reciter name | `retryTargets` refreshes both failed stores in one tap |
| g | **G2** fresh install · `tabEmpty` | `sections/reciter`, then tap the **المصحف المعلّم** (or **المصحف المرتل**) tab | Tajweed tab lists 2 reciters. The other tab shows the cream card "لا يوجد قراء في هذا التصنيف" inside the list column, rail still visible on the right | `RECITER_STATE_COPY.tabEmpty`; `styles.list` letter-rail inset |
| h | G2 · `curl …/__mode/surahsEmpty`. Reciters are already cached from (g), and surahs are **not yet fetched** on G2, so the next fetch returns `{items: []}` | `sections/reciter/r1` | Header "الشيخ عبد الباسط عبد الصمد", cream card "لا توجد سور متاحة لهذا القارئ", no retry | `RECITER_STATE_COPY.surahsEmpty` |
| i | **G3** fresh install · `listEmpty` | `sections/reciter` | The store goes to `empty`: AsyncContent card "لا يوجد قراء حالياً" on **every** tab | `RECITER_STATE_COPY.listEmpty` |
| j | G3 · `listEmpty` | `sections/reciter/r1` | notFound card "لم يتم العثور على هذا القارئ" (no reciters, so none matches) | precedence rule 3, design §3.3 |
| k | n/a | n/a | Simulated mock error: not toggleable at runtime without a code edit. Covered by `contentServiceErrors.test.ts`. Record "not captured" | n/a |

For (h) to hold, do **not** open any screen that fetches surahs (Mushaf, a reciter's list) during (g). If one was opened, reinstall and run (h) as its own group with `surahsEmpty` from the start: that mode serves tajweed reciters and empty surahs together.

Save every state screenshot as `$BASE/states/<letter>-<state>.png`. Afterwards: stop the stub, restart Metro **without** `EXPO_PUBLIC_API_BASE` (`npx expo start --clear`), and confirm `sections/reciter/r1` loads in mock mode on the audit simulator. **Never commit** the stub, an env file, `EXPO_PUBLIC_API_BASE` or `EXPO_PUBLIC_API_TOKEN`. `git status --short` must be clean apart from the intended commits.

**Step 4: Clean up.** Call argent `stop-all-simulator-servers` with `devices: [<udids used>]`.

**Step 5: Commit.** Commit only if Step 1 forced a fix. Otherwise there is nothing to commit; captures stay in `/tmp`.

---

## Acceptance-criteria traceability

| Criterion | Task(s) |
|---|---|
| Interfaces for Surah/Reciter/Scholar/Book/DawahPoster/Lecture/Ayah | Already met (`types/content.ts:37-115`); no task |
| Sub-screens consume the service layer | 4, 6 (reciter sub-route now honours store state) |
| Loading skeletons | 3, 4, 6; QA 7.3 b/d |
| Arabic empty states | 4, 5, 6; QA 7.3 a/g/h/i/j |
| Error states with retry | 1, 3, 4, 6; QA 7.3 c/e/f |
| Clear swap point | 2 |
| Gap 5 (static chrome tables) | Recorded as acceptable, design §8; no task |
