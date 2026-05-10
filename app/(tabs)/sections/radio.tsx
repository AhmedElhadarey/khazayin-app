import {
  AsyncContent,
  InlineHeader,
  LectureCard,
  MicBadge,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRadioProgramsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 35: برامج إذاعية — paginated denser radio program cards (compact LectureCard variant).
// FlatList for virtualisation + onEndReached infinite scroll.
// onEndReachedThreshold = 0.4: trigger fetchMore when 40% of viewport remains
// scrolled past the last rendered item. Tuned for finger-flick momentum on
// long Arabic lecture lists; tighter values cause double-fires under fast
// scroll because the prefetched page can land before the previous fetch
// debounce releases.

export default function RadioScreen() {
  const router = useRouter();
  const {
    items, status, error, fetchingMore, hasMore,
    fetch, fetchMore, refresh,
  } = useRadioProgramsStore();

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="برامج إذاعية" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." />
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        renderItem={({ item }) => (
          <LectureCard
            compact
            iconNode={<MicBadge size={40} />}
            title={item.title}
            scholar={item.scholar}
            duration={item.duration}
            onPress={() => Alert.alert(item.title, 'سيتم تشغيل البرنامج قريباً')}
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
    gap: 8,
  },
});
