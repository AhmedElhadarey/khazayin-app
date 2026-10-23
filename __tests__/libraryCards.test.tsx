/**
 * Library card structure. Rendered, so the order of children in each pinned
 * row is checked rather than inferred from source text.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { AudioProgressCard } from '@/components/khazain/library/AudioProgressCard';
import { EmptyInProgressCard } from '@/components/khazain/library/EmptyInProgressCard';
import { KhazainColors } from '@/constants/theme';

type Node = {
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
export const render = (el: React.ReactElement) => {
  let r!: Renderer;
  act(() => {
    r = create(el);
  });
  return r;
};
const style = (n: Node) => (StyleSheet.flatten(n.props.style) ?? {}) as Record<string, any>;
const texts = (n: Node): string[] =>
  n
    .findAll((x) => x.type === 'Text')
    .map((x) => x.children.filter((c) => typeof c === 'string').join(''));

describe('AudioProgressCard (T16)', () => {
  const r = render(
    <AudioProgressCard
      title="تفسير الفاتحة"
      author="الشيخ"
      pct={65}
      subtitle="٦٥٪ مكتمل"
      primaryLabel="متابعة"
      secondaryLabel="إضافة ملاحظة"
    />,
  );

  it('pins the card direction', () => {
    const card = r.root.findAll((n) => n.type === 'View')[0];
    expect(style(card).direction).toBe('ltr');
  });

  it('actions are a pinned row, packed right, primary then secondary', () => {
    const actions = r.root
      .findAll((n) => n.type === 'View' && style(n).flexDirection === 'row')
      .find((n) => texts(n).includes('متابعة') && texts(n).includes('إضافة ملاحظة'))!;
    expect(style(actions).direction).toBe('ltr');
    expect(texts(actions)).toEqual(['متابعة', 'إضافة ملاحظة']);
  });
});

describe('EmptyInProgressCard (T16)', () => {
  it('is a reading-order row: disc, text, cta (the cta lands at the left)', () => {
    const r = render(<EmptyInProgressCard onBrowse={() => {}} />);
    const card = r.root.findAll((n) => n.type === 'View')[0];
    expect(style(card).direction).toBe('ltr');
    expect(style(card).flexDirection).toBe('row-reverse');
    const kids = card.children as Node[];
    expect(texts(kids[0])).toEqual([]); // the disc holds only an image
    expect(texts(kids[1])[0]).toBe('لا توجد محاضرة قيد الاستماع');
    expect(texts(kids[2])).toEqual(['تصفّح المحاضرات']);
    const label = card.findAll((n) => n.type === 'Text' && n.children.includes('تصفّح المحاضرات'))[0];
    expect(label.props.numberOfLines).toBeUndefined(); // wraps at large font scales instead of ellipsizing
    expect(KhazainColors.pageBg).toBeTruthy();
  });
});

const rowsOf = (r: Renderer) => r.root.findAll((n) => n.type === 'View' && style(n).flexDirection === 'row');
const buttonsOf = (n: Node) => n.findAll((x) => x.type === 'View' && style(x).height === 36);
const full = (extra: Record<string, unknown> = {}) =>
  render(
    <AudioProgressCard
      title="تفسير الفاتحة"
      author="الشيخ"
      pct={65}
      subtitle="٦٥٪ مكتمل"
      episodeLabel="الحلقة ٣ من ١٢"
      primaryLabel="متابعة"
      secondaryLabel="إضافة ملاحظة"
      {...extra}
    />,
  );

describe('AudioProgressCard structure (T18)', () => {
  it('pads 17 / 12 at radius 20', () => {
    const card = full().root.findAll((n) => n.type === 'View')[0];
    expect(style(card)).toMatchObject({ paddingVertical: 17, paddingHorizontal: 12, borderRadius: 20 });
  });

  it('lays [text column, 48pt lattice disc] in a pinned row with a 12 gap', () => {
    const top = rowsOf(full()).find((n) => style(n).gap === 12 && texts(n).includes('تفسير الفاتحة'))!;
    expect(style(top).direction).toBe('ltr');
    const kids = top.children as Node[];
    expect(texts(kids[0])[0]).toBe('تفسير الفاتحة');
    const disc = kids[1].findAll((n) => n.type === 'View')[0];
    expect(style(disc)).toMatchObject({ width: 48, height: 48, borderRadius: 24, overflow: 'hidden' });
  });

  it('keeps the track and a space-between meta row inside the text column', () => {
    const r = full();
    const meta = rowsOf(r).find((n) => style(n).justifyContent === 'space-between')!;
    expect(texts(meta)).toEqual(['الحلقة ٣ من ١٢', '٦٥٪ مكتمل']);
    const track = r.root.findAll((n) => n.type === 'View' && style(n).height === 6)[0];
    expect(style(track)).toMatchObject({ borderRadius: 3, backgroundColor: KhazainColors.hairline });
    const fill = (track.children as Node[])[0];
    expect(style(fill)).toMatchObject({ width: '65%', alignSelf: 'flex-end' });
    expect(style(fill).backgroundColor).toBe(KhazainColors.navy800);
  });

  it('omits the episode text when it is not known', () => {
    const meta = rowsOf(full({ episodeLabel: undefined })).find(
      (n) => style(n).justifyContent === 'space-between',
    )!;
    expect(texts(meta)).toEqual(['٦٥٪ مكتمل']);
  });

  it('sizes the buttons 36 tall, content-sized, with the file paddings', () => {
    const r = full();
    const actions = rowsOf(r).find((n) => style(n).justifyContent === 'flex-end')!;
    expect(style(actions)).toMatchObject({ gap: 8, direction: 'ltr' });
    const [primary, secondary] = buttonsOf(actions).map(style);
    expect(primary).toMatchObject({ height: 36, paddingVertical: 8, paddingHorizontal: 16 });
    expect(secondary).toMatchObject({ height: 36, paddingVertical: 8, paddingHorizontal: 12 });
    expect(primary.flex).toBeUndefined();
    expect(secondary.flex).toBeUndefined();
    expect(secondary.backgroundColor).toBe(KhazainColors.iconChipBg);
  });

  it('completed: full navy track, gold primary (only the primary is gold)', () => {
    const r = full({ variant: 'completed', subtitle: 'مكتمل', episodeLabel: undefined, pct: 0 });
    const track = r.root.findAll((n) => n.type === 'View' && style(n).height === 6)[0];
    const fill = (track.children as Node[])[0];
    expect(style(fill)).toMatchObject({ width: '100%', backgroundColor: KhazainColors.navy800 });
    const actions = rowsOf(r).find((n) => style(n).justifyContent === 'flex-end')!;
    expect(style(buttonsOf(actions)[0]).backgroundColor).toBe(KhazainColors.goldAccent);
  });
});

describe('EmptyInProgressCard cover (T18)', () => {
  it('uses the 48pt lattice disc with no gold border', () => {
    const r = render(<EmptyInProgressCard onBrowse={() => {}} />);
    const card = r.root.findAll((n) => n.type === 'View')[0];
    const disc = (card.children as Node[])[0].findAll((n) => n.type === 'View')[0];
    expect(style(disc)).toMatchObject({ width: 48, height: 48, borderRadius: 24 });
    expect(style(disc).borderWidth).toBeUndefined();
    expect(style(card)).toMatchObject({ paddingVertical: 17, paddingHorizontal: 12 });
  });
});
