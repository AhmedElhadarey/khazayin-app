import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KhazainRadius } from '@/constants/theme';

export type DawahQuote = {
  tone: string;
  t: string;
  b: string;
  source?: ImageSourcePropType;
};

const DAWAH_LAYLAT = require('@/assets/khazain/home/dawah-laylat-alqadr.png');
const DAWAH_HELAL = require('@/assets/khazain/home/dawah-helal.png');
const DAWAH_MAWIZA = require('@/assets/khazain/home/dawah-mawiza-sabah.png');

// Real Figma poster art rendered as images. Tone is kept on each entry
// for share-sheet wiring; quote text is preserved for accessibility/share.
export const DAWAH_QUOTES: DawahQuote[] = [
  { tone: '#1A3F62', t: 'دعاء ليلة القدر', b: 'اللهم إنك عفوٌّ كريم تحب العفو فاعفُ عنّي', source: DAWAH_LAYLAT },
  { tone: '#3F2A1B', t: 'موعظة الصباح', b: 'فاجعل لها قِسطًا من دعائك', source: DAWAH_MAWIZA },
  { tone: '#1A3F62', t: 'هلال', b: 'كلُّ الحياة', source: DAWAH_HELAL },
];

// 3D dawah poster card — full-bleed Figma poster image with layered depth.
// Width/height are configurable so the focused carousel can render larger
// poster art while other surfaces (e.g. a row primitive) keep the default.
export function DawahPoster({
  quote,
  onPress,
  width = 178,
  height = 188,
}: {
  quote: DawahQuote;
  onPress?: () => void;
  width?: number;
  height?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          height,
          backgroundColor: quote.tone,
          transform: [
            { perspective: 1200 },
            { scale: pressed ? 0.96 : 1 },
          ],
          shadowOpacity: pressed ? 0.18 : 0.32,
        },
      ]}
    >
      {quote.source ? (
        <Image source={quote.source} style={styles.image} resizeMode="cover" />
      ) : null}

      {/* Top edge sheen — simulates a raised bevel catching light */}
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        locations={[0, 0.45]}
        style={styles.sheen}
        pointerEvents="none"
      />

      {/* Hairline highlight stroke around the perimeter for depth */}
      <View style={styles.bevel} pointerEvents="none" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: KhazainRadius.md,
    overflow: 'hidden',
    position: 'relative',
    // Soft anchored shadow with slight horizontal offset = lifted-tile feel.
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
  },
  bevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: KhazainRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
