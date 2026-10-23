/**
 * Home dawah posters and chips against the node graph of docs/KHAZAYIN.fig:
 * the posters are bare images (the PNGs carry their own rounded border), only
 * the centre poster 2132:2193 has a DROP_SHADOW (0, 1.22, blur 1.22, #000 25%).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DawahPoster } from '@/components/khazain/home/DawahPoster';
import { QuickChip } from '@/components/khazain/home/QuickChip';
import { KhazainColors } from '@/constants/theme';

jest.mock('@/components/khazain/primitives', () => ({ BookmarkButton: () => null }));
// The jest Dimensions mock reports fontScale 2, where useLineClamp unclamps.
// This suite pins the default text size, whose clamps are the Figma geometry;
// enlarged-text unclamping is covered by lineClampRows.test.tsx.
jest.mock('@/hooks/useLineClamp', () => {
  const actual = jest.requireActual('@/hooks/useLineClamp');
  return { ...actual, useLineClamp: (lines: number) => actual.lineClampFor(lines, 1) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => {
    root: { findAll: (p: (n: any) => boolean) => any[] };
    toJSON: () => any;
  };
};

const flat = (n: any) => StyleSheet.flatten(n.props.style) ?? {};
/** The Pressable's host view, which carries its resolved style. The poster's
 * outer frame also holds the bookmark, so pick the button, not the first View. */
const press = (tree: any) =>
  tree.root.findAll((n: any) => n.type === 'View' && n.props.accessibilityRole === 'button')[0];

const POSTER = {
  id: 'p',
  tone: '#1A3F62',
  title: 't',
  body: 'b',
  imageSource: 1,
  month: 'ramadan-shawwal',
} as any;

function render(el: React.ReactElement) {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(el);
  });
  return tree;
}

describe('DawahPoster', () => {
  it('is a bare image: no fill once decoded, no radius, no sheen or bevel (HOME-15)', () => {
    const tree = render(<DawahPoster quote={POSTER} />);
    const image = tree.root.findAll((n: any) => n.props.contentFit !== undefined)[0];
    act(() => image.props.onLoad?.({}));
    const s = flat(press(tree));
    expect(s.backgroundColor).toBe('transparent');
    expect(s.borderRadius ?? 0).toBe(0);
    // No sheen gradient, and no bevel (a bordered overlay) over the art.
    expect(tree.root.findAll((n: any) => n.type === LinearGradient)).toHaveLength(0);
    expect(tree.root.findAll((n: any) => flat(n).borderWidth === 1)).toHaveLength(0);
  });

  it('holds a neutral page-colour placeholder only while decoding', () => {
    const tree = render(<DawahPoster quote={POSTER} />);
    expect(flat(press(tree)).backgroundColor).toBe(KhazainColors.pageBg);
  });

  it('carries the file’s 1.22 drop shadow at 25% (HOME-16)', () => {
    const s = flat(press(render(<DawahPoster quote={POSTER} />)));
    expect(s.shadowOffset).toEqual({ width: 0, height: 1.22 });
    expect(s.shadowRadius).toBeCloseTo(1.22, 2);
    expect(s.shadowOpacity).toBeCloseTo(0.25, 2);
    // Android draws a grey band for an elevation shadow over a transparent card
    // (see HeroShell), so the poster states no elevation: iOS-only shadow.
    expect(s.elevation).toBeUndefined();
  });

  it('rasterizes the shadowed poster on iOS so animated slots do not redraw it', () => {
    const tree = render(<DawahPoster quote={POSTER} />);
    expect(press(tree).props.shouldRasterizeIOS).toBe(true);
  });
});

describe('QuickChip', () => {
  it('rounds the chip to 7.5 and the stripe to three quarters of half its height (HOME-21)', () => {
    const tree = render(<QuickChip label="x">{null}</QuickChip>);
    expect(flat(press(tree)).borderRadius).toBe(7.5);
    const stripe = tree.root.findAll(
      (n: any) => n.type === 'View' && flat(n).width === 80 && flat(n).height === 4,
    )[0];
    expect(flat(stripe).borderRadius).toBeCloseTo(1, 2);
  });
});

describe('QuickChip label', () => {
  it('keeps the full label at the 1.2 cap: two fixed-line-height lines, not shrink-wrapped', () => {
    const tree = render(<QuickChip label="حصريات خزائن الرحمن">{null}</QuickChip>);
    const label = tree.root.findAll(
      (n: any) => n.type === 'Text' && n.props.children === 'حصريات خزائن الرحمن',
    )[0];
    expect(label.props.numberOfLines).toBe(2);
    expect(flat(label).alignSelf).toBe('stretch');
    expect(flat(label).textAlign).toBe('center');
    expect(typeof flat(label).lineHeight).toBe('number');
    // Starts 16 from the chip's top (2093:1759 in 2093:1757), top-aligned so one-line
    // and wrapped labels start at the same place, 3 clear of the badge's bottom (13).
    const chip = flat(press(tree));
    expect(chip.paddingTop + flat(label).marginTop).toBe(16);
    expect(chip.justifyContent).toBe('flex-start');
  });
});
