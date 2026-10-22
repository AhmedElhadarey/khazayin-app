import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { ApiErrorCode } from '@/services/api/types';
import { COMMUNITY_MODE } from '@/services/community/config';
import { nextDeletionState, type DeletionOutcome } from '@/services/community/deletion';
import type { CommunityMode, DeletionState } from '@/services/community/gate';
import type { Challenge, Group, Membership, Post } from '@/types/community';

/** The mock adapter's own writes (design §5.4). Dev only; reset on a mode change. */
export type MockLedger = {
  posts: Post[];
  groups: Group[];
  memberships: Membership[];
  challenges: Challenge[];
  /** 2xx results by requestId (§5.3), pruned at 24 h. */
  responses: Record<string, { at: number; value: unknown }>;
};

export type CommunityProfile = { memberId: string; displayName: string; serverIssued: boolean };
export type CommunityPrefs = {
  optedIn: boolean;
  guidelinesVersion: number;
  acceptedAt: number;
  shareMyProgress: boolean;
};
export type LastReported = { pagesCovered: number; daysMet: number; at: number };

type CommunityData = {
  mode: CommunityMode;
  profile: CommunityProfile | null;
  prefs: CommunityPrefs;
  deletion: DeletionState;
  postTimes: number[];
  locallyHiddenPostIds: string[];
  mutedMemberIds: string[];
  lastReported: Record<string, LastReported>;
  mockLedger: MockLedger;
};

type CommunityActions = {
  optIn: (displayName: string) => void;
  pause: () => void;
  acceptGuidelines: (version: number, now: number) => void;
  mute: (id: string) => void;
  unmute: (id: string) => void;
  hidePost: (id: string) => void;
  recordPost: (now: number) => void;
  setLastReported: (challengeId: string, value: LastReported) => void;
  beginDeletion: (now: number) => void;
  applyDeletionOutcome: (outcome: DeletionOutcome, now: number) => Promise<void>;
  wipe: () => Promise<void>;
};
type CommunityState = CommunityData & CommunityActions;

const KEY = '@khazain/community';

// Exhaustive over ApiErrorCode, so a new code is a compile error here.
const API_ERROR_CODES: Record<ApiErrorCode, true> = {
  network: true,
  timeout: true,
  auth: true,
  forbidden: true,
  notFound: true,
  validation: true,
  server: true,
  rateLimit: true,
  moderation: true,
  conflict: true,
  unknown: true,
};
const isApiErrorCode = (v: unknown): v is ApiErrorCode =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(API_ERROR_CODES, v);
const DAY_MS = 24 * 3600e3;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const emptyLedger = (): MockLedger => ({
  posts: [],
  groups: [],
  memberships: [],
  challenges: [],
  responses: {},
});

export function defaultCommunity(): CommunityData {
  return {
    mode: COMMUNITY_MODE,
    profile: null,
    prefs: { optedIn: false, guidelinesVersion: 0, acceptedAt: 0, shareMyProgress: false },
    deletion: { state: 'none' },
    postTimes: [],
    locallyHiddenPostIds: [],
    mutedMemberIds: [],
    lastReported: {},
    mockLedger: emptyLedger(),
  };
}

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];

function coerceLedger(v: unknown): MockLedger {
  const out = emptyLedger();
  if (!isRecord(v)) return out;
  const list = <T>(x: unknown): T[] => (Array.isArray(x) ? (x.filter(isRecord) as T[]) : []);
  const responses: MockLedger['responses'] = {};
  if (isRecord(v.responses)) {
    for (const [k, r] of Object.entries(v.responses)) {
      if (isRecord(r) && isNum(r.at)) responses[k] = { at: r.at, value: r.value };
    }
  }
  return {
    ...v,
    posts: list<Post>(v.posts),
    groups: list<Group>(v.groups),
    memberships: list<Membership>(v.memberships),
    challenges: list<Challenge>(v.challenges),
    responses,
  };
}

/**
 * Lenient coercion of the persisted record. Defaults what is missing, drops
 * malformed entries one by one, keeps unknown top-level keys so a newer build's
 * fields survive. Never throws. Idempotent.
 */
export function coerceCommunity(persisted: unknown): CommunityData {
  const d = defaultCommunity();
  if (!isRecord(persisted)) return d;
  const p = isRecord(persisted.prefs) ? persisted.prefs : {};
  const prof = persisted.profile;
  const del = persisted.deletion;
  const lastReported: Record<string, LastReported> = {};
  if (isRecord(persisted.lastReported)) {
    for (const [k, r] of Object.entries(persisted.lastReported)) {
      if (isRecord(r) && isNum(r.pagesCovered) && isNum(r.daysMet) && isNum(r.at)) {
        lastReported[k] = { pagesCovered: r.pagesCovered, daysMet: r.daysMet, at: r.at };
      }
    }
  }
  return {
    ...persisted,
    mode: persisted.mode === 'mock' || persisted.mode === 'off' ? persisted.mode : d.mode,
    profile:
      isRecord(prof) && typeof prof.memberId === 'string' && prof.memberId.length > 0
        ? {
            memberId: prof.memberId,
            displayName: typeof prof.displayName === 'string' ? prof.displayName : '',
            serverIssued: prof.serverIssued === true,
          }
        : null,
    prefs: {
      optedIn: p.optedIn === true,
      guidelinesVersion: isNum(p.guidelinesVersion) ? p.guidelinesVersion : 0,
      acceptedAt: isNum(p.acceptedAt) ? p.acceptedAt : 0,
      shareMyProgress: p.shareMyProgress === true,
    },
    deletion:
      isRecord(del) && del.state === 'pending' && isNum(del.attempts) && isNum(del.nextAttemptAt)
        ? {
            state: 'pending',
            attempts: del.attempts,
            nextAttemptAt: del.nextAttemptAt,
            lastError: isApiErrorCode(del.lastError) ? del.lastError : null,
          }
        : d.deletion,
    postTimes: Array.isArray(persisted.postTimes) ? persisted.postTimes.filter(isNum) : [],
    locallyHiddenPostIds: strings(persisted.locallyHiddenPostIds),
    mutedMemberIds: strings(persisted.mutedMemberIds),
    lastReported,
    mockLedger: coerceLedger(persisted.mockLedger),
  };
}

/**
 * Drops postTimes and ledger responses older than 24 h (S8). Returns the same
 * references when nothing is stale, so subscribers don't re-render.
 */
function prune<T extends CommunityData>(s: T, now: number): T {
  const cutoff = now - DAY_MS;
  const postTimes = s.postTimes.every((t) => t >= cutoff)
    ? s.postTimes
    : s.postTimes.filter((t) => t >= cutoff);
  const entries = Object.entries(s.mockLedger.responses);
  const mockLedger = entries.every(([, r]) => r.at >= cutoff)
    ? s.mockLedger
    : { ...s.mockLedger, responses: Object.fromEntries(entries.filter(([, r]) => r.at >= cutoff)) };
  return postTimes === s.postTimes && mockLedger === s.mockLedger ? s : { ...s, postTimes, mockLedger };
}

// Same id scheme as notesStore: a local handle, not a security token (§4.1).
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// In `off` mode the store neither reads nor writes: a production build must not
// alter what a dev build left behind, nor surface it (§4.2). `suppressWrites`
// is raised only around the synchronous `set` in `wipe`, so the reset isn't
// re-persisted; a write issued while `removeItem` is pending still goes through.
let suppressWrites = false;
const guardedStorage: StateStorage = {
  getItem: (name) => (COMMUNITY_MODE === 'off' ? null : AsyncStorage.getItem(name)),
  setItem: (name, value) =>
    COMMUNITY_MODE === 'off' || suppressWrites ? undefined : AsyncStorage.setItem(name, value),
  removeItem: (name) => (COMMUNITY_MODE === 'off' ? undefined : AsyncStorage.removeItem(name)),
};

export const useCommunityLocalStore = create<CommunityState>()(
  persist(
    (set, get) => {
      const commit = (fn: (s: CommunityState) => Partial<CommunityData>, now = Date.now()) =>
        set((s) => prune({ ...s, ...fn(s) }, now));
      const actions: CommunityActions = {
        optIn: (displayName) =>
          commit((s) => ({
            profile: s.profile
              ? { ...s.profile, displayName }
              : { memberId: makeId(), displayName, serverIssued: false },
            prefs: { ...s.prefs, optedIn: true },
          })),
        pause: () => commit((s) => ({ prefs: { ...s.prefs, optedIn: false } })),
        acceptGuidelines: (version, now) =>
          commit((s) => ({ prefs: { ...s.prefs, guidelinesVersion: version, acceptedAt: now } }), now),
        mute: (id) =>
          commit((s) => ({
            mutedMemberIds: s.mutedMemberIds.includes(id) ? s.mutedMemberIds : [...s.mutedMemberIds, id],
          })),
        unmute: (id) => commit((s) => ({ mutedMemberIds: s.mutedMemberIds.filter((m) => m !== id) })),
        hidePost: (id) =>
          commit((s) => ({
            locallyHiddenPostIds: s.locallyHiddenPostIds.includes(id)
              ? s.locallyHiddenPostIds
              : [...s.locallyHiddenPostIds, id],
          })),
        recordPost: (now) => commit((s) => ({ postTimes: [...s.postTimes, now] }), now),
        setLastReported: (challengeId, value) =>
          commit((s) => ({ lastReported: { ...s.lastReported, [challengeId]: value } })),
        beginDeletion: (now) =>
          commit(() => ({
            deletion: { state: 'pending', attempts: 0, nextAttemptAt: now, lastError: null },
          })),
        applyDeletionOutcome: async (outcome, now) => {
          const next = nextDeletionState(get().deletion, outcome, now);
          if (next.state === 'none') await get().wipe();
          else commit(() => ({ deletion: next }), now);
        },
        wipe: async () => {
          // Replace, don't merge: unknown keys carried by coerceCommunity must go.
          suppressWrites = true;
          try {
            set({ ...defaultCommunity(), ...actions }, true);
          } finally {
            suppressWrites = false;
          }
          await guardedStorage.removeItem(KEY);
        },
      };
      return { ...defaultCommunity(), ...actions };
    },
    {
      name: KEY,
      storage: createJSONStorage(() => guardedStorage),
      // No `version`/`migrate` on purpose, same reason as notesStore.ts: raising
      // the persist version makes an older build discard the record on
      // downgrade. `merge` + lenient coercion instead. Design §4.2.
      // Mode change (S1/C6): a record written under another mode loses its
      // identity and ledger (mutes and hidden posts are the user's own and stay).
      // `deletion` and `postTimes` are kept on purpose: a pending deletion must
      // still run, and the post cooldown protects the user.
      // With nothing persisted, keep whatever is already in memory.
      merge: (persisted, current) => {
        if (COMMUNITY_MODE === 'off' || !isRecord(persisted)) return current;
        const c = coerceCommunity(persisted);
        const actions = Object.fromEntries(
          Object.entries(current).filter(([, v]) => typeof v === 'function'),
        ) as unknown as CommunityActions;
        const foreign = typeof persisted.mode === 'string' && persisted.mode !== COMMUNITY_MODE;
        return {
          ...current,
          ...c,
          mode: COMMUNITY_MODE,
          ...(foreign
            ? {
                profile: null,
                prefs: { ...c.prefs, optedIn: false },
                lastReported: {},
                mockLedger: emptyLedger(),
              }
            : {}),
          ...actions,
        };
      },
    },
  ),
);

/** The mock adapter's injected port (design §5.4). Writes are pruned like any other. */
export const ledgerPort = {
  read: (): MockLedger => useCommunityLocalStore.getState().mockLedger,
  write: (fn: (l: MockLedger) => MockLedger): void => {
    useCommunityLocalStore.setState((s) => prune({ ...s, mockLedger: fn(s.mockLedger) }, Date.now()));
  },
};
