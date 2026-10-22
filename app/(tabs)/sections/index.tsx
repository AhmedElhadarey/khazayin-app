import {
  AsyncContent,
  ListRowCard,
  SearchPill,
  SectionTile,
  SkeletonRibbonList,
  SkeletonTileGrid,
} from '@/components/khazain';
import { SECTION_ICONS, SectionIconKey } from '@/components/khazain/icons/sections';
import { HeaderArt } from '@/components/khazain/patterns';
import { CARD_DENSITY, PAGE_CHROME, PHYSICAL_BOX, READING_GRID } from '@/constants/layout';
import { GRID_GAP, gridItemWidth, sectionGridColumns } from '@/constants/responsive';
import { SECTION_TILE_MIN_HEIGHT } from '@/components/khazain/primitives/SectionTile';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useSectionsStore } from '@/store';
import type { SectionEntry } from '@/types/content';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SectionsScreen() {
  const router = useRouter();
  const { width, isTablet, gutter } = useResponsiveLayout();
  const { data, status, error, fetch, refresh } = useSectionsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const open = (s: SectionEntry) => {
    if (s.route) {
      router.push(s.route as any);
    } else {
      Alert.alert(s.title, 'قريباً بإذن الله');
    }
  };

  // Phones keep today's 16pt margin and ListRowCard column; tablets use the
  // tablet gutter and a reading-order tile grid.
  const pad = isTablet ? { paddingHorizontal: gutter } : null;
  const tileWidth = gridItemWidth(width, sectionGridColumns(width));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <HeaderArt />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerBlock, pad]}>
          <Text style={styles.h1}>الأقسام</Text>
        </View>
        <View style={[styles.searchBlock, pad]}>
          {/* `بحث..` is what the file sets, on all twelve frames that carry a
              search pill — this screen was the only one paraphrasing it. */}
          <SearchPill placeholder="بحث.." onPress={openSearch} />
        </View>
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={
            isTablet ? (
              <SkeletonTileGrid
                count={9}
                width={tileWidth}
                minHeight={SECTION_TILE_MIN_HEIGHT}
                gap={GRID_GAP}
                gridStyle={{ ...READING_GRID, paddingHorizontal: gutter }}
              />
            ) : (
              <SkeletonRibbonList count={9} />
            )
          }
          emptyMessage="لا يوجد أقسام متاحة"
        >
          <View
            style={
              isTablet
                ? { ...READING_GRID, paddingHorizontal: gutter, gap: GRID_GAP }
                : styles.list
            }
          >
            {data.map((s) => {
              const Icon = SECTION_ICONS[s.iconKey as SectionIconKey];
              return isTablet ? (
                <SectionTile
                  key={s.id}
                  title={s.title}
                  subtitle={s.subtitle}
                  count={s.count ?? undefined}
                  width={tileWidth}
                  onPress={() => open(s)}
                  icon={<Icon />}
                />
              ) : (
                <ListRowCard
                  key={s.id}
                  title={s.title}
                  subtitle={s.subtitle}
                  count={s.count ?? undefined}
                  onPress={() => open(s)}
                  icon={<Icon />}
                />
              );
            })}
          </View>
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  container: { paddingTop: 0 },
  // Figma node 2031:5675 anchors the page title at the physical right.
  headerBlock: {
    // PHYSICAL_BOX so `flex-end` means the physical right, not the RTL end.
    ...PHYSICAL_BOX,
    paddingHorizontal: 16,
    paddingTop: PAGE_CHROME.headerPaddingTop,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  // The file sets every page title in the body face at 18, not the display one.
  h1: textStyle('bodyLarge', { color: KhazainColors.inkTitle }),
  searchBlock: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    gap: CARD_DENSITY.listGap,
  },
});
