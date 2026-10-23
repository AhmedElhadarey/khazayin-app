import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

/**
 * A button in a note toolbar: 32 at radius 16 on `cardBg` — nodes
 * `BUTTON-113` / `BUTTON-116` / `BUTTON-119` on the Library quick-note card
 * (2031:4659). The note editor has no frame; it reuses this component so the
 * two toolbars cannot drift. `hitSlop` 6 brings the 32pt disc to 44.
 *
 * Callers pass a `FigmaIcon` (`NoteBold` 2095:1693, `NoteItalic` 2095:1688,
 * `NoteListFormat` 2095:1683) as the child.
 */
export function FormatButton({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.75 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
