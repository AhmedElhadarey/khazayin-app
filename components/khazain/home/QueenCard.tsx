import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { KhazainRadius, KhazainShadows } from '@/constants/theme';

const CARD = require('@/assets/khazain/home/hero-queen-card.webp');

// "أنتِ ملكة" card — flattened single image cropped from the page-05 render.
// Crown-on-pillow art, title, subtitle copy, and المزيد pill are all baked in.
//
// The export carried the page background as a margin — 18px above the card and
// 74 below — so the card drew a dead strip of #F8F2ED along its bottom edge.
// The asset is now cropped to the card itself, and the aspect below is the
// design's (Figma node 2001:940 states 361 x 96) rather than the export's.
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
    aspectRatio: 361 / 96,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
