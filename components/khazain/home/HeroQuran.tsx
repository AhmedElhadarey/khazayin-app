import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { textStyle } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';
import { HeroShell } from './HeroShell';
import { SmallMoreButton } from './SmallMoreButton';

const BG = require('@/assets/khazain/home/hero-quran-bg.webp');
const REHL = require('@/assets/khazain/home/hero-quran-rehl.webp');
const EMBLEM = require('@/assets/khazain/home/hero-quran-emblem.webp');

// Figma node 2001:940, frame "القرآن حــياة" — card 361 x 174.
//
// Unlike the Prophet card, this one's title is real text in the design
// (TheSansArabic Bold 20), so it is real text here too. The artwork carries
// the patterned ground, the rehl and the emblem — including the MULTIPLY
// shadows and SCREEN glow the .fig sets on the illustration.
const DESIGN = { width: 361, height: 174 };
const COLUMN = { left: 102, width: 142, top: 56, bottom: 12 };

// The rehl is grounded at the card's bottom — the design lets it sit a hair
// below the edge — and the emblem hangs from the top.
const LAYERS = [
  { source: REHL, left: -26.2, bottom: -1.4, width: 155.49, height: 133.44 },
  { source: EMBLEM, left: 268, top: 44, width: 77.38, height: 85.73 },
];

/** Sampled from the artwork's flat ground. */
const GROUND = '#EBE1D0';

/** The design aligns the title, subtitle and pill on the column's trailing edge. */
const TRAILING_INSET = 5.8;

const SUBTITLE = 'اقْتَرَبَ فَثَمَّ حَيَاة مع القرآن لَمْ تَحْيَهَا بُعْد !';

export function HeroQuran({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
  return (
    <HeroShell
      background={BG}
      backgroundColor={GROUND}
      layers={LAYERS}
      designWidth={DESIGN.width}
      designHeight={DESIGN.height}
      column={COLUMN}
      accessibilityLabel="القرآن حياة"
      onPress={onPress ?? onMore}
    >
      {(scale) => (
        <>
          <Text style={[styles.title, { marginRight: TRAILING_INSET * scale }]}>
            القرآن حــياة
          </Text>
          <Text style={[styles.subtitle, { marginTop: 5.8 * scale }]}>{SUBTITLE}</Text>
          <View style={[styles.pillRow, { marginTop: 8 * scale }]}>
            <SmallMoreButton onPress={onMore ?? onPress} />
          </View>
        </>
      )}
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...textStyle('heroTitle', { color: KhazainColors.navy }),
  },
  subtitle: {
    ...textStyle('caption', { color: KhazainColors.navy }),
  },
  pillRow: {
    alignItems: 'flex-end',
  },
});
