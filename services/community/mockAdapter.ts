/**
 * services/community/mockAdapter.ts
 * ---------------------------------
 * DEV-ONLY in-memory community backend (design §5.4). Reached solely through
 * the `if (__DEV__)` require in `index.ts`, so production bundles never carry
 * it or its seed.
 *
 * The viewer is the local profile's memberId. The adapter's own writes live in
 * the persisted `mockLedger`, reached through `ledgerPort`; seeded content is
 * read-only. Only 2xx results are stored per requestId (§5.3), so an error is
 * recomputed on retry, and a duplicate that arrives while the original is
 * still running gets the original's promise.
 *
 * Dev knobs, set on the concrete object (as with contentService's mockAdapter):
 *   mockCommunityAdapter.mockDelay = 0;  mockCommunityAdapter.simulateError = true;
 */
import { COMMUNITY_LIMITS, COMMUNITY_RATES } from '@/constants/communityLimits';
import { PAGES_PER_QURAN } from '@/constants/progress';
import {
  SEED_GROUPS,
  SEED_MEMBERS,
  SEED_POSTS,
  SEED_SENTINEL,
  type SeedGroup,
} from '@/data/community/seed';
import { makeApiError } from '@/services/api/errors';
import type { Paged } from '@/services/api/types';
import { ledgerPort, useCommunityLocalStore, type MockLedger } from '@/store/communityLocalStore';
import type {
  Challenge,
  Group,
  MemberSummary,
  Membership,
  Post,
  ProgressReport,
  ReportReason,
  ThreadSummary,
} from '@/types/community';
import { checkText } from './adabFilter';
import type { CommunityService } from './communityService';
import { visibleTotals, type ReporterEntry } from './progressMath';

const DAY_MS = 24 * 3600e3;
const HOUR_MS = 3600e3;
const PAGE_SIZE = 20;
const MAX_SUMMARY_IDS = 100;
const REASONS: readonly ReportReason[] = ['offensive', 'sectarian', 'misinformation', 'spam', 'privacy', 'other'];

/** Arabic copy for the dev-only simulated failure, same idea as contentService. */
export const SIMULATED_ERROR_MESSAGE = 'تعذّر إتمام الطلب (خطأ تجريبي). حاول مجددًا.';
const PICK_ANOTHER_NAME = 'يُرجى اختيار اسم آخر';

type LogOp = 'post' | 'group' | 'join' | 'report';
type Viewer = { memberId: string; displayName: string };

// ---------------------------------------------------------------------------
// Plumbing: viewer, knobs, errors, idempotent execution
// ---------------------------------------------------------------------------

const knobs = (): CommunityService => mockCommunityAdapter;

function viewer(): Viewer {
  const p = useCommunityLocalStore.getState().profile;
  if (!p) throw makeApiError('auth');
  return { memberId: p.memberId, displayName: p.displayName };
}

const invalid = (message?: string) => makeApiError('validation', { message });
const rateLimited = () => makeApiError('rateLimit', { retriable: true });

async function delay(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, knobs().mockDelay ?? 300));
}

function maybeError(): void {
  if (knobs().simulateError) {
    throw makeApiError('server', { message: SIMULATED_ERROR_MESSAGE, retriable: true });
  }
}

/** A read: latency and the error knob, nothing stored. */
async function query<T>(fn: () => T): Promise<T> {
  await delay();
  maybeError();
  return fn();
}

const inFlight = new Map<string, Promise<unknown>>();

/**
 * A mutation. A duplicate requestId in flight shares the original promise;
 * a stored 2xx is replayed; otherwise `fn` runs and only its success is stored.
 * Deliberately not `async`, so concurrent callers receive the very same promise.
 */
function mutate<T>(requestId: string, fn: () => T): Promise<T> {
  const running = inFlight.get(requestId);
  if (running) return running as Promise<T>;
  const p = (async (): Promise<T> => {
    await delay();
    const stored = ledgerPort.read().responses[requestId];
    if (stored) return stored.value as T;
    maybeError();
    const value = fn();
    ledgerPort.write((l) => ({
      ...l,
      responses: { ...l.responses, [requestId]: { at: Date.now(), value } },
    }));
    return value;
  })();
  inFlight.set(requestId, p);
  const done = () => void inFlight.delete(requestId);
  p.then(done, done);
  return p;
}

const commit = (fn: (l: MockLedger) => Partial<MockLedger>) =>
  ledgerPort.write((l) => ({ ...l, ...fn(l) }));

/** register and rename share one body: the profile itself lives in the local store. */
function nameMember(displayName: string): MemberSummary {
  const v = viewer();
  checkName(displayName, 'name');
  return { memberId: v.memberId, displayName, isOwner: false };
}

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeJoinCode(taken: (c: string) => boolean): string {
  for (;;) {
    let c = '';
    for (let i = 0; i < COMMUNITY_LIMITS.joinCodeLength; i += 1) {
      c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!taken(c)) return c;
  }
}

// ---------------------------------------------------------------------------
// Text checks
// ---------------------------------------------------------------------------

const isLengthReason = (r: string) => r === 'empty' || r === 'tooShort' || r === 'tooLong';

/** Posts: length problems are `validation`; a filter hit is `moderation` (defence in depth). */
function checkPost(text: string): void {
  const r = checkText(text, 'post');
  if (r.ok) return;
  throw isLengthReason(r.reason) ? invalid() : makeApiError('moderation');
}

/** Names accept neither tier: any filter hit asks for another name (§4.1). */
function checkName(text: string, field: 'name' | 'groupName'): void {
  const r = checkText(text, field);
  if (r.ok && !r.review) return;
  throw invalid(r.ok || !isLengthReason(r.reason) ? PICK_ANOTHER_NAME : undefined);
}

/** A report note is optional free text; any refusal is plain `validation`. */
function checkNote(text: string): void {
  if (!checkText(text, 'reportNote').ok) throw invalid();
}

function checkTitle(title: string): void {
  const n = [...title.trim()].length;
  if (n < COMMUNITY_LIMITS.challengeTitle.min || n > COMMUNITY_LIMITS.challengeTitle.max) throw invalid();
}

function checkDay(day: string): void {
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(day) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
  if (!ok) throw invalid();
}

const inRange = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;

// ---------------------------------------------------------------------------
// Rates (§7.5), kept in the ledger so they survive a restart like the rest
// ---------------------------------------------------------------------------

const logOf = (l: MockLedger) => (Array.isArray(l.log) ? l.log : []);
const progressOf = (l: MockLedger) => (Array.isArray(l.progress) ? l.progress : []);

function recent(l: MockLedger, op: LogOp, memberId: string, since: number) {
  return logOf(l).filter((e) => e.op === op && e.memberId === memberId && e.at > since);
}

/** Throws `rateLimit` once `limit` actions of `op` fall inside the window ending now. */
function assertUnderRate(l: MockLedger, op: LogOp, memberId: string, windowMs: number, limit: number): void {
  if (recent(l, op, memberId, Date.now() - windowMs).length >= limit) throw rateLimited();
}

/** Throws `conflict` when the member is already in the maximum number of groups. */
function assertRoomForAnotherGroup(l: MockLedger, memberId: string): void {
  if (l.memberships.filter((m) => m.memberId === memberId).length >= COMMUNITY_LIMITS.groupsPerMember.max) {
    throw makeApiError('conflict');
  }
}

function logAction(op: LogOp, memberId: string): void {
  const now = Date.now();
  commit((l) => ({
    log: [...logOf(l).filter((e) => e.at > now - DAY_MS), { op, memberId, at: now }],
  }));
}

// ---------------------------------------------------------------------------
// Derived views over seed + ledger
// ---------------------------------------------------------------------------

const seedId = (g: SeedGroup) => `${SEED_SENTINEL}:${g.id}`;
const SEED_NAMES = new Map(SEED_MEMBERS.map((m) => [m.memberId, m.displayName]));

type GroupRow = {
  id: string;
  name: string;
  joinCode: string;
  ownerId: string;
  createdAt: number;
  seed: SeedGroup | null;
};

function groupRows(l: MockLedger): GroupRow[] {
  return [
    ...SEED_GROUPS.map((g) => ({ id: seedId(g), name: g.name, joinCode: g.joinCode, ownerId: g.ownerId, createdAt: g.createdAt, seed: g })),
    ...l.groups.map((g) => ({ id: g.id, name: g.name, joinCode: g.joinCode, ownerId: g.ownerId, createdAt: g.createdAt, seed: null })),
  ];
}

function findGroup(l: MockLedger, id: string): GroupRow {
  const g = groupRows(l).find((x) => x.id === id);
  if (!g) throw makeApiError('notFound');
  return g;
}

function memberIdsOf(l: MockLedger, row: GroupRow): string[] {
  const ids = new Set(row.seed?.memberIds ?? []);
  for (const m of l.memberships) if (m.groupId === row.id) ids.add(m.memberId);
  return [...ids];
}

function challengeOf(l: MockLedger, row: GroupRow): Challenge | null {
  if (row.seed) {
    const c = row.seed.challenge;
    return { ...c.spec, id: c.id, groupId: row.id, title: c.title, startsOn: c.startsOn, createdBy: c.createdBy };
  }
  return l.challenges.find((c) => c.groupId === row.id) ?? null;
}

function toGroup(l: MockLedger, row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    joinCode: row.joinCode,
    ownerId: row.ownerId,
    memberCount: memberIdsOf(l, row).length,
    maxMembers: COMMUNITY_LIMITS.members.max,
    createdAt: row.createdAt,
    activeChallengeId: challengeOf(l, row)?.id ?? null,
  };
}

function summaryOf(memberId: string, ownerId: string | null, v: Viewer): MemberSummary {
  const displayName = memberId === v.memberId ? v.displayName : (SEED_NAMES.get(memberId) ?? 'عضو (تجريبي)');
  return { memberId, displayName, isOwner: memberId === ownerId };
}

/**
 * Ownership hand-off (§8.4, A.1): for each group in `groupIds` owned by `leaverId`,
 * the earliest remaining joiner inherits it; a group nobody remains in is closed.
 */
function planHandOff(l: MockLedger, leaverId: string, groupIds: ReadonlySet<string>) {
  const heirs = new Map<string, string>();
  const closed = new Set<string>();
  for (const g of l.groups) {
    if (!groupIds.has(g.id) || g.ownerId !== leaverId) continue;
    let heir: Membership | undefined;
    for (const m of l.memberships) {
      if (m.groupId === g.id && m.memberId !== leaverId && (!heir || m.joinedAt < heir.joinedAt)) heir = m;
    }
    if (heir) heirs.set(g.id, heir.memberId);
    else closed.add(g.id);
  }
  return { heirs, closed };
}

/** Applies a hand-off plan to the group and membership lists. */
function applyHandOff(
  l: MockLedger,
  plan: ReturnType<typeof planHandOff>,
  dropMembership: (m: Membership) => boolean,
) {
  return {
    groups: l.groups
      .filter((g) => !plan.closed.has(g.id))
      .map((g) => (plan.heirs.has(g.id) ? { ...g, ownerId: plan.heirs.get(g.id)! } : g)),
    memberships: l.memberships
      .filter((m) => !plan.closed.has(m.groupId) && !dropMembership(m))
      .map((m) => (plan.heirs.get(m.groupId) === m.memberId ? { ...m, role: 'owner' as const } : m)),
  };
}

const myMembership = (l: MockLedger, groupId: string, memberId: string) =>
  l.memberships.find((m) => m.groupId === groupId && m.memberId === memberId);

function requireMembership(l: MockLedger, groupId: string, memberId: string): Membership {
  const m = myMembership(l, groupId, memberId);
  if (!m) throw makeApiError('forbidden');
  return m;
}

function reporters(l: MockLedger, row: GroupRow, challenge: Challenge): ReporterEntry[] {
  const out: ReporterEntry[] = (row.seed?.reports ?? []).map((r) => ({ ...r }));
  for (const p of progressOf(l)) {
    if (p.challengeId !== challenge.id) continue;
    if (!myMembership(l, row.id, p.memberId)) continue; // a member who left no longer counts
    out.push({
      memberId: p.memberId,
      shareMyProgress: myMembership(l, row.id, p.memberId)?.shareMyProgress === true,
      pagesCovered: p.pagesCovered,
      daysMet: p.daysMet,
    });
  }
  return out;
}

/** Computed for this viewer only (design §6, A.2); never returns a non-sharer's figure. */
function progressFor(l: MockLedger, row: GroupRow, challenge: Challenge | null, v: Viewer) {
  const entries = challenge ? reporters(l, row, challenge) : [];
  return {
    reporters: entries.length,
    totals: visibleTotals(entries, v.memberId),
    shared: entries
      .filter((e) => e.shareMyProgress)
      .map((e) => ({
        member: summaryOf(e.memberId, row.ownerId, v),
        pagesCovered: e.pagesCovered,
        daysMet: e.daysMet,
      })),
  };
}

function allPosts(l: MockLedger, v: Viewer): Post[] {
  const seeded: Post[] = SEED_POSTS.map((p) => ({
    id: p.id,
    lectureId: p.lectureId,
    author: summaryOf(p.authorId, null, v),
    body: p.body,
    createdAt: p.createdAt,
    moderation: { status: p.status, updatedAt: p.createdAt },
    isMine: false,
  }));
  const own: Post[] = l.posts.map((p) => ({ ...p, isMine: p.author.memberId === v.memberId }));
  return [...seeded, ...own];
}

/** Others' non-visible posts are excluded; the viewer's own are always included (A.3). */
const shownTo = (p: Post) => p.isMine || p.moderation.status === 'visible';

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export const mockCommunityAdapter: CommunityService = {
  kind: 'mock',
  /** @devOnly */
  mockDelay: 300,
  /** @devOnly */
  simulateError: false,
  /** @devOnly */
  holdForReview: false,

  members: {
    register: (i) => mutate(i.requestId, () => nameMember(i.displayName)),
    rename: (i) => mutate(i.requestId, () => nameMember(i.displayName)),

    deleteMe: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        commit((l) => {
          const owned = new Set(l.groups.filter((g) => g.ownerId === v.memberId).map((g) => g.id));
          const plan = planHandOff(l, v.memberId, owned);
          const closedChallenges = new Set(l.challenges.filter((c) => plan.closed.has(c.groupId)).map((c) => c.id));
          return {
            posts: l.posts.filter((p) => p.author.memberId !== v.memberId),
            ...applyHandOff(l, plan, (m) => m.memberId === v.memberId),
            challenges: l.challenges.filter((c) => !plan.closed.has(c.groupId)),
            progress: progressOf(l).filter((p) => p.memberId !== v.memberId && !closedChallenges.has(p.challengeId)),
            log: logOf(l).filter((e) => e.memberId !== v.memberId),
            // The account is gone, so its stored replays are too.
            responses: {},
          };
        });
      }),
  },

  groups: {
    listMine: () =>
      query(() => {
        const v = viewer();
        const l = ledgerPort.read();
        return l.memberships
          .filter((m) => m.memberId === v.memberId)
          .sort((a, b) => b.joinedAt - a.joinedAt)
          .flatMap((m) => {
            const row = groupRows(l).find((g) => g.id === m.groupId);
            return row ? [toGroup(l, row)] : [];
          });
      }),

    get: (id) =>
      query(() => {
        const v = viewer();
        const l = ledgerPort.read();
        const row = findGroup(l, id);
        const me = requireMembership(l, id, v.memberId);
        const challenge = challengeOf(l, row);
        return {
          group: toGroup(l, row),
          members: memberIdsOf(l, row).map((m) => summaryOf(m, row.ownerId, v)),
          challenge,
          progress: progressFor(l, row, challenge, v),
          me,
        };
      }),

    create: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const now = Date.now();
        checkName(i.name, 'groupName');
        const l = ledgerPort.read();
        assertUnderRate(l, 'group', v.memberId, DAY_MS, COMMUNITY_RATES.groupsCreatedPerDay);
        assertRoomForAnotherGroup(l, v.memberId);
        const rows = groupRows(l);
        const group: Group = {
          id: makeId('g'),
          name: i.name.trim(),
          joinCode: makeJoinCode((c) => rows.some((g) => g.joinCode === c)),
          ownerId: v.memberId,
          memberCount: 1,
          maxMembers: COMMUNITY_LIMITS.members.max,
          createdAt: now,
          activeChallengeId: null,
        };
        commit((cur) => ({
          groups: [...cur.groups, group],
          memberships: [
            ...cur.memberships,
            { groupId: group.id, memberId: v.memberId, role: 'owner', joinedAt: now, shareMyProgress: false },
          ],
        }));
        logAction('group', v.memberId);
        return group;
      }),

    join: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const now = Date.now();
        const code = i.code.trim().toUpperCase();
        if (code.length !== COMMUNITY_LIMITS.joinCodeLength) throw invalid();
        const l = ledgerPort.read();
        const row = groupRows(l).find((g) => g.joinCode === code);
        if (!row) throw makeApiError('notFound');
        if (myMembership(l, row.id, v.memberId)) return toGroup(l, row);
        assertUnderRate(l, 'join', v.memberId, DAY_MS, COMMUNITY_RATES.joinsPerDay);
        assertRoomForAnotherGroup(l, v.memberId);
        if (memberIdsOf(l, row).length >= COMMUNITY_LIMITS.members.max) throw makeApiError('conflict');
        commit((cur) => ({
          memberships: [
            ...cur.memberships,
            { groupId: row.id, memberId: v.memberId, role: 'member', joinedAt: now, shareMyProgress: false },
          ],
        }));
        logAction('join', v.memberId);
        return toGroup(ledgerPort.read(), row);
      }),

    leave: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const l = ledgerPort.read();
        const row = findGroup(l, i.groupId);
        if (!myMembership(l, row.id, v.memberId)) return;
        const c = challengeOf(l, row); // seeded challenges included
        const challengeIds = new Set(c ? [c.id] : []);
        const plan = planHandOff(l, v.memberId, new Set([row.id])); // only a ledger group can have the leaver as owner
        commit((cur) => ({
          ...applyHandOff(cur, plan, (m) => m.groupId === row.id && m.memberId === v.memberId),
          challenges: cur.challenges.filter((c) => !plan.closed.has(c.groupId)),
          // The leaver's reported counts are removed, so they stop contributing to the group's totals.
          progress: progressOf(cur).filter(
            (p) => !(challengeIds.has(p.challengeId) && (plan.closed.has(row.id) || p.memberId === v.memberId)),
          ),
        }));
      }),

    setShareMyProgress: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const l = ledgerPort.read();
        findGroup(l, i.groupId);
        const current = requireMembership(l, i.groupId, v.memberId);
        const next: Membership = { ...current, shareMyProgress: i.share };
        commit((cur) => ({
          memberships: cur.memberships.map((m) => (m.groupId === i.groupId && m.memberId === v.memberId ? next : m)),
        }));
        return next;
      }),
  },

  challenges: {
    start: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const l = ledgerPort.read();
        const row = findGroup(l, i.groupId);
        const me = requireMembership(l, row.id, v.memberId);
        if (me.role !== 'owner') throw makeApiError('forbidden');
        checkTitle(i.title);
        checkDay(i.startsOn);
        if (i.kind === 'daily-wird') {
          if (!inRange(i.pagesPerDay, COMMUNITY_LIMITS.wirdPages.min, COMMUNITY_LIMITS.wirdPages.max)) throw invalid();
          if (!inRange(i.days, COMMUNITY_LIMITS.wirdDays.min, COMMUNITY_LIMITS.wirdDays.max)) throw invalid();
        }
        if (challengeOf(l, row)) throw makeApiError('conflict');
        const base = { id: makeId('c'), groupId: row.id, title: i.title.trim(), startsOn: i.startsOn, createdBy: v.memberId };
        const challenge: Challenge =
          i.kind === 'khatm'
            ? { ...base, kind: 'khatm' }
            : { ...base, kind: 'daily-wird', pagesPerDay: i.pagesPerDay, days: i.days };
        commit((cur) => ({ challenges: [...cur.challenges, challenge] }));
        return challenge;
      }),

    reportProgress: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const l = ledgerPort.read();
        const hit = groupRows(l)
          .map((row) => ({ row, challenge: challengeOf(l, row) }))
          .find((x) => x.challenge?.id === i.challengeId);
        if (!hit?.challenge) throw makeApiError('notFound');
        requireMembership(l, hit.row.id, v.memberId);
        if (i.memberId !== v.memberId) throw makeApiError('forbidden');
        // daysMet only means something for a daily wird; a khatm carries 0.
        const maxDays = hit.challenge.kind === 'daily-wird' ? hit.challenge.days : 0;
        if (!inRange(i.pagesCovered, 0, PAGES_PER_QURAN) || !inRange(i.daysMet, 0, maxDays)) throw invalid();
        // The server keeps the max per (challenge, member): pushed progress never goes down (C7).
        const prev = progressOf(l).find((p) => p.challengeId === i.challengeId && p.memberId === v.memberId);
        const next: ProgressReport = {
          challengeId: i.challengeId,
          memberId: v.memberId,
          computedAt: Math.max(prev?.computedAt ?? 0, i.computedAt),
          pagesCovered: Math.max(prev?.pagesCovered ?? 0, i.pagesCovered),
          daysMet: Math.max(prev?.daysMet ?? 0, i.daysMet),
        };
        commit((cur) => ({
          progress: [
            ...progressOf(cur).filter((p) => !(p.challengeId === i.challengeId && p.memberId === v.memberId)),
            next,
          ],
        }));
      }),
  },

  threads: {
    summaries: (lectureIds) =>
      query(() => {
        if (lectureIds.length > MAX_SUMMARY_IDS) throw invalid();
        const v = viewer();
        const visible = allPosts(ledgerPort.read(), v).filter((p) => p.moderation.status === 'visible');
        return lectureIds.map((lectureId): ThreadSummary => {
          const mine = visible.filter((p) => p.lectureId === lectureId);
          return {
            lectureId,
            postCount: mine.length,
            lastPostAt: mine.length ? Math.max(...mine.map((p) => p.createdAt)) : null,
          };
        });
      }),

    posts: (lectureId, cursor) =>
      query((): Paged<Post> => {
        const v = viewer();
        let offset = 0;
        if (cursor !== null) {
          if (cursor.length > 2048 || !/^\d+$/.test(cursor)) throw invalid();
          offset = Number(cursor);
        }
        const all = allPosts(ledgerPort.read(), v)
          .filter((p) => p.lectureId === lectureId && shownTo(p))
          .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1));
        const items = all.slice(offset, offset + PAGE_SIZE);
        return { items, nextCursor: offset + PAGE_SIZE < all.length ? String(offset + PAGE_SIZE) : null };
      }),

    createPost: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const now = Date.now();
        if (!i.lectureId) throw invalid();
        checkPost(i.body);
        const mine = recent(ledgerPort.read(), 'post', v.memberId, now - HOUR_MS);
        const last = mine.reduce((m, e) => Math.max(m, e.at), 0);
        if (now - last < COMMUNITY_RATES.postCooldownMs || mine.length >= COMMUNITY_RATES.postsPerHour) {
          throw rateLimited();
        }
        // The mock honours the client's tier result (§5.2); a server would re-classify.
        const status = i.review || knobs().holdForReview ? 'pending' : 'visible';
        const post: Post = {
          id: makeId('p'),
          lectureId: i.lectureId,
          author: { memberId: v.memberId, displayName: v.displayName, isOwner: false },
          body: i.body.trim(),
          createdAt: now,
          moderation: { status, updatedAt: now },
          isMine: true,
        };
        commit((l) => ({ posts: [...l.posts, post] }));
        logAction('post', v.memberId);
        return post;
      }),

    deletePost: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const l = ledgerPort.read();
        const mine = l.posts.find((p) => p.id === i.postId && p.author.memberId === v.memberId);
        if (mine) {
          commit((cur) => ({ posts: cur.posts.filter((p) => p.id !== i.postId) }));
          return;
        }
        // Someone else's post: forbidden if the viewer could see it, else it doesn't exist for them.
        const other = allPosts(l, v).find((p) => p.id === i.postId);
        if (other && shownTo(other)) throw makeApiError('forbidden');
        throw makeApiError('notFound');
      }),

    report: (i) =>
      mutate(i.requestId, () => {
        const v = viewer();
        const l = ledgerPort.read();
        const target = allPosts(l, v).find((p) => p.id === i.postId && shownTo(p));
        if (!target) throw makeApiError('notFound');
        if (target.isMine) throw makeApiError('forbidden');
        if (!REASONS.includes(i.reason)) throw invalid();
        if (i.note !== undefined && i.note !== '') checkNote(i.note);
        assertUnderRate(l, 'report', v.memberId, DAY_MS, COMMUNITY_RATES.reportsPerDay);
        logAction('report', v.memberId);
      }),
  },
};
