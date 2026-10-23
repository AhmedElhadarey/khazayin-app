import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';
import type { DawahPoster as DawahPosterModel } from '@/types/content';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

/** `DIV-144` on 2120:1857 draws both actions at 20. */
const ACTION_GLYPH = 20;

// تصميمات دعوية → month detail (Figma node 2120:1857).
//
// Physical left → right: [share][download]  [title]  [poster thumb]
//
// Authored in that order inside PHYSICAL_ROW containers. The previous version
// pinned the two clusters to absolute `left`/`right` edges, which forceRTL
// swapped, and left the middle unable to shrink.
//
// `DIV-139` is 361 x 89 at radius 16 behind a 1pt `#D9D6D3` hairline, inset 8,
// with a 74 x 73 poster at radius 8 on the physical right and the title set in
// the display face at 14 — this is one of the two frames that title a row that
// way rather than in the body face.
export function DawahPosterRow({
  title,
  quote,
  onPress,
  onShare,
  onDownload,
}: {
  title: string;
  quote: DawahPosterModel;
  onPress?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}) {
  const oneLine = useLineClamp(1);
  return (
    // The actions are the opener's siblings, not its children: a Pressable is
    // one accessibility element on iOS, so nested share / download buttons
    // could not be reached (as the Home cards, b62b865).
    <View style={styles.row}>
      {/* Physical left — action icons (share + download) */}
      <View style={styles.actions}>
        <Pressable
          onPress={onShare}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`مشاركة: ${title}`}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <FigmaIcon name="DawahShare" size={ACTION_GLYPH} color={KhazainColors.inkTitle} />
        </Pressable>
        <Pressable
          onPress={onDownload}
          // 8 on the right: the opener starts one gap away and must not lose taps.
          hitSlop={{ top: 12, bottom: 12, left: 4, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`تنزيل: ${title}`}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <FigmaIcon name="DawahDownload" size={ACTION_GLYPH} color={KhazainColors.inkTitle} />
        </Pressable>
      </View>

      {/* Centre and physical right — title and poster open the poster. The
          hitSlop gives back the row's inset, which used to be tappable. */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        hitSlop={{ top: 7, bottom: 7, right: CARD_DENSITY.lectureCardPaddingHorizontal }}
        style={({ pressed }) => [styles.open, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={oneLine}>
          {title}
        </Text>
      </View>

      {/* Physical right — `43 ليله القدر دعاء`, a plain 74 x 73 image at
          radius 8. Not the 3D `DawahPoster`: the frame draws no bevel, sheen
          or shadow here, and at thumbnail size on Android that component's
          elevation layer swallowed the artwork and left only its tone. */}
      <View style={[styles.thumbWrap, { backgroundColor: quote.tone ?? undefined }]} pointerEvents="none">
        {quote.imageSource ? (
          <Image
            source={quote.imageSource}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : null}
      </View>
      </Pressable>
    </View>
  );
}

const POSTER_W = 74;
const POSTER_H = 73;

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: POSTER_H + 16,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    // 1 + 7 + 73 + 7 + 1 = 89.
    paddingVertical: 7,
    paddingHorizontal: CARD_DENSITY.lectureCardPaddingHorizontal,
    alignItems: 'center',
    gap: 8,
  },
  // Title and poster, 8 apart as when the row held all three directly.
  open: {
    ...PHYSICAL_ROW,
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 8,
  },
  thumbWrap: {
    width: POSTER_W,
    height: POSTER_H,
    overflow: 'hidden',
    borderRadius: 8,
    flexShrink: 0,
  },
  thumb: {
    width: POSTER_W,
    height: POSTER_H,
  },
  // Full width, never shrink-wrapped: Android 15+ breaks lines by ink bounds
  // while RN 0.81 measures by advances, so a shrink-wrapped Arabic title loses
  // its last word. The title right-aligns itself through its role (RTL_TEXT).
  titleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  title: {
    ...textStyle('cardTitle', { color: KhazainColors.inkTitle }),
    alignSelf: 'stretch',
  },
  // The two icons are 20pt and 8 apart, so their hitSlop is asymmetric: each
  // reaches out to the row's edge but stops short of its neighbour, or taps in
  // the band between them would resolve by z-order.
  actions: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
