import { svgAspect } from '@/components/khazain/home/svgAspect';
import {
  SCHOLAR_SVG_1,
  SCHOLAR_SVG_2,
  SCHOLAR_SVG_3,
} from '@/components/khazain/home/scholarSvgs';

const FALLBACK = 71 / 179;

describe('svgAspect', () => {
  it('reads the ratio from viewBox', () => {
    expect(svgAspect('<svg viewBox="0 0 179 71"/>', FALLBACK)).toBeCloseTo(71 / 179, 6);
  });

  it('accepts a comma-separated viewBox', () => {
    expect(svgAspect('<svg viewBox="0,0,152,62"/>', FALLBACK)).toBeCloseTo(62 / 152, 6);
  });

  it('falls back to width and height when viewBox is absent', () => {
    expect(svgAspect('<svg width="100" height="50"/>', FALLBACK)).toBeCloseTo(0.5, 6);
  });

  it('returns the fallback rather than dividing by zero', () => {
    expect(svgAspect('<svg viewBox="0 0 0 0"/>', FALLBACK)).toBe(FALLBACK);
    expect(svgAspect('<svg/>', FALLBACK)).toBe(FALLBACK);
  });

  it('gives each bundled scholar SVG its own ratio', () => {
    // she5-1 is 152x62 and the other two are 179x71. Sizing all three from the
    // 179x71 ratio compressed the first card's calligraphy by 2.8%.
    expect(svgAspect(SCHOLAR_SVG_1, FALLBACK)).toBeCloseTo(62 / 152, 4);
    expect(svgAspect(SCHOLAR_SVG_2, FALLBACK)).toBeCloseTo(71 / 179, 4);
    expect(svgAspect(SCHOLAR_SVG_3, FALLBACK)).toBeCloseTo(71 / 179, 4);
    expect(svgAspect(SCHOLAR_SVG_1, FALLBACK)).not.toBeCloseTo(71 / 179, 4);
  });
});
