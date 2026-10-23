/**
 * The Library daily-wird row at a large font scale. The Android screen matrix
 * at 320dp x font scale 1.7 (docs/audit/screen-matrix/2026-10-23T15-15-54)
 * showed «لم تبدأ القراءة بعد» wrapping to two lines with «بدء الورد» running
 * into the first. At the default scale the row must render as frame 2031:4659
 * draws it: the button at the physical left, the summary on the right.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { WirdStartRow } from '@/components/khazain/library/WirdStartRow';

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

describe('WirdStartRow (Library daily-wird card)', () => {
  const META = 'لم تبدأ القراءة بعد';
  const HIGHLIGHT = 'آخر سورة: الفاتحة';
  const r = render(<WirdStartRow meta={META} highlight={HIGHLIGHT} onStart={() => {}} />);
  const button = r.root.findAll((n) => n.props.accessibilityLabel === 'بدء الورد' && typeof n.props.style === 'function')[0];
  const textCol = textNode(r, META).parent as Node;
  // The deepest host View holding both the button and the summary is the row.
  const hostTexts = (n: Node): string[] =>
    n.findAll((x) => x.type === 'Text').flatMap((x) => x.children.filter((c): c is string => typeof c === 'string'));
  const row = r.root
    .findAll((n) => n.type === 'View' && hostTexts(n).includes('بدء الورد') && hostTexts(n).includes(META))
    .at(-1)!;

  it('is a pinned physical row: the button at the left, the text on the right', () => {
    const st = flat(row);
    expect(st.flexDirection).toBe('row');
    expect(st.direction).toBe('ltr');
    const kids = row.children.filter((c): c is Node => typeof c !== 'string');
    expect(kids).toHaveLength(2);
    expect(hostTexts(kids[0])).toEqual(['بدء الورد']);
    expect(hostTexts(kids[1])).toEqual([META, HIGHLIGHT]);
  });

  it('never overlaps: no absolute child, a fixed button, a flexible text column and a gap', () => {
    for (const n of [row, ...row.findAll((x) => x.type === 'View')]) {
      expect(flat(n).position).not.toBe('absolute');
    }
    expect(flat(button).flexShrink).toBe(0);
    expect(flat(textCol).flex).toBe(1);
    expect(flat(textCol).minWidth).toBe(0);
    expect(flat(textCol).alignItems).toBe('stretch');
    expect(flat(row).gap).toBeGreaterThan(0);
  });

  it('lets the button grow with its label: minHeight, not height', () => {
    expect(flat(button).minHeight).toBe(36);
    expect(flat(button).height).toBeUndefined();
  });

  it('right-aligns the summary and its highlight', () => {
    expect(flat(textNode(r, META)).textAlign).toBe('right');
    expect(flat(textNode(r, HIGHLIGHT)).textAlign).toBe('right');
  });

  it('omits the highlight when there is none', () => {
    const bare = render(<WirdStartRow meta={META} highlight={null} onStart={() => {}} />);
    expect(textNode(bare, HIGHLIGHT)).toBeUndefined();
  });
});
