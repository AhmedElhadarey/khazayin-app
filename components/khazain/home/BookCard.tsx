import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { KhazainColors } from '@/constants/theme';
import { responsiveCarouselCardWidth } from '@/constants/layout';
import { textStyle } from '@/constants/typography';
import { BookmarkButton } from '../primitives';
import { bookCardLayout } from './bookCardLayout';

// Cream card with a navy stripe straddling its top edge and the title as
// calligraphy — the scholar card's treatment inverted. See bookCardLayout.ts
// for where each rect comes from.
//
// `titleArt` is optional: a book with no lockup falls back to live text in the
// Naskh stand-in, which is how every card used to render.
export function BookCard({
  id,
  name,
  titleArt,
  onPress,
}: {
  id: string;
  name: string;
  /** The title, as calligraphy. Falls back to live text when absent. */
  titleArt?: ImageSource | number;
  onPress?: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = responsiveCarouselCardWidth(windowWidth, 'book');
  const l = bookCardLayout(cardWidth);

  return (
    <Pressable
      onPress={onPress}
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
      <View style={[styles.stripe, l.stripe]} />
      {titleArt ? (
        <Image
          source={titleArt}
          style={[styles.title, l.title]}
          // The design's fill is STRETCH with an identity transform: the
          // 450 x 108 lockup is squeezed into the 160 x 37 rect.
          contentFit="fill"
          cachePolicy="memory-disk"
          transition={0}
        />
      ) : (
        <View style={[styles.title, styles.fallback, l.title]}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
        </View>
      )}
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
    shadowColor: 'rgba(20,64,100,0.24)',
    shadowOffset: { width: 2.67, height: 0.67 },
    shadowOpacity: 1,
    shadowRadius: 10.66,
    elevation: 3,
  },
  stripe: {
    position: 'absolute',
    backgroundColor: KhazainColors.navy,
  },
  title: {
    position: 'absolute',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    // Only reached by a book with no lockup. The design renders these titles
    // as calligraphy, so a Naskh face stands in — see CALLIGRAPHY_FAMILY.
    ...textStyle('calligraphyTitle', { color: KhazainColors.navy, textAlign: 'center' }),
  },
  bookmarkSlot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
