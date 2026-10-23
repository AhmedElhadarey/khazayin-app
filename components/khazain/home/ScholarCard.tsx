import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { KhazainColors } from '@/constants/theme';
import { PHYSICAL_BOX, responsiveCarouselCardWidth } from '@/constants/layout';
import { BookmarkButton } from '../primitives';
import { scholarCardLayout } from './scholarCardLayout';

const HONORIFIC = require('@/assets/khazain/home/scholar-honorific.webp');

// Navy card carrying the design's two pieces of art — the shared gold
// "سماحة الشيخ العلامة" honorific and the scholar's name in calligraphy —
// over a gold stripe that overhangs the top edge. See scholarCardLayout.ts
// for where each rect comes from.
//
// This used to draw one bundled SVG per scholar instead. Those SVGs paint both
// images through <pattern patternContentUnits="objectBoundingBox">, which
// librsvg renders correctly but react-native-svg does not: on device it
// magnified the name roughly 2.4x and tiled it. The .fig's own two images,
// placed at the design's own rects, avoid the pattern path entirely.
export function ScholarCard({
  id,
  nameArt,
  name,
  onPress,
}: {
  id: string;
  /** The scholar's name, as calligraphy. */
  nameArt: ImageSource | number;
  name?: string;
  onPress?: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = responsiveCarouselCardWidth(windowWidth, 'scholar');
  const l = scholarCardLayout(cardWidth);

  return (
    // The bookmark is the Pressable's sibling, not its child: a Pressable is one
    // accessibility element on iOS, so a nested save could not be reached and
    // its label leaked into the card's (as DawahPoster, f4ad707).
    <View style={[styles.frame, { width: cardWidth, height: l.cardHeight }]}>
      <Pressable
        onPress={onPress}
        // A card with no action is not announced as a button that does nothing.
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={name}
        style={({ pressed }) => [
          styles.card,
          {
            width: cardWidth,
            height: l.cardHeight,
            borderRadius: l.radius,
            transform: [{ scale: pressed && onPress ? 0.97 : 1 }],
          },
        ]}
      >
        <View style={[styles.stripe, l.stripe, { borderRadius: l.stripeRadius }]} />
        <Image
          source={HONORIFIC}
          style={[styles.layer, l.honorific]}
          contentFit="fill"
          cachePolicy="memory-disk"
          transition={0}
        />
        <View style={[styles.layer, styles.nameBox, l.name]}>
          <Image
            source={nameArt}
            style={[styles.layer, l.nameArt]}
            contentFit="fill"
            cachePolicy="memory-disk"
            transition={0}
          />
        </View>
      </Pressable>
      <View style={styles.bookmarkSlot} pointerEvents="box-none">
        <BookmarkButton
          type="scholar"
          entityId={id}
          snapshot={{ type: 'scholar', name: name ?? '' }}
          variant="dark"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Not clipped: the stripe overhangs the card's top edge and the shadow
  // spreads past it.
  frame: {
    position: 'relative',
  },
  card: {
    backgroundColor: KhazainColors.navy,
    // Figma: 3.17796px 0.79449px 12.7118px rgba(20, 64, 100, 0.24)
    shadowColor: 'rgba(20,64,100,0.24)',
    shadowOffset: { width: 3.17796, height: 0.79449 },
    shadowOpacity: 1,
    shadowRadius: 12.7118,
    elevation: 3,
  },
  layer: {
    position: 'absolute',
  },
  stripe: {
    position: 'absolute',
    backgroundColor: KhazainColors.goldBar,
  },
  nameBox: {
    // The design's fill transform pushes the art past this box's LEFT edge,
    // and Figma clips it there. Under forced RTL, React Native swaps `left`
    // and `right` on the children of an RTL box, which mirrored that overhang
    // to the other edge — so the box pins its own direction. See the contract
    // in constants/layout.ts. The rects above are centred, so they are
    // unaffected by the swap and do not need pinning.
    ...PHYSICAL_BOX,
    overflow: 'hidden',
  },
  bookmarkSlot: {
    position: 'absolute',
    top: 6,
    right: 6,
    // Android stacks siblings by elevation before order, so without matching
    // the card's the save would draw under it. A view with no background
    // casts no shadow, so this only orders the two.
    elevation: 3,
  },
});
