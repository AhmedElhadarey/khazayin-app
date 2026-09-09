import {
  InlineHeader,
  LectureCard,
  LetterIndex,
  SearchPill,
} from '@/components/khazain';
import { AudioWaveBadge } from '@/components/khazain/primitives/LectureBadges';
import { AUDIOBOOKS } from '@/data/content/audiobooks';
import { CARD_DENSITY, PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// كتب صوتية — Figma node 2869:2088.
//
// Header, search, compact rows with the waveform badge on the physical right,
// and the alphabet rail pinned to the physical right edge.
//
// Content is the deterministic mock set in data/content/audiobooks.ts: there
// is no audiobook endpoint yet, so this screen does not go through the content
// service and has no loading state to settle.
export default function AudiobooksScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="كتب صوتية" onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      <View style={styles.body}>
        <FlatList
          data={AUDIOBOOKS}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
          renderItem={({ item }) => (
            <LectureCard
              id={item.id}
              category={item.category}
              compact
              iconNode={<AudioWaveBadge size={CARD_DENSITY.lectureBadgeDisc} />}
              title={item.title}
              scholar={item.scholar}
              duration={item.duration}
              onPress={() => startLecturePlayback(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
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
    // PHYSICAL_BOX pins the rail's `right` offset and the list's reserved
    // `paddingRight`; without it forceRTL swaps both to the left.
    ...PHYSICAL_BOX,
    flex: 1,
    paddingTop: 8,
    position: 'relative',
  },
  list: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 36, // reserved for the right-rail letter index
  },
  listContent: { gap: CARD_DENSITY.listGap },
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
