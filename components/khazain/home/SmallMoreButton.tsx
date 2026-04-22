import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

// Compact "المزيد" button used inside hero and queen cards.
// 4px vertical × 19px horizontal padding, bg navy, radius 4, tiny left-pointing chevron.
// Port of design_source/app/home.jsx MoreButton / QueenMoreBtn.
export function SmallMoreButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Svg width={8} height={8} viewBox="0 0 8 8">
        <Path
          d="M5 1.5 L2 4 L5 6.5"
          stroke="#FDF9F2"
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.label}>المزيد</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 19,
    paddingVertical: 4,
    backgroundColor: KhazainColors.navy,
    borderRadius: 4,
  },
  label: {
    fontFamily: 'Amiri',
    fontSize: 10,
    fontWeight: '700',
    color: '#FDF9F2',
    writingDirection: 'rtl',
  },
});
