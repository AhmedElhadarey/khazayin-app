import {
  AsyncContent,
  InlineHeader,
  LectureCard,
  SearchPill,
  SkeletonRibbonList,
  TulipBadge,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { useQueenLecturesStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 33: أنتِ ملكة — paginated list of lecture cards with a tulip-glyph cream disc.
// FlatList for virtualisation + onEndReached infinite scroll.
// onEndReachedThreshold = 0.4: trigger fetchMore when 40% of viewport remains
// scrolled past the last rendered item. Tuned for finger-flick momentum on
// long Arabic lecture lists; tighter values cause double-fires under fast
// scroll because the prefetched page can land before the previous fetch
// debounce releases.

export default function QueenScreen() {
  const router = useRouter();
  const {
    items, status, error, fetchingMore, hasMore,
    fetch, fetchMore, refresh,
  } = useQueenLecturesStore();

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="أنتِ ملكة" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        renderItem={({ item }) => (
          <LectureCard
            id={item.id}
            category={item.category}
            iconNode={<TulipBadge size={48} />}
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
            skeleton={<SkeletonRibbonList count={10} />}
            emptyMessage="لا توجد محاضرات متاحة"
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
    gap: 10,
  },
});
