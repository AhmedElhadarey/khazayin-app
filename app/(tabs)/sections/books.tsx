import {
  InlineHeader,
  LectureCard,
  OpenBookBadge,
  SearchPill,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 34: الكتب العلمية — list of lecture cards with an open-book cream disc.
const LECTURES = Array.from({ length: 7 }).map((_, i) => ({
  id: `b${i}`,
  title: 'الإعجاز العلمي في السنة النبوية',
  scholar: 'الشيخ عبد المحسن العباد',
  duration: '٣٢ دقيقة',
}));

export default function BooksScreen() {
  const router = useRouter();
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
        {LECTURES.map((l) => (
          <LectureCard
            key={l.id}
            iconNode={<OpenBookBadge size={48} />}
            title={l.title}
            scholar={l.scholar}
            duration={l.duration}
            onPress={() => Alert.alert(l.title, 'سيتم تشغيل الحلقة قريباً')}
          />
        ))}
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
