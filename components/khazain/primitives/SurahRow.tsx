import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SurahStar } from './SurahStar';

// Children inside headBlock are listed in JSX as [textCol, star].
// We want textCol visually on the LEFT and star visually on the RIGHT.
// On LTR ('row') children flow left→right, so [textCol, star] = correct.
// On RTL ('row') children flow right→left, so we need 'row-reverse'.
const HEAD_FLEX: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row-reverse' : 'row';

// Cream surah card used on pages 15 (reciter detail) and 21 (mushaf list).
// Layout (visual, RTL): [SurahStar disc] [title + meta stack] (...) [chevron `◀`]
// Implemented with hardcoded JSX order matching RTL visual order, plus
// `flexDirection: 'row'` so the children appear right-to-left on native+web.
export function SurahRow({
  index,
  name,
  meta,
  showChevron = true,
  onPress,
}: {
  index: string; // '٠١', '٠٢', ...
  name: string;
  meta?: string;
  showChevron?: boolean;
  onPress?: () => void;
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
      {/* Right side: star + text, pinned to the right edge */}
      <View style={styles.headBlock}>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <SurahStar index={index} size={40} />
      </View>
      {/* Left side: chevron, pinned to the left */}
      {showChevron ? (
        <View style={styles.chevronBlock}>
          <Svg width={12} height={14} viewBox="0 0 12 14">
            <Path
              d="M9 1 L3 7 L9 13"
              stroke={KhazainColors.navy800}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 70,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    position: 'relative',
    justifyContent: 'center',
  },
  headBlock: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    flexDirection: HEAD_FLEX,
    alignItems: 'center',
    gap: 12,
  },
  textCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 24,
  },
  meta: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  chevronBlock: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
