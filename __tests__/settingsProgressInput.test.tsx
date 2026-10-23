/** The wird-goal input shows Arabic-Indic digits and stores ASCII, whatever digits are typed. */
import React from 'react';

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/db', () => ({ resetFacade: { resetAll: jest.fn() } }));
jest.mock('@/components/khazain', () => ({ InlineHeader: () => null }));
jest.mock('@/components/khazain/patterns', () => ({ HeaderArt: () => null }));
jest.mock('@/store/progressStore', () => ({
  useProgressStore: (sel: (s: unknown) => unknown) => sel({ refreshAll: jest.fn() }),
}));
jest.mock('@/store/wirdStore', () => ({
  useWirdStore: (sel: (s: unknown) => unknown) =>
    sel({ target: 5, setTarget: jest.fn(), hydrate: jest.fn() }),
}));
jest.mock('@/store/toastStore', () => ({
  useToastStore: (sel: (s: unknown) => unknown) => sel({ show: jest.fn() }),
}));
jest.mock('@/store/recommendationInputsStore', () => ({
  useRecommendationInputsStore: { getState: () => ({ refreshActivity: jest.fn() }) },
}));

import SettingsProgressScreen from '@/app/(tabs)/more/settings-progress';

type Node = {
  type: unknown;
  props: Record<string, any>;
  findAll: (p: (n: Node) => boolean) => Node[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

describe('settings-progress input', () => {
  it.each(['١٢', '12', '۱۲'])('typing %s displays ١٢ (stored draft is 12)', (typed) => {
    let r!: { root: Node };
    act(() => {
      r = create(<SettingsProgressScreen />);
    });
    const input = () => r.root.findAll((n) => n.type === 'TextInput')[0];
    act(() => {
      input().props.onChangeText(typed);
    });
    expect(input().props.value).toBe('١٢');
  });
});
