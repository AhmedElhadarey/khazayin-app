/**
 * The «أنتِ ملكة» card, rebuilt from the layers of frame 2812:1392 (361 x 96,
 * r16): gradient ground, watermark, crown art, calligraphy emblem, live copy
 * and its own المزيد target.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { QueenCard } from '@/components/khazain/home/QueenCard';
import { KhazainColors } from '@/constants/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => {
    root: { findAll: (p: (n: any) => boolean) => any[] };
  };
};

function mount(onPress?: () => void, onMore?: () => void) {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<QueenCard onPress={onPress} onMore={onMore} />);
  });
  const host = tree.root.findAll((n) => typeof n.props.onLayout === 'function')[0];
  act(() => {
    host.props.onLayout({ nativeEvent: { layout: { width: 361, height: 96 } } });
  });
  return tree;
}

const flat = (n: any) => StyleSheet.flatten(n.props.style) ?? {};
const text = (tree: any, match: (s: string) => boolean) =>
  tree.root.findAll(
    (n: any) => n.type === 'Text' && typeof n.props.children === 'string' && match(n.props.children),
  )[0];

describe('QueenCard', () => {
  it('paints the file’s horizontal cream gradient ground', () => {
    const tree = mount();
    const g = tree.root.findAll((n: any) => Array.isArray(n.props.colors))[0];
    expect(g.props.colors).toEqual(['#EDE0D1', '#F1E8DD', '#EDE0D1']);
    expect(g.props.locations[1]).toBeCloseTo(0.5529, 3);
    expect(g.props.start).toEqual({ x: 0, y: 0.5 });
    expect(g.props.end).toEqual({ x: 1, y: 0.5 });
  });

  it('keeps watermark, crown art and emblem as separate layers (no flattened card)', () => {
    const tree = mount();
    // The renderer reports an Image at several tree levels; one box per layer.
    const boxes = new Map<string, any>();
    tree.root
      .findAll((n: any) => n.props.contentFit === 'fill' && n.props.source !== undefined)
      .forEach((n: any) => boxes.set(`${flat(n).left}|${flat(n).width}`, flat(n)));
    expect(boxes.size).toBe(3);
    const [watermark, crown, emblem] = [...boxes.values()];
    expect([watermark.left, watermark.width]).toEqual([276, 85]);
    expect(crown.left).toBe(0);
    expect(crown.width).toBeCloseTo(298.79, 1);
    expect(emblem.left).toBe(294);
    expect(emblem.top).toBe(6);
    expect(emblem.width).toBeCloseTo(54.57, 2);
    expect(emblem.height).toBeCloseTo(82.47, 2);
  });

  it('sets the title live in navy with a 2 x 15 gold bar at its trailing edge', () => {
    const tree = mount();
    const title = text(tree, (t) => t === 'أنتِ ملكة');
    expect(flat(title).color).toBe(KhazainColors.navy);
    const bar = tree.root.findAll(
      (n: any) => n.type === 'View' && flat(n).width === 2 && flat(n).height === 15,
    )[0];
    expect(flat(bar).backgroundColor).toBe(KhazainColors.goldCalligraphy);
    expect(flat(bar).borderRadius).toBe(4);
  });

  it('sets the body live in the queen-body brown, right-aligned', () => {
    const body = text(mount(), (t) => t.startsWith('مَلِكةٌ'));
    expect(flat(body).color).toBe('#B07F4B');
    expect(flat(body).textAlign).toBe('right');
  });

  it('casts the file’s shadow: #000 25%, 4 blur, 4 down', () => {
    const tree = mount();
    const s = flat(tree.root.findAll((n: any) => n.type === 'View')[0]);
    expect(s.shadowColor).toBe('#000');
    expect(s.shadowOpacity).toBeCloseTo(0.25, 2);
    expect(s.shadowRadius).toBe(4);
    expect(s.shadowOffset).toEqual({ width: 0, height: 4 });
    expect(s.elevation).toBe(4);
  });

  it('gives المزيد its own target, separate from the card', () => {
    const onPress = jest.fn();
    const onMore = jest.fn();
    const tree = mount(onPress, onMore);
    const more = tree.root.findAll(
      (n: any) => n.props.accessibilityLabel === 'المزيد' && typeof n.props.onPress === 'function',
    )[0];
    act(() => more.props.onPress());
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    const card = tree.root.findAll(
      (n: any) => n.props.accessibilityLabel === 'أنتِ ملكة' && typeof n.props.onPress === 'function',
    )[0];
    act(() => card.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
