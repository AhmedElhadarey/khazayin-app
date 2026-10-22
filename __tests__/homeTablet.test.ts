import * as fs from 'fs';
import * as path from 'path';

import { clampFocus, nearestSlot, resolveWrap } from '@/components/khazain/home/dawahLayout';
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
  it('sets flexGrow on its content container (wiring scan)', () => {
    expect(read('components/khazain/primitives/RtlCarousel.tsx')).toContain('flexGrow');
  });
});

describe('Dawah wrap maths', () => {
  // wrapped = [clone(last), r1, r2, r3, clone(first)] -> real slots 1..3
  const centres = [50, 150, 250, 350, 450];

  it('picks the slot nearest the middle of the viewport', () => {
    expect(nearestSlot(centres, 100, 200, 1)).toBe(1); // focus 200 -> 150/250 tie -> first
    expect(nearestSlot(centres, 160, 200, 1)).toBe(2); // focus 260
  });

  it('ignores unmeasured slots and falls back when none are measured', () => {
    const sparse: (number | undefined)[] = [];
    sparse[3] = 350;
    expect(nearestSlot(sparse, 0, 200, 1)).toBe(3);
    expect(nearestSlot([], 0, 200, 1)).toBe(1);
  });

  it('jumps from a clone to its real twin', () => {
    expect(resolveWrap(0, 1, 3)).toEqual({ focus: 3, jumpTo: 3 });
    expect(resolveWrap(4, 1, 3)).toEqual({ focus: 1, jumpTo: 1 });
  });

  it('does not jump when a real slot is focused', () => {
    expect(resolveWrap(2, 1, 3)).toEqual({ focus: 2 });
  });

  it('clamps a remembered focus onto a real slot', () => {
    expect(clampFocus(5, 1, 3)).toBe(3);
    expect(clampFocus(0, 1, 3)).toBe(1);
    expect(clampFocus(2, 1, 3)).toBe(2);
    expect(clampFocus(2, 1, 0)).toBe(1);
  });
});

describe('Home screen wiring', () => {
  const src = read('app/(tabs)/index.tsx');

  it('uses the tablet rows and the capped Dawah stage', () => {
    expect(src).toContain('homeTabletRows(HOME_SECTION_ORDER)');
    expect(src).toContain('dawahStageWidth(width)');
  });

  it('passes fill to exactly the two tablet hero cells', () => {
    expect(src.match(/<Hero(Quran|Prophet)[^>]*\bfill\b/g)).toHaveLength(2);
  });

  it('puts homeColumnStyle on the ScrollView content container', () => {
    expect(src).toMatch(/contentContainerStyle=\{\[[^\]]*homeColumnStyle[^\]]*\]\}/s);
  });
});
