import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { COMMUNITY_RATES } from '@/constants/communityLimits';
import { makeApiError } from '@/services/api/errors';
import {
  REPORT_REASON_ORDER,
  closeOnce,
  newGuard,
  openOnce,
  postBusy,
  threadListPlan,
  planPost,
  previewReview,
  waitCopy,
  runDeletePost,
  runGuarded,
  runMute,
  runSubmitPost,
  runSubmitReport,
} from '@/services/community/threadActions';
import type { Post } from '@/types/community';

const NOW = 50_000_000;
const post = (status: Post['moderation']['status'] = 'visible'): Post => ({
  id: 'p1',
  lectureId: 'L1',
  author: { memberId: 'me', displayName: 'x', isOwner: false },
  body: 'b',
  createdAt: NOW,
  moderation: { status, updatedAt: NOW },
  isMine: true,
});
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('runGuarded', () => {
  const deps = (over: Partial<Parameters<typeof runGuarded<string>>[1]> = {}) => ({
    perform: jest.fn(async () => 'ok'),
    isCurrent: () => true,
    onStart: jest.fn(),
    onDone: jest.fn(),
    onError: jest.fn(),
    onSettled: jest.fn(),
    ...over,
  });

  it('runs once for two taps in the same frame', async () => {
    const g = newGuard();
    const d = deps();
    await Promise.all([runGuarded(g, d), runGuarded(g, d)]);
    expect(d.perform).toHaveBeenCalledTimes(1);
    expect(d.onDone).toHaveBeenCalledTimes(1);
    expect(d.onSettled).toHaveBeenCalledTimes(1);
  });

  it('can run again after it settled unless it is `once`', async () => {
    const g = newGuard();
    const d = deps();
    await runGuarded(g, d);
    await runGuarded(g, d);
    expect(d.perform).toHaveBeenCalledTimes(2);
    const once = newGuard();
    const o = deps({ once: true });
    await runGuarded(once, o);
    await runGuarded(once, o);
    expect(o.perform).toHaveBeenCalledTimes(1);
  });

  it('reports a failure only while current, and always settles', async () => {
    const err = new Error('x');
    const g = newGuard();
    const d = deps({ perform: jest.fn(async () => { throw err; }) });
    await runGuarded(g, d);
    expect(d.onError).toHaveBeenCalledWith(err);
    expect(d.onSettled).toHaveBeenCalledTimes(1);

    const stale = deps({ perform: jest.fn(async () => { throw err; }), isCurrent: () => false });
    await runGuarded(newGuard(), stale);
    expect(stale.onError).not.toHaveBeenCalled();
    expect(stale.onSettled).toHaveBeenCalledTimes(1);
  });

  it('drops a result that lands after a reset', async () => {
    const d = deps({ isCurrent: () => false });
    await runGuarded(newGuard(), d);
    expect(d.onDone).not.toHaveBeenCalled();
  });

  it('a failed `once` run can be retried', async () => {
    const g = newGuard();
    const d = deps({ once: true, perform: jest.fn(async () => { throw new Error('x'); }) });
    await runGuarded(g, d);
    await runGuarded(g, d);
    expect(d.perform).toHaveBeenCalledTimes(2);
  });
});

describe('planPost', () => {
  it('refuses with the filter copy', () => {
    expect(planPost('   ', [], NOW)).toEqual({ kind: 'refused', message: COMMUNITY_COPY.filterReason.empty });
    expect(planPost('زوروا https://example.com', [], NOW)).toEqual({
      kind: 'refused',
      message: COMMUNITY_COPY.filterReason.link,
    });
  });

  it('is ready with the trimmed body and the review tier', () => {
    expect(planPost('  جزاكم الله خيرًا  ', [], NOW)).toEqual({ kind: 'ready', body: 'جزاكم الله خيرًا', review: false });
    expect(planPost('يا كافر', [], NOW)).toMatchObject({ kind: 'ready', review: true });
  });

  it('waits out the cooldown with the frozen copy', () => {
    const plan = planPost('نص طيب', [NOW - 5000], NOW);
    expect(plan.kind).toBe('wait');
    expect(plan).toMatchObject({ message: expect.stringContaining('بعد') });
  });

  it('names the hourly cap', () => {
    const times = Array.from({ length: COMMUNITY_RATES.postsPerHour }, (_, i) => NOW - 40 * 60e3 + i * 1000);
    expect(planPost('نص طيب', times, NOW)).toEqual({ kind: 'wait', message: COMMUNITY_COPY.hourlyLimit });
  });
});

describe('runSubmitPost', () => {
  const make = (over = {}) => ({
    perform: jest.fn(async () => post()),
    record: jest.fn(),
    isCurrent: () => true,
    onRefused: jest.fn(),
    onStart: jest.fn(),
    onPosted: jest.fn(),
    onError: jest.fn(),
    onSettled: jest.fn(),
    ...over,
  });

  it('sends the cleaned body once, records the time, and hands back the post', async () => {
    const d = make();
    const g = newGuard();
    await runSubmitPost(g, { text: ' سلام عليكم ', postTimes: [], now: NOW }, d);
    expect(d.perform).toHaveBeenCalledWith('سلام عليكم', false);
    expect(d.record).toHaveBeenCalledWith(NOW);
    expect(d.onPosted).toHaveBeenCalledWith(post());
  });

  it('a double tap while the first is in flight does not double-post', async () => {
    const slow = deferred<Post>();
    const d = make({ perform: jest.fn(() => slow.promise) });
    const g = newGuard();
    const first = runSubmitPost(g, { text: 'سلام عليكم', postTimes: [], now: NOW }, d);
    const second = runSubmitPost(g, { text: 'سلام عليكم', postTimes: [], now: NOW }, d);
    slow.resolve(post());
    await Promise.all([first, second]);
    expect(d.perform).toHaveBeenCalledTimes(1);
    expect(d.onPosted).toHaveBeenCalledTimes(1);
  });

  it('refuses locally without calling the service', async () => {
    const d = make();
    await runSubmitPost(newGuard(), { text: 'https://x.com', postTimes: [], now: NOW }, d);
    expect(d.perform).not.toHaveBeenCalled();
    expect(d.onRefused).toHaveBeenCalledWith(COMMUNITY_COPY.filterReason.link);
    expect(d.onStart).not.toHaveBeenCalled();
  });

  it('does not record a post that failed', async () => {
    const d = make({ perform: jest.fn(async () => { throw makeApiError('moderation'); }) });
    await runSubmitPost(newGuard(), { text: 'سلام عليكم', postTimes: [], now: NOW }, d);
    expect(d.record).not.toHaveBeenCalled();
    expect(d.onError).toHaveBeenCalledTimes(1);
  });

  it('does not record or report a post that lands after a reset', async () => {
    const d = make({ isCurrent: () => false });
    await runSubmitPost(newGuard(), { text: 'سلام عليكم', postTimes: [], now: NOW }, d);
    expect(d.record).not.toHaveBeenCalled();
    expect(d.onPosted).not.toHaveBeenCalled();
  });
});

describe('runDeletePost', () => {
  const make = (over = {}) => ({
    perform: jest.fn(async () => undefined),
    remove: jest.fn(),
    isCurrent: () => true,
    onStart: jest.fn(),
    onError: jest.fn(),
    onSettled: jest.fn(),
    ...over,
  });

  it('removes the post from its thread after the delete', async () => {
    const d = make();
    await runDeletePost(newGuard(), { lectureId: 'L1', postId: 'p1' }, d);
    expect(d.remove).toHaveBeenCalledWith('L1', 'p1');
  });

  it('two taps delete once', async () => {
    const slow = deferred<undefined>();
    const d = make({ perform: jest.fn(() => slow.promise) });
    const g = newGuard();
    const a = runDeletePost(g, { lectureId: 'L1', postId: 'p1' }, d);
    const b = runDeletePost(g, { lectureId: 'L1', postId: 'p1' }, d);
    slow.resolve(undefined);
    await Promise.all([a, b]);
    expect(d.perform).toHaveBeenCalledTimes(1);
    expect(d.remove).toHaveBeenCalledTimes(1);
  });

  it('a post that is already gone is removed locally, not reported', async () => {
    const d = make({ perform: jest.fn(async () => { throw makeApiError('notFound'); }) });
    await runDeletePost(newGuard(), { lectureId: 'L1', postId: 'p1' }, d);
    expect(d.remove).toHaveBeenCalledWith('L1', 'p1');
    expect(d.onError).not.toHaveBeenCalled();
  });

  it('keeps the post and reports any other failure', async () => {
    const d = make({ perform: jest.fn(async () => { throw makeApiError('network'); }) });
    await runDeletePost(newGuard(), { lectureId: 'L1', postId: 'p1' }, d);
    expect(d.remove).not.toHaveBeenCalled();
    expect(d.onError).toHaveBeenCalledTimes(1);
  });
});

describe('runSubmitReport', () => {
  const make = (over = {}) => ({
    perform: jest.fn(async () => undefined),
    hide: jest.fn(),
    notify: jest.fn(),
    close: jest.fn(),
    isCurrent: () => true,
    onRefused: jest.fn(),
    onStart: jest.fn(),
    onError: jest.fn(),
    onSettled: jest.fn(),
    ...over,
  });

  it('hides the post, thanks the member and closes, once', async () => {
    const d = make();
    const g = newGuard();
    await runSubmitReport(g, { postId: 'p1', reason: 'spam', note: 'ignored' }, d);
    await runSubmitReport(g, { postId: 'p1', reason: 'spam', note: '' }, d);
    expect(d.perform).toHaveBeenCalledTimes(1);
    expect(d.perform).toHaveBeenCalledWith('spam', undefined);
    expect(d.hide).toHaveBeenCalledWith('p1');
    expect(d.notify).toHaveBeenCalledWith(COMMUNITY_COPY.reportThanks);
    expect(d.close).toHaveBeenCalledTimes(1);
  });

  it('sends the cleaned note for «سبب آخر» and none when it is empty', async () => {
    const d = make();
    await runSubmitReport(newGuard(), { postId: 'p1', reason: 'other', note: '  تفصيل ​' }, d);
    expect(d.perform).toHaveBeenCalledWith('other', 'تفصيل');
    const e = make();
    await runSubmitReport(newGuard(), { postId: 'p1', reason: 'other', note: '   ' }, e);
    expect(e.perform).toHaveBeenCalledWith('other', undefined);
  });

  it('refuses a note the filter rejects, locally', async () => {
    const d = make();
    await runSubmitReport(newGuard(), { postId: 'p1', reason: 'other', note: 'https://spam.com' }, d);
    expect(d.perform).not.toHaveBeenCalled();
    expect(d.onRefused).toHaveBeenCalledWith(COMMUNITY_COPY.filterReason.link);
  });

  it('a post that vanished server-side still hides and closes', async () => {
    const d = make({ perform: jest.fn(async () => { throw makeApiError('notFound'); }) });
    await runSubmitReport(newGuard(), { postId: 'p1', reason: 'spam', note: '' }, d);
    expect(d.hide).toHaveBeenCalledWith('p1');
    expect(d.close).toHaveBeenCalledTimes(1);
    expect(d.onError).not.toHaveBeenCalled();
  });

  it('keeps the sheet open on a failure and lets the member retry', async () => {
    const fail = jest.fn().mockRejectedValueOnce(makeApiError('network')).mockResolvedValueOnce(undefined);
    const d = make({ perform: fail });
    const g = newGuard();
    await runSubmitReport(g, { postId: 'p1', reason: 'spam', note: '' }, d);
    expect(d.close).not.toHaveBeenCalled();
    expect(d.hide).not.toHaveBeenCalled();
    await runSubmitReport(g, { postId: 'p1', reason: 'spam', note: '' }, d);
    expect(d.close).toHaveBeenCalledTimes(1);
  });

  it('does not hide or close after a reset', async () => {
    const d = make({ isCurrent: () => false });
    await runSubmitReport(newGuard(), { postId: 'p1', reason: 'spam', note: '' }, d);
    expect(d.hide).not.toHaveBeenCalled();
    expect(d.close).not.toHaveBeenCalled();
  });

  it('offers exactly the six frozen reasons, each with copy', () => {
    expect(REPORT_REASON_ORDER).toHaveLength(6);
    expect([...REPORT_REASON_ORDER].sort()).toEqual(Object.keys(COMMUNITY_COPY.reportReasons).sort());
    expect(REPORT_REASON_ORDER[5]).toBe('other');
  });
});

describe('runMute', () => {
  it('mutes the member, then says so', () => {
    const calls: string[] = [];
    runMute('m1', { mute: (id) => calls.push(`mute:${id}`), notify: (m) => calls.push(`notify:${m}`) });
    expect(calls).toEqual(['mute:m1', `notify:${COMMUNITY_COPY.muteDone}`]);
  });

  it('does not announce a mute that threw', () => {
    const notify = jest.fn();
    expect(() => runMute('m1', { mute: () => { throw new Error('x'); }, notify })).toThrow();
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('closeOnce', () => {
  it('navigates back once, however many times it is asked', () => {
    const latch = { closed: false };
    const nav = jest.fn();
    closeOnce(latch, nav);
    closeOnce(latch, nav);
    expect(nav).toHaveBeenCalledTimes(1);
  });

  it('does nothing once the screen has gone (a backdrop tap while a report was in flight)', () => {
    const latch = { closed: true };
    const nav = jest.fn();
    closeOnce(latch, nav);
    expect(nav).not.toHaveBeenCalled();
  });
});

describe('threadListPlan', () => {
  it('keeps loaded posts on screen when a later page fails, with a retry footer', () => {
    expect(threadListPlan({ status: 'error', count: 20, hasMore: true })).toMatchObject({
      footerRetry: true,
      canLoadMore: false,
    });
  });

  it('shows the full-screen error only when there is nothing to show', () => {
    expect(threadListPlan({ status: 'error', count: 0, hasMore: false })).toMatchObject({
      emptyStatus: 'error',
      footerRetry: false,
    });
  });

  it('shows the spinner, not the retry button, while the retry is in flight', () => {
    expect(threadListPlan({ status: 'error', count: 20, hasMore: true, fetchingMore: true })).toMatchObject({
      footerRetry: false,
      footerSpinner: true,
    });
    expect(threadListPlan({ status: 'success', count: 20, hasMore: true, fetchingMore: true }).footerSpinner).toBe(true);
    expect(threadListPlan({ status: 'success', count: 20, hasMore: true }).footerSpinner).toBe(false);
  });

  it('offers loading more again once the retry succeeded (status back to success)', () => {
    expect(threadListPlan({ status: 'success', count: 40, hasMore: true })).toMatchObject({
      footerRetry: false,
      canLoadMore: true,
    });
  });

  it('reads an empty success as the empty thread, and loads more only when there is more', () => {
    expect(threadListPlan({ status: 'success', count: 0, hasMore: false }).emptyStatus).toBe('empty');
    expect(threadListPlan({ status: 'success', count: 5, hasMore: true }).canLoadMore).toBe(true);
    expect(threadListPlan({ status: 'success', count: 5, hasMore: false }).canLoadMore).toBe(false);
  });
});

describe('postBusy', () => {
  it('disables every own post while a delete runs, and others only for the one in flight', () => {
    expect(postBusy({ isMine: true, postId: 'a', busyPostId: 'b' })).toBe(true);
    expect(postBusy({ isMine: false, postId: 'a', busyPostId: 'b' })).toBe(false);
    expect(postBusy({ isMine: false, postId: 'b', busyPostId: 'b' })).toBe(true);
    expect(postBusy({ isMine: true, postId: 'a', busyPostId: null })).toBe(false);
  });
});

describe('openOnce', () => {
  it('opens the report sheet once until the latch is released', () => {
    const latch = { open: false };
    const open = jest.fn();
    expect(openOnce(latch, open)).toBe(true);
    expect(openOnce(latch, open)).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);
    latch.open = false;
    expect(openOnce(latch, open)).toBe(true);
  });
});

describe('previewReview and waitCopy', () => {
  it('flags only text that is allowed but held for review', () => {
    expect(previewReview('يا كافر')).toBe(true);
    expect(previewReview('جزاكم الله خيرًا')).toBe(false);
    expect(previewReview('https://x.com')).toBe(false);
    expect(previewReview('')).toBe(false);
  });

  it('words a cooldown in seconds and the hourly cap as a sentence', () => {
    expect(waitCopy({ kind: 'cooldown', ms: 2100 })).toBe('يمكنك المشاركة مجددًا بعد ٣ ثوانٍ');
    expect(waitCopy({ kind: 'hourly', ms: 5000 })).toBe(COMMUNITY_COPY.hourlyLimit);
  });
});
