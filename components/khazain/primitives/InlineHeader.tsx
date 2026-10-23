import { MIN_TOUCH_TARGET, PHYSICAL_ROW } from '@/constants/layout';
import {
  INLINE_HEADER_ORDER,
  type InlineHeaderSlot,
  backAccessibilityLabel,
} from '@/constants/rtlContracts';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useWindowControlsInset } from '@/hooks/useResponsiveLayout';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

// Pages 13/14/15/21/25/26/28/29/34: an inline page header that does NOT use
// the circular back-chip from DetailHeader. The title sits at the physical
// right edge with the back chevron immediately beyond it, pointing right —
// Figma nodes 2031:6193, 2102:2975, 2465:1911.
//
// The whole group is pushed to the right by `justifyContent: 'flex-end'`
// inside a PHYSICAL_ROW, so the two children keep their authored order on
// every platform. Height is content-driven so a larger font scale grows the
// header rather than clipping the title.
//
// The title is set in the *body* face at 18, not the calligraphic one: every
// header in the file — all seventeen Sections frames, plus Home, Library and
// More — states TheMixArab Regular 18 in `#281E13`. The app had been setting
// Amiri Bold in navy, which read as a different screen family entirely.
/** The size every frame instances the back control at. */
const BACK_GLYPH = 20;
/** `bodyLarge` leading (see constants/typography.ts). */
const TITLE_LINE = 28;
/** Centres one title line in the 44pt target: (44 - 28) / 2. */
const TITLE_INSET = (MIN_TOUCH_TARGET - TITLE_LINE) / 2;
/**
 * In the file the title and the 20x20 arrow share one 20pt row, so the glyph
 * centre is the title's optical centre. Centring the 20pt icon on the 28pt line
 * box put it 3.6pt below that on iOS (Arabic ink sits above the line-box
 * centre), so the icon box starts 2pt below the line top (span 10..30 in the
 * 44 row) instead of the 4pt a pure line-box centring would give. Anchored to
 * the first line, so a wrapped title at large font scale does not drag it.
 */
const BACK_TOP_OFFSET = 2;

export function InlineHeader({
  title,
  onBack,
  style,
}: {
  title: string;
  onBack?: () => void;
  /** Outer row style, e.g. the tablet reading column. */
  style?: StyleProp<ViewStyle>;
}) {
  const slots: Record<InlineHeaderSlot, React.ReactNode> = {
    title: (
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    ),
    // Back affordance points RIGHT — the standard RTL "back" direction,
    // unified with DetailHeader (T5.4 / audit A11Y-P2-1). The glyph is the
    // file's own `vuesax/bulk/arrow-right` at 20, the control every frame in
    // the set instances (65 times across the file), not a drawn chevron.
    // Colour: all 65 instances override both vectors to SOLID #281E13 (inkTitle).
    back: (
      <View style={styles.backGlyph}>
        <FigmaIcon name="Back" size={BACK_GLYPH} color={KhazainColors.inkTitle} />
      </View>
    ),
  };

  // In an iPad window the system's window controls sit over a top corner; a margin
  // (not padding) leaves the caller's row padding intact.
  const controls = useWindowControlsInset();
  return (
    <View style={[styles.row, style]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel(title)}
        style={({ pressed }) => [
          styles.touchArea,
          { marginLeft: controls.left, marginRight: controls.right, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {INLINE_HEADER_ORDER.map((slot) => (
          <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
        ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The file's `Header` band is 36 with the title glyph box 8 into it. The row
   * keeps `MIN_TOUCH_TARGET` instead, which is 8 taller — the deliberate cost
   * of a 44pt target — and centres the title in it, landing the glyph at about
   * 12. Adding `headerPaddingTop` on top of that put it at 20, twice as far
   * down as the file states, and pushed every screen's content with it.
   */
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
    alignItems: 'flex-start',
    paddingVertical: TITLE_INSET,
    gap: 4, // Figma header itemSpacing
    minWidth: 0,
    flexShrink: 1,
  },
  backGlyph: { marginTop: BACK_TOP_OFFSET },
  title: {
    ...textStyle('bodyLarge', { color: KhazainColors.inkTitle }),
    flexShrink: 1,
  },
});
