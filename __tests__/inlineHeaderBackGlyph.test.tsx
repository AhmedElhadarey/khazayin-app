/**
 * InlineHeader back arrow (Figma `vuesax/bulk/arrow-right`, 2001:15037, 65
 * instances): inkTitle, 4pt from the title, 20pt box top-aligned with the 28pt
 * title line (8..28 in the 44 row at scale 1) and following the line centre as
 * the capped font scale grows it.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { InlineHeader } from '@/components/khazain/primitives/InlineHeader';
import { KhazainColors } from '@/constants/theme';
import { CHROME_MAX_FONT_SCALE, TEXT_ROLES } from '@/constants/typography';

let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
}));
jest.mock('@/components/khazain/icons/FigmaIcon', () => {
  const R = require('react');
  return { FigmaIcon: (p: object) => R.createElement('FigmaIcon', p) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => {
    root: { findAll: (p: (n: any) => boolean) => any[] };
    unmount: () => void;
  };
};

const LINE = TEXT_ROLES.bodyLarge.lineHeight;

function measure(fontScale: number) {
  mockFontScale = fontScale;
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<InlineHeader title="عنوان" onBack={() => {}} />);
  });
  const all = tree.root.findAll(() => true);
  const touch = all.find((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string');
  const icon = all.find((n) => n.type === 'FigmaIcon');
  const title = all.find((n) => n.props.numberOfLines === 1 && typeof n.type === 'string');
  // The icon's nearest host View ancestor is its wrapper.
  let wrapper = icon.parent;
  while (wrapper && typeof wrapper.type !== 'string') wrapper = wrapper.parent;
  const touchStyle: any = StyleSheet.flatten(touch.props.style);
  const wrapStyle: any = StyleSheet.flatten(wrapper?.props.style);
  const out = {
    touchStyle,
    wrapStyle,
    iconProps: { ...icon.props },
    titleProps: { ...title.props },
  };
  act(() => tree.unmount());
  return out;
}

describe('InlineHeader back arrow', () => {
  it('at scale 1: 44 row, gap 4, icon box 8..28 in inkTitle', () => {
    const m = measure(1);
    expect(m.touchStyle.minHeight).toBe(44);
    expect(m.touchStyle.gap).toBe(4);
    const top = m.touchStyle.paddingVertical + (m.wrapStyle.marginTop ?? 0);
    expect(top).toBe(8);
    expect(m.iconProps.size).toBe(20);
    expect(m.iconProps.color).toBe(KhazainColors.inkTitle);
    expect(m.iconProps.mirrored).toBeFalsy();
  });

  it('caps the title at the chrome scale, and the icon follows the capped line', () => {
    const m = measure(1.7);
    expect(m.titleProps.maxFontSizeMultiplier).toBe(CHROME_MAX_FONT_SCALE);
    const line = LINE * Math.min(1.7, CHROME_MAX_FONT_SCALE);
    const titleTop = m.touchStyle.paddingVertical;
    const iconTop = titleTop + (m.wrapStyle.marginTop ?? 0);
    // scale-1 relation: icon centre sits 4pt above the title line centre
    const expected = (titleTop + line / 2) - 4;
    expect(Math.abs(iconTop + 10 - expected)).toBeLessThanOrEqual(1);
  });
});
