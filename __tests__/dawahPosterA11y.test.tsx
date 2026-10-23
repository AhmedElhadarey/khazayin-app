/**
 * Dawah posters on Home were announced as «حفظ في المكتبة»: the poster's
 * Pressable carried no label of its own, so iOS borrowed the nested bookmark's,
 * and the bookmark could not be reached on its own (the same defect T24 fixed
 * in SearchResultRow). The wrap-around clones were announced too, so VoiceOver
 * read the first and last poster twice. No Figma frame governs a11y; contract:
 * one element per poster, named by its title, with a separately reachable save.
 */
import React from 'react';
import { Text } from 'react-native';

jest.mock('react-native-reanimated', () => {
  const R = require('react');
  const { View, ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: { View, ScrollView },
    Extrapolation: { CLAMP: 'clamp' },
    interpolate: (_x: number, _i: number[], output: number[]) => output[0],
    useSharedValue: (v: unknown) => R.useRef({ value: v }).current,
    useAnimatedScrollHandler: () => undefined,
    useAnimatedStyle: (fn: () => object) => fn(),
  };
});
jest.mock('@/components/khazain/primitives', () => {
  const { Text: T } = require('react-native');
  return { BookmarkButton: () => <T testID="bookmark">save</T> };
});

import { DawahCarousel } from '@/components/khazain/home/DawahCarousel';
import { DawahPoster } from '@/components/khazain/home/DawahPoster';

type Node = {
  type: unknown;
  props: Record<string, any>;
  parent: Node | null;
  findAll: (p: (n: Node) => boolean) => Node[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};
const render = (el: React.ReactElement) => {
  let r!: { root: Node };
  act(() => {
    r = create(el);
  });
  return r;
};

const poster = (id: string) =>
  ({ id, tone: '#000', title: `عنوان ${id}`, body: id, imageSource: 1, month: 'm' }) as any;

describe('DawahPoster accessibility', () => {
  it('is a button named by its title, with the bookmark outside it', () => {
    const r = render(<DawahPoster quote={poster('a')} onPress={() => {}} />);
    const buttons = r.root.findAll(
      (n) => n.type === 'View' && n.props.accessibilityRole === 'button',
    );
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('عنوان a');
    const inside = buttons[0].findAll((n) => n.props.testID === 'bookmark');
    expect(inside).toHaveLength(0);
    expect(r.root.findAll((n) => n.type === Text && n.props.testID === 'bookmark')).toHaveLength(1);
  });
});

describe('DawahCarousel clones', () => {
  it('hides the wrap-around clones from assistive tech', () => {
    const r = render(<DawahCarousel items={[poster('a'), poster('b'), poster('c')]} stageWidth={393} />);
    const slots = r.root.findAll((n) => n.type === 'View' && typeof n.props.onLayout === 'function');
    expect(slots).toHaveLength(5);
    const hidden = (n: Node) =>
      n.props.accessibilityElementsHidden === true &&
      n.props.importantForAccessibility === 'no-hide-descendants';
    expect(slots.map(hidden)).toEqual([true, false, false, false, true]);
  });
});
