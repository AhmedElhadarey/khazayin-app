/**
 * settings-about renders the foundation name once, the app name once, and the
 * version digits isolated LTR.
 */
import React from 'react';

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('expo-application', () => ({ nativeBuildVersion: '42' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
  default: { executionEnvironment: 'standalone', expoConfig: { version: '1.2.3' } },
}));

jest.mock('@sentry/react-native', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
}));

import SettingsAboutScreen from '@/app/settings-about';
import { isolateLtr } from '@/services/bidi';

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

function texts(): string[] {
  let r!: { root: Node };
  act(() => {
    r = create(<SettingsAboutScreen />);
  });
  return r.root
    .findAll((n) => n.type === 'Text')
    .map((t) => [t.props.children].flat(Infinity).join(''));
}

describe('settings-about', () => {
  const all = texts();
  const count = (s: string) => all.filter((t) => t === s).length;

  it('shows the foundation name exactly once', () => {
    expect(count('مؤسسة خزائن الرحمن العلمية')).toBe(1);
  });
  it('shows the app name exactly once', () => {
    expect(count('خزائن الرحمن')).toBe(1);
  });
  it('wraps version and build digits in LRI...PDI', () => {
    expect(all).toContain(isolateLtr('١.٢.٣'));
    expect(all).toContain(isolateLtr('٤٢'));
  });
});
