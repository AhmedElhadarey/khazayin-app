import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { KhazainRadius, KhazainShadows } from '@/constants/theme';

const CARD = require('@/assets/khazain/home/hero-queen-card.png');

// "أنتِ ملكة" hero — flattened single image cropped from page-05 hi-res render.
// Crown-on-pillow art, title, subtitle copy, and المزيد pill are all baked in.
export function QueenCard({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
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
    aspectRatio: 1460 / 480,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
