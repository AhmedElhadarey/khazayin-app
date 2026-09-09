import {
  AsyncContent,
  InlineHeader,
  LetterIndex,
  ReciterRow,
  SearchPill,
  SegmentTabs,
  SkeletonRibbonList,
} from '@/components/khazain';
import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { RECITER_TABS } from '@/data/content/quran';
import { DEFAULT_SETTINGS } from '@/constants/settings';
import { useRecitersStore, useSettingsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 13/14: reciter tabs + reciter list with right-rail letter index.
// Tabs sit between the InlineHeader+SearchPill and the list.

export default function ReciterScreen() {
  const router = useRouter();
  const [active, setActive] = useState<string>('tajweed');
  const { data, status, error, fetch, refresh } = useRecitersStore();
  const preferredReciterId = useSettingsStore((s) => s.preferredReciterId);
  const setPreferredReciter = useSettingsStore((s) => s.setPreferredReciter);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Stale-id fallback (track 002): if the persisted preferred reciter no
  // longer exists in the current list, revert to the foundation default.
  useEffect(() => {
    if (data.length === 0) return;
    if (!data.some((r) => r.id === preferredReciterId)) {
      setPreferredReciter(DEFAULT_SETTINGS.preferredReciterId);
    }
  }, [data, preferredReciterId, setPreferredReciter]);

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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="القرآن حياة" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      <SegmentTabs<string> tabs={RECITER_TABS} active={active} onChange={setActive} />
      {/* Body: scrollable list + absolute-positioned right-rail letter index. */}
      <View style={styles.body}>
        {/* Virtualized on success; AsyncContent owns the loading/empty/error
            states (T3.1). The right-rail letter index is a sibling overlay. */}
        {status === 'success' ? (
          <FlatList
            data={filtered}
            keyExtractor={(r) => r.id}
            renderItem={({ item: r }) => (
              <ReciterRow
                title={r.name}
                subtitle={r.styleLabel}
                isDefault={r.id === preferredReciterId}
                onPress={onPickReciter}
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
              skeleton={<SkeletonRibbonList count={6} />}
              emptyMessage="لا يوجد قراء في هذا التصنيف"
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
    // PHYSICAL_BOX pins the rail's `right` offset and the list's `paddingRight`
    // to real physical edges; without it forceRTL swaps both to the left.
    ...PHYSICAL_BOX,
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
    // LETTER_INDEX_EDGE — the alphabet rail lives on the physical right edge.
    position: 'absolute',
    top: 8,
    bottom: 0,
    right: 4,
    width: 26,
    alignItems: 'center',
  },
});
