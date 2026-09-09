/**
 * The launch sequence timing model.
 *
 * The app previously collapsed the four Figma launch states into one static
 * image. These are the post-native states, in order, reproducing nodes
 * 2001:888 (background and wordmark), 2001:914 (centre emblem), and 2007:511
 * (the exit hold before Home). Node 2001:835 is the frame that shows Home
 * behind the launch layer — the state this sequence exists to prevent
 * flashing.
 *
 * Kept pure and separate from the overlay so the timing, the cold-start guard,
 * and the Reduce Motion path are asserted without a renderer or fake timers.
 */

export type LaunchPhase = 'background' | 'emblem' | 'hold';

export type LaunchStep = {
  phase: LaunchPhase;
  /** The Figma node this step reproduces. */
  nodeId: string;
  durationMs: number;
};

/** Design specification section 6.1 budgets the whole sequence at 600-1200ms. */
export const LAUNCH_PHASES: readonly LaunchStep[] = Object.freeze([
  Object.freeze({ phase: 'background', nodeId: '2001:888', durationMs: 240 }),
  Object.freeze({ phase: 'emblem', nodeId: '2001:914', durationMs: 520 },),
  Object.freeze({ phase: 'hold', nodeId: '2007:511', durationMs: 240 }),
] as LaunchStep[]);

export const LAUNCH_TOTAL_MS = LAUNCH_PHASES.reduce(
  (sum, step) => sum + step.durationMs,
  0,
);

/** Reduce Motion shows one final state and fades straight to Home. */
export const REDUCED_MOTION_MS = 240;

export function launchSequence({ reduceMotion }: { reduceMotion: boolean }): LaunchStep[] {
  if (reduceMotion) {
    return [{ phase: 'hold', nodeId: '2007:511', durationMs: REDUCED_MOTION_MS }];
  }
  return LAUNCH_PHASES.map((step) => ({ ...step }));
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
