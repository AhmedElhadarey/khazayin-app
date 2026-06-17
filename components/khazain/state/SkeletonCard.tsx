/**
 * SkeletonCard — card placeholder matching ScholarCard / BookCard footprint.
 * Width 192, height 78.
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
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const WIDTH = 192;
const SHIMMER_W = Math.round(WIDTH * 0.3);

export function SkeletonCard() {
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

export type SkeletonCardListProps = { count?: number; gap?: number };

export function SkeletonCardList({ count = 3, gap = 12 }: SkeletonCardListProps) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 78,
    width: 192,
    borderRadius: KhazainRadius.md,
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
