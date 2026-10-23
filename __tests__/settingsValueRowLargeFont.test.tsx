/**
 * Settings «هدف الورد اليومي» at 320dp x font scale 1.7 (Android): the value
 * column does not shrink and grew to its 140 cap once unclamped, so the title
 * column was left one glyph wide and the title ran down the card a letter per
 * line. No frame covers enlarged text; the contract is the neighbouring
 * `ListRowCard variant="more"` rows: at a large scale the value stacks under
 * the title in the full-width column. The default scale keeps the frame's
 * trailing value column (2102:2711).
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { SettingsValueRow } from '@/components/khazain/settings/SettingsValueRow';
import { CARD_DENSITY } from '@/constants/layout';

let mockFontScale = 1;
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.spyOn(require('react-native'), 'useWindowDimensions').mockImplementation(() => ({
  width: 320,
  height: 640,
  scale: 2,
  fontScale: mockFontScale,
}));

type Node = { type: unknown; props: Record<string, any>; parent: Node | null; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

const TITLE = 'هدف الورد اليومي';
const VALUE = '١٠ صفحات';
const render = (fontScale: number) => {
  mockFontScale = fontScale;
  let r!: { root: Node };
  act(() => {
    r = create(<SettingsValueRow title={TITLE} value={VALUE} icon={null} onPress={() => {}} />);
  });
  return r;
};
const text = (r: { root: Node }, s: string) => r.root.findAll((n) => n.type === Text && n.props.children === s)[0];
const column = (n: Node) => {
  let p = n.parent;
  while (p && p.type !== 'View') p = p.parent;
  return p!;
};
const flat = (n: Node) => (StyleSheet.flatten(n.props.style) ?? {}) as Record<string, any>;

describe('SettingsValueRow', () => {
  it('keeps the trailing value column at the default scale', () => {
    const r = render(1);
    expect(column(text(r, VALUE))).not.toBe(column(text(r, TITLE)));
    expect(text(r, TITLE).props.numberOfLines).toBe(1);
    expect(text(r, VALUE).props.numberOfLines).toBe(1);
  });

  it('stacks the value under the title in the full-width column when text is enlarged', () => {
    const r = render(1.7);
    const col = column(text(r, TITLE));
    expect(column(text(r, VALUE))).toBe(col);
    expect(flat(col).flex).toBe(1);
    expect(flat(col).minWidth).toBe(0);
    // Nothing beside the title refuses to shrink with the value in it.
    expect(r.root.findAll((n) => n.type === 'View' && flat(n).flexShrink === 0 && n.findAll((c) => c === text(r, VALUE)).length > 0)).toHaveLength(0);
    expect(text(r, TITLE).props.numberOfLines).toBeUndefined();
    expect(text(r, VALUE).props.numberOfLines).toBeUndefined();
    expect(flat(text(r, VALUE)).maxWidth).toBeUndefined();
  });

  it('has the inset of the rows beside it, inside the 82 at the default scale', () => {
    const r = render(1);
    const card = r.root.findAll((n) => typeof n.props.style === 'function')[0];
    const st = StyleSheet.flatten(card.props.style({ pressed: false })) as Record<string, any>;
    expect(st.paddingVertical).toBe(CARD_DENSITY.moreCardPaddingVertical);
    expect(CARD_DENSITY.moreChipSize + 2 * st.paddingVertical + 2 * st.borderWidth).toBeLessThanOrEqual(st.minHeight);
  });

  it('reads title then value either way', () => {
    for (const s of [1, 1.7]) {
      const r = render(s);
      expect(r.root.findAll((n) => n.props.accessibilityLabel === `${TITLE}، ${VALUE}`).length).toBeGreaterThan(0);
    }
  });
});
