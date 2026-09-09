/**
 * The launch sequence timing model — Figma nodes 2001:888 (background and
 * wordmark), 2001:914 (centre emblem), 2007:511 (the exit hold before Home).
 *
 * The emblem grows as the loading signal, so the timeline is driven by when the
 * app actually became ready rather than by a fixed duration: a slow boot keeps
 * breathing, a fast one still shows the emblem long enough to register.
 *
 * Kept pure and separate from the overlay so the exit rule, the minimum-visible
 * floor and the Reduce Motion path are asserted without a renderer or fake
 * timers.
 */

/** Scale-in from rest to the held size. */
export const GROW_MS = 760;

/** How long one breathe cycle takes while the app is still loading. */
export const BREATHE_MS = 1400;

/** Settle back to rest and cross-fade to the app. */
export const SETTLE_MS = 320;

/**
 * The emblem is never on screen for less than this. Without a floor, a boot
 * that resolves in 150ms shows a blink instead of a launch.
 */
export const MIN_VISIBLE_MS = 900;

/**
 * Stop growing and hand over regardless, so a boot that never reports ready
 * cannot strand the user on the splash.
 */
export const MAX_VISIBLE_MS = 6000;

/** Reduce Motion shows one static state and fades straight to Home. */
export const REDUCED_MOTION_MS = 320;

/** Rest, held, and the two ends of the breathe loop, as scale multipliers. */
export const SCALE = Object.freeze({
  rest: 1.0,
  held: 1.08,
  breatheLow: 1.04,
  breatheHigh: 1.1,
});

export type LaunchExit = {
  /** When the settle animation starts, measured from overlay mount. */
  startsAtMs: number;
  /** How long the settle and cross-fade take. */
  durationMs: number;
  /** The overlay is gone at this point. */
  endsAtMs: number;
  /** True when the floor, not the app, decided the timing. */
  heldForMinimum: boolean;
};

/**
 * When the overlay should begin handing control back.
 *
 * `readyAtMs` is when the navigator became ready, measured from overlay mount,
 * or null while it still has not. Readiness before the floor waits for the
 * floor; readiness after it exits immediately; no readiness at all exits at the
 * cap.
 */
export function resolveExit({
  readyAtMs,
  reduceMotion = false,
}: {
  readyAtMs: number | null;
  reduceMotion?: boolean;
}): LaunchExit {
  const durationMs = reduceMotion ? REDUCED_MOTION_MS : SETTLE_MS;
  const floor = reduceMotion ? 0 : MIN_VISIBLE_MS;

  if (readyAtMs === null) {
    return {
      startsAtMs: MAX_VISIBLE_MS,
      durationMs,
      endsAtMs: MAX_VISIBLE_MS + durationMs,
      heldForMinimum: false,
    };
  }

  const capped = Math.min(Math.max(readyAtMs, 0), MAX_VISIBLE_MS);
  const startsAtMs = Math.max(capped, floor);
  return {
    startsAtMs,
    durationMs,
    endsAtMs: startsAtMs + durationMs,
    heldForMinimum: startsAtMs > capped,
  };
}

let hasRun = false;

/**
 * True exactly once per app session. A tab return, a re-render, and a Fast
 * Refresh all get `false`, so the overlay is a cold-start experience rather
 * than something the user sees again mid-session.
 */
export function shouldRunLaunchSequence(): boolean {
  if (hasRun) return false;
  hasRun = true;
  return true;
}

/** Test-only: resets the module-level cold-start guard. */
export function __resetLaunchSequenceForTests(): void {
  hasRun = false;
}
