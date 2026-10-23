import {
  AsyncContent,
  InlineHeader,
  LinkedNotesSection,
  SearchPill,
  SkeletonRibbonList,
  SkeletonRowList,
  SurahRow,
  surahNotesBlock,
} from '@/components/khazain';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { MushafChrome, SurahCartouche, useReduceMotion } from '@/components/khazain/mushaf';
import { SurahEndSuggestions } from '@/components/khazain/recommendations';
import { useScreenReaderOn } from '@/components/khazain/recommendations/useScreenReaderOn';
import { RECOMMENDATIONS_ENABLED } from '@/constants/recommendations';
import { releaseMiniPlayerOnBlur } from '@/services/mushafPlayerVisibility';
import { signalCountNow } from '@/services/recommendations/signalCount';
import { useRecommendationInputsStore } from '@/store/recommendationInputsStore';
import { CARD_DENSITY, PAGE_CHROME, PHYSICAL_ROW } from '@/constants/layout';
import { insetColumn, mushafSheetWidth, mushafType } from '@/constants/responsive';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { MUSHAF_FOOTER_ORDER, type MushafFooterSlot } from '@/constants/rtlContracts';
import {
  ayahCharOffset,
  ayahScrollY,
  findSurahIdForPage,
  normalizeAyahParam,
  normalizeSurahParam,
  segmentCharLength,
  segmentForAyah,
  surahMetaLine,
  type TextLine,
} from '@/services/mushafNavigation';
import { ReadingPlaceController, currentKeyEntry } from '@/services/mushafAnchor';
import { MushafPageTrackingController, groupAyatByPage } from '@/services/mushafPageTracking';
import { ChromeTapTracker, SHOW_CONTROLS_LABEL, chromeAfterTap } from '@/services/mushafChrome';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { surahName, surahStartPage } from '@/constants/progress';
import { useFontScale, useSurahsStore, useAyatStore, useLinkedNotes } from '@/store';
import { usePlayerStore } from '@/store/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { getRepos, progressRepo } from '@/db';
import * as Haptics from 'expo-haptics';
import { takeAyahNoteParams } from '@/services/noteActions';
import { openSearch } from '@/services/searchNavigation';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, type GestureResponderEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FigmaIcon, type FigmaIconName } from '@/components/khazain/icons/FigmaIcon';

// Once per app session: when the user opens the Mushaf index with no surah
// param AND has a saved last_read_page > 1, route them to the matching surah.
// Module-level flag — not a ref — so navigating back to the index does not
// retrigger the auto-jump within the same app session.
let _autoResumeFired = false;

// Frame 2349:829 is the page itself (the prototype's start); 2349:982 is the
// same page with the header, meta line and footer over a 24% black scrim.
// The frame ground is the shared `#F8F2ED`; the text column sits on an ivory
// sheet. The parchment and gold footer the app used to paint here were this
// screen's own invention and read as a different product.
const MUSHAF_BG = KhazainColors.pageBg;

/** Least space kept above a linked ayah when scrolling to it, so it is not flush with the header. */
const AYAH_SCROLL_HEADROOM = 80;
/** Clearance between the header overlay and a linked ayah. */
const AYAH_CHROME_CLEARANCE = 16;
/** Chrome heights before the first layout: 44 header + 6 + 22 meta + 8 pad; 68 button + 8 pad. */
const CHROME_TOP_ESTIMATE = 80;
const CHROME_BOTTOM_ESTIMATE = 76;

export default function MushafScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const setVisible = usePlayerStore((s) => s.setVisible);

  // Hide the MiniPlayer while the Mushaf is on screen. Focus-based, so a
  // scholar or book screen pushed over it in this stack gets its player back;
  // `releaseMiniPlayerOnBlur` keeps it hidden under root overlays (note editor,
  // notes viewer, sheets), which blur the whole tab group while the Mushaf
  // stays visible. Chain: this screen -> `sections` tab in Tabs -> `(tabs)` in
  // the root Stack; the root modals flip that last one's focus.
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      setVisible(false);
      return () => {
        const tabGroup = navigation.getParent()?.getParent();
        releaseMiniPlayerOnBlur({
          tabGroupFocused: tabGroup?.isFocused(),
          onTabGroupFocus: (cb) => tabGroup!.addListener('focus', cb),
          selfFocused: () => navigation.isFocused(),
          setVisible,
        });
      };
    }, [navigation, setVisible]),
  );

  // FR-009 — auto-resume to the surah that owns the saved last_read_page.
  // Only fires once per app session and only when no explicit surah was
  // requested via deep link.
  //
  // Until the lookup settles the screen shows a blank sheet rather than the
  // index, so a resuming reader never sees the list flash past on the way to
  // their surah. This is a waiting surface in the colour of the page about to
  // open, not a drawing of frame 2349:829: that frame is the reading page
  // itself, which cannot be drawn before the surah is known.
  const [resumeChecked, setResumeChecked] = useState(!!params.surah || _autoResumeFired);
  useEffect(() => {
    if (params.surah || _autoResumeFired) {
      setResumeChecked(true);
      return;
    }
    _autoResumeFired = true;
    let cancelled = false;
    // `progressRepo` is a Proxy that throws synchronously when the DB has not
    // hydrated yet, which a cold-start deep link straight to this route hits.
    // Await `getRepos()` first, exactly as the Library screen does.
    (async () => {
      await getRepos();
      const page = await progressRepo.getLastReadPage();
      if (cancelled) return;
      const surahId = page > 1 ? findSurahIdForPage(page) : null;
      if (surahId) {
        router.replace(`/sections/mushaf?surah=${surahId}` as any);
        return;
      }
      setResumeChecked(true);
    })().catch(() => {
      if (!cancelled) setResumeChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [params.surah, router]);

  // Reading view (page 22/23) when a surah is selected, otherwise list (page 21).
  // `key={params.surah}` forces a remount when the user picks a different surah
  // so the Zustand store hook resolved inside ReadingView stays stable for
  // each surah session (Rules of Hooks).
  const surahId = normalizeSurahParam(params.surah);
  if (surahId) {
    return (
      <ReadingView
        key={surahId}
        onBack={() => router.back()}
        surahId={surahId}
        rawAyah={params.ayah}
      />
    );
  }
  if (!resumeChecked) {
    // A stable sheet-coloured surface, not the index and not a spinner over
    // unrelated content.
    return <View style={[styles.screen, { backgroundColor: KhazainColors.mushafSheet }]} />;
  }
  return (
    <ListView
      onBack={() => router.back()}
      onPick={(id) => router.push(`/sections/mushaf?surah=${id}` as any)}
    />
  );
}

function ListView({ onBack, onPick }: { onBack: () => void; onPick: (id: string) => void }) {
  const { data: surahs, status: surahsStatus, error: surahsError, fetch: fetchSurahs, refresh: refreshSurahs } = useSurahsStore();

  useEffect(() => {
    fetchSurahs();
  }, [fetchSurahs]);

  // `{}` on phones; on tablets the reading column. Applied to the content
  // container, not a wrapper around the ScrollView, so the side insets still
  // scroll (design 2026-10-22 §3.3).
  const { columnStyle } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.listScreen} edges={['top', 'bottom']}>
      {/* Frame 2207:17898: tile 2207:17899 plus the single corner. */}
      <HeaderArt corners="single" bandHeight={headerBandHeight(insets.top, 'search', fontScale)} />
      <View style={columnStyle}>
        <InlineHeader title="قراءة القرآن" onBack={onBack} />
      </View>
      <View style={[styles.searchBlock, columnStyle]}>
        <SearchPill placeholder="بحث.." onPress={openSearch} />
      </View>
      <AsyncContent
        status={surahsStatus}
        error={surahsError}
        onRetry={refreshSurahs}
        skeleton={<SkeletonRibbonList count={9} />}
        emptyMessage="لا يوجد سور متاحة"
      >
        <ScrollView
          contentContainerStyle={[styles.surahList, { paddingBottom: 24 }, columnStyle]}
          showsVerticalScrollIndicator={false}
        >
          {surahs.map((s) => (
            <SurahRow
              key={s.id}
              surah={s}
              onPress={() => onPick(s.id)}
            />
          ))}
        </ScrollView>
      </AsyncContent>
    </SafeAreaView>
  );
}

function ReadingView({
  onBack,
  surahId,
  rawAyah,
}: {
  onBack: () => void;
  surahId: string;
  rawAyah?: string;
}) {
  const router = useRouter();
  // Per-surah Zustand store hook. The parent keys this component by surahId so
  // the hook reference is stable across re-renders of the same surah.
  const useAyat = useAyatStore(surahId);
  const { data: ayat, status: ayatStatus, error: ayatError, fetch: fetchAyat, refresh: refreshAyat } = useAyat();
  const { fontSize: ayatFontSize, lineHeight: ayatLineHeight } = useFontScale();
  // Tablets read from a centred sheet with type scaled to it; phones get the
  // user's font values back unchanged (mushafType / mushafSheetWidth).
  const { width, isTablet, sideInsets } = useResponsiveLayout();
  const sheetWidth = mushafSheetWidth(width);
  const type = mushafType(width, ayatFontSize, ayatLineHeight);
  const sheetColumn = isTablet ? insetColumn(width, sheetWidth, sideInsets) : undefined;

  // ---- Tap-to-show chrome (design 2026-10-23 D3) ---------------------------
  // Up on every visit, down only on a tap, back on the next. A screen reader
  // pins it up; Reduce Motion removes the fade. All rules live in
  // services/mushafChrome; this component forwards raw touches to it.
  const insets = useSafeAreaInsets();
  const screenReaderOn = useScreenReaderOn();
  const reduceMotion = useReduceMotion();
  const [chromeShown, setChromeShown] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setChromeShown(true);
    }, []),
  );
  const [tap] = useState(() => new ChromeTapTracker());
  const scrollingRef = useRef(false);
  // Measured heights include the safe areas; the estimate keeps the first
  // frame from jumping by the header's height.
  const [chromeTop, setChromeTop] = useState(insets.top + CHROME_TOP_ESTIMATE);
  const [chromeBottom, setChromeBottom] = useState(insets.bottom + CHROME_BOTTOM_ESTIMATE);
  const chromeTopRef = useRef(chromeTop);
  chromeTopRef.current = chromeTop;
  const [scrollViewH, setScrollViewH] = useState(0);

  // The meta line shows the surah's first page (frame 2349:982); reading is tracked per page below.
  const surahNumber = useMemo(() => Number(surahId), [surahId]);
  const currentPage = useMemo(() => surahStartPage(surahNumber), [surahNumber]);
  const displayName = useMemo(() => surahName(surahNumber), [surahNumber]);
  const segments = useMemo(() => groupAyatByPage(surahNumber, ayat), [surahNumber, ayat]);

  // Recommendations (design §6.4): refresh activity and load the catalogue.
  // `contextSurah` always opens the gate (N1); the load is idempotent once it
  // has settled, so a later surah change needs nothing more.
  useEffect(() => {
    if (!RECOMMENDATIONS_ENABLED) return;
    void useRecommendationInputsStore.getState().refreshActivity();
    void useRecommendationInputsStore
      .getState()
      .loadCatalogue({ signalCount: signalCountNow(), contextSurah: surahNumber });
  }, [surahNumber]);

  // Page-read tracking (design 2026-10-21 §4.3). Every gate lives in the
  // controller; this component only forwards events to it.
  const [tracking] = useState(
    () =>
      new MushafPageTrackingController({
        onRead: (page) => {
          useProgressStore.getState().notePageRead(page).catch((err) => {
            if (__DEV__) console.warn('[mushaf] page-read record failed', page, err);
          });
        },
      }),
  );

  // Tabs keep this screen mounted behind other tabs: count time only while focused.
  useFocusEffect(
    useCallback(() => {
      tracking.setFocused(true, Date.now());
      const tick = setInterval(() => tracking.tick(Date.now()), 1000);
      return () => {
        clearInterval(tick);
        tracking.setFocused(false, Date.now());
      };
    }, [tracking]),
  );

  useEffect(() => {
    tracking.setAppActive(AppState.currentState === 'active', Date.now());
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      tracking.setAppActive(s === 'active', Date.now());
    });
    return () => sub.remove();
  }, [tracking]);

  // AsyncContent unmounts the segments unless the status is 'success'.
  useEffect(() => {
    tracking.setContentReady(ayatStatus === 'success', Date.now());
  }, [tracking, ayatStatus]);

  useEffect(() => {
    tracking.retainPages(segments.map((s) => s.page));
  }, [tracking, segments]);

  // Pages are tracked over the band the chrome leaves clear, the same band the
  // reader had before the page went full-bleed (the ScrollView sat between the
  // header and the footer). The chrome is up at the start of every visit, so
  // counting text hidden under it would credit pages nobody could read; the
  // scroll offset is shifted by the header height to match (see onScroll).
  useEffect(() => {
    tracking.setViewportHeight(Math.max(0, scrollViewH - chromeTop - chromeBottom));
  }, [tracking, scrollViewH, chromeTop, chromeBottom]);

  useEffect(() => {
    fetchAyat();
  }, [fetchAyat]);

  // ---- `?ayah=` deep link: scroll to the ayah's line and highlight it --------
  // ReadingView is keyed by surah, so `?ayah=255` -> `?ayah=286` does NOT
  // remount: remember the last ayah scrolled to (not a boolean) so a changed
  // target scrolls again and a null target re-arms the same ayah.
  const targetAyah = normalizeAyahParam(rawAyah, ayat.length || undefined);
  const scrollRef = useRef<ScrollView>(null);
  const bodyYRef = useRef(0);
  // Entries carry the layout key they were measured under; see currentKeyEntry.
  const typeKey = `${sheetWidth}:${type.fontSize}`;
  const layoutsRef = useRef(new Map<number, { key: string; y: number; height: number }>());
  const linesRef = useRef(new Map<number, { key: string; lines: TextLine[] }>());
  const scrolledAyahRef = useRef<number | null>(null);
  const scrolledPreciseRef = useRef(false);
  const [place] = useState(() => new ReadingPlaceController(`${sheetWidth}:${type.fontSize}`, isTablet));
  const flushPlace = useCallback(() => {
    const y = place.takeScrollRequest();
    if (y != null) scrollRef.current?.scrollTo({ y, animated: false });
  }, [place]);

  const tryScroll = useCallback(() => {
    if (targetAyah == null) {
      scrolledAyahRef.current = null;
      scrolledPreciseRef.current = false;
      return;
    }
    const i = segmentForAyah(segments, targetAyah);
    if (i < 0) return;
    const segment = segments[i];
    const layout = currentKeyEntry(layoutsRef.current.get(segment.page), typeKey);
    if (!layout) return; // a later layout callback retries
    const lines = currentKeyEntry(linesRef.current.get(segment.page), typeKey)?.lines;
    const precise = !!lines && lines.length > 0;
    // Already there; only a first scroll made without line data may refine.
    if (targetAyah === scrolledAyahRef.current && (scrolledPreciseRef.current || !precise)) return;
    const y = ayahScrollY({
      bodyY: bodyYRef.current,
      segmentY: layout.y,
      segmentHeight: layout.height,
      lines,
      offset: ayahCharOffset(segment.ayat, targetAyah),
      expectedLength: segmentCharLength(segment.ayat),
    });
    // The header overlay covers the top `chromeTop`; keep the ayah just below it.
    const headroom = Math.max(AYAH_SCROLL_HEADROOM, chromeTopRef.current + AYAH_CHROME_CLEARANCE);
    const toY = Math.max(0, y - headroom);
    scrollRef.current?.scrollTo({ y: toY, animated: false });
    scrolledAyahRef.current = targetAyah;
    scrolledPreciseRef.current = precise;
    place.onProgrammaticScroll(toY, Date.now());
  }, [targetAyah, segments, place, typeKey]);

  useEffect(() => {
    tryScroll();
  }, [tryScroll]);

  // Rotation / Split View changes the sheet width or the scaled font, so the
  // text reflows and the old offset points at other text. Keep the place; the
  // rules live in `ReadingPlaceController` (tablets only, phones never scroll
  // on a reflow):
  //  - a linked ayah the user has not scrolled away from is re-armed and
  //    scrolled to again once the new onLayout / onTextLayout arrive;
  //  - otherwise the page + fraction captured while scrolling is restored from
  //    the anchor page's new layout.
  useEffect(() => {
    place.setTargetAyah(targetAyah);
  }, [place, targetAyah]);
  useEffect(() => {
    place.setSegments(
      segments.map((s) => s.page),
      ayatStatus === 'success',
      Date.now(),
    );
    flushPlace();
  }, [place, segments, ayatStatus, flushPlace]);
  useEffect(() => {
    const outcome = place.onKeyChange(typeKey, isTablet, Date.now());
    if (outcome === 'rearmAyah') {
      // Old-key measurements are ignored by tryScroll, so nothing is cleared
      // here (the reflow's layout may already have landed): tryScroll runs on
      // whatever current-key entries exist and otherwise waits for them.
      scrolledAyahRef.current = null;
      scrolledPreciseRef.current = false;
      tryScroll();
    }
    flushPlace();
  }, [place, typeKey, isTablet, tryScroll, flushPlace]);

  // A note's label inside this screen re-targets the scroll. The same ayah
  // is re-armed explicitly because the param would not change. A surah-level
  // note (no ayah) goes to the top and spends the deep-link target, WITHOUT
  // clearing scrolledAyahRef: clearing it would let the next segment layout
  // call tryScroll and pull the reader back to the old ?ayah.
  const jumpToAyah = useCallback(
    (n?: number) => {
      if (n == null) {
        place.onTargetLeft(Date.now());
        // Spent for good: a later onTextLayout must not refine back to the old ?ayah.
        scrolledPreciseRef.current = true;
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      if (n === targetAyah) {
        scrolledAyahRef.current = null;
        scrolledPreciseRef.current = false;
        place.onAyahJump();
        tryScroll();
      } else {
        router.setParams({ ayah: String(n) } as any);
      }
    },
    [router, targetAyah, tryScroll, place],
  );

  // Long-press an ayah (or the VoiceOver/TalkBack action, which has no ayah)
  // opens the note editor linked to it. Long-press on an ayah means NOTE; it
  // is never a save gesture (see CLAUDE.md "Long-press means").
  const takeAyahNote = useCallback(
    (n?: number) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
      router.push({ pathname: '/note-editor' as any, params: takeAyahNoteParams(surahId, n) });
    },
    [router, surahId],
  );

  // Revelation type comes from the surah catalogue. The old comment here said
  // the store "is already cached from the index, so this costs nothing" — true
  // only if the reader was reached by tapping through the index. It is not:
  // FR-009 auto-resume opens the reader straight from app start, and a deep
  // link does the same. On both, `surahs` was empty, `surahRecord` undefined,
  // and the meta line silently lost its مكية/مدنية token and fell back to the
  // page's ayah count. Fetching is a cache read when the index has already
  // run, so the cheap case stays cheap.
  const { data: surahs, fetch: fetchSurahs } = useSurahsStore();
  useEffect(() => {
    fetchSurahs();
  }, [fetchSurahs]);
  const surahRecord = surahs.find((s) => s.id === surahId);
  const metaLine = surahMetaLine({
    revelationType: surahRecord?.revelationType,
    ayahCount: ayat.length > 0 ? ayat.length : surahRecord?.ayahCount,
    page: currentPage,
  });
  const cartoucheAyahCount = ayat.length > 0 ? ayat.length : surahRecord?.ayahCount;

  const onPageTouchStart = (e: GestureResponderEvent) => {
    const t = e.nativeEvent;
    tap.start({
      x: t.pageX,
      y: t.pageY,
      ms: Date.now(),
      touches: t.touches?.length ?? 1,
      scrolling: scrollingRef.current,
    });
  };
  const onPageTouchMove = (e: GestureResponderEvent) => {
    const t = e.nativeEvent;
    tap.move({ x: t.pageX, y: t.pageY, touches: t.touches?.length ?? 1 });
  };
  const onPageTouchEnd = () => {
    if (tap.end({ ms: Date.now(), scrolling: scrollingRef.current })) {
      setChromeShown((shown) => chromeAfterTap(shown, screenReaderOn));
    }
  };

  return (
    <View style={styles.screen}>
      {/* 2349:829 carries the tile only. The sheet is opaque, so on a phone it
          covers the tile; it shows in the tablet margins around the sheet. */}
      <HeaderArt corners="none" />
      <View
        style={styles.pageArea}
        onTouchStart={onPageTouchStart}
        onTouchMove={onPageTouchMove}
        onTouchEnd={onPageTouchEnd}
        onTouchCancel={() => tap.cancel()}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.pageContent, sheetColumn]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={250}
          onLayout={(e) => setScrollViewH(e.nativeEvent.layout.height)}
          onScrollBeginDrag={() => {
            scrollingRef.current = true;
            place.onUserScrollBegin();
          }}
          onScrollEndDrag={() => {
            // Momentum, when there is any, starts straight after and re-arms this.
            scrollingRef.current = false;
          }}
          onMomentumScrollBegin={() => {
            scrollingRef.current = true;
            place.onUserScrollBegin();
          }}
          onMomentumScrollEnd={() => {
            scrollingRef.current = false;
          }}
          onScroll={(e) => {
            tracking.onScroll(e.nativeEvent.contentOffset.y + chromeTop, Date.now());
            place.onScroll(e.nativeEvent.contentOffset.y, Date.now(), typeKey);
            flushPlace();
          }}
        >
          {/* The sheet starts at the content origin, so the body's layout y is
              still a scroll offset. It pads for the chrome overlay at both ends. */}
          <View
            style={[
              styles.sheet,
              { paddingTop: chromeTop + 4, paddingBottom: chromeBottom + 16 },
            ]}
          >
            <SurahCartouche
              surahNumber={surahNumber}
              name={displayName}
              ayahCount={cartoucheAyahCount}
            />
            <View
              onLayout={(e) => {
                bodyYRef.current = e.nativeEvent.layout.y;
                place.setBodyY(e.nativeEvent.layout.y);
                tracking.setBodyY(e.nativeEvent.layout.y);
                tryScroll();
              }}
            >
              <AsyncContent
                status={ayatStatus}
                error={ayatError}
                onRetry={refreshAyat}
                skeleton={<SkeletonRowList count={5} />}
                emptyMessage="لا توجد آيات لهذه السورة"
              >
                {segments.map((segment) => (
                  <Text
                    key={segment.page}
                    onLayout={(e) => {
                      const { y, height } = e.nativeEvent.layout;
                      tracking.setSegmentLayout(segment.page, y, height);
                      layoutsRef.current.set(segment.page, { key: typeKey, y, height });
                      place.onSegmentLayout(segment.page, { y, height }, Date.now());
                      flushPlace();
                      tryScroll();
                    }}
                    onTextLayout={(e) => {
                      linesRef.current.set(segment.page, { key: typeKey, lines: e.nativeEvent.lines });
                      tryScroll();
                    }}
                    style={[
                      styles.ayatBody,
                      { fontSize: type.fontSize, lineHeight: type.lineHeight },
                    ]}
                    accessibilityActions={[
                      { name: 'showControls', label: SHOW_CONTROLS_LABEL },
                      { name: 'addSurahNote', label: 'إضافة ملاحظة على السورة' },
                    ]}
                    onAccessibilityAction={(e) => {
                      if (e.nativeEvent.actionName === 'showControls') setChromeShown(true);
                      if (e.nativeEvent.actionName === 'addSurahNote') takeAyahNote(undefined);
                    }}
                  >
                    {segment.ayat.map((a, i) => (
                      <React.Fragment key={a.number}>
                        <Text
                          onLongPress={() => {
                            tap.noteLongPress();
                            takeAyahNote(a.number);
                          }}
                          suppressHighlighting
                          style={a.number === targetAyah ? styles.ayahHighlight : undefined}
                        >
                          {a.text}
                        </Text>
                        <AyahNum n={String(a.number)} />
                        {i < segment.ayat.length - 1 ? ' ' : ''}
                      </React.Fragment>
                    ))}
                  </Text>
                ))}
              </AsyncContent>
            </View>
            {/* Outside the measured body wrapper above, so the page-segment offsets
                the reading tracker uses are unaffected. */}
            <SurahNotesFooter
              surahId={surahId}
              onOpenNote={(id) =>
                router.push({ pathname: '/note-editor' as any, params: { id } })
              }
              onJump={jumpToAyah}
            />
            {ayatStatus === 'success' ? <SurahEndSuggestions surahNumber={surahNumber} /> : null}
          </View>
        </ScrollView>
      </View>
      <MushafChrome
        visible={chromeShown}
        screenReaderOn={screenReaderOn}
        reduceMotion={reduceMotion}
        onScrimPress={() => setChromeShown(false)}
        onTopHeight={(h) => setChromeTop((prev) => (Math.abs(prev - h) < 0.5 ? prev : h))}
        onBottomHeight={(h) => setChromeBottom((prev) => (Math.abs(prev - h) < 0.5 ? prev : h))}
        top={
          // The sheet column, not the reading column: the title sits over the
          // page it names rather than over a different-width block.
          <View style={[styles.headerBlock, sheetColumn]}>
            <InlineHeader title={`سورة ${displayName}`} onBack={onBack} />
            <Text style={styles.subtitle}>{metaLine}</Text>
          </View>
        }
        // 2349:982 carries the corner only (2349:919), no tile. It is laid from
        // the top of the block, safe area included, as the frame places it.
        topArt={<HeaderArt corners="single" tile={false} />}
        bottom={
          // Physical left → right: الفهرس، الانتقال للعلامة، حفظ علامة
          // (MUSHAF_FOOTER_ORDER, Figma node 2349:982).
          <View style={[styles.footer, sheetColumn]}>
            {MUSHAF_FOOTER_ORDER.map((slot) => (
              <MushafBtn
                key={slot}
                label={FOOTER_BUTTONS[slot].label}
                icon={FOOTER_BUTTONS[slot].icon()}
              />
            ))}
          </View>
        }
      />
    </View>
  );
}

const FOOTER_BUTTONS: Record<MushafFooterSlot, { label: string; icon: () => React.ReactNode }> = {
  // Node 2349:982 draws `DIV-116` and two copies of `DIV-130` in its footer,
  // and the two bookmark buttons carry an identical mark — the distinction
  // between them is the label, not a filled-vs-outline glyph. The app had been
  // drawing a filled variant for one of them, which the file does not state.
  index: { label: 'الفهرس', icon: () => <FooterGlyph name="MushafIndex" /> },
  goToBookmark: { label: 'الانتقال للعلامة', icon: () => <FooterGlyph name="MushafBookmark" /> },
  saveBookmark: { label: 'حفظ علامة', icon: () => <FooterGlyph name="MushafBookmark" /> },
};

/**
 * End-of-surah block: a hint on how to add a note while there are none, then
 * "ملاحظاتك على هذه السورة" once there are.
 */
function SurahNotesFooter({
  surahId,
  onOpenNote,
  onJump,
}: {
  surahId: string;
  onOpenNote: (id: string) => void;
  onJump: (ayah?: number) => void;
}) {
  const block = surahNotesBlock(useLinkedNotes('ayah', surahId));
  if (block.kind === 'hint') {
    return <Text style={styles.noteHint}>اضغط مطولًا على آية لإضافة ملاحظة</Text>;
  }
  return (
    <LinkedNotesSection
      title="ملاحظاتك على هذه السورة"
      notes={block.notes}
      onOpenNote={onOpenNote}
      onOpenSource={(n) => onJump(n.ref?.position)}
    />
  );
}

function AyahNum({ n }: { n: string }) {
  return (
    <Text style={styles.ayahNum}>
      {'  '}
      {n}
      {'  '}
    </Text>
  );
}

function MushafBtn({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.footerBtn, { opacity: pressed ? 0.7 : 1 }]}
    >
      {icon}
      <Text style={styles.footerBtnLabel}>{label}</Text>
    </Pressable>
  );
}

/** `Icon-118` / `Icon-132` are 22.2 x 21.3 inside a 32pt footer button. */
function FooterGlyph({ name }: { name: FigmaIconName }) {
  return <FigmaIcon name={name} size={22} color={KhazainColors.navy800} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MUSHAF_BG },
  listScreen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: {
    paddingHorizontal: 16,
    paddingTop: PAGE_CHROME.searchPaddingTop,
    paddingBottom: PAGE_CHROME.searchPaddingBottom,
  },
  surahList: {
    paddingHorizontal: 16,
    paddingTop: PAGE_CHROME.listAfterSearch,
    // node 2207:17898 steps 66 over a 60 row.
    gap: CARD_DENSITY.lectureListGap,
  },
  headerBlock: {
    paddingBottom: 8,
  },
  // `DIV-47` — "صفحة ١ من ٦٠٤ • ٧ آيات • مكية", TheMixArab Regular 14 in
  // `#5F5345`, centred under the title rather than pinned to the right.
  subtitle: {
    ...textStyle('bodyCompact', { color: KhazainColors.ink500, textAlign: 'center' }),
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  // Full-bleed: the chrome floats over it, so nothing here moves when it fades.
  pageArea: { flex: 1 },
  pageContent: { flexGrow: 1 },
  sheet: {
    flexGrow: 1,
    paddingHorizontal: 16,
    backgroundColor: KhazainColors.mushafSheet,
  },
  ayatBody: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    lineHeight: 48,
    color: KhazainColors.mushafInk,
    fontWeight: '400',
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
  noteHint: {
    ...textStyle('caption', { color: KhazainColors.ink400, textAlign: 'center' }),
    paddingTop: 16,
  },
  ayahHighlight: { backgroundColor: KhazainColors.cream200 },
  ayahNum: {
    fontSize: 14,
    color: KhazainColors.gold600,
    fontFamily: 'Amiri-Bold',
  },
  // `btn` — three radius-8 buttons on the page ground, no rule above them.
  footer: {
    ...PHYSICAL_ROW,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  footerBtn: {
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  footerBtnLabel: textStyle('caption', {
    color: KhazainColors.ink500,
    textAlign: 'center',
  }),
});
