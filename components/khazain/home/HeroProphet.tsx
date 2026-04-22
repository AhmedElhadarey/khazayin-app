import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { ScrollArt } from '../art';
import { HeroPattern } from '../patterns';
import { SmallMoreButton } from './SmallMoreButton';

// "محمد رسول الله ﷺ" hero — 149 tall, cream bg + hero pattern overlay.
// Scroll+books art on trailing (right in RTL) side, text block middle-leading.
export function HeroProphet({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
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

      <View style={styles.scrollSlot}>
        <ScrollArt />
      </View>

      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>محمد رسول الله ﷺ</Text>
          <View style={styles.titleBar} />
        </View>
        <Text style={styles.subline}>
          وِجْهتُكَ المُثلى لِتَعرِفَ وتَغرِفَ من سيرة النبيِّ ﷺ وأصحابِهِ الكِرام عبرَ محتوى موثوقٍ شامل.
        </Text>
        <SmallMoreButton onPress={onMore} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 149,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.heroCream,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollSlot: {
    position: 'absolute',
    right: 6,
    top: '50%',
    marginTop: -60,
    width: 100,
    height: 120,
  },
  textBlock: {
    position: 'absolute',
    right: 110,
    top: '50%',
    marginTop: -40,
    width: 161,
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
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: KhazainColors.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  titleBar: {
    width: 2,
    height: 25,
    backgroundColor: KhazainColors.navy,
    borderRadius: 1,
  },
  subline: {
    fontFamily: 'Amiri',
    fontSize: 10,
    lineHeight: 14,
    color: KhazainColors.inkSubtle,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
