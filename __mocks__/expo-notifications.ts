/**
 * Manual Jest mock for `expo-notifications`.
 *
 * Auto-picked-up by Jest when modules import `expo-notifications`.
 * Mirrors only the subset of the real surface that `services/notificationScheduler.ts`
 * touches, and exposes a handful of `__`-prefixed test helpers that are NOT part
 * of the real package.
 *
 * Implementation notes:
 *  - We do NOT import the real `expo-notifications` types here. The native module
 *    pulls in `react-native` / `expo-modules-core` at import time, which is fragile
 *    in a Jest environment. Re-declaring the surface keeps the mock self-contained.
 *  - The exported functions are typed as loosely as the real API allows; the
 *    consumer (scheduler) re-asserts the precise shapes it expects. The mock uses
 *    a single locally-scoped permissive type alias for handler/content payloads
 *    so we never need `any` at the exported boundary.
 */

type Json = Record<string, unknown>;

export enum SchedulableTriggerInputTypes {
  CALENDAR = 'calendar',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  DATE = 'date',
  TIME_INTERVAL = 'timeInterval',
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface MockPermissionResponse {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never';
}

export interface MockNotificationContentInput {
  title?: string | null;
  body?: string | null;
  data?: Json;
}

export interface MockDailyTriggerInput {
  type: SchedulableTriggerInputTypes.DAILY;
  hour: number;
  minute: number;
  channelId?: string;
}

export type MockTriggerInput =
  | MockDailyTriggerInput
  | { type: SchedulableTriggerInputTypes; [key: string]: unknown }
  | null;

export interface MockScheduleRequest {
  identifier?: string;
  content: MockNotificationContentInput;
  trigger: MockTriggerInput;
}

export interface MockScheduledNotification {
  identifier: string;
  content: { data?: { category?: string } & Json };
  trigger?: MockTriggerInput;
}

export interface MockNotificationHandler {
  handleNotification: (notification: unknown) => Promise<unknown>;
  handleSuccess?: (id: string) => void;
  handleError?: (id: string, err: unknown) => void;
}

// ---------------------------------------------------------------------------
// Internal mock state
// ---------------------------------------------------------------------------

let permResponse: MockPermissionResponse = {
  status: 'undetermined',
  granted: false,
  canAskAgain: true,
  expires: 'never',
};

const scheduleCalls: MockScheduleRequest[] = [];
const cancelCalls: string[] = [];
let allCancelCount = 0;
let handlerSetCount = 0;
let scheduledNotifications: MockScheduledNotification[] = [];
let nextIdentifier = 1;
let currentHandler: MockNotificationHandler | null = null;
let scheduleRejections = 0;

// ---------------------------------------------------------------------------
// Mocked public API surface
// ---------------------------------------------------------------------------

export function setNotificationHandler(handler: MockNotificationHandler | null): void {
  if (handler !== null) {
    handlerSetCount += 1;
  }
  currentHandler = handler;
}

export async function getPermissionsAsync(): Promise<MockPermissionResponse> {
  return permResponse;
}

export async function requestPermissionsAsync(): Promise<MockPermissionResponse> {
  return permResponse;
}

export async function scheduleNotificationAsync(
  request: MockScheduleRequest,
): Promise<string> {
  if (scheduleRejections > 0) {
    // Models iOS rejecting a DATE trigger whose instant has just passed.
    scheduleRejections -= 1;
    throw new Error('mock: scheduleNotificationAsync rejected');
  }
  const identifier = request.identifier ?? `mock-id-${nextIdentifier}`;
  nextIdentifier += 1;
  scheduleCalls.push({ ...request, identifier });
  // Reflect into the "currently scheduled" list so cancel flow can see it.
  // `data` is JSON round-tripped, as the native bridge serialises it: whatever
  // the scheduler reads back from `getAllScheduledNotificationsAsync` is a
  // copy, never the object it scheduled.
  scheduledNotifications.push({
    identifier,
    content: {
      data: JSON.parse(JSON.stringify(request.content.data ?? {})) as { category?: string } & Json,
    },
    trigger: request.trigger,
  });
  return identifier;
}

export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  cancelCalls.push(identifier);
  scheduledNotifications = scheduledNotifications.filter((n) => n.identifier !== identifier);
}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  allCancelCount += 1;
  scheduledNotifications = [];
}

export async function getAllScheduledNotificationsAsync(): Promise<MockScheduledNotification[]> {
  return scheduledNotifications;
}

// ---------------------------------------------------------------------------
// Test helpers (NOT part of the real package)
// ---------------------------------------------------------------------------

export function __setPermissionResponse(status: PermissionStatus): void {
  permResponse = {
    status,
    granted: status === 'granted',
    canAskAgain: status !== 'denied',
    expires: 'never',
  };
}

export function __getScheduleCalls(): readonly MockScheduleRequest[] {
  return scheduleCalls;
}

export function __getCancelCalls(): readonly string[] {
  return cancelCalls;
}

export function __getAllCancelCount(): number {
  return allCancelCount;
}

export function __getHandlerSetCount(): number {
  return handlerSetCount;
}

/** The handler most recently installed via `setNotificationHandler`, so tests
 *  can invoke `handleNotification` directly. */
export function __getHandler(): MockNotificationHandler | null {
  return currentHandler;
}

/** Make the next `n` `scheduleNotificationAsync` calls reject. */
export function __rejectNextSchedules(n: number): void {
  scheduleRejections = n;
}

export function __setScheduledNotifications(arr: MockScheduledNotification[]): void {
  scheduledNotifications = arr.slice();
}

export function __getScheduledNotifications(): readonly MockScheduledNotification[] {
  return scheduledNotifications;
}

export function __resetMock(): void {
  permResponse = {
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
    expires: 'never',
  };
  scheduleCalls.length = 0;
  cancelCalls.length = 0;
  allCancelCount = 0;
  handlerSetCount = 0;
  scheduledNotifications = [];
  nextIdentifier = 1;
  currentHandler = null;
  scheduleRejections = 0;
}
