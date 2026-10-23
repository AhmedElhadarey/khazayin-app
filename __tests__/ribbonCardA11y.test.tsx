/**
 * Scholar rows (2102:2975), the scholar's series (2510:1990) and the
 * recommendation rows carried no label or role, so iOS joined the children in
 * physical order and VoiceOver read «٣٢ دقيقة، title، scholar» as a plain group
 * (the defect LectureCard had, fixed in 90c75b4). No Figma frame governs a11y;
 * contract: a pressable RibbonCard is one button named in reading order —
 * pretitle، title، meta، duration — keeping the save action.
 */
import React from 'react';

import { RibbonCard } from '@/components/khazain/primitives/RibbonCard';

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

const buttons = (el: React.ReactElement) => {
  let r!: { root: Node };
  act(() => {
    r = create(el);
  });
  return r.root.findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'button');
};

describe('RibbonCard accessibility', () => {
  it('a series row is one button named title، scholar، duration and keeps the save action', () => {
    const b = buttons(
      <RibbonCard
        title="شرح صحيح البخاري"
        meta="الشيخ عبد المحسن العباد"
        duration="٣٢ دقيقة"
        save={{ type: 'lecture', entityId: 'l1', snapshot: { type: 'lecture', title: 't', scholar: '', duration: '', category: 'tafsir' } } as any}
        onPress={() => {}}
      />,
    );
    expect(b).toHaveLength(1);
    expect(b[0].props.accessibilityLabel).toBe('شرح صحيح البخاري، الشيخ عبد المحسن العباد، ٣٢ دقيقة');
    expect(b[0].props.accessibilityActions?.map((a: { name: string }) => a.name)).toEqual(['toggleSave']);
  });

  it('a scholar row reads its pretitle first', () => {
    const b = buttons(<RibbonCard pretitle="فضيلة الشيخ" title="عبد المحسن العباد البدر" badge={null} onPress={() => {}} />);
    expect(b).toHaveLength(1);
    expect(b[0].props.accessibilityLabel).toBe('فضيلة الشيخ، عبد المحسن العباد البدر');
  });

  it('without an action it is not announced as a button', () => {
    expect(buttons(<RibbonCard title="عنوان" meta="الوصف" />)).toHaveLength(0);
  });
});
