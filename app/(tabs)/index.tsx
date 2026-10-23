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
import { RecommendedSection } from '@/components/khazain/recommendations/RecommendedSection';
import {
  HOME_QUICK_CHIPS,
  type HomeQuickChip,
  HOME_SECTION_ORDER,
  type HomeSectionKey,
  homeSectionGap,
  homeTabletRows,
} from '@/constants/homePresentation';
import { PHYSICAL_BOX, PHYSICAL_ROW, READING_ROW, SCREEN_BOTTOM_BREATHING } from '@/constants/layout';
import { RECOMMENDATIONS_ENABLED } from '@/constants/recommendations';
import { carouselVisibleCount, dawahStageWidth } from '@/constants/responsive';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { KhazainColors } from '@/constants/theme';
import {
  useBookLecturesStore,
  useFeaturedDawahStore,
  useScholarsStore,
} from '@/store';
import { signalCountNow } from '@/services/recommendations/signalCount';
import { watchSignals } from '@/services/recommendations/watchSignals';
import { openSearch } from '@/services/searchNavigation';
import { useNotesStore } from '@/store/notesStore';
import { useRecommendationInputsStore } from '@/store/recommendationInputsStore';
import { useSavedStore } from '@/store/savedStore';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import { InteractionManager, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { QUICK_CHIP_BADGE_SIZE } from '@/components/khazain/home/QuickChip';
import { QUICK_CHIP_SEAL } from '@/components/khazain/home/quickChipSeal';

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

// Idempotent and single-flight in the store; the early return skips the signal
// count once the load has settled.
function tryLoadCatalogue(): void {
  const store = useRecommendationInputsStore.getState();
  if (store.catalogueStatus === 'ready' || store.catalogueStatus === 'aborted') return;
  void store.loadCatalogue({ signalCount: signalCountNow() });
}

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

  // Single effect — fetch all three on mount (C6: one useEffect, deps = fetch refs).
  // The recommendation catalogue loads after those first fetches (recommendations
  // design §7.4). Promise.allSettled is the real ordering guard: it waits for
  // them to finish, failed or not. runAfterInteractions only defers a tick on
  // RN 0.81 (see services/search/afterDismissal.ts).
  // True once the first-fetch gate has passed; later focus refreshes re-attempt the load.
  const catalogueGateOpen = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let handle: { cancel: () => void } | undefined;
    void Promise.allSettled([fetchScholars(), fetchBooks(), fetchDawah()]).then(() => {
      if (cancelled || !RECOMMENDATIONS_ENABLED) return;
      handle = InteractionManager.runAfterInteractions(() => {
        catalogueGateOpen.current = true;
        tryLoadCatalogue();
      });
    });
    return () => {
      cancelled = true;
      handle?.cancel();
    };
  }, [fetchScholars, fetchBooks, fetchDawah]);

  // A save, note or activity change while Home stays focused re-attempts the
  // load once the first-fetch gate is open (§7.4). The helper checks the gate;
  // tryLoadCatalogue returns early after ready/aborted.
  useEffect(() => {
    if (!RECOMMENDATIONS_ENABLED) return;
    return watchSignals(
      [
        (l) => useSavedStore.subscribe(l),
        (l) => useNotesStore.subscribe(l),
        (l) =>
          useRecommendationInputsStore.subscribe((state, prev) => {
            if (state.activity !== prev.activity) l();
          }),
      ],
      () => catalogueGateOpen.current,
      tryLoadCatalogue,
    );
  }, []);

  // Activity that happened elsewhere shows on the next focus (§7.4).
  useFocusEffect(
    useCallback(() => {
      if (RECOMMENDATIONS_ENABLED) {
        void useRecommendationInputsStore
          .getState()
          .refreshActivity()
          .then(() => {
            if (catalogueGateOpen.current) tryLoadCatalogue();
          })
          .catch((err) => {
            if (__DEV__) console.warn('[khazayin] recommendation focus refresh failed', err);
          });
      }
    }, []),
  );

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

    // Kill switch (§7.7): null nodes are skipped by both render loops below.
    recommended: RECOMMENDATIONS_ENABLED ? <RecommendedSection /> : null,

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
          ? homeTabletRows(HOME_SECTION_ORDER).map((row, index) =>
              typeof row === 'string' && sections[row] == null ? null : (
                <View
                  key={typeof row === 'string' ? row : row.join('+')}
                  style={
                    index === 0
                      ? undefined
                      : { marginTop: homeSectionGap(typeof row === 'string' ? row : row[0]) }
                  }
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
              ),
            )
          : HOME_SECTION_ORDER.map((key, index) =>
              sections[key] == null ? null : (
                <View
                  key={key}
                  style={index === 0 ? undefined : { marginTop: homeSectionGap(key) }}
                >
                  {sections[key]}
                </View>
              ),
            )}
      </ScrollView>
    </View>
  );
}

// Keyed by the chip id, not its Arabic label: renaming a label in
// HOME_QUICK_CHIPS must not silently drop the glyph.
//
// Each badge is one node in the file — navy disc, white glyph, hairline ring —
// so it is drawn whole (24.94 x 24) from the generated set rather than as a
// glyph centred in a CSS circle. `audio book` 2093:1768, `audio` 2093:1775 and
// 2093:1760.
const QUICK_CHIP_GLYPH: Record<HomeQuickChip['id'], React.ReactNode> = {
  audiobooks: <FigmaIcon name="HomeBadgeAudiobooks" />,
  radio: <FigmaIcon name="HomeAudio" />,
  exclusive: <ExclusiveChipBadge />,
};

/**
 * حصريات خزائن الرحمن: the disc and ring are vector, the white seal and the
 * navy word حصري laid over it are raster paints (see `quickChipSeal.ts`).
 */
function ExclusiveChipBadge() {
  const { seal, word } = QUICK_CHIP_SEAL;
  return (
    <View style={styles.exclusiveBadge}>
      <FigmaIcon name="HomeBadgeExclusive" />
      <Image
        source={require('@/assets/figma/seal-khazain.png')}
        style={{ position: 'absolute', ...seal }}
        contentFit="fill"
        cachePolicy="memory-disk"
      />
      <Image
        source={require('@/assets/figma/seal-word-hasri.png')}
        style={{ position: 'absolute', ...word }}
        contentFit="fill"
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  exclusiveBadge: { ...PHYSICAL_BOX, ...QUICK_CHIP_BADGE_SIZE },
  screen: {
    flex: 1,
    backgroundColor: KhazainColors.pageBg,
  },
  container: {
    paddingTop: 0,
  },
  heroPad: {
    paddingHorizontal: 16,
  },
  // Tablet only: two sections side by side, the first on the physical right.
  pairRow: {
    ...READING_ROW,
    gap: 12,
    alignItems: 'stretch',
    paddingHorizontal: 16,
  },
  pairCell: {
    flex: 1,
  },
  // quickChipsRow without the side padding the pair row already supplies.
  quickChipsCell: {
    ...PHYSICAL_ROW,
    gap: 12,
    paddingTop: 11,
    paddingBottom: 2,
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
    paddingBottom: 2,
  },
});
