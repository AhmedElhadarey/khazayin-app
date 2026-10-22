import { makeApiError } from '@/services/api/errors';
import { communityService } from '@/services/community';
import { mockCommunityAdapter as mock } from '@/services/community/mockAdapter';
import {
  prependPost,
  removePost,
  replacePost,
  resetMutations,
  runMutation,
  useMutationStatusStore,
} from '@/store/communityMutations';
import {
  findThreadPost,
  resetCommunityStores,
  groupDetailStore,
  useMyGroupsStore,
  useThreadPostsStore,
  useThreadSummariesStore,
  visiblePosts,
} from '@/store/communityStores';
import { ledgerPort, useCommunityLocalStore, type MockLedger } from '@/store/communityLocalStore';
import { LECTURES_BY_SCHOLAR } from '@/data/content/scholars';
import type { Group, Post } from '@/types/community';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// The production index never exposes the mock; the test selects it explicitly.
jest.mock('@/services/community', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  communityService: require('@/services/community/mockAdapter').mockCommunityAdapter,
}));

const LECTURE = 'sl1-1';
const emptyLedger = (): MockLedger => ({ posts: [], groups: [], memberships: [], challenges: [], responses: {} });
const BODY = 'جزاكم الله خيرًا على هذه الفائدة';

const mkPost = (id: string, memberId = 'm', lectureId = LECTURE): Post => ({
  id,
  lectureId,
  author: { memberId, displayName: 'x', isOwner: false },
  body: 'b',
  createdAt: 1,
  moderation: { status: 'visible', updatedAt: 1 },
  isMine: false,
});

afterEach(() => jest.restoreAllMocks());

beforeEach(() => {
  mock.mockDelay = 0;
  mock.simulateError = false;
  mock.holdForReview = false;
  ledgerPort.write(emptyLedger);
  useCommunityLocalStore.setState({ profile: { memberId: 'viewer-a', displayName: 'مستخدم', serverIssued: false } });
  resetCommunityStores();
  resetMutations();
});

describe('keyed factories', () => {
  it('returns one store per key', () => {
    expect(groupDetailStore('g1')).toBe(groupDetailStore('g1'));
    expect(groupDetailStore('g1')).not.toBe(groupDetailStore('g2'));
    expect(useThreadPostsStore('L1')).toBe(useThreadPostsStore('L1'));
    expect(useThreadPostsStore('L1')).not.toBe(useThreadPostsStore('L2'));
    expect(useThreadSummariesStore('s1')).toBe(useThreadSummariesStore('s1'));
  });

  it('loads posts through the paged envelope', async () => {
    const store = useThreadPostsStore(LECTURE);
    await store.getState().fetch();
    expect(store.getState().status).toBe('success');
    expect(store.getState().items.length).toBeGreaterThan(0);
  });

  it('loads a scholar thread summaries', async () => {
    const store = useThreadSummariesStore('s1');
    await store.getState().fetch();
    expect(store.getState().status).toBe('success');
    expect(store.getState().data.map((t) => t.lectureId)).toEqual(LECTURES_BY_SCHOLAR.s1.map((l) => l.id));
    expect(store.getState().data.find((t) => t.lectureId === LECTURE)?.postCount).toBe(3);
  });

  it('starts my groups at an empty list', () => {
    expect(useMyGroupsStore.getState().data).toEqual([]);
  });
});

describe('runMutation', () => {
  it('refreshes my groups after a join', async () => {
    await runMutation('joinGroup', '-', { code: 'KHZ7Q2' }, (requestId) =>
      communityService.groups.join({ requestId, code: 'KHZ7Q2' }),
    );
    expect(useMyGroupsStore.getState().data.map((g) => g.joinCode)).toContain('KHZ7Q2');
  });

  it('does not flip my groups to loading when a join refreshes them', async () => {
    const seen: string[] = [];
    const unsub = useMyGroupsStore.subscribe((s) => seen.push(s.status));
    await runMutation('joinGroup', '-', { code: 'KHZ7Q2' }, (requestId) =>
      communityService.groups.join({ requestId, code: 'KHZ7Q2' }),
    );
    unsub();
    expect(seen).not.toContain('loading');
    expect(useMyGroupsStore.getState()).toMatchObject({ status: 'success' });
  });

  it('refreshes a cached group detail quietly after setShareMyProgress', async () => {
    const g = await communityService.groups.join({ requestId: 'r-join', code: 'KHZ7Q2' });
    const detail = groupDetailStore(g.id);
    await detail.getState().fetch();
    const seen: string[] = [];
    const unsub = detail.subscribe((s) => seen.push(s.status));
    await runMutation('setShareMyProgress', g.id, { share: true }, (requestId) =>
      communityService.groups.setShareMyProgress({ requestId, groupId: g.id, share: true }),
    );
    unsub();
    expect(seen).not.toContain('loading');
    expect(detail.getState().data?.me.shareMyProgress).toBe(true);
  });

  it('keeps the old data and reports success when the quiet refresh fails', async () => {
    useMyGroupsStore.setState({ data: [], status: 'empty' });
    const spy = jest.spyOn(communityService.groups, 'listMine').mockRejectedValue(makeApiError('network'));
    await expect(
      runMutation('joinGroup', '-', { code: 'KHZ7Q2' }, (requestId) => communityService.groups.join({ requestId, code: 'KHZ7Q2' })),
    ).resolves.toBeDefined();
    spy.mockRestore();
    expect(useMyGroupsStore.getState()).toMatchObject({ data: [], status: 'empty' });
    expect(useMutationStatusStore.getState().byKey['joinGroup:-']).toBeUndefined();
  });

  it('reports success with no error status when an effect throws after a good write', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useThreadPostsStore(LECTURE).setState({ items: [mkPost('a')], status: 'success' });
    const send = () => Promise.resolve(undefined as unknown as Post); // prependPost will throw on it
    await expect(runMutation('createPost', LECTURE, { body: BODY }, send)).resolves.toBeUndefined();
    expect(useMutationStatusStore.getState().byKey[`createPost:${LECTURE}`]).toBeUndefined();
  });

  it('stays in flight until the quiet re-fetch has finished', async () => {
    let release!: (g: Group[]) => void;
    const spy = jest.spyOn(communityService.groups, 'listMine').mockImplementation(() => new Promise<Group[]>((r) => (release = r)));
    const perform = jest.fn((requestId: string) => communityService.groups.join({ requestId, code: 'KHZ7Q2' }));
    const first = runMutation('joinGroup', '-', { code: 'KHZ7Q2' }, perform);
    await new Promise<void>((r) => setTimeout(r, 20));
    expect(release).toBeDefined();
    expect(useMutationStatusStore.getState().byKey['joinGroup:-']).toMatchObject({ inFlight: true });
    expect(runMutation('joinGroup', '-', { code: 'KHZ7Q2' }, perform)).toBe(first);
    release([]);
    await first;
    spy.mockRestore();
    expect(useMutationStatusStore.getState().byKey['joinGroup:-']).toBeUndefined();
  });

  it('returns the first promise and sends nothing for another payload on the same intent', async () => {
    let release!: () => void;
    const perform = jest.fn(() => new Promise<string>((r) => (release = () => r('ok'))));
    const a = runMutation('report', 'p5', { reason: 'spam' }, perform);
    const other = jest.fn(() => Promise.resolve('other'));
    const b = runMutation('report', 'p5', { reason: 'other' }, other);
    expect(b).toBe(a);
    release();
    await a;
    expect(other).not.toHaveBeenCalled();
  });

  it('writes nothing back when a mutation settles after the stores were reset', async () => {
    const p = runMutation('joinGroup', '-', { code: 'KHZ7Q2' }, (requestId) =>
      communityService.groups.join({ requestId, code: 'KHZ7Q2' }),
    );
    resetCommunityStores();
    resetMutations();
    await p;
    expect(useMyGroupsStore.getState()).toMatchObject({ data: [], status: 'idle' });
    expect(useMutationStatusStore.getState().byKey).toEqual({});
  });

  it('drops the cached group detail after leaving that group', async () => {
    const g = await communityService.groups.join({ requestId: 'r-join', code: 'KHZ7Q2' });
    const detail = groupDetailStore(g.id);
    await runMutation('leaveGroup', g.id, {}, (requestId) => communityService.groups.leave({ requestId, groupId: g.id }));
    expect(groupDetailStore(g.id)).not.toBe(detail);
  });

  it('prepends a created post without a loading flash', async () => {
    const store = useThreadPostsStore(LECTURE);
    await store.getState().fetch();
    const seen: string[] = [];
    const unsub = store.subscribe((s) => seen.push(s.status));
    const post = await runMutation('createPost', LECTURE, { body: BODY }, (requestId) =>
      communityService.threads.createPost({ requestId, lectureId: LECTURE, body: BODY, review: false }),
    );
    unsub();
    expect(store.getState().items[0].id).toBe(post.id);
    expect(seen).not.toContain('loading');
  });

  it('reuses the requestId after a retriable error and rotates it after moderation', async () => {
    const ids: string[] = [];
    const send = (requestId: string) => {
      ids.push(requestId);
      return communityService.threads.createPost({ requestId, lectureId: LECTURE, body: BODY, review: false });
    };
    mock.simulateError = true;
    await expect(runMutation('createPost', LECTURE, { body: BODY }, send)).rejects.toMatchObject({ code: 'server' });
    mock.simulateError = false;
    await runMutation('createPost', LECTURE, { body: BODY }, send);
    expect(ids[1]).toBe(ids[0]);

    const bad: string[] = [];
    const reject = (requestId: string) => {
      bad.push(requestId);
      return Promise.reject(makeApiError('moderation'));
    };
    await expect(runMutation('createPost', 'L2', { body: 'x' }, reject)).rejects.toMatchObject({ code: 'moderation' });
    await expect(runMutation('createPost', 'L2', { body: 'x' }, reject)).rejects.toMatchObject({ code: 'moderation' });
    expect(bad[1]).not.toBe(bad[0]);
  });

  it('rotates the requestId when the payload changes', async () => {
    const ids: string[] = [];
    const fail = (requestId: string) => {
      ids.push(requestId);
      return Promise.reject(makeApiError('network'));
    };
    await runMutation('report', 'p1', { reason: 'spam' }, fail).catch(() => undefined);
    await runMutation('report', 'p1', { reason: 'other' }, fail).catch(() => undefined);
    expect(ids[1]).not.toBe(ids[0]);
  });

  it('calls perform once for concurrent calls on one intent', async () => {
    let release!: () => void;
    const perform = jest.fn(() => new Promise<string>((r) => (release = () => r('ok'))));
    const a = runMutation('deleteMe', '-', {}, perform);
    const b = runMutation('deleteMe', '-', {}, perform);
    expect(b).toBe(a);
    expect(useMutationStatusStore.getState().byKey['deleteMe:-']).toMatchObject({ inFlight: true });
    release();
    await expect(Promise.all([a, b])).resolves.toEqual(['ok', 'ok']);
    expect(perform).toHaveBeenCalledTimes(1);
    expect(useMutationStatusStore.getState().byKey['deleteMe:-']).toBeUndefined();
  });

  it('records the last error code for the status hook', async () => {
    await runMutation('report', 'p9', {}, () => Promise.reject(makeApiError('conflict'))).catch(() => undefined);
    expect(useMutationStatusStore.getState().byKey['report:p9']).toMatchObject({ inFlight: false, error: 'conflict' });
  });

  it('contains a synchronous throw from perform', async () => {
    await expect(
      runMutation('report', 'p8', {}, () => {
        throw makeApiError('forbidden');
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('patchers', () => {
  const seeded = (): Post[] => [mkPost('a'), mkPost('b')];

  it('prepends, replaces in place and removes', () => {
    const store = useThreadPostsStore('L1');
    store.setState({ items: seeded(), status: 'success' });
    prependPost('L1', mkPost('c'));
    expect(store.getState().items.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    replacePost('L1', { ...mkPost('a'), body: 'edited' });
    expect(store.getState().items.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(store.getState().items[1].body).toBe('edited');
    removePost('L1', 'b');
    expect(store.getState().items.map((p) => p.id)).toEqual(['c', 'a']);
  });

  it('does not duplicate a replayed post', () => {
    const store = useThreadPostsStore('L1');
    store.setState({ items: seeded(), status: 'success' });
    prependPost('L1', mkPost('a'));
    expect(store.getState().items.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('moves an empty thread to success on prepend and back on remove', () => {
    const store = useThreadPostsStore('L3');
    store.setState({ items: [], status: 'empty' });
    prependPost('L3', mkPost('a', 'm', 'L3'));
    expect(store.getState().status).toBe('success');
    removePost('L3', 'a');
    expect(store.getState().status).toBe('empty');
  });

  it('does not create a store for a thread nobody opened', () => {
    prependPost('never-opened', mkPost('a'));
    expect(useThreadPostsStore('never-opened').getState().items).toEqual([]);
  });
});

describe('visiblePosts', () => {
  const items = [mkPost('a', 'm1'), mkPost('b', 'm2'), mkPost('c', 'm3')];

  it('drops muted authors and hidden posts', () => {
    expect(visiblePosts(items, ['m1'], ['c']).map((p) => p.id)).toEqual(['b']);
  });

  it('returns the same array while the inputs are unchanged, a new one when one changes', () => {
    const muted = ['m1'];
    const hidden: string[] = [];
    const first = visiblePosts(items, muted, hidden);
    expect(visiblePosts(items, muted, hidden)).toBe(first);
    expect(visiblePosts(items, ['m1'], hidden)).not.toBe(first);
    expect(visiblePosts([...items], muted, hidden)).not.toBe(first);
  });
});

describe('resetCommunityStores', () => {
  it('empties the keyed maps and my groups', async () => {
    const detail = groupDetailStore('g1');
    const posts = useThreadPostsStore('L1');
    const summaries = useThreadSummariesStore('s1');
    await useMyGroupsStore.getState().refresh();
    useCommunityLocalStore.setState({ profile: { memberId: 'viewer-a', displayName: 'x', serverIssued: false } });
    await runMutation('joinGroup', '-', {}, (requestId) => communityService.groups.join({ requestId, code: 'KHZ7Q2' }));
    expect(useMyGroupsStore.getState().data.length).toBeGreaterThan(0);
    resetCommunityStores();
    expect(groupDetailStore('g1')).not.toBe(detail);
    expect(useThreadPostsStore('L1')).not.toBe(posts);
    expect(useThreadSummariesStore('s1')).not.toBe(summaries);
    expect(useMyGroupsStore.getState()).toMatchObject({ data: [], status: 'idle' });
  });
});

describe('findThreadPost', () => {
  it('finds a loaded post by id across threads, and nothing for an unknown id', async () => {
    const store = useThreadPostsStore(LECTURE);
    await store.getState().fetch();
    const first = store.getState().items[0];
    expect(findThreadPost(first.id)).toBe(first);
    expect(findThreadPost('nope')).toBeUndefined();
  });

  it('forgets posts after a reset', async () => {
    const store = useThreadPostsStore(LECTURE);
    await store.getState().fetch();
    const id = store.getState().items[0].id;
    resetCommunityStores();
    expect(findThreadPost(id)).toBeUndefined();
  });
});
