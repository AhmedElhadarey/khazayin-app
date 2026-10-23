import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LectureCard } from '@/components/khazain/primitives/LectureCard';
import { DawahPosterRow } from '@/components/khazain/primitives/DawahPosterRow';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/services/audioEngine', () => ({}));
jest.mock('react-native-track-player', () => ({}));
jest.mock('@sentry/react-native', () => ({}));
// The jest Dimensions mock reports fontScale 2, where useLineClamp unclamps.
// This suite pins the default text size, whose clamps are the Figma geometry;
// enlarged-text unclamping is covered by lineClampRows.test.tsx.
jest.mock('@/hooks/useLineClamp', () => {
  const actual = jest.requireActual('@/hooks/useLineClamp');
  return { ...actual, useLineClamp: (lines: number) => actual.lineClampFor(lines, 1) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type Node = { type: unknown; props: Record<string, any>; children: any[]; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node; unmount: () => void };
};
const render = (el: React.ReactElement) => {
  let r!: ReturnType<typeof create>;
  act(() => {
    r = create(el);
  });
  return r;
};
const flat = (n: Node) =>
  StyleSheet.flatten(typeof n.props.style === 'function' ? n.props.style({ pressed: false }) : n.props.style) as any;
const pressable = (r: ReturnType<typeof create>) => r.root.findAll((n) => typeof n.props.style === 'function')[0];
const texts = (r: ReturnType<typeof create>) => r.root.findAll((n) => n.type === Text).map((n) => n.props.children);

describe('LectureCard rail variant (MEDIA-09)', () => {
  const r = render(
    <LectureCard
      id="1"
      category={'tafsir' as any}
      iconNode={null}
      title="العنوان"
      scholar="الشيخ"
      duration="45 دقيقة"
      variant="rail"
    />,
  );
  it('draws only the title', () => {
    expect(texts(r)).toEqual(['العنوان']);
  });
  it('keeps the 56 / radius 20 rail shape with a one-line, full-width, centred title', () => {
    const card = flat(pressable(r));
    expect(card.minHeight).toBe(56);
    expect(card.borderRadius).toBe(CARD_DENSITY.railRowRadius);
    expect(card.alignItems).toBe('center');
    const title = r.root.findAll((n) => n.type === Text)[0];
    expect(title.props.numberOfLines).toBe(1);
    const block = r.root.findAll((n) => flat(n)?.flex === 1 && flat(n)?.minWidth === 0)[0];
    expect(flat(block).alignItems).toBe('stretch');
    expect(flat(block).alignSelf).toBe('stretch');
  });
  it('keeps long-press save and an informative label', () => {
    const p = pressable(r);
    expect(typeof p.props.onLongPress).toBe('function');
    expect(p.props.accessibilityLabel).toBe('العنوان، الشيخ، 45 دقيقة');
  });
  it('leaves the non-rail card drawing its scholar and duration', () => {
    const c = render(
      <LectureCard id="1" category={'tafsir' as any} iconNode={null} title="العنوان" scholar="الشيخ" duration="45 دقيقة" />,
    );
    expect(texts(c)).toEqual(expect.arrayContaining(['العنوان', 'الشيخ', '45 دقيقة']));
  });
  it('is what RailedLectureList uses', () => {
    const src = fs.readFileSync(path.join(__dirname, '../components/khazain/sections/RailedLectureList.tsx'), 'utf8');
    expect(src).toContain('variant="rail"');
  });
});

describe('dawah rows (MEDIA-14, 15, 16)', () => {
  it('month list row is 56: 1 + 7 + 40 + 7 + 1 with minHeight 56', () => {
    const src = fs.readFileSync(path.join(__dirname, '../app/(tabs)/sections/dawah.tsx'), 'utf8');
    const row = src.match(/\n  row: \{[\s\S]*?\n  \},/)![0];
    expect(row).toMatch(/paddingVertical: 7/);
    expect(row).toMatch(/borderWidth: 1/);
    expect(row).toMatch(/minHeight: CARD_DENSITY\.reciterRowMinHeight/);
    expect(CARD_DENSITY.reciterRowMinHeight).toBe(56);
    expect(CARD_DENSITY.dawahListGap).toBe(4);
  });
  const r = render(
    <DawahPosterRow title="عنوان" quote={{ id: 'q', title: 't', tone: 'navy' } as any} onPress={() => {}} />,
  );
  it('poster row is 89: 1 + 7 + 73 + 7 + 1', () => {
    // The card is the outer View; the opener and the actions sit inside it.
    const row = flat(r.root.findAll((n) => n.type === 'View')[0]);
    expect(row.paddingVertical).toBe(7);
    expect(row.borderWidth).toBe(1);
    expect(2 * (row.paddingVertical + row.borderWidth) + 73).toBe(89);
    expect(row.minHeight).toBe(89);
  });
  it('tints share and download in inkTitle', () => {
    const icons = r.root.findAll((n) => n.props.name === 'DawahShare' || n.props.name === 'DawahDownload');
    expect(icons).toHaveLength(2);
    for (const i of icons) expect(i.props.color).toBe(KhazainColors.inkTitle);
  });
});
