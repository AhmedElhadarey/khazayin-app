/**
 * Large-font behaviour of the More / Sections list rows (ListRowCard), found by the Android screen matrix at 320dp x font scale 1.7
 * (docs/audit/screen-matrix/2026-10-23T15-15-54):
 *
 *  - titles ellipsized (`قنوات الواتسا...`, `العلماء والم...`) or silently lost
 *    their last letter (`الموقع الإلكترون`) instead of wrapping;
 *  - the bottom of the last line's descenders was clipped, because Android 14+
 *    scales `lineHeight` non-linearly (a larger sp value grows less), so at a
 *    large font scale the line box is shorter than the glyphs and the TextView
 *    clips them to its own bounds;
 *
 * Every fix must leave the default-scale render identical, so the box sums are
 * checked against the heights the file states.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ListRowCard } from '@/components/khazain/primitives/ListRowCard';
import { CARD_DENSITY } from '@/constants/layout';
import { TEXT_ROLES } from '@/constants/typography';

type Node = {
  parent: Node | null;
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
  findAll: (p: (n: Node) => boolean) => Node[];
};
type Renderer = { root: Node; unmount: () => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => Renderer;
};

const render = (el: React.ReactElement) => {
  let r!: Renderer;
  act(() => {
    r = create(el);
  });
  return r;
};
const flat = (n: Node) =>
  (StyleSheet.flatten(typeof n.props.style === 'function' ? n.props.style({ pressed: false }) : n.props.style) ??
    {}) as Record<string, any>;
const textNode = (r: Renderer, s: string) => r.root.findAll((n) => n.type === Text && n.props.children === s)[0];
const pressable = (r: Renderer) => r.root.findAll((n) => typeof n.props.style === 'function')[0];

const TITLE = 'قنوات الواتساب';
const SUBTITLE = 'القنوات الأصلية';
const COUNT = '١٥٦ حلقة';

describe.each(['more', 'section', 'archive'] as const)('ListRowCard variant=%s at a large font scale', (variant) => {
  const r = render(
    <ListRowCard
      variant={variant}
      icon={null}
      title={TITLE}
      subtitle={SUBTITLE}
      count={variant === 'more' ? undefined : COUNT}
      onPress={() => {}}
    />,
  );

  it('wraps the title to a second line instead of truncating it', () => {
    expect(textNode(r, TITLE).props.numberOfLines).toBe(2);
  });

  it('keeps the subtitle to one ellipsized line', () => {
    expect(textNode(r, SUBTITLE).props.numberOfLines).toBe(1);
  });

  it('grows with its text: minHeight, never a fixed height', () => {
    const card = flat(pressable(r));
    expect(card.minHeight).toBeGreaterThan(0);
    expect(card.height).toBeUndefined();
  });

  it('gives the title a full-width column (Android 15 shrink-wrap)', () => {
    const col = flat(textNode(r, TITLE).parent as Node);
    expect(col.flex).toBe(1);
    expect(col.minWidth).toBe(0);
    expect(col.alignItems).toBe('stretch');
    expect(col.alignSelf).toBe('stretch');
    // Stretched to the card's height, so it must re-centre its lines itself.
    expect(col.justifyContent).toBe('center');
    expect(flat(textNode(r, TITLE)).alignSelf).not.toBe('flex-end');
    expect(flat(textNode(r, TITLE)).textAlign).toBe('right');
  });

  it('leaves room under every line for descenders without moving the layout', () => {
    const texts = [TITLE, SUBTITLE, ...(variant === 'more' ? [] : [COUNT])];
    for (const s of texts) {
      const st = flat(textNode(r, s));
      expect(st.paddingBottom).toBeGreaterThan(0);
      // The slack is cancelled by the margin, so the row measures exactly as
      // it did before: no change at the default scale.
      expect(st.paddingBottom + st.marginBottom).toBe(0);
    }
  });
});

describe('the More card keeps its 82 at the default scale', () => {
  const r = render(<ListRowCard variant="more" icon={null} title={TITLE} subtitle={SUBTITLE} />);
  it('has a vertical inset for when the text grows, small enough to stay inside the 82', () => {
    const card = flat(pressable(r));
    expect(card.minHeight).toBe(CARD_DENSITY.moreCardHeight);
    expect(card.paddingVertical).toBeGreaterThan(0);
    const content = 2 * TEXT_ROLES.bodyCompact.lineHeight;
    expect(content + 2 * card.paddingVertical + 2 * card.borderWidth).toBeLessThanOrEqual(
      CARD_DENSITY.moreCardHeight,
    );
  });
});
