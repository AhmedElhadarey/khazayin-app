import {
  AsyncContent,
  InlineHeader,
  LectureCard,
  MicBadge,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { useRadioProgramsStore } from '@/store';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

// Page 35: برامج إذاعية — paginated radio programme cards. Node 2606:3830
// draws the same `DIV-139` as prophet, queen and books: 64 tall at radius 16
// behind a `#D9D6D3` hairline. It is NOT the rail-list row.
// FlatList for virtualisation + onEndReached infinite scroll.
// onEndReachedThreshold = 0.4: trigger fetchMore when 40% of viewport remains
// scrolled past the last rendered item. Tuned for finger-flick momentum on
// long Arabic lecture lists; tighter values cause double-fires under fast
// scroll because the prefetched page can land before the previous fetch
// debounce releases.

export default function RadioScreen() {
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const {
    items, status, error, fetchingMore, hasMore,
    fetch, fetchMore, refresh,
  } = useRadioProgramsStore();

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="برامج إذاعية" onBack={() => router.back()} style={columnStyle} />
      <View style={[styles.searchBlock, columnStyle]}>
        <SearchPill placeholder="بحث.." onPress={openSearch} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }, columnStyle]}
        renderItem={({ item }) => (
          <LectureCard
            id={item.id}
            category={item.category}
            iconNode={<MicBadge size={CARD_DENSITY.lectureBadgeDisc} />}
            title={item.title}
            scholar={item.scholar}
            duration={item.duration}
            onPress={() => startLecturePlayback(item)}
          />
        )}
        onEndReached={() => { if (hasMore && !fetchingMore) fetchMore(); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <AsyncContent
            status={status}
            error={error}
            onRetry={refresh}
            skeleton={<SkeletonRibbonList count={6} />}
            emptyMessage="لا توجد برامج إذاعية متاحة"
          >
            <View />
          </AsyncContent>
        }
        ListFooterComponent={fetchingMore ? <SkeletonRibbonList count={2} /> : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: CARD_DENSITY.lectureListGap,
  },
});
