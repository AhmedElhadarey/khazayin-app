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
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 35: برامج إذاعية — denser radio program cards (compact LectureCard variant).

export default function RadioScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useRadioProgramsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="برامج إذاعية" onBack={() => router.back()} />
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
          skeleton={<SkeletonRibbonList count={6} />}
          emptyMessage="لا توجد برامج إذاعية متاحة"
        >
          {data.map((p) => (
            <LectureCard
              key={p.id}
              compact
              iconNode={<MicBadge size={40} />}
              title={p.title}
              scholar={p.scholar}
              duration={p.duration}
              onPress={() => Alert.alert(p.title, 'سيتم تشغيل البرنامج قريباً')}
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
    gap: 8,
  },
});
