import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { KhazainRadius, KhazainShadows } from '@/constants/theme';

const CARD = require('@/assets/khazain/home/hero-prophet-card.png');

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
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.hero,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Image source={CARD} style={styles.image} resizeMode="cover" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Card aspect ratio is 1460:660 ≈ 2.212:1 (cropped from page-05 hi-res render).
    aspectRatio: 1460 / 660,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
