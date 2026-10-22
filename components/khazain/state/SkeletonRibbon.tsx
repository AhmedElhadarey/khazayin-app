/**
 * SkeletonRibbon — one-line ribbon row placeholder (height 48).
 * Used for sections list, scholar lecture rows, etc.
 *
 * C3 compliance: shimmer translateX starts at +WIDTH, moves toward 0 (RTL).
 *
 * Track: khazain-content-service_20260506  Phase 3 / T3.1
 */
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const WIDTH = 400;
const SHIMMER_W = Math.round(WIDTH * 0.3);

export function SkeletonRibbon({ height = CARD_DENSITY.skeletonRibbonHeight }: { height?: number } = {}) {
  const translateX = useSharedValue(WIDTH);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      // honor OS reduce-motion: stop any running shimmer and render static
      cancelAnimation(translateX);
      translateX.value = WIDTH;
      return;
    }
    translateX.value = withRepeat(
      withTiming(0, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [translateX, reduceMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.base, { height }]}>
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

/**
 * `height` and `gap` default to the reciter/qiraa rhythm. A list whose rows are
 * a different box passes its own, so the page does not jump when the real rows
 * replace the placeholders — the More list is 82 at 12, not 56 at 8.
 */
export type SkeletonRibbonListProps = { count?: number; gap?: number; height?: number };

export function SkeletonRibbonList({
  count = 3,
  gap = CARD_DENSITY.skeletonGap,
  height = CARD_DENSITY.skeletonRibbonHeight,
}: SkeletonRibbonListProps) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRibbon key={i} height={height} />
      ))}
    </View>
  );
}

/**
 * Tablet Sections placeholder: tile-shaped boxes in the same wrapping grid, so
 * the page does not jump when the real tiles arrive.
 */
export function SkeletonTileGrid({
  count,
  width,
  minHeight,
  gap,
  gridStyle,
}: {
  count: number;
  width: number;
  minHeight: number;
  gap: number;
  gridStyle: ViewStyle;
}) {
  return (
    <View style={[gridStyle, { gap }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width, minHeight }}>
          <SkeletonRibbon height={minHeight} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: KhazainRadius.sm,
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
