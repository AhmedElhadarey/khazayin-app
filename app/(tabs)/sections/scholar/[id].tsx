import { AsyncContent, InlineHeader, RibbonCard, SearchPill, SkeletonRibbonList } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { useScholarLecturesStore, useScholarsStore } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 28: كل الشرح — full-screen list of lecture RibbonCards for a single scholar.
// Header shows the scholar name in big Naskh display + "فضيلة الشيخ" pretitle,
// then a vertical stack of gold-ribbon cards (reusing the existing RibbonCard
// primitive from العلماء والمشايخ).
// Data sourced from useScholarLecturesStore (content service layer).

export default function ScholarDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Scholars store — for the display name lookup.
  const { data: scholars, fetch: fetchScholars } = useScholarsStore();

  // `useScholarLecturesStore` is a memoized factory (cache keyed by id),
  // not a React hook — calling it directly returns a stable Zustand hook
  // reference per id. Wrapping in useMemo would trip rules-of-hooks.
  const useLectures = useScholarLecturesStore(id ?? '');
  const { data: lectures, status, error, fetch, refresh } = useLectures();

  useEffect(() => {
    fetchScholars();
    fetch();
  }, [fetchScholars, fetch, id]);

  const name =
    scholars.find((s) => s.id === id)?.name ?? 'عبد المحسن العباد';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="كل الشرح" onBack={() => router.back()} />
      <View style={styles.headBlock}>
        <Text style={styles.preName}>فضيلة الشيخ</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      {/* Virtualized on success — a scholar's lecture list is unbounded (T3.1).
          AsyncContent owns the loading/empty/error states. */}
      {status === 'success' ? (
        <FlatList
          data={lectures}
          keyExtractor={(l) => l.id}
          renderItem={({ item: l }) => (
            <RibbonCard
              title={l.title}
              meta={l.scholar}
              duration={l.duration}
              onPress={() => startLecturePlayback(l)}
            />
          )}
          style={styles.flex}
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.list}>
          <AsyncContent
            status={status}
            error={error}
            onRetry={refresh}
            skeleton={<SkeletonRibbonList count={5} />}
            emptyMessage="لا يوجد محاضرات لهذا الشيخ"
          >
            {null}
          </AsyncContent>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  preName: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  name: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'center',
    marginTop: 2,
  },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  flex: { flex: 1 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
});
