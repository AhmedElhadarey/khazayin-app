import * as fs from 'fs';
import * as path from 'path';

import { HOME_SECTION_ORDER, homeTabletRows } from '@/constants/homePresentation';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('homeTabletRows', () => {
  it('merges the two heroes and queen + chips, preserving order', () => {
    expect(homeTabletRows(HOME_SECTION_ORDER)).toEqual([
      'header',
      ['quranHero', 'prophetHero'],
      'scholars',
      'books',
      ['queen', 'quickChips'],
      'dawah',
    ]);
  });

  it('keeps every section exactly once', () => {
    const flat = homeTabletRows(HOME_SECTION_ORDER).flat();
    expect([...flat]).toEqual([...HOME_SECTION_ORDER]);
  });

  it('leaves an order without a pair untouched', () => {
    expect(homeTabletRows(['header', 'dawah'])).toEqual(['header', 'dawah']);
  });
});

describe('RtlCarousel', () => {
  it('grows its content to the viewport so short rows anchor to the right', () => {
    expect(read('components/khazain/primitives/RtlCarousel.tsx')).toMatch(/flexGrow:\s*1/);
  });
});

describe('DawahCarousel', () => {
  const src = read('components/khazain/home/DawahCarousel.tsx');

  it('takes a stageWidth prop and uses the window only as its default', () => {
    expect(src).toMatch(/stageWidth\?:\s*number/);
    const uses = src.match(/windowWidth/g) ?? [];
    // declaration + default only
    expect(uses.length).toBeLessThanOrEqual(2);
  });

  it('does not write refs during render or key an effect on the window', () => {
    expect(src).not.toMatch(/\}, \[[^\]]*windowWidth[^\]]*\]\)/);
  });
});

describe('Home screen', () => {
  const src = read('app/(tabs)/index.tsx');

  it('only uses READING_ROW behind isTablet and passes stageWidth', () => {
    expect(src).toMatch(/READING_ROW/);
    expect(src).toMatch(/isTablet/);
    expect(src).toMatch(/stageWidth=\{dawahStageWidth\(width\)\}/);
    expect(src).toMatch(/homeTabletRows\(HOME_SECTION_ORDER\)/);
  });
});
