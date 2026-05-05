import { DawahPosterRow, InlineHeader } from '@/components/khazain';
import { DawahQuote } from '@/components/khazain/home/DawahPoster';
import { KhazainColors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 30: تصميمات دعوية → month detail. Header is the month-pair title
// (e.g. "من شوال إلى رمضان"), then a stack of poster cards. Each row has
// a small poster thumb on the right, title in the middle, and share +
// download icons on the far left.

// Map slug → display title. Mock data — replace with real catalog when wired.
const MONTH_TITLES: Record<string, string> = {
  'shawwal-ramadan': 'من شوال إلى رمضان',
  'ramadan-shawwal': 'من رمضان إلى شوال',
  'rabi1-rabi2': 'من ربيع الأول إلى ربيع الآخر',
  'muharram-safar': 'من محرم إلى صفر',
  'dhul-qadah-dhul-hijjah': 'من ذو القعدة إلى ذو الحجة',
  'shawwal-dhul-qadah': 'من شوال إلى ذو القعدة',
};

const POSTERS: { id: string; title: string; quote: DawahQuote }[] = [
  {
    id: 'd1',
    title: 'دعاء ليلة القدر',
    quote: {
      tone: '#E8DDD0',
      t: 'دعاء ليلة القدر',
      b: 'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    },
  },
  {
    id: 'd2',
    title: 'دعاء ليلة القدر',
    quote: {
      tone: '#E1D4BE',
      t: 'دعاء ليلة القدر',
      b: 'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    },
  },
  {
    id: 'd3',
    title: 'دعاء ليلة القدر',
    quote: {
      tone: '#DBC9B0',
      t: 'دعاء ليلة القدر',
      b: 'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    },
  },
  {
    id: 'd4',
    title: 'دعاء ليلة القدر',
    quote: {
      tone: '#E8DDD0',
      t: 'دعاء ليلة القدر',
      b: 'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    },
  },
];

export default function DawahMonthScreen() {
  const router = useRouter();
  const { month } = useLocalSearchParams<{ month: string }>();
  const title = (month && MONTH_TITLES[month]) || 'تصميمات دعوية';

  const handleShare = () => router.push('/share-sheet' as any);
  const handleDownload = () => Alert.alert('تنزيل', 'سيتم التنزيل قريباً');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title={title} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gap}>
          {POSTERS.map((p) => (
            <DawahPosterRow
              key={p.id}
              title={p.title}
              quote={p.quote}
              onPress={() => Alert.alert(p.title, 'فتح التفاصيل قريباً')}
              onShare={handleShare}
              onDownload={handleDownload}
            />
          ))}
        </View>
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
