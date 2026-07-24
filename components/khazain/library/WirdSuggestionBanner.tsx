import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { toArabicDigits as toAr } from '@/constants/progress';

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
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismissBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.dismissLabel}>لاحقًا</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          style={({ pressed }) => [styles.acceptBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.acceptLabel}>قبول</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1.5,
    borderColor: KhazainColors.gold500,
    gap: 10,
  },
  message: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '600',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dismissBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: KhazainColors.cream100,
  },
  dismissLabel: {
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  acceptBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
  },
  acceptLabel: {
    color: '#fff',
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
});
