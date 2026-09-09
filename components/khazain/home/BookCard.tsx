import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { responsiveCarouselCardWidth } from '@/constants/layout';
import { textStyle } from '@/constants/typography';
import { BookmarkButton } from '../primitives';

// Figma source-of-truth values (frame "الكتب العلمية", node 2001:940):
//   card 192 x 81, navy stripe 113.77 x 3.86 centred at top -1.93.
const F_W = 192;
const F_H = 81;
const F_STRIPE_W = 113.77;
const F_STRIPE_H = 3.86;

// Cream card with navy stripe top and centered navy title.
//
// Figma node 2001:940 states 192 x 81 with a 113.77 x 3.86 navy stripe. The
// height is fixed rather than a minimum so a title that wraps to two lines
// does not make the card — and therefore the whole row — taller than the
// card beside it, which is what made the row a different height on Android
// than on iOS.
export function BookCard({
  id,
  name,
  onPress,
}: {
  id: string;
  name: string;
  onPress?: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = responsiveCarouselCardWidth(windowWidth, 'book');
  const scale = cardWidth / F_W;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          height: F_H * scale,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.navyStripe,
          {
            width: F_STRIPE_W * scale,
            height: F_STRIPE_H * scale,
            top: -(F_STRIPE_H / 2) * scale,
          },
        ]}
      />
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <View style={styles.bookmarkSlot} pointerEvents="box-none">
        <BookmarkButton
          type="book"
          entityId={id}
          snapshot={{ type: 'book', title: name }}
          variant="light"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: KhazainColors.heroCream,
    borderRadius: KhazainRadius.sm,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: 'rgba(20,64,100,0.24)',
    shadowOffset: { width: 2.67, height: 0.67 },
    shadowOpacity: 1,
    shadowRadius: 10.66,
    elevation: 3,
  },
  navyStripe: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: KhazainColors.navy,
  },
  name: {
    // The design renders these titles as calligraphy images. The app's titles
    // are data, so a Naskh face stands in — see CALLIGRAPHY_FAMILY.
    ...textStyle('calligraphyTitle', { color: KhazainColors.navy, textAlign: 'center' }),
  },
  bookmarkSlot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
