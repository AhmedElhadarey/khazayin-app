import {
  AsyncContent,
  InlineHeader,
  LinkedNotesSection,
  RibbonCard,
  SearchPill,
  SkeletonRibbonList,
  seriesIdsOf,
} from '@/components/khazain';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { noteSourceTarget, runNoteSource } from '@/services/noteNavigation';
import { lectureSaveTarget } from '@/services/savedToggle';
import { useScholarLecturesStore, useScholarsStore } from '@/store';
import { notesForLectureSeries, useNotesStore } from '@/store/notesStore';
import { openSearch } from '@/services/searchNavigation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 28: كل الشرح — full-screen list of lecture RibbonCards for a single scholar.
// Header shows the scholar name in big Naskh display + "فضيلة الشيخ" pretitle,
// then a vertical stack of gold-ribbon cards (reusing the existing RibbonCard
// primitive from العلماء والمشايخ).
// Data sourced from useScholarLecturesStore (content service layer).

export default function ScholarDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Scholars store — for the display name lookup.
  const { data: scholars, fetch: fetchScholars } = useScholarsStore();

  // `useScholarLecturesStore` is a memoized factory (cache keyed by id),
  // not a React hook — calling it directly returns a stable Zustand hook
  // reference per id. Wrapping in useMemo would trip rules-of-hooks.
  const useLectures = useScholarLecturesStore(id ?? '');
  const { data: lectures, status, error, fetch, refresh } = useLectures();

  useEffect(() => {
    fetchScholars();
    fetch();
  }, [fetchScholars, fetch, id]);

  // Notes taken on this scholar's lectures. Subscribe to the list and filter in
  // a memo; a fresh array from the selector would loop under zustand 5.
  const allNotes = useNotesStore((s) => s.notes);
  const linkedNotes = useMemo(
    () => notesForLectureSeries(allNotes, seriesIdsOf(lectures)),
    [allNotes, lectures],
  );

  const name =
    scholars.find((s) => s.id === id)?.name ?? 'عبد المحسن العباد';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="كل الشرح" onBack={() => router.back()} />
      <View style={styles.headBlock}>
        <Text style={styles.preName}>فضيلة الشيخ</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={openSearch} />
      </View>
      {/* Virtualized on success — a scholar's lecture list is unbounded (T3.1).
          AsyncContent owns the loading/empty/error states. */}
      {status === 'success' ? (
        <FlatList
          data={lectures}
          keyExtractor={(l) => l.id}
          renderItem={({ item: l }) => (
            <RibbonCard
              title={l.title}
              meta={l.scholar}
              duration={l.duration}
              save={lectureSaveTarget(l)}
              onPress={() => startLecturePlayback(l)}
            />
          )}
          ListFooterComponent={
            linkedNotes.length > 0 ? (
              <LinkedNotesSection
                title="ملاحظاتي على هذه الدروس"
                notes={linkedNotes}
                onOpenNote={(noteId) =>
                  router.push({ pathname: '/note-editor' as any, params: { id: noteId } })
                }
                onOpenSource={(n) => {
                  // Nothing to dismiss here: the screen stays underneath.
                  if (!n.ref) return;
                  runNoteSource(noteSourceTarget(n.ref), {
                    navigate: (href) => router.navigate(href as any),
                    play: startLecturePlayback,
                  });
                }}
              />
            ) : null
          }
          style={styles.flex}
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.list}>
          <AsyncContent
            style={styles.rows}
            status={status}
            error={error}
            onRetry={refresh}
            skeleton={<SkeletonRibbonList count={5} />}
            emptyMessage="لا يوجد محاضرات لهذا الشيخ"
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
  headBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  // Node 2510:1990 has no name block — its rows carry the scholar's name on
  // every subtitle instead. This one is the app's own, kept because it is the
  // only place the screen says whose lectures these are, but set on the scale
  // so it reads as page furniture rather than a second title.
  preName: textStyle('caption', { color: KhazainColors.ink500, textAlign: 'center' }),
  name: {
    ...textStyle('bodyLarge', { color: KhazainColors.inkTitle, textAlign: 'center' }),
    marginTop: 2,
  },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  flex: { flex: 1 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: CARD_DENSITY.lectureListGap,
  },
  rows: { gap: CARD_DENSITY.lectureListGap },
});
