import { InlineHeader, SearchPill } from '@/components/khazain';
import { ReciterSurahRow } from '@/components/khazain/sections';
import { EmptyState } from '@/components/khazain/state';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { startSurahPlayback } from '@/services/surahPlayback';
import { useRecitersStore, useSurahsStore } from '@/store';
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
export default function ReciterSurahListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: reciters, fetch: fetchReciters } = useRecitersStore();
  const { data: surahs, fetch: fetchSurahs } = useSurahsStore();

  useEffect(() => {
    fetchReciters();
    fetchSurahs();
  }, [fetchReciters, fetchSurahs]);

  const reciter = reciters.find((r) => r.id === id);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title={reciter?.name ?? 'القرآن حياة'} onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      {reciter ? (
        <FlatList
          data={surahs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          renderItem={({ item }) => (
            <ReciterSurahRow
              surah={item}
              reciterName={reciter.name}
              onPress={() => startSurahPlayback(reciter, item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // An unknown id is a real empty state, not a reason to reroute.
        <EmptyState message="لم يتم العثور على هذا القارئ" />
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
    gap: CARD_DENSITY.listGap,
  },
});
