import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { responsiveCarouselCardWidth } from '@/constants/layout';
import { BookmarkButton } from '../primitives';

// Figma source-of-truth values (frame "العلماء والمشايخ"):
//   216.1 × 88.37, radius 6.355, padding 8.911, shadow 3.178/0.794/12.712 navy@24%.
//   Gold stripe: 149.59 × 5.07, top -2.54, centered, color #C1A584 (goldBar).
//   Inner SVG: stacked الشيخ (74.63×22.39) + name (178.23×43.69), gap 4.46.
// We scale uniformly to our responsive card width so the card is proportionally
// faithful on every device.
const F_W = 216.1;
const F_H = 88.37;

// SVG natural aspect: she5-2/3 are 179:71, she5-1 is 152:62. Both ≈ 2.5:1.
// The SVG already bakes in both الشيخ and name with the right internal gap,
// so we just scale-to-width-of-inner-area and let height fall out naturally.
const SVG_RATIO = 71 / 179; // matches she5-2/she5-3 exactly; she5-1 is within ~3%

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
  const cardWidth = responsiveCarouselCardWidth(windowWidth);
  const scale = cardWidth / F_W;
  const cardHeight = F_H * scale;
  const padding = 8.91139 * scale;
  const innerWidth = cardWidth - padding * 2;

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
          paddingHorizontal: padding,
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
      <SvgXml xml={svg} width={innerWidth} height={innerWidth * SVG_RATIO} />
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
    justifyContent: 'center',
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
