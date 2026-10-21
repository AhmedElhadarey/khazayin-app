/**
 * Tests for `services/notificationScheduler` under Expo Go (T-EG-1..T-EG-4).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `notificationScheduler` reads `Constants.executionEnvironment` at module load
 * and, when it is `storeClient` (Expo Go), used to short-circuit EVERY function
 * to a no-op. Under `jest-expo` the execution environment is never `storeClient`,
 * so the entire suite — 194 passing tests — only ever exercised the `false`
 * branch. A user testing on a real device in Expo Go ran the other one and got
 * total silence: the wird scheduler returned `null` before it ever spoke to
 * the OS.
 *
 * A blanket no-op traded "a test that might mislead" for "no test at all". The
 * three things the guard cited — custom Android channels, exact alarms, boot
 * rescheduling — are not required for a one-shot DATE local trigger, which
 * Expo Go schedules and delivers correctly on both platforms. (SDK 53 removed
 * *remote push* from Expo Go, not local notifications.)
 *
 * So: local scheduling must WORK in Expo Go. These tests pin that. The residual
 * fidelity gap — an Expo Go pass does not prove standalone behaviour, because
 * exact alarms and boot rescheduling ride on *this app's* manifest, not Expo
 * Go's — is now carried by a dev-only console warning instead of by silence.
 */

// Must be hoisted above the scheduler import so IS_EXPO_GO is computed as true.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'storeClient' },
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
}));

jest.mock('@/services/notificationRegistry', () => ({
  __esModule: true,
  getCategory: () => ({ labelAr: 'الفجر' }),
}));

import * as MockNotifications from 'expo-notifications';

import {
  bootstrapNotificationHandler,
  getPermissionAsync,
  reconcileHorizonAsync,
  requestPermissionAsync,
} from '@/services/notificationScheduler';
import type { HorizonEntry } from '@/services/notificationHorizon';

type MockSurface = typeof MockNotifications & {
  __setPermissionResponse: (status: 'granted' | 'denied' | 'undetermined') => void;
  __getScheduleCalls: () => readonly {
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
    trigger: { type: string; date?: Date } | null;
  }[];
  __getHandlerSetCount: () => number;
  __resetMock: () => void;
};

const Mock = MockNotifications as unknown as MockSurface;

beforeEach(() => {
  Mock.__resetMock();
});

/** A wird horizon entry for tomorrow at h:m local (built from local components). */
function wirdEntry(hour: number, minute: number): HorizonEntry {
  const t = new Date();
  const fireAt = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, hour, minute, 0, 0);
  const localDay = [
    fireAt.getFullYear(),
    String(fireAt.getMonth() + 1).padStart(2, '0'),
    String(fireAt.getDate()).padStart(2, '0'),
  ].join('-');
  return { categoryId: 'wird-daily', localDay, fireAt };
}

describe('T-EG — the scheduler is functional inside Expo Go', () => {
  it('T-EG-1: a wird horizon entry is armed as a DATE trigger at the requested time', async () => {
    Mock.__setPermissionResponse('granted');

    // The exact case the user hit on an iPhone 12: reminder set to 5:35.
    await reconcileHorizonAsync([wirdEntry(5, 35)]);

    const calls = Mock.__getScheduleCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].trigger).toMatchObject({ type: 'date' });
    const date = calls[0].trigger!.date as Date;
    expect([date.getHours(), date.getMinutes()]).toEqual([5, 35]);
    expect(calls[0].content.data).toMatchObject({ category: 'wird-daily' });
  });

  it('T-EG-2: getPermissionAsync reports the real OS answer, not a hardcoded undetermined', async () => {
    Mock.__setPermissionResponse('granted');
    await expect(getPermissionAsync()).resolves.toBe('granted');

    Mock.__setPermissionResponse('denied');
    await expect(getPermissionAsync()).resolves.toBe('denied');
  });

  it('T-EG-3: requestPermissionAsync actually prompts rather than returning undetermined', async () => {
    Mock.__setPermissionResponse('granted');
    await expect(requestPermissionAsync()).resolves.toBe('granted');
  });

  it('T-EG-4: the foreground notification handler is registered', () => {
    bootstrapNotificationHandler();
    expect(Mock.__getHandlerSetCount()).toBe(1);
  });

  it('T-EG-5: the permission gate still holds — nothing is armed without permission', async () => {
    Mock.__setPermissionResponse('denied');

    await reconcileHorizonAsync([wirdEntry(5, 35)]);

    expect(Mock.__getScheduleCalls()).toHaveLength(0);
  });
});
