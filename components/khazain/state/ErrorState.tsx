/**
 * ErrorState — cream card with Arabic error message + retry PillButton.
 *
 * Default copy: 'تعذر تحميل المحتوى. حاول مجدداً.'
 * Retry button label: 'حاول مجدداً'
 *
 * Track: khazain-content-service_20260506  Phase 3 / T3.2
 */
import { PillButton } from '@/components/khazain/primitives/PillButton';
import { KhazainColors, KhazainRadius, KhazainSpacing } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ErrorStateProps = {
  /** Arabic error copy. Defaults to 'تعذر تحميل المحتوى. حاول مجدداً.' */
  message?: string;
  /** Called when user taps the retry button. Button is hidden when omitted. */
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>
        {message ?? 'تعذر تحميل المحتوى. حاول مجدداً.'}
      </Text>
      {onRetry ? (
        <View style={styles.buttonWrap}>
          <PillButton
            label="حاول مجدداً"
            variant="navy"
            size="sm"
            onPress={onRetry}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: KhazainColors.cardBg,
    borderRadius: KhazainRadius.md,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: KhazainSpacing.x6,
    paddingHorizontal: KhazainSpacing.x4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: KhazainSpacing.x4,
    minHeight: 96,
  },
  text: {
    // TheMixArab — proprietary name intentionally kept per CLAUDE.md §Fonts
    fontFamily: 'TheMixArab',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  buttonWrap: {
    alignItems: 'center',
  },
});
