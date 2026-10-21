import { DAWAH_MONTHS, DAWAH_POSTERS } from '../dawah';

/** Figma nodes 2120:942 (month list) and 2120:1857 (Shawwal → Ramadan). */
describe('Dawah month list', () => {
  it('lists the six reference months in order', () => {
    expect(DAWAH_MONTHS.map((m) => m.id)).toEqual([
      'ramadan-shawwal',
      'rabi1-rabi2',
      'muharram-safar',
      'dhul-qadah-dhul-hijjah',
      'shawwal-dhul-qadah',
      'shawwal-ramadan',
    ]);
  });

  it('reproduces the reference titles and counts', () => {
    expect(DAWAH_MONTHS.map((m) => [m.title, m.count])).toEqual([
      ['من رمضان إلى شوال', '٥ تخطيط'],
      ['من ربيع الأول إلى ربيع الآخر', '٩ تخطيط'],
      ['من محرم إلى صفر', '٨ تخطيط'],
      ['من ذو القعدة إلى ذو الحجة', '٧ تخطيط'],
      ['من شوال إلى ذو القعدة', '٦ تخطيط'],
      ['من شوال إلى رمضان', '٤ تخطيط'],
    ]);
  });

  it('has unique month slugs', () => {
    expect(new Set(DAWAH_MONTHS.map((m) => m.id)).size).toBe(DAWAH_MONTHS.length);
  });
});

describe('Dawah poster coverage', () => {
  const postersFor = (month: string) =>
    DAWAH_POSTERS.filter((p) => (p.month ?? '') === month);

  it('gives every declared month at least one poster', () => {
    // The audit found months routing to an empty state because no poster
    // carried their slug.
    DAWAH_MONTHS.forEach((month) => {
      expect([month.id, postersFor(month.id).length > 0]).toEqual([month.id, true]);
    });
  });

  it('files every poster under a month that exists', () => {
    const slugs = new Set<string>(DAWAH_MONTHS.map((m) => m.id));
    DAWAH_POSTERS.forEach((poster) => {
      expect([poster.id, slugs.has(poster.month ?? '')]).toEqual([poster.id, true]);
    });
  });

  it('resolves shawwal-ramadan to the four reference rows', () => {
    const posters = postersFor('shawwal-ramadan');
    expect(posters).toHaveLength(4);
    posters.forEach((poster) => {
      expect(poster.title).toBe('دعاء ليلة القدر');
    });
  });

  it('does not confuse shawwal-ramadan with ramadan-shawwal', () => {
    // Two distinct months whose slugs are reverses of one another. The audit
    // found the title and the data key disagreeing across this pair.
    const a = DAWAH_MONTHS.find((m) => m.id === 'shawwal-ramadan');
    const b = DAWAH_MONTHS.find((m) => m.id === 'ramadan-shawwal');
    expect(a?.title).toBe('من شوال إلى رمضان');
    expect(b?.title).toBe('من رمضان إلى شوال');
    expect(postersFor('shawwal-ramadan').map((p) => p.id)).not.toEqual(
      postersFor('ramadan-shawwal').map((p) => p.id),
    );
  });

  it('has unique poster ids', () => {
    expect(new Set(DAWAH_POSTERS.map((p) => p.id)).size).toBe(DAWAH_POSTERS.length);
  });
});
