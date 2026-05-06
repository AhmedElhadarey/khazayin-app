/**
 * SkeletonPoster — DawahPoster proportions placeholder.
 * SLOT 165 wide, 232 tall. Centered in wrapper.
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

const WIDTH = 165;
const SHIMMER_W = Math.round(WIDTH * 0.3);

export function SkeletonPoster() {
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
    <View style={styles.wrapper}>
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
    </View>
  );
}

export type SkeletonPosterListProps = { count?: number; gap?: number };

export function SkeletonPosterList({ count = 3, gap = 12 }: SkeletonPosterListProps) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPoster key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  base: {
    width: WIDTH,
    height: 232,
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
