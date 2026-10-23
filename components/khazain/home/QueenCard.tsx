import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { HeroShell } from './HeroShell';
import { SmallMoreButton } from './SmallMoreButton';

const WATERMARK = require('@/assets/khazain/home/queen-watermark.webp');
const CROWN = require('@/assets/khazain/home/queen-crown.webp');
const EMBLEM = require('@/assets/khazain/home/queen-emblem.webp');

// Figma node 2812:1392 «أنتِ ملكة», card 361 x 96, radius 16.
//
// This used to be one flattened raster with the copy baked in. It is now the
// file's own layers, bottom to top, on the shared HeroShell:
//   ground      GRADIENT_LINEAR, left to right, #EDE0D1 → #F1E8DD at 0.5529 → #EDE0D1
//   watermark   2812:1393, pink calligraphy, LUMINOSITY at 0.08 (baked, see below)
//   crown art   2812:1396, the crown on its pillow, clipped by mask 2812:1395
//   emblem      2815:1402, the «أنتِ ملكة» calligraphy in teal/gold gradients
//   copy        2812:1397, live text with the 2 x 15 gold bar and the المزيد pill
//
// Raster layers are cut and baked by scripts/figma/extract-images.js (crown,
// watermark) and extract-queen-emblem.js (emblem, rendered from the file's
// vectors). React Native has no blend modes, so the watermark's LUMINOSITY blend
// is pre-composited against the card's own ground with its 0.08 opacity in the
// alpha channel; drawn at full opacity it reproduces the design.
const DESIGN = { width: 361, height: 96 };
const COLUMN = { left: 157, width: 120, top: 6, bottom: 6 };

// Crown art grounded at the bottom (the mask ends 0.45 above the card's edge),
// the watermark and emblem hang from the top, so extra height from live copy
// shows as ground rather than stretching any art.
const LAYERS = [
  { source: WATERMARK, left: 276, top: 0, width: 85, height: 96 },
  { source: CROWN, left: 0, bottom: 0.45, width: 298.79, height: 92.55 },
  { source: EMBLEM, left: 294, top: 6, width: 54.57, height: 82.47 },
];

const GROUND_COLORS = ['#EDE0D1', '#F1E8DD', '#EDE0D1'] as const;
const GROUND_LOCATIONS = [0, 0.5528846383094788, 1] as const;

/** Frame 2812:1398: the title, 4 to its right a 2 x 15 #D7B995 bar (radius 4). */
const TITLE_BAR = { width: 2, height: 15, radius: 4, gap: 4 };

/** The design's shadow is #000 at 25%, blur 4, 4 down. */
const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;

const BODY =
  'مَلِكةٌ أنتِ لا سِواكِ وفي قُربك من ربك: هُداكِ فأعدَدنا لكِ هذا المحتوى النَّدِي لتَصنعي جِيلًا على هَدي النبي ﷺ';

export function QueenCard({
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
      backdrop={
        <LinearGradient
          colors={GROUND_COLORS}
          locations={GROUND_LOCATIONS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      }
      backgroundColor={GROUND_COLORS[0]}
      shadow={SHADOW}
      layers={LAYERS}
      designWidth={DESIGN.width}
      designHeight={DESIGN.height}
      column={COLUMN}
      accessibilityLabel="أنتِ ملكة"
      onPress={onPress ?? onMore}
      fill={fill}
    >
      {(scale) => (
        <>
          {/* Pinned at 1 like the other heroes: the card's art is a fixed
            proportion of its width, so the copy must not scale with the
            system font and re-wrap the composition. The title takes the width
            the bar leaves instead of sizing to its content, so it cannot lose
            its last word on Android 15+. */}
          <View style={[styles.titleRow, { gap: TITLE_BAR.gap * scale }]}>
            <Text style={styles.title} maxFontSizeMultiplier={1}>
              أنتِ ملكة
            </Text>
            <View
              style={{
                width: TITLE_BAR.width * scale,
                height: TITLE_BAR.height * scale,
                borderRadius: TITLE_BAR.radius * scale,
                backgroundColor: KhazainColors.goldCalligraphy,
              }}
            />
          </View>
          <Text style={[styles.body, { marginTop: 4 * scale }]} maxFontSizeMultiplier={1}>
            {BODY}
          </Text>
          <View style={[styles.pillRow, { marginTop: 4 * scale }]}>
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
    ...textStyle('label', { color: KhazainColors.navy, textAlign: 'right' }),
    flexGrow: 1,
    flexShrink: 1,
  },
  body: {
    // Figma sets 8pt; live text floors at MIN_BODY_SIZE, so the card grows.
    ...textStyle('caption', { color: KhazainColors.queenBody, textAlign: 'right' }),
  },
  pillRow: {
    alignItems: 'flex-end',
  },
});
