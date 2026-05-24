import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { BookmarkButton } from '../primitives';

// Width scales with screen so the carousel always shows ~1.8 cards regardless
// of device (iPhone SE → Pro Max). 16px horizontal page padding + 12px gap.
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 16 * 2 - 12) / 1.8;

// Figma source-of-truth values (frame "العلماء والمشايخ"):
//   216.1 × 88.37, radius 6.355, padding 8.911, shadow 3.178/0.794/12.712 navy@24%.
//   Gold stripe: 149.59 × 5.07, top -2.54, centered, color #C1A584 (goldBar).
//   Inner SVG: stacked الشيخ (74.63×22.39) + name (178.23×43.69), gap 4.46.
// We scale uniformly to our responsive CARD_W so the card is proportionally
// faithful on every device.
const F_W = 216.1;
const F_H = 88.37;
const SCALE = CARD_W / F_W;
const CARD_H = F_H * SCALE;
const RADIUS = 6.35592 * SCALE;
const PADDING = 8.91139 * SCALE;
const STRIPE_W = 149.59 * SCALE;
const STRIPE_H = 5.07 * SCALE;
const STRIPE_TOP = -2.54 * SCALE;

// SVG natural aspect: she5-2/3 are 179:71, she5-1 is 152:62. Both ≈ 2.5:1.
// The SVG already bakes in both الشيخ and name with the right internal gap,
// so we just scale-to-width-of-inner-area and let height fall out naturally.
const INNER_W = CARD_W - PADDING * 2;
const SVG_RATIO = 71 / 179; // matches she5-2/she5-3 exactly; she5-1 is within ~3%
const SVG_H = INNER_W * SVG_RATIO;

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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={styles.goldStripe} />
      <SvgXml xml={svg} width={INNER_W} height={SVG_H} />
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
    width: CARD_W,
    height: CARD_H,
    backgroundColor: KhazainColors.navy,
    borderRadius: RADIUS,
    paddingHorizontal: PADDING,
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
    top: STRIPE_TOP,
    width: STRIPE_W,
    height: STRIPE_H,
    alignSelf: 'center',
    backgroundColor: KhazainColors.goldBar,
  },
  bookmarkSlot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
