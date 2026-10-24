import { SheetRow, SheetShell } from '@/components/khazain/sheets';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { visibleYoutubeRows } from '@/services/foundationLinks';
import { showNotice } from '@/services/notice';

// Foundation channel first, then scholar channels (no Figma frame for this sheet).
// Scholar URLs are unverified until the Foundation confirms them, so their rows
// (and the "و ٦٠ قناة أخرى..." footer) render only in __DEV__; both decisions are the
// pure `visibleYoutubeRows` in services/foundationLinks.ts. A friendly Arabic
// alert shows if a link cannot be opened.

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
      showNotice('يوتيوب', 'تعذّر فتح الرابط على هذا الجهاز.');
    }
  };

  const { rows, showMoreFooter } = visibleYoutubeRows(__DEV__);

  return (
    <SheetShell title="قنوات اليوتيوب" onClose={close}>
      <View style={styles.list}>
        {rows.map((it) => (
          <SheetRow
            key={it.title}
            icon={<YoutubeMark />}
            title={it.title}
            onPress={() => open(it.url)}
          />
        ))}
        {showMoreFooter ? <Text style={styles.more}>و ٦٠ قناة أخرى...</Text> : null}
      </View>
    </SheetShell>
  );
}

function YoutubeMark() {
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
