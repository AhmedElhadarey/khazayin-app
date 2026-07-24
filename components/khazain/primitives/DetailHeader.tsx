import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

// Sub-screen header: 36×36 back chip (leading end) + centered Amiri title.
// Back chevron points right (visual forward direction in RTL).
export function DetailHeader({
  title,
  onBack,
  bg = KhazainColors.pageBg,
  style,
}: {
  title: string;
  onBack?: () => void;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, { backgroundColor: bg }, style]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        hitSlop={8}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path
            d="M3 7h10M9 3l4 4-4 4"
            stroke={KhazainColors.navy800}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {/* Spacer with same width as back button so the centered title stays centered in RTL. */}
      <View style={styles.backBtnSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnSpacer: {
    width: 36,
    height: 36,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
});
