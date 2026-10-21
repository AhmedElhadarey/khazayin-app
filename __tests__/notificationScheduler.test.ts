/**
 * Tests for `services/notificationScheduler` (T-NS-1..T-NS-8).
 *
 * Uses the manual `__mocks__/expo-notifications.ts` (auto-resolved by Jest)
 * and an inline mock for `@/services/notificationRegistry` so this test does
 * not depend on the parallel registry track being landed.
 *
 * The wird reminder is a one-shot DATE entry on the rolling horizon, armed
 * through `reconcileHorizonAsync` (design
 * docs/plans/2026-10-21-daily-wird-reminders-design.md §3.1).
 */

import * as MockNotifications from 'expo-notifications';

import {
  bootstrapNotificationHandler,
  cancelCategoryAsync,
  getPermissionAsync,
  reconcileHorizonAsync,
  requestPermissionAsync,
} from '@/services/notificationScheduler';
import type { HorizonEntry } from '@/services/notificationHorizon';

// ---------------------------------------------------------------------------
// Helpers to access the manual-mock test surface with typed handles.
// ---------------------------------------------------------------------------
type MockSurface = typeof MockNotifications & {
  __setPermissionResponse: (status: 'granted' | 'denied' | 'undetermined') => void;
  __getScheduleCalls: () => ReadonlyArray<{
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
    trigger: { type: string; date?: Date; channelId?: string } | null;
    identifier?: string;
  }>;
  __getCancelCalls: () => readonly string[];
  __getHandlerSetCount: () => number;
  __setScheduledNotifications: (
    arr: Array<{ identifier: string; content: { data?: { category?: string } } }>,
  ) => void;
  __getScheduledNotifications: () => ReadonlyArray<{
    identifier: string;
    content: { data?: { category?: string } };
  }>;
  __resetMock: () => void;
};

const Mock = MockNotifications as unknown as MockSurface;

// ---------------------------------------------------------------------------
// notificationRegistry is created in a parallel track; mock it inline.
// ---------------------------------------------------------------------------
jest.mock('@/services/notificationRegistry', () => ({
  getCategory: (id: string) => ({ id, labelAr: id, descriptionAr: id, defaultOn: true, available: true }),
}));

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

// ---------------------------------------------------------------------------
// T-NS-1: requestPermissionAsync mirrors the OS permission response
// ---------------------------------------------------------------------------
describe('T-NS-1 requestPermissionAsync', () => {
  it.each(['granted', 'denied', 'undetermined'] as const)(
    'resolves the mock permission response (%s)',
    async (status) => {
      Mock.__setPermissionResponse(status);
      await expect(requestPermissionAsync()).resolves.toBe(status);
      await expect(getPermissionAsync()).resolves.toBe(status);
    },
  );
});

// ---------------------------------------------------------------------------
// T-NS-2: a wird horizon entry is scheduled as a DATE trigger on its channel
// ---------------------------------------------------------------------------
describe('T-NS-2 reconcileHorizonAsync arms a wird entry (happy path)', () => {
  it('schedules a one-shot DATE trigger on the wird-daily channel', async () => {
    Mock.__setPermissionResponse('granted');
    const e = wirdEntry(5, 30);

    await reconcileHorizonAsync([e]);

    const calls = Mock.__getScheduleCalls();
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.trigger).toEqual(
      expect.objectContaining({ type: 'date', date: e.fireAt, channelId: 'wird-daily' }),
    );
    expect(call.content.data).toEqual(expect.objectContaining({ category: 'wird-daily' }));
  });
});

// T-NS-3 (category disabled → nothing armed) is covered by T-HO-4 in
// horizonOrchestrator.test.ts: a disabled category never reaches `intended`.

// ---------------------------------------------------------------------------
// T-NS-4: permission denied -> no OS schedule
// ---------------------------------------------------------------------------
describe('T-NS-4 reconcileHorizonAsync (permission denied)', () => {
  it('never schedules when permission is denied', async () => {
    Mock.__setPermissionResponse('denied');

    await reconcileHorizonAsync([wirdEntry(8, 0)]);

    expect(Mock.__getScheduleCalls()).toHaveLength(0);
  });
});

// T-NS-5 (idempotency) is covered by T-NHS-2 and T-NHS-12 in
// notificationHorizonScheduler.test.ts.

// ---------------------------------------------------------------------------
// T-NS-6: cancelCategoryAsync('wird-daily') only touches wird-tagged requests
// ---------------------------------------------------------------------------
describe('T-NS-6 cancelCategoryAsync(wird-daily)', () => {
  it('cancels only notifications tagged category === "wird-daily"', async () => {
    Mock.__setScheduledNotifications([
      { identifier: 'wird-1', content: { data: { category: 'wird-daily' } } },
      { identifier: 'announce-1', content: { data: { category: 'announcements-general' } } },
      { identifier: 'no-data', content: {} },
      { identifier: 'wird-2', content: { data: { category: 'wird-daily' } } },
    ]);

    await cancelCategoryAsync('wird-daily');

    const cancelled = [...Mock.__getCancelCalls()].sort();
    expect(cancelled).toEqual(['wird-1', 'wird-2']);

    const remaining = Mock.__getScheduledNotifications().map((n) => n.identifier).sort();
    expect(remaining).toEqual(['announce-1', 'no-data']);
  });
});

// ---------------------------------------------------------------------------
// T-NS-7: bootstrap idempotency
// ---------------------------------------------------------------------------
describe('T-NS-7 bootstrapNotificationHandler', () => {
  it('registers the handler at most once across repeated calls', () => {
    bootstrapNotificationHandler();
    bootstrapNotificationHandler();
    bootstrapNotificationHandler();

    expect(Mock.__getHandlerSetCount()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// T-NS-8: exact Arabic copy
// ---------------------------------------------------------------------------
describe('T-NS-8 scheduled content matches documented Arabic copy', () => {
  it('uses the exact title and body strings from the contract', async () => {
    Mock.__setPermissionResponse('granted');

    await reconcileHorizonAsync([wirdEntry(5, 30)]);

    const call = Mock.__getScheduleCalls()[0];
    expect(call.content.title).toBe('تذكير الورد');
    expect(call.content.body).toBe('حان وقت قراءة وردك اليومي من القرآن الكريم.');
  });
});
