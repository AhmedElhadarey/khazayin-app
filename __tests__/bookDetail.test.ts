import { BOOK_DETAIL_SECTIONS } from '@/constants/bookDetailPresentation';
import { bookDetailHref, resolveBookDetail } from '@/services/bookDetail';
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
  it('is cover, meta, then the primary action', () =>
    expect(BOOK_DETAIL_SECTIONS).toEqual(['cover', 'meta', 'primaryAction']));
});
