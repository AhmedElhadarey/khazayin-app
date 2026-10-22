import { sectionState } from '@/services/recommendations/sectionState';
import type { CatalogueStatus } from '@/services/recommendations/types';

const rec = { key: 'book:b1' };
const base = {
  hasSignals: false,
  activityResolved: false,
  catalogueStatus: 'idle' as CatalogueStatus,
  items: [] as readonly unknown[],
};

describe('sectionState (design §6.5)', () => {
  it.each([
    [base, 'skeletonOne'],
    [{ ...base, activityResolved: true }, 'hint'],
    [{ ...base, hasSignals: true, catalogueStatus: 'loading' as const }, 'skeletonFull'],
    [{ ...base, hasSignals: true, catalogueStatus: 'idle' as const }, 'skeletonFull'],
    [{ ...base, hasSignals: true, catalogueStatus: 'ready' as const, items: [rec] }, 'items'],
    [{ ...base, hasSignals: true, catalogueStatus: 'ready' as const }, 'empty'],
    [{ ...base, hasSignals: true, catalogueStatus: 'aborted' as const }, 'empty'],
  ])('sectionState(%o) → %s', (input, expected) => expect(sectionState(input)).toBe(expected));

  it('items win even before activity resolves', () =>
    expect(sectionState({ ...base, hasSignals: true, items: [rec] })).toBe('items'));
});
