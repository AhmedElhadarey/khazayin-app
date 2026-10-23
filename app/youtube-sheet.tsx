import { SheetRow, SheetShell } from '@/components/khazain/sheets';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';

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
  // `MoreYoutube` (node 2106:2237), the mark the More row draws; cream50 on the
  // navy disc. The sheet has no frame of its own.
  return <FigmaIcon name="MoreYoutube" size={18} color={KhazainColors.cream50} />;
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  more: {
    ...textStyle('caption', { color: KhazainColors.goldAccent, textAlign: 'center' }),
    paddingTop: 6,
    paddingBottom: 4,
  },
});
