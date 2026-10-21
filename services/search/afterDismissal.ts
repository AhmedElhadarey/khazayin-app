/**
 * Run something once the search modal has finished closing. Pure.
 *
 * Why not InteractionManager.runAfterInteractions: on RN 0.81 it is a
 * setImmediate stub, so it fires mid-dismissal and a no-audio Alert would
 * appear over the still-closing search screen. The Alert itself is safe —
 * RCTAlertController presents it in its own UIWindow above everything — so
 * waiting is a UX choice, not a correctness one (design R8). The caller subscribes to the (tabs) root reappearing under the closed modal
 * (services/search/rootReveal.ts); the bounded timer covers a platform that
 * never sends it. Whichever comes first wins; `run` is called exactly once.
 */

/**
 * Bound on the wait. Comfortably longer than the ~500ms iOS full-screen
 * dismissal, so the real (tabs) reveal signal normally wins the race.
 */
export const DISMISS_FALLBACK_MS = 1000;

export function runOnceAfterDismissal(deps: {
  /** Subscribe to the close transition; returns the unsubscribe. */
  onClosed: (fire: () => void) => () => void;
  /** Schedule the fallback; returns its cancel. */
  setTimer: (fire: () => void, ms: number) => () => void;
  run: () => void;
}): void {
  let done = false;
  let unsubscribe: (() => void) | null = null;
  let cancelTimer: (() => void) | null = null;

  const fire = () => {
    if (done) return;
    done = true;
    unsubscribe?.();
    cancelTimer?.();
    deps.run();
  };

  unsubscribe = deps.onClosed(fire);
  if (done) {
    // The subscription fired synchronously, before its unsubscribe existed.
    unsubscribe();
    return;
  }
  cancelTimer = deps.setTimer(fire, DISMISS_FALLBACK_MS);
}
