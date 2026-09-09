import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { textStyle } from '@/constants/typography';
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
const TITLE_SIZE = { width: 95, height: 26, trailingInset: 5.8 };

const BODY =
  'وِجهتُك المُثلى لِتَعرفَ وتَغرفَ مِن سِيرة: النبيِّ ﷺ وأصحابِه العِظام، وأزواجِه الكِرام عَبْرَ محتوًى موثوقٍ شاملٍ يعزِّز الفَهم العميق لشخصيَّاتهم ويبيِّن الأثر العظيم لتضحيَاتهم.';

export function HeroProphet({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
  return (
    <HeroShell
      background={BG}
      backgroundColor={GROUND}
      layers={LAYERS}
      designWidth={DESIGN.width}
      designHeight={DESIGN.height}
      column={COLUMN}
      accessibilityLabel="محمد رسول الله"
      onPress={onPress ?? onMore}
    >
      {(scale) => (
        <>
          <Image
            source={TITLE}
            style={{
              alignSelf: 'flex-end',
              marginRight: TITLE_SIZE.trailingInset * scale,
              width: TITLE_SIZE.width * scale,
              height: TITLE_SIZE.height * scale,
            }}
            contentFit="fill"
            cachePolicy="memory-disk"
            transition={0}
          />
          <Text style={[styles.body, { marginTop: 5.8 * scale }]}>{BODY}</Text>
          <View style={[styles.pillRow, { marginTop: 8.6 * scale }]}>
            <SmallMoreButton onPress={onMore ?? onPress} />
          </View>
        </>
      )}
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  body: {
    ...textStyle('caption', { color: KhazainColors.navy }),
  },
  pillRow: {
    // The design aligns the pill's trailing edge with the copy's.
    alignItems: 'flex-end',
  },
});
