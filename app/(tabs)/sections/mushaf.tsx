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
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
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
import { MushafPageTrackingController, groupAyatByPage } from '@/services/mushafPageTracking';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import {
  surahName,
  surahStartPage,
  toArabicDigits,
} from '@/constants/progress';
import { useFontScale, useSurahsStore, useAyatStore, useLinkedNotes } from '@/store';
import { usePlayerStore } from '@/store/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { getRepos, progressRepo } from '@/db';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { takeAyahNoteParams } from '@/services/noteActions';
import { openSearch } from '@/services/searchNavigation';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FigmaIcon, type FigmaIconName } from '@/components/khazain/icons/FigmaIcon';

// Once per app session: when the user opens the Mushaf index with no surah
// param AND has a saved last_read_page > 1, route them to the matching surah.
// Module-level flag — not a ref — so navigating back to the index does not
// retrigger the auto-jump within the same app session.
let _autoResumeFired = false;

// Node 2349:982 has no reading surface of its own — the frame carries only the
// header, the meta line and the footer, all on the same `#F8F2ED` the rest of
// the app uses. The parchment the app used to paint here, and the gold footer
// under it, were this screen's own invention and read as a different product.
const MUSHAF_BG = KhazainColors.pageBg;

export default function MushafScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const setVisible = usePlayerStore((s) => s.setVisible);

  // Hide MiniPlayer while mushaf is mounted. Restore on unmount.
  useEffect(() => {
    setVisible(false);
    return () => setVisible(true);
  }, [setVisible]);

  // FR-009 — auto-resume to the surah that owns the saved last_read_page.
  // Only fires once per app session and only when no explicit surah was
  // requested via deep link.
  //
  // Until the lookup settles the screen shows a plain Mushaf surface rather
  // than the index, so a resuming reader never sees the list flash past on the
  // way to their surah (node 2349:829).
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
    // Node 2349:829 — a stable page surface, not the index and not a spinner
    // over unrelated content.
    return <SafeAreaView style={[styles.screen, { backgroundColor: MUSHAF_BG }]} edges={['top', 'bottom']} />;
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

  return (
    <SafeAreaView style={styles.listScreen} edges={['top', 'bottom']}>
      <InlineHeader title="قراءة القرآن" onBack={onBack} />
      <View style={styles.searchBlock}>
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
          contentContainerStyle={[styles.surahList, { paddingBottom: 24 }]}
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

  // The meta line shows the surah's first page (frame 2349:982); reading is tracked per page below.
  const surahNumber = useMemo(() => Number(surahId), [surahId]);
  const currentPage = useMemo(() => surahStartPage(surahNumber), [surahNumber]);
  const displayName = useMemo(() => surahName(surahNumber), [surahNumber]);
  const segments = useMemo(() => groupAyatByPage(surahNumber, ayat), [surahNumber, ayat]);

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
  const layoutsRef = useRef(new Map<number, { y: number; height: number }>());
  const linesRef = useRef(new Map<number, TextLine[]>());
  const scrolledAyahRef = useRef<number | null>(null);
  const scrolledPreciseRef = useRef(false);

  const tryScroll = useCallback(() => {
    if (targetAyah == null) {
      scrolledAyahRef.current = null;
      scrolledPreciseRef.current = false;
      return;
    }
    const i = segmentForAyah(segments, targetAyah);
    if (i < 0) return;
    const segment = segments[i];
    const layout = layoutsRef.current.get(segment.page);
    if (!layout) return; // a later layout callback retries
    const lines = linesRef.current.get(segment.page);
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
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: false });
    scrolledAyahRef.current = targetAyah;
    scrolledPreciseRef.current = precise;
  }, [targetAyah, segments]);

  useEffect(() => {
    tryScroll();
  }, [tryScroll]);

  // A note's label inside this screen re-targets the scroll. The same ayah
  // is re-armed explicitly because the param would not change.
  const jumpToAyah = useCallback(
    (n?: number) => {
      scrolledAyahRef.current = null;
      scrolledPreciseRef.current = false;
      if (n == null) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      if (n === targetAyah) tryScroll();
      else router.setParams({ ayah: String(n) } as any);
    },
    [router, targetAyah, tryScroll],
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
  const ayahCountLabel = ayat.length > 0 ? `${toArabicDigits(ayat.length)} آية` : '';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={[styles.headerBg, { backgroundColor: MUSHAF_BG }]}>
        <InlineHeader title={`سورة ${displayName}`} onBack={onBack} />
        <Text style={styles.subtitle}>{metaLine}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={250}
        onLayout={(e) => tracking.setViewportHeight(e.nativeEvent.layout.height)}
        onScroll={(e) => tracking.onScroll(e.nativeEvent.contentOffset.y, Date.now())}
      >
        <View style={styles.ornamentWrap}>
          <LinearGradient
            colors={['#F3E0B6', '#EAD19A']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.ornamentInnerFrame} />
          <Text style={styles.basmala}>﷽</Text>
          <Text style={styles.surahMeta}>
            {ayahCountLabel
              ? `سورة ${displayName} · ${ayahCountLabel}`
              : `سورة ${displayName}`}
          </Text>
        </View>
        <View
          onLayout={(e) => {
            bodyYRef.current = e.nativeEvent.layout.y;
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
                  layoutsRef.current.set(segment.page, { y, height });
                  tryScroll();
                }}
                onTextLayout={(e) => {
                  linesRef.current.set(segment.page, e.nativeEvent.lines);
                  tryScroll();
                }}
                style={[
                  styles.ayatBody,
                  { fontSize: ayatFontSize, lineHeight: ayatLineHeight },
                ]}
                accessibilityActions={[{ name: 'addSurahNote', label: 'إضافة ملاحظة على السورة' }]}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === 'addSurahNote') takeAyahNote(undefined);
                }}
              >
                {segment.ayat.map((a, i) => (
                  <React.Fragment key={a.number}>
                    <Text
                      onLongPress={() => takeAyahNote(a.number)}
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
      </ScrollView>
      {/* Physical left → right: الفهرس، الانتقال للعلامة، حفظ علامة
          (MUSHAF_FOOTER_ORDER, Figma node 2349:982). */}
      <View style={styles.footer}>
        {MUSHAF_FOOTER_ORDER.map((slot) => (
          <MushafBtn
            key={slot}
            label={FOOTER_BUTTONS[slot].label}
            icon={FOOTER_BUTTONS[slot].icon()}
          />
        ))}
      </View>
    </SafeAreaView>
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
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  surahList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    // node 2207:17898 steps 66 over a 60 row.
    gap: CARD_DENSITY.lectureListGap,
  },
  headerBg: {
    paddingBottom: 8,
  },
  // `DIV-47` — "صفحة ١ من ٦٠٤ • ٧ آيات • مكية", TheMixArab Regular 14 in
  // `#5F5345`, centred under the title rather than pinned to the right.
  subtitle: {
    ...textStyle('bodyCompact', { color: KhazainColors.ink500, textAlign: 'center' }),
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  pageContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  ornamentWrap: {
    borderWidth: 2,
    borderColor: KhazainColors.gold500,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 14,
    overflow: 'hidden',
  },
  ornamentInnerFrame: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: KhazainColors.gold600,
    borderRadius: 6,
    opacity: 0.6,
  },
  basmala: {
    fontFamily: 'Amiri-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: KhazainColors.navy900,
    writingDirection: 'rtl',
  },
  surahMeta: {
    fontFamily: 'Amiri',
    fontSize: 12,
    color: KhazainColors.gold600,
    marginTop: 3,
    writingDirection: 'rtl',
  },
  ayatBody: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    lineHeight: 48,
    color: KhazainColors.ink900,
    fontWeight: '700',
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
    backgroundColor: MUSHAF_BG,
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
