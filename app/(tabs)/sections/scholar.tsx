import {
  AsyncContent,
  InlineHeader,
  LetterIndex,
  RibbonCard,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useScholarsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 26: العلماء والمشايخ list of scholars with right-rail letter index.
// Each scholar = RibbonCard (gold-bar on right edge) with pretitle "فضيلة الشيخ"
// and the scholar's name in big Naskh.
// Data sourced from useScholarsStore (content service layer).

export default function ScholarScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useScholarsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="العلماء والمشايخ" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      <View style={styles.body}>
        {/* Virtualized on success; AsyncContent owns loading/empty/error (T3.1). */}
        {status === 'success' ? (
          <FlatList
            data={data}
            keyExtractor={(s) => s.id}
            renderItem={({ item: s }) => (
              <RibbonCard
                pretitle="فضيلة الشيخ"
                title={s.name}
                onPress={() => router.push(`/sections/scholar/${s.id}` as any)}
              />
            )}
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.list}>
            <AsyncContent
              status={status}
              error={error}
              onRetry={refresh}
              skeleton={<SkeletonRibbonList count={5} />}
              emptyMessage="لا يوجد علماء"
            >
              {null}
            </AsyncContent>
          </View>
        )}
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
