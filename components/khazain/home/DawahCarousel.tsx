import React, { useCallback, useMemo, useRef } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
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
import { SCALE_STEPS, dawahLayout } from './dawahLayout';

// The fan's proportions come from Figma node 2001:940 rather than from
// hand-picked numbers — see `dawahLayout`. The design overlaps these posters
// on purpose; what it does differently from the old constants is make the
// focused poster smaller (39% of the window, not 56%) and step the
// neighbours down harder, which is what reads as depth.
//
// Which poster is focused comes from where each slot actually landed, not
// from `index * slot`. That arithmetic assumes the scroll axis starts at
// content x = 0 and runs left to right, and this app forces RTL — but it also
// pins `direction: 'ltr'` on layout containers, so which way a given
// ScrollView runs is not something to predict. Measuring sidesteps it: a slot
// reports its own centre, and the fan is a function of the distance from that
// to the middle of the viewport.

type WrappedEntry = { item: DawahPosterModel; realIndex: number };

export function DawahCarousel({
  items,
  onItemPress,
}: {
  items: DawahPosterModel[];
  onItemPress?: (item: DawahPosterModel, index: number) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
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

  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });
  const ref = useRef<ScrollView>(null);

  // Measured centre of each slot within the content, filled in by layout.
  const centres = useRef<number[]>([]);
  const anchored = useRef(false);
  const scrollToSlot = useCallback((index: number, animated: boolean) => {
    const centre = centres.current[index];
    if (centre === undefined) return;
    ref.current?.scrollTo({ x: centre - windowWidth / 2, animated });
  }, [windowWidth]);

  const onSlotLayout = useCallback((index: number, centre: number) => {
    centres.current[index] = centre;
    // Anchor on the first real poster as soon as it has been measured.
    if (!anchored.current && centres.current[FIRST_REAL] !== undefined) {
      anchored.current = true;
      scrollToSlot(FIRST_REAL, false);
    }
  }, [scrollToSlot]);

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
    const focus = e.nativeEvent.contentOffset.x + windowWidth / 2;
    let nearest = FIRST_REAL;
    let best = Infinity;
    centres.current.forEach((centre, i) => {
      const gap = Math.abs(centre - focus);
      if (gap < best) {
        best = gap;
        nearest = i;
      }
    });
    if (nearest < FIRST_REAL) scrollToSlot(LAST_REAL, false);
    else if (nearest > LAST_REAL) scrollToSlot(FIRST_REAL, false);
  };

  return (
    <Animated.ScrollView
      ref={ref as any}
      horizontal
      snapToInterval={slot}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      onMomentumScrollEnd={handleMomentumEnd}
      scrollEventThrottle={16}
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
          viewportWidth={windowWidth}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onMeasure={onSlotLayout}
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
  viewportWidth,
  cardWidth,
  cardHeight,
  onMeasure,
  onPress,
}: {
  entry: WrappedEntry;
  index: number;
  scrollX: SharedValue<number>;
  slot: number;
  viewportWidth: number;
  cardWidth: number;
  cardHeight: number;
  onMeasure: (index: number, centre: number) => void;
  onPress?: () => void;
}) {
  const [outerScale, neighbourScale] = SCALE_STEPS;
  // Where this slot actually sits in the content, as measured. Zero until the
  // first layout, which is also why the fan is only driven once it is set.
  const centre = useSharedValue(0);
  const measured = useSharedValue(false);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    centre.value = x + width / 2;
    measured.value = true;
    onMeasure(index, x + width / 2);
  };

  const STEPS = [-2, -1, 0, 1, 2];
  const animatedStyle = useAnimatedStyle(() => {
    if (!measured.value) return { opacity: 0 };
    // Distance in slots between this poster and the middle of the viewport.
    // Scale, opacity and stacking are all symmetric about it.
    const d = (centre.value - (scrollX.value + viewportWidth / 2)) / slot;
    return {
      transform: [
        {
          scale: interpolate(
            d, STEPS,
            [outerScale, neighbourScale, 1, neighbourScale, outerScale],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(d, STEPS, [0.45, 0.7, 1, 0.7, 0.45], Extrapolation.CLAMP),
      zIndex: Math.round(interpolate(d, STEPS, [0, 5, 100, 5, 0], Extrapolation.CLAMP)),
    };
  });

  return (
    <Animated.View
      onLayout={handleLayout}
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
