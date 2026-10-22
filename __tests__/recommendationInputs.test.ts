/**
 * T6 - recommendation inputs store (design §7.4): activity read, the guarded
 * catalogue loader (N1 gate, single-flight, pool of 4, stop on auth) and the
 * progressStore.ready trigger.
 */
import fs from 'fs';
import path from 'path';
import { makeApiError } from '@/services/api/errors';
import { MAX_SIGNAL_AGE_MS, PAGE_READ_LIMIT, LISTEN_LIMIT } from '@/constants/recommendations';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockGetRepos = jest.fn(async () => ({}));
const mockListRecent = jest.fn(async (_limit: number): Promise<unknown[]> => []);
const mockRecentPageReads = jest.fn(
  async (_since: number, _limit: number): Promise<unknown[]> => [],
);

jest.mock('@/db', () => ({
  getRepos: () => mockGetRepos(),
  progressRepo: {
    recentPageReads: (s: number, l: number) => mockRecentPageReads(s, l),
  },
  lectureRepo: { listRecent: (l: number) => mockListRecent(l) },
  achievementsRepo: { evaluateAll: jest.fn(async () => []) },
}));
jest.mock('@/store/wirdStore', () => ({ useWirdStore: { getState: () => ({}) } }));
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({}) } }));

const MOCK_SCHOLARS = Array.from({ length: 10 }, (_, i) => ({ id: `s${i + 1}`, name: `عالم ${i + 1}` }));

const mockCalls = { total: 0, inFlight: 0, max: 0, listLectures: 0, scholarsList: 0 };
const mockFail: Record<string, Error> = {};

async function mockTrack<T>(key: string, data: T): Promise<{ data: T; etag: null }> {
  mockCalls.total += 1;
  mockCalls.inFlight += 1;
  mockCalls.max = Math.max(mockCalls.max, mockCalls.inFlight);
  try {
    await new Promise((r) => setTimeout(r, 2));
    if (mockFail[key]) throw mockFail[key];
    return { data, etag: null };
  } finally {
    mockCalls.inFlight -= 1;
  }
}

const mockPageByCategory = jest.fn((cat: string, _cursor: string | null, _opts?: unknown) =>
  mockTrack(`page:${cat}`, { items: [{ id: `${cat}-1`, title: cat, scholar: '', duration: '', category: cat }], nextCursor: null }),
);

jest.mock('@/services/contentService', () => ({
  contentService: {
    scholars: {
      list: () => {
        mockCalls.scholarsList += 1;
        return mockTrack('scholars', MOCK_SCHOLARS);
      },
      listLectures: (id: string) => {
        mockCalls.listLectures += 1;
        return mockTrack(`sl:${id}`, [{ id: `l-${id}`, title: `سلسلة ${id}`, scholar: id, duration: '', category: 'scholar' }]);
      },
    },
    books: { list: () => mockTrack('books', [{ id: 'b1', title: 'كتاب' }]) },
    quran: { listSurahs: () => mockTrack('surahs', [{ id: '1', name: 'الفاتحة' }]) },
    lectures: {
      pageByCategory: (c: string, cur: string | null, o?: unknown) => mockPageByCategory(c, cur, o),
    },
  },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
function load() {
  const inputs = require('@/store/recommendationInputsStore');
  const catalogue = require('@/services/recommendations/catalogue');
  const { useProgressStore } = require('@/store/progressStore');
  return {
    useRecommendationInputsStore: inputs.useRecommendationInputsStore as typeof import('@/store/recommendationInputsStore').useRecommendationInputsStore,
    startActivityWatch: inputs.startActivityWatch as typeof import('@/store/recommendationInputsStore').startActivityWatch,
    shouldLoadCatalogue: catalogue.shouldLoadCatalogue as typeof import('@/services/recommendations/catalogue').shouldLoadCatalogue,
    useProgressStore: useProgressStore as typeof import('@/store/progressStore').useProgressStore,
  };
}
/* eslint-enable @typescript-eslint/no-require-imports */

let m: ReturnType<typeof load>;

async function waitFor(cond: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !cond(); i += 1) await new Promise((r) => setTimeout(r, 2));
  expect(cond()).toBe(true);
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockCalls.total = 0;
  mockCalls.inFlight = 0;
  mockCalls.max = 0;
  mockCalls.listLectures = 0;
  mockCalls.scholarsList = 0;
  for (const k of Object.keys(mockFail)) delete mockFail[k];
  mockListRecent.mockImplementation(async () => []);
  mockRecentPageReads.mockImplementation(async () => []);
  m = load();
});

describe('catalogue loader (T6)', () => {
  it('gates the catalogue on signals or a surah context (N1)', async () => {
    const { useRecommendationInputsStore: s, shouldLoadCatalogue } = m;
    expect(shouldLoadCatalogue(0, undefined)).toBe(false);
    expect(shouldLoadCatalogue(1, undefined)).toBe(true);
    expect(shouldLoadCatalogue(0, 2)).toBe(true);
    await s.getState().loadCatalogue({ signalCount: 0 });
    expect(mockCalls.total).toBe(0);
    expect(s.getState().catalogueStatus).toBe('idle');
    await s.getState().loadCatalogue({ signalCount: 0, contextSurah: 1 });
    expect(s.getState().catalogueStatus).toBe('ready');
  });

  it('is single-flight and then a no-op', async () => {
    const st = m.useRecommendationInputsStore.getState();
    const p1 = st.loadCatalogue({ signalCount: 1 });
    const p2 = st.loadCatalogue({ signalCount: 1, contextSurah: 2 });
    expect(p1).toBe(p2);
    await Promise.all([p1, p2]);
    expect(mockCalls.scholarsList).toBe(1);
    const n = mockCalls.total;
    expect(n).toBeGreaterThan(0);
    await st.loadCatalogue({ signalCount: 1 });
    expect(mockCalls.total).toBe(n);
  });

  it('survives an unfiltered subscriber that reloads on every state change', async () => {
    const { useRecommendationInputsStore: s } = m;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useScholarsStore } = require('@/store/scholarStore');
    const reload = () => void s.getState().loadCatalogue({ signalCount: 1 });
    const unsubs = [s.subscribe(reload), useScholarsStore.subscribe(reload)];
    try {
      expect(() => reload()).not.toThrow();
      expect(s.getState().catalogueStatus).toBe('loading');
      await waitFor(() => s.getState().catalogueStatus === 'ready');
    } finally {
      unsubs.forEach((u) => u());
    }
    expect(mockCalls.scholarsList).toBe(1);
  });

  it('fetches page 1 of all four lecture stores without any screen mounted', async () => {
    await m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
    for (const c of ['prophet', 'book', 'queen', 'radio']) {
      expect(mockPageByCategory).toHaveBeenCalledWith(c, null, expect.anything());
    }
  });

  it('builds a snapshot from scholars, their series, paged lectures and books', async () => {
    await m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
    const snap = m.useRecommendationInputsStore.getState().catalogue;
    expect(snap?.scholars).toHaveLength(MOCK_SCHOLARS.length);
    expect(snap?.books).toHaveLength(1);
    expect(snap?.lectures.length).toBe(MOCK_SCHOLARS.length + 4);
    expect(snap?.lectures.find((l) => l.id === 'l-s3')?.scholarId).toBe('s3');
  });

  it('never runs more than 4 requests at once', async () => {
    await m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
    expect(mockCalls.max).toBeLessThanOrEqual(4);
    expect(mockCalls.max).toBeGreaterThan(1);
  });

  it('stops on the first 401 and keeps a partial snapshot', async () => {
    mockFail['sl:s1'] = makeApiError('auth');
    await m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
    const st = m.useRecommendationInputsStore.getState();
    expect(st.catalogueStatus).toBe('aborted');
    expect(st.catalogue?.scholars.length).toBeGreaterThan(0);
    expect(mockCalls.listLectures).toBeLessThan(MOCK_SCHOLARS.length);
  });

  it('keeps going past a non-auth failure', async () => {
    mockFail['sl:s1'] = makeApiError('server');
    await m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
    const st = m.useRecommendationInputsStore.getState();
    expect(st.catalogueStatus).toBe('ready');
    expect(mockCalls.listLectures).toBe(MOCK_SCHOLARS.length);
  });

  it('waits for a store that is already loading and uses its data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useBooksStore } = require('@/store/booksStore') as typeof import('@/store/booksStore');
    useBooksStore.setState({ status: 'loading' });
    const done = m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
    // Every other fetch (the last batch is the four paged stores) has run, so
    // only the loading books store can still be holding the loader.
    await waitFor(() => mockCalls.listLectures === MOCK_SCHOLARS.length && mockCalls.inFlight === 0);
    await new Promise((r) => setTimeout(r, 10));
    expect(m.useRecommendationInputsStore.getState().catalogueStatus).toBe('loading');
    expect(mockPageByCategory).not.toHaveBeenCalled();
    useBooksStore.setState({ data: [{ id: 'late', title: 'متأخر' }], status: 'success' });
    await done;
    const st = m.useRecommendationInputsStore.getState();
    expect(st.catalogueStatus).toBe('ready');
    expect(st.catalogue?.books.map((b) => b.id)).toEqual(['late']);
  });

  it('gives up on a store stuck in loading after 15s and ignores it afterwards', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useBooksStore } = require('@/store/booksStore') as typeof import('@/store/booksStore');
    jest.useFakeTimers();
    try {
      useBooksStore.setState({ status: 'loading' });
      const done = m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
      await jest.advanceTimersByTimeAsync(14_000);
      expect(m.useRecommendationInputsStore.getState().catalogueStatus).toBe('loading');
      await jest.advanceTimersByTimeAsync(1_000);
      // Let the paged-store batch that follows the timed-out wait finish.
      await jest.advanceTimersByTimeAsync(100);
      await done;
      const st = m.useRecommendationInputsStore.getState();
      expect(st.catalogueStatus).toBe('ready');
      expect(st.catalogue?.books).toEqual([]);
      useBooksStore.setState({ data: [{ id: 'later', title: 'x' }], status: 'success' });
      expect(m.useRecommendationInputsStore.getState().catalogue?.books).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('settles as aborted, with a snapshot, on an unexpected throw', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useScholarsStore } = require('@/store/scholarStore') as typeof import('@/store/scholarStore');
    jest.spyOn(useScholarsStore.getState(), 'fetch').mockRejectedValue(new Error('boom'));
    await m.useRecommendationInputsStore.getState().loadCatalogue({ signalCount: 1 });
    const st = m.useRecommendationInputsStore.getState();
    expect(st.catalogueStatus).toBe('aborted');
    expect(st.catalogue).not.toBeNull();
  });

  it('gates the reset-time refreshActivity behind the kill switch (§7.7)', () => {
    const src = read('app/(tabs)/more/settings-progress.tsx');
    expect(src).toMatch(/RECOMMENDATIONS_ENABLED[\s\S]{0,120}refreshActivity\(\)/);
  });

  it('never calls refresh()', () => {
    expect(read('store/recommendationInputsStore.ts')).not.toMatch(/\.refresh\(/);
  });

  it('keeps catalogue.ts pure', () => {
    expect(read('services/recommendations/catalogue.ts')).not.toMatch(
      /from '(react|zustand|@\/db|@\/services\/contentService|@\/store\/)/,
    );
  });
});

describe('activity (T6)', () => {
  it('awaits getRepos before reading activity, and marks a failed DB', async () => {
    const s = m.useRecommendationInputsStore;
    await s.getState().refreshActivity();
    expect(mockGetRepos.mock.invocationCallOrder[0]).toBeLessThan(
      mockListRecent.mock.invocationCallOrder[0],
    );
    expect(s.getState().activity?.failed).toBe(false);
    mockListRecent.mockRejectedValueOnce(new Error('db'));
    await s.getState().refreshActivity();
    expect(s.getState().activity).toEqual({ sessions: [], pageReads: [], failed: true });
  });

  it('reads with the configured limits and stamps nowMs', async () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000_000_000);
    try {
      await m.useRecommendationInputsStore.getState().refreshActivity();
    } finally {
      spy.mockRestore();
    }
    expect(mockListRecent).toHaveBeenCalledWith(LISTEN_LIMIT);
    expect(mockRecentPageReads).toHaveBeenCalledWith(1_000_000_000_000 - MAX_SIGNAL_AGE_MS, PAGE_READ_LIMIT);
    expect(m.useRecommendationInputsStore.getState().nowMs).toBe(1_000_000_000_000);
  });

  it('seeds nowMs at store creation, so a fresh store is never at epoch 0', () => {
    expect(m.useRecommendationInputsStore.getState().nowMs).toBeGreaterThan(0);
  });

  it('skips the DB when progressStore.dbFailed is set', async () => {
    m.useProgressStore.setState({ dbFailed: true });
    await m.useRecommendationInputsStore.getState().refreshActivity();
    expect(mockListRecent).not.toHaveBeenCalled();
    expect(m.useRecommendationInputsStore.getState().activity?.failed).toBe(true);
  });

  it('re-runs refreshActivity when progressStore.ready turns true', () => {
    const { useRecommendationInputsStore: s, useProgressStore, startActivityWatch } = m;
    const spy = jest.spyOn(s.getState(), 'refreshActivity');
    useProgressStore.setState({ ready: false });
    const stop = startActivityWatch();
    useProgressStore.setState({ ready: true });
    useProgressStore.setState({ ready: true });
    expect(spy).toHaveBeenCalledTimes(1);
    stop();
  });

  it('refreshes at once when ready is already true, and is idempotent', () => {
    const { useRecommendationInputsStore: s, useProgressStore, startActivityWatch } = m;
    useProgressStore.setState({ ready: true });
    const spy = jest.spyOn(s.getState(), 'refreshActivity');
    const stopA = startActivityWatch();
    const stopB = startActivityWatch();
    expect(spy).toHaveBeenCalledTimes(1);
    useProgressStore.setState({ ready: false });
    useProgressStore.setState({ ready: true });
    expect(spy).toHaveBeenCalledTimes(2);
    stopA();
    stopB();
  });
});
