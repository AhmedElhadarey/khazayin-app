import React from 'react';
import { StyleSheet } from 'react-native';
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
const labels = (r: any): string[] =>
  r.root
    .findAll((n: any) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')
    .map((n: any) => n.props.accessibilityLabel as string);

describe('LetterIndex', () => {
  it('ends on alef maqsura (U+0649), as every frame does (MEDIA-18/SCHOLARS-15/SECTIONS-19)', () => {
    const last = labels(render()).pop()!;
    expect(last.endsWith('ى')).toBe(true);
    expect(labels(render()).some((l) => l.endsWith('ي'))).toBe(false);
  });

  it('is its own physical box and sits chips flush at the physical right (SCHOLARS-16)', () => {
    const r = render();
    const content = r.root.findAll((n: any) => n.props.contentContainerStyle)[0];
    const s: any = StyleSheet.flatten(content.props.contentContainerStyle);
    expect(s.direction).toBe('ltr');
    expect(s.alignItems).toBe('flex-end');
  });
});
