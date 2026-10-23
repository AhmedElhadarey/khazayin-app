/**
 * Lecture rows on Books / Radio / Prophet / Queen carried no label or role,
 * so iOS joined the children in physical order and VoiceOver read «٣٢ دقيقة،
 * title، scholar» as a plain group. The rail variant already named itself
 * title → scholar → duration. No Figma frame governs a11y; contract: every
 * LectureCard is one button named in reading order, keeping the save action.
 */
import React from 'react';

import { LectureCard } from '@/components/khazain/primitives/LectureCard';

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

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

const card = (variant?: 'rail') => {
  let r!: { root: Node };
  act(() => {
    r = create(
      <LectureCard
        id="l1"
        category={'tafsir' as any}
        iconNode={null}
        title="العنوان"
        scholar="الشيخ"
        duration="٣٢ دقيقة"
        variant={variant}
        onPress={() => {}}
      />,
    );
  });
  return r.root.findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'button');
};

describe('LectureCard accessibility', () => {
  it.each([undefined, 'rail' as const])('variant %s is one button named title، scholar، duration', (variant) => {
    const buttons = card(variant);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('العنوان، الشيخ، ٣٢ دقيقة');
    expect(buttons[0].props.accessibilityActions?.map((a: { name: string }) => a.name)).toEqual(['toggleSave']);
  });
});
