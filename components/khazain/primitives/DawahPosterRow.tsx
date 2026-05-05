import { ShareIcon } from '@/components/khazain/icons';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DawahPoster, DawahQuote } from '../home/DawahPoster';

// Page 30 (تصميمات دعوية → month detail) — list row composed of:
//   [poster thumb (gold double-frame) — RIGHT]
//   [title bold — center, right-aligned]
//   [share + download icon column — LEFT]
//
// Reuses the existing DawahPoster component, scaled down to a smaller thumb
// (~80px tall) so it fits the row layout shown in the Figma export.
export function DawahPosterRow({
  title,
  quote,
  onPress,
  onShare,
  onDownload,
}: {
  title: string;
  quote: DawahQuote;
  onPress?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* RIGHT — poster thumbnail */}
      <View style={styles.thumbWrap} pointerEvents="none">
        <View style={styles.thumbScale}>
          <DawahPoster quote={quote} />
        </View>
      </View>

      {/* CENTER — title */}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* LEFT — action icons (share + download) */}
      <View style={styles.actions}>
        <Pressable
          onPress={onShare}
          hitSlop={8}
          accessibilityLabel="مشاركة"
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <ShareIcon size={20} color={KhazainColors.ink700} strokeWidth={1.6} />
        </Pressable>
        <Pressable
          onPress={onDownload}
          hitSlop={8}
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
    </Pressable>
  );
}

const POSTER_W = 80;
const POSTER_H = 78;

const styles = StyleSheet.create({
  row: {
    minHeight: POSTER_H + 20,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    position: 'relative',
    justifyContent: 'center',
  },
  thumbWrap: {
    position: 'absolute',
    right: 12,
    top: 10,
    bottom: 10,
    width: POSTER_W,
    height: POSTER_H,
    overflow: 'hidden',
    borderRadius: 10,
  },
  thumbScale: {
    // The DawahPoster is 154x149; shrink it to ~POSTER_W × POSTER_H using transform-scale.
    width: 154,
    height: 149,
    transform: [{ scale: POSTER_W / 154 }],
    transformOrigin: 'top right' as any,
  },
  titleWrap: {
    paddingRight: POSTER_W + 24,
    paddingLeft: 78,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: POSTER_H,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  actions: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
