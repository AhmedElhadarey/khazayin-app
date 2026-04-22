import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { MosqueSilhouette } from '../art';

export type DawahQuote = { tone: string; t: string; b: string };

export const DAWAH_QUOTES: DawahQuote[] = [
  { tone: '#E8DDD0', t: 'دعاء ليلة القدر', b: 'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي' },
  { tone: '#E1D4BE', t: 'من هدي النبي ﷺ', b: 'خيركم من تعلّم\nالقرآن وعلّمه' },
  { tone: '#DBC9B0', t: 'ذكر المساء', b: 'أمسينا وأمسى الملكُ\nلله رب العالمين' },
  { tone: '#E8DDD0', t: 'تدبّر', b: 'ألا بذكر الله\nتطمئنّ القلوب' },
];

// 154×149 dawah poster card: tinted cream bg, mosque silhouette at bottom, gold double-stroke frame, centered quote.
export function DawahPoster({ quote, onPress }: { quote: DawahQuote; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: quote.tone, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={styles.mosque}>
        <MosqueSilhouette />
      </View>
      <View style={styles.goldFrame} />
      <View style={styles.content}>
        <Text style={styles.headline}>{quote.t}</Text>
        <Text style={styles.body}>{quote.b}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 154,
    height: 149,
    borderRadius: KhazainRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(184,134,74,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.22 },
    shadowOpacity: 0.25,
    shadowRadius: 1.22,
    elevation: 2,
  },
  mosque: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 154,
    height: 54,
  },
  goldFrame: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: 1,
    borderColor: KhazainColors.gold400,
    borderRadius: 8,
    opacity: 0.45,
  },
  content: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headline: {
    fontFamily: 'Amiri',
    fontSize: 9,
    color: KhazainColors.gold600,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  body: {
    fontFamily: 'Amiri-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: KhazainColors.navy,
    textAlign: 'center',
    lineHeight: 15.4,
    writingDirection: 'rtl',
  },
});
