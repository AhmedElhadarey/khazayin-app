import { BookCard, EmptyState, InlineHeader, PillButton, SkeletonCardList } from '@/components/khazain';
import { BOOK_DETAIL_SECTIONS, type BookDetailSection } from '@/constants/bookDetailPresentation';
import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { resolveBookDetail } from '@/services/bookDetail';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { isCorpusLoading } from '@/services/search/searchBodyState';
import { useBookLecturesStore, useBooksStore } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Book detail, reached from search. No Figma frame covers it — governed by
// constants/layout.ts (PHYSICAL_BOX, RTL text via textStyle) and
// constants/typography.ts. The cover reuses the Home book card (node 2001:940)
// so the book reads as the same object.
export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const books = useBooksStore((s) => s.data);
  const booksStatus = useBooksStore((s) => s.status);
  const lectures = useBookLecturesStore((s) => s.items);
  const lecturesStatus = useBookLecturesStore((s) => s.status);

  useEffect(() => {
    useBooksStore.getState().fetch();
    useBookLecturesStore.getState().fetch();
  }, []);

  const detail = resolveBookDetail(id ?? '', books, lectures);
  const loading = isCorpusLoading([booksStatus, lecturesStatus]);

  let body: React.ReactNode;
  if (!detail) {
    body = loading ? <SkeletonCardList count={1} /> : <EmptyState message="الكتاب غير متوفر" />;
  } else {
    const lecture = detail.lecture;
    const sections: Record<BookDetailSection, React.ReactNode> = {
      cover: (
        <View style={styles.cover}>
          <BookCard id={detail.id} name={detail.title} />
        </View>
      ),
      meta: (
        <View style={styles.meta}>
          <Text style={styles.title}>{detail.title}</Text>
          {detail.author ? <Text style={styles.author}>{detail.author}</Text> : null}
        </View>
      ),
      primaryAction: lecture ? (
        <PillButton label="استمع إلى الشرح" onPress={() => { void startLecturePlayback(lecture); }} />
      ) : (
        <Text style={styles.noAudio}>لا يتوفر شرح صوتي لهذا الكتاب بعد</Text>
      ),
    };
    body = BOOK_DETAIL_SECTIONS.map((k) => <React.Fragment key={k}>{sections[k]}</React.Fragment>);
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
  meta: { gap: 4 },
  title: textStyle('screenTitle', { color: KhazainColors.inkTitle, textAlign: 'center' }),
  author: textStyle('bodyCompact', { color: KhazainColors.ink500, textAlign: 'center' }),
  noAudio: textStyle('caption', { color: KhazainColors.ink500, textAlign: 'center' }),
});
