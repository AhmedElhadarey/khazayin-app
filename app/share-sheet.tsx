import { SheetShell } from '@/components/khazain/sheets';
import { PHYSICAL_BOX } from '@/constants/layout';
import { textStyle } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** One tint for every mark in the navy disc. */
const INK = KhazainColors.cream50;

// Per Figma page-32 the share sheet is a vertical list of 6 platform rows
// (Telegram / Facebook / Threads / Snapchat / X / Instagram). Each row is its
// own cream card with a navy circular disc on the RTL-start side (right edge)
// containing the platform brand glyph.
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
          <ShareRow key={p.id} label={p.label} icon={p.icon} onPress={p.open} />
        ))}
      </View>
    </SheetShell>
  );
}

function ShareRow({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {/* Disc anchored to the right (RTL start side) via absolute positioning. */}
      <View style={styles.disc}>{icon}</View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function TelegramGlyph() {
  // `MoreTelegram` (node 2106:2255). The file has no mark for the other
  // platforms below, so those stay drawn, all in the same cream50 tint.
  return <FigmaIcon name="MoreTelegram" size={18} color={INK} />;
}

function FacebookGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 20 20" fill={INK}>
      <Path d="M11 18v-7h2l.5-3H11V6.2c0-.8.3-1.5 1.5-1.5H14V2c-.2 0-1 0-2 0-2 0-3.5 1.2-3.5 3.5V8H6v3h2.5v7H11z" />
    </Svg>
  );
}

function ThreadsGlyph() {
  // Stylised "@" — Threads brand mark approximated with monoline strokes.
  return (
    <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
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
    <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
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
    <Svg width={12} height={12} viewBox="0 0 20 20" fill={INK}>
      <Path d="M3 3h3.6l3.4 4.6L13.6 3H17l-5.2 6.6L17.4 17h-3.6l-3.7-5L5.6 17H2.2l5.6-7L3 3z" />
    </Svg>
  );
}

function InstagramGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
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
  row: {
    // PHYSICAL_BOX so the absolute `right: 12` on the disc and the label's
    // `paddingRight: 56` are the physical right. Unpinned, forceRTL swapped
    // both to the left and took `textAlign: 'right'` with them.
    ...PHYSICAL_BOX,
    height: 56,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.10)',
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // Anchored to the physical right via `right`, which the PHYSICAL_BOX on the
  // row makes unambiguous. Vertical centering uses `top: '50%'` + a
  // half-height translate.
  disc: {
    position: 'absolute',
    right: 12,
    top: '50%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -16 }],
  },
  label: {
    ...textStyle('sectionTitle', { color: KhazainColors.ink900 }),
    // Leave room on the right for the 32-wide disc + its 12 inset + 12 gap.,
    paddingRight: 56,
  },
});
