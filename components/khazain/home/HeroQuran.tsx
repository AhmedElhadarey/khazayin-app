import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { KhazainRadius, KhazainShadows } from '@/constants/theme';

const CARD = require('@/assets/khazain/home/hero-quran-card.webp');

// "القرآن حياة" hero — flattened single image cropped from the Figma
// page-05 render. Rehl, navy emblem, title, subtitle, and المزيد pill are
// all baked into one PNG. `onPress` and `onMore` both trigger the same tap.
export function HeroQuran({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
  const handle = onPress ?? onMore;
  return (
    <Pressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel="القرآن حياة، اضغط للمزيد"
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
    aspectRatio: 1460 / 660,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
