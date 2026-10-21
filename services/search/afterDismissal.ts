/**
 * Run something once the search modal has finished closing. Pure.
 *
 * Why not InteractionManager.runAfterInteractions: on RN 0.81 it is a
 * setImmediate stub, so it fires mid-dismissal — and iOS drops an Alert
 * presented on a view controller that is being dismissed (design R8). The
 * caller subscribes to the (tabs) root reappearing under the closed modal
 * (services/search/rootReveal.ts); the bounded timer covers a platform that
 * never sends it. Whichever comes first wins; `run` is called exactly once.
 */

/** About the length of the iOS full-screen modal dismissal. */
export const DISMISS_FALLBACK_MS = 500;

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
