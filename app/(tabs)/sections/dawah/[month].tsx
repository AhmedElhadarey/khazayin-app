import { AsyncContent, DawahPosterRow, InlineHeader, SkeletonPosterList } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useDawahByMonthStore, useDawahMonthsStore } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 30: تصميمات دعوية → month detail. Header is the month-pair title
// (e.g. "من شوال إلى رمضان"), then a stack of poster cards. Each row has
// a small poster thumb on the right, title in the middle, and share +
// download icons on the far left.
// Data sourced from useDawahByMonthStore (content service layer).

export default function DawahMonthScreen() {
  const router = useRouter();
  const { month } = useLocalSearchParams<{ month: string }>();

  // Months store — for the display title lookup.
  const { data: months, fetch: fetchMonths } = useDawahMonthsStore();

  // `useDawahByMonthStore` is a memoized factory (cache keyed by month),
  // not a React hook — calling it directly returns a stable Zustand hook
  // reference per month. Wrapping in useMemo would trip rules-of-hooks.
  const usePosters = useDawahByMonthStore(month ?? '');
  const { data: posters, status, error, fetch, refresh } = usePosters();

  useEffect(() => {
    fetchMonths();
    fetch();
  }, [fetchMonths, fetch, month]);

  const title =
    months.find((m) => m.id === month)?.title ?? 'تصميمات دعوية';

  const handleShare = () => router.push('/share-sheet' as any);
  const handleDownload = () => Alert.alert('تنزيل', 'سيتم التنزيل قريباً');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title={title} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonPosterList count={4} />}
          emptyMessage="لا توجد ملصقات لهذا الشهر"
        >
          <View style={styles.gap}>
            {posters.map((p) => (
              <DawahPosterRow
                key={p.id}
                title={p.title}
                quote={p}
                onPress={() => Alert.alert(p.title, 'فتح التفاصيل قريباً')}
                onShare={handleShare}
                onDownload={handleDownload}
              />
            ))}
          </View>
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  gap: {
    gap: 10,
  },
});
