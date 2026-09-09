import { KhazainColors, KhazainShadows } from '@/constants/theme';
import type { Lecture } from '@/types/content';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { BookmarkButton } from './BookmarkButton';

// Cream rounded card used across pages 25 / 33 / 34 / 35.
// Visual layout (RTL):
//   [icon disc — flush RIGHT]  [title (bold) + scholar (muted)]   ...   [duration chip + optional bookmark — flush LEFT]
//
// A deterministic row direction keeps the visual order stable without fixed
// left/right reservations, so the text column can grow on narrow phones.
//
// `compact` shrinks the card height + icon for the denser radio variant (page 35).
// `pretitleSmall` renders an optional pretitle line above the title (e.g. "فضيلة الشيخ").
// `iconNode` lets each section slot a different glyph badge.
export function LectureCard({
  id,
  category,
  iconNode,
  title,
  scholar,
  duration,
  pretitleSmall,
  compact,
  showBookmark = false,
  onPress,
}: {
  id: string;
  category: Lecture['category'];
  iconNode: React.ReactNode;
  title: string;
  scholar?: string;
  duration?: string;
  pretitleSmall?: string;
  compact?: boolean;
  showBookmark?: boolean;
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
        <Text style={titleStyle} numberOfLines={compact ? 1 : 2}>
          {title}
        </Text>
        {scholar ? (
          <Text style={scholarStyle} numberOfLines={1}>
            {scholar}
          </Text>
        ) : null}
      </View>

      {/* Left-edge: duration plus an opt-in save affordance. */}
      {duration || showBookmark ? (
        <View style={styles.endCluster}>
          {duration ? <Text style={styles.duration}>{duration}</Text> : null}
          {showBookmark ? (
            <BookmarkButton
              type="lecture"
              entityId={id}
              snapshot={{ type: 'lecture', title, scholar: scholar ?? '', duration: duration ?? '', category }}
              variant="light"
            />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const ROW_DIR: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row' : 'row-reverse';

const styles = StyleSheet.create({
  cardBase: {
    flexDirection: ROW_DIR,
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrapCompact: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 4,
  },
  textBlockCompact: {
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
  endCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  duration: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
});
