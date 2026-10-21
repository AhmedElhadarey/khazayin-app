import { PAGE_CHROME, PHYSICAL_ROW } from '@/constants/layout';
import { SEARCH_PILL_ORDER, type SearchPillSlot } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { FigmaIcon } from '../icons/FigmaIcon';

type Props = Omit<TextInputProps, 'style'> & {
  dark?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Button mode: when provided, renders a Pressable that calls onPress.
   * The Pressable visually mimics the input (placeholder text in a child
   * Text). No keyboard, no caret. Used by 13 host screens to open the
   * search modal.
   * Omit for input mode (a real TextInput).
   */
  onPress?: () => void;
  /**
   * Input mode only: when set AND `value` is non-empty, renders an X icon at
   * the physical RIGHT of the pill — the RTL start edge, opposite the
   * magnifier, per SEARCH_PILL_ORDER. Tapping it calls onClear.
   */
  onClear?: () => void;
};

// The search control, node "Inputs" — redrawn identically in all seventeen
// Sections frames and in Home and Library: 361 x 40 at radius 12, on `cardBg`
// with a `#D9D6D3` hairline and a soft drop shadow.
//
// It is deliberately 40 rather than the 44pt touch minimum, because that is
// what the file states; the target is made up with `hitSlop` instead, which is
// the pattern CARD_DENSITY already records for controls inside a row.
//
// The magnifier sits at the physical LEFT with the Arabic placeholder
// right-aligned beside it (Figma nodes 2031:5675, 2102:2975);
// SEARCH_PILL_ORDER records that contract and PHYSICAL_ROW stops forceRTL from
// swapping the two.
// `dark` variant for MushafScreen per handoff §6.
//
// Dual-mode (added 2026-05-11):
//   - Button mode (onPress provided): a Pressable styled identically to the
//     input. Used by 13 host screens to open the search modal.
//   - Input mode (onPress omitted): real TextInput. Used only by app/content-search.tsx.
/** Node `Inputs` instances `vuesax/bulk/search-normal` at 24. */
const SEARCH_GLYPH = 24;

export function SearchPill({
  dark,
  containerStyle,
  placeholder = 'بحث..',
  onPress,
  onClear,
  value,
  ...rest
}: Props) {
  const bg = dark ? 'rgba(255,255,255,0.08)' : KhazainColors.cardBg;
  const border = dark ? 'rgba(255,255,255,0.12)' : KhazainColors.hairlineWarm;
  const textColor = dark ? KhazainColors.cream100 : KhazainColors.ink900;
  const placeholderColor = dark ? 'rgba(255,255,255,0.5)' : KhazainColors.inkPlaceholder;
  const iconColor = dark ? KhazainColors.cream200 : KhazainColors.inkPlaceholder;
  // All 24 `search-normal` instances override both vectors to navy; the
  // circle's 40% rides on the generated path, not on this tint.
  const searchGlyphColor = dark ? KhazainColors.cream200 : KhazainColors.navy;

  // ─── Button mode ─────────────────────────────────────────────────────────
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={typeof placeholder === 'string' ? placeholder : 'بحث'}
        // The pill draws at the design's 40; hitSlop carries it to 44.
        hitSlop={{ top: 2, bottom: 2 }}
        style={({ pressed }) => [
          styles.pill,
          KhazainShadows.input,
          { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
          containerStyle,
        ]}
      >
        {renderSlots({
          icon: <FigmaIcon name="Search" size={SEARCH_GLYPH} color={searchGlyphColor} />,
          field: (
            <Text
              style={[styles.placeholderText, { color: placeholderColor }]}
              numberOfLines={1}
            >
              {placeholder}
            </Text>
          ),
          clear: null,
        })}
      </Pressable>
    );
  }

  // ─── Input mode (real TextInput) ─────────────────────────────────────────
  const showClear = !!onClear && typeof value === 'string' && value.length > 0;

  return (
    <View
      style={[
        styles.pill,
        KhazainShadows.input,
        { backgroundColor: bg, borderColor: border },
        containerStyle,
      ]}
    >
      {renderSlots({
        icon: <FigmaIcon name="Search" size={SEARCH_GLYPH} color={searchGlyphColor} />,
        field: (
          <TextInput
            {...rest}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            style={[styles.input, { color: textColor }]}
            textAlign="right"
          />
        ),
        clear: showClear ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="مسح البحث"
            hitSlop={8}
            style={styles.clearBtn}
          >
            <ClearGlyph color={iconColor} />
          </Pressable>
        ) : null,
      })}
    </View>
  );
}

/** Renders the pill's children in the physical left → right contract order. */
function renderSlots(slots: Record<SearchPillSlot, React.ReactNode>) {
  return SEARCH_PILL_ORDER.map((slot) => (
    <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
  ));
}

// Simple X glyph rendered as two crossed strokes. Inline to avoid pulling in
// another icon dependency.
function ClearGlyph({ color }: { color: string }) {
  return (
    <View style={styles.clearGlyph}>
      <View style={[styles.clearLine, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.clearLine, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    ...PHYSICAL_ROW,
    minHeight: PAGE_CHROME.searchHeight,
    borderRadius: PAGE_CHROME.searchRadius,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    // The magnifier sits 8 from the physical left edge; the placeholder ends
    // 12 from the right.
    paddingLeft: 8,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    ...textStyle('bodyCompact'),
    paddingVertical: 0,
  },
  placeholderText: {
    flex: 1,
    ...textStyle('bodyCompact'),
  },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearGlyph: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearLine: {
    position: 'absolute',
    width: 14,
    height: 1.5,
    borderRadius: 1,
  },
});
