import { SheetRow, SheetShell } from '@/components/khazain/sheets';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

// Featured channels per Figma page-38. Real YouTube URLs to be supplied by the
// foundation; falls back to a friendly Arabic alert if a link cannot be opened.
const ITEMS: { title: string; url: string }[] = [
  { title: 'قناة الشيخ محمد العريفي', url: 'https://youtube.com/@MohammadAlarefe' },
  { title: 'قناة الشيخ عبد الرحمن السديس', url: 'https://youtube.com/@AbdulrahmanAlSudais' },
  { title: 'قناة الشيخ صالح المغامسي', url: 'https://youtube.com/@SalehAlMaghamsi' },
  { title: 'قناة الشيخ خالد الراشد', url: 'https://youtube.com/@KhalidAlrashed' },
  { title: 'قناة الشيخ نبيل العوضي', url: 'https://youtube.com/@NabilAlAwadi' },
];

export default function YouTubeSheet() {
  const router = useRouter();
  const close = () => router.back();

  const open = async (url: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      await Linking.openURL(url);
      close();
    } catch {
      Alert.alert('يوتيوب', 'تعذّر فتح الرابط على هذا الجهاز.');
    }
  };

  return (
    <SheetShell title="قنوات اليوتيوب" onClose={close}>
      <View style={styles.list}>
        {ITEMS.map((it) => (
          <SheetRow
            key={it.title}
            icon={<PlayGlyph />}
            title={it.title}
            onPress={() => open(it.url)}
          />
        ))}
        <Text style={styles.more}>و ٦٠ قناة أخرى...</Text>
      </View>
    </SheetShell>
  );
}

function PlayGlyph() {
  // YouTube-style "play in rounded rect" badge in white inside the navy disc.
  return (
    <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
      <Rect x={2} y={5} width={16} height={10} rx={2} fill="#FF3B30" />
      <Path d="M9 8l3.5 2-3.5 2V8z" fill="#fff" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  more: {
    textAlign: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    fontSize: 12,
    color: KhazainColors.gold500,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
});
