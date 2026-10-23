import { MIN_TOUCH_TARGET, PHYSICAL_ROW } from '@/constants/layout';
import {
  INLINE_HEADER_ORDER,
  type InlineHeaderSlot,
  backAccessibilityLabel,
} from '@/constants/rtlContracts';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { KhazainColors } from '@/constants/theme';
import { CHROME_MAX_FONT_SCALE, TEXT_ROLES, textStyle } from '@/constants/typography';
import { useWindowControlsInset } from '@/hooks/useResponsiveLayout';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
/** The title's unscaled line height: the `bodyLarge` role, not a copy of it. */
const TITLE_LINE = TEXT_ROLES.bodyLarge.lineHeight;
/** Centres one unscaled title line in the 44pt target: (44 - 28) / 2 = 8. */
const TITLE_INSET = (MIN_TOUCH_TARGET - TITLE_LINE) / 2;

/**
 * Offset that keeps the 20pt arrow where the file puts it against the title's
 * first line. At font scale 1 the arrow box is top-aligned with the 28pt line
 * (8..28 in the 44 row, offset 0). The title is capped at CHROME_MAX_FONT_SCALE
 * and its line grows with the scale while its top stays at TITLE_INSET, so the
 * arrow moves down by half the growth to follow the line's centre.
 */
export function backGlyphOffset(fontScale: number): number {
  return (scaledTitleLine(fontScale) - TITLE_LINE) / 2;
}

/** One `bodyLarge` chrome line at a font scale: capped at CHROME_MAX_FONT_SCALE like every chrome Text. */
export function scaledTitleLine(fontScale: number): number {
  return TITLE_LINE * Math.min(fontScale, CHROME_MAX_FONT_SCALE);
}

/**
 * The row's height: at least the 44pt target, growing once the capped title line
 * plus its two TITLE_INSET paddings exceeds it. `HeaderArt`'s band follows this.
 */
export function inlineHeaderHeight(fontScale: number): number {
  return Math.max(MIN_TOUCH_TARGET, 2 * TITLE_INSET + scaledTitleLine(fontScale));
}

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
  const { fontScale } = useWindowDimensions();
  const slots: Record<InlineHeaderSlot, React.ReactNode> = {
    title: (
      <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}>
        {title}
      </Text>
    ),
    // Back affordance points RIGHT — the standard RTL "back" direction,
    // unified with DetailHeader (T5.4 / audit A11Y-P2-1). The glyph is the
    // file's own `vuesax/bulk/arrow-right` at 20, the control every frame in
    // the set instances (65 times across the file), not a drawn chevron.
    // Colour: all 65 instances override both vectors to SOLID #281E13 (inkTitle).
    back: (
      <View style={{ marginTop: backGlyphOffset(fontScale) }}>
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
  title: {
    ...textStyle('bodyLarge', { color: KhazainColors.inkTitle }),
    flexShrink: 1,
  },
});
