/**
 * A saved lecture or ribbon row draws its bookmark inside the row's button. On
 * iOS a nested button cannot be reached; on Android TalkBack focused it on its
 * own, BEFORE the row (it sits at the physical left). The row already carries
 * the saved state («محفوظة»), the unsave custom action and its hint, so the
 * nested bookmark is hidden from both screen readers, as SurahRow does.
 */
import React from 'react';

import { LectureCard } from '@/components/khazain/primitives/LectureCard';
import { RibbonCard } from '@/components/khazain/primitives/RibbonCard';
import { lectureSaveTarget } from '@/services/savedToggle';
import { useSavedStore } from '@/store/savedStore';

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

type Node = { type: unknown; props: Record<string, any>; parent: Node | null; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

const lecture = { id: 'l1', title: 'شرح كتاب التوحيد', scholar: 'ابن باز', duration: '٣٢ دقيقة', category: 'book' as const };
const target = lectureSaveTarget(lecture);

beforeEach(() => {
  act(() => {
    useSavedStore.setState({
      items: [{ id: `lecture:${lecture.id}`, type: 'lecture', entityId: lecture.id, savedAt: 1, snapshot: target.snapshot }],
    } as never);
  });
});

const hiddenFromReaders = (n: Node) => {
  for (let p: Node | null = n; p; p = p.parent) {
    if (p.props.accessibilityElementsHidden === true && p.props.importantForAccessibility === 'no-hide-descendants') return true;
  }
  return false;
};

describe.each([
  ['LectureCard', () => <LectureCard id={lecture.id} category="book" iconNode={null} title={lecture.title} scholar={lecture.scholar} duration={lecture.duration} onPress={() => {}} />],
  ['RibbonCard', () => <RibbonCard title={lecture.title} meta={lecture.scholar} duration={lecture.duration} save={target} onPress={() => {}} />],
])('%s when saved', (_name, el) => {
  it('draws the bookmark, hidden from screen readers, and the row carries the saved state and the unsave action', () => {
    let r!: { root: Node };
    act(() => {
      r = create(el());
    });
    const bookmark = r.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('إزالة من المحفوظات'));
    expect(bookmark.length).toBeGreaterThan(0);
    expect(bookmark.every(hiddenFromReaders)).toBe(true);

    const row = r.root.findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'button')[0];
    expect(hiddenFromReaders(row)).toBe(false);
    expect(row.props.accessibilityValue).toEqual({ text: 'محفوظة' });
    expect(row.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual(['إزالة من المحفوظات']);
  });
});
