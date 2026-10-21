import { isCorpusLoading } from '@/services/loadState';

describe('isCorpusLoading', () => {
  it('is true while any store is idle or loading', () => {
    expect(isCorpusLoading(['success', 'loading'])).toBe(true);
    expect(isCorpusLoading(['idle', 'success'])).toBe(true);
  });
  it('is false once every store settled, including empty and error', () =>
    expect(isCorpusLoading(['success', 'empty', 'error'])).toBe(false));
});
