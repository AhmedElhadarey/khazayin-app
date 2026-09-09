import { PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { LECTURE_CARD_ORDER, type LectureCardSlot } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import type { Lecture } from '@/types/content';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookmarkButton } from './BookmarkButton';

// Cream rounded card used across pages 25 / 33 / 34 / 35.
//
// Physical order (left → right) is duration/actions, text, section badge —
// Figma nodes 2465:1911, 2589:1772, 2597:2552, 2606:3830. LECTURE_CARD_ORDER
// drives it inside a PHYSICAL_ROW container, so forceRTL cannot reverse it.
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

  const slots: Record<LectureCardSlot, React.ReactNode> = {
    // Physical left: duration plus an opt-in save affordance.
    meta:
      duration || showBookmark ? (
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
      ) : null,
    text: (
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
    ),
    // Physical right: the section badge disc.
    badge: <View style={iconWrapStyle}>{iconNode}</View>,
  };

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
      {LECTURE_CARD_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    ...PHYSICAL_ROW,
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
    ...RTL_TEXT,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: KhazainColors.ink900,
    ...RTL_TEXT,
  },
  titleCompact: {
    fontFamily: 'Amiri-Bold',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: KhazainColors.ink900,
    ...RTL_TEXT,
  },
  scholar: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    ...RTL_TEXT,
  },
  scholarCompact: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink500,
    ...RTL_TEXT,
  },
  endCluster: {
    ...PHYSICAL_ROW,
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
