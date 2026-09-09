import { CARD_DENSITY, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Cream card with a thin gold vertical ribbon on the RIGHT edge (start-side in RTL).
// Used on العلماء والمشايخ (page 26), كل الشرح (page 28).
//
// Physical left → right: duration, title block, trailing adornment. The
// adornment is a badge disc on the scholar list (node 2102:2975) and the gold
// ribbon on the scholar detail list (node 2510:1990).
export function RibbonCard({
  pretitle,
  title,
  meta,
  duration,
  badge,
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
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Physical left — duration */}
      {duration ? <Text style={styles.duration}>{duration}</Text> : null}

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
    gap: 12,
    minHeight: CARD_DENSITY.scholarRowMinHeight,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  ribbon: {
    alignSelf: 'stretch',
    marginVertical: -2,
    width: 5,
    borderRadius: 3,
    backgroundColor: KhazainColors.goldBar,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  pretitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: KhazainColors.ink500,
    ...RTL_TEXT,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: KhazainColors.ink900,
    ...RTL_TEXT,
  },
  meta: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    color: KhazainColors.ink500,
    marginTop: 2,
    ...RTL_TEXT,
  },
  duration: {
    flexShrink: 0,
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
  },
});
