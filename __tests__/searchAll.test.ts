import { BOOKS } from '@/data/content/books';
import { BOOK_LECTURES, PROPHET_LECTURES, QUEEN_LECTURES, RADIO_PROGRAMS } from '@/data/content/lectures';
import { SURAHS } from '@/data/content/quran';
import { SCHOLARS } from '@/data/content/scholars';
import { searchAll } from '@/services/search/searchAll';
import type { Lecture } from '@/types/content';

const lectures: Lecture[] = [...PROPHET_LECTURES, ...BOOK_LECTURES, ...QUEEN_LECTURES, ...RADIO_PROGRAMS];
const corpus = { surahs: SURAHS, scholars: SCHOLARS, books: BOOKS, lectures };
const run = (query: string) => searchAll({ query, ...corpus });

describe('searchAll', () => {
  it('returns nothing for a blank query', () => {
    expect(run('')).toEqual([]);
    expect(run('   ')).toEqual([]);
  });

  it('groups in the order سور → علماء → كتب → محاضرات and omits empty groups', () => {
    expect(run('شرح').map((g) => g.type)).toEqual(['book', 'lecture']);
    const types = run('ا').map((g) => g.type);
    expect(types).toEqual(['surah', 'scholar', 'book', 'lecture'].filter((t) => types.includes(t as never)));
  });

  it('finds a surah typed without hamza, with taa marbuta as ha', () => {
    expect(run('ال عمران').find((x) => x.type === 'surah')?.items.map((s) => s.id)).toContain('003');
    expect(run('الفاتحه')[0]).toMatchObject({ type: 'surah' });
  });

  it('finds a surah typed with tashkeel', () =>
    expect(run('البَقَرَة').find((x) => x.type === 'surah')?.items[0].id).toBe('002'));

  it('finds a surah by its Arabic-Indic number', () =>
    expect(run('٢').find((x) => x.type === 'surah')?.items[0].id).toBe('002'));

  it('finds ابن باز and إبن تيمية among scholars', () => {
    expect(run('ابن باز').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s4');
    expect(run('إبن تيمية').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s11');
  });

  it('finds الألباني typed as الالباني', () =>
    expect(run('الالباني').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s8'));

  it('known gap: "العثيمين" misses lectures credited to "ابن عثيمين" (no article folding)', () => {
    expect(run('العثيمين').find((x) => x.type === 'lecture')).toBeUndefined();
    expect(run('عثيمين').find((x) => x.type === 'lecture')?.items.length).toBeGreaterThan(0);
  });

  it('caps surahs at 8 and lectures at 12', () => {
    expect(run('سورة').find((g) => g.type === 'surah')?.items.length).toBe(8);
    const bigLectures = Array.from({ length: 30 }, (_, i) => ({ ...lectures[0], id: `x${i}` }));
    const g = searchAll({ ...corpus, lectures: bigLectures, query: lectures[0].title })
      .find((x) => x.type === 'lecture');
    expect(g?.items.length).toBe(12);
  });

  it('runs well inside the 300ms budget on the whole local corpus', () => {
    const t0 = Date.now();
    for (let i = 0; i < 20; i += 1) run('عبد');
    expect((Date.now() - t0) / 20).toBeLessThan(100); // ms per search, loose for slow CI
  });
});
