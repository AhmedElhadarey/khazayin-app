import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { QuranBadge } from './QuranBadge';

// JSX order is [textCol, badge]. We want textCol visually on the LEFT and
// badge visually on the RIGHT. Picks 'row' on LTR / 'row-reverse' on RTL.
const HEAD_FLEX: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row-reverse' : 'row';

// Reciter / Quran-list row used on pages 13/14 (reciter tabs list) and
// page 16 (qiraat sheet — `chevron` only, no subtitle).
// Visual order (RTL): [QuranBadge disc] [title + subtitle] (...) [navy `◀` chevron]
export function ReciterRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
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
      <View style={styles.headBlock}>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <QuranBadge size={44} />
      </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
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
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
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
