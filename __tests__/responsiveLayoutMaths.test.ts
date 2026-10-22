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
  it('measures a tablet with a right inset from the window edge', () => {
    // Landscape iPad: 1076 window, 44 right inset -> 1032 available.
    const l = responsiveLayout(1076, 768, { left: 0, right: 44 });
    expect(l.width).toBe(1032);
    expect(l.height).toBe(768);
    expect(l.isTablet).toBe(true);
    expect(l.gutter).toBe(24);
    expect(l.reading.width).toBe(720);
    // (1032 - 720) / 2 = 156, plus the 44 inset.
    expect(l.reading.inset).toBe(44 + 156);
    expect(l.columnStyle.marginRight).toBe(44);
    expect(l.columnStyle.marginLeft).toBe(0);
    expect(l.homeColumnStyle.marginRight).toBe(44);
    expect(l.splitPane).toEqual({ side: 340, gap: 24 });
  });

  it('measures a phone inset from the window edge too', () => {
    const plain = responsiveLayout(393, 852, { left: 0, right: 0 });
    expect(plain.isTablet).toBe(false);
    expect(plain.reading).toEqual({ width: 361, inset: 16 });
    expect(plain.columnStyle).toEqual({});
    expect(plain.splitPane).toBeNull();

    const notched = responsiveLayout(400, 852, { left: 0, right: 10 });
    expect(notched.width).toBe(390);
    expect(notched.reading.inset).toBe(10 + 16);
  });

  it('subtracts both insets from the width', () => {
    expect(responsiveLayout(700, 500, { left: 20, right: 30 }).width).toBe(650);
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
