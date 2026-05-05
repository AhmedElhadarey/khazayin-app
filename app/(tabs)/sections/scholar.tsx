import {
  InlineHeader,
  LetterIndex,
  RibbonCard,
  SearchPill,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 26: العلماء والمشايخ list of scholars with right-rail letter index.
// Each scholar = RibbonCard (gold-bar on right edge) with pretitle "فضيلة الشيخ"
// and the scholar's name in big Naskh.
const SCHOLARS = [
  { id: 's1', name: 'عبد المحسن العباد' },
  { id: 's2', name: 'عبد المحسن العباد' },
  { id: 's3', name: 'عبد المحسن العباد' },
];

export default function ScholarScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="العلماء والمشايخ" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." />
      </View>
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        >
          {SCHOLARS.map((s) => (
            <RibbonCard
              key={s.id}
              pretitle="فضيلة الشيخ"
              title={s.name}
              onPress={() => router.push(`/sections/scholar/${s.id}` as any)}
            />
          ))}
        </ScrollView>
        <View style={styles.rail} pointerEvents="box-none">
          <LetterIndex active="م" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  body: {
    flex: 1,
    paddingTop: 8,
    position: 'relative',
  },
  list: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 36,
  },
  listContent: {
    gap: 10,
  },
  rail: {
    position: 'absolute',
    top: 8,
    bottom: 0,
    right: 4,
    width: 26,
    alignItems: 'center',
  },
});
