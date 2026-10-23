import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { textStyle } from '@/constants/typography';
import { PHYSICAL_ROW } from '@/constants/layout';
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

/**
 * The title frame (2093:1655) is a horizontal auto-layout: the title, 3.83 to
 * its right a 2 x 26 navy bar (2093:1657, radius 0.96), the pair ending flush
 * with the column's trailing edge.
 */
const TITLE_BAR = { width: 2, height: 26, radius: 0.96, gap: 3.83 };

/** Gaps in the column (measured against frame 2093:1655): title → subtitle, subtitle → المزيد pill. */
const SUBTITLE_GAP = 5.8;
const PILL_GAP = 8;

const SUBTITLE = 'اقْتَرَبَ فَثَمَّ حَيَاة مع القرآن لَمْ تَحْيَهَا بُعْد !';

export function HeroQuran({
  onPress,
  onMore,
  fill,
}: {
  onPress?: () => void;
  onMore?: () => void;
  /** Grow to the height of the row this card shares (tablet pair). */
  fill?: boolean;
}) {
  return (
    <HeroShell
      background={BG}
      backgroundColor={GROUND}
      layers={LAYERS}
      designWidth={DESIGN.width}
      designHeight={DESIGN.height}
      column={COLUMN}
      accessibilityLabel="القرآن حياة"
      accessibilityHint={SUBTITLE}
      onPress={onPress ?? onMore}
      onMore={onMore ?? onPress}
      fill={fill}
    >
      {(scale) => (
        <>
          {/* The hero copy sits inside an artwork frame whose height is a fixed
            proportion of its width (HeroShell scales every layer by
            measuredWidth / designWidth). Letting the type grow with the system
            font scale re-wraps the prose and pushes the card past that
            proportion — on a Galaxy A30 at 384dp the prophet card went from
            ~18% of the screen to ~46%, which read as "the hero is too big".
            Pinned at 1 so the composition holds; the surrounding UI still
            scales to the app-wide 1.2 ceiling. */}
          {/* The row spans the column and the title takes whatever the bar
            leaves, so the title is never sized to its own content: a
            shrink-wrapped Arabic Text can lose its last word on Android 15+. */}
          <View style={[styles.titleRow, { gap: TITLE_BAR.gap * scale }]}>
            <Text style={styles.title} maxFontSizeMultiplier={1}>
              القرآن حــياة
            </Text>
            <View
              style={{
                width: TITLE_BAR.width * scale,
                height: TITLE_BAR.height * scale,
                borderRadius: TITLE_BAR.radius * scale,
                backgroundColor: KhazainColors.navy,
              }}
            />
          </View>
          <Text
            style={[styles.subtitle, { marginTop: SUBTITLE_GAP * scale }]}
            maxFontSizeMultiplier={1}
          >
            {SUBTITLE}
          </Text>
          <View importantForAccessibility="no-hide-descendants" style={[styles.pillRow, { marginTop: PILL_GAP * scale }]}>
            <SmallMoreButton onPress={onMore ?? onPress} />
          </View>
        </>
      )}
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    // Physical order [title][bar]; the bar is the trailing (right) edge.
    ...PHYSICAL_ROW,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  title: {
    ...textStyle('heroTitle', { color: KhazainColors.navy, textAlign: 'right' }),
    flexGrow: 1,
    flexShrink: 1,
  },
  subtitle: {
    // Figma sets the subtitle in the gold accent, centred under the title.
    ...textStyle('caption', { color: KhazainColors.goldAccent, textAlign: 'center' }),
  },
  pillRow: {
    alignItems: 'flex-end',
  },
});
