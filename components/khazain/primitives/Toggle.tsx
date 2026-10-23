import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';

type Props = {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name for the switch (consumers pass the row title). */
  label?: string;
};

// Track geometry, node 2031:4659: 44 x 24 at radius 12, 2pt inset, 20pt knob;
// the knob travels 44 - 2 * 2 - 20 = 20.

/**
 * The file's switch: ON puts the knob at the physical LEFT on a navy track,
 * OFF rests it at the physical RIGHT on the hairline grey. The track is pinned
 * `ltr` so "left" and "right" mean the same on every platform.
 */
export function Toggle({ on, onChange, disabled, label }: Props) {
  const progress = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(on ? 1 : 0, { duration: 200 });
  }, [on, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [KhazainColors.hairline, KhazainColors.navy800],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * -20 }],
  }));

  return (
    <Pressable
      onPress={() => !disabled && onChange(!on)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled: !!disabled }}
      // 24 + 10 + 10 = 44 tall. Horizontal slop stays 0 so it cannot overlap
      // the text beside it in a settings row.
      hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    ...PHYSICAL_BOX,
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    // Physical right when off; the animated translateX carries it left.
    alignSelf: 'flex-end',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: KhazainColors.pageBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
});
