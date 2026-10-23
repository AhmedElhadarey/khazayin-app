import { LRI, PDI, isolateLtr } from '@/services/bidi';
import { fromArabicDigits } from '@/constants/progress';
import { withAlpha } from '@/constants/theme';

describe('isolateLtr', () => {
  it('wraps text in LRI...PDI', () => {
    expect(isolateLtr('١٫٠')).toBe(`${LRI}١٫٠${PDI}`);
    expect(LRI).toBe('⁦');
    expect(PDI).toBe('⁩');
  });
});

describe('fromArabicDigits', () => {
  it('maps Arabic-Indic digits', () => {
    expect(fromArabicDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });
  it('maps Persian/Urdu digits U+06F0-06F9', () => {
    expect(fromArabicDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(fromArabicDigits('۱۲')).toBe('12');
  });
});

describe('withAlpha bounds', () => {
  it('accepts 0 and 1', () => {
    expect(withAlpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });
  it.each([-0.1, 1.01, NaN, Infinity])('throws on alpha %p', (a) => {
    expect(() => withAlpha('#000000', a)).toThrow();
  });
});
