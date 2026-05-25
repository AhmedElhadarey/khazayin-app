/**
 * Lecture completion + forward-only listened-seconds math.
 * Tested in `__tests__/lecture-completion.test.ts`.
 */

import { COMPLETION_THRESHOLD } from '@/constants/progress';

export function isCompleted(positionSec: number, durationSec: number): boolean {
  if (!Number.isFinite(positionSec) || !Number.isFinite(durationSec)) return false;
  if (durationSec <= 0) return false;
  return positionSec / durationSec >= COMPLETION_THRESHOLD;
}

/**
 * The player ticks with the current position; we want cumulative *forward*
 * listening time. If the user seeks back, the delta would be negative —
 * we clamp to 0 so rewinds never increase or decrease the total (FR-010).
 */
export function forwardDelta(prevPositionSec: number, newPositionSec: number): number {
  if (!Number.isFinite(prevPositionSec) || !Number.isFinite(newPositionSec)) return 0;
  const delta = newPositionSec - prevPositionSec;
  return delta > 0 ? delta : 0;
}
