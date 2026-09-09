import { AsyncContent, ListRowCard, SkeletonRibbonList, Wordmark } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { PHYSICAL_BOX, SCREEN_BOTTOM_BREATHING } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { MORE_EXTENSION_ROWS, MORE_EXTERNAL_URLS } from '@/data/content/sections';
import { useMoreRowsStore } from '@/store';
import type { MoreRow as MoreRowData } from '@/types/content';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export default function MoreScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useMoreRowsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Routes map is render logic (in-app navigation targets), kept inline per spec.
  const routes: Record<string, string> = {
    archive: '/more/archive',
    contact: '/more/contact',
    about: '/more/about',
    telegram: '/telegram-sheet',
    youtube: '/youtube-sheet',
  };

  const handle = async (row: MoreRowData) => {
    if (row.isExternal && row.externalKey) {
      const url = MORE_EXTERNAL_URLS[row.externalKey];
      if (url) {
        try {
          const can = await Linking.canOpenURL(url);
          if (!can) throw new Error('cannot open');
          await Linking.openURL(url);
        } catch {
          Alert.alert('الرابط غير متاح', 'تعذّر فتح الرابط على هذا الجهاز.');
        }
        return;
      }
    }
    const target = row.route ?? routes[row.id];
    if (target) router.push(target as any);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} coverage="corner" />
      <ScrollView
        // React Navigation already reserves the measured tab-bar height.
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_BREATHING }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>المزيد</Text>
        </View>
        <View style={styles.list}>
          {/* The Figma reference group first, so the initial viewport starts
              with the website row exactly as node 2102:2711 does. */}
          <AsyncContent
            status={status}
            error={error}
            onRetry={refresh}
            skeleton={<SkeletonRibbonList count={8} />}
            emptyMessage="لا توجد عناصر"
          >
            {data.map((r) => (
              <ListRowCard
                key={r.id}
                compact
                title={r.title}
                subtitle={r.subtitle}
                icon={<RowGlyph id={r.id} />}
                onPress={() => handle(r)}
              />
            ))}
          </AsyncContent>
          {/* This app's own entry rows follow. They are local state, so they
              render immediately and never wait on the More-rows fetch. */}
          {MORE_EXTENSION_ROWS.map((row) => (
            <ListRowCard
              key={row.id}
              compact
              title={row.title}
              subtitle={row.subtitle}
              icon={<RowGlyph id={row.id} />}
              onPress={() => router.push(row.route as any)}
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

// Icon glyph for the More-row chip. Sized to fill the 64×64 ListRowCard
// chip proportionally (matches the section icons via SECTION_ICONS).
function RowGlyph({ id }: { id: string }) {
  const c = KhazainColors.navy800;
  // Sized for the compact 40pt disc used by the More list.
  const size = 20;
  switch (id) {
    case 'web':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
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
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Rect x={2} y={5} width={16} height={10} rx={2} stroke={c} strokeWidth={1.5} />
          <Path d="M9 8l3 2-3 2V8z" fill={c} />
        </Svg>
      );
    case 'telegram':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
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
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
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
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
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
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
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
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Path
            d="M4 11v-1a6 6 0 0112 0v1M4 11v3a2 2 0 002 2v-5H4zm12 0v5a2 2 0 002-2v-3h-2z"
            stroke={c}
            strokeWidth={1.5}
          />
        </Svg>
      );
    case 'about':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Circle cx={10} cy={10} r={7} stroke={c} strokeWidth={1.5} />
          <Path d="M10 9v5M10 6v.5" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    case 'progress':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Path
            d="M10 3a7 7 0 11-7 7"
            stroke={c}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path d="M10 7v3l2 1" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Path
            d="M10 13a3 3 0 100-6 3 3 0 000 6z"
            stroke={c}
            strokeWidth={1.5}
          />
          <Path
            d="M16 11.6l1.4.7-.9 2-1.5-.5a6 6 0 01-1.4.8l-.3 1.5h-2.2l-.3-1.5a6 6 0 01-1.4-.8l-1.5.5-.9-2 1.4-.7a6 6 0 010-1.6L3 9.3l.9-2 1.5.5a6 6 0 011.4-.8l.3-1.5h2.2l.3 1.5a6 6 0 011.4.8l1.5-.5.9 2-1.4.7a6 6 0 010 1.6z"
            stroke={c}
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headerBlock: {
    // PHYSICAL_BOX so `flex-end` means the physical right, not the RTL end.
    ...PHYSICAL_BOX,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'flex-end',
  },
  h1: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  // Match sections/index.tsx list spacing so the two screens read identically.
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    alignItems: 'center',
  },
});
