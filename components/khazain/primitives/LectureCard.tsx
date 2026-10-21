import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { LECTURE_CARD_ORDER, type LectureCardSlot } from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { lectureSaveTarget } from '@/services/savedToggle';
import type { Lecture } from '@/types/content';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookmarkButton } from './BookmarkButton';
import { useSaveGesture } from './useSaveGesture';

// Cream rounded card used across pages 25 / 33 / 34 / 35.
//
// Physical order (left → right) is duration/actions, text, section badge —
// Figma nodes 2465:1911, 2589:1772, 2597:2552, 2606:3830. LECTURE_CARD_ORDER
// drives it inside a PHYSICAL_ROW container, so forceRTL cannot reverse it.
//
// `DIV-139` is the same node in 2465:1911, 2589:1772, 2597:2552 and 2606:3830:
// 64 tall at radius 16, `#FCFAF8` behind a 1pt `#D9D6D3` hairline, inset 8, and
// — like every card in these frames — casting no shadow at all.
//
// `compact` is the shape the two rail lists use (2869:2088, 2869:2306): 56
// tall at radius 20 with no stroke, because the rail supplies the edge.
// `pretitleSmall` renders an optional pretitle line above the title (e.g. "فضيلة الشيخ").
// `iconNode` lets each section slot a different glyph badge.
//
// Saving: the frames draw no bookmark on a lecture row, so the unsaved row
// renders exactly as they do. A long-press (or the screen-reader custom action)
// saves the lecture through useSaveGesture; once saved, a BookmarkButton
// appears in the meta slot beside the duration, and tapping it unsaves.
export function LectureCard({
  id,
  category,
  iconNode,
  title,
  scholar,
  duration,
  pretitleSmall,
  compact,
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
  onPress?: () => void;
}) {
  // `compact` changes the card's shape and clamps the title to one line — the
  // rail lists are single-line in the file. It no longer forks the text
  // styles: both frames set the same faces and sizes.
  const heightStyle = compact ? styles.cardCompact : styles.card;

  const saveTarget = useMemo(
    () => lectureSaveTarget({ id, title, scholar, duration, category }),
    [id, title, scholar, duration, category],
  );
  const { saved, gestureProps } = useSaveGesture(saveTarget);

  const slots: Record<LectureCardSlot, React.ReactNode> = {
    // Physical left: duration, plus a bookmark once the lecture is saved. The
    // frames draw no bookmark, so the unsaved row stays exactly as they do;
    // saving is a long-press (useSaveGesture).
    meta:
      duration || saved ? (
        <View style={styles.endCluster}>
          {duration ? <Text style={styles.duration}>{duration}</Text> : null}
          {saved ? (
            <BookmarkButton
              type={saveTarget.type}
              entityId={saveTarget.entityId}
              snapshot={saveTarget.snapshot}
              variant="light"
            />
          ) : null}
        </View>
      ) : null,
    text: (
      <View style={styles.textBlock}>
        {pretitleSmall ? (
          <Text style={styles.pretitle} numberOfLines={1}>
            {pretitleSmall}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
          {title}
        </Text>
        {scholar ? (
          <Text style={styles.scholar} numberOfLines={1}>
            {scholar}
          </Text>
        ) : null}
      </View>
    ),
    // Physical right: the section badge disc.
    badge: <View style={styles.iconWrap}>{iconNode}</View>,
  };

  return (
    <Pressable
      onPress={onPress}
      {...gestureProps}
      style={({ pressed }) => [
        styles.cardBase,
        heightStyle,
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
    gap: 8,
    backgroundColor: KhazainColors.cardBg,
    justifyContent: 'center',
    paddingHorizontal: CARD_DENSITY.lectureCardPaddingHorizontal,
    paddingVertical: 8,
  },
  card: {
    minHeight: CARD_DENSITY.lectureCardMinHeight,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
  },
  cardCompact: {
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    borderRadius: CARD_DENSITY.railRowRadius,
  },
  iconWrap: {
    width: CARD_DENSITY.lectureBadgeDisc,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  // `H3-145` is TheMixArab Regular 14 and `P-148` TheMixArab Regular 12 in
  // every one of these frames — the body face, not the calligraphic one the
  // app had been reaching for.
  pretitle: textStyle('caption', { color: KhazainColors.ink500 }),
  title: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  scholar: textStyle('caption', { color: KhazainColors.ink500 }),
  endCluster: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  // `45 دقيقة-143` is TheSansArabic Bold 12 in `#5F5345` — the same warm ink
  // as the subtitle, not the navy the app had been using.
  duration: textStyle('label', { color: KhazainColors.ink500 }),
});
