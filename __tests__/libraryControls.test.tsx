/**
 * The Toggle and the Library progress ring against the file (LIBRARY-04/05/06).
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { CircularProgress } from '@/components/khazain/library/CircularProgress';
import { Toggle } from '@/components/khazain/primitives/Toggle';
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
const render = (el: React.ReactElement) => {
  let r!: Renderer;
  act(() => {
    r = create(el);
  });
  return r;
};
const src = (f: string) =>
  fs
    .readFileSync(path.join(__dirname, '..', f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('Toggle (LIBRARY-04)', () => {
  const t = src('components/khazain/primitives/Toggle.tsx');

  it('is a 44 x 24 track at radius 12 with 2pt padding, pinned physically', () => {
    expect(t).toMatch(/width: 44/);
    expect(t).toMatch(/height: 24/);
    expect(t).toMatch(/borderRadius: 12/);
    expect(t).toMatch(/padding: 2/);
    expect(t).toMatch(/\.\.\.PHYSICAL_BOX/);
  });

  it('draws a 20pt page-colour knob with the file shadow', () => {
    expect(t).toMatch(/width: 20/);
    expect(t).toMatch(/backgroundColor: KhazainColors\.pageBg/);
    expect(t).toMatch(/shadowOpacity: 0\.2/);
    expect(t).toMatch(/shadowRadius: 4/);
  });

  it('rests the knob at the physical right when off and moves it left by 20 when on', () => {
    expect(t).toMatch(/alignSelf: 'flex-end'/);
    expect(t).toMatch(/translateX: progress\.value \* -20/);
  });

  it('colours off as the hairline grey and on as navy', () => {
    expect(t).toMatch(/\[KhazainColors\.hairline, KhazainColors\.navy800\]/);
  });

  it('keeps a 44pt touch target through hitSlop and still reports as a switch', () => {
    const r = render(<Toggle on={false} onChange={() => {}} label="x" />);
    const sw = r.root.findAll((n) => n.props.accessibilityRole === 'switch')[0];
    expect(sw.props.accessibilityState).toEqual({ checked: false, disabled: false });
    const slop = sw.props.hitSlop as { top: number; bottom: number; left: number; right: number };
    expect(24 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    expect(44 + slop.left + slop.right).toBeGreaterThanOrEqual(44);
  });

  it('flips through onChange', () => {
    const calls: boolean[] = [];
    const r = render(<Toggle on={false} onChange={(n) => calls.push(n)} />);
    act(() => r.root.findAll((n) => n.props.accessibilityRole === 'switch')[0].props.onPress());
    expect(calls).toEqual([true]);
  });
});

describe('CircularProgress (LIBRARY-05, 06)', () => {
  const circles = (r: Renderer) =>
    r.root.findAll(
      (n) =>
        typeof n.props?.stroke === 'string' && typeof n.props?.r === 'number' && 'strokeWidth' in n.props,
    );
  const labelOf = (r: Renderer) =>
    r.root
      .findAll((n) => n.type === 'Text')
      .map((n) => n.children.join(''))
      .join('');

  it('draws a 3pt ring on the warm hairline with a butt-capped gold arc', () => {
    const r = render(<CircularProgress pct={70} size={48} />);
    const [track, arc] = circles(r);
    expect(track.props.strokeWidth).toBe(3);
    expect(track.props.stroke).toBe(KhazainColors.hairlineWarm);
    expect(arc.props.stroke).toBe(KhazainColors.goldAccent);
    expect(arc.props.strokeLinecap).toBe('butt');
    // Stroke centre radius (size - 5.56) / 2 for the 48pt ring.
    expect(arc.props.r).toBeCloseTo(21.22, 2);
    expect(track.props.r).toBeCloseTo(21.22, 2);
  });

  it('labels in Arabic-Indic digits with the Arabic percent sign', () => {
    expect(labelOf(render(<CircularProgress pct={70} size={48} />))).toBe('٧٠٪');
    expect(labelOf(render(<CircularProgress pct={0} size={48} />))).toBe('٠٪');
  });

  it('sets the label at 12 in the accent colour, centred', () => {
    const r = render(<CircularProgress pct={70} size={48} />);
    const text = r.root.findAll((n) => n.type === 'Text')[0];
    const st = StyleSheet.flatten(text.props.style) as Record<string, any>;
    expect(st.fontSize).toBe(12);
    expect(st.color).toBe(KhazainColors.goldAccent);
    expect(st.textAlign).toBe('center');
  });
});

describe('Library glyph and placeholder colours (LIBRARY-02, 19)', () => {
  const lib = src('app/(tabs)/library.tsx');
  it('draws every stat glyph in the gold accent', () => {
    const chunk = lib.slice(lib.indexOf('const summaryCards'), lib.indexOf('const audiobookProgressCard'));
    expect(chunk).not.toMatch(/KhazainColors\.navy800/);
    expect(chunk.match(/KhazainColors\.goldAccent/g)!.length).toBeGreaterThanOrEqual(5);
    expect(lib).toMatch(/stroke=\{KhazainColors\.goldAccent\}/);
  });
  it('uses the placeholder token and the shared ink500 format buttons', () => {
    expect(KhazainColors.placeholder).toBe('#9CA3AF');
    expect(lib).toMatch(/noteBodyPlaceholder: textStyle\('cardTitle', \{ color: KhazainColors\.placeholder \}\)/);
    expect(lib.match(/<FormatButton mark="Note(ListFormat|Italic|Bold)"/g)).toHaveLength(3);
    expect(src('components/khazain/primitives/FormatButton.tsx')).toMatch(/size=\{GLYPH\} color=\{KhazainColors\.ink500\}/);
  });
});
