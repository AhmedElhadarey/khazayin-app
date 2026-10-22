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
import { RtlCarousel } from '@/components/khazain/primitives';
import {
  HOME_HERO_TOP_GAP,
  HOME_QUICK_CHIPS,
  type HomeQuickChip,
  HOME_SECTION_GAP,
  HOME_SECTION_ORDER,
  type HomeSectionKey,
  homeTabletRows,
} from '@/constants/homePresentation';
import { PHYSICAL_ROW, READING_ROW, SCREEN_BOTTOM_BREATHING } from '@/constants/layout';
import { carouselVisibleCount, dawahStageWidth } from '@/constants/responsive';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { KhazainColors } from '@/constants/theme';
import {
  useBookLecturesStore,
  useFeaturedDawahStore,
  useScholarsStore,
} from '@/store';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

// The scholar's name as calligraphy, keyed by scholar id; ids must match
// data/content/scholars.ts, and only scholars with art are featured here.
//
// The .fig carries exactly one lockup — عبد العزيز بن عبد الله بن باز — and
// draws all three cards with it. So does the app: the other two cards read
// that name until the client supplies calligraphy for محمد بن صالح العثيمين
// and عبد المحسن العباد البدر. Setting them in a typeface was tried and did
// not read as the same art (see the QA record).
const IBN_BAZ = require('@/assets/khazain/home/scholar-name-ibn-baz.webp');

const NAME_ART_BY_ID: Record<string, number> = {
  's4': IBN_BAZ, // عبد العزيز بن عبد الله بن باز
  's5': IBN_BAZ, // awaiting art: محمد بن صالح العثيمين
  's1': IBN_BAZ, // awaiting art: عبد المحسن العباد البدر
};

// The design's own book lockup. Figma draws every card in the "الكتب العلمية"
// row with this one image — `إضاءات على زاد المعاد` — so the app does too, and
// every card reads that title until the client supplies per-title art.
const BOOK_TITLE_ART = require('@/assets/khazain/home/book-title.webp');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, isTablet, homeColumnStyle } = useResponsiveLayout();

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

  // Derive featured scholars — only those whose name art is bundled
  const featuredScholars = scholarsData.filter((s) => !!NAME_ART_BY_ID[s.id]);

  const queen = <QueenCard onMore={goToSections} />;
  // Physical left → right, authored in HOME_QUICK_CHIPS.
  const quickChips = HOME_QUICK_CHIPS.map((chip) => (
    <QuickChip key={chip.id} label={chip.label} onPress={() => router.push(chip.route as any)}>
      {QUICK_CHIP_GLYPH[chip.id]}
    </QuickChip>
  ));

  // Rendered from HOME_SECTION_ORDER so the running order lives in one place
  // and is asserted by __tests__/homePresentation.test.ts.
  const sections: Record<HomeSectionKey, React.ReactNode> = {
    header: <HomeHeader onSearchOpen={openSearch} />,

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
            {featuredScholars
              .slice(0, carouselVisibleCount(width, 'scholar', featuredScholars.length))
              .map((s) => (
              <ScholarCard key={s.id} id={s.id} nameArt={NAME_ART_BY_ID[s.id]} name={s.name} />
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
            {bookLectures.slice(0, carouselVisibleCount(width, 'book', bookLectures.length)).map((b) => (
              <BookCard key={b.id} id={b.id} name={b.title} titleArt={BOOK_TITLE_ART} />
            ))}
          </RtlCarousel>
        </AsyncContent>
      </View>
    ),

    queen: (
      <View style={styles.heroPad}>{queen}</View>
    ),

    quickChips: <View style={styles.quickChipsRow}>{quickChips}</View>,

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
            stageWidth={dawahStageWidth(width)}
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

  // The same content as the phone sections, minus the horizontal padding the
  // shared row already carries.
  const pairCells: Partial<Record<HomeSectionKey, React.ReactNode>> = {
    // In the pair the cards grow to the taller one's height.
    quranHero: <HeroQuran onMore={goToSections} fill />,
    prophetHero: <HeroProphet onMore={goToSections} fill />,
    queen,
    quickChips: <View style={styles.quickChipsCell}>{quickChips}</View>,
  };

  return (
    // The inset hook, not the native SafeAreaView: a cold start slides this screen up
    // from below the screen, and the native view reads its insets from where it
    // sits, so it would jump as it landed (launch design R6).
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor={KhazainColors.pageBg} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: SCREEN_BOTTOM_BREATHING },
          homeColumnStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isTablet
          ? homeTabletRows(HOME_SECTION_ORDER).map((row, index) => (
              <View
                key={typeof row === 'string' ? row : row.join('+')}
                style={index === 0 ? undefined : styles.sectionGap}
              >
                {typeof row === 'string' ? (
                  sections[row]
                ) : (
                  // First section authored first → physical right.
                  <View style={styles.pairRow}>
                    {row.map((key) => (
                      <View key={key} style={styles.pairCell}>
                        {pairCells[key]}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          : HOME_SECTION_ORDER.map((key, index) => (
              <View key={key} style={index === 0 ? undefined : styles.sectionGap}>
                {sections[key]}
              </View>
            ))}
      </ScrollView>
    </View>
  );
}

// Keyed by the chip id, not its Arabic label: renaming a label in
// HOME_QUICK_CHIPS must not silently drop the glyph.
const QUICK_CHIP_GLYPH: Record<HomeQuickChip['id'], React.ReactNode> = {
  audiobooks: <HeadphonesGlyph />,
  radio: <MicGlyph />,
  exclusive: <StarGlyph />,
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
  // Tablet only: two sections side by side, the first on the physical right.
  pairRow: {
    ...READING_ROW,
    gap: 12,
    alignItems: 'stretch',
    paddingHorizontal: 16,
    marginTop: HOME_HERO_TOP_GAP,
  },
  pairCell: {
    flex: 1,
  },
  // quickChipsRow without the side padding the pair row already supplies.
  quickChipsCell: {
    ...PHYSICAL_ROW,
    gap: 12,
    paddingTop: 11,
    paddingBottom: 4,
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
