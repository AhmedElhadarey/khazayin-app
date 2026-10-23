import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { toArabicDigits as toAr } from '@/constants/progress';
import { textStyle } from '@/constants/typography';
import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { LIBRARY_CARD_RADIUS, LIBRARY_DESIGN, LIBRARY_SECTION_GAP } from './libraryLayout';

/**
 * Non-blocking gold-bordered banner that surfaces when the adaptive wird
 * suggestion engine (research R7) flags `shouldSuggest = true`.
 *
 * The Library screen renders this above the wird card when
 * `useWirdStore.pendingSuggestion` is non-null. Accept → `acceptSuggestion()`;
 * Dismiss → `dismissSuggestion()` (starts the 14-day cooldown).
 */
export function WirdSuggestionBanner({
  suggestedTarget,
  onAccept,
  onDismiss,
}: {
  suggestedTarget: number;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.banner}>
      <Text style={styles.message}>
        {`تجاوزتَ هدفك بانتظام — رفع الهدف إلى ${toAr(suggestedTarget)} صفحة؟`}
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={onAccept}
          accessibilityRole="button"
          style={({ pressed }) => [styles.acceptBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.acceptLabel}>قبول</Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          style={({ pressed }) => [styles.dismissBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.dismissLabel}>لاحقًا</Text>
        </Pressable>
      </View>
    </View>
  );
}

// No frame covers this banner, so its geometry is the Library contract: the
// 16pt side margin, the shared card radius, 8pt buttons, hairline/accent
// colours from the palette.
const styles = StyleSheet.create({
  banner: {
    ...PHYSICAL_BOX,
    marginHorizontal: LIBRARY_DESIGN.sideMargin,
    marginBottom: LIBRARY_SECTION_GAP,
    padding: 14,
    borderRadius: LIBRARY_CARD_RADIUS,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.goldAccent,
    gap: 10,
  },
  message: textStyle('bodyCompact', { color: KhazainColors.navy800 }),
  // Physical left → right: accept, then dismiss at the right edge.
  actions: {
    ...PHYSICAL_ROW,
    justifyContent: 'flex-end',
    gap: 8,
    alignItems: 'center',
  },
  dismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: KhazainColors.iconChipBg,
  },
  dismissLabel: textStyle('label', { color: KhazainColors.ink700 }),
  acceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: KhazainColors.navy800,
  },
  acceptLabel: textStyle('label', { color: KhazainColors.pageBg }),
});
