import { threadListPlan } from '@/services/community/threadActions';
import { createPaginatedStore } from '@/store/paginated';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Item = { id: string };
const PAGES: Record<string, { items: Item[]; nextCursor: string | null }> = {
  first: { items: [{ id: 'a' }], nextCursor: 'c2' },
  c2: { items: [{ id: 'b' }], nextCursor: 'c3' },
  c3: { items: [{ id: 'c' }], nextCursor: null },
};

/** A store whose n-th fetch (1-based) listed in `failOn` throws. */
function make(failOn: number[] = [], pages = PAGES) {
  let call = 0;
  return createPaginatedStore<Item>({
    name: `t-${Math.random()}`,
    fetcher: async (cursor: string | null) => {
      call += 1;
      if (failOn.includes(call)) throw new Error('net');
      return { data: pages[cursor ?? 'first'], etag: null };
    },
    isEmpty: (items) => items.length === 0,
  });
}

const plan = (s: ReturnType<ReturnType<typeof make>['getState']>) =>
  threadListPlan({ status: s.status, count: s.items.length, hasMore: s.hasMore, fetchingMore: s.fetchingMore });

describe('a later page that fails and is retried', () => {
  it('clears the error once the retry loads', async () => {
    const store = make([2]);
    await store.getState().fetch();
    await store.getState().fetchMore();
    expect(store.getState()).toMatchObject({ status: 'error', hasMore: true });
    expect(store.getState().items).toHaveLength(1);

    await store.getState().fetchMore();
    expect(store.getState()).toMatchObject({ status: 'success', error: null, hasMore: true });
    expect(store.getState().items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(plan(store.getState())).toMatchObject({ footerRetry: false, canLoadMore: true });
  });

  it('ends cleanly after the last page', async () => {
    const store = make([2]);
    await store.getState().fetch();
    await store.getState().fetchMore();
    await store.getState().fetchMore();
    await store.getState().fetchMore();
    expect(store.getState()).toMatchObject({ status: 'success', hasMore: false });
    expect(plan(store.getState())).toMatchObject({ footerRetry: false, canLoadMore: false });
  });

  it('keeps an empty first page as empty, and does not turn it into success', async () => {
    const store = make([], { first: { items: [], nextCursor: null } });
    await store.getState().fetch();
    expect(store.getState().status).toBe('empty');
  });
});

describe('paths that must not change', () => {
  it('a failed first page stays an error with nothing loaded', async () => {
    const store = make([1]);
    await store.getState().fetch();
    expect(store.getState()).toMatchObject({ status: 'error', items: [] });
  });

  it('refresh after a failed page reloads from page 1 and clears the error', async () => {
    const store = make([2]);
    await store.getState().fetch();
    await store.getState().fetchMore();
    await store.getState().refresh();
    expect(store.getState()).toMatchObject({ status: 'success', error: null });
    expect(store.getState().items.map((i) => i.id)).toEqual(['a']);
  });

  it('a successful page leaves a success status alone', async () => {
    const store = make();
    await store.getState().fetch();
    await store.getState().fetchMore();
    expect(store.getState().status).toBe('success');
  });
});
