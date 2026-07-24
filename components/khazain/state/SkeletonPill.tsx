/**
 * SkeletonPill — pill-shaped placeholder for filter chips and similar
 * narrow rounded controls (height 30, borderRadius 999). Widths vary
 * across the list so the row reads as a real chip cluster, not a
 * uniform grid.
 *
 * C3 compliance: shimmer translateX starts at +WIDTH, moves toward 0 (RTL).
 *
 * Track: khazain-content-service_20260506  Phase 3 / T3.1 (follow-up)
 */
import { KhazainColors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const SHIMMER_W = 60;
const HEIGHT = 30;

export type SkeletonPillProps = { width?: number };

export function SkeletonPill({ width = 80 }: SkeletonPillProps) {
  const translateX = useSharedValue(width);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      // honor OS reduce-motion: stop any running shimmer and render static
      cancelAnimation(translateX);
      translateX.value = width;
      return;
    }
    translateX.value = withRepeat(
      withTiming(0, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [translateX, width, reduceMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.base, { width }]}>
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(252,250,248,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

// Default widths give the row a natural varied look; wraps for count > 4.
const DEFAULT_WIDTHS = [80, 100, 70, 90, 75, 95];

export type SkeletonPillListProps = { count?: number; gap?: number; widths?: number[] };

export function SkeletonPillList({
  count = 3,
  gap = 8,
  widths = DEFAULT_WIDTHS,
}: SkeletonPillListProps) {
  return (
    <View style={{ flexDirection: 'row', gap, flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPill key={i} width={widths[i % widths.length]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: HEIGHT,
    borderRadius: 999,
    backgroundColor: KhazainColors.skeleton,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHIMMER_W,
  },
});
