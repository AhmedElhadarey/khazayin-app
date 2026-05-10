import {
  AsyncContent,
  BookCard,
  DawahCarousel,
  HeroProphet,
  HeroQuran,
  HomeHeader,
  HomeSectionHeader,
  QueenCard,
  QuickChip,
  ScholarCard,
  SkeletonCardList,
  SkeletonPosterList,
} from '@/components/khazain';
import {
  SCHOLAR_SVG_1,
  SCHOLAR_SVG_2,
  SCHOLAR_SVG_3,
} from '@/components/khazain/home/scholarSvgs';
import { RtlCarousel } from '@/components/khazain/primitives';
import { SCREEN_BOTTOM_BREATHING } from '@/constants/layout';
import { KhazainColors, KhazainSpacing } from '@/constants/theme';
import {
  useBookLecturesStore,
  useFeaturedDawahStore,
  useScholarsStore,
} from '@/store';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

// Bundled calligraphic SVGs keyed by scholar id.
// The SVGs bake in the name glyph + gold stripe; ids must match data/content/scholars.ts.
const SVG_BY_ID: Record<string, string> = {
  's4': SCHOLAR_SVG_1, // عبد العزيز بن عبد الله بن باز
  's5': SCHOLAR_SVG_2, // محمد بن صالح العثيمين
  's1': SCHOLAR_SVG_3, // عبد المحسن العباد البدر
};

export default function HomeScreen() {
  const router = useRouter();

  const goToSections = () => router.push('/sections');

  // ── Async stores ────────────────────────────────────────────────────────────
  const { data: scholarsData, status: scholarsStatus, error: scholarsError, fetch: fetchScholars, refresh: refreshScholars } = useScholarsStore();
  const { items: bookLectures, status: booksStatus, error: booksError, fetch: fetchBooks, refresh: refreshBooks } = useBookLecturesStore();
  const { data: dawahData, status: dawahStatus, error: dawahError, fetch: fetchDawah, refresh: refreshDawah } = useFeaturedDawahStore();

  // Single effect — fetch all three on mount (C6: one useEffect, deps = fetch refs)
  useEffect(() => {
    fetchScholars();
    fetchBooks();
    fetchDawah();
  }, [fetchScholars, fetchBooks, fetchDawah]);

  // Derive featured scholars — only those with a bundled SVG
  const featuredScholars = scholarsData.filter((s) => !!SVG_BY_ID[s.id]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" backgroundColor={KhazainColors.pageBg} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: SCREEN_BOTTOM_BREATHING }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader onSearchOpen={() => router.push('/search' as any)} />

        {/* Hero 1 — القرآن حياة */}
        <View style={styles.heroPad}>
          <HeroQuran onMore={goToSections} />
        </View>

        {/* Hero 2 — محمد رسول الله ﷺ */}
        <View style={[styles.heroPad, { marginTop: 24 }]}>
          <HeroProphet onMore={goToSections} />
        </View>

        {/* Scholars */}
        <View style={{ marginTop: 24 }}>
          <HomeSectionHeader title="العلماء والمشايخ" onViewAll={goToSections} />
          <AsyncContent
            status={scholarsStatus}
            error={scholarsError}
            onRetry={refreshScholars}
            skeleton={<SkeletonCardList count={3} />}
            emptyMessage="لا يوجد علماء"
          >
            <RtlCarousel contentContainerStyle={styles.scrollerPad}>
              {featuredScholars.map((s) => (
                <View key={s.id} style={styles.scrollerItem}>
                  <ScholarCard svg={SVG_BY_ID[s.id]} name={s.name} />
                </View>
              ))}
            </RtlCarousel>
          </AsyncContent>
        </View>

        {/* Books */}
        <View style={{ marginTop: 24 }}>
          <HomeSectionHeader title="الكتب العلمية" onViewAll={goToSections} />
          <AsyncContent
            status={booksStatus}
            error={booksError}
            onRetry={refreshBooks}
            skeleton={<SkeletonCardList count={3} />}
            emptyMessage="لا توجد كتب"
          >
            <RtlCarousel contentContainerStyle={styles.scrollerPad}>
              {bookLectures.slice(0, 3).map((b) => (
                <View key={b.id} style={styles.scrollerItem}>
                  <BookCard name={b.title} />
                </View>
              ))}
            </RtlCarousel>
          </AsyncContent>
        </View>

        {/* أنتِ ملكة */}
        <View style={[styles.heroPad, { marginTop: 24 }]}>
          <QueenCard onMore={goToSections} />
        </View>

        {/* Quick chips — JSX order is hardcoded to the visual RTL order
            (left → right on screen): كتب صوتية → برامج إذاعية → حصريات خزائن الرحمن.
            Hardcoding wins over flexDirection auto-flip per CLAUDE.md (G17). */}
        <View style={{ marginTop: KhazainSpacing.x6 }}>
          <View style={styles.quickChipsRow}>
            <QuickChip label="كتب صوتية">
              <HeadphonesGlyph />
            </QuickChip>
            <QuickChip label="برامج إذاعية">
              <MicGlyph />
            </QuickChip>
            <QuickChip label="حصريات خزائن الرحمن">
              <StarGlyph />
            </QuickChip>
          </View>
        </View>

        {/* Dawah posters — Twitch-style focused carousel */}
        <View style={{ marginTop: 24 }}>
          <HomeSectionHeader title="تصميمات دعوية" onViewAll={goToSections} />
          <AsyncContent
            status={dawahStatus}
            error={dawahError}
            onRetry={refreshDawah}
            skeleton={<SkeletonPosterList count={3} />}
            emptyMessage="لا يوجد ملصقات دعوية"
          >
            <DawahCarousel
              items={dawahData}
              onItemPress={(p) =>
                router.push({
                  pathname: '/share-sheet' as any,
                  params: { tone: p.tone, title: p.title, body: p.body },
                })
              }
            />
          </AsyncContent>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Quick-chip badge glyphs (small inline SVGs, ported verbatim from home.jsx) ────

function StarGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 1.5l1.85 3.75 4.15.6-3 2.9.7 4.1L8 10.9 4.3 12.85 5 8.75 2 5.85l4.15-.6L8 1.5z"
        fill="#D7B995"
      />
    </Svg>
  );
}

function MicGlyph() {
  return (
    <Svg width={10} height={14} viewBox="0 0 10 14" fill="none">
      <Rect x={3} y={0.5} width={4} height={8} rx={2} fill="#fff" />
      <Path
        d="M1 7a4 4 0 0 0 8 0M5 11v2"
        stroke="#fff"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function HeadphonesGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M1 8V7a6 6 0 0 1 12 0v1M1 8v2a1.5 1.5 0 0 0 1.5 1.5H3V8H1zm12 0v2a1.5 1.5 0 0 1-1.5 1.5H11V8h2z"
        stroke="#fff"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KhazainColors.pageBg,
  },
  container: {
    paddingTop: 0,
  },
  heroPad: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  scrollerPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    flexDirection: 'row',
  },
  scrollerItem: {
    // Margin-based gap not yet supported on old RN; add manual spacing with paddingRight on all but last.
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    // Owns the breathing room for QuickChip's floating badge (top:-11)
    // and bottom navy stripe (bottom:-2) so siblings can't clip them (G8).
    paddingTop: 11,
    paddingBottom: 4,
  },
});
