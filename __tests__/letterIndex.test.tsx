import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LetterIndex } from '@/components/khazain/primitives/LetterIndex';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: { findAll: (p: (n: any) => boolean) => any[] } };
};

const render = () => {
  let r: any;
  act(() => {
    r = create(<LetterIndex />);
  });
  return r;
};
describe('LetterIndex', () => {
  it('draws alef maqsura last (U+0649) but announces and emits ya (MEDIA-18/SCHOLARS-15/SECTIONS-19)', () => {
    const onLetterPress = jest.fn();
    let r: any;
    act(() => {
      r = create(<LetterIndex onLetterPress={onLetterPress} />);
    });
    const buttons = r.root.findAll((n: any) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    const last = buttons[buttons.length - 1];
    expect(last.props.accessibilityLabel).toBe('الحرف \u064A');
    const glyphs = r.root.findAll((n: any) => n.type === Text).map((n: any) => n.props.children);
    expect(glyphs[glyphs.length - 1]).toBe('\u0649');
    expect(glyphs).not.toContain('\u064A');
    act(() => last.props.onPress());
    expect(onLetterPress).toHaveBeenCalledWith('\u064A');
  });

  it('is its own physical box and sits chips flush at the physical right (SCHOLARS-16)', () => {
    const r = render();
    const content = r.root.findAll((n: any) => n.props.contentContainerStyle)[0];
    const s: any = StyleSheet.flatten(content.props.contentContainerStyle);
    expect(s.direction).toBe('ltr');
    expect(s.alignItems).toBe('flex-end');
  });
});
