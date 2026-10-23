/**
 * Tablets show the Sections root as a tile grid (acceptance A1); phones keep
 * the ListRowCard column untouched. Column counts and padding maths are
 * covered by responsiveTablet.test.ts; this pins the wiring and the tile.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';

import { SectionTile } from '../components/khazain/primitives/SectionTile';
import { listRowAccessibilityLabel } from '../constants/rtlContracts';

// SectionTile is called as a plain function below, outside a renderer, so its
// one hook is pinned to the default-scale rule.
jest.mock('@/hooks/useLineClamp', () => {
  const actual = jest.requireActual('@/hooks/useLineClamp');
  return { ...actual, useLineClamp: (lines: number) => actual.lineClampFor(lines, 1) };
});

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Sections screen wiring', () => {
  const src = read('app/(tabs)/sections/index.tsx');

  it('builds the tablet grid from the shared reading grid and column maths', () => {
    expect(src).toMatch(/grid: \{ \.\.\.READING_GRID, gap: GRID_GAP \}/);
    expect(src).toMatch(/gridItemWidth\(width, sectionGridColumns\(width\)\)/);
  });

  it('pads the grid and the blocks above it with the inset-aware tablet padding', () => {
    expect(src).toMatch(/tabletGutterPadding\(width, sideInsets\)/);
    expect(src).toMatch(/\[styles\.headerBlock, pad\]/);
    expect(src).toMatch(/\[styles\.searchBlock, pad\]/);
    expect(src).toMatch(/\[styles\.grid, pad\]/);
    expect(src).not.toMatch(/paddingHorizontal: gutter/);
  });

  it('keeps the phone column and skeleton and adds the tile path', () => {
    expect(src).toMatch(/<ListRowCard/);
    expect(src).toMatch(/<SkeletonRibbonList count=\{9\}/);
    expect(src).toMatch(/<SectionTile/);
    expect(src).toMatch(/<SkeletonTileGrid/);
    expect(src).toMatch(/isTablet \? \[styles\.grid, pad\] : styles\.list/);
  });
});

describe('SectionTile', () => {
  const src = read('components/khazain/primitives/SectionTile.tsx');

  it('takes its geometry from CARD_DENSITY, not literals', () => {
    expect(src).toMatch(/width: CARD_DENSITY\.sectionIconDisc,/);
    expect(src).toMatch(/borderRadius: CARD_DENSITY\.sectionCardRadius,/);
    expect(src).toMatch(/borderRadius: CARD_DENSITY\.sectionIconDisc \/ 2,/);
  });

  it('centres its text in RTL', () => {
    expect(src).toMatch(/textAlign: 'center'/);
    expect(src).toMatch(/writingDirection: 'rtl'/);
  });

  it('is a button labelled like the list row for the same entry', () => {
    const el = SectionTile({
      title: 'القرآن',
      subtitle: 'المصحف',
      count: '114 سورة',
      icon: null,
      onPress: () => {},
    }) as React.ReactElement<{ accessibilityRole: string; accessibilityLabel: string }>;
    expect(el.props.accessibilityRole).toBe('button');
    expect(el.props.accessibilityLabel).toBe(
      listRowAccessibilityLabel({ title: 'القرآن', subtitle: 'المصحف', count: '114 سورة' }),
    );
  });
});
