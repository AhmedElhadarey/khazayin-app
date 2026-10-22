/**
 * Re-attempts the catalogue load when a signal source changes (design §7.4).
 * Subscribe functions are injected so the wiring is testable without stores.
 * The gate check keeps §7.4 ordering: nothing loads before Home's first
 * fetches have settled.
 */
export type Subscribe = (listener: () => void) => () => void;

export function watchSignals(
  sources: readonly Subscribe[],
  isGateOpen: () => boolean,
  load: () => void,
): () => void {
  const onChange = () => {
    if (isGateOpen()) load();
  };
  const unsubscribers = sources.map((subscribe) => subscribe(onChange));
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
