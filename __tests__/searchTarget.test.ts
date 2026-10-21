import { BOOKS } from '@/data/content/books';
import { BOOK_LECTURES } from '@/data/content/lectures';
import { SURAHS } from '@/data/content/quran';
import { SCHOLARS } from '@/data/content/scholars';
import { normalizeSurahParam } from '@/services/mushafNavigation';
import { createSearchTargetRunner, searchTargetFor, type SearchTarget } from '@/services/search/searchTarget';

describe('searchTargetFor', () => {
  it('opens the Mushaf reader on the tapped surah', () => {
    const t = searchTargetFor({ type: 'surah', items: [SURAHS[1]] }, SURAHS[1]);
    expect(t).toEqual({ kind: 'route', href: '/sections/mushaf?surah=002' });
    const param = new URLSearchParams((t as { href: string }).href.split('?')[1]).get('surah');
    expect(normalizeSurahParam(param)).toBe('002');
  });

  it('opens the scholar detail', () =>
    expect(searchTargetFor({ type: 'scholar', items: [SCHOLARS[3]] }, SCHOLARS[3]))
      .toEqual({ kind: 'route', href: '/sections/scholar/s4' }));

  it('opens the book detail, not the Books list', () =>
    expect(searchTargetFor({ type: 'book', items: [BOOKS[1]] }, BOOKS[1]))
      .toEqual({ kind: 'route', href: '/sections/book/bk2' }));

  it('plays a lecture through the single playback path', () =>
    expect(searchTargetFor({ type: 'lecture', items: [BOOK_LECTURES[0]] }, BOOK_LECTURES[0]))
      .toEqual({ kind: 'play', lecture: BOOK_LECTURES[0] }));
});

describe('createSearchTargetRunner', () => {
  function harness() {
    const log: string[] = [];
    const run = createSearchTargetRunner({
      dismissTo: (h) => log.push(`dismissTo ${h}`),
      dismiss: () => log.push('dismiss'),
      play: (l) => log.push(`play ${l.id}`),
    });
    return { log, run };
  }
  const route: SearchTarget = { kind: 'route', href: '/sections/book/bk2' };

  it('leaves search with a single dismissTo for a route — no back + push', () => {
    const { log, run } = harness();
    expect(run(route)).toBe(true);
    expect(log).toEqual(['dismissTo /sections/book/bk2']);
  });

  it('dismisses search before starting playback', () => {
    const { log, run } = harness();
    run({ kind: 'play', lecture: BOOK_LECTURES[0] });
    expect(log).toEqual(['dismiss', 'play b1']);
  });

  it('ignores a second tap during the transition', () => {
    const { log, run } = harness();
    run(route);
    expect(run({ kind: 'play', lecture: BOOK_LECTURES[0] })).toBe(false);
    expect(log).toEqual(['dismissTo /sections/book/bk2']);
  });
});
