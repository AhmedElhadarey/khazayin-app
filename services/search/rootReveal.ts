/**
 * One-slot signal: "the (tabs) root has reappeared". Lets the search modal
 * start lecture playback once its dismissal has finished.
 *
 * Why not the search screen's own `transitionEnd {closing: true}`: with
 * native-stack 7 + react-native-screens 4 (new arch) the popped route is
 * removed from `state.routes`, its SceneView unmounts and the native screen
 * loses its event emitter before the dismissal ends — the event never
 * arrives. The (tabs) route stays mounted and receives `onAppear` when the
 * full-screen modal over it closes, which native-stack emits as
 * `transitionEnd {closing: false}`; app/_layout.tsx forwards that here.
 *
 * One slot because only one search modal can be dismissing at a time. A
 * reveal with no subscriber is dropped, so an earlier, unrelated reveal can
 * never trigger a later subscription.
 */

let listener: (() => void) | null = null;

export function notifyRootRevealed(): void {
  const current = listener;
  listener = null;
  current?.();
}

/** Subscribe for the next reveal only; returns the unsubscribe. */
export function onRootRevealedOnce(fn: () => void): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
