/**
 * Manual Jest mock for `expo-location`.
 *
 * Auto-picked-up by Jest when modules import `expo-location`.
 * Mirrors only the subset of the real surface that `services/locationService.ts`
 * touches, and exposes a handful of `__`-prefixed test helpers that are NOT part
 * of the real package.
 *
 * Implementation notes:
 *  - We do NOT import the real `expo-location` types here. The native module
 *    pulls in `react-native` / `expo-modules-core` at import time, which is fragile
 *    in a Jest environment. Re-declaring the surface keeps the mock self-contained.
 *  - The exported functions are typed as narrowly as the real API allows; the
 *    consumer (locationService) re-asserts the precise shapes it expects. No `any`
 *    appears at the exported boundary.
 */

// Mirrors `LocationAccuracy` (re-exported as `Accuracy`). Numeric values match
// the real enum so a consumer asserting on `Accuracy.Balanced` sees `3`.
export enum Accuracy {
  Lowest = 1,
  Low = 2,
  Balanced = 3,
  High = 4,
  Highest = 5,
  BestForNavigation = 6,
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface MockPermissionResponse {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never';
}

export interface MockLocationOptions {
  accuracy?: Accuracy;
  [key: string]: unknown;
}

export interface MockLocationObjectCoords {
  latitude: number;
  longitude: number;
}

export interface MockLocationObject {
  coords: MockLocationObjectCoords;
  timestamp: number;
}

export interface MockGeocodedAddress {
  isoCountryCode: string | null;
  [key: string]: unknown;
}

export interface MockReverseGeocodeInput {
  latitude: number;
  longitude: number;
}

// ---------------------------------------------------------------------------
// Internal mock state
// ---------------------------------------------------------------------------

function makePermResponse(status: PermissionStatus): MockPermissionResponse {
  return {
    status,
    granted: status === 'granted',
    canAskAgain: status !== 'denied',
    expires: 'never',
  };
}

let permResponse: MockPermissionResponse = makePermResponse('undetermined');

let lastKnownPosition: MockLocationObject | null = null;
let currentPosition: MockLocationObject | null = null;
let currentPositionError: Error | null = null;
let reverseGeocodeResult: MockGeocodedAddress[] = [];
let reverseGeocodeError: Error | null = null;

let lastKnownCallCount = 0;
const getCurrentPositionCalls: MockLocationOptions[] = [];
const reverseGeocodeCalls: MockReverseGeocodeInput[] = [];

// ---------------------------------------------------------------------------
// Mocked public API surface
// ---------------------------------------------------------------------------

export async function getForegroundPermissionsAsync(): Promise<MockPermissionResponse> {
  return permResponse;
}

export async function requestForegroundPermissionsAsync(): Promise<MockPermissionResponse> {
  return permResponse;
}

export async function getLastKnownPositionAsync(): Promise<MockLocationObject | null> {
  lastKnownCallCount += 1;
  return lastKnownPosition;
}

export async function getCurrentPositionAsync(
  options?: MockLocationOptions,
): Promise<MockLocationObject> {
  getCurrentPositionCalls.push(options ?? {});
  if (currentPositionError !== null) {
    throw currentPositionError;
  }
  if (currentPosition === null) {
    throw new Error('mock: currentPosition not set');
  }
  return currentPosition;
}

export async function reverseGeocodeAsync(
  location: MockReverseGeocodeInput,
): Promise<MockGeocodedAddress[]> {
  reverseGeocodeCalls.push(location);
  if (reverseGeocodeError !== null) {
    throw reverseGeocodeError;
  }
  return reverseGeocodeResult;
}

// ---------------------------------------------------------------------------
// Test helpers (NOT part of the real package)
// ---------------------------------------------------------------------------

export function __setPermissionStatus(status: PermissionStatus): void {
  permResponse = makePermResponse(status);
}

export function __setLastKnownPosition(position: MockLocationObject | null): void {
  lastKnownPosition = position;
}

export function __setCurrentPosition(position: MockLocationObject | null): void {
  currentPosition = position;
  currentPositionError = null;
}

export function __setCurrentPositionError(error: Error | null): void {
  currentPositionError = error;
}

export function __setReverseGeocodeResult(result: MockGeocodedAddress[]): void {
  reverseGeocodeResult = result;
  reverseGeocodeError = null;
}

export function __setReverseGeocodeError(error: Error | null): void {
  reverseGeocodeError = error;
}

export function __getLastKnownCallCount(): number {
  return lastKnownCallCount;
}

export function __getCurrentPositionCalls(): readonly MockLocationOptions[] {
  return getCurrentPositionCalls;
}

export function __getReverseGeocodeCalls(): readonly MockReverseGeocodeInput[] {
  return reverseGeocodeCalls;
}

export function __resetMock(): void {
  permResponse = makePermResponse('undetermined');
  lastKnownPosition = null;
  currentPosition = null;
  currentPositionError = null;
  reverseGeocodeResult = [];
  reverseGeocodeError = null;
  lastKnownCallCount = 0;
  getCurrentPositionCalls.length = 0;
  reverseGeocodeCalls.length = 0;
}
