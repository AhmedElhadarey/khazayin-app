import { TAB_PHYSICAL_ORDER } from '@/constants/layout';
import {
  TABLET_MIN_WIDTH,
  TABLET_TAB_GAP,
  TABLET_TAB_ITEM,
  responsiveLayout,
  tabBarRow,
} from '@/constants/responsive';

const { TABLET_MIN_DP } = require('../plugins/withTabletRotation');

describe('responsiveLayout', () => {
  it('measures a tablet with a right inset symmetrically', () => {
    // Landscape iPad: 1076 window, 44 right inset -> side 44 both ways, 988 available.
    const l = responsiveLayout(1076, 768, { left: 0, right: 44 });
    expect(l.width).toBe(988);
    expect(l.height).toBe(768);
    expect(l.isTablet).toBe(true);
    expect(l.gutter).toBe(24);
    expect(l.reading.width).toBe(720);
    // (988 - 720) / 2 = 134, plus the 44 side inset.
    expect(l.reading.inset).toBe(44 + 134);
    // The column insets its content by side borders from the window edge.
    expect(l.columnStyle.borderRightWidth).toBe(l.reading.inset);
    expect(l.columnStyle.borderLeftWidth).toBe(l.reading.inset);
    // Home: (988 - 940) / 2 = 24, plus the 44 side inset.
    expect(l.homeColumnStyle.borderRightWidth).toBe(44 + 24);
    expect(l.homeColumnStyle.borderLeftWidth).toBe(44 + 24);
    expect(l.splitPane).toEqual({ side: 340, gap: 24 });
  });

  it('measures a phone inset from the window edge too', () => {
    const plain = responsiveLayout(393, 852, { left: 0, right: 0 });
    expect(plain.isTablet).toBe(false);
    expect(plain.reading).toEqual({ width: 361, inset: 16 });
    expect(plain.columnStyle).toEqual({});
    expect(plain.splitPane).toBeNull();

    const notched = responsiveLayout(400, 852, { left: 0, right: 10 });
    expect(notched.width).toBe(380);
    expect(notched.sideInsets).toEqual({ left: 10, right: 10 });
    expect(notched.reading.inset).toBe(10 + 16);
  });

  it('turns asymmetric insets into symmetric side insets and column borders', () => {
    // RTL swaps left/right style keys, so both sides must carry the same value.
    const l = responsiveLayout(1076, 768, { left: 12, right: 44 });
    expect(l.sideInsets).toEqual({ left: 44, right: 44 });
    expect(l.columnStyle.borderLeftWidth).toBe(l.columnStyle.borderRightWidth);
    expect(l.columnStyle.borderLeftWidth).toBe(44 + 134);
    expect(l.homeColumnStyle.borderLeftWidth).toBe(l.homeColumnStyle.borderRightWidth);
    const mirrored = responsiveLayout(1076, 768, { left: 44, right: 12 });
    expect(mirrored.sideInsets).toEqual(l.sideInsets);
    expect(mirrored.reading).toEqual(l.reading);
  });

  it('subtracts the symmetric side from both edges of the width', () => {
    expect(responsiveLayout(700, 500, { left: 20, right: 30 }).width).toBe(640);
  });
});

describe('tabBarRow', () => {
  it('derives its width from the tab count', () => {
    const n = TAB_PHYSICAL_ORDER.length;
    expect(n).toBe(4);
    expect(tabBarRow(1024).maxWidth).toBe(n * TABLET_TAB_ITEM + (n - 1) * TABLET_TAB_GAP);
  });
});

describe('plugin / app constants', () => {
  it('uses the same tablet threshold in the Android plugin and in JS', () => {
    expect(TABLET_MIN_DP).toBe(TABLET_MIN_WIDTH);
  });
});
