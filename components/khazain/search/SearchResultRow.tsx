import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';

// Shared row used by all 4 group types in the search modal.
// RTL: icon on visual right (a flex slot in the PHYSICAL_ROW), meta chip on visual left.
//
// Track: khazain-search_20260510  T7

type Props = {
  iconNode: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  /** Rendered first (physical left), before the meta chip, e.g. a bookmark button. */
  accessory?: React.ReactNode;
  onPress: () => void;
};

export function SearchResultRow({ iconNode, title, subtitle, meta, accessory, onPress }: Props) {
  // The row chrome is a plain View so the accessory (a sibling, not a descendant of
  // the accessible Pressable) stays its own VoiceOver element.
  // Feedback lives on the whole card frame, so track the press here rather than
  // in the Pressable's style callback (which only reaches the inner content).
  const [pressed, setPressed] = useState(false);
  const oneLine = useLineClamp(1);
  return (
    <View
      style={[
        styles.row,
        { transform: [{ scale: pressed ? 0.99 : 1 }], opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {/* Physical left → right: accessory, meta chip, title block, icon. */}
      {accessory ?? null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        // Reading order: without a label the meta chip, drawn at the physical
        // left, is read first.
        accessibilityLabel={[title, subtitle, meta].filter(Boolean).join('، ')}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        // The row's padding (16 x 8) sits outside the Pressable; hitSlop keeps the
        // whole card tappable. The accessory covers the left edge on its own.
        hitSlop={{ top: 8, bottom: 8, right: 16, left: accessory ? 0 : 16 }}
        style={styles.press}
      >
        {meta ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaText} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        ) : null}

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={oneLine}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={oneLine}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.iconSlot}>{iconNode}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    backgroundColor: KhazainColors.cream50,
    borderRadius: CARD_DENSITY.reciterRowRadius,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: CARD_DENSITY.listGap,
    borderColor: KhazainColors.hairlineWarm,
  },
  press: {
    ...PHYSICAL_ROW,
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 12,
  },
  iconSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    // Full width: a shrink-wrapped Arabic title loses its last word on Android 15+.
    alignItems: 'stretch',
  },
  title: textStyle('cardTitle', { color: KhazainColors.ink900 }),
  subtitle: {
    ...textStyle('caption', { color: KhazainColors.inkSubtle }),
    marginTop: 2,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: KhazainRadius.sm,
    backgroundColor: KhazainColors.cream100,
    marginLeft: 8,
  },
  metaText: textStyle('label', { color: KhazainColors.ink900 }),
});
