import fs from 'fs';
import path from 'path';
import { TAB_BAR, TAB_PHYSICAL_ORDER } from '@/constants/layout';
import { tabItemStyle, tabRowColumn } from '@/constants/responsive';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/primitives/CustomTabBar.tsx'),
  'utf8',
);

describe('tab bar Figma parity (GLOBAL-05..09)', () => {
  it('tints the active icon gold, keeps the active label cream', () => {
    expect(TAB_BAR.activeIcon).toBe('#C1A584');
    expect(TAB_BAR.activeInk).toBe('#F1E7DD');
    expect(src).toMatch(/active \? TAB_BAR\.activeIcon : TAB_BAR\.inactiveInk/);
  });

  it('draws inactive icons and labels at full opacity', () => {
    expect(TAB_BAR.inactiveInk).toBe('#F1E7DD');
  });

  it('uses the 24pt controls-row corner radius', () => {
    expect(TAB_BAR.cornerRadius).toBe(24);
    expect(src).toMatch(/borderTopLeftRadius: TAB_BAR\.cornerRadius/);
    expect(src).toMatch(/borderTopRightRadius: TAB_BAR\.cornerRadius/);
  });

  it('straddles the indicator 2pt above the pill', () => {
    expect(TAB_BAR.indicatorTop).toBe(-2);
    expect(src).toMatch(/top: TAB_BAR\.indicatorTop/);
  });

  it('files phone items at 16pt padding, space-between, content-sized', () => {
    expect(TAB_BAR.phonePaddingHorizontal).toBe(16);
    expect(TAB_BAR.inactiveItemMinWidth).toBe(42);
    expect(TAB_BAR.activeItemPaddingHorizontal).toBe(12);
    expect(src).toMatch(/paddingHorizontal: TAB_BAR\.phonePaddingHorizontal/);
    expect(src).toMatch(/minWidth: TAB_BAR\.inactiveItemMinWidth/);
    expect(src).toMatch(/paddingHorizontal: TAB_BAR\.activeItemPaddingHorizontal/);
    expect(src).toMatch(/justifyContent: 'space-between'/);
  });

  it('keeps a 44pt touch width on a 42pt item', () => {
    const slop = TAB_BAR.touchSlopHorizontal;
    expect(TAB_BAR.inactiveItemMinWidth + 2 * slop).toBeGreaterThanOrEqual(44);
    expect(src).toMatch(/hitSlop=/);
  });

  it('keeps the physical order and PHYSICAL_ROW', () => {
    expect([...TAB_PHYSICAL_ORDER]).toEqual(['more', 'sections', 'library', 'index']);
    expect(src).toMatch(/\.\.\.PHYSICAL_ROW/);
  });

  it('leaves tablet geometry unchanged', () => {
    expect(tabItemStyle(834)).toEqual({ maxWidth: 96 });
    expect(tabItemStyle(393)).toBeUndefined();
    expect(tabRowColumn(393, { left: 0, right: 0 })).toBeUndefined();
    expect(TAB_BAR.itemWidth).toBe(67);
  });
});
