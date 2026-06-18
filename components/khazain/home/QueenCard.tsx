import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { KhazainRadius, KhazainShadows } from '@/constants/theme';

const CARD = require('@/assets/khazain/home/hero-queen-card.webp');

// "أنتِ ملكة" hero — flattened single image cropped from page-05 hi-res render.
// Crown-on-pillow art, title, subtitle copy, and المزيد pill are all baked in.
export function QueenCard({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
  const handle = onPress ?? onMore;
  return (
    <Pressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel="أنتِ ملكة، اضغط للمزيد"
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
    aspectRatio: 1460 / 480,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
