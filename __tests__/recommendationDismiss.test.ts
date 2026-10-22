import fs from 'fs';
import path from 'path';
import { AccessibilityInfo } from 'react-native';

import { RECOMMENDATION_COPY } from '@/constants/recommendations';
import { dismissRecommendation } from '@/services/recommendations/dismiss';
import type { Recommendation } from '@/services/recommendations/types';
import { useRecommendationsStore } from '@/store/recommendationsStore';
import { useToastStore } from '@/store/toastStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const rec = {
  kind: 'book',
  key: 'book:b1',
  entityId: 'b1',
  title: 'كتاب',
  meta: 'كتاب',
  reason: 'سبب',
  score: 1,
} satisfies Recommendation;

beforeEach(() => {
  useRecommendationsStore.setState({ dismissed: {} });
  useToastStore.setState({ current: null });
});
afterEach(() => jest.restoreAllMocks());

describe('dismissRecommendation', () => {
  it('dismisses with a 5s undo toast that restores', () => {
    dismissRecommendation(rec, { announce: false });
    expect(useRecommendationsStore.getState().dismissed).toHaveProperty('book:b1');
    const t = useToastStore.getState().current!;
    expect(t).toMatchObject({ message: 'تم إخفاء الاقتراح', durationMs: 5000, action: { label: 'تراجع' } });
    t.action!.onPress();
    expect(useRecommendationsStore.getState().dismissed).toEqual({});
  });

  it('does not announce unless asked', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    const spyQ = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
      .mockImplementation(() => undefined);
    dismissRecommendation(rec, { announce: false });
    expect(spy).not.toHaveBeenCalled();
    expect(spyQ).not.toHaveBeenCalled();
  });

  it('announces on request', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    const spyQ = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
      .mockImplementation(() => undefined);
    dismissRecommendation(rec, { announce: true });
    expect(spyQ).toHaveBeenCalledWith('تم إخفاء الاقتراح', { queue: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls back to the plain announce when the queued form is missing', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    const orig = AccessibilityInfo.announceForAccessibilityWithOptions;
    (AccessibilityInfo as any).announceForAccessibilityWithOptions = undefined;
    try {
      dismissRecommendation(rec, { announce: true });
    } finally {
      (AccessibilityInfo as any).announceForAccessibilityWithOptions = orig;
    }
    expect(spy).toHaveBeenCalledWith('تم إخفاء الاقتراح');
  });
});

describe('Settings reset row', () => {
  const src = read('app/(tabs)/more/settings.tsx');
  it('carries the reset row from the copy module, behind the kill switch', () => {
    expect(RECOMMENDATION_COPY.resetRow).toBe('إعادة عرض الاقتراحات المخفية');
    expect(src).toContain('RECOMMENDATION_COPY.resetRow');
    expect(src).toContain('RECOMMENDATIONS_ENABLED');
  });
  it('clears dismissals and confirms with a toast, no Alert', () => {
    const start = src.indexOf('const onResetRecommendations');
    const body = src.slice(start, src.indexOf('\n  };', start));
    expect(start).toBeGreaterThan(-1);
    expect(body).toContain('clearDismissed()');
    expect(body).not.toContain('Alert.alert');
    expect(src).toContain('RECOMMENDATION_COPY.resetDone');
  });
});

describe('cacheFacade', () => {
  it('never references the recommendations key', () => {
    expect(read('services/cacheFacade.ts')).not.toContain('@khazain/recommendations');
  });
});
