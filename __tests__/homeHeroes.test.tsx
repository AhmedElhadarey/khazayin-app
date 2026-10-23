/**
 * Home hero copy and title bars, pinned against the node graph of
 * docs/KHAZAYIN.fig (frames 2093:1655 Quran, 2007:479 Prophet).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { HeroProphet } from '@/components/khazain/home/HeroProphet';
import { HeroQuran } from '@/components/khazain/home/HeroQuran';
import { KhazainColors } from '@/constants/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => {
    root: { findAll: (p: (n: any) => boolean) => any[] };
    unmount: () => void;
  };
};

/** Mounts the hero at the design width (scale 1) so geometry reads in design units. */
function mount(el: React.ReactElement) {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(el);
  });
  const host = tree.root.findAll((n) => typeof n.props.onLayout === 'function')[0];
  act(() => {
    host.props.onLayout({ nativeEvent: { layout: { width: 361, height: 200 } } });
  });
  return tree;
}

const flat = (n: any) => StyleSheet.flatten(n.props.style) ?? {};
const textNode = (tree: any, match: (s: string) => boolean) =>
  tree.root.findAll(
    (n: any) =>
      n.type === 'Text' &&
      typeof n.props.children === 'string' &&
      match(n.props.children as string),
  )[0];
const bars = (tree: any, width: number, height: number) =>
  tree.root.findAll((n: any) => {
    if (n.type !== 'View') return false;
    const s = flat(n);
    return s.width === width && s.height === height && s.backgroundColor === KhazainColors.navy;
  });

describe('HeroQuran', () => {
  it('sets the subtitle in the gold accent, centred (HOME-07/08)', () => {
    const tree = mount(<HeroQuran />);
    const s = flat(textNode(tree, (t) => t.startsWith('اقْتَرَبَ')));
    expect(s.color).toBe(KhazainColors.goldAccent);
    expect(s.textAlign).toBe('center');
  });

  it('puts the 2 x 26 navy bar at the trailing edge of the title (HOME-09)', () => {
    const tree = mount(<HeroQuran />);
    const [bar] = bars(tree, 2, 26);
    expect(bar).toBeDefined();
    const s = flat(bar);
    expect(s.borderRadius).toBeCloseTo(0.96, 2);
    // The title and bar share a row that pins physical order: [title][bar].
    const title = textNode(tree, (t) => t === 'القرآن حــياة');
    const row = tree.root.findAll(
      (n: any) =>
        n.type === 'View' &&
        flat(n).direction === 'ltr' &&
        flat(n).flexDirection === 'row' &&
        n.findAll((c: any) => c === bar).length > 0 &&
        n.findAll((c: any) => c === title).length > 0,
    )[0];
    expect(row).toBeDefined();
    expect(flat(row).gap).toBeCloseTo(3.83, 2);
    expect(flat(row).alignSelf).toBe('stretch');
  });

  it('keeps the title able to wrap rather than shrink-wrap and clip', () => {
    const tree = mount(<HeroQuran />);
    const s = flat(textNode(tree, (t) => t === 'القرآن حــياة'));
    // Takes the width the bar leaves, and its content is one short word pair.
    expect(s.flexShrink).toBe(1);
    expect(s.flexGrow).toBe(1);
  });
});

describe('HeroProphet', () => {
  it('sets the body in the brown ink token (HOME-11)', () => {
    expect(KhazainColors.inkBrown).toBe('#5F482D');
    const tree = mount(<HeroProphet />);
    const s = flat(textNode(tree, (t) => t.startsWith('وِجهتُك')));
    expect(s.color).toBe(KhazainColors.inkBrown);
  });

  it('puts the 2 x 25 navy bar beside the title image (HOME-10)', () => {
    const tree = mount(<HeroProphet />);
    const [bar] = bars(tree, 2, 25);
    expect(bar).toBeDefined();
    expect(flat(bar).borderRadius).toBeCloseTo(0.96, 2);
  });
});
