import { HeroPattern } from '@/components/khazain/patterns';
import { SheetShell } from '@/components/khazain/sheets';
import { KhazainColors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type Params = { tone?: string; title?: string; body?: string };

const DEFAULT: Required<Params> = {
  tone: KhazainColors.teal600,
  title: 'دعاء ليلة القدر',
  body: 'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
};

export default function ShareSheet() {
  const router = useRouter();
  const raw = useLocalSearchParams<Params>();
  const quote = {
    tone: typeof raw.tone === 'string' ? raw.tone : DEFAULT.tone,
    title: typeof raw.title === 'string' ? raw.title : DEFAULT.title,
    body: typeof raw.body === 'string' ? raw.body : DEFAULT.body,
  };

  const close = () => router.back();

  const shareText = `${quote.title}\n${quote.body.replace(/\\n/g, '\n')}`;

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

  const onTelegram = () =>
    openExternal(
      `https://t.me/share/url?url=${encodeURIComponent('https://khazain.org')}&text=${encodeURIComponent(shareText)}`,
      'تليجرام',
    );
  const onFacebook = () =>
    openExternal(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://khazain.org')}&quote=${encodeURIComponent(shareText)}`,
      'فيسبوك',
    );
  const onWhatsapp = () =>
    openExternal(`https://wa.me/?text=${encodeURIComponent(shareText)}`, 'واتساب');
  const onCopy = () => {
    // expo-clipboard isn't installed — we surface a friendly confirmation and the
    // caller (you) can add `expo-clipboard` + `Clipboard.setStringAsync(shareText)` here.
    Alert.alert('تم النسخ', 'يمكن إضافة دعم النسخ الفعلي لاحقاً عبر expo-clipboard.');
    close();
  };

  return (
    <SheetShell title="مشاركة" onClose={close}>
      <View style={styles.previewWrap}>
        <View style={[styles.preview, { backgroundColor: quote.tone }]}>
          <HeroPattern style={StyleSheet.absoluteFillObject} opacity={0.2} />
          <View style={styles.previewFrame} />
          <View style={styles.previewContent}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {quote.title}
            </Text>
            <Text style={styles.previewBody}>{quote.body.replace(/\\n/g, '\n')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.platformsRow}>
        <SharePlatform name="تليجرام" color="#2AABEE" onPress={onTelegram} icon={<TelegramGlyph />} />
        <SharePlatform name="فيسبوك" color="#1877F2" onPress={onFacebook} icon={<FacebookGlyph />} />
        <SharePlatform name="واتساب" color="#25D366" onPress={onWhatsapp} icon={<WhatsappGlyph />} />
        <SharePlatform
          name="نسخ"
          color={KhazainColors.navy800}
          onPress={onCopy}
          icon={<CopyGlyph />}
        />
      </View>
    </SheetShell>
  );
}

function SharePlatform({
  name,
  color,
  icon,
  onPress,
}: {
  name: string;
  color: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.platform,
        { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <View style={[styles.platformBadge, { backgroundColor: color }]}>{icon}</View>
      <Text style={styles.platformLabel}>{name}</Text>
    </Pressable>
  );
}

function TelegramGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="#fff">
      <Path d="M2 10l14-7-3 14-4-6-7-1z" />
    </Svg>
  );
}

function FacebookGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="#fff">
      <Path d="M11 18v-7h2l.5-3H11V6.2c0-.8.3-1.5 1.5-1.5H14V2c-.2 0-1 0-2 0-2 0-3.5 1.2-3.5 3.5V8H6v3h2.5v7H11z" />
    </Svg>
  );
}

function WhatsappGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="#fff">
      <Path d="M10 2a8 8 0 00-7 12l-1 4 4-1a8 8 0 107-15zm-3 5c.3 0 .7.3 1 .7l.4 1.4-.8.8c.4 1 1.4 2 2.4 2.4l.8-.8 1.4.4c.4.3.7.7.7 1 0 1-1 2-2 2-3 0-6-3-6-6 0-1 1-2 2-2z" />
    </Svg>
  );
}

function CopyGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Rect x={4} y={6} width={10} height={12} rx={2} stroke="#fff" strokeWidth={1.5} />
      <Path d="M7 6V4a2 2 0 012-2h5a2 2 0 012 2v10" stroke="#fff" strokeWidth={1.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    paddingVertical: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  preview: {
    width: 160,
    height: 210,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(184,134,74,0.3)',
  },
  previewFrame: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderColor: KhazainColors.gold300,
    borderRadius: 10,
    opacity: 0.5,
  },
  previewContent: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 13,
    color: KhazainColors.gold200,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  previewBody: {
    fontFamily: 'Amiri-Bold',
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 23,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  platformsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  platform: {
    alignItems: 'center',
    gap: 6,
  },
  platformBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLabel: {
    fontSize: 11,
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    fontWeight: '500',
    writingDirection: 'rtl',
  },
});
