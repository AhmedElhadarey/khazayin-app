import { AYAT_BY_SURAH } from '@/data/content/quran';

// The reader draws the basmala itself (SurahCartouche), so ayah text must not
// carry a Tanzil-style prefix; surahs 1 (basmala is ayah 1) and 9 are exempt.
describe('ayah text carries no basmala prefix', () => {
  const entries = Object.entries(AYAT_BY_SURAH).filter(([id]) => id !== '001' && id !== '009');

  it('has at least one non-1/9 surah to check', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('surah %s ayah 1 does not start with «بِسْمِ»', (_id, ayat) => {
    const first = ayat.find((a) => a.number === 1);
    expect(first).toBeDefined();
    expect(first!.text.trimStart().startsWith('بِسْمِ')).toBe(false);
  });
});
