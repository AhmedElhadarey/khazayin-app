import { SheetRow, SheetShell } from '@/components/khazain/sheets';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const ITEMS = [
  'قناة الشيخ محمد العريفي',
  'قناة الشيخ عبد الرحمن السديس',
  'قناة الشيخ صالح المغامسي',
  'قناة الشيخ خالد الراشد',
  'قناة الشيخ نبيل العوضي',
];

export default function YouTubeSheet() {
  const router = useRouter();
  const close = () => router.back();

  return (
    <SheetShell title="قنوات اليوتيوب" onClose={close}>
      {ITEMS.map((t, i) => (
        <SheetRow key={i} icon={<PlayGlyph />} title={t} onPress={close} />
      ))}
      <Text style={styles.more}>و ٦٠ قناة أخرى...</Text>
    </SheetShell>
  );
}

function PlayGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Rect x={2} y={5} width={16} height={10} rx={2} stroke={KhazainColors.gold300} strokeWidth={1.5} />
      <Path d="M9 8l3 2-3 2V8z" fill={KhazainColors.gold300} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  more: {
    textAlign: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 12,
    color: KhazainColors.gold500,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
});
