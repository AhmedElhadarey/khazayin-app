import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { FontSizePreview } from '@/components/khazain/settings';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { FONT_SIZE_SCALE } from '@/constants/settings';
import type { FontSizeLevel } from '@/types/settings';
import { useSettingsStore } from '@/store';

const LEVEL_LABELS: Record<FontSizeLevel, string> = {
  1: 'صغير جدًا',
  2: 'صغير',
  3: 'متوسط',
  4: 'كبير',
  5: 'كبير جدًا',
};

const LEVELS: readonly FontSizeLevel[] = [1, 2, 3, 4, 5];

export default function SettingsFontSizeScreen() {
  const router = useRouter();
  const currentLevel = useSettingsStore((s) => s.fontSizeLevel);
  const setFontSizeLevel = useSettingsStore((s) => s.setFontSizeLevel);
  const [focused, setFocused] = useState<FontSizeLevel>(currentLevel);

  const apply = () => {
    setFontSizeLevel(focused);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>حجم خط القرآن</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <FontSizePreview level={focused} />
        <View style={styles.list}>
          {LEVELS.map((lvl) => (
            <LevelRow
              key={lvl}
              label={LEVEL_LABELS[lvl]}
              selected={lvl === focused}
              fontSize={FONT_SIZE_SCALE[lvl].fontSize}
              onPress={() => setFocused(lvl)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          onPress={apply}
          style={({ pressed }) => [
            styles.applyBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.applyBtnLabel}>تطبيق</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function LevelRow({
  label,
  selected,
  fontSize,
  onPress,
}: {
  label: string;
  selected: boolean;
  fontSize: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
        selected ? styles.rowSelected : null,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Text style={[styles.rowLabel, { fontSize }]} numberOfLines={1}>
        {label}
      </Text>
      {selected ? (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path
            d="M4 9.5l3.5 3.5L14 5.5"
            stroke={KhazainColors.goldAccent}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(40,30,19,0.18)',
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    writingDirection: 'rtl',
  },
  body: { paddingHorizontal: 16, gap: 16 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  rowSelected: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Amiri-Bold',
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(141,107,52,0.12)',
    backgroundColor: KhazainColors.pageBg,
  },
  applyBtn: {
    backgroundColor: KhazainColors.navy800,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    writingDirection: 'rtl',
  },
});
