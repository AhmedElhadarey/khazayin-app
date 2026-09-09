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
import { SCALE_STEPS, dawahLayout, slotDistance } from './dawahLayout';

// The fan's proportions come from Figma node 2001:940 rather than from
// hand-picked numbers — see `dawahLayout`. The design overlaps these posters
// on purpose; what it does differently from the old constants is make the
// focused poster smaller (39% of the window, not 56%) and step the
// neighbours down harder, which is what reads as depth.

type WrappedEntry = { item: DawahPosterModel; realIndex: number };

export function DawahCarousel({
  items,
  onItemPress,
}: {
  items: DawahPosterModel[];
  onItemPress?: (item: DawahPosterModel, index: number) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  // Memoised so `translate` keeps its identity across renders: it is captured
  // by the slots' animated styles.
  const layout = useMemo(() => dawahLayout(windowWidth), [windowWidth]);
  const { cardWidth, cardHeight, slot, sidePadding } = layout;

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

  const scrollX = useSharedValue(FIRST_REAL * slot);
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
          width={cardWidth}
          height={cardHeight}
        />
      </View>
    );
  }

  // When momentum lands on a clone, silently jump to its real twin so the
  // carousel feels infinite without seams.
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (x <= 0) {
      ref.current?.scrollTo({ x: LAST_REAL * slot, animated: false });
    } else if (x >= (wrapped.length - 1) * slot) {
      ref.current?.scrollTo({ x: FIRST_REAL * slot, animated: false });
    }
  };

  return (
    <Animated.ScrollView
      ref={ref as any}
      horizontal
      snapToInterval={slot}
      snapToAlignment="start"
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      onMomentumScrollEnd={handleMomentumEnd}
      scrollEventThrottle={16}
      contentOffset={{ x: FIRST_REAL * slot, y: 0 }}
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
          slot={slot}
          sidePadding={sidePadding}
          viewportWidth={windowWidth}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
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
  slot,
  sidePadding,
  viewportWidth,
  cardWidth,
  cardHeight,
  onPress,
}: {
  entry: WrappedEntry;
  index: number;
  scrollX: SharedValue<number>;
  slot: number;
  sidePadding: number;
  viewportWidth: number;
  cardWidth: number;
  cardHeight: number;
  onPress?: () => void;
}) {
  const [outerScale, neighbourScale] = SCALE_STEPS;
  // Distance in slots from whatever is centred in the viewport. Driving the
  // fan off this rather than off `scrollX` against `index * slot` is what
  // makes it work under forced RTL, where the scroll axis does not start at
  // content x = 0.
  const STEPS = [-2, -1, 0, 1, 2];
  const animatedStyle = useAnimatedStyle(() => {
    const d = slotDistance({
      index,
      scrollX: scrollX.value,
      viewportWidth,
      slot,
      sidePadding,
    });
    const scale = interpolate(
      d, STEPS,
      [outerScale, neighbourScale, 1, neighbourScale, outerScale],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      d, STEPS, [0.45, 0.7, 1, 0.7, 0.45], Extrapolation.CLAMP,
    );
    const z = interpolate(d, STEPS, [0, 5, 100, 5, 0], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity, zIndex: Math.round(z) };
  });

  return (
    <Animated.View
      style={[
        { width: slot, height: cardHeight, alignItems: 'center', justifyContent: 'center' },
        animatedStyle,
      ]}
    >
      <DawahPoster
        quote={entry.item}
        onPress={onPress}
        width={cardWidth}
        height={cardHeight}
      />
    </Animated.View>
  );
}
