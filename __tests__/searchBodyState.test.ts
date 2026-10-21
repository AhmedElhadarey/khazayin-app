import { searchBodyState } from '@/services/search/searchBodyState';

describe('searchBodyState', () => {
  const base = { query: 'باز', resultCount: 0, status: 'empty' as const, corpusLoading: false };
  it('is idle for a blank query', () => expect(searchBodyState({ ...base, query: '  ' })).toBe('idle'));
  it('shows results whenever there are any, even while loading more', () =>
    expect(searchBodyState({ ...base, resultCount: 2, status: 'success', corpusLoading: true })).toBe('results'));
  it('shows loading, not "no results", while the corpus is still loading', () =>
    expect(searchBodyState({ ...base, corpusLoading: true })).toBe('loading'));
  it('shows no-results once settled and empty', () => expect(searchBodyState(base)).toBe('no-results'));
  it('renders nothing during the debounce window when nothing is known yet', () =>
    expect(searchBodyState({ ...base, status: 'searching' })).toBe('pending'));
});
