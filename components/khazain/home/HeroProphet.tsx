import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { textStyle } from '@/constants/typography';
import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { HeroShell } from './HeroShell';
import { SmallMoreButton } from './SmallMoreButton';

const BG = require('@/assets/khazain/home/hero-prophet-bg.webp');
const SCROLL = require('@/assets/khazain/home/hero-prophet-scroll.webp');
const EMBLEM = require('@/assets/khazain/home/hero-prophet-emblem.webp');
const TITLE = require('@/assets/khazain/home/hero-prophet-title.webp');

// Figma node 2001:940, frame "محمد رسول الله" — card 361 x 149.
//
// The artwork is composited from the .fig's own layers (patterned ground,
// scroll and books, the ﷺ emblem at the right edge, and the title
// calligraphy, which is a picture in the design too). The body copy and the
// المزيد pill are not baked in: the copy is set live so it can be corrected
// and so it renders at a readable size, and the pill is its own target.
const DESIGN = { width: 361, height: 149 };

// The column holds the title calligraphy, the copy and the pill. It starts at
// the title's top edge, and its trailing edge is where the design aligns all
// three.
const COLUMN = { left: 120.5, width: 161, top: 11, bottom: 11.9 };

// The scroll and books are grounded at the card's bottom; the emblem hangs
// from the top. Anchoring each to the edge the design anchors it to is what
// keeps the composition right when live copy makes the card taller.
const LAYERS = [
  { source: SCROLL, left: -12, bottom: 18.3, width: 155, height: 95.73 },
  { source: EMBLEM, left: 290, top: 35, width: 64.62, height: 79.37 },
];

/** Sampled from the artwork's flat ground. */
const GROUND = '#EBE1D0';

/** The title is calligraphy in the design, so it stays a picture. */
const TITLE_SIZE = { width: 95, height: 26 };

/** Frame 2007:479: the title image, 3.83 to its right a 2 x 25 navy bar (2007:481, radius 0.96). */
const TITLE_BAR = { width: 2, height: 25, radius: 0.96, gap: 3.83 };

/** Gaps in the column (measured against frame 2007:479): title → body, body → المزيد pill. */
const BODY_GAP = 5.8;
const PILL_GAP = 8.6;

const BODY =
  'وِجهتُك المُثلى لِتَعرفَ وتَغرفَ مِن سِيرة: النبيِّ ﷺ وأصحابِه العِظام، وأزواجِه الكِرام عَبْرَ محتوًى موثوقٍ شاملٍ يعزِّز الفَهم العميق لشخصيَّاتهم ويبيِّن الأثر العظيم لتضحيَاتهم.';

export function HeroProphet({
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
      accessibilityLabel="محمد رسول الله"
      accessibilityHint={BODY}
      onPress={onPress ?? onMore}
      onMore={onMore ?? onPress}
      fill={fill}
    >
      {(scale) => (
        <>
          <View style={[styles.titleRow, { gap: TITLE_BAR.gap * scale }]}>
            <Image
              source={TITLE}
              style={{
                width: TITLE_SIZE.width * scale,
                height: TITLE_SIZE.height * scale,
              }}
              contentFit="fill"
              cachePolicy="memory-disk"
              transition={0}
            />
            <View
              style={{
                width: TITLE_BAR.width * scale,
                height: TITLE_BAR.height * scale,
                borderRadius: TITLE_BAR.radius * scale,
                backgroundColor: KhazainColors.navy,
              }}
            />
          </View>
          {/* The hero copy sits inside an artwork frame whose height is a fixed
            proportion of its width (HeroShell scales every layer by
            measuredWidth / designWidth). Letting the type grow with the system
            font scale re-wraps the prose and pushes the card past that
            proportion — on a Galaxy A30 at 384dp the prophet card went from
            ~18% of the screen to ~46%, which read as "the hero is too big".
            Pinned at 1 so the composition holds; the surrounding UI still
            scales to the app-wide 1.2 ceiling. */}
          <Text
            style={[styles.body, { marginTop: BODY_GAP * scale }]}
            maxFontSizeMultiplier={1}
          >
            {BODY}
          </Text>
          <View style={[styles.pillRow, { marginTop: PILL_GAP * scale }]}>
            <SmallMoreButton onPress={onMore ?? onPress} />
          </View>
        </>
      )}
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    // Physical order [title][bar]; the pair ends on the column's trailing edge.
    ...PHYSICAL_ROW,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  body: {
    ...textStyle('caption', { color: KhazainColors.inkBrown }),
  },
  pillRow: {
    // The design aligns the pill's trailing edge with the copy's.
    alignItems: 'flex-end',
  },
});
