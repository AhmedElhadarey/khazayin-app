import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { KhazainColors } from '@/constants/theme';
import { SheetRow, SheetShell } from '@/components/khazain/sheets';

// Real channel URLs to be supplied by the foundation. Until then we fall back
// to a generic Telegram URL and surface a friendly Arabic alert when the link
// cannot be opened.
const CHANNELS: { title: string; sub: string; url: string }[] = [
  {
    title: 'القناة الرسمية الأولى',
    sub: 'المحتوى الديني والدعوي',
    url: 'https://t.me/khazain',
  },
  {
    title: 'القناة الرسمية الثانية',
    sub: 'الأخبار والإعلانات',
    url: 'https://t.me/khazain_news',
  },
];

export default function TelegramSheet() {
  const router = useRouter();
  const close = () => router.back();

  const open = async (url: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      await Linking.openURL(url);
      close();
    } catch {
      Alert.alert('تليجرام', 'تعذّر فتح الرابط على هذا الجهاز.');
    }
  };

  return (
    <SheetShell title="قنوات التليجرام" onClose={close}>
      <View style={styles.list}>
        {CHANNELS.map((c) => (
          <SheetRow
            key={c.title}
            icon={<TelegramGlyph />}
            title={c.title}
            sub={c.sub}
            onPress={() => open(c.url)}
          />
        ))}
      </View>
    </SheetShell>
  );
}

function TelegramGlyph() {
  // `MoreTelegram` (node 2106:2255), the mark the More row draws; cream50 on
  // the navy disc. The sheet has no frame of its own.
  return <FigmaIcon name="MoreTelegram" size={18} color={KhazainColors.cream50} />;
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
});
