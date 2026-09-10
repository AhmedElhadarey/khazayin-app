import React, { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { responsiveCarouselCardWidth } from '@/constants/layout';
import { BookmarkButton } from '../primitives';
import { svgAspect } from './svgAspect';

// Figma source-of-truth values (node 2001:940, frame "العلماء والمشايخ"):
//   card 216.1 × 88.37, radius 6.355, shadow 3.178/0.794/12.712 navy@24%.
//   Gold stripe: 149.59 × 5.07, top -2.54, centred, colour #C1A584 (goldBar).
//
// The design draws the interior as TWO images, centred on the card: the gold
// سماحة الشيخ العلامة line (74.63 × 22.39) at y 8.91, and the scholar's name
// (178.23 × 43.69) at y 35.76 — a block 178.23 wide and 70.54 tall.
//
// The app cannot use the design's second image, because that is one specific
// scholar and these names are data; it carries a bundled SVG per scholar
// instead, which composes the same two lines. Its viewBox (179 × 71) is the
// design's block almost exactly, so the block's own geometry is right — but
// it was being stretched to the card's full inner width (198.28) and centred
// vertically, drawing it about 11% too wide and 4pt too high.
const F_W = 216.1;
const F_H = 88.37;

/** The interior block, as the design sizes and places it. */
const F_BLOCK_W = 178.23;
const F_BLOCK_TOP = 8.91;

// The bundled SVGs do not share a natural size — she5-2/3 are 179:71 but
// she5-1 is 152:62 — so each one is sized from its own viewBox. A single
// shared ratio compressed the first card's calligraphy by 2.8%.
const FALLBACK_SVG_RATIO = 71 / 179;

// Navy ribbon card whose interior is a bundled SVG (calligraphic الشيخ +
// scholar name baked together). The gold stripe is a separate <View> so
// its width can scale with the card; matches Figma's auto-layout export.
export function ScholarCard({
  id,
  svg,
  name,
  onPress,
}: {
  id: string;
  svg: string;
  name?: string;
  onPress?: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = responsiveCarouselCardWidth(windowWidth, 'scholar');
  // Parsing the viewBox out of the SVG string is cheap but not free, and this
  // renders once per card per scroll frame.
  const svgRatio = useMemo(() => svgAspect(svg, FALLBACK_SVG_RATIO), [svg]);
  const scale = cardWidth / F_W;
  const cardHeight = F_H * scale;
  const blockWidth = F_BLOCK_W * scale;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          borderRadius: 6.35592 * scale,
          paddingTop: F_BLOCK_TOP * scale,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.goldStripe,
          {
            top: -2.54 * scale,
            width: 149.59 * scale,
            height: 5.07 * scale,
          },
        ]}
      />
      <SvgXml xml={svg} width={blockWidth} height={blockWidth * svgRatio} />
      <View style={styles.bookmarkSlot} pointerEvents="box-none">
        <BookmarkButton
          type="scholar"
          entityId={id}
          snapshot={{ type: 'scholar', name: name ?? '' }}
          variant="dark"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: KhazainColors.navy,
    alignItems: 'center',
    // The block is placed from the card's top, not centred: the design leaves
    // more room below it than above.
    justifyContent: 'flex-start',
    // Figma: 3.17796px 0.79449px 12.7118px rgba(20, 64, 100, 0.24)
    shadowColor: 'rgba(20,64,100,0.24)',
    shadowOffset: { width: 3.17796, height: 0.79449 },
    shadowOpacity: 1,
    shadowRadius: 12.7118,
    elevation: 3,
  },
  goldStripe: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: KhazainColors.goldBar,
  },
  bookmarkSlot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
