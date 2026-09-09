import React, { useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { KhazainSpacing } from '@/constants/theme';
import type { DawahPoster as DawahPosterModel } from '@/types/content';
import { DawahPoster } from './DawahPoster';

// Card art is 220×232. Slot is intentionally narrower (165) so neighbouring
// posters overlap the focused one by ~28 px on each side — Twitch-style.
const CARD_W = 220;
const CARD_H = 232;
const SLOT = 165;

type WrappedEntry = { item: DawahPosterModel; realIndex: number };

export function DawahCarousel({
  items,
  onItemPress,
}: {
  items: DawahPosterModel[];
  onItemPress?: (item: DawahPosterModel, index: number) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const sidePadding = Math.max(0, (windowWidth - SLOT) / 2);

  // All hooks must be called unconditionally — guards (G10) live below.
  const wrapped = useMemo<WrappedEntry[]>(() => {
    if (!items || items.length < 2) return [];
    return [
      { item: items[items.length - 1], realIndex: items.length - 1 },
      ...items.map((item, i) => ({ item, realIndex: i })),
      { item: items[0], realIndex: 0 },
    ];
  }, [items]);

  const FIRST_REAL = 1;
  const LAST_REAL = items?.length ?? 0;

  const scrollX = useSharedValue(FIRST_REAL * SLOT);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });
  const ref = useRef<ScrollView>(null);

  // Guard: with 0 items render nothing; with 1 item the wrap-around clones
  // would overlap the only real card and onMomentumEnd math breaks (G10).
  if (!items || items.length === 0) return null;
  if (items.length === 1) {
    const only = items[0];
    return (
      <View
        style={{
          paddingTop: KhazainSpacing.x3,
          paddingBottom: KhazainSpacing.x6,
          alignItems: 'center',
        }}
      >
        <DawahPoster
          quote={only}
          onPress={() => onItemPress?.(only, 0)}
          width={CARD_W}
          height={CARD_H}
        />
      </View>
    );
  }

  // When momentum lands on a clone, silently jump to its real twin so the
  // carousel feels infinite without seams.
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (x <= 0) {
      ref.current?.scrollTo({ x: LAST_REAL * SLOT, animated: false });
    } else if (x >= (wrapped.length - 1) * SLOT) {
      ref.current?.scrollTo({ x: FIRST_REAL * SLOT, animated: false });
    }
  };

  return (
    <Animated.ScrollView
      ref={ref as any}
      horizontal
      snapToInterval={SLOT}
      snapToAlignment="start"
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      onMomentumScrollEnd={handleMomentumEnd}
      scrollEventThrottle={16}
      contentOffset={{ x: FIRST_REAL * SLOT, y: 0 }}
      contentContainerStyle={{
        paddingTop: KhazainSpacing.x3,
        paddingBottom: KhazainSpacing.x6,
        paddingHorizontal: sidePadding,
        alignItems: 'center',
      }}
    >
      {wrapped.map((entry, i) => (
        <Slot
          key={`${entry.realIndex}-${i}`}
          entry={entry}
          index={i}
          scrollX={scrollX}
          onPress={() => onItemPress?.(entry.item, entry.realIndex)}
        />
      ))}
    </Animated.ScrollView>
  );
}

function Slot({
  entry,
  index,
  scrollX,
  onPress,
}: {
  entry: WrappedEntry;
  index: number;
  scrollX: SharedValue<number>;
  onPress?: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 2) * SLOT,
      (index - 1) * SLOT,
      index * SLOT,
      (index + 1) * SLOT,
      (index + 2) * SLOT,
    ];
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.72, 0.84, 1, 0.84, 0.72],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.45, 0.7, 1, 0.7, 0.45],
      Extrapolation.CLAMP,
    );
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [22, 12, 0, -12, -22],
      Extrapolation.CLAMP,
    );
    const z = interpolate(
      scrollX.value,
      inputRange,
      [0, 5, 100, 5, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX }, { scale }],
      opacity,
      zIndex: Math.round(z),
    };
  });

  return (
    <Animated.View
      style={[
        { width: SLOT, height: CARD_H, alignItems: 'center', justifyContent: 'center' },
        animatedStyle,
      ]}
    >
      <DawahPoster quote={entry.item} onPress={onPress} width={CARD_W} height={CARD_H} />
    </Animated.View>
  );
}
