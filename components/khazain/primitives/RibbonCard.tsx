import { CARD_DENSITY, PHYSICAL_ROW, LIST_ROW_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';
import type { SaveTarget } from '@/services/savedToggle';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookmarkButton } from './BookmarkButton';
import { useSaveGesture } from './useSaveGesture';

// Cream card with a thin gold vertical ribbon on the RIGHT edge (start-side in RTL).
// Used on العلماء والمشايخ (page 26), كل الشرح (page 28).
//
// The two frames draw genuinely different cards, so the `badge` branch is a
// shape switch rather than only a swapped child:
//   - scholar list, node 2102:2975 `DIV-107` — 64 tall at radius 20, no stroke,
//     inset 16, with the 40pt disc at the physical right;
//   - scholar detail, node 2510:1990 `DIV-139` — 56 tall at radius 12 behind a
//     1pt `#D9D6D3` hairline, inset 8, with a 12 x 54 `#A88051` ribbon rounded
//     on its outer side only.
//
// Physical left → right: duration, title block, trailing adornment. The
// adornment is a badge disc on the scholar list (node 2102:2975) and the gold
// ribbon on the scholar detail list (node 2510:1990).
//
// `save` (scholar detail only) makes the lecture saveable by long-press through
// useSaveGesture. The frame draws no bookmark, so the unsaved card is unchanged;
// once saved, the physical left becomes a [duration, bookmark] cluster.
export function RibbonCard({
  pretitle,
  title,
  meta,
  duration,
  badge,
  save,
  onPress,
}: {
  pretitle?: string;
  title: string;
  meta?: string;
  duration?: string;
  /**
   * Trailing adornment. The scholar list uses a quill badge disc (node
   * 2102:2975); the scholar detail list keeps the gold ribbon (node
   * 2510:1990). Omit for the ribbon.
   */
  badge?: React.ReactNode;
  /** Opt-in lecture save (long-press + bookmark once saved). Scholar detail only. */
  save?: SaveTarget;
  onPress?: () => void;
}) {
  const { saved, gestureProps } = useSaveGesture(save);
  const oneLine = useLineClamp(1);
  const twoLines = useLineClamp(2);
  const durationNode = duration ? <Text style={styles.duration}>{duration}</Text> : null;

  return (
    <Pressable
      onPress={onPress}
      {...gestureProps}
      // Named in reading order: without a label iOS joins the children in
      // physical order and reads the duration first, as a plain group.
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[pretitle, title, meta, duration].filter(Boolean).join('، ')}
      style={({ pressed }) => [
        styles.card,
        badge ? styles.cardWithBadge : styles.cardWithRibbon,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Physical left — duration; plus a bookmark once saved (frame draws none). */}
      {saved && save ? (
        <View style={styles.metaCluster}>
          {durationNode}
          {/* Hidden from screen readers, as on SurahRow: the card carries the
              saved state and the unsave action. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <BookmarkButton
              type={save.type}
              entityId={save.entityId}
              snapshot={save.snapshot}
              variant="light"
            />
          </View>
        </View>
      ) : (
        durationNode
      )}

      {/* Centre — title block, right-aligned */}
      <View style={styles.titleBlock}>
        {pretitle ? (
          <Text style={[styles.pretitle, badge ? styles.pretitleBadge : styles.pretitleRibbon]}>{pretitle}</Text>
        ) : null}
        <Text
          style={[
            styles.title,
            badge ? styles.titleBadge : styles.titleRibbon,
            !badge && meta ? styles.titleRibbonWithMeta : null,
          ]}
          numberOfLines={twoLines}
        >
          {title}
        </Text>
        {meta ? (
          <Text style={[styles.meta, badge ? null : styles.metaRibbon]} numberOfLines={oneLine}>
            {meta}
          </Text>
        ) : null}
      </View>

      {/* Physical right — badge disc, or the gold ribbon when none is given */}
      {badge ?? <View style={styles.ribbon} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 8,
    backgroundColor: KhazainColors.cardBg,
    overflow: 'hidden',
  },
  cardWithBadge: {
    minHeight: CARD_DENSITY.scholarRowMinHeight,
    borderRadius: CARD_DENSITY.railRowRadius,
    // 8 + 48 + 8 = 64. The disc sits 8 from the physical right edge, the
    // duration 16 from the left (card is a PHYSICAL_ROW, so these are physical).
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 16,
  },
  cardWithRibbon: {
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    borderRadius: CARD_DENSITY.reciterRowRadius,
    borderWidth: LIST_ROW_TEXT.borderWidth,
    borderColor: KhazainColors.hairlineWarm,
    // 1 + 3 + 48 + 3 + 1 = 56.
    paddingVertical: LIST_ROW_TEXT.paddingVertical,
    paddingHorizontal: CARD_DENSITY.lectureCardPaddingHorizontal,
  },
  ribbon: {
    alignSelf: 'stretch',
    // The ribbon reaches the card's own edge, past the row's inset, and runs
    // from the border's inner edge to the other (54 in a 56 row).
    marginVertical: -LIST_ROW_TEXT.paddingVertical,
    marginRight: -CARD_DENSITY.lectureCardPaddingHorizontal,
    width: 12,
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
    backgroundColor: KhazainColors.goldAccent,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    // Stretch, don't shrink-wrap: Android 15+ breaks lines by ink bounds while
    // RN 0.81 measures by advances, so a Text boxed to its advance width loses
    // its last word. Each Text right-aligns itself via textStyle (RTL_TEXT).
    alignItems: 'stretch',
    gap: 0,
  },
  pretitle: textStyle('caption', { color: KhazainColors.ink500 }),
  title: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  meta: textStyle('caption', { color: KhazainColors.ink500 }),
  // Scholar list (2102:2975): 16/24 title, 12/24 pretitle, both in inkTitle.
  pretitleBadge: textStyle('captionLoose', { color: KhazainColors.inkTitle }),
  titleBadge: textStyle('body', { color: KhazainColors.inkTitle }),
  // Ribbon rows (2510:1990): 24 title + 4 + 20 meta. A recommendation's reason is 20 too.
  pretitleRibbon: { lineHeight: LIST_ROW_TEXT.subtitleLineHeight },
  titleRibbon: textStyle('bodyCompactLoose', { color: KhazainColors.inkTitle }),
  titleRibbonWithMeta: { marginBottom: LIST_ROW_TEXT.titleGap },
  metaRibbon: { lineHeight: LIST_ROW_TEXT.subtitleLineHeight },
  duration: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    flexShrink: 0,
  },
  metaCluster: { ...PHYSICAL_ROW, alignItems: 'center', gap: 6, flexShrink: 0 },
});
