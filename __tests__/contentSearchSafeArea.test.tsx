/**
 * The search screen is presented as a fullScreenModal (app/_layout.tsx). On
 * iOS the native SafeAreaView reports a 0 top inset inside that presentation,
 * which put the header (and its back button, the only way out) under the
 * status bar. The screen must pad itself by the JS insets instead.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import SearchModalScreen from '../app/content-search';

// react-test-renderer ships with jest-expo but has no type declarations in
// the repo; type the slice this test uses rather than add @types.
type TestInstance = { props: { style?: StyleProp<ViewStyle> } };
type ReactTestRenderer = {
  root: { findAllByType: (type: unknown) => TestInstance[] };
  unmount: () => void;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (element: React.ReactElement) => ReactTestRenderer;
};

jest.mock('react-native-safe-area-context', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
    // Reports the inset the fullScreenModal actually gets on device.
    SafeAreaView: MockView,
  };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), dismissTo: jest.fn() },
}));

jest.mock('@/components/khazain', () => ({
  InlineHeader: () => null,
  SearchPill: () => null,
  SkeletonRowList: () => null,
}));

jest.mock('@/components/khazain/search', () => ({
  RecentSearchRow: () => null,
  SearchGroupHeader: () => null,
  SearchResultRow: () => null,
  SuggestionChips: () => null,
}));

jest.mock('@/services/lecturePlayback', () => ({ startLecturePlayback: jest.fn() }));
jest.mock('@/services/search/rootReveal', () => ({ onRootRevealedOnce: jest.fn() }));

jest.mock('@/store', () => {
  const state = {
    query: '',
    results: [],
    status: 'idle',
    setQuery: () => {},
    clear: () => {},
    recents: [],
    addRecent: () => {},
    removeRecent: () => {},
    clearAll: () => {},
    data: null,
    items: [],
    fetch: () => {},
  };
  const makeStore = () => {
    const hook = (selector: (s: typeof state) => unknown) => selector(state);
    hook.getState = () => state;
    return hook;
  };
  return {
    useBookLecturesStore: makeStore(),
    useBooksStore: makeStore(),
    useProphetLecturesStore: makeStore(),
    useQueenLecturesStore: makeStore(),
    useRadioProgramsStore: makeStore(),
    useRecentSearchesStore: makeStore(),
    useScholarsStore: makeStore(),
    useSearchStore: makeStore(),
    useSurahsStore: makeStore(),
  };
});

describe('content search screen safe area', () => {
  it('pads its root by the JS safe-area insets', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<SearchModalScreen />);
    });
    const root = tree.root.findAllByType(View)[0];
    const style = StyleSheet.flatten(root.props.style);
    expect(style.paddingTop).toBe(59);
    expect(style.paddingBottom).toBe(34);
    act(() => tree.unmount());
  });

  it('is still presented full screen (the pairing this test exists for)', () => {
    const layout = fs.readFileSync(path.resolve(__dirname, '..', 'app/_layout.tsx'), 'utf8');
    expect(layout).toMatch(
      /<Stack\.Screen\s+name="content-search"[\s\S]*?presentation: 'fullScreenModal'/,
    );
  });
});
