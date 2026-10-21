import {
  BACKDROP_FADE_MS,
  EMBLEM_SCALE,
  FIGMA_EASE,
  HOME_REVEAL_AT_MS,
  MAX_VISIBLE_MS,
  PATTERN_TILE,
  REDUCED_MOTION_FLOOR_MS,
  REDUCED_MOTION_MS,
  STEP_MS,
  STEP_STARTS,
  __resetLaunchSequenceForTests,
  emblemPose,
  isDeepLinkLaunch,
  isRevealReady,
  launchMode,
  patternTiles,
  resolveHomeReveal,
  shouldRunLaunchSequence,
} from '../launchTiming';

beforeEach(() => __resetLaunchSequenceForTests());

/**
 * The Splash section of the Mobile page, 2132:2371: four frames linked
 * 2001:888 → 2001:914 → 2001:835 → 2007:511 → Home (2001:940), every link an
 * AFTER_TIMEOUT smart-animate. These pin the prototype's own numbers, because
 * the brief is to play its steps exactly.
 */
describe('the prototype timeline', () => {
  it('holds and moves for exactly the durations the links state', () => {
    expect(STEP_MS).toEqual({
      hold1: 800, drop: 2000,
      hold2: 800, grow: 2000,
      hold3: 300, exit: 800,
      hold4: 300, homeSlide: 800,
    });
  });

  it('starts each move where the previous hold ends', () => {
    expect(STEP_STARTS).toEqual({ drop: 800, grow: 3600, exit: 5900, home: 7000 });
    expect(HOME_REVEAL_AT_MS).toBe(7000);
  });

  it('uses the curve the file stores for OUT_CUBIC', () => {
    // Stored as 0.5799999833 — float32 for 0.58.
    expect(FIGMA_EASE).toEqual([0, 0, 0.58, 1]);
  });

  it('brings the backdrop up inside the first hold, before anything moves', () => {
    expect(BACKDROP_FADE_MS).toBeLessThan(STEP_MS.hold1);
  });
});

describe('emblemPose', () => {
  // Frame height in the file; every pose below is read off its four frames.
  const H = 852;

  it('starts above the top edge (2001:888)', () => {
    const p = emblemPose(1, H);
    expect(p.scale).toBe(1);
    expect(p.translateY).toBeCloseTo(-535.5, 1);
  });

  it('drops to the centre (2001:914)', () => {
    expect(emblemPose(2, H)).toEqual({ translateY: 0, scale: 1 });
  });

  it('grows to 201.4 x 279 in place (2001:835)', () => {
    const p = emblemPose(3, H);
    expect(p.translateY).toBe(0);
    expect(p.scale).toBeCloseTo(201.4 / 130.7, 3);
    expect(EMBLEM_SCALE.grown).toBeCloseTo(1.541, 3);
  });

  it('shrinks to 70.6 x 97.7 and leaves through the top (2007:511)', () => {
    const p = emblemPose(4, H);
    expect(p.scale).toBeCloseTo(70.6 / 130.7, 3);
    expect(p.translateY).toBeCloseTo(-510.5, 1);
  });

  it.each([568, 667, 844, 932])('keeps both off-screen poses just out of view at %ipt', (h) => {
    // The emblem is 181 tall at rest. Its top edge sits at h/2 - 90.5.
    const top1 = h / 2 - 90.5 + emblemPose(1, h).translateY;
    expect(top1 + 181).toBeCloseTo(-19, 5);
    const centre4 = h / 2 + emblemPose(4, h).translateY;
    expect(centre4).toBeCloseTo(-84.5, 5);
  });
});

describe('resolveHomeReveal', () => {
  it('waits for the whole sequence when the app is ready sooner', () => {
    const r = resolveHomeReveal({ readyAtMs: 400, mode: 'full' });
    expect(r.startsAtMs).toBe(HOME_REVEAL_AT_MS);
    expect(r.durationMs).toBe(STEP_MS.homeSlide);
    expect(r.endsAtMs).toBe(7800);
    expect(r.heldForApp).toBe(false);
  });

  it('holds on step 4 until a late app is ready', () => {
    const r = resolveHomeReveal({ readyAtMs: 9200, mode: 'full' });
    expect(r.startsAtMs).toBe(9200);
    expect(r.heldForApp).toBe(true);
  });

  it('treats a negative readiness as already ready', () => {
    expect(resolveHomeReveal({ readyAtMs: -500, mode: 'full' }).startsAtMs).toBe(HOME_REVEAL_AT_MS);
  });

  it.each(['reduced', 'brief'] as const)('skips the travel on the %s path: a short floor, then a fade', (mode) => {
    const early = resolveHomeReveal({ readyAtMs: 50, mode });
    expect(early.startsAtMs).toBe(REDUCED_MOTION_FLOOR_MS);
    expect(early.durationMs).toBe(REDUCED_MOTION_MS);
    expect(resolveHomeReveal({ readyAtMs: 2000, mode }).startsAtMs).toBe(2000);
  });
});

describe('isRevealReady', () => {
  it('waits for the navigator and the onboarding decision together', () => {
    // Revealing before the decision would slide Home up and then swap it for
    // onboarding mid-flight on a first run.
    expect(isRevealReady({ navigatorReady: true, onboardingDecided: false, capReached: false })).toBe(false);
    expect(isRevealReady({ navigatorReady: false, onboardingDecided: true, capReached: false })).toBe(false);
    expect(isRevealReady({ navigatorReady: true, onboardingDecided: true, capReached: false })).toBe(true);
  });

  it('stops waiting for the decision at the cap', () => {
    expect(isRevealReady({ navigatorReady: true, onboardingDecided: false, capReached: true })).toBe(true);
  });

  it('never reveals an unmounted navigator, even past the cap', () => {
    // The overlay stays up instead of unmounting onto an empty root.
    expect(isRevealReady({ navigatorReady: false, onboardingDecided: true, capReached: true })).toBe(false);
  });

  it('puts the cap beyond the natural sequence, so it never cuts it short', () => {
    expect(MAX_VISIBLE_MS).toBeGreaterThan(HOME_REVEAL_AT_MS + STEP_MS.homeSlide);
  });
});

describe('launchMode', () => {
  it('plays the full sequence by default', () => {
    expect(launchMode({ reduceMotion: false, deepLinked: false })).toBe('full');
  });

  it('honours Reduce Motion', () => {
    expect(launchMode({ reduceMotion: true, deepLinked: false })).toBe('reduced');
  });

  it('plays the brief path for a deep link, whatever the motion setting', () => {
    // iOS presents modal routes outside the moving wrapper, so a 7.8 s
    // sequence would have a deep-linked modal pop up over the splash.
    expect(launchMode({ reduceMotion: false, deepLinked: true })).toBe('brief');
    expect(launchMode({ reduceMotion: true, deepLinked: true })).toBe('brief');
  });
});

describe('isDeepLinkLaunch', () => {
  it.each([
    [null, false],
    ['', false],
    ['khazayinapp://', false],
    ['khazayinapp:///', false],
    ['khazayinapp://?ref=x', false],
    // A dev-client launch arrives as its own URL; it is not a route.
    ['exp+khazayin-app://expo-development-client/?url=http%3A%2F%2F192.168.1.2%3A8081', false],
    ['khazayinapp://sections', true],
    ['khazayinapp://sections/prophet', true],
    ['khazayinapp://content-search?q=x', true],
    ['https://khazayin.app/note-editor', true],
  ])('%s → %s', (url, expected) => {
    expect(isDeepLinkLaunch(url)).toBe(expected);
  });
});

describe('patternTiles', () => {
  // The pattern is one seamless 735 pt tile. React Native's `repeat` resize
  // mode drew it once on both platforms, leaving a bare band below 735 pt —
  // the frames carry the pattern to the bottom edge, behind the wordmark.
  it('covers a phone taller than one tile', () => {
    expect(patternTiles(393, 852)).toEqual([
      { left: 0, top: 0, size: PATTERN_TILE },
      { left: 0, top: PATTERN_TILE, size: PATTERN_TILE },
    ]);
  });

  it('covers a tablet in both directions', () => {
    const tiles = patternTiles(1024, 1366);
    expect(tiles).toHaveLength(4);
    const right = Math.max(...tiles.map((t) => t.left + t.size));
    const bottom = Math.max(...tiles.map((t) => t.top + t.size));
    expect(right).toBeGreaterThanOrEqual(1024);
    expect(bottom).toBeGreaterThanOrEqual(1366);
  });

  it('uses one tile when one is enough', () => {
    expect(patternTiles(320, 568)).toHaveLength(1);
  });

  it('still lays one tile before the window has a size', () => {
    // The first tile's decode releases the native splash; with no tile the
    // release would wait for its 1.5 s cap.
    expect(patternTiles(0, 0)).toEqual([{ left: 0, top: 0, size: PATTERN_TILE }]);
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
