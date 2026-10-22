import { AsyncContent, ListRowCard, SkeletonRibbonList, Wordmark } from '@/components/khazain';
import { FigmaIcon, type FigmaIconName } from '@/components/khazain/icons/FigmaIcon';
import { HeaderArt } from '@/components/khazain/patterns';
import { CARD_DENSITY, PAGE_CHROME, PHYSICAL_BOX, SCREEN_BOTTOM_BREATHING } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { MORE_EXTENSION_ROWS, MORE_EXTERNAL_URLS } from '@/data/content/sections';
import { useMoreRowsStore } from '@/store';
import type { MoreRow as MoreRowData } from '@/types/content';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout, useWindowControlsInset } from '@/hooks/useResponsiveLayout';
import Svg, { Path } from 'react-native-svg';

/** Node 2102:2711 draws each row glyph at ~20pt inside the 48pt squircle. */
const MORE_GLYPH = 20;

export default function MoreScreen() {
  const { columnStyle } = useResponsiveLayout();
  const controls = useWindowControlsInset();
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
      <HeaderArt />
      <ScrollView
        // React Navigation already reserves the measured tab-bar height.
        contentContainerStyle={[{ paddingBottom: SCREEN_BOTTOM_BREATHING }, columnStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.h1, { marginLeft: controls.left, marginRight: controls.right }]}>المزيد</Text>
        </View>
        <View style={styles.list}>
          {/* The Figma reference group first, so the initial viewport starts
              with the website row exactly as node 2102:2711 does. */}
          <AsyncContent
            status={status}
            error={error}
            onRetry={refresh}
            // The gap goes here, not on `styles.list`: the fade wrapper is a
            // real layout box, so a gap on the container around it spaces the
            // wrapper from its siblings and never reaches these rows.
            style={styles.rows}
            skeleton={
              <SkeletonRibbonList
                count={8}
                height={CARD_DENSITY.moreCardHeight}
                gap={CARD_DENSITY.moreListGap}
              />
            }
            emptyMessage="لا توجد عناصر"
          >
            {data.map((r) => (
              <ListRowCard
                key={r.id}
                variant="more"
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
              variant="more"
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

/**
 * The glyph inside a More row's 48pt squircle.
 *
 * All eight rows in node 2102:2711 draw a real mark, and all eight come out of
 * the file. The whatsapp one took two passes to find: it sits inside an
 * INSTANCE named `Yu` whose own paints are a disc, and the glyph under it is
 * addressed by `overrideKey` rather than by guid — so the first read found the
 * disc and nothing else, and looked like an unfinished placeholder.
 *
 * The rows below the frame's eight (settings, progress) have no frame at all,
 * so they keep their drawn glyphs.
 */
const ROW_ICONS: Partial<Record<string, FigmaIconName>> = {
  web: 'MoreWeb',
  youtube: 'MoreYoutube',
  telegram: 'MoreTelegram',
  whatsapp: 'MoreWhatsapp',
  soundcloud: 'MoreSoundcloud',
  archive: 'MoreArchive',
  contact: 'MoreContact',
  about: 'MoreAbout',
};

function RowGlyph({ id }: { id: string }) {
  const fromFile = ROW_ICONS[id];
  if (fromFile) {
    return <FigmaIcon name={fromFile} size={MORE_GLYPH} color={KhazainColors.navy800} />;
  }
  return <DrawnRowGlyph id={id} />;
}

/** The two rows the design file has no frame for. */
function DrawnRowGlyph({ id }: { id: string }) {
  const c = KhazainColors.navy800;
  const size = MORE_GLYPH;
  switch (id) {
    case 'progress':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Path d="M10 3a7 7 0 11-7 7" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M10 7v3l2 1" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke={c} strokeWidth={1.5} />
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
  // Node 2102:2711 `Header` — a 35pt band under the 45pt status bar, with the
  // title box starting at y=53. Identical to the Sections root.
  headerBlock: {
    // PHYSICAL_BOX so `flex-end` means the physical right, not the RTL end.
    ...PHYSICAL_BOX,
    paddingHorizontal: 16,
    paddingTop: PAGE_CHROME.headerPaddingTop,
    // The title box starts 8 into the header band and the first card at 60.
    // The app's line box is 28 where the file's is 19, so this is what is left.
    paddingBottom: 24,
    alignItems: 'flex-end',
  },
  // The file sets every page title in the body face at 18, not the display one.
  h1: textStyle('bodyLarge', { color: KhazainColors.inkTitle }),
  list: {
    paddingHorizontal: 16,
    gap: CARD_DENSITY.moreListGap,
  },
  rows: { gap: CARD_DENSITY.moreListGap },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    alignItems: 'center',
  },
});
