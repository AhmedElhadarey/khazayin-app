import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { SCALE_STEPS, clampFocus, dawahLayout, nearestSlot, resolveWrap } from './dawahLayout';

// The fan's proportions come from Figma node 2001:940 rather than from
// hand-picked numbers — see `dawahLayout`. The design overlaps these posters
// on purpose; what it does differently from the old constants is make the
// focused poster smaller (39% of the window, not 56%) and step the
// neighbours down harder, which is what reads as depth.
//
// Which poster is focused comes from where each slot actually landed, not
// from `index * slot`. That arithmetic would assume the scroll axis starts at
// content x = 0 and runs left to right. This ScrollView inherits the app's
// forced RTL, so on native its content starts at the RIGHT edge: slot 0 sits
// rightmost, and the poster after the focused one sits on its left. (The data
// order in data/content/dawah.ts relies on that.) Measuring keeps the maths
// independent of it: a slot reports its own centre, and the fan is a function
// of the distance from that to the middle of the viewport.

type WrappedEntry = { item: DawahPosterModel; realIndex: number };

/**
 * Room under the posters. With the shadow down to the file's 1.22 blur there is
 * nothing to leave space for, and the posters end the page 24 above the edge.
 */
const DAWAH_PAD_BOTTOM = 2;

/** Distances from the focused slot that the fan interpolates between. */
const STEPS = [-2, -1, 0, 1, 2];

export function DawahCarousel({
  items,
  onItemPress,
  stageWidth: stageWidthProp,
}: {
  items: DawahPosterModel[];
  onItemPress?: (item: DawahPosterModel, index: number) => void;
  /**
   * Width of the viewport the fan lives in. Defaults to the window, which is
   * the phone behaviour; tablets pass a capped stage so the fan keeps its
   * proportions instead of stretching across the whole screen.
   */
  stageWidth?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const stageWidth = stageWidthProp ?? windowWidth;
  const layout = useMemo(() => dawahLayout(stageWidth), [stageWidth]);
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
  // The centres are measured rather than computed on purpose (see the note at
  // the top: which way the scroll axis runs is not predictable under RTL).
  const centres = useRef<number[]>([]);
  const anchored = useRef(false);
  // The stage the centres were measured at. A new stage re-lays every slot, so
  // the first slot to report afterwards clears the stale centres (done in the
  // layout callback, never during render).
  const measuredStage = useRef(stageWidth);
  // The real slot that was last in focus, so a stage change re-centres on it.
  const focused = useRef(FIRST_REAL);
  // The frame the pending anchor is scheduled on, or null. Anchoring waits one
  // frame so every slot of the same layout pass has reported first.
  const pendingAnchor = useRef<number | null>(null);
  const cancelAnchor = useCallback(() => {
    if (pendingAnchor.current !== null) {
      cancelAnimationFrame(pendingAnchor.current);
      pendingAnchor.current = null;
    }
  }, []);
  useEffect(() => {
    // Not every kept slot is guaranteed to hold its centre across a length
    // change (under RTL the slots may lay out from the right edge), but any
    // that moved will report again. Trim the dropped tail, keep focus on a
    // real slot, and re-anchor once the new pass has landed.
    centres.current.length = Math.min(centres.current.length, wrapped.length);
    focused.current = clampFocus(focused.current, FIRST_REAL, LAST_REAL);
    anchored.current = false;
    cancelAnchor();
  }, [wrapped.length, LAST_REAL, cancelAnchor]);
  useEffect(() => cancelAnchor, [cancelAnchor]);
  const scrollToSlot = useCallback((index: number, animated: boolean) => {
    const centre = centres.current[index];
    if (centre === undefined) return;
    ref.current?.scrollTo({ x: centre - stageWidth / 2, animated });
  }, [stageWidth]);

  const onSlotLayout = useCallback((index: number, centre: number) => {
    if (measuredStage.current !== stageWidth) {
      measuredStage.current = stageWidth;
      centres.current = [];
      anchored.current = false;
      cancelAnchor();
    }
    centres.current[index] = centre;
    // Anchor on the focused poster (the first real one initially) once it has
    // been measured — one frame later, so the centres are the final ones.
    if (
      !anchored.current &&
      pendingAnchor.current === null &&
      centres.current[focused.current] !== undefined
    ) {
      pendingAnchor.current = requestAnimationFrame(() => {
        pendingAnchor.current = null;
        anchored.current = true;
        scrollToSlot(focused.current, false);
      });
    }
  }, [scrollToSlot, stageWidth, cancelAnchor]);

  // Guard: with 0 items render nothing; with 1 item the wrap-around clones
  // would overlap the only real card and onMomentumEnd math breaks (G10).
  if (!items || items.length === 0) return null;
  if (items.length === 1) {
    const only = items[0];
    return (
      <View
        style={{
          paddingTop: KhazainSpacing.x3,
          paddingBottom: DAWAH_PAD_BOTTOM,
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
    const nearest = nearestSlot(
      centres.current,
      e.nativeEvent.contentOffset.x,
      stageWidth,
      FIRST_REAL,
    );
    const { focus, jumpTo } = resolveWrap(nearest, FIRST_REAL, LAST_REAL);
    focused.current = focus;
    if (jumpTo !== undefined) scrollToSlot(jumpTo, false);
  };

  return (
    <Animated.ScrollView
      ref={ref as any}
      horizontal
      snapToInterval={slot}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      style={{ width: stageWidth, alignSelf: 'center' }}
      onMomentumScrollEnd={handleMomentumEnd}
      scrollEventThrottle={16}
      // No `direction` is pinned here: the inherited RTL is what orders the slots
      // right-to-left (see the note at the top of the file).
      contentContainerStyle={{
        paddingTop: KhazainSpacing.x3,
        paddingBottom: DAWAH_PAD_BOTTOM,
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
          viewportWidth={stageWidth}
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

  const animatedStyle = useAnimatedStyle(() => {
    // Hidden until measured. Every branch states `opacity` explicitly: Reanimated
    // does not reset a key the worklet stops returning, so omitting it after the
    // measure left the slot stuck at 0 and the carousel drew nothing.
    if (!measured.value) return { opacity: 0 };
    // Distance in slots between this poster and the middle of the viewport.
    // Scale and stacking are symmetric about it. Opacity is not driven at all:
    // every poster in the design is fully opaque.
    const d = (centre.value - (scrollX.value + viewportWidth / 2)) / slot;
    return {
      opacity: 1,
      transform: [
        {
          scale: interpolate(
            d, STEPS,
            [outerScale, neighbourScale, 1, neighbourScale, outerScale],
            Extrapolation.CLAMP,
          ),
        },
      ],
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
