jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** services/contentService.ts:394-409 — the single swap point. */
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
