import {
  AsyncContent,
  InlineHeader,
  LectureCard,
  ProphetMedallionBadge,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useProphetLecturesStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 25: رسول الله ﷺ — list of lecture cards (no letter index).
// Each row uses the medallion badge with calligraphic ﷺ glyph on the right,
// title + scholar in the middle, duration chip on the far left.

export default function ProphetScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useProphetLecturesStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="رسول الله ﷺ" onBack={() => router.back()} />
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
          skeleton={<SkeletonRibbonList count={7} />}
          emptyMessage="لا توجد محاضرات في السيرة"
        >
          {data.map((l) => (
            <LectureCard
              key={l.id}
              iconNode={<ProphetMedallionBadge size={48} />}
              title={l.title}
              scholar={l.scholar}
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
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
});
