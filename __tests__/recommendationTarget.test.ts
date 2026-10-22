import { bookDetailHref } from '@/services/bookDetail';
import { recommendationTarget } from '@/services/recommendations/target';
import type { Recommendation } from '@/services/recommendations/types';
import type { Lecture } from '@/types/content';

const lecture = { id: 'l1', title: 'تفسير' } as unknown as Lecture;
const lectureRec: Recommendation = {
  kind: 'lecture',
  key: 'lecture:l1',
  entityId: 'l1',
  title: 'تفسير',
  meta: '',
  reason: '',
  score: 1,
  lecture,
  scholarId: 's5',
};
const scholarRec: Recommendation = {
  kind: 'scholar',
  key: 'scholar:s9',
  entityId: 's9',
  title: 'شيخ',
  meta: '',
  reason: '',
  score: 1,
  scholarId: 's9',
};
const bookRec: Recommendation = {
  kind: 'book',
  key: 'book:bk2',
  entityId: 'bk2',
  title: 'كتاب',
  meta: '',
  reason: '',
  score: 1,
};

describe('recommendationTarget (design §6.6)', () => {
  it('Home plays a lecture and routes the rest', () => {
    expect(recommendationTarget(lectureRec, 'home')).toEqual({ kind: 'play', lecture });
    expect(recommendationTarget(scholarRec, 'home')).toEqual({ kind: 'route', href: '/sections/scholar/s9' });
    expect(recommendationTarget(bookRec, 'home')).toEqual({ kind: 'route', href: bookDetailHref('bk2') });
  });

  it('the Mushaf never plays', () => {
    expect(recommendationTarget(lectureRec, 'mushaf')).toEqual({ kind: 'route', href: '/sections/scholar/s5' });
    expect(recommendationTarget({ ...lectureRec, scholarId: undefined }, 'mushaf')).toBeNull();
  });

  it('the Mushaf routes a scholar to its page', () => {
    expect(recommendationTarget(scholarRec, 'mushaf')).toEqual({ kind: 'route', href: '/sections/scholar/s9' });
  });

  it('the Mushaf routes a book to its detail screen', () => {
    expect(recommendationTarget(bookRec, 'mushaf')).toEqual({ kind: 'route', href: bookDetailHref('bk2') });
  });
});
