import { AsyncContent, InlineHeader, SearchPill, SkeletonRibbonList } from '@/components/khazain';
import { ReciterSurahRow } from '@/components/khazain/sections';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import {
  reciterDetailAsyncProps,
  reciterDetailState,
  retryTargets,
} from '@/services/reciterScreenState';
import { startSurahPlayback } from '@/services/surahPlayback';
import { useRecitersStore, useSurahsStore } from '@/store';
import { openSearch } from '@/services/searchNavigation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Reciter listening list — Figma node 2207:5270.
//
// Reached by picking a reciter on /sections/reciter, which now passes the
// reciter id instead of dropping it and opening the general Mushaf. The rows
// start audio through the shared lecture-playback boundary; while a reciter has
// no recording, that boundary reports it in Arabic and leaves the user here.
//
// Body states come from `reciterDetailState` (services/reciterScreenState.ts):
// loading skeleton, error with retry (refreshes every failed store), not-found
// for an unknown id, no-surahs, and the loaded list. Only the loaded list has a
// frame; the other states follow CARD_DENSITY and the shared state cards.
export default function ReciterSurahListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: reciters, status: recitersStatus, error: recitersError,
    fetch: fetchReciters, refresh: refreshReciters,
  } = useRecitersStore();
  const {
    data: surahs, status: surahsStatus, error: surahsError,
    fetch: fetchSurahs, refresh: refreshSurahs,
  } = useSurahsStore();

  useEffect(() => {
    fetchReciters();
    fetchSurahs();
  }, [fetchReciters, fetchSurahs]);

  const state = reciterDetailState({
    id, reciters, recitersStatus, recitersError, surahs, surahsStatus, surahsError,
  });
  // Outside `ready` the reciter may still be known (no surahs yet, or none).
  const reciter = reciters.find((r) => r.id === id);

  const onRetry = () => {
    for (const target of retryTargets(recitersStatus, surahsStatus)) {
      if (target === 'reciters') refreshReciters();
      else refreshSurahs();
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader
        title={(state.kind === 'ready' ? state.reciter.name : reciter?.name) ?? 'القرآن حياة'}
        onBack={() => router.back()}
      />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={openSearch} />
      </View>
      {state.kind === 'ready' ? (
        <FlatList
          data={surahs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          renderItem={({ item }) => (
            <ReciterSurahRow
              surah={item}
              reciterName={state.reciter.name}
              onPress={() => startSurahPlayback(state.reciter, item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // Loading / error+retry / not-found / no-surahs. No frame: geometry
        // from CARD_DENSITY (surah row 60, gap 6), cards from EmptyState /
        // ErrorState tokens. Not wrapped around the FlatList: the fade
        // wrapper has no flex and would break scrolling.
        <View style={styles.stateBlock}>
          <AsyncContent
            {...reciterDetailAsyncProps(state)}
            onRetry={onRetry}
            skeleton={
              <SkeletonRibbonList
                count={8}
                height={CARD_DENSITY.surahRowMinHeight}
                gap={CARD_DENSITY.lectureListGap}
              />
            }
          >
            {null}
          </AsyncContent>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: CARD_DENSITY.lectureListGap,
  },
  // Mirrors `list` padding so a state card sits where the rows would.
  stateBlock: { paddingHorizontal: 16, paddingTop: 4 },
});
