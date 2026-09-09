import { OrnamentPattern } from '@/components/khazain/patterns';
import { LogoBadge, Wordmark } from '@/components/khazain/primitives';
import { KhazainColors } from '@/constants/theme';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { launchSequence, type LaunchPhase } from './launchTiming';

/**
 * The post-native launch overlay — Figma nodes 2001:888, 2001:914, 2007:511.
 *
 * The native splash covers the very first frames; this overlay reproduces the
 * remaining states on top of the already-mounted navigator, so Home never
 * flashes between the two layers and the sequence never delays readiness: the
 * caller only mounts it once fonts and settings have resolved.
 *
 * Reduce Motion renders a single final state and fades straight through.
 * `onDone` fires exactly once, including when the component unmounts early.
 */
export function LaunchSequence({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const steps = useRef(launchSequence({ reduceMotion: !!reduceMotion })).current;

  const [phase, setPhase] = useState<LaunchPhase>(steps[0].phase);
  const opacity = useSharedValue(1);

  const done = useRef(false);
  const finish = useRef(onDone);
  finish.current = onDone;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const complete = () => {
      if (done.current) return;
      done.current = true;
      finish.current();
    };

    let elapsed = 0;
    steps.forEach((step, index) => {
      if (index > 0) {
        timers.push(setTimeout(() => setPhase(step.phase), elapsed));
      }
      elapsed += step.durationMs;
    });

    // Fade the overlay out across the final step, then hand control back.
    const fadeMs = Math.min(200, steps[steps.length - 1].durationMs);
    timers.push(
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: fadeMs });
      }, Math.max(0, elapsed - fadeMs)),
    );
    timers.push(setTimeout(complete, elapsed));

    return () => {
      timers.forEach(clearTimeout);
      // An early unmount must still release the caller, or the app would sit
      // behind a dismissed overlay forever.
      complete();
    };
  }, [steps, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

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
      <OrnamentPattern style={StyleSheet.absoluteFillObject} coverage="full" />
      <View style={styles.center}>
        {phase === 'emblem' ? <LogoBadge size={96} /> : null}
      </View>
      <View style={styles.footer}>
        <Wordmark size={14} color={KhazainColors.gold600} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: KhazainColors.heroCream,
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 48,
  },
});
