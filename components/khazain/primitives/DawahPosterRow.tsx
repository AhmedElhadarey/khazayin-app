import { ShareIcon } from '@/components/khazain/icons';
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import type { DawahPoster as DawahPosterModel } from '@/types/content';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Image } from 'expo-image';

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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Physical left — action icons (share + download) */}
      <View style={styles.actions}>
        <Pressable
          onPress={onShare}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
          accessibilityLabel="مشاركة"
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <ShareIcon size={20} color={KhazainColors.ink700} strokeWidth={1.6} />
        </Pressable>
        <Pressable
          onPress={onDownload}
          hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}
          accessibilityLabel="تنزيل"
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            {/* Square outline + downward arrow (matches Figma boxed download icon) */}
            <Path
              d="M5 5 h11 a3 3 0 0 1 3 3 v11 a3 3 0 0 1 -3 3 H8 a3 3 0 0 1 -3 -3 z"
              stroke={KhazainColors.ink700}
              strokeWidth={1.6}
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M12 9 v6 M9 13 L12 16 L15 13"
              stroke={KhazainColors.ink700}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      {/* Centre — title */}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
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
    paddingVertical: 8,
    paddingHorizontal: CARD_DENSITY.lectureCardPaddingHorizontal,
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
  titleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: textStyle('cardTitle', { color: KhazainColors.inkTitle }),
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
