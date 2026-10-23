import {
  AsyncContent,
  InlineHeader,
  LetterIndex,
  QuillBadge,
  RibbonCard,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { CARD_DENSITY, PHYSICAL_BOX, RESERVED_COLUMNS, PAGE_CHROME } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { useScholarsStore } from '@/store';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { railListGeometry } from '@/constants/responsive';

// Page 26: العلماء والمشايخ list of scholars with right-rail letter index.
// Each scholar = RibbonCard (gold-bar on right edge) with pretitle "فضيلة الشيخ"
// and the scholar's name in big Naskh.
// Data sourced from useScholarsStore (content service layer).

export default function ScholarScreen() {
  const router = useRouter();
  const { columnStyle, isTablet, reading } = useResponsiveLayout();
  const rail = railListGeometry({ isTablet, reading });
  const { data, status, error, fetch, refresh } = useScholarsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt corners="single" bandHeight={headerBandHeight(insets.top, 'search', fontScale)} />
      <InlineHeader title="العلماء والمشايخ" onBack={() => router.back()} style={columnStyle} />
      <View style={[styles.searchBlock, columnStyle]}>
        <SearchPill placeholder="بحث.." onPress={openSearch} />
      </View>
      <View style={styles.body}>
        {/* Virtualized on success; AsyncContent owns loading/empty/error (T3.1). */}
        {status === 'success' ? (
          <FlatList
            data={data}
            keyExtractor={(s) => s.id}
            renderItem={({ item: s }) => (
              <RibbonCard
                pretitle="فضيلة الشيخ"
                badge={<QuillBadge size={CARD_DENSITY.lectureBadgeDisc} />}
                title={s.name}
                onPress={() => router.push(`/sections/scholar/${s.id}` as any)}
              />
            )}
            style={rail.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 }, rail.inner, columnStyle]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={[rail.list, rail.inner, columnStyle]}>
            <AsyncContent
              status={status}
              error={error}
              onRetry={refresh}
              skeleton={<SkeletonRibbonList count={5} />}
              emptyMessage="لا يوجد علماء"
            >
              {null}
            </AsyncContent>
          </View>
        )}
        <View style={[styles.rail, rail.railStyle]} pointerEvents="box-none">
          <LetterIndex active="م" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: {
    paddingHorizontal: 16,
    paddingTop: PAGE_CHROME.searchPaddingTop,
    paddingBottom: PAGE_CHROME.searchPaddingBottom,
  },
  body: {
    // PHYSICAL_BOX pins the rail's `right` offset and the list's `paddingRight`
    // to real physical edges; without it forceRTL swaps both to the left.
    ...PHYSICAL_BOX,
    flex: 1,
    paddingTop: PAGE_CHROME.listAfterSearch,
    position: 'relative',
  },
  listContent: {
    gap: CARD_DENSITY.listGap,
  },
  rail: {
    // LETTER_INDEX_EDGE — the alphabet rail lives on the physical right edge.
    position: 'absolute',
    top: PAGE_CHROME.railTop,
    bottom: 0,
    // The right offset (`LETTER_INDEX_EDGE`) is set at render time from
    // `railListGeometry`: 16 on phones, the column's edge on tablets.
    width: RESERVED_COLUMNS.letterRail,
    alignItems: 'center',
  },
});
