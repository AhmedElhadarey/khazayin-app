import { COMMUNITY_RATES } from '@/constants/communityLimits';
import { JOIN_CODES, SEED_SENTINEL, SEED_MEMBERS, SEED_POSTS, SEED_GROUPS } from '@/data/community/seed';
import { checkText } from '@/services/community/adabFilter';
import { offAdapter } from '@/services/community/communityService';
import { mockCommunityAdapter as mock } from '@/services/community/mockAdapter';
import { ledgerPort, useCommunityLocalStore, type MockLedger } from '@/store/communityLocalStore';
import type { Post } from '@/types/community';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const LECTURE = 'sl1-1';

let now = 1_800_000_000_000;
let n = 0;
const rid = () => `req-${(n += 1)}`;
const advance = (ms: number) => {
  now += ms;
};

const emptyLedger = (): MockLedger => ({
  posts: [],
  groups: [],
  memberships: [],
  challenges: [],
  responses: {},
});

const as = (memberId: string, displayName = 'مستخدم تجريبي') =>
  useCommunityLocalStore.setState({ profile: { memberId, displayName, serverIssued: false } });

const post = (body = 'جزاكم الله خيرًا على هذه الفائدة', review = false, requestId = rid()) =>
  mock.threads.createPost({ requestId, lectureId: LECTURE, body, review });

const join = (code: string) => mock.groups.join({ requestId: rid(), code });
const codeOf = async (err: Promise<unknown>) =>
  err.then(
    () => 'resolved',
    (e: { code?: string }) => e.code,
  );

beforeEach(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  mock.mockDelay = 0;
  mock.simulateError = false;
  mock.holdForReview = false;
  ledgerPort.write(emptyLedger);
  as('viewer-a');
});
afterEach(() => jest.restoreAllMocks());

describe('seed', () => {
  it('names every seeded member and group with the (تجريبي) suffix', () => {
    for (const m of SEED_MEMBERS) expect(m.displayName.endsWith('(تجريبي)')).toBe(true);
    for (const g of SEED_GROUPS) expect(g.name.endsWith('(تجريبي)')).toBe(true);
  });

  it('keeps every seeded post within adab', () => {
    for (const p of SEED_POSTS) expect(checkText(p.body, 'post')).toEqual({ ok: true, review: false });
  });

  it('exposes the three join codes', () => {
    expect(JOIN_CODES).toEqual({ leak: 'KHZ7Q2', visible: 'NUR4M8', wird: 'HDY9P3' });
  });
});

describe('idempotency (design §5.3)', () => {
  it('replays a 2xx: the same requestId gives one post with one id', async () => {
    const id = rid();
    const first = await post(undefined, false, id);
    const second = await post(undefined, false, id);
    expect(second.id).toBe(first.id);
    const mine = (await mock.threads.posts(LECTURE, null)).items.filter((p) => p.isMine);
    expect(mine).toHaveLength(1);
  });

  it('does not store failures: a retry after simulateError yields exactly one post', async () => {
    const id = rid();
    mock.simulateError = true;
    expect(await codeOf(post(undefined, false, id))).toBe('server');
    expect(ledgerPort.read().posts).toHaveLength(0);
    expect(ledgerPort.read().responses[id]).toBeUndefined();
    mock.simulateError = false;
    await post(undefined, false, id);
    expect(ledgerPort.read().posts).toHaveLength(1);
  });

  it('does not store a validation or rate failure either', async () => {
    const id = rid();
    expect(await codeOf(post('', false, id))).toBe('validation');
    expect(ledgerPort.read().responses[id]).toBeUndefined();
  });

  it('resolves two concurrent calls with one id to the same object', async () => {
    const id = rid();
    const [a, b] = await Promise.all([post(undefined, false, id), post(undefined, false, id)]);
    expect(a).toBe(b);
    expect(ledgerPort.read().posts).toHaveLength(1);
  });

  it('prunes stored responses after 24 h', async () => {
    const id = rid();
    await post(undefined, false, id);
    expect(ledgerPort.read().responses[id]).toBeDefined();
    advance(DAY + HOUR);
    await post(undefined, false, rid());
    expect(ledgerPort.read().responses[id]).toBeUndefined();
  });
});

describe('groups', () => {
  it('joins a seeded group by code, case-insensitively', async () => {
    const g = await join('KHZ7Q2');
    expect(g.joinCode).toBe('KHZ7Q2');
    expect(g.id.startsWith(SEED_SENTINEL)).toBe(true);
    expect((await join('khz7q2')).id).toBe(g.id);
    expect((await mock.groups.listMine()).map((x) => x.id)).toEqual([g.id]);
  });

  it('rejects an unknown code with notFound', async () => {
    expect(await codeOf(join('ZZZZZZ'))).toBe('notFound');
  });

  it('rejects a malformed code with validation', async () => {
    expect(await codeOf(join('ABC'))).toBe('validation');
  });

  it('refuses the 51st member with conflict', async () => {
    const g = await join('HDY9P3');
    await mock.groups.leave({ requestId: rid(), groupId: g.id });
    const existing = g.memberCount - 1;
    ledgerPort.write((l) => ({
      ...l,
      memberships: Array.from({ length: 50 - existing }, (_, i) => ({
        groupId: g.id,
        memberId: `filler-${i}`,
        role: 'member' as const,
        joinedAt: now,
        shareMyProgress: false,
      })),
    }));
    expect(await codeOf(join('HDY9P3'))).toBe('conflict');
  });

  it('refuses a 6th group with conflict', async () => {
    for (let i = 0; i < 3; i += 1) await mock.groups.create({ requestId: rid(), name: `حلقة ${i + 1} للتدارس` });
    await join('KHZ7Q2');
    await join('NUR4M8');
    expect(await mock.groups.listMine()).toHaveLength(5);
    expect(await codeOf(join('HDY9P3'))).toBe('conflict');
  });

  it('limits group creation to 3 per day', async () => {
    for (let i = 0; i < COMMUNITY_RATES.groupsCreatedPerDay; i += 1) {
      await mock.groups.create({ requestId: rid(), name: `حلقة ${i + 1} للتدارس` });
    }
    expect(await codeOf(mock.groups.create({ requestId: rid(), name: 'حلقة رابعة للتدارس' }))).toBe('rateLimit');
  });

  it('limits joins to 10 per day', async () => {
    for (let i = 0; i < COMMUNITY_RATES.joinsPerDay; i += 1) {
      await join('KHZ7Q2');
      await mock.groups.leave({ requestId: rid(), groupId: (await mock.groups.listMine().then((g) => g[0]))?.id ?? 'x' });
    }
    expect(await codeOf(join('KHZ7Q2'))).toBe('rateLimit');
  });

  it('answers a repeat join of a group you are already in even at the join cap', async () => {
    const kept = await join('KHZ7Q2');
    for (let i = 0; i < COMMUNITY_RATES.joinsPerDay - 1; i += 1) {
      const g = await join('HDY9P3');
      await mock.groups.leave({ requestId: rid(), groupId: g.id });
    }
    expect(await codeOf(join('HDY9P3'))).toBe('rateLimit');
    expect((await join('KHZ7Q2')).id).toBe(kept.id);
  });

  it('stops counting a seeded-group leaver in reporters, totals and the ledger', async () => {
    const g = await join(JOIN_CODES.visible);
    const challengeId = (await mock.groups.get(g.id)).challenge!.id;
    const seeded = (await mock.groups.get(g.id)).progress.reporters;
    await mock.challenges.reportProgress({ requestId: rid(), challengeId, memberId: 'viewer-a', computedAt: now, pagesCovered: 30, daysMet: 0 });
    const before = (await mock.groups.get(g.id)).progress;
    expect(before.reporters).toBe(seeded + 1);
    await mock.groups.leave({ requestId: rid(), groupId: g.id });
    expect(ledgerPort.read().progress ?? []).toEqual([]);
    as('viewer-b');
    await join(JOIN_CODES.visible);
    const after = (await mock.groups.get(g.id)).progress;
    expect(after.reporters).toBe(seeded);
  });

  it('ignores stored progress from a member who no longer has a membership', async () => {
    const g = await join(JOIN_CODES.visible);
    const challengeId = (await mock.groups.get(g.id)).challenge!.id;
    ledgerPort.write((l) => ({
      ...l,
      progress: [{ challengeId, memberId: 'ghost', computedAt: now, pagesCovered: 500, daysMet: 0 }],
    }));
    const { progress } = await mock.groups.get(g.id);
    expect(progress.reporters).toBe(SEED_GROUPS.find((x) => x.joinCode === JOIN_CODES.visible)!.reports.length);
  });

  it('creates a group the viewer owns, then closes it when the owner leaves', async () => {
    const g = await mock.groups.create({ requestId: rid(), name: 'ختمة الجمعة' });
    expect(g.ownerId).toBe('viewer-a');
    expect(g.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(g.memberCount).toBe(1);
    await mock.groups.leave({ requestId: rid(), groupId: g.id });
    expect(await mock.groups.listMine()).toEqual([]);
    expect(await codeOf(mock.groups.get(g.id))).toBe('notFound');
  });

  it('hands ownership to the earliest remaining joiner when the owner leaves', async () => {
    const g = await mock.groups.create({ requestId: rid(), name: 'ختمة الجمعة' });
    as('viewer-b');
    advance(1000);
    await join(g.joinCode);
    as('viewer-c');
    advance(1000);
    await join(g.joinCode);
    as('viewer-a');
    await mock.groups.leave({ requestId: rid(), groupId: g.id });
    as('viewer-c');
    const view = await mock.groups.get(g.id);
    expect(view.group.ownerId).toBe('viewer-b');
    expect(view.group.memberCount).toBe(2);
    expect(view.members.find((m) => m.memberId === 'viewer-b')?.isOwner).toBe(true);
    as('viewer-b');
    expect((await mock.groups.get(g.id)).me.role).toBe('owner');
    expect(ledgerPort.read().groups.find((x) => x.id === g.id)?.ownerId).toBe('viewer-b');
  });

  it('hands ownership over on deleteMe, and the new owner can start a challenge', async () => {
    const g = await mock.groups.create({ requestId: rid(), name: 'ختمة الجمعة' });
    as('viewer-b');
    advance(1000);
    await join(g.joinCode);
    as('viewer-a');
    await mock.members.deleteMe({ requestId: rid() });
    as('viewer-b');
    const view = await mock.groups.get(g.id);
    expect(view.group.ownerId).toBe('viewer-b');
    expect(view.me.role).toBe('owner');
    expect(view.group.memberCount).toBe(1);
    const c = await mock.challenges.start({
      requestId: rid(),
      groupId: g.id,
      title: 'ختمة جديدة',
      startsOn: '2026-11-01',
      kind: 'khatm',
    });
    expect(c.createdBy).toBe('viewer-b');
  });

  it('rejects a group name that fails the filter', async () => {
    expect(await codeOf(mock.groups.create({ requestId: rid(), name: 'ab' }))).toBe('validation');
  });

  it('refuses get() for a group the viewer is not in', async () => {
    const id = `${SEED_SENTINEL}:${SEED_GROUPS[0].id}`;
    expect(await codeOf(mock.groups.get(id))).toBe('forbidden');
  });
});

describe('challenges', () => {
  it('lets only the owner start one, and only one at a time', async () => {
    const seeded = await join('NUR4M8');
    expect(
      await codeOf(
        mock.challenges.start({ requestId: rid(), groupId: seeded.id, title: 'تحدي جديد', startsOn: '2026-11-01', kind: 'khatm' }),
      ),
    ).toBe('forbidden');

    const own = await mock.groups.create({ requestId: rid(), name: 'ختمة الجمعة' });
    const c = await mock.challenges.start({
      requestId: rid(),
      groupId: own.id,
      title: 'ورد يومي',
      startsOn: '2026-11-01',
      kind: 'daily-wird',
      pagesPerDay: 5,
      days: 30,
    });
    expect(c).toMatchObject({ kind: 'daily-wird', pagesPerDay: 5, days: 30, groupId: own.id, createdBy: 'viewer-a' });
    expect((await mock.groups.get(own.id)).group.activeChallengeId).toBe(c.id);
    expect(
      await codeOf(
        mock.challenges.start({ requestId: rid(), groupId: own.id, title: 'تحدي آخر', startsOn: '2026-11-01', kind: 'khatm' }),
      ),
    ).toBe('conflict');
  });

  it('validates the wird bounds', async () => {
    const own = await mock.groups.create({ requestId: rid(), name: 'ختمة الجمعة' });
    const start = (pagesPerDay: number, days: number) =>
      codeOf(
        mock.challenges.start({
          requestId: rid(),
          groupId: own.id,
          title: 'ورد يومي',
          startsOn: '2026-11-01',
          kind: 'daily-wird',
          pagesPerDay,
          days,
        }),
      );
    expect(await start(0, 30)).toBe('validation');
    expect(await start(605, 30)).toBe('validation');
    expect(await start(5, 61)).toBe('validation');
  });

  it('keeps reported progress monotonic', async () => {
    const g = await join('KHZ7Q2');
    const challengeId = (await mock.groups.get(g.id)).challenge!.id;
    const report = (pagesCovered: number) =>
      mock.challenges.reportProgress({ requestId: rid(), challengeId, memberId: 'viewer-a', computedAt: now, pagesCovered, daysMet: 0 });
    await report(50);
    await report(30);
    const view = await mock.groups.get(g.id);
    await mock.groups.setShareMyProgress({ requestId: rid(), groupId: g.id, share: true });
    const shared = (await mock.groups.get(g.id)).progress.shared.find((s) => s.member.memberId === 'viewer-a');
    expect(view.progress.reporters).toBe(4);
    expect(shared?.pagesCovered).toBe(50);
  });

  it('rejects out-of-range progress', async () => {
    const g = await join('KHZ7Q2');
    const challengeId = (await mock.groups.get(g.id)).challenge!.id;
    expect(
      await codeOf(
        mock.challenges.reportProgress({ requestId: rid(), challengeId, memberId: 'viewer-a', computedAt: now, pagesCovered: 605, daysMet: 0 }),
      ),
    ).toBe('validation');
  });
});

describe('shared progress', () => {
  const report = async (groupId: string, pagesCovered: number) => {
    const challengeId = (await mock.groups.get(groupId)).challenge!.id;
    await mock.challenges.reportProgress({ requestId: rid(), challengeId, memberId: 'viewer-a', computedAt: now, pagesCovered, daysMet: 0 });
  };

  it('lists per-member figures only for sharers', async () => {
    const g = await join('KHZ7Q2');
    await report(g.id, 12);
    const { progress } = await mock.groups.get(g.id);
    const names = progress.shared.map((s) => s.member.displayName);
    expect(progress.shared).toHaveLength(2);
    expect(names.every((x) => x.endsWith('(تجريبي)'))).toBe(true);
    expect(progress.shared.find((s) => s.member.memberId === 'viewer-a')).toBeUndefined();
    const nonSharer = SEED_GROUPS[0].reports.find((r) => !r.shareMyProgress)!;
    expect(progress.shared.find((s) => s.member.memberId === nonSharer.memberId)).toBeUndefined();
  });

  it('hides totals on the leak case (one non-sharer besides the viewer)', async () => {
    const g = await join(JOIN_CODES.leak);
    await report(g.id, 12);
    const { progress } = await mock.groups.get(g.id);
    expect(progress.reporters).toBe(4);
    expect(progress.totals).toBeNull();
  });

  it('shows rounded totals on the visible case without exposing a non-sharer', async () => {
    const seed = SEED_GROUPS.find((x) => x.joinCode === JOIN_CODES.visible)!;
    const nonSharers = seed.reports.filter((r) => !r.shareMyProgress).map((r) => r.pagesCovered);
    const g = await join(JOIN_CODES.visible);
    for (const own of [0, 7, 14, 100, 604]) {
      await report(g.id, own);
      const { progress } = await mock.groups.get(g.id);
      expect(progress.totals).not.toBeNull();
      expect(progress.totals!.pages % 10).toBe(0);
      const remainder =
        progress.totals!.pages - own - progress.shared.reduce((s, x) => s + x.pagesCovered, 0);
      expect(nonSharers).not.toContain(remainder);
    }
  });

  it('has a daily-wird seed group', async () => {
    const g = await join(JOIN_CODES.wird);
    const view = await mock.groups.get(g.id);
    expect(view.challenge).toMatchObject({ kind: 'daily-wird' });
  });
});

describe('threads', () => {
  it('marks a review:true post pending, and holdForReview makes every post pending', async () => {
    const a = await post('بارك الله فيكم', true);
    expect(a.moderation.status).toBe('pending');
    advance(COMMUNITY_RATES.postCooldownMs + 1);
    expect((await post('نفع الله بكم')).moderation.status).toBe('visible');
    advance(COMMUNITY_RATES.postCooldownMs + 1);
    mock.holdForReview = true;
    expect((await post('جزاكم الله خيرًا')).moderation.status).toBe('pending');
  });

  it("hides a pending post from others and shows it to its author", async () => {
    const mine = await post('بارك الله فيكم', true);
    const ids = async () => (await mock.threads.posts(LECTURE, null)).items.map((p) => p.id);
    expect(await ids()).toContain(mine.id);
    as('viewer-b');
    expect(await ids()).not.toContain(mine.id);
    as('viewer-a');
    const seen = (await mock.threads.posts(LECTURE, null)).items.find((p) => p.id === mine.id) as Post;
    expect(seen.isMine).toBe(true);
    expect(seen.moderation.status).toBe('pending');
  });

  it('never lists another member’s seeded pending post', async () => {
    const pending = SEED_POSTS.filter((p) => p.status === 'pending');
    expect(pending.length).toBeGreaterThan(0);
    for (const l of [LECTURE, 'sl2-1']) {
      const items = (await mock.threads.posts(l, null)).items;
      for (const p of pending) expect(items.map((x) => x.id)).not.toContain(p.id);
    }
  });

  it('serves seeded posts and summaries for the first two scholars', async () => {
    const [s] = await mock.threads.summaries([LECTURE, 'sl2-1', 'nothing']);
    expect(s.postCount).toBeGreaterThan(0);
    const sums = await mock.threads.summaries(['nothing']);
    expect(sums).toEqual([{ lectureId: 'nothing', postCount: 0, lastPostAt: null }]);
  });

  it('paginates with an opaque cursor', async () => {
    for (let i = 0; i < 22; i += 1) {
      await post(`مشاركة رقم ${i + 1} نافعة`);
      advance(7 * 60e3); // stays under the 10-per-hour cap
    }
    const first = await mock.threads.posts(LECTURE, null);
    expect(first.nextCursor).not.toBeNull();
    const second = await mock.threads.posts(LECTURE, first.nextCursor);
    const ids = new Set([...first.items, ...second.items].map((p) => p.id));
    expect(ids.size).toBe(first.items.length + second.items.length);
    expect(first.items).toHaveLength(20);
    expect(second.nextCursor).toBeNull();
    expect(await codeOf(mock.threads.posts(LECTURE, 'abc'))).toBe('validation');
  });

  it('enforces the 30 s cooldown and 10 posts per hour', async () => {
    await post();
    expect(await codeOf(post())).toBe('rateLimit');
    advance(COMMUNITY_RATES.postCooldownMs + 1);
    await post();
    for (let i = 2; i < COMMUNITY_RATES.postsPerHour; i += 1) {
      advance(COMMUNITY_RATES.postCooldownMs + 1);
      await post();
    }
    advance(COMMUNITY_RATES.postCooldownMs + 1);
    expect(await codeOf(post())).toBe('rateLimit');
    advance(HOUR);
    await post();
  });

  it('refuses a filter-blocked post with moderation, and an empty one with validation', async () => {
    expect(checkText('https://example.com/x', 'post').ok).toBe(false);
    expect(await codeOf(post('https://example.com/x'))).toBe('moderation');
    expect(await codeOf(post('   '))).toBe('validation');
  });

  it('deletes only own posts', async () => {
    const mine = await post();
    expect(await codeOf(mock.threads.deletePost({ requestId: rid(), postId: SEED_POSTS[0].id }))).toBe('forbidden');
    expect(await codeOf(mock.threads.deletePost({ requestId: rid(), postId: 'nope' }))).toBe('notFound');
    await mock.threads.deletePost({ requestId: rid(), postId: mine.id });
    expect((await mock.threads.posts(LECTURE, null)).items.map((p) => p.id)).not.toContain(mine.id);
  });

  it('reports other posts, refuses reporting your own, and limits reports to 20 per day', async () => {
    const mine = await post();
    expect(await codeOf(mock.threads.report({ requestId: rid(), postId: mine.id, reason: 'spam' }))).toBe('forbidden');
    const other = SEED_POSTS.find((p) => p.status === 'visible')!;
    for (let i = 0; i < COMMUNITY_RATES.reportsPerDay; i += 1) {
      await mock.threads.report({ requestId: rid(), postId: other.id, reason: 'offensive' });
    }
    expect(await codeOf(mock.threads.report({ requestId: rid(), postId: other.id, reason: 'offensive' }))).toBe('rateLimit');
  });
});

describe('members', () => {
  it('registers and renames against the local identity', async () => {
    const m = await mock.members.register({ requestId: rid(), displayName: 'عبد الرحمن', guidelinesVersion: 1 });
    expect(m).toMatchObject({ memberId: 'viewer-a', displayName: 'عبد الرحمن' });
    expect(await codeOf(mock.members.rename({ requestId: rid(), displayName: 'x' }))).toBe('validation');
  });

  it('refuses any filter hit on a name with validation and the pick-another-name copy', async () => {
    expect(checkText('يا كلب', 'name').ok).toBe(false);
    const COPY = 'يُرجى اختيار اسم آخر';
    for (const attempt of [
      mock.members.rename({ requestId: rid(), displayName: 'يا كلب' }),
      mock.members.register({ requestId: rid(), displayName: 'يا كلب', guidelinesVersion: 1 }),
      mock.groups.create({ requestId: rid(), name: 'يا كلب' }),
    ]) {
      await expect(attempt).rejects.toMatchObject({ code: 'validation', message: COPY });
    }
  });

  it('reports a filtered note as plain validation', async () => {
    const other = SEED_POSTS.find((p) => p.status === 'visible')!;
    await expect(
      mock.threads.report({ requestId: rid(), postId: other.id, reason: 'spam', note: 'https://example.com/x' }),
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('rejects calls with no local identity as auth', async () => {
    useCommunityLocalStore.setState({ profile: null });
    expect(await codeOf(mock.groups.listMine())).toBe('auth');
  });

  it('deleteMe removes own posts, memberships and owned groups, and clears replays', async () => {
    await post();
    await join('KHZ7Q2');
    const own = await mock.groups.create({ requestId: rid(), name: 'ختمة الجمعة' });
    const deleteId = rid();
    await mock.members.deleteMe({ requestId: deleteId });
    const l = ledgerPort.read();
    expect(Object.keys(l.responses)).toEqual([deleteId]);
    expect(l.posts.filter((p) => p.author.memberId === 'viewer-a')).toEqual([]);
    expect(l.memberships.filter((m) => m.memberId === 'viewer-a')).toEqual([]);
    expect(l.groups.find((g) => g.id === own.id)).toBeUndefined();
    expect(await mock.groups.listMine()).toEqual([]);
    expect((await mock.threads.posts(LECTURE, null)).items.some((p) => p.isMine)).toBe(false);
  });
});

describe('offAdapter', () => {
  it('rejects every call with forbidden', async () => {
    expect(offAdapter.kind).toBe('off');
    expect(await codeOf(offAdapter.groups.listMine())).toBe('forbidden');
    expect(await codeOf(offAdapter.threads.summaries([]))).toBe('forbidden');
    expect(await codeOf(offAdapter.members.deleteMe({ requestId: 'x' }))).toBe('forbidden');
  });
});
