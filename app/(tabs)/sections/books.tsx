import {
  AsyncContent,
  InlineHeader,
  LectureCard,
  OpenBookBadge,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useBookLecturesStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 34: الكتب العلمية — list of lecture cards with an open-book cream disc.

export default function BooksScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useBookLecturesStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="الكتب العلمية" onBack={() => router.back()} />
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
          emptyMessage="لا توجد كتب متاحة"
        >
          {data.map((l) => (
            <LectureCard
              key={l.id}
              iconNode={<OpenBookBadge size={48} />}
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
