/**
 * A standalone bookmark is its own screen-reader element (the Home cards, the
 * dawah posters, a saved lecture row), so a bare «إزالة من المحفوظات» did not
 * say WHAT it removes, and a list of them could not be told apart. The label
 * names the item, as the recommendation dismiss and recent-search remove do.
 * Row-level custom actions keep the bare copy: the row already names the item.
 */
import { SAVED_COPY, bookmarkLabel } from '@/services/savedToggle';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('bookmarkLabel', () => {
  it.each([
    [{ type: 'surah', name: 'البقرة', displayNumber: '٢', meta: '' }, 'البقرة'],
    [{ type: 'scholar', name: 'ابن باز' }, 'ابن باز'],
    [{ type: 'book', title: 'زاد المعاد' }, 'زاد المعاد'],
    [{ type: 'lecture', title: 'شرح كتاب التوحيد', scholar: 'ابن باز', duration: '', category: 'book' }, 'شرح كتاب التوحيد'],
    [{ type: 'dawah', title: 'الصدقة', body: '', tone: 'navy' }, 'الصدقة'],
  ] as const)('names the %o item', (snapshot, name) => {
    expect(bookmarkLabel(false, snapshot as never)).toBe(`${SAVED_COPY.saveLabel}: ${name}`);
    expect(bookmarkLabel(true, snapshot as never)).toBe(`${SAVED_COPY.unsaveLabel}: ${name}`);
  });

  it('falls back to the bare copy when the snapshot has no name', () => {
    expect(bookmarkLabel(true, { type: 'book', title: '' })).toBe(SAVED_COPY.unsaveLabel);
  });
});
