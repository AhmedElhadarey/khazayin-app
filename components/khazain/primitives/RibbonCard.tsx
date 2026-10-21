import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import type { SaveTarget } from '@/services/savedToggle';
import React, { useMemo } from 'react';
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
  // The caller builds a fresh target every render (lectureSaveTarget(l)); key
  // the memo on the identity that matters so useSaveGesture's memo holds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSave = useMemo(() => save, [save?.entityId]);
  const { saved, gestureProps } = useSaveGesture(stableSave);
  const durationNode = duration ? <Text style={styles.duration}>{duration}</Text> : null;

  return (
    <Pressable
      onPress={onPress}
      {...gestureProps}
      style={({ pressed }) => [
        styles.card,
        badge ? styles.cardWithBadge : styles.cardWithRibbon,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Physical left — duration; plus a bookmark once saved (frame draws none). */}
      {saved && stableSave ? (
        <View style={styles.metaCluster}>
          {durationNode}
          <BookmarkButton
            type={stableSave.type}
            entityId={stableSave.entityId}
            snapshot={stableSave.snapshot}
            variant="light"
          />
        </View>
      ) : (
        durationNode
      )}

      {/* Centre — title block, right-aligned */}
      <View style={styles.titleBlock}>
        {pretitle ? <Text style={styles.pretitle}>{pretitle}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cardWithRibbon: {
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    borderRadius: CARD_DENSITY.reciterRowRadius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    paddingVertical: 4,
    paddingHorizontal: CARD_DENSITY.lectureCardPaddingHorizontal,
  },
  ribbon: {
    alignSelf: 'stretch',
    // The ribbon reaches the card's own edge, past the row's inset.
    marginVertical: 1,
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
    alignItems: 'flex-end',
    gap: 2,
  },
  pretitle: textStyle('caption', { color: KhazainColors.ink500 }),
  title: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  meta: textStyle('caption', { color: KhazainColors.ink500 }),
  duration: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    flexShrink: 0,
  },
  metaCluster: { ...PHYSICAL_ROW, alignItems: 'center', gap: 6, flexShrink: 0 },
});
