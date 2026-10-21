import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type AnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {
  BACKDROP_FADE_MS,
  FIGMA_EASE,
  SPLASH_GROUND,
  STEP_MS,
  STEP_STARTS,
  emblemPose,
  isDeepLinkLaunch,
  isRevealReady,
  launchMode,
  MAX_VISIBLE_MS,
  patternTiles,
  resolveHomeReveal,
  type LaunchMode,
} from './launchTiming';

const PATTERN = require('@/assets/khazain/splash/pattern.webp');
const EMBLEM = require('@/assets/khazain/splash/emblem.webp');
const WORDMARK = require('@/assets/khazain/splash/wordmark.webp');

/**
 * Geometry from the Splash frames: `Artboard 1 2` is 130.7 x 181 at rest and
 * `png_1 1` is 220 x 35.1, 24 above the bottom edge in every frame.
 */
const EMBLEM_SIZE = { width: 131, height: 181 };
const WORDMARK_SIZE = { width: 220, height: 35 };
const WORDMARK_BOTTOM = 24;

/**
 * The gradient and pattern are the 2026-09-09 decomposition, measured against
 * the frame export (`docs/plans/2026-09-09-splash-rebuild-design.md`).
 */
const GRADIENT = ['#D8BFA1', '#F4E7DA', '#D8BE9D'] as const;
const GRADIENT_STOPS = [0, 0.52, 1] as const;

/** Release the native splash anyway if the pattern never reports back. */
const NATIVE_HANDOVER_CAP_MS = 1500;

/** Hand back control this long after the reveal should have landed, regardless. */
const REVEAL_BACKSTOP_MS = 500;

/** Stop waiting for the initial URL; an unanswered query is a launcher start. */
const INITIAL_URL_WAIT_MS = 300;

const ease = Easing.bezier(...FIGMA_EASE);

/**
 * What the root's navigator wrapper animates. A launch starts it hidden —
 * below the screen for the full sequence, transparent for the reduced and
 * brief ones — and the overlay brings it in. With no launch it is at rest.
 */
export type LaunchReveal = {
  translateY: SharedValue<number>;
  opacity: SharedValue<number>;
  style: AnimatedStyle<ViewStyle>;
};

export function useLaunchReveal(active: boolean): LaunchReveal {
  const { height } = useWindowDimensions();
  const translateY = useSharedValue(active ? height : 0);
  const opacity = useSharedValue(active ? 0 : 1);
  const style = useAnimatedStyle<ViewStyle>(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return { translateY, opacity, style };
}

/**
 * The launch overlay — the Splash section of the Mobile page (2132:2371).
 *
 * It plays the prototype's four steps and then lets the screen underneath in:
 * the root draws this *under* its navigator, and `reveal` moves the navigator
 * up from the bottom over it (2007:511 → Home, MOVE_FROM_BOTTOM). Steps 1–4
 * run as one sequence on the UI thread, so a JS thread busy hydrating the app
 * cannot make them stutter or drift; only the reveal waits on readiness.
 *
 * Every layer is raster: naming a font family here would make the overlay wait
 * for the very load it is covering. `onDone` fires exactly once, including when
 * the component unmounts early.
 */
export function LaunchSequence({
  navigatorReady,
  onboardingDecided,
  reveal,
  onDone,
}: {
  /** The root <Stack> is mounted. Nothing is revealed before this. */
  navigatorReady: boolean;
  /** Settings have hydrated and the onboarding redirect has been decided. */
  onboardingDecided: boolean;
  reveal: LaunchReveal;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = !!useReducedMotion();

  const [deepLinked, setDeepLinked] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const mode: LaunchMode | null =
    deepLinked === null ? null : launchMode({ reduceMotion, deepLinked });

  // The shared values, not the `reveal` object, are what the effects below
  // depend on: they keep their identity for the component's life, so a root
  // re-render can never re-run the cleanup that ends the launch.
  const { translateY: revealY, opacity: revealOpacity } = reveal;

  const start = emblemPose(1, height);
  const backdrop = useSharedValue(0);
  const emblemY = useSharedValue(start.translateY);
  const emblemScale = useSharedValue(start.scale);
  const emblemOpacity = useSharedValue(1);

  const done = useRef(false);
  const finish = useRef(onDone);
  finish.current = onDone;
  const complete = useCallback(() => {
    if (done.current) return;
    done.current = true;
    finish.current();
  }, []);

  // A deep-linked cold start plays the brief path (design R5). The query is
  // answered in a few milliseconds; a silent one is treated as a launcher start.
  useEffect(() => {
    let live = true;
    const settle = (linked: boolean) => live && setDeepLinked((d) => d ?? linked);
    const t = setTimeout(() => settle(false), INITIAL_URL_WAIT_MS);
    Linking.getInitialURL()
      .then((url) => settle(isDeepLinkLaunch(url)))
      .catch(() => settle(false));
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, []);

  // The native splash is the same bare ground this overlay starts on, so it
  // is released once the backdrop has decoded. A decode failure or a silent
  // load must not strand the user behind it, so an error and a cap release it
  // too.
  const released = useRef(false);
  const revealNative = useCallback(() => {
    if (released.current) return;
    released.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
    setVisible(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(revealNative, NATIVE_HANDOVER_CAP_MS);
    return () => clearTimeout(t);
  }, [revealNative]);

  // The cap only stops waiting for the onboarding decision (design R10).
  useEffect(() => {
    const t = setTimeout(() => setCapReached(true), MAX_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  // Steps 1 to 4 start once, when the overlay is visible and its mode known,
  // and that moment is the clock the reveal is timed against too — so a slow
  // initial-URL answer delays both together rather than eating into step 4.
  // The backdrop comes up over the bare ground inside step 1's hold; it and
  // the reduced fades opt out of the system Reduce Motion skip, which would
  // turn them into cuts.
  const timelineStart = useRef(0);
  useEffect(() => {
    if (!visible || !mode || timelineStart.current) return;
    timelineStart.current = Date.now();
    backdrop.value = withTiming(1, {
      duration: BACKDROP_FADE_MS,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.Never,
    });

    const centre = emblemPose(2, height);
    if (mode !== 'full') {
      emblemY.value = centre.translateY;
      emblemScale.value = centre.scale;
      emblemOpacity.value = 0;
      emblemOpacity.value = withTiming(1, {
        duration: BACKDROP_FADE_MS,
        reduceMotion: ReduceMotion.Never,
      });
      return;
    }

    const grown = emblemPose(3, height);
    const gone = emblemPose(4, height);
    const dropEnd = STEP_STARTS.drop + STEP_MS.drop;
    emblemY.value = withSequence(
      withDelay(
        STEP_STARTS.drop,
        withTiming(centre.translateY, { duration: STEP_MS.drop, easing: ease }),
      ),
      withDelay(
        STEP_STARTS.exit - dropEnd,
        withTiming(gone.translateY, { duration: STEP_MS.exit, easing: ease }),
      ),
    );
    emblemScale.value = withSequence(
      withDelay(
        STEP_STARTS.grow,
        withTiming(grown.scale, { duration: STEP_MS.grow, easing: ease }),
      ),
      withDelay(
        STEP_MS.hold3,
        withTiming(gone.scale, { duration: STEP_MS.exit, easing: ease }),
      ),
    );
  }, [visible, mode, height, backdrop, emblemY, emblemScale, emblemOpacity]);

  // The reveal is resolved once, when the app is first ready, and scheduled on
  // the UI thread like the steps it follows. A JS timer backs up the
  // animation's own callback, so a reveal that is cancelled before it lands
  // still hands the navigator back its touches.
  const scheduled = useRef(false);
  const backstop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ready = isRevealReady({ navigatorReady, onboardingDecided, capReached });
  useEffect(() => {
    if (!mode || !ready || !timelineStart.current || scheduled.current) return;
    scheduled.current = true;
    const elapsed = Date.now() - timelineStart.current;
    const plan = resolveHomeReveal({ readyAtMs: elapsed, mode });
    const delay = Math.max(0, plan.startsAtMs - elapsed);
    const landed = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(complete)();
    };
    const timing = { duration: plan.durationMs, reduceMotion: ReduceMotion.Never };
    if (mode === 'full') {
      revealOpacity.value = 1;
      revealY.value = withDelay(delay, withTiming(0, { ...timing, easing: ease }, landed));
    } else {
      revealY.value = 0;
      revealOpacity.value = withDelay(delay, withTiming(1, timing, landed));
    }
    backstop.current = setTimeout(complete, delay + plan.durationMs + REVEAL_BACKSTOP_MS);
  }, [mode, ready, visible, revealY, revealOpacity, complete]);

  // An early unmount must still release the caller and leave the navigator at
  // rest, or the app would sit hidden behind a dismissed overlay.
  useEffect(
    () => () => {
      clearTimeout(backstop.current);
      cancelAnimation(emblemY);
      cancelAnimation(emblemScale);
      cancelAnimation(revealY);
      cancelAnimation(revealOpacity);
      revealY.value = 0;
      revealOpacity.value = 1;
      complete();
    },
    [complete, emblemY, emblemScale, revealY, revealOpacity],
  );

  const appear = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const emblem = useAnimatedStyle(() => ({
    opacity: emblemOpacity.value,
    transform: [{ translateY: emblemY.value }, { scale: emblemScale.value }],
  }));

  return (
    <View
      style={[StyleSheet.absoluteFillObject, styles.screen]}
      pointerEvents="none"
      // The overlay is decorative and transient; keep it out of the
      // accessibility tree so focus lands on the real screen above it.
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, appear]}>
        <LinearGradient
          colors={GRADIENT}
          locations={GRADIENT_STOPS}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Laid out tile by tile at the authored size, so a larger phone
            shows more of the pattern rather than a stretched copy. The first
            tile's decode is what releases the native splash. */}
        {patternTiles(width, height).map((tile, i) => (
          <Image
            key={`${tile.left},${tile.top}`}
            source={PATTERN}
            style={{
              position: 'absolute',
              left: tile.left,
              top: tile.top,
              width: tile.size,
              height: tile.size,
            }}
            fadeDuration={0}
            onLoad={i === 0 ? revealNative : undefined}
            onError={i === 0 ? revealNative : undefined}
          />
        ))}
      </Animated.View>
      <View style={styles.center} pointerEvents="none">
        <Animated.Image
          source={EMBLEM}
          style={[EMBLEM_SIZE, emblem]}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>
      <Animated.View style={[styles.footer, appear]} pointerEvents="none">
        <Image source={WORDMARK} style={WORDMARK_SIZE} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    // The native splash's ground. A frame dropped anywhere in the hand-over
    // still lands on the same colour.
    backgroundColor: SPLASH_GROUND,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: WORDMARK_BOTTOM,
    alignItems: 'center',
  },
});
