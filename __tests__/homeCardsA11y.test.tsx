/**
 * T29. On Home, VoiceOver announced the scholar cards as buttons that did
 * nothing, and the book cards as a plain group: neither got an `onPress`. Both
 * cards also nested their bookmark inside the card's Pressable — one
 * accessibility element on iOS — so the save could not be reached on its own
 * and its label leaked into the card's (the defect f4ad707 fixed in
 * DawahPoster). No Figma frame governs a11y; contract: one element per card,
 * named by the item, with a separately reachable save, and Home's taps go
 * where the Sections lists send the same items.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

const mockPush = jest.fn();
const mockStartLecturePlayback = jest.fn();

jest.mock('@/components/khazain/primitives', () => {
  const { Text: T, View } = require('react-native');
  return {
    BookmarkButton: () => <T testID="bookmark">save</T>,
    RtlCarousel: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

import { BookCard } from '@/components/khazain/home/BookCard';
import { ScholarCard } from '@/components/khazain/home/ScholarCard';

type Node = {
  type: unknown;
  props: Record<string, any>;
  parent: Node | null;
  findAll: (p: (n: Node) => boolean) => Node[];
  find: (p: (n: Node) => boolean) => Node;
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

const hostButtons = (root: Node) =>
  root.findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'button');
const pressables = (root: Node) =>
  root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
const styleOf = (n: Node) => StyleSheet.flatten(n.props.style) ?? {};

const cards: [string, (onPress?: () => void) => React.ReactElement, string][] = [
  ['ScholarCard', (onPress) => <ScholarCard id="s4" nameArt={1} name="ابن باز" onPress={onPress} />, 'ابن باز'],
  ['BookCard', (onPress) => <BookCard id="b1" name="زاد المعاد" titleArt={1} onPress={onPress} />, 'زاد المعاد'],
];

describe.each(cards)('%s with an action', (_name, card, label) => {
  it('is one button named by the item, with the bookmark outside it', () => {
    const r = render(card(() => {}));
    const buttons = hostButtons(r.root);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe(label);
    expect(buttons[0].findAll((n) => n.props.testID === 'bookmark')).toHaveLength(0);
    expect(r.root.findAll((n) => n.type === Text && n.props.testID === 'bookmark')).toHaveLength(1);
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const r = render(card(onPress));
    const [pressable] = pressables(r.root);
    act(() => pressable.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws the bookmark above the card on Android, where elevation beats sibling order', () => {
    const r = render(card(() => {}));
    const card_ = hostButtons(r.root)[0];
    const bookmark = r.root.find((n) => n.type === Text && n.props.testID === 'bookmark');
    let slot: Node | null = bookmark.parent;
    while (slot && !(slot.type === 'View' && styleOf(slot).position === 'absolute')) slot = slot.parent;
    expect(slot).not.toBeNull();
    expect(styleOf(slot!).elevation ?? 0).toBeGreaterThanOrEqual(styleOf(card_).elevation ?? 0);
  });

  it('keeps the card footprint on the outer frame', () => {
    const r = render(card(() => {}));
    const button = hostButtons(r.root)[0];
    const card_ = styleOf(button);
    let host: Node | null = button.parent;
    while (host && host.type !== 'View') host = host.parent;
    expect(host).not.toBeNull();
    const frame = styleOf(host!);
    expect(card_.width).toEqual(expect.any(Number));
    expect(frame.width).toBe(card_.width);
    expect(frame.height).toBe(card_.height);
    expect(frame.overflow).not.toBe('hidden');
  });
});

describe('ScholarCard without an action', () => {
  it('is not announced as a button that does nothing, and still reads the name', () => {
    const r = render(<ScholarCard id="s4" nameArt={1} name="ابن باز" />);
    expect(hostButtons(r.root)).toHaveLength(0);
    expect(r.root.findAll((n) => n.type === 'View' && n.props.accessibilityLabel === 'ابن باز')).toHaveLength(1);
  });
});

describe('BookCard without an action (the book detail cover)', () => {
  it('is not a button, and the art carries the name', () => {
    const r = render(<BookCard id="b1" name="زاد المعاد" titleArt={1} />);
    expect(hostButtons(r.root)).toHaveLength(0);
    expect(r.root.findAll((n) => n.props.accessible === true && n.props.accessibilityLabel === 'زاد المعاد').length).toBeGreaterThan(0);
  });
});

// ── Home wiring ────────────────────────────────────────────────────────────────
const mockScholar = { id: 's4', name: 'ابن باز' };
const mockLecture = { id: 'b1', title: 'زاد المعاد', category: 'كتب', scholar: 'ابن القيم', duration: '1:00' };
const mockAsyncStore = (extra: object) => () => ({
  status: 'success',
  error: null,
  fetch: () => Promise.resolve(),
  refresh: () => Promise.resolve(),
  ...extra,
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: () => undefined,
}));
jest.mock('@/services/lecturePlayback', () => ({
  startLecturePlayback: (...args: unknown[]) => mockStartLecturePlayback(...args),
}));
jest.mock('@/constants/recommendations', () => ({ RECOMMENDATIONS_ENABLED: false }));
jest.mock('@/store', () => ({
  useScholarsStore: mockAsyncStore({ data: [mockScholar] }),
  useBookLecturesStore: mockAsyncStore({ items: [mockLecture] }),
  useFeaturedDawahStore: mockAsyncStore({ data: [] }),
}));
jest.mock('@/store/notesStore', () => ({ useNotesStore: { subscribe: () => () => {} } }));
jest.mock('@/store/savedStore', () => ({ useSavedStore: { subscribe: () => () => {} } }));
jest.mock('@/store/recommendationInputsStore', () => ({
  useRecommendationInputsStore: { subscribe: () => () => {}, getState: () => ({}) },
}));
jest.mock('@/services/recommendations/signalCount', () => ({ signalCountNow: () => 0 }));
jest.mock('@/services/recommendations/watchSignals', () => ({ watchSignals: () => () => {} }));
jest.mock('@/services/searchNavigation', () => ({ openSearch: () => {} }));
jest.mock('@/components/khazain/recommendations/RecommendedSection', () => ({ RecommendedSection: () => null }));
jest.mock('@/components/khazain/patterns', () => ({ HeaderArt: () => null }));
jest.mock('@/components/khazain/icons/FigmaIcon', () => ({ FigmaIcon: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
// The real cards stand in for themselves; every other Home composite is inert.
jest.mock('@/components/khazain', () => {
  const { View } = require('react-native');
  const Null = () => null;
  return {
    AsyncContent: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    BookCard: jest.requireActual('@/components/khazain/home/BookCard').BookCard,
    ScholarCard: jest.requireActual('@/components/khazain/home/ScholarCard').ScholarCard,
    DawahCarousel: Null,
    HeroProphet: Null,
    HeroQuran: Null,
    HomeHeader: Null,
    HomeSectionHeader: Null,
    QueenCard: Null,
    QuickChip: Null,
    SkeletonCardList: Null,
    SkeletonPosterList: Null,
  };
});

describe('Home rails', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockStartLecturePlayback.mockClear();
  });

  const renderHome = () => {
    const HomeScreen = require('@/app/(tabs)/index').default;
    return render(<HomeScreen />);
  };
  const press = (r: { root: Node }, label: string) => {
    const [card] = pressables(r.root).filter((n) => n.props.accessibilityLabel === label);
    expect(card).toBeDefined();
    act(() => card.props.onPress());
  };

  it('opens the scholar a scholar card names', () => {
    press(renderHome(), mockScholar.name);
    expect(mockPush).toHaveBeenCalledWith(`/sections/scholar/${mockScholar.id}`);
    expect(mockStartLecturePlayback).not.toHaveBeenCalled();
  });

  it('plays the book a book card names', () => {
    press(renderHome(), mockLecture.title);
    expect(mockStartLecturePlayback).toHaveBeenCalledWith(mockLecture);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
