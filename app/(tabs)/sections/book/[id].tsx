import {
  BookCard,
  EmptyState,
  ErrorState,
  InlineHeader,
  LinkedNotesSection,
  PILL_BUTTON_HEIGHTS,
  PillButton,
} from '@/components/khazain';
import { bookCardLayout } from '@/components/khazain/home/bookCardLayout';
import { BOOK_DETAIL_SECTIONS, type BookDetailSection } from '@/constants/bookDetailPresentation';
import { PHYSICAL_BOX, responsiveCarouselCardWidth } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { bookDetailBody, bookPrimaryAction, resolveBookDetail } from '@/services/bookDetail';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { bookNoteParams } from '@/services/noteActions';
import { useBookLecturesStore, useBooksStore } from '@/store';
import { useLinkedNotes } from '@/store/notesStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

// Book detail, reached from search. No Figma frame covers it — governed by
// constants/layout.ts (PHYSICAL_BOX, RTL text via textStyle) and
// constants/typography.ts. The cover reuses the Home book card (node 2001:940)
// so the book reads as the same object.
export default function BookDetailScreen() {
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const books = useBooksStore((s) => s.data);
  const booksStatus = useBooksStore((s) => s.status);
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

  // Notes taken on this book. Keyed by Book.id (bk*); a note taken while its
  // sharh (b*) plays is a lecture note. A hook, so it stays above every branch.
  const bookNotes = useLinkedNotes('book', id ?? '');

  // Same footprint as the BookCard it stands in for, centred like the cover.
  const coverWidth = responsiveCarouselCardWidth(windowWidth, 'book');
  const coverLayout = bookCardLayout(coverWidth);
  const coverPlaceholder = (
    <View
      style={[
        styles.coverSkeleton,
        { width: coverWidth, height: coverLayout.cardHeight, borderRadius: coverLayout.radius },
      ]}
      accessible
      accessibilityRole="progressbar"
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
        // Default Arabic copy: a store error's message is not user-facing text.
        <ErrorState onRetry={() => { void useBooksStore.getState().refresh(); }} />
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
          ) : action === 'error' ? (
            // Not "no audio" either: the sharh list failed to load.
            <ErrorState
              message="تعذّر تحميل الشرح الصوتي."
              onRetry={() => { void useBookLecturesStore.getState().refresh(); }}
            />
          ) : (
            <Text style={styles.noAudio}>لا يتوفر شرح صوتي لهذا الكتاب بعد</Text>
          ),
        notes: (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>ملاحظاتي</Text>
            <PillButton
              variant="cream"
              label="إضافة ملاحظة"
              onPress={() =>
                router.push({ pathname: '/note-editor' as any, params: bookNoteParams(book) })
              }
            />
            <LinkedNotesSection
              flush
              notes={bookNotes}
              onOpenNote={(noteId) =>
                router.push({ pathname: '/note-editor' as any, params: { id: noteId } })
              }
            />
          </View>
        ),
      };
      body = BOOK_DETAIL_SECTIONS.map((k) => <React.Fragment key={k}>{sections[k]}</React.Fragment>);
      break;
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="الكتب العلمية" onBack={() => router.back()} style={columnStyle} />
      <ScrollView contentContainerStyle={[styles.content, columnStyle]} showsVerticalScrollIndicator={false}>
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
  notes: { gap: 8 },
  notesTitle: textStyle('sectionTitle', { color: KhazainColors.ink900 }),
  actionPlaceholder: { height: PILL_BUTTON_HEIGHTS.lg },
});
