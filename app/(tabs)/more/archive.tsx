import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { DetailHeader, ListRowCard, SearchPill } from '@/components/khazain';

export default function ArchiveScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailHeader title="الأرشيف" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBlock}>
          <SearchPill placeholder="ابحث في الأرشيف.." />
        </View>
        <View style={styles.list}>
          <ListRowCard
            title="العلماء والمشايخ"
            subtitle="محاضرات ودروس للعلماء"
            count="٢٥٣"
            icon={<ScholarsGlyph />}
          />
          <ListRowCard
            title="الكتب العلمية"
            subtitle="شروحات الكتب الإسلامية المهمة"
            count="٨٩"
            icon={<BookGlyph />}
          />
          <ListRowCard
            title="كتب صوتية"
            subtitle="كتب مقروءة بصوت عذب"
            count="١٧"
            icon={<HeadphonesGlyph />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScholarsGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={7} r={3} stroke={KhazainColors.navy800} strokeWidth={1.5} />
      <Path
        d="M4 17c0-3 3-5 6-5s6 2 6 5"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function BookGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 4h12v14H6a2 2 0 01-2-2V4z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function HeadphonesGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 11v-1a6 6 0 0112 0v1M4 11v3a2 2 0 002 2v-5H4zm12 0v5a2 2 0 002-2v-3h-2z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  container: {
    paddingTop: 0,
  },
  searchBlock: { paddingHorizontal: 14, paddingVertical: 4 },
  list: { paddingHorizontal: 14, paddingVertical: 4, gap: 10 },
});
