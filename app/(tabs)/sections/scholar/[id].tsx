import { AsyncContent, InlineHeader, RibbonCard, SearchPill, SkeletonRibbonList } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useScholarLecturesStore, useScholarsStore } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  // Param-driven factory hook: stable reference per id via useMemo.
  const useLectures = useMemo(
    () => useScholarLecturesStore(id ?? ''),
    [id]
  );
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
        <SearchPill placeholder="بحث.." />
      </View>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonRibbonList count={5} />}
          emptyMessage="لا يوجد محاضرات لهذا الشيخ"
        >
          {lectures.map((l) => (
            <RibbonCard
              key={l.id}
              title={l.title}
              meta={l.scholar}
              duration={l.duration}
              onPress={() => Alert.alert(l.title, 'سيتم تشغيل الحلقة قريباً')}
            />
          ))}
        </AsyncContent>
      </ScrollView>
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
});
