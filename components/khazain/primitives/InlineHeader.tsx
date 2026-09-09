import { MIN_TOUCH_TARGET, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import {
  INLINE_HEADER_ORDER,
  type InlineHeaderSlot,
  backAccessibilityLabel,
} from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Pages 13/14/15/21/25/26/28/29/34: an inline page header that does NOT use
// the circular back-chip from DetailHeader. The title sits at the physical
// right edge with the back chevron immediately beyond it, pointing right —
// Figma nodes 2031:6193, 2102:2975, 2465:1911.
//
// The whole group is pushed to the right by `justifyContent: 'flex-end'`
// inside a PHYSICAL_ROW, so the two children keep their authored order on
// every platform. Height is content-driven so a larger font scale grows the
// header rather than clipping the title.
export function InlineHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  const slots: Record<InlineHeaderSlot, React.ReactNode> = {
    title: (
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    ),
    // Back affordance points RIGHT — the standard RTL "back" direction,
    // unified with DetailHeader (T5.4 / audit A11Y-P2-1).
    back: (
      <Svg width={10} height={12} viewBox="0 0 10 12">
        <Path
          d="M3 1 L8 6 L3 11"
          stroke={KhazainColors.navy800}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    ),
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel(title)}
        style={({ pressed }) => [styles.touchArea, { opacity: pressed ? 0.7 : 1 }]}
      >
        {INLINE_HEADER_ORDER.map((slot) => (
          <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
        ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  touchArea: {
    ...PHYSICAL_ROW,
    minHeight: MIN_TOUCH_TARGET, // full target even though the title is shorter
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: KhazainColors.navy800,
    ...RTL_TEXT,
    flexShrink: 1,
  },
});
