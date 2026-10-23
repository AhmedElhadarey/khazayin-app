/**
 * Row metrics pinned to the file: the text column of each list row is two lines
 * of 24 + 4 + 20 = 48, and the row's own padding and hairline add up to the
 * stated row height (56 reciter / ribbon, 64 lecture / scholar).
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LectureCard } from '@/components/khazain/primitives/LectureCard';
import { ReciterRow } from '@/components/khazain/primitives/ReciterRow';
import { RibbonCard } from '@/components/khazain/primitives/RibbonCard';
import { CARD_DENSITY, LIST_ROW_TEXT } from '@/constants/layout';
import { RECOMMENDATION_SLOT_HEIGHT } from '@/constants/recommendations';
import { TEXT_ROLES } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/services/audioEngine', () => ({}));
jest.mock('react-native-track-player', () => ({}));
jest.mock('@sentry/react-native', () => ({}));
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
const flat = (n: Node) => StyleSheet.flatten(typeof n.props.style === 'function' ? n.props.style({ pressed: false }) : n.props.style) as any;
const textOf = (r: ReturnType<typeof create>, s: string) =>
  r.root.findAll((n) => n.type === Text && n.props.children === s)[0];
const pressable = (r: ReturnType<typeof create>) => r.root.findAll((n) => typeof n.props.style === 'function')[0];

const lh = (r: ReturnType<typeof create>, s: string) => flat(textOf(r, s)).lineHeight as number;
const mb = (r: ReturnType<typeof create>, s: string) => (flat(textOf(r, s)).marginBottom ?? 0) as number;

describe('ReciterRow (SECTIONS-03, SECTIONS-11)', () => {
  const r = render(<ReciterRow title="عنوان" subtitle="فرعي" onPress={() => {}} />);
  it('fills the 56 row with 24 + 4 + 20', () => {
    const row = flat(pressable(r));
    const col = r.root.findAll((n) => flat(n)?.flex === 1 && flat(n)?.alignItems === 'flex-end')[0];
    const gap = flat(col).gap ?? 0;
    const content = lh(r, 'عنوان') + mb(r, 'عنوان') + gap + lh(r, 'فرعي');
    expect(content).toBe(48);
    const chrome = 2 * (row.paddingVertical + row.borderWidth);
    expect(content + chrome).toBe(56);
  });
  it('draws the disclosure wedge in inkTitle', () => {
    const icon = r.root.findAll((n) => n.props.name === 'Back')[0];
    expect(icon.props.color).toBe(KhazainColors.inkTitle);
    expect(icon.props.size).toBe(20);
  });
});

describe('LectureCard (MEDIA-11, SCHOLARS-12)', () => {
  const mk = (compact: boolean) =>
    render(
      <LectureCard id="1" category={'tafsir' as any} iconNode={null} title="العنوان" scholar="الشيخ" compact={compact} />,
    );
  it('bordered card is 64: 1 + 7 + 48 + 7 + 1', () => {
    const r = mk(false);
    const card = flat(pressable(r));
    const col = r.root.findAll((n) => flat(n)?.flex === 1 && flat(n)?.alignItems === 'flex-end')[0];
    const content = lh(r, 'العنوان') + mb(r, 'العنوان') + (flat(col).gap ?? 0) + lh(r, 'الشيخ');
    expect(content).toBe(48);
    expect(2 * (card.paddingVertical + card.borderWidth) + content).toBe(CARD_DENSITY.lectureCardMinHeight);
  });
  it('title line height is the bodyCompactLoose role', () => {
    expect(LIST_ROW_TEXT.titleLineHeight).toBe(TEXT_ROLES.bodyCompactLoose.lineHeight);
  });
  it('compact rows keep minHeight 56 and padding 8 (not the bordered-card metrics)', () => {
    const r = mk(true);
    const card = flat(pressable(r));
    expect(card.minHeight).toBe(56);
    expect(card.paddingVertical).toBe(8);
    expect(flat(pressable(r)).borderWidth).toBeUndefined();
    expect(lh(r, 'العنوان')).toBe(TEXT_ROLES.bodyCompact.lineHeight);
  });
});

describe('RibbonCard', () => {
  it('badge variant: 8 + 48 + 8 = scholarRowMinHeight, badge side padded 8 (SCHOLARS-08..11)', () => {
    const r = render(<RibbonCard pretitle="فضيلة الشيخ" title="الاسم" badge={<Text>b</Text>} />);
    const card = flat(pressable(r));
    expect(lh(r, 'الاسم')).toBe(24);
    expect(lh(r, 'فضيلة الشيخ')).toBe(24);
    const block = r.root.findAll((n) => flat(n)?.flex === 1 && flat(n)?.alignItems === 'stretch')[0];
    expect(flat(block).gap ?? 0).toBe(0);
    expect(2 * card.paddingVertical + 48).toBe(CARD_DENSITY.scholarRowMinHeight);
    expect(card.paddingRight).toBe(8);
    expect(card.paddingLeft).toBe(16);
    expect(flat(textOf(r, 'الاسم')).color).toBe(KhazainColors.inkTitle);
    expect(flat(textOf(r, 'فضيلة الشيخ')).color).toBe(KhazainColors.inkTitle);
  });

  it('ribbon variant: 1 + 3 + 48 + 3 + 1 = 56, ribbon spans border to border (SCHOLARS-13/14)', () => {
    const r = render(<RibbonCard title="العنوان" meta="الوصف" />);
    const card = flat(pressable(r));
    const content = lh(r, 'العنوان') + mb(r, 'العنوان') + lh(r, 'الوصف');
    expect(content).toBe(48);
    expect(2 * (card.paddingVertical + card.borderWidth) + content).toBe(56);
    const ribbon = r.root.findAll((n) => flat(n)?.width === 12 && flat(n)?.backgroundColor === KhazainColors.goldAccent)[0];
    expect(flat(ribbon).marginVertical).toBe(-card.paddingVertical);
    expect(content + 2 * -flat(ribbon).marginVertical).toBe(54);
  });

  it('RECOMMENDATION_SLOT_HEIGHT equals a pretitle + title + meta ribbon row', () => {
    const r = render(<RibbonCard pretitle="سبب" title="العنوان" meta="الوصف" />);
    const card = flat(pressable(r));
    const block = r.root.findAll((n) => flat(n)?.flex === 1 && flat(n)?.alignItems === 'stretch')[0];
    const content =
      lh(r, 'سبب') + lh(r, 'العنوان') + mb(r, 'العنوان') + lh(r, 'الوصف') + 2 * (flat(block).gap ?? 0);
    expect(RECOMMENDATION_SLOT_HEIGHT).toBe(content + 2 * (card.paddingVertical + card.borderWidth));
  });
});
