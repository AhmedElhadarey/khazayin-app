import { AsyncContent, BookCard, EmptyState, InlineHeader, PillButton } from '@/components/khazain';
import { bookCardLayout } from '@/components/khazain/home/bookCardLayout';
import { BOOK_DETAIL_SECTIONS, type BookDetailSection } from '@/constants/bookDetailPresentation';
import { PHYSICAL_BOX, responsiveCarouselCardWidth } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { bookDetailBody, bookPrimaryAction, resolveBookDetail } from '@/services/bookDetail';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { useBookLecturesStore, useBooksStore } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** PillButton `lg` height — the placeholder keeps the action row from jumping. */
const PRIMARY_ACTION_HEIGHT = 44;

// Book detail, reached from search. No Figma frame covers it — governed by
// constants/layout.ts (PHYSICAL_BOX, RTL text via textStyle) and
// constants/typography.ts. The cover reuses the Home book card (node 2001:940)
// so the book reads as the same object.
export default function BookDetailScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const books = useBooksStore((s) => s.data);
  const booksStatus = useBooksStore((s) => s.status);
  const booksError = useBooksStore((s) => s.error);
  const lectures = useBookLecturesStore((s) => s.items);
  const lecturesStatus = useBookLecturesStore((s) => s.status);

  useEffect(() => {
    useBooksStore.getState().fetch();
    useBookLecturesStore.getState().fetch();
  }, []);

  const detail = useMemo(
    () => resolveBookDetail(id ?? '', books, lectures),
    [id, books, lectures],
  );

  // Same footprint as the BookCard it stands in for, centred like the cover.
  const coverWidth = responsiveCarouselCardWidth(windowWidth, 'book');
  const coverLayout = bookCardLayout(coverWidth);
  const coverPlaceholder = (
    <View
      style={[
        styles.coverSkeleton,
        { width: coverWidth, height: coverLayout.cardHeight, borderRadius: coverLayout.radius },
      ]}
      accessibilityLabel="جارٍ التحميل"
    />
  );

  let body: React.ReactNode;
  switch (bookDetailBody({ found: detail !== null, booksStatus })) {
    case 'loading':
      body = coverPlaceholder;
      break;
    case 'error':
      body = (
        <AsyncContent
          status="error"
          error={booksError}
          onRetry={() => { void useBooksStore.getState().refresh(); }}
        >
          {null}
        </AsyncContent>
      );
      break;
    case 'missing':
      body = <EmptyState message="الكتاب غير متوفر" />;
      break;
    case 'book': {
      if (!detail) break; // bookDetailBody returns 'book' only when found
      const book = detail;
      const lecture = book.lecture;
      const action = bookPrimaryAction({ hasLecture: lecture !== undefined, lecturesStatus });
      const sections: Record<BookDetailSection, React.ReactNode> = {
        cover: (
          <View style={styles.cover}>
            <BookCard id={book.id} name={book.title} />
          </View>
        ),
        meta: (
          <View style={styles.meta}>
            <Text style={styles.title}>{book.title}</Text>
            {book.author ? <Text style={styles.author}>{book.author}</Text> : null}
          </View>
        ),
        primaryAction:
          action === 'play' && lecture ? (
            <PillButton label="استمع إلى الشرح" onPress={() => { void startLecturePlayback(lecture); }} />
          ) : action === 'loading' ? (
            // Not "no audio" yet: the sharh list has not settled.
            <View style={styles.actionPlaceholder} />
          ) : (
            <Text style={styles.noAudio}>لا يتوفر شرح صوتي لهذا الكتاب بعد</Text>
          ),
      };
      body = BOOK_DETAIL_SECTIONS.map((k) => <React.Fragment key={k}>{sections[k]}</React.Fragment>);
      break;
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="الكتب العلمية" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  content: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 },
  cover: { alignItems: 'center', paddingVertical: 8 },
  coverSkeleton: { alignSelf: 'center', marginVertical: 8, backgroundColor: KhazainColors.skeleton },
  meta: { gap: 4 },
  title: textStyle('screenTitle', { color: KhazainColors.inkTitle, textAlign: 'center' }),
  author: textStyle('bodyCompact', { color: KhazainColors.ink500, textAlign: 'center' }),
  noAudio: textStyle('caption', { color: KhazainColors.ink500, textAlign: 'center' }),
  actionPlaceholder: { height: PRIMARY_ACTION_HEIGHT },
});
