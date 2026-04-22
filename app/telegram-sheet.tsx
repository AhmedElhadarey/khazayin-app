import React from 'react';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { SheetRow, SheetShell } from '@/components/khazain/sheets';

export default function TelegramSheet() {
  const router = useRouter();
  const close = () => router.back();

  return (
    <SheetShell title="قنوات التليجرام" onClose={close}>
      <SheetRow
        icon={<PaperGlyph />}
        title="القناة الرسمية الأولى"
        sub="المحتوى الديني والدعوي"
        onPress={close}
      />
      <SheetRow
        icon={<PaperGlyph />}
        title="القناة الرسمية الثانية"
        sub="الأخبار والإعلانات"
        onPress={close}
      />
    </SheetShell>
  );
}

function PaperGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 10L17 3l-3 14-4-6-7-1z"
        stroke={KhazainColors.gold300}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
