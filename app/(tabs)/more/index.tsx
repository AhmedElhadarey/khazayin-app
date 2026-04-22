import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { ListRowCard, Wordmark } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';

type RowId =
  | 'web'
  | 'youtube'
  | 'telegram'
  | 'whatsapp'
  | 'soundcloud'
  | 'archive'
  | 'contact'
  | 'about';

const ROWS: { id: RowId; t: string; s: string }[] = [
  { id: 'web', t: 'الموقع الإلكتروني', s: 'زيارة الموقع الرسمي للمؤسسة' },
  { id: 'youtube', t: 'قنوات اليوتيوب', s: '٦٥ قناة للأعمال والمشايخ' },
  { id: 'telegram', t: 'قنوات التليجرام', s: 'القنوات الأصلية للمؤسسة' },
  { id: 'whatsapp', t: 'قنوات الواتساب', s: 'القنوات الأصلية للمؤسسة' },
  { id: 'soundcloud', t: 'ساوند كلاود', s: 'القنوات الأصلية للمؤسسة' },
  { id: 'archive', t: 'الأرشيف', s: 'أرشيف المؤسسة' },
  { id: 'contact', t: 'تواصل معنا', s: 'راسلنا أو اتصل بنا مباشرة' },
  { id: 'about', t: 'نبذة عن المؤسسة', s: 'تعرّف على رؤيتنا وأهدافنا' },
];

const EXTERNAL_URLS: Partial<Record<RowId, string>> = {
  web: 'https://khazain.org',
  whatsapp: 'https://wa.me/',
  soundcloud: 'https://soundcloud.com/khazain',
};

export default function MoreScreen() {
  const router = useRouter();

  const handle = (id: RowId) => {
    const url = EXTERNAL_URLS[id];
    if (url) {
      Linking.openURL(url).catch(() =>
        Alert.alert('الرابط غير متاح', 'تعذّر فتح الرابط على هذا الجهاز.'),
      );
      return;
    }
    // Intra-app routes
    const routes: Partial<Record<RowId, string>> = {
      archive: '/more/archive',
      contact: '/more/contact',
      about: '/more/about',
      telegram: '/telegram-sheet',
      youtube: '/youtube-sheet',
    };
    const target = routes[id];
    if (target) router.push(target as any);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>المزيد</Text>
        </View>
        <View style={styles.list}>
          {ROWS.map((r) => (
            <ListRowCard
              key={r.id}
              title={r.t}
              subtitle={r.s}
              onPress={() => handle(r.id)}
              icon={
                <View style={styles.innerIcon}>
                  <RowGlyph id={r.id} />
                </View>
              }
            />
          ))}
        </View>
        <View style={styles.footer}>
          <Wordmark size={16} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RowGlyph({ id }: { id: RowId }) {
  const c = KhazainColors.navy800;
  switch (id) {
    case 'web':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Circle cx={10} cy={10} r={7} stroke={c} strokeWidth={1.5} />
          <Path
            d="M3 10h14M10 3c2.5 3 2.5 11 0 14M10 3c-2.5 3-2.5 11 0 14"
            stroke={c}
            strokeWidth={1.3}
          />
        </Svg>
      );
    case 'youtube':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Rect x={2} y={5} width={16} height={10} rx={2} stroke={c} strokeWidth={1.5} />
          <Path d="M9 8l3 2-3 2V8z" fill={c} />
        </Svg>
      );
    case 'telegram':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Path
            d="M3 10L17 3l-3 14-4-6-7-1z"
            stroke={c}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'whatsapp':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Path
            d="M3 9a6 6 0 0112 0 6 6 0 01-9 5l-3 1 1-3a6 6 0 01-1-3z"
            stroke={c}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'soundcloud':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Path
            d="M6 14h9a3 3 0 000-6 4 4 0 00-7.7-1A3 3 0 006 14z"
            stroke={c}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'archive':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Rect x={3} y={3} width={14} height={4} rx={1} stroke={c} strokeWidth={1.5} />
          <Path
            d="M4 7v9a1 1 0 001 1h10a1 1 0 001-1V7M8 11h4"
            stroke={c}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'contact':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Path
            d="M4 11v-1a6 6 0 0112 0v1M4 11v3a2 2 0 002 2v-5H4zm12 0v5a2 2 0 002-2v-3h-2z"
            stroke={c}
            strokeWidth={1.5}
          />
        </Svg>
      );
    case 'about':
      return (
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <Circle cx={10} cy={10} r={7} stroke={c} strokeWidth={1.5} />
          <Path d="M10 9v5M10 6v.5" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headerBlock: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'center',
  },
  h1: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
  },
  innerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(26,53,87,0.25)',
    backgroundColor: KhazainColors.cream100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
});
