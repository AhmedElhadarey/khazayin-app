jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * The single swap point: `contentService` in services/contentService.ts picks
 * `httpAdapter` when EXPO_PUBLIC_API_BASE is non-empty, else `mockAdapter`.
 */
describe('contentService swap point', () => {
  const saved = process.env.EXPO_PUBLIC_API_BASE;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_API_BASE;
    else process.env.EXPO_PUBLIC_API_BASE = saved;
  });

  const load = () => {
    let out!: { service: unknown; mock: unknown; http: unknown };
    jest.isolateModules(() => {
      const cs = require('@/services/contentService');
      const { httpAdapter } = require('@/services/api/httpAdapter');
      out = { service: cs.contentService, mock: cs.mockAdapter, http: httpAdapter };
    });
    return out;
  };

  it('uses the mock adapter when EXPO_PUBLIC_API_BASE is unset', () => {
    delete process.env.EXPO_PUBLIC_API_BASE;
    const { service, mock } = load();
    expect(service).toBe(mock);
  });

  it('uses the mock adapter when EXPO_PUBLIC_API_BASE is the empty string', () => {
    process.env.EXPO_PUBLIC_API_BASE = '';
    const { service, mock } = load();
    expect(service).toBe(mock);
  });

  it('uses the HTTP adapter when EXPO_PUBLIC_API_BASE is set', () => {
    process.env.EXPO_PUBLIC_API_BASE = 'https://api.example.test';
    const { service, http } = load();
    expect(service).toBe(http);
  });
});
