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

  it('actions are a pinned row with the secondary action left of the primary', () => {
    const actions = r.root
      .findAll((n) => n.type === 'View' && style(n).flexDirection === 'row')
      .find((n) => texts(n).includes('متابعة') && texts(n).includes('إضافة ملاحظة'))!;
    expect(style(actions).direction).toBe('ltr');
    expect(texts(actions)).toEqual(['إضافة ملاحظة', 'متابعة']);
  });
});

describe('EmptyInProgressCard (T16)', () => {
  it('is a pinned row: cta, text, cover', () => {
    const r = render(<EmptyInProgressCard onBrowse={() => {}} />);
    const card = r.root.findAll((n) => n.type === 'View')[0];
    expect(style(card).direction).toBe('ltr');
    expect(style(card).flexDirection).toBe('row');
    const kids = card.children as Node[];
    expect(texts(kids[0])).toEqual(['تصفّح المحاضرات']);
    expect(texts(kids[1])[0]).toBe('لا توجد محاضرة قيد الاستماع');
    expect(texts(kids[2])).toEqual([]); // the cover holds only an svg
    expect(KhazainColors.pageBg).toBeTruthy();
  });
});
