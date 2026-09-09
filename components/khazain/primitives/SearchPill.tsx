import { MIN_TOUCH_TARGET, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { SEARCH_PILL_ORDER, type SearchPillSlot } from '@/constants/rtlContracts';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
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
import { SearchIcon } from '../icons';

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

// 40-tall rounded search control. The magnifier sits at the physical LEFT with
// the Arabic placeholder right-aligned beside it (Figma nodes 2031:5675,
// 2102:2975); SEARCH_PILL_ORDER records that contract and PHYSICAL_ROW stops
// forceRTL from swapping the two.
// `dark` variant for MushafScreen per handoff §6.
//
// Dual-mode (added 2026-05-11):
//   - Button mode (onPress provided): a Pressable styled identically to the
//     input. Used by 13 host screens to open the search modal.
//   - Input mode (onPress omitted): real TextInput. Used only by app/search.tsx.
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
  const border = dark ? 'rgba(255,255,255,0.12)' : KhazainColors.cardBorder;
  const textColor = dark ? KhazainColors.cream100 : KhazainColors.ink900;
  const placeholderColor = dark ? 'rgba(255,255,255,0.5)' : KhazainColors.inkPlaceholder;
  const iconColor = dark ? KhazainColors.cream200 : KhazainColors.inkPlaceholder;

  // ─── Button mode ─────────────────────────────────────────────────────────
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={typeof placeholder === 'string' ? placeholder : 'بحث'}
        style={({ pressed }) => [
          styles.pill,
          KhazainShadows.input,
          { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
          containerStyle,
        ]}
      >
        {renderSlots({
          icon: <SearchIcon size={16} color={iconColor} />,
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
        icon: <SearchIcon size={16} color={iconColor} />,
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
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: KhazainRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '400',
    paddingVertical: 0,
    ...RTL_TEXT,
  },
  placeholderText: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '400',
    ...RTL_TEXT,
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
