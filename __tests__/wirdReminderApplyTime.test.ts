/**
 * Tests for `applyWirdReminderTime` (T-WRA-1..T-WRA-5).
 *
 * THE DEFECT THIS PINS
 * --------------------
 * `wird-daily` is registered `defaultOn: true`, so the reminder switch is ALREADY
 * on for every new user. But `requestPermissionAsync` was called from exactly one
 * place in the codebase — inside `setWirdReminderEnabled(true)` — which only runs
 * when the user *flips* the switch. A switch that starts on is never flipped on.
 *
 * Consequence on a fresh install, in a real standalone build:
 *   boot → assembleAndReconcile → wird enabled → scheduleWirdReminderAsync
 *        → getPermissionsAsync() === 'undetermined' → return null
 *
 * iOS is never asked. The reminder can never fire. Setting a reminder time went
 * through `setWirdEnabledFromSettings(true)` → the same silent permission gate,
 * so even the one screen where the user unambiguously expresses intent armed
 * nothing. The only path that ever worked was toggling the reminder off and
 * back on.
 *
 * `applyWirdReminderTime` closes that hole: choosing a reminder time IS the
 * intent signal that justifies an OS permission prompt (Apple HIG: ask in
 * context, at the moment the value is legible — never at cold boot).
 */

const mockGetPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockRequestPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockSetEnabledFromSettings = jest.fn<Promise<void>, [boolean]>(async () => undefined);
const mockSetNotificationEnabled = jest.fn<void, [string, boolean]>(() => undefined);
const mockSetWirdReminderTime = jest.fn<void, [{ hour: number; minute: number }]>(() => undefined);

// Mutable so each test can model "reminder preference on/off".
let mockWirdPreference = true;

jest.mock('@/services/notificationScheduler', () => ({
  __esModule: true,
  getPermissionAsync: () => mockGetPermission(),
  requestPermissionAsync: () => mockRequestPermission(),
}));

jest.mock('@/store/wirdStore', () => ({
  __esModule: true,
  useWirdStore: {
    getState: () => ({ setWirdEnabledFromSettings: mockSetEnabledFromSettings }),
  },
}));

jest.mock('@/store/settingsStore', () => ({
  __esModule: true,
  useSettingsStore: {
    getState: () => ({
      setNotificationEnabled: mockSetNotificationEnabled,
      setWirdReminderTime: mockSetWirdReminderTime,
      notifications: { 'wird-daily': mockWirdPreference },
    }),
  },
}));

import { applyWirdReminderTime } from '@/services/wirdReminderToggle';

const FIVE_THIRTY_FIVE = { hour: 5, minute: 35 } as const;

beforeEach(() => {
  mockGetPermission.mockClear().mockResolvedValue('granted');
  mockRequestPermission.mockClear().mockResolvedValue('granted');
  mockSetEnabledFromSettings.mockClear();
  mockSetNotificationEnabled.mockClear();
  mockSetWirdReminderTime.mockClear();
  mockWirdPreference = true;
});

describe('T-WRA — applying a reminder time', () => {
  it('T-WRA-1: on a FRESH INSTALL (permission undetermined) it prompts, then arms', async () => {
    // This is the regression. The switch is default-on, so nothing had ever
    // requested permission; the time was saved and the trigger silently skipped.
    mockGetPermission.mockResolvedValue('undetermined');
    mockRequestPermission.mockResolvedValue('granted');

    const outcome = await applyWirdReminderTime(FIVE_THIRTY_FIVE);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('enabled');
    expect(mockSetWirdReminderTime).toHaveBeenCalledWith(FIVE_THIRTY_FIVE);
    expect(mockSetEnabledFromSettings).toHaveBeenCalledWith(true);
  });

  it('T-WRA-2: with permission already granted it arms without re-prompting', async () => {
    const outcome = await applyWirdReminderTime(FIVE_THIRTY_FIVE);

    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(outcome).toBe('enabled');
    expect(mockSetEnabledFromSettings).toHaveBeenCalledWith(true);
  });

  it('T-WRA-3: a denial still SAVES the chosen time but arms nothing', async () => {
    mockGetPermission.mockResolvedValue('denied');

    const outcome = await applyWirdReminderTime(FIVE_THIRTY_FIVE);

    expect(outcome).toBe('permission-denied');
    // The user's choice is not discarded just because the OS said no — they may
    // grant permission later, and the time must survive that round trip.
    expect(mockSetWirdReminderTime).toHaveBeenCalledWith(FIVE_THIRTY_FIVE);
    expect(mockSetEnabledFromSettings).not.toHaveBeenCalled();
  });

  it('T-WRA-4: when the reminder is OFF, the time is saved and permission is never asked', async () => {
    mockWirdPreference = false;

    const outcome = await applyWirdReminderTime(FIVE_THIRTY_FIVE);

    expect(outcome).toBe('disabled');
    expect(mockSetWirdReminderTime).toHaveBeenCalledWith(FIVE_THIRTY_FIVE);
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockSetEnabledFromSettings).not.toHaveBeenCalled();
  });

  it('T-WRA-5: applying a time never flips the stored on/off preference', async () => {
    await applyWirdReminderTime(FIVE_THIRTY_FIVE);

    // Choosing *when* to be reminded is orthogonal to *whether* to be reminded.
    expect(mockSetNotificationEnabled).not.toHaveBeenCalled();
  });
});
