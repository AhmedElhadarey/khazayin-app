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

// Every render names its font scale (the jest Dimensions mock would report 2).
// The renders run while the describes are collected, so the spy is set here.
let mockFontScale = 1;
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.spyOn(require('react-native'), 'useWindowDimensions').mockImplementation(() => ({
  width: 320,
  height: 640,
  scale: 2,
  fontScale: mockFontScale,
}));

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

const LARGE = 1.7;
const render = (el: React.ReactElement, fontScale = 1) => {
  mockFontScale = fontScale;
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

describe.each(['more', 'section', 'archive'] as const)('ListRowCard variant=%s at the default font scale', (variant) => {
  const r = render(
    <ListRowCard variant={variant} icon={null} title={TITLE} subtitle={SUBTITLE} onPress={() => {}} />,
  );

  // Two lines, not one: at the default scale every title fits one, and the
  // section copy needs the second line for its subtitle.
  it('clamps the title and the subtitle to two lines', () => {
    expect(textNode(r, TITLE).props.numberOfLines).toBe(2);
    expect(textNode(r, SUBTITLE).props.numberOfLines).toBe(2);
  });
});

describe.each(['more', 'section', 'archive'] as const)('ListRowCard variant=%s at a large font scale (1.7)', (variant) => {
  const r = render(
    <ListRowCard
      variant={variant}
      icon={null}
      title={TITLE}
      subtitle={SUBTITLE}
      count={variant === 'more' ? undefined : COUNT}
      onPress={() => {}}
    />,
    LARGE,
  );

  // A clamp that overflows drops letters on Android 15 with no ellipsis
  // («الموقع الإلكترون»), so enlarged text is not clamped at all.
  it('does not clamp the title: it wraps as far as it needs instead of truncating', () => {
    expect(textNode(r, TITLE).props.numberOfLines).toBeUndefined();
  });

  // The section copy («تلاوات وتفسير وتدبر القرآن الكريم», «شروحات الكتب
  // الإسلامية المهمة») is longer than a 360dp text column even at the default
  // scale, and at 320dp x 1.7 the More one-liners lost words too («القنوات
  // الأصلي.»), so at a large scale no variant's subtitle is clamped.
  it('does not clamp the subtitle either', () => {
    expect(textNode(r, SUBTITLE).props.numberOfLines).toBeUndefined();
    expect(flat(textNode(r, SUBTITLE)).textAlign).toBe('right');
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

/**
 * GLOBAL-15: Android section cards measured 99.2 against the frame's 96 (DIV-43,
 * node 2031:6073, 361 x 96). The frame's text column DIV-48 is title 24, 4,
 * subtitle (2 + 20 in the file, 21 here with the Arabic leading floor), 1,
 * count 18: 68, which is exactly the card's minHeight less its vertical inset.
 * The type roles stay as they are; the margins between them absorb the floor.
 */
describe.each(['section', 'archive'] as const)('ListRowCard variant=%s fills its stated height at the default scale', (variant) => {
  const r = render(
    <ListRowCard variant={variant} icon={null} title={TITLE} subtitle={SUBTITLE} count={COUNT} onPress={() => {}} />,
  );
  const box = (s: string) => {
    const st = flat(textNode(r, s));
    return (
      st.lineHeight +
      (st.marginTop ?? 0) +
      (st.marginBottom ?? 0) +
      (st.paddingTop ?? 0) +
      (st.paddingBottom ?? 0)
    );
  };

  it('title + subtitle + count + the margins between them = minHeight - 2 x paddingVertical', () => {
    const card = flat(pressable(r));
    const column = box(TITLE) + box(SUBTITLE) + box(COUNT);
    const inner = card.minHeight - 2 * (card.paddingVertical + (card.borderWidth ?? 0));
    expect(column).toBe(68);
    expect(column).toBe(inner);
  });

  it('keeps the type roles: 24 title, 21 subtitle, 18 count', () => {
    expect(flat(textNode(r, TITLE)).lineHeight).toBe(TEXT_ROLES.sectionTitle.lineHeight);
    expect(flat(textNode(r, SUBTITLE)).lineHeight).toBe(TEXT_ROLES.cardTitle.lineHeight);
    expect(flat(textNode(r, COUNT)).lineHeight).toBe(TEXT_ROLES.label.lineHeight);
    expect([TEXT_ROLES.sectionTitle.lineHeight, TEXT_ROLES.cardTitle.lineHeight, TEXT_ROLES.label.lineHeight]).toEqual([
      24, 21, 18,
    ]);
  });
});
