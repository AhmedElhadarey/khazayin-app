import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/khazain/primitives';
import { MIN_TOUCH_TARGET, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';

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
 * reachable on EVERY step.
 *
 * Physical left -> right: skip, back. Onboarding has no Figma frame, so the
 * order comes from `constants/layout.ts` and Arabic reading order rather than
 * from the file: back is the leading control and leads at the RIGHT edge, skip
 * trails at the LEFT. `row-reverse` used to produce the mirror of that — under
 * `forceRTL` the row is already RTL, so reversing it renders left-to-right.
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
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="تخطّي الإعداد والانتقال إلى التطبيق"
          style={styles.link}
        >
          <Text style={styles.linkText}>تخطّي</Text>
        </Pressable>
        {showBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="رجوع إلى الخطوة السابقة"
            style={styles.link}
          >
            <Text style={styles.linkText}>رجوع</Text>
          </Pressable>
        ) : (
          <View />
        )}
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
    ...PHYSICAL_ROW,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
  },
  link: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 44,
    justifyContent: 'center',
  },
  linkText: textStyle('cardTitle', { color: KhazainColors.inkSubtle }),
});
