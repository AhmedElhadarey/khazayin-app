/**
 * The launch timeline — the Splash section of the Mobile page (2132:2371).
 *
 * The prototype is four frames, each linked to the next with AFTER_TIMEOUT and
 * SMART_ANIMATE, and only the emblem moves between them:
 *
 *   2001:888  emblem above the top edge        hold 0.8  → 2 s
 *   2001:914  emblem centred                   hold 0.8  → 2 s
 *   2001:835  emblem centred, grown to 201.4   hold 0.3  → 0.8 s
 *   2007:511  emblem shrunk, above the top     hold 0.3  → Home MOVE_FROM_BOTTOM 0.8 s
 *
 * The brief is to play those steps exactly, so every number here is the file's.
 * Kept pure and separate from the overlay so the timeline, the poses and the
 * readiness rule are asserted without a renderer or fake timers. See
 * `docs/plans/2026-10-22-launch-steps-design.md`.
 */

/**
 * The bare ground the native splash shows and the overlay starts on. Android
 * 12+ draws the (transparent) splash image on a square of the splash colour
 * over the window colour, so app.json's two colours and
 * `plugins/withSplashWindowBackground` must all be this exact value.
 */
export const SPLASH_GROUND = '#F4E7DA';

/**
 * The file's OUT_CUBIC, stored on every link as `easingFunction`
 * `[0, 0, 0.5799999833, 1]` — float32 for 0.58.
 */
export const FIGMA_EASE = [0, 0, 0.58, 1] as const;

/** Each hold, then the move that follows it. */
export const STEP_MS = Object.freeze({
  hold1: 800,
  drop: 2000,
  hold2: 800,
  grow: 2000,
  hold3: 300,
  exit: 800,
  hold4: 300,
  homeSlide: 800,
});

/** When each move starts, from the moment the overlay becomes visible. */
export const STEP_STARTS = Object.freeze({
  drop: STEP_MS.hold1,
  grow: STEP_MS.hold1 + STEP_MS.drop + STEP_MS.hold2,
  exit: STEP_MS.hold1 + STEP_MS.drop + STEP_MS.hold2 + STEP_MS.grow + STEP_MS.hold3,
  home:
    STEP_MS.hold1 + STEP_MS.drop + STEP_MS.hold2 + STEP_MS.grow + STEP_MS.hold3 +
    STEP_MS.exit + STEP_MS.hold4,
});

/** Home never slides in before the last hold ends. */
export const HOME_REVEAL_AT_MS = STEP_STARTS.home;

/**
 * The native splash is the bare ground — step 1 has no emblem, and Android 12+
 * cannot draw the gradient, pattern or wordmark — so the overlay brings those
 * up over it, inside the first hold, before anything moves.
 */
export const BACKDROP_FADE_MS = 260;

/**
 * Stop waiting for the onboarding decision, so a decision that never lands
 * cannot strand the user. It sits past the natural sequence so it never cuts
 * it short.
 */
export const MAX_VISIBLE_MS = 15000;

/** The reduced and brief paths: no travel, a static centred emblem, then a fade. */
export const REDUCED_MOTION_FLOOR_MS = 900;
export const REDUCED_MOTION_MS = 320;

/** `Artboard 1 2` at rest is 130.7 x 181; the other two sizes are scales of it. */
const EMBLEM_REST = { width: 130.7, height: 181 };
export const EMBLEM_SCALE = Object.freeze({
  rest: 1,
  /** 2001:835 — 201.4 x 279. */
  grown: 201.4 / EMBLEM_REST.width,
  /** 2007:511 — 70.6 x 97.7. */
  gone: 70.6 / EMBLEM_REST.width,
});

/**
 * In 2001:888 the emblem's bottom edge is 19 above the frame; in 2007:511 its
 * centre is 84.5 above it. Keeping those distances, rather than the frame's
 * absolute y, is what keeps the emblem just out of view on every screen height.
 */
const ABOVE_TOP = { step1BottomEdge: 19, step4Centre: 84.5 };

/**
 * The ground the frames paint. Steps 1-3 (2001:888, 2001:914, 2001:835) share
 * one vertical linear gradient; step 4 (2007:511) is a lighter one with the
 * same centre stop. Both are stored with the paint transform m01 1, m10 -1, so
 * the stops run top to bottom. The app used measured off-the-export values
 * (#D8BFA1, #F4E7DA @0.52, #D8BE9D) until the file's own stops were read; the
 * export includes the OVERLAY pattern, which the pattern asset now bakes in
 * itself against these stops, so the stated values are the ones to paint.
 */
export const GROUND_GRADIENT = Object.freeze({
  colors: ['#D9C0A1', '#F8EDE1', '#D8BE9D'] as const,
  locations: [0, 0.553, 1] as const,
});
export const GROUND_GRADIENT_EXIT = Object.freeze({
  colors: ['#E5D5C1', '#F8EDE1', '#E5D5C1'] as const,
  locations: [0, 0.553, 1] as const,
});

/**
 * 2001:835 → 2007:511 is one SMART_ANIMATE (0.8 s, OUT_CUBIC) that moves the
 * emblem and changes the fill, so the lighter ground fades in over exactly the
 * emblem's exit.
 */
export const GROUND_EXIT_FADE = Object.freeze({
  startMs: STEP_STARTS.exit,
  durationMs: STEP_MS.exit,
});

/**
 * The pattern: node 2001:889 in every Splash frame, 690 x 853 at (-149, -1),
 * image e2364e38 (1934 square) STRETCH with paint transform m00 0.6633, m11
 * 0.8206, m12 0.0890. The image is therefore drawn 690 / 0.6633 = 1040 pt wide
 * and 853 / 0.8206 = 1039.5 pt tall, its top-left at x = -149 and
 * y = -1 - (0.0890 / 0.8206) * 853 = -93.5. The texture is seamless, so a
 * larger screen repeats it from that origin.
 */
export const PATTERN_TILE = 1040;
export const PATTERN_ORIGIN = Object.freeze({ left: -149, top: -93.5 });

export type PatternTile = { left: number; top: number; size: number };

/**
 * The tiles that cover a screen, the first at the file's origin. React
 * Native's `repeat` resize mode drew the tile once on both platforms, so the
 * overlay lays the tiles out itself. A phone needs one; a tablet needs four.
 */
export function patternTiles(width: number, height: number): PatternTile[] {
  const tiles: PatternTile[] = [];
  // At least one tile even before the window has a size: the first tile's
  // decode is what releases the native splash.
  for (let top = PATTERN_ORIGIN.top; top === PATTERN_ORIGIN.top || top < height; top += PATTERN_TILE) {
    for (let left = PATTERN_ORIGIN.left; left === PATTERN_ORIGIN.left || left < width; left += PATTERN_TILE) {
      tiles.push({ left, top, size: PATTERN_TILE });
    }
  }
  return tiles;
}

export type LaunchStep = 1 | 2 | 3 | 4;
export type EmblemPose = { translateY: number; scale: number };

/** Where the emblem sits in each frame, relative to the screen's centre. */
export function emblemPose(step: LaunchStep, screenHeight: number): EmblemPose {
  const half = screenHeight / 2;
  switch (step) {
    case 1:
      return {
        translateY: -(half + EMBLEM_REST.height / 2 + ABOVE_TOP.step1BottomEdge),
        scale: EMBLEM_SCALE.rest,
      };
    case 2:
      return { translateY: 0, scale: EMBLEM_SCALE.rest };
    case 3:
      return { translateY: 0, scale: EMBLEM_SCALE.grown };
    case 4:
      return { translateY: -(half + ABOVE_TOP.step4Centre), scale: EMBLEM_SCALE.gone };
  }
}

/**
 * - `full` — the prototype's four steps, then Home slides up.
 * - `reduced` — Reduce Motion: a static centred emblem, then a fade.
 * - `brief` — a cold start opened by a deep link. iOS presents modal routes
 *   outside the moving wrapper, so a 7.8 s sequence would have the linked
 *   screen pop up over the splash; this path gets out of the way instead.
 */
export type LaunchMode = 'full' | 'reduced' | 'brief';

export function launchMode({
  reduceMotion,
  deepLinked,
}: {
  reduceMotion: boolean;
  deepLinked: boolean;
}): LaunchMode {
  if (deepLinked) return 'brief';
  return reduceMotion ? 'reduced' : 'full';
}

/**
 * True when the app was cold-started by a link to a route, rather than from the
 * launcher. A bare scheme, a query-only link and a dev-client launch URL are
 * not routes.
 */
export function isDeepLinkLaunch(url: string | null): boolean {
  if (!url) return false;
  const rest = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  if (rest.startsWith('expo-development-client')) return false;
  const route = rest.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  return route.length > 0;
}

/**
 * Whether the screen underneath may come in. It waits for the navigator and the
 * onboarding decision together — revealing before the decision would slide Home
 * up and then swap it for onboarding mid-flight. The cap only stops waiting for
 * the decision: an unmounted navigator is never revealed, so the overlay never
 * unmounts onto an empty root.
 */
export function isRevealReady({
  navigatorReady,
  onboardingDecided,
  capReached,
}: {
  navigatorReady: boolean;
  onboardingDecided: boolean;
  /** `MAX_VISIBLE_MS` has passed since the overlay mounted. */
  capReached: boolean;
}): boolean {
  return navigatorReady && (onboardingDecided || capReached);
}

export type HomeReveal = {
  /** When the screen underneath starts to come in, from the overlay becoming visible. */
  startsAtMs: number;
  durationMs: number;
  /** The overlay is gone at this point. */
  endsAtMs: number;
  /** True when the app, not the timeline, decided the start. */
  heldForApp: boolean;
};

/**
 * When the screen underneath comes in. The full sequence always plays to its
 * end, and a slower app holds the last step — the bare ground and the wordmark
 * — until it is ready.
 */
export function resolveHomeReveal({
  readyAtMs,
  mode,
}: {
  readyAtMs: number;
  mode: LaunchMode;
}): HomeReveal {
  const full = mode === 'full';
  const natural = full ? HOME_REVEAL_AT_MS : REDUCED_MOTION_FLOOR_MS;
  const durationMs = full ? STEP_MS.homeSlide : REDUCED_MOTION_MS;
  const startsAtMs = Math.max(natural, readyAtMs);
  return {
    startsAtMs,
    durationMs,
    endsAtMs: startsAtMs + durationMs,
    heldForApp: startsAtMs > natural,
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
