import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * The daily-wird card's middle row (node 2031:4659): «بدء الورد» at the
 * physical left, the reading summary on the right.
 *
 * At 320dp x font scale 1.7 the summary «لم تبدأ القراءة بعد» wrapped and its
 * first line ran into the button: the two shared an edge with no gap, and the
 * last glyph's ink hangs past the advance the line was broken by. The button
 * now never shrinks, the column takes the rest, and a gap separates them.
 */
export function WirdStartRow({
  meta,
  highlight,
  onStart,
  style,
}: {
  meta: string;
  highlight?: string | null;
  onStart: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    // Physical left → right: "بدء الورد", then the reading summary.
    <View style={[styles.row, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="بدء الورد"
        onPress={onStart}
        style={({ pressed }) => [styles.startBtn, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={styles.startBtnLabel}>بدء الورد</Text>
      </Pressable>
      {/* One full-width column (Android 15: a shrink-wrapped Arabic Text can
          lose its last word), the texts right-aligned inside it. */}
      <View style={styles.textCol}>
        <Text style={styles.meta}>{meta}</Text>
        {highlight ? <Text style={styles.highlight}>{highlight}</Text> : null}
      </View>
    </View>
  );
}

const BUTTON_TO_TEXT_GAP = 12;

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'flex-start',
    // At the default scale the summary is short and right-aligned, so the gap
    // sits in empty space and the row renders as before.
    gap: BUTTON_TO_TEXT_GAP,
  },
  startBtn: {
    // minHeight, so a large-scale label grows the button instead of clipping.
    minHeight: 36,
    flexShrink: 0,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
  },
  startBtnLabel: textStyle('cardTitle', { color: KhazainColors.pageBg }),
  meta: textStyle('cardTitle', { color: KhazainColors.inkTitle }),
  highlight: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    marginTop: 4,
  },
});
