import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/khazain/primitives';
import { KhazainColors } from '@/constants/theme';

type Props = {
  /** Current step index (0-based). */
  step: number;
  /** Total number of steps. */
  count: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
};

/**
 * Persistent onboarding footer (track 003): primary continue/finish button,
 * a back control (hidden on the first step), and a skip control that is
 * reachable on EVERY step. RTL-pinned via `row-reverse` — no bare row flip.
 */
export function OnboardingFooter({
  step,
  count,
  onBack,
  onNext,
  onSkip,
}: Props): React.ReactElement {
  const isLast = step >= count - 1;
  const showBack = step > 0;

  return (
    <View style={styles.container}>
      <PillButton
        label={isLast ? 'إنهاء' : 'متابعة'}
        variant="navy"
        onPress={onNext}
        style={styles.primary}
      />
      <View style={styles.secondaryRow}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="رجوع إلى الخطوة السابقة"
            hitSlop={8}
          >
            <Text style={styles.linkText}>رجوع</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="تخطّي الإعداد والانتقال إلى التطبيق"
          hitSlop={8}
        >
          <Text style={styles.linkText}>تخطّي</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  primary: {
    width: '100%',
  },
  secondaryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  linkText: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '600',
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
