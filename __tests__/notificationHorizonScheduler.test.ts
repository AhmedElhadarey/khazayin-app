/**
 * Tests for the rolling-horizon OS boundary added to
 * `services/notificationScheduler.ts` (T-NHS-1..T-NHS-8, T107 legacy teardown,
 * T104 mass-cancel guard).
 *
 * Uses the manual `__mocks__/expo-notifications.ts` (auto-resolved by Jest) and
 * an inline mock for `@/services/notificationRegistry`.
 *
 * Contract: specs/004-daily-wird-tracking/contracts/notification-horizon.contract.md
 */

import * as MockNotifications from 'expo-notifications';

import {
  cancelCategoryAsync,
  cancelEntryAsync,
  reconcileHorizonAsync,
} from '@/services/notificationScheduler';
import type { HorizonEntry } from '@/services/notificationHorizon';
import { assembleAndReconcile, setPrayerTimesProvider } from '@/services/horizonOrchestrator';

// The orchestrator path (T104) reaches the DB for completedDays; stub it so the
// test is hermetic. The rest of this file never imports `@/db`, so the mock is
// inert for T-NHS-*.
jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: jest.fn(async () => ({})),
  progressRepo: { completedDaysInRange: jest.fn(async () => [] as string[]) },
}));

// The orchestrator pulls in the persisted settings store, which imports the
// native AsyncStorage module — swap in its in-memory jest mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ---------------------------------------------------------------------------
// Typed handle onto the manual-mock test surface.
// ---------------------------------------------------------------------------
type MockSurface = typeof MockNotifications & {
  __setPermissionResponse: (status: 'granted' | 'denied' | 'undetermined') => void;
  __getScheduleCalls: () => readonly {
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
    trigger: { type: string; date?: unknown; channelId?: string } | null;
    identifier?: string;
  }[];
  __getCancelCalls: () => readonly string[];
  __setScheduledNotifications: (
    arr: { identifier: string; content: { data?: Record<string, unknown> } }[],
  ) => void;
  __getScheduledNotifications: () => readonly {
    identifier: string;
    content: { data?: Record<string, unknown> };
  }[];
  __resetMock: () => void;
};

const Mock = MockNotifications as unknown as MockSurface;

jest.mock('@/services/notificationRegistry', () => ({
  isCategoryEnabled: () => true,
  getCategory: (id: string) => ({ id, labelAr: id, descriptionAr: id, defaultOn: true, available: true }),
}));

beforeEach(() => {
  Mock.__resetMock();
  Mock.__setPermissionResponse('granted');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entry(
  categoryId: HorizonEntry['categoryId'],
  localDay: string,
  hour = 20,
): HorizonEntry {
  const [y, m, d] = localDay.split('-').map(Number);
  return { categoryId, localDay, fireAt: new Date(y, m - 1, d, hour, 0, 0, 0) };
}

function keysOf(): string[] {
  return Mock.__getScheduledNotifications()
    .map((n) => {
      const data = n.content.data ?? {};
      return `${String(data.category)}|${String(data.localDay)}`;
    })
    .sort();
}

// ---------------------------------------------------------------------------
// T-NHS-1: reconcile schedules exactly the missing entries
// ---------------------------------------------------------------------------
describe('T-NHS-1 reconcile schedules the missing entries', () => {
  it('schedules every intended entry when nothing is armed', async () => {
    const intended = [entry('prayer-fajr', '2026-07-09', 5), entry('prayer-fajr', '2026-07-10', 5)];
    await reconcileHorizonAsync(intended);

    expect(Mock.__getScheduleCalls()).toHaveLength(2);
    expect(keysOf()).toEqual(['prayer-fajr|2026-07-09', 'prayer-fajr|2026-07-10']);
  });
});

// ---------------------------------------------------------------------------
// T-NHS-2: second consecutive call issues zero OS calls
// ---------------------------------------------------------------------------
describe('T-NHS-2 idempotency', () => {
  it('does nothing the second time when intended is unchanged', async () => {
    const intended = [entry('prayer-dhuhr', '2026-07-09', 12), entry('prayer-fajr', '2026-07-09', 5)];
    await reconcileHorizonAsync(intended);

    const scheduledAfterFirst = Mock.__getScheduleCalls().length;
    const cancelledAfterFirst = Mock.__getCancelCalls().length;

    await reconcileHorizonAsync(intended);

    expect(Mock.__getScheduleCalls().length).toBe(scheduledAfterFirst);
    expect(Mock.__getCancelCalls().length).toBe(cancelledAfterFirst);
  });
});

// ---------------------------------------------------------------------------
// T-NHS-3: entries in `actual` but not `intended` are cancelled
// ---------------------------------------------------------------------------
describe('T-NHS-3 surplus entries cancelled', () => {
  it('cancels stale ours-entries and leaves foreign categories untouched', async () => {
    Mock.__setScheduledNotifications([
      { identifier: 'stale', content: { data: { category: 'prayer-fajr', localDay: '2026-07-01' } } },
      { identifier: 'keep', content: { data: { category: 'prayer-fajr', localDay: '2026-07-09' } } },
      { identifier: 'announce', content: { data: { category: 'announcements-general' } } },
    ]);

    await reconcileHorizonAsync([entry('prayer-fajr', '2026-07-09', 5)]);

    expect(Mock.__getCancelCalls()).toContain('stale');
    expect(Mock.__getCancelCalls()).not.toContain('keep');
    // Foreign category is never touched by the horizon reconcile.
    expect(Mock.__getCancelCalls()).not.toContain('announce');
    const remaining = Mock.__getScheduledNotifications().map((n) => n.identifier).sort();
    expect(remaining).toContain('announce');
    expect(remaining).toContain('keep');
  });
});

// ---------------------------------------------------------------------------
// T-NHS-4: cancelCategoryAsync is category-scoped across all days
// ---------------------------------------------------------------------------
describe('T-NHS-4 cancelCategoryAsync', () => {
  it('cancels every Dhuhr entry across all days and touches nothing else', async () => {
    Mock.__setScheduledNotifications([
      { identifier: 'd1', content: { data: { category: 'prayer-dhuhr', localDay: '2026-07-09' } } },
      { identifier: 'd2', content: { data: { category: 'prayer-dhuhr', localDay: '2026-07-10' } } },
      { identifier: 'f1', content: { data: { category: 'prayer-fajr', localDay: '2026-07-09' } } },
      { identifier: 'w1', content: { data: { category: 'wird-daily', localDay: '2026-07-09' } } },
    ]);

    await cancelCategoryAsync('prayer-dhuhr');

    expect([...Mock.__getCancelCalls()].sort()).toEqual(['d1', 'd2']);
    expect(Mock.__getScheduledNotifications().map((n) => n.identifier).sort()).toEqual([
      'f1',
      'w1',
    ]);
  });
});

// ---------------------------------------------------------------------------
// T-NHS-5: scheduled with type DATE, never DAILY or TIME_INTERVAL
// ---------------------------------------------------------------------------
describe('T-NHS-5 trigger type is DATE', () => {
  it('uses a DATE trigger for every scheduled entry', async () => {
    await reconcileHorizonAsync([
      entry('prayer-dhuhr', '2026-07-09', 12),
      entry('prayer-fajr', '2026-07-09', 5),
    ]);
    const calls = Mock.__getScheduleCalls();
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.trigger?.type).toBe('date');
      expect(call.trigger?.type).not.toBe('daily');
      expect(call.trigger?.type).not.toBe('timeInterval');
    }
  });
});

// ---------------------------------------------------------------------------
// T-NHS-6: every scheduled notification carries data { category, localDay }
// ---------------------------------------------------------------------------
describe('T-NHS-6 data payload', () => {
  it('tags every notification with category and localDay', async () => {
    await reconcileHorizonAsync([entry('prayer-isha', '2026-07-11', 19)]);
    const call = Mock.__getScheduleCalls()[0];
    expect(call.content.data).toEqual(
      expect.objectContaining({ category: 'prayer-isha', localDay: '2026-07-11' }),
    );
  });
});

// ---------------------------------------------------------------------------
// T-NHS-7: no scheduling when OS permission is not granted
// ---------------------------------------------------------------------------
describe('T-NHS-7 permission gate', () => {
  it('schedules nothing when permission is denied', async () => {
    Mock.__setPermissionResponse('denied');
    await reconcileHorizonAsync([entry('prayer-fajr', '2026-07-09', 5)]);
    expect(Mock.__getScheduleCalls()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// T-NHS-8: no scheduling in Expo Go (IS_EXPO_GO short-circuit)
// ---------------------------------------------------------------------------
describe('T-NHS-8 Expo Go short-circuit', () => {
  it('schedules nothing when running inside Expo Go', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: { executionEnvironment: 'storeClient' },
        ExecutionEnvironment: {
          StoreClient: 'storeClient',
          Standalone: 'standalone',
          Bare: 'bare',
        },
      }));
      jest.doMock('@/services/notificationRegistry', () => ({
        isCategoryEnabled: () => true,
        getCategory: (id: string) => ({ id, labelAr: id, descriptionAr: id, defaultOn: true, available: true }),
      }));
      const sched = require('@/services/notificationScheduler');
      await sched.reconcileHorizonAsync([entry('prayer-fajr', '2026-07-09', 5)]);
      expect(Mock.__getScheduleCalls()).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// T107 (INVERTED — see spec amendment "US4 descoped; wird moves to a repeating
// trigger"): the repeating DAILY wird trigger (data.category === 'wird-daily'
// with NO localDay) is now the CANONICAL, intended wird state — not legacy
// debris. The horizon owns the five prayer categories ONLY, so a reconcile MUST
// NEVER touch a `wird-daily` request. The old assertion (that reconcile tears it
// down) is now the bug; this pins the survival guarantee instead.
// ---------------------------------------------------------------------------
describe('T107 repeating DAILY wird trigger survives reconcile', () => {
  it('leaves a repeating wird-daily request untouched across a prayer reconcile', async () => {
    Mock.__setScheduledNotifications([
      { identifier: 'wird-repeating', content: { data: { category: 'wird-daily' } } },
    ]);

    // A normal prayer-only horizon reconcile.
    await reconcileHorizonAsync([entry('prayer-fajr', '2026-07-09', 5)]);

    // The repeating wird trigger must NOT be cancelled...
    expect(Mock.__getCancelCalls()).not.toContain('wird-repeating');
    // ...and must still be armed afterwards.
    expect(
      Mock.__getScheduledNotifications().some((n) => n.identifier === 'wird-repeating'),
    ).toBe(true);
    // The prayer entry is armed alongside it.
    expect(keysOf()).toContain('prayer-fajr|2026-07-09');
  });
});

// ---------------------------------------------------------------------------
// T104: mass-cancel guard. A reconcile assembled through the orchestrator (the
// path notePageRead uses) must NOT drop prayer entries. The regression this
// guards: any caller building a PARTIAL HorizonInput (no prayerTimesFor) makes
// `intended` prayer-free, and the TOTAL reconcile then cancels all five prayers
// across the horizon. Centralising assembly in `assembleAndReconcile` (T103)
// prevents that. Before T103 exists this fails to import.
// ---------------------------------------------------------------------------
describe('T104 mass-cancel guard (orchestrator assembly path)', () => {
  afterEach(() => {
    setPrayerTimesProvider(null);
  });

  function tomorrowLocalDay(): string {
    const t = new Date();
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, 12, 0, 0, 0);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  it('leaves all prayer entries intact through the notePageRead reconcile path', async () => {
    // Inject real prayer times for every day (US3's future swap-in).
    setPrayerTimesProvider((localDay) => {
      const [y, m, d] = localDay.split('-').map(Number);
      const at = (h: number, min: number) => new Date(y, m - 1, d, h, min, 0, 0);
      return {
        localDay,
        fajr: at(5, 0),
        dhuhr: at(12, 0),
        asr: at(15, 0),
        maghrib: at(18, 0),
        isha: at(19, 30),
      };
    });

    const tomorrow = tomorrowLocalDay();
    const fajrArmedTomorrow = () =>
      Mock.__getScheduledNotifications().some((n) => {
        const data = n.content.data ?? {};
        return data.category === 'prayer-fajr' && data.localDay === tomorrow;
      });

    // First assembly arms the horizon (default settings enable all prayers).
    await assembleAndReconcile();
    expect(fajrArmedTomorrow()).toBe(true);

    // The notePageRead path reconciles again — prayers must survive.
    await assembleAndReconcile();
    expect(fajrArmedTomorrow()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cancelEntryAsync: cancels exactly one (category, localDay) entry.
// ---------------------------------------------------------------------------
describe('cancelEntryAsync', () => {
  it('cancels only the single matching entry', async () => {
    Mock.__setScheduledNotifications([
      { identifier: 'w9', content: { data: { category: 'wird-daily', localDay: '2026-07-09' } } },
      { identifier: 'w10', content: { data: { category: 'wird-daily', localDay: '2026-07-10' } } },
    ]);

    await cancelEntryAsync('wird-daily', '2026-07-09');

    expect(Mock.__getCancelCalls()).toEqual(['w9']);
    expect(Mock.__getScheduledNotifications().map((n) => n.identifier)).toEqual(['w10']);
  });
});
