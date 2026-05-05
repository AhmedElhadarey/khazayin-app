import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Cream rounded card used across pages 25 / 33 / 34 / 35.
// Visual layout (RTL):
//   [icon disc — flush RIGHT]  [title (bold) + scholar (muted)]   ...   [duration chip — flush LEFT]
//
// All inner pieces use absolute positioning to survive `forceRTL` quirks
// across native + web (per CLAUDE.md).
//
// `compact` shrinks the card height + icon for the denser radio variant (page 35).
// `pretitleSmall` renders an optional pretitle line above the title (e.g. "فضيلة الشيخ").
// `iconNode` lets each section slot a different glyph badge.
export function LectureCard({
  iconNode,
  title,
  scholar,
  duration,
  pretitleSmall,
  compact,
  onPress,
}: {
  iconNode: React.ReactNode;
  title: string;
  scholar?: string;
  duration?: string;
  pretitleSmall?: string;
  compact?: boolean;
  onPress?: () => void;
}) {
  const heightStyle = compact ? styles.cardCompact : styles.card;
  const iconWrapStyle = compact ? styles.iconWrapCompact : styles.iconWrap;
  const titleStyle = compact ? styles.titleCompact : styles.title;
  const scholarStyle = compact ? styles.scholarCompact : styles.scholar;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardBase,
        heightStyle,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Right-edge: icon disc. */}
      <View style={iconWrapStyle}>{iconNode}</View>

      {/* Center text block, anchored to the right (visually leading edge in RTL). */}
      <View style={[styles.textBlock, compact && styles.textBlockCompact]}>
        {pretitleSmall ? (
          <Text style={styles.pretitle} numberOfLines={1}>
            {pretitleSmall}
          </Text>
        ) : null}
        <Text style={titleStyle} numberOfLines={1}>
          {title}
        </Text>
        {scholar ? (
          <Text style={scholarStyle} numberOfLines={1}>
            {scholar}
          </Text>
        ) : null}
      </View>

      {/* Left-edge: duration chip. */}
      {duration ? (
        <View style={styles.durationBlock}>
          <Text style={styles.duration}>{duration}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  card: {
    minHeight: 84,
    paddingVertical: 14,
  },
  cardCompact: {
    minHeight: 64,
    paddingVertical: 10,
  },
  iconWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapCompact: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    paddingRight: 70, // leave room for icon disc on the right
    paddingLeft: 86, // leave room for the duration chip on the left
    alignItems: 'flex-end',
    gap: 4,
  },
  textBlockCompact: {
    paddingRight: 56,
    paddingLeft: 76,
    gap: 2,
  },
  pretitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '500',
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  titleCompact: {
    fontFamily: 'Amiri-Bold',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  scholar: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  scholarCompact: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  durationBlock: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  duration: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
});
