/**
 * After a progress push that sent new counts, an open group detail is
 * re-fetched quietly so its totals and the member's own row catch up.
 */
import { onChallengeJoined, onGroupFocused, __resetProgressSyncForTesting } from '@/services/community/progressSync';
import { resetMutations } from '@/store/communityMutations';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import { dropGroupDetailStore, groupDetailStore, resetCommunityStores } from '@/store/communityStores';
import type { Challenge, Group } from '@/types/community';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: () => ({ remove: jest.fn() }) },
}));

const mockRepo = { distinctPagesSince: jest.fn<Promise<number[]>, [string]>(), dayCompletionsInRange: jest.fn() };
jest.mock('@/db', () => ({
  progressRepo: {
    distinctPagesSince: (d: string) => mockRepo.distinctPagesSince(d),
    dayCompletionsInRange: (a: string, b: string) => mockRepo.dayCompletionsInRange(a, b),
  },
}));

const mockSvc = { groups: { listMine: jest.fn(), get: jest.fn() }, challenges: { reportProgress: jest.fn() } };
jest.mock('@/services/community', () => ({
  communityService: {
    groups: { listMine: () => mockSvc.groups.listMine(), get: (id: string) => mockSvc.groups.get(id) },
    challenges: { reportProgress: (i: unknown) => mockSvc.challenges.reportProgress(i) },
  },
}));

const challenge: Challenge = { id: 'c1', groupId: 'g1', title: 't', startsOn: '2026-10-20', createdBy: 'm', kind: 'khatm' };
const group: Group = {
  id: 'g1', name: 'g', joinCode: 'X', ownerId: 'o', memberCount: 3, maxMembers: 50, createdAt: 0, activeChallengeId: 'c1',
};
const detail = (pages: number) => ({ group, challenge, progress: { totals: { pagesCovered: pages } } });

beforeEach(() => {
  jest.clearAllMocks();
  resetCommunityStores();
  __resetProgressSyncForTesting();
  mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3]);
  mockRepo.dayCompletionsInRange.mockResolvedValue([]);
  mockSvc.challenges.reportProgress.mockResolvedValue(undefined);
  mockSvc.groups.get.mockResolvedValue(detail(210));
  useCommunityLocalStore.setState({
    profile: { memberId: 'me', displayName: 'x', serverIssued: false },
    prefs: { optedIn: true, guidelinesVersion: 1, acceptedAt: 1, shareMyProgress: false },
    deletion: { state: 'none' },
    lastReported: {},
  });
});

const seed = (pages: number) => {
  const store = groupDetailStore('g1');
  store.setState({ data: detail(pages) as never, status: 'success', error: null });
  return store;
};

describe('progress push refreshes the open group detail', () => {
  it('replaces stale totals once new counts were sent, without leaving success', async () => {
    const store = seed(200);
    const seen: string[] = [];
    store.subscribe((s) => seen.push(s.status));
    await onGroupFocused(challenge);
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    expect((store.getState().data as any).progress.totals.pagesCovered).toBe(210);
    expect(seen.every((s) => s === 'success')).toBe(true);
  });

  it('also refreshes after a join report', async () => {
    const store = seed(200);
    await onChallengeJoined(challenge);
    expect((store.getState().data as any).progress.totals.pagesCovered).toBe(210);
  });

  it('does not refetch when the push sent nothing new', async () => {
    seed(200);
    await onChallengeJoined(challenge);
    mockSvc.groups.get.mockClear();
    await onChallengeJoined(challenge); // same counts, bypasses the throttle but nothing grew
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    expect(mockSvc.groups.get).not.toHaveBeenCalled();
  });

  it('does not create or fetch a detail store nobody opened', async () => {
    await onGroupFocused(challenge);
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    expect(mockSvc.groups.get).not.toHaveBeenCalled();
  });

  it('does not refetch into a store dropped by leaving the group', async () => {
    const store = seed(200);
    let release!: () => void;
    mockSvc.challenges.reportProgress.mockReturnValue(new Promise<void>((r) => (release = r)));
    const pending = onGroupFocused(challenge);
    await new Promise<void>((r) => setImmediate(r));
    dropGroupDetailStore('g1');
    release();
    await pending;
    expect(mockSvc.groups.get).not.toHaveBeenCalled();
    expect((store.getState().data as any).progress.totals.pagesCovered).toBe(200);
  });

  it('skips the refresh when the stores were reset during the push', async () => {
    seed(200);
    let release!: () => void;
    mockSvc.challenges.reportProgress.mockReturnValue(new Promise<void>((r) => (release = r)));
    const pending = onGroupFocused(challenge);
    await new Promise<void>((r) => setImmediate(r));
    resetCommunityStores();
    release();
    await pending;
    expect(mockSvc.groups.get).not.toHaveBeenCalled();
  });

  it('keeps the shown detail when the refetch fails', async () => {
    const store = seed(200);
    mockSvc.groups.get.mockRejectedValue(new Error('offline'));
    await onGroupFocused(challenge);
    expect((store.getState().data as any).progress.totals.pagesCovered).toBe(200);
    expect(store.getState().status).toBe('success');
  });

  it('does not refetch once the member paused while the push was in flight', async () => {
    const store = seed(200);
    let release!: () => void;
    mockSvc.challenges.reportProgress.mockReturnValue(new Promise<void>((r) => (release = r)));
    const pending = onGroupFocused(challenge);
    await new Promise<void>((r) => setImmediate(r));
    // pause(): access leaves `open` without any generation bump
    useCommunityLocalStore.setState({
      prefs: { optedIn: false, guidelinesVersion: 1, acceptedAt: 1, shareMyProgress: false },
    });
    release();
    await pending;
    expect(mockSvc.groups.get).not.toHaveBeenCalled();
    expect((store.getState().data as any).progress.totals.pagesCovered).toBe(200);
  });

  it('writes nothing when only the mutation state was reset (generation bumped, store kept)', async () => {
    const store = seed(200);
    let release!: () => void;
    mockSvc.challenges.reportProgress.mockReturnValue(new Promise<void>((r) => (release = r)));
    const pending = onGroupFocused(challenge);
    await new Promise<void>((r) => setImmediate(r));
    resetMutations();
    release();
    await pending;
    expect((store.getState().data as any).progress.totals.pagesCovered).toBe(200);
  });

  it('writes into neither the dropped nor a new store when the group is left while groups.get is pending', async () => {
    const old = seed(200);
    let resolveGet!: (v: unknown) => void;
    mockSvc.groups.get.mockReturnValue(new Promise((r) => (resolveGet = r)));
    const pending = onGroupFocused(challenge);
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    expect(mockSvc.groups.get).toHaveBeenCalledTimes(1);
    dropGroupDetailStore('g1');
    const fresh = groupDetailStore('g1'); // a rejoin opens a new store
    resolveGet(detail(210));
    await pending;
    expect((old.getState().data as any).progress.totals.pagesCovered).toBe(200);
    expect(fresh.getState().data).toBeNull();
  });
});
