import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import React from 'react';
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';
import { SearchIcon } from '../icons';

type Props = Omit<TextInputProps, 'style'> & {
  dark?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

// 40-tall rounded search input with leading magnifier.
// `dark` variant for MushafScreen per handoff §6.
export function SearchPill({ dark, containerStyle, placeholder = 'بحث..', ...rest }: Props) {
  const bg = dark ? 'rgba(255,255,255,0.08)' : KhazainColors.cardBg;
  const border = dark ? 'rgba(255,255,255,0.12)' : KhazainColors.cardBorder;
  const textColor = dark ? KhazainColors.cream100 : KhazainColors.ink900;
  const placeholderColor = dark ? 'rgba(255,255,255,0.5)' : KhazainColors.inkPlaceholder;
  const iconColor = dark ? KhazainColors.cream200 : KhazainColors.inkPlaceholder;

  return (
    <View
      style={[
        styles.pill,
        KhazainShadows.input,
        { backgroundColor: bg, borderColor: border },
        containerStyle,
      ]}
    >
      <SearchIcon size={16} color={iconColor} />
      <TextInput
        {...rest}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        style={[styles.input, { color: textColor }]}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 40,
    borderRadius: KhazainRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '400',
    paddingVertical: 0,
    writingDirection: 'rtl',
  },
});
