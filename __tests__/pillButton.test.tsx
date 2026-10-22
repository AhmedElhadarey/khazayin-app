/**
 * PillButton: announced as a button (with disabled state) and its label is
 * never shrink-wrapped (Android 15+ bounds-vs-advance line-break mismatch
 * drops the last word of a Text whose box is exactly its advance width).
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PillButton } from '@/components/khazain/primitives/PillButton';

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
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
const pressable = (r: Renderer) => r.root.findAll((n) => n.props.accessibilityRole === 'button')[0];

describe('PillButton accessibility', () => {
  it('is a button with disabled false when enabled', () => {
    const p = pressable(render(<PillButton label="إنشاء مجموعة" onPress={() => {}} />));
    expect(p).toBeDefined();
    expect(p.props.accessibilityState).toEqual({ disabled: false });
  });

  it('reports disabled in its accessibility state', () => {
    const p = pressable(render(<PillButton label="إنشاء مجموعة" onPress={() => {}} disabled />));
    expect(p.props.accessibilityState).toEqual({ disabled: true });
  });
});

describe('PillButton label width', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/khazain/primitives/PillButton.tsx'),
    'utf8',
  );

  it('never aligns the label to a shrink-wrapping alignSelf/alignItems', () => {
    expect(source).not.toMatch(/alignSelf:\s*'(flex-end|center|flex-start)'/);
  });

  it('lets the label Text grow to the full inner width and centres it with textAlign', () => {
    const r = render(<PillButton label="إرسال البلاغ" onPress={() => {}} />);
    const text = r.root.findAll((n) => n.props.children === 'إرسال البلاغ' && n.type === 'Text')[0]
      ?? r.root.findAll((n) => n.props.children === 'إرسال البلاغ')[0];
    const style = StyleSheet.flatten(text.props.style);
    expect(style.textAlign).toBe('center');
    expect(style.flexGrow).toBe(1);
    expect(style.flexShrink).toBe(1);
  });
});
