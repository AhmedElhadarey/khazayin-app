import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BREATHE_MS, GROW_MS, SCALE, resolveExit, type LaunchExit } from './launchTiming';

const PATTERN = require('@/assets/khazain/splash/pattern.webp');
const EMBLEM = require('@/assets/khazain/splash/emblem.webp');
const WORDMARK = require('@/assets/khazain/splash/wordmark.webp');

/**
 * Geometry measured against the Figma frame export at 2x. See
 * `docs/plans/2026-09-09-splash-rebuild-design.md`.
 */
const EMBLEM_SIZE = { width: 131, height: 181 };
const WORDMARK_SIZE = { width: 220, height: 35 };
const WORDMARK_BOTTOM = 24;

/**
 * The gradient is a vertical linear ramp, brightest just below centre where the
 * emblem sits. `#F4E7DA` is also the native splash's background colour, so the
 * two layers meet on the same value behind the emblem.
 */
const GRADIENT = ['#D8BFA1', '#F4E7DA', '#D8BE9D'] as const;
const GRADIENT_STOPS = [0, 0.52, 1] as const;

/** Hide the native splash anyway if the emblem never reports back. */
const NATIVE_HANDOVER_CAP_MS = 1500;

/** How long the gradient, pattern and wordmark take to come up around the emblem. */
const BACKDROP_FADE_MS = 260;

/**
 * The post-native launch overlay — Figma nodes 2001:888, 2001:914, 2007:511.
 *
 * The emblem grows while the app loads, so this mounts on the first JS frame,
 * beside the navigator rather than after it. That is why every layer is raster:
 * naming a font family here would make the overlay wait for the very load it is
 * supposed to be covering.
 *
 * `onDone` fires exactly once, including when the component unmounts early.
 */
export function LaunchSequence({
  ready,
  onDone,
}: {
  /** The navigator is mounted and the app is ready to be revealed. */
  ready: boolean;
  onDone: () => void;
}) {
  const reduceMotion = !!useReducedMotion();
  const mountedAt = useRef(Date.now()).current;

  // Always starts at rest, including under Reduce Motion: the native splash
  // draws the emblem at exactly this size, and starting anywhere else would
  // make the emblem jump at hand-over for the users who asked for no motion.
  const scale = useSharedValue<number>(SCALE.rest);
  const opacity = useSharedValue(1);
  const backdrop = useSharedValue(0);

  const [exit, setExit] = useState<LaunchExit | null>(null);
  const [visible, setVisible] = useState(false);

  const done = useRef(false);
  const finish = useRef(onDone);
  finish.current = onDone;
  const complete = useCallback(() => {
    if (done.current) return;
    done.current = true;
    finish.current();
  }, []);

  // The native splash stays up until this overlay has actually drawn its
  // emblem, so the two never trade places through a blank frame. A decode
  // failure or a silent load must not strand the user behind the native layer,
  // so an error and a cap both release it too.
  const revealed = useRef(false);
  const revealNative = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
    setVisible(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(revealNative, NATIVE_HANDOVER_CAP_MS);
    return () => clearTimeout(t);
  }, [revealNative]);

  // The native splash is a bare emblem on flat cream. Bringing the gradient,
  // pattern and wordmark up around it — rather than cutting to them — is what
  // makes the hand-over read as one screen rather than two.
  useEffect(() => {
    if (!visible) return;
    backdrop.value = withTiming(1, {
      duration: reduceMotion ? 0 : BACKDROP_FADE_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [visible, reduceMotion, backdrop]);

  // Grow in, then breathe for as long as the app is still loading. Growth
  // starts when the overlay actually becomes visible, not when it mounts, so
  // the emblem is still at the native splash's size at the moment of the swap.
  // Reduce Motion holds one static state instead.
  useEffect(() => {
    if (reduceMotion || !visible) return;
    scale.value = withTiming(SCALE.held, {
      duration: GROW_MS,
      easing: Easing.out(Easing.cubic),
    });
    const t = setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(SCALE.breatheLow, {
            duration: BREATHE_MS / 2,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(SCALE.breatheHigh, {
            duration: BREATHE_MS / 2,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        true,
      );
    }, GROW_MS);
    return () => clearTimeout(t);
  }, [reduceMotion, visible, scale]);

  // Readiness decides when to hand over, subject to the minimum-visible floor
  // and the hard cap. Resolved once, so a re-render cannot move the exit.
  useEffect(() => {
    if (!ready) return;
    setExit((current) => current ?? resolveExit({ readyAtMs: Date.now() - mountedAt, reduceMotion }));
  }, [ready, reduceMotion, mountedAt]);

  // The app may never report ready; the cap is what guarantees a hand-over.
  useEffect(() => {
    if (exit) return;
    const capped = resolveExit({ readyAtMs: null, reduceMotion });
    const t = setTimeout(
      () => setExit((current) => current ?? capped),
      Math.max(0, capped.startsAtMs - (Date.now() - mountedAt)),
    );
    return () => clearTimeout(t);
  }, [exit, reduceMotion, mountedAt]);

  useEffect(() => {
    if (!exit) return;
    const delay = Math.max(0, exit.startsAtMs - (Date.now() - mountedAt));
    const start = setTimeout(() => {
      cancelAnimation(scale);
      scale.value = withTiming(SCALE.rest, {
        duration: exit.durationMs,
        easing: Easing.inOut(Easing.quad),
      });
      opacity.value = withTiming(0, { duration: exit.durationMs });
    }, delay);
    const end = setTimeout(complete, delay + exit.durationMs);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [exit, mountedAt, scale, opacity, complete]);

  // An early unmount must still release the caller, or the app would sit behind
  // a dismissed overlay forever.
  useEffect(() => complete, [complete]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const appear = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.screen, fade]}
      pointerEvents="none"
      // The overlay is decorative and transient; keep it out of the
      // accessibility tree so focus lands on the real screen underneath.
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
      <Image
        source={PATTERN}
        style={StyleSheet.absoluteFillObject}
        // `repeat` keeps the tile at its authored size, so a larger phone shows
        // more of the pattern rather than a stretched copy. React Native Web
        // has no such mode, so there it covers instead.
        resizeMode={Platform.OS === 'web' ? 'cover' : 'repeat'}
        fadeDuration={0}
      />
      </Animated.View>
      {/* Centred against the frame, not against the space left over by the
          wordmark — the native splash centres its emblem the same way, so the
          two line up exactly at hand-over. */}
      <View style={styles.center} pointerEvents="none">
        <Animated.Image
          source={EMBLEM}
          style={[EMBLEM_SIZE, grow]}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={revealNative}
          onError={revealNative}
        />
      </View>
      <Animated.View style={[styles.footer, appear]} pointerEvents="none">
        <Image source={WORDMARK} style={WORDMARK_SIZE} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    // Matches the gradient's centre and the native splash's background, so a
    // frame dropped anywhere in the hand-over still lands on the right colour.
    backgroundColor: '#F4E7DA',
    zIndex: 10,
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
