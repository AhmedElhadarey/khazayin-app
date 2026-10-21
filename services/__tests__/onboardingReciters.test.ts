import { ONBOARDING_POPULAR_RECITER_IDS } from '@/constants/settings';
import { RECITERS } from '@/data/content/quran';
import { selectOnboardingReciters } from '@/services/onboardingReciters';
import type { Reciter } from '@/types/content';

const r = (id: string): Reciter => ({ id, name: id, style: 'murattal', styleLabel: 'x' });

describe('selectOnboardingReciters', () => {
  it('returns the curated ids in curated order', () => {
    expect(
      selectOnboardingReciters([r('a'), r('b'), r('c')], ['c', 'a'], 'c').map((x) => x.id),
    ).toEqual(['c', 'a']);
  });
  it('skips curated ids the data source lacks', () => {
    expect(selectOnboardingReciters([r('a')], ['z', 'a'], 'a').map((x) => x.id)).toEqual(['a']);
  });
  it('appends the current selection when it is not curated (e.g. default r7, no preview)', () => {
    expect(selectOnboardingReciters([r('a'), r('b')], ['a'], 'b').map((x) => x.id)).toEqual([
      'a',
      'b',
    ]);
  });
  it('falls back to the first 6 when no curated id exists', () => {
    const all = ['1', '2', '3', '4', '5', '6', '7'].map(r);
    expect(selectOnboardingReciters(all, ['x'], 'none').map((x) => x.id)).toEqual([
      '1', '2', '3', '4', '5', '6',
    ]);
  });
  it('returns [] for no data (AsyncContent shows its empty state)', () => {
    expect(selectOnboardingReciters([], ['a'], 'a')).toEqual([]);
  });
  it('the shipped curated list resolves fully against the mock catalogue', () => {
    const out = selectOnboardingReciters(RECITERS, ONBOARDING_POPULAR_RECITER_IDS, 'r7');
    expect(out.slice(0, ONBOARDING_POPULAR_RECITER_IDS.length).map((x) => x.id)).toEqual([
      ...ONBOARDING_POPULAR_RECITER_IDS,
    ]);
  });
});
