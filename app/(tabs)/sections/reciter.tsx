import {
  InlineHeader,
  LetterIndex,
  ReciterRow,
  SearchPill,
  SegmentTabs,
} from '@/components/khazain';
import { AsyncContent, SkeletonRibbonList } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { RECITER_TABS } from '@/data/content/quran';
import { useRecitersStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 13/14: reciter tabs + reciter list with right-rail letter index.
// Tabs sit between the InlineHeader+SearchPill and the list.

export default function ReciterScreen() {
  const router = useRouter();
  const [active, setActive] = useState<string>('tajweed');
  const { data, status, error, fetch, refresh } = useRecitersStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Filter by active tab — local UI state, store doesn't know about tabs
  const filtered = data.filter((r) => r.style === active);

  const onPickReciter = () => {
    if (active === 'qiraat') {
      router.push('/sections/qiraat' as any);
    } else {
      router.push('/sections/mushaf' as any);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="القرآن حياة" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      <SegmentTabs<string> tabs={RECITER_TABS} active={active} onChange={setActive} />
      {/* Body: scrollable list + absolute-positioned right-rail letter index. */}
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        >
          <AsyncContent
            status={status}
            error={error}
            onRetry={refresh}
            skeleton={<SkeletonRibbonList count={6} />}
            emptyMessage="لا يوجد قراء في هذا التصنيف"
          >
            {filtered.map((r) => (
              <ReciterRow
                key={r.id}
                title={r.name}
                subtitle={r.styleLabel}
                onPress={onPickReciter}
              />
            ))}
          </AsyncContent>
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
    paddingRight: 36, // leave room for the right-rail letter index
  },
  listContent: {
    gap: 8,
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
