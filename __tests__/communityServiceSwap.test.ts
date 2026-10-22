jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * The single swap point: `communityService` in services/community/index.ts
 * picks the mock only when `__DEV__` is true (design §3.2).
 */
describe('communityService swap point', () => {
  const g = global as unknown as { __DEV__: boolean };
  const saved = g.__DEV__;
  afterEach(() => {
    g.__DEV__ = saved;
  });

  const load = (dev: boolean) => {
    g.__DEV__ = dev;
    let kind!: string;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      kind = require('@/services/community').communityService.kind;
    });
    return kind;
  };

  it('is the mock adapter when __DEV__ is true', () => {
    expect(load(true)).toBe('mock');
  });

  it('is the off adapter when __DEV__ is false', () => {
    expect(load(false)).toBe('off');
  });
});
