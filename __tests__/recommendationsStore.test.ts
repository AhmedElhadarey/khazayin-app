import fs from 'fs';
import path from 'path';

import { coerceDismissed, useRecommendationsStore } from '@/store/recommendationsStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

let now = 1_000;
beforeEach(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useRecommendationsStore.setState({ dismissed: {} });
});
afterEach(() => jest.restoreAllMocks());

describe('recommendationsStore', () => {
  it('dismisses, restores and clears', () => {
    const s = useRecommendationsStore.getState();
    s.dismiss('lecture:A');
    expect(useRecommendationsStore.getState().dismissed).toHaveProperty('lecture:A');
    s.restore('lecture:A');
    expect(useRecommendationsStore.getState().dismissed).toEqual({});
    s.dismiss('book:b1');
    s.clearDismissed();
    expect(useRecommendationsStore.getState().dismissed).toEqual({});
  });

  it('drops the oldest at the 300 cap', () => {
    for (let i = 0; i < 301; i++) {
      now = i;
      useRecommendationsStore.getState().dismiss(`k${i}`);
    }
    const d = useRecommendationsStore.getState().dismissed;
    expect(Object.keys(d)).toHaveLength(300);
    expect(d).not.toHaveProperty('k0');
    expect(d).toHaveProperty('k300');
  });

  it('coerces garbage without throwing', () => {
    expect(coerceDismissed(null)).toEqual({});
    expect(coerceDismissed({ dismissed: [1] })).toEqual({});
    expect(coerceDismissed({ dismissed: { a: 1, '': 2, b: NaN, c: 'x' } })).toEqual({ a: 1 });
  });

  it('keeps in-memory dismissals when nothing is persisted', async () => {
    useRecommendationsStore.getState().dismiss('k');
    await useRecommendationsStore.persist.rehydrate();
    expect(useRecommendationsStore.getState().dismissed).toHaveProperty('k');
  });

  it('persists under @khazain/recommendations without version or migrate', () => {
    const src = read('store/recommendationsStore.ts');
    expect(src).toContain("name: '@khazain/recommendations'");
    expect(src).not.toMatch(/\bversion:|\bmigrate:/);
  });
});
