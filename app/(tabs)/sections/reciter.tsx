import {
  AsyncContent,
  EmptyState,
  InlineHeader,
  LetterIndex,
  ReciterRow,
  SearchPill,
  SegmentTabs,
  SkeletonRibbonList,
} from '@/components/khazain';
import { CARD_DENSITY, PHYSICAL_BOX, RESERVED_COLUMNS } from '@/constants/layout';
import { LETTER_INDEX_EDGE } from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import { RECITER_TABS } from '@/data/content/quran';
import { DEFAULT_SETTINGS } from '@/constants/settings';
import { reciterDestination, reciterTabFromParam } from '@/services/reciterNavigation';
import { RECITER_STATE_COPY, reciterListView } from '@/services/reciterScreenState';
import type { Reciter } from '@/types/content';
import { useRecitersStore, useSettingsStore } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 13/14: reciter tabs + reciter list with right-rail letter index.
// Tabs sit between the InlineHeader+SearchPill and the list.

export default function ReciterScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const requestedTab = reciterTabFromParam(tab);
  const [active, setActive] = useState<string>(requestedTab);
  const { data, status, error, fetch, refresh } = useRecitersStore();
  const preferredReciterId = useSettingsStore((s) => s.preferredReciterId);
  const setPreferredReciter = useSettingsStore((s) => s.setPreferredReciter);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // A deep link can select an audited tab state without inventing another
  // route. Keep this synchronized when an intent reaches a mounted screen.
  useEffect(() => {
    setActive(requestedTab);
  }, [requestedTab]);

  // Stale-id fallback (track 002): if the persisted preferred reciter no
  // longer exists in the current list, revert to the foundation default.
  useEffect(() => {
    if (data.length === 0) return;
    if (!data.some((r) => r.id === preferredReciterId)) {
      setPreferredReciter(DEFAULT_SETTINGS.preferredReciterId);
    }
  }, [data, preferredReciterId, setPreferredReciter]);

  // Filter by active tab — local UI state, store doesn't know about tabs.
  // The store's `empty` is whole-dataset, so a single tab can still be empty.
  const view = reciterListView(status, data, active);

  // The reciter is carried through: `reciterDestination` sends the Qiraa tab to
  // the qiraat screen and every other reciter to their own listening list. The
  // previous version ignored its argument and opened the general Mushaf.
  const onPickReciter = (reciter: Reciter) => {
    router.push(reciterDestination(reciter) as any);
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
        {/* Three bodies: the virtualized list when the active tab has
            reciters; a per-tab empty card when reciters loaded but none sit
            in this tab; otherwise AsyncContent owns loading/empty/error
            (T3.1). The right-rail letter index is a sibling overlay. */}
        {view.kind === 'list' ? (
          <FlatList
            data={view.reciters}
            keyExtractor={(r) => r.id}
            renderItem={({ item: r }) => (
              <ReciterRow
                title={r.name}
                subtitle={r.styleLabel}
                isDefault={r.id === preferredReciterId}
                onPress={() => onPickReciter(r)}
              />
            )}
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
            showsVerticalScrollIndicator={false}
          />
        ) : view.kind === 'tabEmpty' ? (
          // Reciters loaded, but none in this tab: the store's `empty` is
          // whole-dataset, so this case needs its own card (no frame —
          // EmptyState tokens, letter-rail inset from styles.list).
          <View style={styles.list}>
            <EmptyState message={RECITER_STATE_COPY.tabEmpty} />
          </View>
        ) : (
          <View style={styles.list}>
            <AsyncContent
              status={status}
              error={error}
              onRetry={refresh}
              skeleton={<SkeletonRibbonList count={6} />}
              emptyMessage={RECITER_STATE_COPY.listEmpty}
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
    paddingRight: RESERVED_COLUMNS.letterRailInset,
  },
  listContent: {
    gap: CARD_DENSITY.lectureListGap,
  },
  rail: {
    // LETTER_INDEX_EDGE — the alphabet rail lives on the physical right edge.
    position: 'absolute',
    top: 8,
    bottom: 0,
    // LETTER_INDEX_EDGE — the rail lives on the physical right edge, hard
    // against the 16pt page margin.
    [LETTER_INDEX_EDGE]: 16,
    width: RESERVED_COLUMNS.letterRail,
    alignItems: 'center',
  },
});
