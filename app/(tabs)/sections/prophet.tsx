import {
  InlineHeader,
  LectureCard,
  ProphetMedallionBadge,
  SearchPill,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 25: رسول الله ﷺ — list of lecture cards (no letter index).
// Each row uses the medallion badge with calligraphic ﷺ glyph on the right,
// title + scholar in the middle, duration chip on the far left.
const LECTURES = [
  { id: 'p1', title: 'السيرة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'p2', title: 'قصص الأنبياء', scholar: 'الشيخ سعد البريك', duration: '٥٠ دقيقة' },
  { id: 'p3', title: 'فقه العبادات', scholar: 'الشيخ صالح الفوزان', duration: '٢٠ دقيقة' },
  { id: 'p4', title: 'تفسير القرآن الكريم', scholar: 'الشيخ محمد العريفي', duration: '٤٥ دقيقة' },
  { id: 'p5', title: 'السيرة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'p6', title: 'غزوة بدر', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'p7', title: 'غزوة بدر', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
];

export default function ProphetScreen() {
  const router = useRouter();
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
        {LECTURES.map((l) => (
          <LectureCard
            key={l.id}
            iconNode={<ProphetMedallionBadge size={48} />}
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
