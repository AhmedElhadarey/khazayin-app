/**
 * Deletion runner (design §4.3). Runs against the real mock adapter and the
 * real local store; only AsyncStorage and AppState are stubbed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeApiError } from '@/services/api/errors';
import { runDeletionIfDue, startDeletionRunner } from '@/services/community/deletionRunner';
import { mockCommunityAdapter as mock } from '@/services/community/mockAdapter';
import { resetMutations, useMutationStatusStore } from '@/store/communityMutations';
import { resetCommunityStores, groupDetailStore } from '@/store/communityStores';
import {
  defaultCommunity,
  ledgerPort,
  useCommunityLocalStore,
  type MockLedger,
} from '@/store/communityLocalStore';

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
      return { remove: () => mockHandlers.splice(mockHandlers.indexOf(h), 1) };
    },
  },
}));
// The production index never exposes the mock; the test selects it explicitly.
jest.mock('@/services/community', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  communityService: require('@/services/community/mockAdapter').mockCommunityAdapter,
}));

const MIN = 60e3;
const NOW = 1_800_000_000_000;
const emptyLedger = (): MockLedger => ({ posts: [], groups: [], memberships: [], challenges: [], responses: {} });
// The mock adapter's zero delay is still a timer, so wait on timers, not microtasks.
const flush = () => new Promise<void>((r) => setTimeout(r, 25));
const plainState = () =>
  Object.fromEntries(Object.entries(useCommunityLocalStore.getState()).filter(([, v]) => typeof v !== 'function'));

const pending = (nextAttemptAt: number, attempts = 0) =>
  useCommunityLocalStore.setState({
    deletion: { state: 'pending', attempts, nextAttemptAt, lastError: null },
  });

let deleteMe: jest.SpyInstance;
const stops: (() => void)[] = [];
const start = () => {
  const stop = startDeletionRunner();
  stops.push(stop);
  return stop;
};

beforeEach(() => {
  mock.mockDelay = 0;
  mock.simulateError = false;
  mockHandlers.length = 0;
  ledgerPort.write(emptyLedger);
  useCommunityLocalStore.setState({
    profile: { memberId: 'viewer-a', displayName: 'مستخدم', serverIssued: false },
    prefs: { optedIn: true, guidelinesVersion: 1, acceptedAt: 1, shareMyProgress: false },
    mutedMemberIds: ['x'],
    deletion: { state: 'none' },
  });
  resetCommunityStores();
  resetMutations();
  deleteMe = jest.spyOn(mock.members, 'deleteMe');
  jest.spyOn(AsyncStorage, 'removeItem');
});
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  jest.restoreAllMocks();
});

describe('runDeletionIfDue', () => {
  it('calls nothing when no deletion is pending', async () => {
    await runDeletionIfDue(NOW);
    await runDeletionIfDue(NOW, { force: true });
    expect(deleteMe).not.toHaveBeenCalled();
  });

  it('waits for nextAttemptAt, and force skips the wait', async () => {
    pending(NOW + MIN);
    await runDeletionIfDue(NOW);
    expect(deleteMe).not.toHaveBeenCalled();
    await runDeletionIfDue(NOW, { force: true });
    expect(deleteMe).toHaveBeenCalledTimes(1);
  });

  it('wipes the store and the keyed read stores on success', async () => {
    pending(NOW);
    const before = groupDetailStore('g1');
    await runDeletionIfDue(NOW);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@khazain/community');
    expect(plainState()).toEqual(defaultCommunity());
    expect(groupDetailStore('g1')).not.toBe(before);
  });

  it('keeps the state pending after a server error and reuses the requestId', async () => {
    pending(NOW);
    mock.simulateError = true;
    await runDeletionIfDue(NOW);
    expect(useCommunityLocalStore.getState().deletion).toEqual({
      state: 'pending',
      attempts: 1,
      nextAttemptAt: NOW + MIN,
      lastError: 'server',
    });
    expect(useCommunityLocalStore.getState().profile).not.toBeNull();
    await runDeletionIfDue(NOW + MIN);
    expect(deleteMe).toHaveBeenCalledTimes(2);
    expect(deleteMe.mock.calls[1][0].requestId).toBe(deleteMe.mock.calls[0][0].requestId);
    expect(useCommunityLocalStore.getState().deletion).toMatchObject({ attempts: 2 });
  });

  it('clears mutation status and keyed stores on a done outcome', async () => {
    pending(NOW);
    useMutationStatusStore.setState({ byKey: { 'createPost:L1': { inFlight: false, error: 'server' } } });
    await runDeletionIfDue(NOW);
    expect(useMutationStatusStore.getState().byKey).toEqual({});
  });

  it('still resets the read stores and mutations when removing the record rejects', async () => {
    pending(NOW);
    const before = groupDetailStore('g1');
    useMutationStatusStore.setState({ byKey: { 'createPost:L1': { inFlight: false, error: 'server' } } });
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
    await runDeletionIfDue(NOW);
    expect(useMutationStatusStore.getState().byKey).toEqual({});
    expect(groupDetailStore('g1')).not.toBe(before);
  });

  it.each(['notFound', 'auth'] as const)('treats a %s rejection as done and wipes', async (code) => {
    pending(NOW);
    const before = groupDetailStore('g1');
    deleteMe.mockRejectedValueOnce(makeApiError(code));
    await runDeletionIfDue(NOW);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@khazain/community');
    expect(plainState()).toEqual(defaultCommunity());
    expect(groupDetailStore('g1')).not.toBe(before);
  });

  it('shares one attempt between overlapping callers', async () => {
    pending(NOW);
    mock.simulateError = true;
    await Promise.all([runDeletionIfDue(NOW), runDeletionIfDue(NOW, { force: true })]);
    expect(deleteMe).toHaveBeenCalledTimes(1);
    expect(useCommunityLocalStore.getState().deletion).toMatchObject({ attempts: 1 });
  });
});

describe('startDeletionRunner', () => {
  it('runs a due deletion at launch', async () => {
    pending(0);
    start();
    await flush();
    expect(deleteMe).toHaveBeenCalledTimes(1);
  });

  it('runs exactly once per AppState change to active, and ignores other states', async () => {
    start();
    await flush();
    pending(0);
    mockHandlers.forEach((h) => h('background'));
    await flush();
    expect(deleteMe).not.toHaveBeenCalled();
    mockHandlers.forEach((h) => h('active'));
    await flush();
    expect(deleteMe).toHaveBeenCalledTimes(1);
  });

  it('registers one listener however often it is called, and unsubscribes', () => {
    const stop = start();
    const again = start();
    expect(mockHandlers).toHaveLength(1);
    stop();
    expect(mockHandlers).toHaveLength(0);
    again(); // harmless after stop
    start();
    expect(mockHandlers).toHaveLength(1);
  });
});
