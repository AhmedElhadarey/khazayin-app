/**
 * Regression: after a slot was measured the carousel drew nothing. The slot's
 * animated style returned `opacity: 0` before measuring and then simply stopped
 * returning `opacity`; Reanimated does not reset a key that disappears, so the
 * slot stayed invisible. Every measured slot must state opacity 1.
 */
import React from 'react';
import { StyleSheet } from 'react-native';

jest.mock('react-native-reanimated', () => {
  const R = require('react');
  const { View, ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: { View, ScrollView },
    Extrapolation: { CLAMP: 'clamp' },
    interpolate: (x: number, input: number[], output: number[]) => {
      const i = input.findIndex((v) => v >= x);
      return i <= 0 ? output[Math.max(i, 0)] : output[i];
    },
    useSharedValue: (v: unknown) => R.useRef({ value: v }).current,
    useAnimatedScrollHandler: () => undefined,
    // The worklet runs on every render, as it does on the UI thread per frame.
    useAnimatedStyle: (fn: () => object) => fn(),
  };
});
jest.mock('@/components/khazain/primitives', () => ({ BookmarkButton: () => null }));

import { DawahCarousel } from '@/components/khazain/home/DawahCarousel';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => {
    root: { findAll: (p: (n: any) => boolean) => any[] };
    update: (el: React.ReactElement) => void;
    unmount: () => void;
  };
};

const items = ['a', 'b', 'c'].map((id) => ({
  id, tone: '#000', title: id, body: id, imageSource: 1, month: 'm',
})) as any;

describe('DawahCarousel slots', () => {
  it('hide until measured, then are fully opaque', () => {
    const el = <DawahCarousel items={items} stageWidth={393} />;
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(el);
    });
    const slots = () =>
      tree.root.findAll((n: any) => n.type === 'View' && typeof n.props.onLayout === 'function');
    expect(slots().length).toBeGreaterThanOrEqual(3);
    slots().forEach((s: any) => expect(StyleSheet.flatten(s.props.style).opacity).toBe(0));

    slots().forEach((s: any, i: number) =>
      act(() => s.props.onLayout({ nativeEvent: { layout: { x: i * 116, width: 116, height: 154 } } })),
    );
    act(() => tree.update(<DawahCarousel items={items} stageWidth={393} />));
    slots().forEach((s: any) => expect(StyleSheet.flatten(s.props.style).opacity).toBe(1));
    // A pending anchor frame must not fire after jest teardown.
    act(() => tree.unmount());
  });
});
