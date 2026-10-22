import { InlineHeader, SearchPill, SkeletonRowList } from '@/components/khazain';
import {
  RecentSearchRow,
  SearchGroupHeader,
  SearchResultRow,
  SuggestionChips,
} from '@/components/khazain/search';
import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { textStyle } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { isCorpusLoading } from '@/services/loadState';
import {
  createSearchTargetRunner,
  rowPropsForSearchResult,
  runOnceAfterDismissal,
  searchBodyState,
  type SearchTarget,
} from '@/services/search';
import { onRootRevealedOnce } from '@/services/search/rootReveal';
import {
  useBookLecturesStore,
  useBooksStore,
  useProphetLecturesStore,
  useQueenLecturesStore,
  useRadioProgramsStore,
  useRecentSearchesStore,
  useScholarsStore,
  useSearchStore,
  useSurahsStore,
} from '@/store';
import { router, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

// Group title lookups for the 4 result types.
const GROUP_TITLES: Record<'surah' | 'scholar' | 'book' | 'lecture', string> = {
  surah: 'سور',
  scholar: 'علماء',
  book: 'كتب',
  lecture: 'محاضرات',
};

export default function SearchModalScreen() {
  const insets = useSafeAreaInsets();
  const { columnStyle } = useResponsiveLayout();

  // ── Search state ──
  const query = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const status = useSearchStore((s) => s.status);
  const setQuery = useSearchStore((s) => s.setQuery);
  const clear = useSearchStore((s) => s.clear);

  // ── Recent searches ──
  const recents = useRecentSearchesStore((s) => s.recents);
  const addRecent = useRecentSearchesStore((s) => s.addRecent);
  const removeRecent = useRecentSearchesStore((s) => s.removeRecent);
  const clearAllRecents = useRecentSearchesStore((s) => s.clearAll);

  // ── Warm-up: fetch all 7 stores on mount (idempotent via SWR) ──
  useEffect(() => {
    useSurahsStore.getState().fetch();
    useScholarsStore.getState().fetch();
    useBooksStore.getState().fetch();
    useProphetLecturesStore.getState().fetch();
    useBookLecturesStore.getState().fetch();
    useQueenLecturesStore.getState().fetch();
    useRadioProgramsStore.getState().fetch();
  }, []);

  // ── Re-run search whenever underlying store data changes ──
  const surahsData = useSurahsStore((s) => s.data);
  const scholarsData = useScholarsStore((s) => s.data);
  const booksData = useBooksStore((s) => s.data);
  const prophetItems = useProphetLecturesStore((s) => s.items);
  const bookLecItems = useBookLecturesStore((s) => s.items);
  const queenItems = useQueenLecturesStore((s) => s.items);
  const radioItems = useRadioProgramsStore((s) => s.items);

  // ── Corpus load state: "no results" is only true once every store settled ──
  const surahsStatus = useSurahsStore((s) => s.status);
  const scholarsStatus = useScholarsStore((s) => s.status);
  const booksStatus = useBooksStore((s) => s.status);
  const prophetStatus = useProphetLecturesStore((s) => s.status);
  const bookLecStatus = useBookLecturesStore((s) => s.status);
  const queenStatus = useQueenLecturesStore((s) => s.status);
  const radioStatus = useRadioProgramsStore((s) => s.status);
  const corpusLoading = isCorpusLoading([surahsStatus, scholarsStatus, booksStatus,
    prophetStatus, bookLecStatus, queenStatus, radioStatus]);
  const body = searchBodyState({ query, resultCount: results.length, status, corpusLoading });

  useEffect(() => {
    if (query.trim()) {
      setQuery(query); // re-trigger debounce with current query
    }
    // We intentionally watch the data deps; setQuery is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahsData, scholarsData, booksData, prophetItems, bookLecItems, queenItems, radioItems]);

  // ── On unmount, clear transient state ──
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  // ── Commit handlers ──
  const commitQuery = (q: string) => {
    if (q.trim()) addRecent(q.trim());
  };

  // One runner per mount: it acts on the first target only, so a second tap
  // during the transition is a no-op. The imperative `router` is stable for
  // the life of the screen.
  const [runTarget] = useState(() => createSearchTargetRunner({
    // POP_TO at the root stack: pops search and navigates the existing (tabs);
    // withAnchor loads the Sections index under the destination (design §4.3).
    dismissTo: (href) => router.dismissTo(href as Href, { withAnchor: true }),
    dismiss: () => router.back(),
    // Start playback once the modal has finished closing, so a no-audio Alert
    // does not appear over the closing search screen (R8 — a UX choice; the
    // Alert has its own window and is not lost). Armed before dismiss(). The
    // close signal is (tabs) reappearing underneath (services/search/rootReveal.ts);
    // this screen's own closing event never arrives because it unmounts first.
    playAfterDismiss: (lecture) => runOnceAfterDismissal({
      onClosed: onRootRevealedOnce,
      setTimer: (fire, ms) => {
        const t = setTimeout(fire, ms);
        return () => clearTimeout(t);
      },
      run: () => { void startLecturePlayback(lecture); },
    }),
  }));

  const handleResultPress = (target: SearchTarget) => {
    if (runTarget(target)) commitQuery(query);
  };

  const handleConfirmClearRecents = () => {
    Alert.alert(
      'مسح البحث الأخير؟',
      'سيتم حذف جميع عمليات البحث الأخيرة من جهازك.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'مسح', style: 'destructive', onPress: clearAllRecents },
      ],
    );
  };

  const goToSections = () => {
    runTarget({ kind: 'route', href: '/sections' });
  };

  return (
    // Padded by the JS insets, not a native SafeAreaView: inside the
    // fullScreenModal presentation (app/_layout.tsx) iOS reports a 0 top inset
    // to the native view, which put the header and its back button under the
    // status bar — and a fullScreenModal has no swipe-to-dismiss.
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <InlineHeader title="بحث" onBack={() => router.back()} style={columnStyle} />

      {/* Active search input */}
      <View style={[styles.inputRow, columnStyle]}>
        <SearchPill
          autoFocus
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          onSubmitEditing={() => commitQuery(query)}
          returnKeyType="search"
          placeholder="ابحث عن سور، علماء، كتب، محاضرات..."
        />
      </View>

      {/* Body: see services/search/searchBodyState.ts */}
      {body === 'idle' ? (
        <EmptyState
          recents={recents}
          onPickRecent={(q) => setQuery(q)}
          onRemoveRecent={removeRecent}
          onClearAllRecents={handleConfirmClearRecents}
          onPickSuggestion={(q) => setQuery(q)}
        />
      ) : body === 'results' ? (
        <ResultsList results={results} onPress={handleResultPress} />
      ) : body === 'loading' ? (
        <View
          style={styles.loadingWrap}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="جارٍ التحميل"
        >
          <SkeletonRowList count={4} />
        </View>
      ) : body === 'no-results' ? (
        <NoResults
          query={query}
          onSections={goToSections}
          onPickSuggestion={(q) => setQuery(q)}
        />
      ) : null}
    </View>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function EmptyState({
  recents,
  onPickRecent,
  onRemoveRecent,
  onClearAllRecents,
  onPickSuggestion,
}: {
  recents: string[];
  onPickRecent: (q: string) => void;
  onRemoveRecent: (q: string) => void;
  onClearAllRecents: () => void;
  onPickSuggestion: (q: string) => void;
}) {
  const { columnStyle } = useResponsiveLayout();
  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, columnStyle]}
      data={[] as readonly never[]}
      renderItem={() => null}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {recents.length > 0 ? (
            <>
              {/* Physical left -> right: the clear action, then the heading. */}
              <View style={styles.recentsHeaderRow}>
                <Pressable onPress={onClearAllRecents} hitSlop={8}>
                  <Text style={styles.clearAllText}>مسح</Text>
                </Pressable>
                <Text style={styles.recentsTitle}>البحث الأخير</Text>
              </View>
              {recents.map((r) => (
                <RecentSearchRow
                  key={r}
                  query={r}
                  onPress={() => onPickRecent(r)}
                  onRemove={() => onRemoveRecent(r)}
                />
              ))}
              <View style={{ height: 16 }} />
            </>
          ) : null}

          <Text style={styles.suggestionsTitle}>مقترحات</Text>
          <SuggestionChips onPick={onPickSuggestion} />
        </>
      }
    />
  );
}

type ResultGroup = ReturnType<typeof useSearchStore.getState>['results'][number];

function ResultsList({
  results,
  onPress,
}: {
  results: ResultGroup[];
  onPress: (target: SearchTarget) => void;
}) {
  const { columnStyle } = useResponsiveLayout();
  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, columnStyle]}
      data={results}
      keyExtractor={(g) => g.type}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item: group }) => (
        <View>
          <SearchGroupHeader title={GROUP_TITLES[group.type]} count={group.items.length} />
          {group.items.map((it) => {
            // Each group's items render through SearchResultRow with a real
            // type-specific badge (Board condition #2: no stubs in v1).
            const { iconNode, title, subtitle, meta, target } = rowPropsForSearchResult(group, it);
            return (
              <SearchResultRow
                key={(it as { id: string }).id}
                iconNode={iconNode}
                title={title}
                subtitle={subtitle}
                meta={meta}
                onPress={() => onPress(target)}
              />
            );
          })}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

function NoResults({
  query,
  onSections,
  onPickSuggestion,
}: {
  query: string;
  onSections: () => void;
  onPickSuggestion: (q: string) => void;
}) {
  return (
    <View style={styles.noResultsWrap}>
      <Text style={styles.noResultsTitle}>لا توجد نتائج لـ &quot;{query}&quot;</Text>
      <Text style={styles.noResultsSubtitle}>جرّب كلمة أخرى أو تصفّح الأقسام</Text>
      <View style={styles.noResultsSuggestions}>
        <Text style={styles.suggestionsTitle}>مقترحات</Text>
        <SuggestionChips onPick={onPickSuggestion} />
      </View>
      <Pressable onPress={onSections} style={styles.sectionsButton} hitSlop={8}>
        <Text style={styles.sectionsButtonText}>الأقسام</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KhazainColors.pageBg,
  },
  inputRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingBottom: 24 },

  recentsHeaderRow: {
    ...PHYSICAL_ROW,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  recentsTitle: textStyle('sectionTitle', { color: KhazainColors.ink900 }),
  clearAllText: textStyle('cardTitle', { color: KhazainColors.gold200 }),

  suggestionsTitle: {
    ...textStyle('sectionTitle', { color: KhazainColors.ink900 }),
    paddingTop: 16,
    paddingBottom: 8,
  },

  noResultsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  // noResultsWrap centres its children and is not pinned; SuggestionChips is an
  // `inverted` list, so without a PHYSICAL_BOX container forced RTL and the
  // inversion flip twice and the first chip lands on the left.
  noResultsSuggestions: { ...PHYSICAL_BOX, alignSelf: 'stretch', paddingTop: 16 },
  loadingWrap: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 8 },
  noResultsTitle: textStyle('bodyLarge', { color: KhazainColors.ink900, textAlign: 'center' }),
  noResultsSubtitle: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle, textAlign: 'center' }),
    marginTop: 8,
  },
  sectionsButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: KhazainColors.gold200,
    borderRadius: 999,
  },
  sectionsButtonText: textStyle('cardTitle', { color: KhazainColors.cream50 }),
});
