import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { RehlArt } from '../art';
import { LogoBadge } from '../primitives';
import { HeroPattern } from '../patterns';
import { SmallMoreButton } from './SmallMoreButton';

// "القرآن حياة" hero — 174 tall, cream bg, hero shadow, pattern overlay,
// rehl art on the trailing (right in RTL) side, text block middle, 80×80 octagon callig on leading side.
export function HeroQuran({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.hero,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <HeroPattern style={StyleSheet.absoluteFillObject} opacity={0.25} />

      {/* Rehl illustration, right side */}
      <View style={styles.rehlSlot}>
        <RehlArt />
      </View>

      {/* Text block */}
      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>القرآن حياة</Text>
          <View style={styles.titleBar} />
        </View>
        <Text style={styles.subline}>اقتَرِبْ فَثَمَّ حَياةٌ مَعَ القُرآن لم تحيَها بعد !</Text>
        <SmallMoreButton onPress={onMore} />
      </View>

      {/* Octagonal calligraphy tile, left side */}
      <View style={styles.octagonSlot}>
        <LogoBadge size={80} monogram="القرآن حياة" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 174,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.heroCream,
    overflow: 'hidden',
    position: 'relative',
  },
  rehlSlot: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -43,
    width: 78,
    height: 86,
  },
  textBlock: {
    position: 'absolute',
    right: 108,
    top: '50%',
    marginTop: -45,
    width: 142,
    alignItems: 'flex-end',
    gap: 9,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: KhazainColors.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  titleBar: {
    width: 2,
    height: 26,
    backgroundColor: KhazainColors.navy,
    borderRadius: 1,
  },
  subline: {
    fontFamily: 'Amiri',
    fontSize: 10,
    lineHeight: 13,
    color: KhazainColors.goldAccent,
    fontWeight: '500',
    textAlign: 'center',
    writingDirection: 'rtl',
    maxWidth: 142,
  },
  octagonSlot: {
    position: 'absolute',
    left: 14,
    top: '50%',
    marginTop: -40,
    width: 80,
    height: 80,
  },
});
