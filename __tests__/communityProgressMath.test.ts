import { visibleTotals, type ReporterEntry } from '@/services/community/progressMath';

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
