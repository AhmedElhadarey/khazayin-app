/**
 * Tests for `services/notificationScheduler` (T-NS-1..T-NS-8).
 *
 * Uses the manual `__mocks__/expo-notifications.ts` (auto-resolved by Jest)
 * and an inline mock for `@/services/notificationRegistry` so this test does
 * not depend on the parallel registry track being landed.
 */

import * as MockNotifications from 'expo-notifications';

import {
  bootstrapNotificationHandler,
  cancelWirdReminderAsync,
  getPermissionAsync,
  requestPermissionAsync,
  scheduleWirdReminderAsync,
} from '@/services/notificationScheduler';

// ---------------------------------------------------------------------------
// Helpers to access the manual-mock test surface with typed handles.
// ---------------------------------------------------------------------------
type MockSurface = typeof MockNotifications & {
  __setPermissionResponse: (status: 'granted' | 'denied' | 'undetermined') => void;
  __getScheduleCalls: () => ReadonlyArray<{
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
    trigger: { type: string; hour?: number; minute?: number } | null;
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
// Each test overrides the return value via `isCategoryEnabledMock.mockReturnValue(...)`.
// ---------------------------------------------------------------------------
const mockIsCategoryEnabled = jest.fn<boolean, [string]>();
jest.mock('@/services/notificationRegistry', () => ({
  isCategoryEnabled: (id: string) => mockIsCategoryEnabled(id),
}));

beforeEach(() => {
  Mock.__resetMock();
  mockIsCategoryEnabled.mockReset();
  // Default to "enabled" so tests must opt-out for the disabled cases.
  mockIsCategoryEnabled.mockReturnValue(true);
});

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
// T-NS-2: schedule with a DAILY trigger when category enabled + granted
// ---------------------------------------------------------------------------
describe('T-NS-2 scheduleWirdReminderAsync (happy path)', () => {
  it('schedules a daily-repeating trigger with the given hour/minute', async () => {
    Mock.__setPermissionResponse('granted');

    const id = await scheduleWirdReminderAsync({ hour: 5, minute: 30 });

    expect(id).toEqual(expect.any(String));
    const calls = Mock.__getScheduleCalls();
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.trigger).toEqual(
      expect.objectContaining({
        type: 'daily',
        hour: 5,
        minute: 30,
      }),
    );
    expect(call.content.data).toEqual(expect.objectContaining({ category: 'wird-daily' }));
  });
});

// ---------------------------------------------------------------------------
// T-NS-3: category disabled -> null, no OS call
// ---------------------------------------------------------------------------
describe('T-NS-3 scheduleWirdReminderAsync (category disabled)', () => {
  it('returns null and never calls the OS when category is disabled', async () => {
    Mock.__setPermissionResponse('granted');
    mockIsCategoryEnabled.mockReturnValue(false);

    const id = await scheduleWirdReminderAsync({ hour: 8, minute: 0 });

    expect(id).toBeNull();
    expect(Mock.__getScheduleCalls()).toHaveLength(0);
    expect(mockIsCategoryEnabled).toHaveBeenCalledWith('wird-daily');
  });
});

// ---------------------------------------------------------------------------
// T-NS-4: permission denied -> null, no OS schedule
// ---------------------------------------------------------------------------
describe('T-NS-4 scheduleWirdReminderAsync (permission denied)', () => {
  it('returns null and never schedules when permission is denied', async () => {
    Mock.__setPermissionResponse('denied');

    const id = await scheduleWirdReminderAsync({ hour: 8, minute: 0 });

    expect(id).toBeNull();
    expect(Mock.__getScheduleCalls()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// T-NS-5: idempotency — second schedule cancels the first
// ---------------------------------------------------------------------------
describe('T-NS-5 scheduleWirdReminderAsync (idempotency)', () => {
  it('cancels any prior wird-daily before scheduling the next one', async () => {
    Mock.__setPermissionResponse('granted');

    const firstId = await scheduleWirdReminderAsync({ hour: 6, minute: 0 });
    expect(firstId).toEqual(expect.any(String));

    const secondId = await scheduleWirdReminderAsync({ hour: 7, minute: 15 });
    expect(secondId).toEqual(expect.any(String));

    // Two schedules total.
    expect(Mock.__getScheduleCalls()).toHaveLength(2);

    // First one must have been cancelled before the second was scheduled.
    expect(Mock.__getCancelCalls()).toContain(firstId);

    // Only one wird-daily entry should remain in the OS-side scheduled list.
    const wirdDaily = Mock.__getScheduledNotifications().filter(
      (n) => n.content.data?.category === 'wird-daily',
    );
    expect(wirdDaily).toHaveLength(1);
    expect(wirdDaily[0].identifier).toBe(secondId);
  });
});

// ---------------------------------------------------------------------------
// T-NS-6: cancel only touches `category === 'wird-daily'`
// ---------------------------------------------------------------------------
describe('T-NS-6 cancelWirdReminderAsync', () => {
  it('cancels only notifications tagged category === "wird-daily"', async () => {
    Mock.__setScheduledNotifications([
      { identifier: 'wird-1', content: { data: { category: 'wird-daily' } } },
      { identifier: 'announce-1', content: { data: { category: 'announcements-general' } } },
      { identifier: 'no-data', content: {} },
      { identifier: 'wird-2', content: { data: { category: 'wird-daily' } } },
    ]);

    await cancelWirdReminderAsync();

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

    await scheduleWirdReminderAsync({ hour: 5, minute: 30 });

    const call = Mock.__getScheduleCalls()[0];
    expect(call.content.title).toBe('تذكير الورد');
    expect(call.content.body).toBe('حان وقت قراءة وردك اليومي من القرآن الكريم.');
  });
});
