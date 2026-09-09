import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { KhazainRadius, KhazainShadows } from '@/constants/theme';

// Cropped from `hero-prophet-card.webp` (kept on disk, unmodified) to satisfy
// design §6.2: "Replace or crop the Prophet hero to the Figma composition …
// no extra dominant artwork." The source render carried the words
// "محمد رسول الله" twice — once as the title calligraphy and again as a large
// teal emblem flanking the right edge. The crop drops the duplicate emblem and
// rebalances the vertical margins (48/108 → 40/40), which moves the title to
// the RTL start edge and the المزيد pill to the bottom start corner.
const CARD = require('@/assets/khazain/home/hero-prophet-card-cropped.webp');

// "محمد رسول الله ﷺ" hero — flattened single image cropped from the Figma
// page-05 render. The whole layer (scroll + calligraphy emblem + body text +
// المزيد pill) is baked in, so the card is just an Image with a Pressable.
// `onPress` and `onMore` both trigger the card-level tap (the pill is part
// of the image and cannot be tapped independently).
export function HeroProphet({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
  const handle = onPress ?? onMore;
  return (
    <Pressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel="محمد رسول الله، اضغط للمزيد"
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.hero,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Image source={CARD} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={0} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Card aspect ratio is 1168:583 ≈ 2.003:1 (see the crop note above).
    aspectRatio: 1168 / 583,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
