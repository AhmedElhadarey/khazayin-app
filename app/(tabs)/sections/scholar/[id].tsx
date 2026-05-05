import { InlineHeader, RibbonCard, SearchPill } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 28: كل الشرح — full-screen list of lecture RibbonCards for a single scholar.
// Header shows the scholar name in big Naskh display + "فضيلة الشيخ" pretitle,
// then a vertical stack of gold-ribbon cards (reusing the existing RibbonCard
// primitive from العلماء والمشايخ).

// Map scholar id (slug) → display name. Keep mock for now; will be replaced
// by real data when wired to a backend.
const SCHOLAR_NAMES: Record<string, string> = {
  's1': 'عبد المحسن العباد',
  's2': 'عبد المحسن العباد',
  's3': 'عبد المحسن العباد',
};

const LECTURES = [
  { id: 'l1', title: 'آداب الدعاء', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'l2', title: 'آداب الدعاء', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'l3', title: 'آداب الدعاء', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'l4', title: 'آداب الدعاء', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
  { id: 'l5', title: 'آداب الدعاء', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة' },
];

export default function ScholarDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const name = (id && SCHOLAR_NAMES[id]) || 'عبد المحسن العباد';

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
        {LECTURES.map((l) => (
          <RibbonCard
            key={l.id}
            title={l.title}
            meta={l.scholar}
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
