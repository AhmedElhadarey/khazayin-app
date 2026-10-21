import { DISMISS_FALLBACK_MS, runOnceAfterDismissal } from '@/services/search/afterDismissal';

/** A fake close event + timer pair the test fires by hand. */
function harness() {
  const calls: string[] = [];
  let closeListener: (() => void) | null = null;
  let timer: { fire: () => void; ms: number } | null = null;
  runOnceAfterDismissal({
    onClosed: (fire) => {
      closeListener = fire;
      return () => { calls.push('unsubscribe'); closeListener = null; };
    },
    setTimer: (fire, ms) => {
      timer = { fire, ms };
      return () => { calls.push('cancelTimer'); };
    },
    run: () => calls.push('run'),
  });
  return {
    calls,
    close: () => closeListener?.(),
    fireTimer: () => timer?.fire(),
    timerMs: () => timer?.ms,
  };
}

describe('runOnceAfterDismissal', () => {
  it('waits for the close transition, not the next tick', () => {
    const h = harness();
    expect(h.calls).toEqual([]);
    h.close();
    expect(h.calls).toEqual(['unsubscribe', 'cancelTimer', 'run']);
  });

  it('falls back to a bounded timer when the close event never comes', () => {
    const h = harness();
    expect(h.timerMs()).toBe(DISMISS_FALLBACK_MS);
    h.fireTimer();
    expect(h.calls).toEqual(['unsubscribe', 'cancelTimer', 'run']);
  });

  it('runs exactly once when both the event and the fallback fire', () => {
    const h = harness();
    h.close();
    h.fireTimer();
    h.close();
    expect(h.calls.filter((c) => c === 'run')).toHaveLength(1);
  });

  it('keeps the fallback bounded', () => {
    expect(DISMISS_FALLBACK_MS).toBeGreaterThanOrEqual(300);
    expect(DISMISS_FALLBACK_MS).toBeLessThanOrEqual(1500);
  });

  it('outlasts the ~500ms iOS full-screen dismissal, so the real reveal signal usually wins', () =>
    expect(DISMISS_FALLBACK_MS).toBeGreaterThan(500));

  it('copes with a subscription that fires synchronously', () => {
    const calls: string[] = [];
    runOnceAfterDismissal({
      onClosed: (fire) => { fire(); return () => calls.push('unsubscribe'); },
      setTimer: () => { calls.push('setTimer'); return () => calls.push('cancelTimer'); },
      run: () => calls.push('run'),
    });
    expect(calls).toEqual(['run', 'unsubscribe']);
  });
});
