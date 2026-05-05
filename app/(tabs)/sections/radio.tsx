import {
  InlineHeader,
  LectureCard,
  MicBadge,
  SearchPill,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 35: برامج إذاعية — denser radio program cards (compact LectureCard variant).
const PROGRAMS = [
  { id: 'r1', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'r2', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'r3', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'r4', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'r5', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'r6', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'r7', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'r8', title: 'تاريخ العلوم الإسلامية', scholar: 'الشيخ إسماعيل الديوبي', duration: '٢٧ دقيقة' },
];

export default function RadioScreen() {
  const router = useRouter();
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
        {PROGRAMS.map((p) => (
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
