import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { FOUNDATION_CONTACT } from '@/constants/foundationContact';
import { KhazainColors } from '@/constants/theme';
import { SheetRow, SheetShell } from '@/components/khazain/sheets';
import { showNotice } from '@/services/notice';

// The Foundation's two official channels (constants/foundationContact.ts); a
// friendly Arabic alert surfaces when the link cannot be opened.
const CHANNELS: { title: string; sub: string; url: string }[] = [
  {
    title: 'القناة الرسمية الأولى',
    sub: 'المحتوى الديني والدعوي',
    url: FOUNDATION_CONTACT.telegramMain,
  },
  {
    title: 'القناة الرسمية الثانية',
    sub: 'الأخبار والإعلانات',
    url: FOUNDATION_CONTACT.telegramSecondary,
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
      showNotice('تليجرام', 'تعذّر فتح الرابط على هذا الجهاز.');
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
