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
import {
  HOME_HERO_TOP_GAP,
  HOME_QUICK_CHIPS,
  HOME_SECTION_GAP,
  HOME_SECTION_ORDER,
  type HomeSectionKey,
} from '@/constants/homePresentation';
import { PHYSICAL_ROW, SCREEN_BOTTOM_BREATHING } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
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

  // Rendered from HOME_SECTION_ORDER so the running order lives in one place
  // and is asserted by __tests__/homePresentation.test.ts.
  const sections: Record<HomeSectionKey, React.ReactNode> = {
    header: <HomeHeader onSearchOpen={() => router.push('/search' as any)} />,

    quranHero: (
      <View style={styles.heroPad}>
        <HeroQuran onMore={goToSections} />
      </View>
    ),

    prophetHero: (
      <View style={styles.heroPad}>
        <HeroProphet onMore={goToSections} />
      </View>
    ),

    scholars: (
      <View>
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
              <ScholarCard key={s.id} id={s.id} svg={SVG_BY_ID[s.id]} name={s.name} />
            ))}
          </RtlCarousel>
        </AsyncContent>
      </View>
    ),

    books: (
      <View>
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
              <BookCard key={b.id} id={b.id} name={b.title} />
            ))}
          </RtlCarousel>
        </AsyncContent>
      </View>
    ),

    queen: (
      <View style={styles.heroPad}>
        <QueenCard onMore={goToSections} />
      </View>
    ),

    // Physical left → right, authored in HOME_QUICK_CHIPS.
    quickChips: (
      <View style={styles.quickChipsRow}>
        {HOME_QUICK_CHIPS.map((chip) => (
          <QuickChip
            key={chip.label}
            label={chip.label}
            onPress={chip.route ? () => router.push(chip.route as any) : undefined}
          >
            {QUICK_CHIP_GLYPHS[chip.label]}
          </QuickChip>
        ))}
      </View>
    ),

    dawah: (
      <View>
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
    ),
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" backgroundColor={KhazainColors.pageBg} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: SCREEN_BOTTOM_BREATHING }]}
        showsVerticalScrollIndicator={false}
      >
        {HOME_SECTION_ORDER.map((key, index) => (
          <View key={key} style={index === 0 ? undefined : styles.sectionGap}>
            {sections[key]}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const QUICK_CHIP_GLYPHS: Record<string, React.ReactNode> = {
  'كتب صوتية': <HeadphonesGlyph />,
  'برامج إذاعية': <MicGlyph />,
  'حصريات خزائن الرحمن': <StarGlyph />,
};

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
  sectionGap: {
    marginTop: HOME_SECTION_GAP,
  },
  heroPad: {
    paddingHorizontal: 16,
    marginTop: HOME_HERO_TOP_GAP,
  },
  scrollerPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  quickChipsRow: {
    ...PHYSICAL_ROW,
    gap: 12,
    paddingHorizontal: 16,
    // Owns the breathing room for QuickChip's floating badge (top:-11)
    // and bottom navy stripe (bottom:-2) so siblings can't clip them (G8).
    paddingTop: 11,
    paddingBottom: 4,
  },
});
