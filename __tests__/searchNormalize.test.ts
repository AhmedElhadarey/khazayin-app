import { match } from '@/services/search/match';
import { normalize } from '@/services/search/normalize';

describe('normalize — Arabic variations', () => {
  it.each([
    ['أحمد', 'احمد'],
    ['إسماعيل', 'اسماعيل'],
    ['القرآن', 'القران'],
    ['ٱلرحمن', 'الرحمن'],
  ])('folds hamza-on-alef %s → %s', (input, out) => expect(normalize(input)).toBe(out));

  it.each([
    ['مسؤول', 'مسءول'],
    ['مسائل', 'مساءل'],
  ])('folds other hamza carriers %s → %s', (input, out) => expect(normalize(input)).toBe(out));

  it('strips tashkeel including shadda and the dagger alef', () => {
    expect(normalize('ٱلرَّحْمَٰنِ')).toBe('الرحمن');
    expect(normalize('سُورَةُ الفَاتِحَةِ')).toBe('سوره الفاتحه');
  });

  it('strips tatweel', () => expect(normalize('الـــلـه')).toBe('الله'));
  it('folds alef maksura to ya', () => expect(normalize('موسى')).toBe('موسي'));
  it('folds taa marbuta to ha', () => expect(normalize('الفاتحة')).toBe('الفاتحه'));
  it('maps Arabic-Indic digits', () => expect(normalize('سورة ١١٤')).toBe('سوره 114'));
  it('lowercases Latin', () => expect(normalize('Quran')).toBe('quran'));
  it('collapses and trims whitespace', () => expect(normalize('  ابن   باز  ')).toBe('بن باز'));

  it('rewrites whole-word ابن / إبن to بن, but not inside ابنة', () => {
    expect(normalize('ابن تيمية')).toBe('بن تيميه');
    expect(normalize('إبن القيم')).toBe('بن القيم');
    expect(normalize('ابنة')).toBe('ابنه');
  });

  it('is idempotent and safe on empty input', () => {
    const once = normalize('إِبْنُ القَيِّمِ الجَوْزِيَّة');
    expect(normalize(once)).toBe(once);
    expect(normalize('')).toBe('');
  });
});

describe('match', () => {
  it('matches a contiguous substring', () =>
    expect(match(normalize('سورة البقرة'), normalize('البقره'))).toBe(true));
  it('matches when every needle token prefixes some haystack token', () =>
    expect(match(normalize('محمد بن صالح العثيمين'), normalize('محمد العث'))).toBe(true));
  it('rejects when one token has no prefix match', () =>
    expect(match(normalize('محمد بن صالح العثيمين'), normalize('محمد الفوزان'))).toBe(false));
  it('rejects empty needle or haystack', () => {
    expect(match('abc', '')).toBe(false);
    expect(match('', 'a')).toBe(false);
  });
});
