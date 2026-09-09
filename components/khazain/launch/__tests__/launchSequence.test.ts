import {
  LAUNCH_PHASES,
  LAUNCH_TOTAL_MS,
  REDUCED_MOTION_MS,
  __resetLaunchSequenceForTests,
  launchSequence,
  shouldRunLaunchSequence,
} from '../launchTiming';

beforeEach(() => __resetLaunchSequenceForTests());

/**
 * Figma nodes 2001:835, 2001:888, 2001:914, 2007:511 — the four launch states
 * the app previously collapsed into one static image.
 */
describe('launchSequence', () => {
  it('reproduces the reference phases in order', () => {
    expect(launchSequence({ reduceMotion: false }).map((p) => p.phase)).toEqual([
      'background',
      'emblem',
      'hold',
    ]);
  });

  it('names the Figma node each phase reproduces', () => {
    expect(launchSequence({ reduceMotion: false }).map((p) => p.nodeId)).toEqual([
      '2001:888',
      '2001:914',
      '2007:511',
    ]);
  });

  it('lands inside the 600-1200ms budget', () => {
    expect(LAUNCH_TOTAL_MS).toBeGreaterThanOrEqual(600);
    expect(LAUNCH_TOTAL_MS).toBeLessThanOrEqual(1200);
    expect(LAUNCH_PHASES.reduce((sum, p) => sum + p.durationMs, 0)).toBe(LAUNCH_TOTAL_MS);
  });

  it('gives every phase a positive duration', () => {
    LAUNCH_PHASES.forEach((phase) => {
      expect([phase.phase, phase.durationMs > 0]).toEqual([phase.phase, true]);
    });
  });

  it('collapses to a single final state under Reduce Motion', () => {
    const reduced = launchSequence({ reduceMotion: true });
    expect(reduced).toHaveLength(1);
    expect(reduced[0].phase).toBe('hold');
    expect(reduced[0].durationMs).toBe(REDUCED_MOTION_MS);
    expect(REDUCED_MOTION_MS).toBeLessThan(LAUNCH_TOTAL_MS);
  });

  it('never mutates the shared phase table', () => {
    launchSequence({ reduceMotion: false }).push({
      phase: 'hold',
      nodeId: 'x',
      durationMs: 1,
    });
    expect(LAUNCH_PHASES).toHaveLength(3);
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
