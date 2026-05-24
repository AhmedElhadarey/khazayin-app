import { InlineHeader, SearchPill } from '@/components/khazain';
import {
  RecentSearchRow,
  SearchGroupHeader,
  SearchResultRow,
  SuggestionChips,
} from '@/components/khazain/search';
import { KhazainColors } from '@/constants/theme';
import { rowPropsForSearchResult } from '@/services/search';
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
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Group title lookups for the 4 result types.
const GROUP_TITLES: Record<'surah' | 'scholar' | 'book' | 'lecture', string> = {
  surah: 'سور',
  scholar: 'علماء',
  book: 'كتب',
  lecture: 'محاضرات',
};

export default function SearchModalScreen() {
  const router = useRouter();

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

  const handleResultPress = (route: string, q: string) => {
    commitQuery(q);
    router.replace(route as any);
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
    router.replace('/(tabs)/sections' as any);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <InlineHeader title="بحث" onBack={() => router.back()} />

      {/* Active search input */}
      <View style={styles.inputRow}>
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

      {/* Body: empty state OR results OR no-results */}
      {query.trim() ? (
        status === 'empty' ? (
          <NoResults query={query} onSections={goToSections} />
        ) : (
          <ResultsList results={results} onPress={handleResultPress} />
        )
      ) : (
        <EmptyState
          recents={recents}
          onPickRecent={(q) => setQuery(q)}
          onRemoveRecent={removeRecent}
          onClearAllRecents={handleConfirmClearRecents}
          onPickSuggestion={(q) => setQuery(q)}
        />
      )}
    </SafeAreaView>
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
  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      data={[] as readonly never[]}
      renderItem={() => null}
      ListHeaderComponent={
        <>
          {recents.length > 0 ? (
            <>
              <View style={styles.recentsHeaderRow}>
                <Text style={styles.recentsTitle}>البحث الأخير</Text>
                <Pressable onPress={onClearAllRecents} hitSlop={8}>
                  <Text style={styles.clearAllText}>مسح</Text>
                </Pressable>
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
  onPress: (route: string, q: string) => void;
}) {
  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      data={results}
      keyExtractor={(g) => g.type}
      renderItem={({ item: group }) => (
        <View>
          <SearchGroupHeader title={GROUP_TITLES[group.type]} count={group.items.length} />
          {group.items.map((it) => {
            // Each group's items render through SearchResultRow with a real
            // type-specific badge (Board condition #2: no stubs in v1).
            const { iconNode, title, subtitle, meta, route } = rowPropsForSearchResult(group, it);
            return (
              <SearchResultRow
                key={(it as { id: string }).id}
                iconNode={iconNode}
                title={title}
                subtitle={subtitle}
                meta={meta}
                onPress={() => onPress(route, title)}
              />
            );
          })}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

function NoResults({ query, onSections }: { query: string; onSections: () => void }) {
  return (
    <View style={styles.noResultsWrap}>
      <Text style={styles.noResultsTitle}>لا توجد نتائج لـ &quot;{query}&quot;</Text>
      <Text style={styles.noResultsSubtitle}>جرّب كلمة أخرى أو تصفّح الأقسام</Text>
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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  recentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  recentsTitle: {
    fontFamily: 'TheMixArab',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.ink900,
  },
  clearAllText: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.gold200,
    fontWeight: '600',
  },

  suggestionsTitle: {
    fontFamily: 'TheMixArab',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.ink900,
    paddingTop: 16,
    paddingBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  noResultsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noResultsTitle: {
    fontFamily: 'TheMixArab',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  noResultsSubtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    marginTop: 8,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  sectionsButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: KhazainColors.gold200,
    borderRadius: 999,
  },
  sectionsButtonText: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.cream50,
    fontWeight: '700',
  },
});
