/**
 * SkeletonRibbon — one-line ribbon row placeholder (height 48).
 * Used for sections list, scholar lecture rows, etc.
 *
 * C3 compliance: shimmer translateX starts at +WIDTH, moves toward 0 (RTL).
 *
 * Track: khazain-content-service_20260506  Phase 3 / T3.1
 */
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const WIDTH = 400;
const SHIMMER_W = Math.round(WIDTH * 0.3);

export function SkeletonRibbon() {
  const translateX = useSharedValue(WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(0, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.base}>
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

export type SkeletonRibbonListProps = { count?: number; gap?: number };

export function SkeletonRibbonList({ count = 3, gap = 8 }: SkeletonRibbonListProps) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRibbon key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
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
