import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { PauseIcon, PlayIcon } from '@/components/khazain/icons';
import { MIN_TOUCH_TARGET, PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import type { PreviewStatus } from '@/store/previewStore';

type Props = {
  reciterName: string;
  status: PreviewStatus;
  onPress: () => void;
};

/**
 * Play/stop control for a reciter's Al-Fatiha preview (onboarding, design
 * 2026-10-21 §4.3). A sibling of the row's radio, so VoiceOver reaches it as
 * its own focus stop. The play glyph is not mirrored.
 */
export function PreviewButton({ reciterName, status, onPress }: Props): React.ReactElement {
  const active = status !== 'idle';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? 'إيقاف العيّنة' : `استماع إلى عيّنة من تلاوة ${reciterName}`}
      accessibilityState={{ busy: status === 'loading' }}
      hitSlop={4}
      style={({ pressed }) => [styles.button, active && styles.active, pressed && styles.pressed]}
    >
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={KhazainColors.navy800} />
      ) : status === 'playing' ? (
        <PauseIcon size={18} color={KhazainColors.cardBg} />
      ) : (
        <PlayIcon size={18} color={KhazainColors.navy800} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // Pinned per the onboarding RTL contract (__tests__/rtlPhysicalContract.test.ts).
    // The play glyph is an SVG and is never mirrored.
    ...PHYSICAL_BOX,
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KhazainColors.iconChipBg,
  },
  active: { backgroundColor: KhazainColors.navy800 },
  pressed: { opacity: 0.8 },
});
