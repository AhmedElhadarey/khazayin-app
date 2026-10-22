import fs from 'fs';
import path from 'path';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  coerceCommunity,
  defaultCommunity,
  ledgerPort,
  useCommunityLocalStore,
} from '@/store/communityLocalStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = '@khazain/community';
const HOUR = 3600e3;

async function flushPersist(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

async function rehydrate(): Promise<void> {
  await useCommunityLocalStore.persist.rehydrate();
  await flushPersist();
}

async function seed(state: unknown): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ state, version: 0 }));
  await rehydrate();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await useCommunityLocalStore.getState().wipe();
  await rehydrate();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('coerceCommunity', () => {
  it('T-CL-1 undefined gives the defaults', () => {
    expect(coerceCommunity(undefined)).toEqual(defaultCommunity());
  });

  it('T-CL-2 drops malformed mutedMemberIds one by one', () => {
    const out = coerceCommunity({ mutedMemberIds: ['a', 3, '', null, 'b'] });
    expect(out.mutedMemberIds).toEqual(['a', 'b']);
  });

  it('T-CL-3 an unknown top-level key survives', () => {
    const out = coerceCommunity({ futureKey: { x: 1 } }) as unknown as Record<string, unknown>;
    expect(out.futureKey).toEqual({ x: 1 });
    expect(coerceCommunity(out)).toEqual(out);
  });

  it('T-CL-4 a malformed deletion state falls back to none', () => {
    expect(coerceCommunity({ deletion: { state: 'pending', attempts: 'x' } }).deletion).toEqual({
      state: 'none',
    });
  });
});

describe('mode change', () => {
  it('T-CL-5 a foreign-mode record loses identity and ledger but keeps mutes', async () => {
    await seed({
      mode: 'http',
      profile: { memberId: 'm1', displayName: 'x', serverIssued: true },
      prefs: { optedIn: true, guidelinesVersion: 1, acceptedAt: 5, shareMyProgress: true },
      mutedMemberIds: ['u1'],
      lastReported: { c1: { pagesCovered: 1, daysMet: 1, at: 1 } },
      mockLedger: { posts: [{ id: 'p' }] },
    });
    const s = useCommunityLocalStore.getState();
    expect(s.profile).toBeNull();
    expect(s.mockLedger.posts.length).toBe(0);
    expect(s.prefs.optedIn).toBe(false);
    expect(s.lastReported).toEqual({});
    expect(s.mutedMemberIds).toEqual(['u1']);
  });

  it('T-CL-6 a same-mode record is kept', async () => {
    await seed({
      mode: useCommunityLocalStore.getState().mode,
      profile: { memberId: 'm1', displayName: 'x', serverIssued: false },
    });
    expect(useCommunityLocalStore.getState().profile?.memberId).toBe('m1');
  });
});

describe('persistence', () => {
  it('T-CL-7 the persisted JSON has no version key', async () => {
    useCommunityLocalStore.getState().optIn('أحمد');
    await flushPersist();
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    // zustand's envelope always carries `version: 0`; the state itself must not.
    const parsed = JSON.parse(raw as string);
    expect('version' in parsed.state).toBe(false);
    expect(parsed.version).toBe(0);
    expect(parsed.state.profile.displayName).toBe('أحمد');
    const src = fs.readFileSync(path.join(__dirname, '..', 'store', 'communityLocalStore.ts'), 'utf8');
    expect(src).not.toMatch(/^\s*version:/m);
    expect(src).not.toMatch(/^\s*migrate:/m);
  });

  it('T-CL-8 pruning drops stale postTimes and ledger responses on recordPost', () => {
    const now = 100 * HOUR;
    useCommunityLocalStore.setState({
      postTimes: [now - 25 * HOUR, now - HOUR],
      mockLedger: {
        ...defaultCommunity().mockLedger,
        responses: {
          old: { at: now - 25 * HOUR, value: 1 },
          fresh: { at: now - HOUR, value: 2 },
        },
      },
    });
    useCommunityLocalStore.getState().recordPost(now);
    const s = useCommunityLocalStore.getState();
    expect(s.postTimes).toEqual([now - HOUR, now]);
    expect(Object.keys(s.mockLedger.responses)).toEqual(['fresh']);
  });

  it('T-CL-9 ledgerPort writes through and prunes', () => {
    const now = Date.now();
    ledgerPort.write((l) => ({
      ...l,
      responses: { old: { at: now - 25 * HOUR, value: 1 }, fresh: { at: now, value: 2 } },
    }));
    expect(Object.keys(ledgerPort.read().responses)).toEqual(['fresh']);
  });

  it('T-CL-10 wipe removes the key and resets to defaults', async () => {
    const spy = jest.spyOn(AsyncStorage, 'removeItem');
    useCommunityLocalStore.getState().optIn('أحمد');
    await flushPersist();
    await useCommunityLocalStore.getState().wipe();
    await flushPersist();
    expect(spy).toHaveBeenCalledWith(KEY);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    const { profile, prefs, deletion, mutedMemberIds } = useCommunityLocalStore.getState();
    const d = defaultCommunity();
    expect({ profile, prefs, deletion, mutedMemberIds }).toEqual({
      profile: d.profile,
      prefs: d.prefs,
      deletion: d.deletion,
      mutedMemberIds: d.mutedMemberIds,
    });
  });
});

describe('wipe and coercion edge cases', () => {
  const dataOnly = (s: object) =>
    Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function'));

  it('T-CL-14 wipe replaces the state, dropping unknown keys', async () => {
    await seed({ futureKey: { x: 1 }, mutedMemberIds: ['u1'] });
    expect((useCommunityLocalStore.getState() as unknown as Record<string, unknown>).futureKey).toEqual({
      x: 1,
    });
    await useCommunityLocalStore.getState().wipe();
    expect(dataOnly(useCommunityLocalStore.getState())).toEqual(defaultCommunity());
    expect(typeof useCommunityLocalStore.getState().optIn).toBe('function');
  });

  it('T-CL-15 wipe twice in a row is safe', async () => {
    useCommunityLocalStore.getState().optIn('أحمد');
    await useCommunityLocalStore.getState().wipe();
    await useCommunityLocalStore.getState().wipe();
    await flushPersist();
    expect(dataOnly(useCommunityLocalStore.getState())).toEqual(defaultCommunity());
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('T-CL-17 wipe makes no setItem call for the key', async () => {
    useCommunityLocalStore.getState().optIn('أحمد');
    await flushPersist();
    const spy = jest.spyOn(AsyncStorage, 'setItem');
    spy.mockClear(); // the AsyncStorage mock is a shared jest.fn with history
    await useCommunityLocalStore.getState().wipe();
    await flushPersist();
    expect(spy.mock.calls.filter((c) => c[0] === KEY)).toHaveLength(0);
  });

  it('T-CL-18 a mute issued while removeItem is pending still persists', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    jest.spyOn(AsyncStorage, 'removeItem').mockImplementation(() => gate);
    const pendingWipe = useCommunityLocalStore.getState().wipe();
    useCommunityLocalStore.getState().mute('u1');
    await flushPersist();
    expect(await AsyncStorage.getItem(KEY)).toContain('u1');
    release();
    await pendingWipe;
  });

  it('T-CL-19 pruning keeps references when nothing is stale', () => {
    const now = Date.now();
    useCommunityLocalStore.getState().recordPost(now);
    const before = useCommunityLocalStore.getState();
    useCommunityLocalStore.getState().mute('u1');
    const after = useCommunityLocalStore.getState();
    expect(after.postTimes).toBe(before.postTimes);
    expect(after.mockLedger).toBe(before.mockLedger);
  });

  it('T-CL-20 an unknown mode falls back to the current one', () => {
    expect(coerceCommunity({ mode: 'bogus' }).mode).toBe(defaultCommunity().mode);
    expect(coerceCommunity({ mode: 'off' }).mode).toBe('off');
  });

  it('T-CL-16 an unknown deletion lastError falls back to null', () => {
    const base = { state: 'pending', attempts: 1, nextAttemptAt: 5 };
    expect(coerceCommunity({ deletion: { ...base, lastError: 'bogus' } }).deletion).toMatchObject({
      lastError: null,
    });
    expect(coerceCommunity({ deletion: { ...base, lastError: 'server' } }).deletion).toMatchObject({
      lastError: 'server',
    });
  });
});

describe('actions', () => {
  it('T-CL-11 optIn, pause, accept, mute, hide, report', () => {
    const st = () => useCommunityLocalStore.getState();
    st().optIn('أحمد');
    expect(st().prefs.optedIn).toBe(true);
    expect(st().profile?.displayName).toBe('أحمد');
    const id = st().profile?.memberId;
    st().optIn('أحمد');
    expect(st().profile?.memberId).toBe(id);
    st().acceptGuidelines(1, 77);
    expect(st().prefs.guidelinesVersion).toBe(1);
    expect(st().prefs.acceptedAt).toBe(77);
    st().mute('u1');
    st().mute('u1');
    expect(st().mutedMemberIds).toEqual(['u1']);
    st().unmute('u1');
    expect(st().mutedMemberIds).toEqual([]);
    st().hidePost('p1');
    st().hidePost('p1');
    expect(st().locallyHiddenPostIds).toEqual(['p1']);
    st().setLastReported('c1', { pagesCovered: 4, daysMet: 2, at: 9 });
    expect(st().lastReported.c1.pagesCovered).toBe(4);
    st().pause();
    expect(st().prefs.optedIn).toBe(false);
    expect(st().profile).not.toBeNull();
  });

  it('T-CL-12 beginDeletion and applyDeletionOutcome', async () => {
    const st = () => useCommunityLocalStore.getState();
    st().optIn('أحمد');
    st().beginDeletion(500);
    expect(st().deletion).toEqual({ state: 'pending', attempts: 0, nextAttemptAt: 500, lastError: null });
    await st().applyDeletionOutcome({ ok: false, code: 'network' }, 1000);
    expect(st().deletion).toMatchObject({ attempts: 1, nextAttemptAt: 1000 + 60e3 });
    await st().applyDeletionOutcome({ ok: false, code: 'notFound' }, 2000);
    expect(st().deletion).toEqual({ state: 'none' });
    expect(st().profile).toBeNull();
  });
});

describe('off mode', () => {
  it('T-CL-13 optIn writes nothing to storage', async () => {
    jest.resetModules();
    jest.doMock('@/services/community/config', () => ({ COMMUNITY_MODE: 'off' }));
    let writes = 0;
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AS = require('@react-native-async-storage/async-storage');
      const storage = AS.default ?? AS;
      const spy = jest.spyOn(storage, 'setItem');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/store/communityLocalStore');
      await mod.useCommunityLocalStore.persist.rehydrate();
      mod.useCommunityLocalStore.getState().optIn('أحمد');
      await flushPersist();
      writes = spy.mock.calls.filter((c: unknown[]) => c[0] === KEY).length;
    });
    jest.dontMock('@/services/community/config');
    expect(writes).toBe(0);
  });
});
