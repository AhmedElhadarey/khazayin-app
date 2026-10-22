/**
 * Tablets show the Sections root as a tile grid (acceptance A1); phones keep
 * the ListRowCard column untouched. Column counts are covered by
 * responsiveTablet.test.ts; this pins the wiring and the tile's contract.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';

import { SectionTile, sectionsTabletPadding } from '../components/khazain/primitives/SectionTile';
import { listRowAccessibilityLabel } from '../constants/rtlContracts';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Sections screen wiring', () => {
  const src = read('app/(tabs)/sections/index.tsx');

  it('builds the tablet grid from the shared reading grid and column maths', () => {
    expect(src).toMatch(/READING_GRID/);
    expect(src).toMatch(/sectionGridColumns/);
    expect(src).toMatch(/gridItemWidth/);
    expect(src).toMatch(/GRID_GAP/);
  });

  it('keeps the phone path and adds the tile path behind isTablet', () => {
    expect(src).toMatch(/isTablet/);
    expect(src).toMatch(/<ListRowCard/);
    expect(src).toMatch(/<SectionTile/);
    expect(src).toMatch(/<SkeletonRibbonList count=\{9\}/);
    expect(src).toMatch(/<SkeletonTileGrid/);
  });
});

describe('SectionTile', () => {
  const src = read('components/khazain/primitives/SectionTile.tsx');

  it('takes its geometry from CARD_DENSITY, not literals', () => {
    expect(src).toMatch(/CARD_DENSITY\.sectionIconDisc/);
    expect(src).toMatch(/CARD_DENSITY\.sectionCardRadius/);
    expect(src).not.toMatch(/\b64\b/);
    expect(src).not.toMatch(/borderRadius:\s*20\b/);
  });

  it('centres its text in RTL', () => {
    expect(src).toMatch(/textAlign:\s*'center'/);
    expect(src).toMatch(/writingDirection:\s*'rtl'/);
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

describe('tablet side padding', () => {
  it('adds the side safe-area insets to the gutter', () => {
    expect(sectionsTabletPadding(24, { left: 0, right: 0 })).toEqual({
      paddingLeft: 24,
      paddingRight: 24,
    });
    expect(sectionsTabletPadding(24, { left: 47, right: 12 })).toEqual({
      paddingLeft: 71,
      paddingRight: 36,
    });
  });

  it('is applied to the grid, skeleton and header blocks, not a bare gutter', () => {
    const src = read('app/(tabs)/sections/index.tsx');
    expect(src).toMatch(/useSafeAreaInsets\(\)/);
    expect(src).toMatch(/sectionsTabletPadding\(gutter, insets\)/);
    expect(src).not.toMatch(/paddingHorizontal: gutter/);
  });
});
