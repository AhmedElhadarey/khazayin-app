import { FigmaIcon, type FigmaIconName } from '@/components/khazain/icons/FigmaIcon';
import { MIN_TOUCH_TARGET } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

/** The disc is 32; `hitSlop` brings it to `MIN_TOUCH_TARGET`. */
const SIZE = 32;
/** Glyph inside the disc, ink500 as on the Library quick-note card. */
const GLYPH = 16;

/**
 * A button in a note toolbar: 32 at radius 16 on `cardBg` — nodes
 * `BUTTON-113` / `BUTTON-116` / `BUTTON-119` on the Library quick-note card
 * (2031:4659). The note editor has no frame; it reuses this component so the
 * two toolbars cannot drift, and the component owns the mark for the same
 * reason: `NoteBold` 2095:1693, `NoteItalic` 2095:1688, `NoteListFormat`
 * 2095:1683.
 *
 * No toolbar applies formatting yet, so without `onPress` the button is
 * disabled and announces «قريبًا» instead of posing as a working control.
 */
export type FormatMark = Extract<FigmaIconName, 'NoteBold' | 'NoteItalic' | 'NoteListFormat'>;

export function FormatButton({
  mark,
  onPress,
  accessibilityLabel,
}: {
  mark: FormatMark;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={(MIN_TOUCH_TARGET - SIZE) / 2}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !onPress }}
      accessibilityHint={onPress ? undefined : 'قريبًا'}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.75 : 1 }]}
    >
      <FigmaIcon name={mark} size={GLYPH} color={KhazainColors.ink500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: KhazainColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
