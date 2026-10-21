import { BOOK_DETAIL_SECTIONS } from '@/constants/bookDetailPresentation';
import { bookDetailBody, bookDetailHref, bookPrimaryAction, resolveBookDetail } from '@/services/bookDetail';
import type { Book, Lecture } from '@/types/content';

const lecture = (id: string, title: string, scholar: string): Lecture =>
  ({ id, title, scholar, duration: '٤٠ دقيقة', category: 'book' });

const SHARH = [
  lecture('b1', 'شرح رياض الصالحين', 'الشيخ ابن عثيمين'),
  lecture('b2', 'تفسير آيات الأحكام', 'الشيخ صالح الفوزان'),
];

describe('bookDetailHref', () => {
  it('builds the sections book route', () => expect(bookDetailHref('bk2')).toBe('/sections/book/bk2'));
});

describe('resolveBookDetail', () => {
  it('links the sharh when titles are identical', () => {
    const books: Book[] = [{ id: 'bk1', title: 'شرح رياض الصالحين' }];
    const d = resolveBookDetail('bk1', books, SHARH);
    expect(d).toEqual({ id: 'bk1', title: 'شرح رياض الصالحين', author: 'الشيخ ابن عثيمين', lecture: SHARH[0] });
  });

  it('links across taa marbuta, hamza and tashkeel differences', () => {
    // 'رياض الصالحين' with tashkeel + ة→ه would not match by ===; normalize must make it match.
    const books: Book[] = [
      { id: 'a', title: 'شَرْحُ رِيَاضِ الصَّالِحِينَ' },
      { id: 'b', title: 'تفسير ايات الاحكام' },          // no hamza
    ];
    expect(resolveBookDetail('a', books, SHARH)?.lecture?.id).toBe('b1');
    expect(resolveBookDetail('b', books, SHARH)?.lecture?.id).toBe('b2');
  });

  it('leaves lecture and author undefined when no sharh matches', () => {
    const books: Book[] = [{ id: 'bk6', title: 'فقه العبادات' }];
    expect(resolveBookDetail('bk6', books, SHARH)).toEqual({ id: 'bk6', title: 'فقه العبادات', author: undefined, lecture: undefined });
  });

  it('returns null for an unknown id, including a book-lecture id', () => {
    const books: Book[] = [{ id: 'bk1', title: 'شرح رياض الصالحين' }];
    expect(resolveBookDetail('nope', books, SHARH)).toBeNull();
    expect(resolveBookDetail('b1', books, SHARH)).toBeNull(); // only Book ids open this screen (R7)
  });
});

describe('book detail section order', () => {
  // Changed deliberately (contextual notes): a 'notes' section follows the primary action.
  it('is cover, meta, the primary action, then notes', () =>
    expect(BOOK_DETAIL_SECTIONS).toEqual(['cover', 'meta', 'primaryAction', 'notes']));
});

describe('bookDetailBody', () => {
  it('shows the book whenever it resolved, even if a refresh then failed (stale-while-error)', () =>
    expect(bookDetailBody({ found: true, booksStatus: 'error' })).toBe('book'));
  it('offers a retry, not "unavailable", when the books failed to load', () =>
    expect(bookDetailBody({ found: false, booksStatus: 'error' })).toBe('error'));
  it('shows a placeholder while the books are still loading', () => {
    expect(bookDetailBody({ found: false, booksStatus: 'loading' })).toBe('loading');
    expect(bookDetailBody({ found: false, booksStatus: 'idle' })).toBe('loading');
  });
  it('says the book is unavailable only once the books settled without it', () => {
    expect(bookDetailBody({ found: false, booksStatus: 'success' })).toBe('missing');
    expect(bookDetailBody({ found: false, booksStatus: 'empty' })).toBe('missing');
  });
});

describe('bookPrimaryAction', () => {
  it('plays when a sharh is linked', () =>
    expect(bookPrimaryAction({ hasLecture: true, lecturesStatus: 'loading' })).toBe('play'));
  it('does not claim "no audio" while the sharh list is still loading', () => {
    expect(bookPrimaryAction({ hasLecture: false, lecturesStatus: 'loading' })).toBe('loading');
    expect(bookPrimaryAction({ hasLecture: false, lecturesStatus: 'idle' })).toBe('loading');
  });
  it('says "no audio" once the sharh list settled without a match', () =>
    expect(bookPrimaryAction({ hasLecture: false, lecturesStatus: 'success' })).toBe('none'));
  it('offers a retry, not "no audio", when the sharh list failed to load', () =>
    expect(bookPrimaryAction({ hasLecture: false, lecturesStatus: 'error' })).toBe('error'));
  it('still plays a linked sharh after a later refresh failed', () =>
    expect(bookPrimaryAction({ hasLecture: true, lecturesStatus: 'error' })).toBe('play'));
});
