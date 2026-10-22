import * as fs from 'fs';
import * as path from 'path';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import {
  groupView,
  monotonic,
  ownDaysMet,
  ownKhatm,
  visibleTotals,
  type ReporterEntry,
} from '@/services/community/progressMath';
import type { Challenge, GroupProgress } from '@/types/community';

const r = (memberId: string, shareMyProgress: boolean, pagesCovered = 0, daysMet = 0): ReporterEntry => ({
  memberId,
  shareMyProgress,
  pagesCovered,
  daysMet,
});

describe('visibleTotals (differencing rule, design §6)', () => {
  it('is null with the viewer, 2 sharers and 1 non-sharer', () => {
    const reports = [r('me', false, 10), r('a', true, 50), r('b', true, 60), r('c', false, 40)];
    expect(visibleTotals(reports, 'me')).toBeNull();
  });

  it('is null with sharers only and with nobody else', () => {
    expect(visibleTotals([r('me', false, 10), r('a', true, 50)], 'me')).toBeNull();
    expect(visibleTotals([r('me', false, 10)], 'me')).toBeNull();
    expect(visibleTotals([], 'me')).toBeNull();
  });

  it('returns totals with the viewer and 2 non-sharers', () => {
    const reports = [r('me', false, 20, 1), r('a', false, 33, 2), r('b', false, 58, 3)];
    expect(visibleTotals(reports, 'me')).toEqual({ pages: 110, daysMet: 10 });
  });

  it("never counts the viewer's own shareMyProgress toward the threshold", () => {
    // Viewer is a non-sharer and so is one other: still only 1 besides the viewer.
    expect(visibleTotals([r('me', false, 5), r('a', false, 5)], 'me')).toBeNull();
    // Flipping the viewer's own flag changes nothing either way.
    const withTwo = (viewerShares: boolean) => [
      r('me', viewerShares, 5),
      r('a', false, 5),
      r('b', false, 5),
    ];
    expect(visibleTotals(withTwo(true), 'me')).toEqual(visibleTotals(withTwo(false), 'me'));
    expect(visibleTotals(withTwo(true), 'me')).not.toBeNull();
  });

  it('sums over all reporters, sharers included', () => {
    const reports = [r('me', false, 0), r('a', true, 100), r('b', false, 30), r('c', false, 30)];
    expect(visibleTotals(reports, 'me')).toEqual({ pages: 160, daysMet: 0 });
  });

  it('rounds each sum to the nearest 10 (14 -> 10, 15 -> 20)', () => {
    const mk = (pages: number, days: number) => [
      r('me', false, 0, 0),
      r('a', false, pages, days),
      r('b', false, 0, 0),
    ];
    expect(visibleTotals(mk(14, 14), 'me')).toEqual({ pages: 10, daysMet: 10 });
    expect(visibleTotals(mk(15, 15), 'me')).toEqual({ pages: 20, daysMet: 20 });
  });
});

describe('ownKhatm', () => {
  it('caps the covered pages at 604', () => {
    const pages = Array.from({ length: 604 }, (_, i) => i + 1);
    expect(ownKhatm([...pages, 605]).pagesCovered).toBe(604);
    expect(ownKhatm([3, 4]).pagesCovered).toBe(2);
  });
});

describe('ownDaysMet', () => {
  const row = (local_day: string, pages_read: number) => ({
    local_day,
    pages_read,
    wird_target_at_day: 5,
    wird_completed: 0,
  });

  it('counts only rows inside [startsOn, startsOn + days) that reach pagesPerDay', () => {
    const rows = [
      row('2026-10-19', 9), // before the window
      row('2026-10-20', 5), // met
      row('2026-10-21', 4), // short
      row('2026-10-22', 8), // met
      row('2026-10-23', 5), // day 4 of 3: outside
    ];
    expect(ownDaysMet(rows, 5, '2026-10-20', 3)).toBe(2);
  });

  it('handles a window that crosses a month end', () => {
    const rows = [row('2026-10-31', 5), row('2026-11-01', 5), row('2026-11-02', 5)];
    expect(ownDaysMet(rows, 5, '2026-10-31', 2)).toBe(2);
  });
});

describe('monotonic (C7)', () => {
  it('keeps the max of each field', () => {
    expect(monotonic({ pagesCovered: 40, daysMet: 3 }, { pagesCovered: 12, daysMet: 5 })).toEqual({
      pagesCovered: 40,
      daysMet: 5,
    });
  });

  it('treats a missing last report as zero', () => {
    expect(monotonic(null, { pagesCovered: 2, daysMet: 1 })).toEqual({ pagesCovered: 2, daysMet: 1 });
  });
});

describe('groupView', () => {
  const khatm: Challenge = { id: 'c1', groupId: 'g', title: 't', startsOn: '2026-10-20', createdBy: 'm', kind: 'khatm' };
  const wird: Challenge = { ...khatm, kind: 'daily-wird', pagesPerDay: 5, days: 10 };
  const progress = (totals: GroupProgress['totals']): GroupProgress => ({ reporters: 3, totals, shared: [] });

  it('hides totals with the community copy when the server sent none', () => {
    expect(groupView(progress(null), 4, khatm)).toEqual({
      totalsVisible: false,
      copy: COMMUNITY_COPY.totalsHidden,
    });
  });

  it('caps the khatm bar at 1 and passes the server pages through', () => {
    const v = groupView(progress({ pages: 700, daysMet: 0 }), 4, khatm);
    expect(v).toEqual({ totalsVisible: true, fraction: 1, pages: 700 });
  });

  it('scales the khatm bar by 604', () => {
    const v = groupView(progress({ pages: 302, daysMet: 0 }), 4, khatm);
    expect(v).toMatchObject({ totalsVisible: true, fraction: 0.5 });
  });

  it('divides daily-wird days by memberCount x days and clamps', () => {
    expect(groupView(progress({ pages: 0, daysMet: 20 }), 4, wird)).toMatchObject({ fraction: 0.5 });
    expect(groupView(progress({ pages: 0, daysMet: 90 }), 4, wird)).toMatchObject({ fraction: 1 });
    expect(groupView(progress({ pages: 0, daysMet: 5 }), 0, wird)).toMatchObject({ fraction: 0 });
  });

  it('never recomputes totals on the client', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'services/community/progressMath.ts'), 'utf8');
    const from = src.indexOf('export function groupView');
    const next = src.indexOf('\nexport ', from + 1);
    const body = src.slice(from, next === -1 ? undefined : next);
    expect(body).not.toMatch(/reduce|shared|reports|\+=/);
  });
});
