import {
  BREATHE_MS,
  GROW_MS,
  MAX_VISIBLE_MS,
  MIN_VISIBLE_MS,
  REDUCED_MOTION_MS,
  SCALE,
  SETTLE_MS,
  __resetLaunchSequenceForTests,
  resolveExit,
  shouldRunLaunchSequence,
} from '../launchTiming';

beforeEach(() => __resetLaunchSequenceForTests());

/**
 * Figma nodes 2001:888, 2001:914, 2007:511. The emblem's growth is the loading
 * signal, so these assert that the timeline follows readiness rather than a
 * fixed duration — the defect the rebuild exists to fix.
 */
describe('resolveExit', () => {
  it('waits for the minimum-visible floor when the app is ready sooner', () => {
    const exit = resolveExit({ readyAtMs: 120 });
    expect(exit.startsAtMs).toBe(MIN_VISIBLE_MS);
    expect(exit.heldForMinimum).toBe(true);
  });

  it('exits as soon as the app is ready once past the floor', () => {
    const exit = resolveExit({ readyAtMs: 2200 });
    expect(exit.startsAtMs).toBe(2200);
    expect(exit.heldForMinimum).toBe(false);
  });

  it('exits at the floor exactly when readiness lands on it', () => {
    const exit = resolveExit({ readyAtMs: MIN_VISIBLE_MS });
    expect(exit.startsAtMs).toBe(MIN_VISIBLE_MS);
    expect(exit.heldForMinimum).toBe(false);
  });

  it('hands over at the cap when the app never reports ready', () => {
    const exit = resolveExit({ readyAtMs: null });
    expect(exit.startsAtMs).toBe(MAX_VISIBLE_MS);
    expect(exit.endsAtMs).toBe(MAX_VISIBLE_MS + SETTLE_MS);
  });

  it('never waits past the cap for a very late readiness', () => {
    expect(resolveExit({ readyAtMs: MAX_VISIBLE_MS * 3 }).startsAtMs).toBe(MAX_VISIBLE_MS);
  });

  it('treats a negative readiness as immediate rather than negative', () => {
    // A clock skew or a ready-before-mount must not pull the exit backwards.
    const exit = resolveExit({ readyAtMs: -500 });
    expect(exit.startsAtMs).toBe(MIN_VISIBLE_MS);
  });

  it('ends exactly one settle after it starts', () => {
    const exit = resolveExit({ readyAtMs: 1500 });
    expect(exit.endsAtMs - exit.startsAtMs).toBe(exit.durationMs);
    expect(exit.durationMs).toBe(SETTLE_MS);
  });

  it('skips the floor and shortens the fade under Reduce Motion', () => {
    const exit = resolveExit({ readyAtMs: 50, reduceMotion: true });
    expect(exit.startsAtMs).toBe(50);
    expect(exit.durationMs).toBe(REDUCED_MOTION_MS);
    expect(exit.heldForMinimum).toBe(false);
  });

  it('still respects the cap under Reduce Motion', () => {
    expect(resolveExit({ readyAtMs: null, reduceMotion: true }).startsAtMs).toBe(MAX_VISIBLE_MS);
  });
});

describe('scale steps', () => {
  it('grows away from rest and breathes around the held size', () => {
    expect(SCALE.held).toBeGreaterThan(SCALE.rest);
    expect(SCALE.breatheLow).toBeLessThan(SCALE.held);
    expect(SCALE.breatheHigh).toBeGreaterThan(SCALE.held);
  });

  it('keeps the growth subtle enough not to crop on the narrowest screen', () => {
    // The emblem is 131pt wide inside a 320pt-wide frame at worst.
    expect(SCALE.breatheHigh).toBeLessThanOrEqual(1.15);
  });
});

describe('budgets', () => {
  it('shows the emblem long enough to register but not long enough to annoy', () => {
    expect(MIN_VISIBLE_MS).toBeGreaterThanOrEqual(600);
    expect(MIN_VISIBLE_MS).toBeLessThan(MAX_VISIBLE_MS);
  });

  it('finishes growing before the floor releases, so growth is never cut short', () => {
    expect(GROW_MS).toBeLessThanOrEqual(MIN_VISIBLE_MS);
  });
});

describe('shouldRunLaunchSequence', () => {
  it('runs on the first call of an app session', () => {
    expect(shouldRunLaunchSequence()).toBe(true);
  });

  it('never runs again — not on a tab return and not on Fast Refresh', () => {
    expect(shouldRunLaunchSequence()).toBe(true);
    expect(shouldRunLaunchSequence()).toBe(false);
    expect(shouldRunLaunchSequence()).toBe(false);
  });
});
