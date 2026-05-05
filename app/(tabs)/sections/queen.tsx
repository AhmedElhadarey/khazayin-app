import {
  InlineHeader,
  LectureCard,
  SearchPill,
  TulipBadge,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 33: أنتِ ملكة — list of lecture cards with a tulip-glyph cream disc.
// Title repeats "أنتِ ملكة" in the Figma mock; this is intentional.
const LECTURES = Array.from({ length: 10 }).map((_, i) => ({
  id: `q${i}`,
  title: 'أنتِ ملكة',
  scholar: 'الشيخ عبد المحسن العباد',
  duration: '٣٢ دقيقة',
}));

export default function QueenScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="أنتِ ملكة" onBack={() => router.back()} />
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
            iconNode={<TulipBadge size={48} />}
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
