import * as fs from 'fs';
import * as path from 'path';
import { makeApiError } from '@/services/api/errors';
import {
  __resetProgressSyncForTesting,
  onChallengeJoined,
  onGroupFocused,
  startCommunityProgressSync,
} from '@/services/community/progressSync';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import type { Challenge, Group } from '@/types/community';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type AppStateHandler = (s: string) => void;
const mockHandlers: AppStateHandler[] = [];
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    addEventListener: (_: string, h: AppStateHandler) => {
      mockHandlers.push(h);
      return { remove: jest.fn() };
    },
  },
}));

const mockRepo = {
  distinctPagesSince: jest.fn<Promise<number[]>, [string]>(),
  dayCompletionsInRange: jest.fn(),
};
jest.mock('@/db', () => ({
  progressRepo: {
    distinctPagesSince: (d: string) => mockRepo.distinctPagesSince(d),
    dayCompletionsInRange: (a: string, b: string) => mockRepo.dayCompletionsInRange(a, b),
  },
}));

const mockSvc = {
  groups: { listMine: jest.fn(), get: jest.fn() },
  challenges: { reportProgress: jest.fn() },
};
jest.mock('@/services/community', () => ({
  communityService: {
    groups: {
      listMine: () => mockSvc.groups.listMine(),
      get: (id: string) => mockSvc.groups.get(id),
    },
    challenges: { reportProgress: (i: unknown) => mockSvc.challenges.reportProgress(i) },
  },
}));

const MIN = 60e3;
let now = 1_800_000_000_000;
const challenge: Challenge = {
  id: 'c1',
  groupId: 'g1',
  title: 't',
  startsOn: '2026-10-20',
  createdBy: 'm',
  kind: 'khatm',
};
const group: Group = {
  id: 'g1',
  name: 'g',
  joinCode: 'X',
  ownerId: 'o',
  memberCount: 3,
  maxMembers: 50,
  createdAt: 0,
  activeChallengeId: 'c1',
};

const background = async () => {
  mockHandlers.forEach((h) => h('background'));
  await flush();
};
const flush = () => new Promise<void>((r) => setImmediate(r));

beforeEach(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  jest.clearAllMocks();
  mockHandlers.length = 0;
  __resetProgressSyncForTesting();
  mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3]);
  mockRepo.dayCompletionsInRange.mockResolvedValue([]);
  mockSvc.groups.listMine.mockResolvedValue([group]);
  mockSvc.groups.get.mockResolvedValue({ group, challenge });
  mockSvc.challenges.reportProgress.mockResolvedValue(undefined);
  useCommunityLocalStore.setState({
    profile: { memberId: 'me', displayName: 'x', serverIssued: false },
    prefs: { optedIn: true, guidelinesVersion: 1, acceptedAt: 1, shareMyProgress: false },
    deletion: { state: 'none' },
    lastReported: {},
  });
  startCommunityProgressSync();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('progressSync', () => {
  it('pushes nothing while access is intro', async () => {
    useCommunityLocalStore.setState({ prefs: { optedIn: false, guidelinesVersion: 0, acceptedAt: 0, shareMyProgress: false } });
    await background();
    await onChallengeJoined(challenge);
    expect(mockSvc.challenges.reportProgress).not.toHaveBeenCalled();
  });

  it('throttles background pushes to one per hour per challenge', async () => {
    await background();
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    now += 10 * MIN;
    mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3, 4]);
    await background();
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    now += 51 * MIN; // +61 min in total
    await background();
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(2);
  });

  it('pushes only the aggregates, with daysMet 0 for a khatm', async () => {
    await background();
    const arg = mockSvc.challenges.reportProgress.mock.calls[0][0];
    expect(arg).toEqual({
      requestId: expect.stringContaining('reportProgress:c1:'),
      challengeId: 'c1',
      memberId: 'me',
      computedAt: now,
      pagesCovered: 3,
      daysMet: 0,
    });
    expect(useCommunityLocalStore.getState().lastReported.c1).toMatchObject({ pagesCovered: 3, daysMet: 0 });
  });

  it('onChallengeJoined bypasses the throttle', async () => {
    await background();
    now += 10 * MIN;
    mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3, 4]);
    await onChallengeJoined(challenge);
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(2);
  });

  it('onChallengeJoined reports a first baseline even at zero pages', async () => {
    mockRepo.distinctPagesSince.mockResolvedValue([]);
    await onChallengeJoined(challenge);
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    expect(mockSvc.challenges.reportProgress.mock.calls[0][0]).toMatchObject({ pagesCovered: 0 });
  });

  it('onGroupFocused is throttled like a background push', async () => {
    await onGroupFocused(challenge);
    now += 5 * MIN;
    mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3, 4]);
    await onGroupFocused(challenge);
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
  });

  it('never lowers the pushed value after a local reset', async () => {
    await background();
    now += 61 * MIN;
    mockRepo.distinctPagesSince.mockResolvedValue([1]);
    await background();
    const pushed = mockSvc.challenges.reportProgress.mock.calls.map((c) => c[0].pagesCovered);
    expect(pushed).toEqual([3]);
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    expect(useCommunityLocalStore.getState().lastReported.c1.pagesCovered).toBe(3);
  });

  it('counts met days for a daily wird', async () => {
    const wird: Challenge = { ...challenge, kind: 'daily-wird', pagesPerDay: 5, days: 3 };
    mockRepo.dayCompletionsInRange.mockResolvedValue([
      { local_day: '2026-10-20', pages_read: 5, wird_target_at_day: 5, wird_completed: 1 },
      { local_day: '2026-10-21', pages_read: 2, wird_target_at_day: 5, wird_completed: 0 },
    ]);
    await onChallengeJoined(wird);
    expect(mockSvc.challenges.reportProgress.mock.calls[0][0]).toMatchObject({ pagesCovered: 3, daysMet: 1 });
    expect(mockRepo.dayCompletionsInRange).toHaveBeenCalledWith('2026-10-20', '2026-10-22');
  });

  it('reuses the requestId after a retriable failure and rotates it after success', async () => {
    mockSvc.challenges.reportProgress.mockRejectedValueOnce(makeApiError('network'));
    await onChallengeJoined(challenge);
    expect(useCommunityLocalStore.getState().lastReported.c1).toBeUndefined();
    await onChallengeJoined(challenge);
    const [a, b] = mockSvc.challenges.reportProgress.mock.calls.map((c) => c[0].requestId);
    expect(b).toBe(a);
    mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3, 4]);
    await onChallengeJoined(challenge);
    expect(mockSvc.challenges.reportProgress.mock.calls[2][0].requestId).not.toBe(a);
  });

  it('swallows errors and sends nothing for a duplicate in flight', async () => {
    let release!: () => void;
    mockSvc.challenges.reportProgress.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    const first = onChallengeJoined(challenge);
    await flush();
    const dup = onChallengeJoined(challenge);
    await flush();
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    release();
    await dup;
    await first;
    mockSvc.challenges.reportProgress.mockRejectedValue(makeApiError('server'));
    now += 61 * MIN;
    mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3, 4, 5]);
    await expect(onChallengeJoined(challenge)).resolves.toBeUndefined();
  });

  it('does not write lastReported back after a wipe during a pending push', async () => {
    let release!: () => void;
    mockSvc.challenges.reportProgress.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    const p = onChallengeJoined(challenge);
    await flush();
    await useCommunityLocalStore.getState().wipe();
    release();
    await p;
    expect(useCommunityLocalStore.getState().lastReported).toEqual({});
  });

  it('sends nothing when the member pauses while counts are being read', async () => {
    let release!: (pages: number[]) => void;
    mockRepo.distinctPagesSince.mockImplementationOnce(() => new Promise<number[]>((r) => (release = r)));
    const p = onChallengeJoined(challenge);
    await flush();
    useCommunityLocalStore.getState().pause();
    release([1, 2]);
    await p;
    expect(mockSvc.challenges.reportProgress).not.toHaveBeenCalled();
    expect(useCommunityLocalStore.getState().lastReported).toEqual({});
  });

  it('records only what was sent when a join shares an in-flight send', async () => {
    let release!: () => void;
    mockSvc.challenges.reportProgress.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    const first = onGroupFocused(challenge); // sends 3
    await flush();
    mockRepo.distinctPagesSince.mockResolvedValue([1, 2, 3, 4, 5]);
    const join = onChallengeJoined(challenge); // computes 5, shares the send of 3
    await flush();
    release();
    await Promise.all([first, join]);
    expect(mockSvc.challenges.reportProgress.mock.calls.map((c) => c[0].pagesCovered)).toEqual([3]);
    expect(useCommunityLocalStore.getState().lastReported.c1.pagesCovered).toBe(3);
    now += 61 * MIN;
    await background();
    expect(mockSvc.challenges.reportProgress.mock.calls.map((c) => c[0].pagesCovered)).toEqual([3, 5]);
  });

  it('keeps syncing the other groups when one groups.get fails', async () => {
    const g2: Group = { ...group, id: 'g2', activeChallengeId: 'c2' };
    const c2: Challenge = { ...challenge, id: 'c2', groupId: 'g2' };
    mockSvc.groups.listMine.mockResolvedValue([group, g2]);
    mockSvc.groups.get.mockImplementation(async (id: string) => {
      if (id === 'g1') throw makeApiError('network');
      return { group: g2, challenge: c2 };
    });
    await background();
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
    expect(mockSvc.challenges.reportProgress.mock.calls[0][0].challengeId).toBe('c2');
  });

  it('coalesces overlapping background passes', async () => {
    let release!: (g: Group[]) => void;
    mockSvc.groups.listMine.mockImplementationOnce(() => new Promise<Group[]>((r) => (release = r)));
    mockHandlers.forEach((h) => h('background'));
    mockHandlers.forEach((h) => h('background'));
    await flush();
    release([group]);
    await flush();
    expect(mockSvc.groups.listMine).toHaveBeenCalledTimes(1);
    expect(mockSvc.challenges.reportProgress).toHaveBeenCalledTimes(1);
  });

  it('leaves progressStore untouched', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'store/progressStore.ts'), 'utf8');
    expect(src).not.toMatch(/community/i);
  });
});
