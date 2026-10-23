import { SheetRow, SheetShell } from '@/components/khazain/sheets';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** One tint for every mark in the navy disc. */
const INK = KhazainColors.cream50;

/** Every platform mark is drawn in the same 18pt box, as the Telegram glyph is. */
const MARK = 18;

// The share sheet has no Figma frame. Its contract is SheetRow (a cream card per
// platform with a navy disc on the RTL-start side) and SHEET_CHROME for the
// sheet itself; the six marks share one 18pt box.
type Platform = {
  id: string;
  label: string;
  icon: React.ReactNode;
  open: () => void;
};

export default function ShareSheet() {
  const router = useRouter();
  const close = () => router.back();

  const SHARE_URL = 'https://khazayin.com';
  const SHARE_TEXT = 'مؤسسة خزائن الرحمن العالمية';

  const openExternal = async (url: string, platformName: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      await Linking.openURL(url);
      close();
    } catch {
      Alert.alert(platformName, 'تعذّر فتح التطبيق على هذا الجهاز.');
    }
  };

  const platforms: Platform[] = [
    {
      id: 'telegram',
      label: 'تليجرام',
      icon: <TelegramGlyph />,
      open: () =>
        openExternal(
          `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`,
          'تليجرام',
        ),
    },
    {
      id: 'facebook',
      label: 'فيسبوك',
      icon: <FacebookGlyph />,
      open: () =>
        openExternal(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(SHARE_TEXT)}`,
          'فيسبوك',
        ),
    },
    {
      id: 'threads',
      label: 'ثريدز',
      icon: <ThreadsGlyph />,
      open: () =>
        openExternal(
          `https://www.threads.net/intent/post?text=${encodeURIComponent(`${SHARE_TEXT} ${SHARE_URL}`)}`,
          'ثريدز',
        ),
    },
    {
      id: 'snapchat',
      label: 'سناب شات',
      icon: <SnapchatGlyph />,
      open: () => openExternal('https://www.snapchat.com/', 'سناب شات'),
    },
    {
      id: 'x',
      label: 'إكس',
      icon: <XGlyph />,
      open: () =>
        openExternal(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${SHARE_TEXT} ${SHARE_URL}`)}`,
          'إكس',
        ),
    },
    {
      id: 'instagram',
      label: 'إنستغرام',
      icon: <InstagramGlyph />,
      open: () => openExternal('https://www.instagram.com/', 'إنستغرام'),
    },
  ];

  return (
    <SheetShell title="مشاركة" onClose={close}>
      <View style={styles.list}>
        {platforms.map((p) => (
          <SheetRow key={p.id} title={p.label} icon={p.icon} onPress={p.open} />
        ))}
      </View>
    </SheetShell>
  );
}

function TelegramGlyph() {
  // `MoreTelegram` (node 2106:2255). The file has no mark for the other
  // platforms below, so those stay drawn, all in the same cream50 tint.
  return <FigmaIcon name="MoreTelegram" size={MARK} color={INK} />;
}

function FacebookGlyph() {
  return (
    <Svg width={MARK} height={MARK} viewBox="0 0 20 20" fill={INK}>
      <Path d="M11 18v-7h2l.5-3H11V6.2c0-.8.3-1.5 1.5-1.5H14V2c-.2 0-1 0-2 0-2 0-3.5 1.2-3.5 3.5V8H6v3h2.5v7H11z" />
    </Svg>
  );
}

function ThreadsGlyph() {
  // Stylised "@" — Threads brand mark approximated with monoline strokes.
  return (
    <Svg width={MARK} height={MARK} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={6} stroke={INK} strokeWidth={1.4} />
      <Path
        d="M7 10c0-2 1.4-3.4 3.2-3.4 1.5 0 2.6.9 2.8 2.4M13 10.6c.2 1.6-1 2.8-2.6 2.8-1.4 0-2.4-.8-2.4-1.8 0-1 1-1.6 2.4-1.6.9 0 1.8.2 2.6.6"
        stroke={INK}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SnapchatGlyph() {
  // Simplified ghost outline.
  return (
    <Svg width={MARK} height={MARK} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 3c2.4 0 4 1.7 4 4v3.4c.7.3 1.5.4 2 .8.2.2 0 .6-.4.8-.6.3-1.4.3-1.8.6-.3.3 0 .8-.6 1.1-.4.2-1 .1-1.4.4-.4.3-.5 1-.9 1.2-.4.2-.9-.1-.9.1-.2.4-.6.6-1 .6-.4 0-.8-.2-1-.6 0-.2-.5.1-.9-.1-.4-.2-.5-.9-.9-1.2-.4-.3-1-.2-1.4-.4-.6-.3-.3-.8-.6-1.1-.4-.3-1.2-.3-1.8-.6-.4-.2-.6-.6-.4-.8.5-.4 1.3-.5 2-.8V7c0-2.3 1.6-4 4-4z"
        fill={INK}
        stroke={INK}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Circle cx={8} cy={9} r={0.7} fill={KhazainColors.navy800} />
      <Circle cx={12} cy={9} r={0.7} fill={KhazainColors.navy800} />
    </Svg>
  );
}

function XGlyph() {
  return (
    <Svg width={MARK} height={MARK} viewBox="0 0 20 20" fill={INK}>
      <Path d="M3 3h3.6l3.4 4.6L13.6 3H17l-5.2 6.6L17.4 17h-3.6l-3.7-5L5.6 17H2.2l5.6-7L3 3z" />
    </Svg>
  );
}

function InstagramGlyph() {
  return (
    <Svg width={MARK} height={MARK} viewBox="0 0 20 20" fill="none">
      <Rect x={3} y={3} width={14} height={14} rx={4} stroke={INK} strokeWidth={1.4} />
      <Circle cx={10} cy={10} r={3.2} stroke={INK} strokeWidth={1.4} />
      <Circle cx={14.2} cy={5.8} r={0.9} fill={INK} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
});
