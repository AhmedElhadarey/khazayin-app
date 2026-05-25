import {
  AsyncContent,
  InlineHeader,
  SearchPill,
  SkeletonRibbonList,
  SkeletonRowList,
  SurahRow,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import {
  SURAH_START_PAGES,
  surahName,
  surahStartPage,
  toArabicDigits,
} from '@/constants/progress';
import { useFontScale, useSurahsStore, useAyatStore } from '@/store';
import { usePlayerStore } from '@/store/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { progressRepo } from '@/db';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Once per app session: when the user opens the Mushaf index with no surah
// param AND has a saved last_read_page > 1, route them to the matching surah.
// Module-level flag — not a ref — so navigating back to the index does not
// retrigger the auto-jump within the same app session.
let _autoResumeFired = false;

const MUSHAF_BG = '#FBF3DF';
const FOOTER_BG = '#F3E4BE';

export default function MushafScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string }>();
  const setVisible = usePlayerStore((s) => s.setVisible);

  // Hide MiniPlayer while mushaf is mounted. Restore on unmount.
  useEffect(() => {
    setVisible(false);
    return () => setVisible(true);
  }, [setVisible]);

  // FR-009 — auto-resume to the surah that owns the saved last_read_page.
  // Only fires once per app session and only when no explicit surah was
  // requested via deep link.
  useEffect(() => {
    if (params.surah || _autoResumeFired) return;
    _autoResumeFired = true;
    progressRepo
      .getLastReadPage()
      .then((page) => {
        if (page <= 1) return;
        const surahId = findSurahIdForPage(page);
        if (surahId) {
          router.replace(`/sections/mushaf?surah=${surahId}` as any);
        }
      })
      .catch(() => undefined);
  }, [params.surah, router]);

  // Reading view (page 22/23) when a surah is selected, otherwise list (page 21).
  // `key={params.surah}` forces a remount when the user picks a different surah
  // so the Zustand store hook resolved inside ReadingView stays stable for
  // each surah session (Rules of Hooks).
  if (params.surah) {
    return <ReadingView key={params.surah} onBack={() => router.back()} surahParam={params.surah} />;
  }
  return (
    <ListView
      onBack={() => router.back()}
      onPick={(id) => router.push(`/sections/mushaf?surah=${id}` as any)}
    />
  );
}

/**
 * Reverse-lookup: which surah-id ('001'..'114') owns a given mushaf page.
 * Linear scan — 114 entries, runs once per cold-start resume.
 */
function findSurahIdForPage(page: number): string | null {
  for (let n = 114; n >= 1; n -= 1) {
    if (SURAH_START_PAGES[n] <= page) {
      return String(n).padStart(3, '0');
    }
  }
  return null;
}

function ListView({ onBack, onPick }: { onBack: () => void; onPick: (id: string) => void }) {
  const router = useRouter();
  const { data: surahs, status: surahsStatus, error: surahsError, fetch: fetchSurahs, refresh: refreshSurahs } = useSurahsStore();

  useEffect(() => {
    fetchSurahs();
  }, [fetchSurahs]);

  return (
    <SafeAreaView style={styles.listScreen} edges={['top']}>
      <InlineHeader title="قراءة القرآن" onBack={onBack} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
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

function ReadingView({ onBack, surahParam }: { onBack: () => void; surahParam: string }) {
  // Per-surah Zustand store hook. Parent keys this component by surahParam
  // so the hook reference is stable across re-renders of the same surah.
  const surahId = useMemo(() => surahParam.padStart(3, '0'), [surahParam]);
  const useAyat = useAyatStore(surahId);
  const { data: ayat, status: ayatStatus, error: ayatError, fetch: fetchAyat, refresh: refreshAyat } = useAyat();
  const notePageRead = useProgressStore((s) => s.notePageRead);
  const { fontSize: ayatFontSize, lineHeight: ayatLineHeight } = useFontScale();

  // Each surah opening counts as a page read for the surah's first page
  // (FR-001 — see CLAUDE.md note: a real page-swipe Mushaf will refine this later).
  const surahNumber = useMemo(() => {
    const n = Number(surahParam);
    return Number.isInteger(n) && n >= 1 && n <= 114 ? n : 2;
  }, [surahParam]);
  const currentPage = useMemo(() => surahStartPage(surahNumber), [surahNumber]);
  const displayName = useMemo(() => surahName(surahNumber), [surahNumber]);

  useEffect(() => {
    fetchAyat();
  }, [fetchAyat]);

  // Debounced page-read recording (research R5 — 400 ms window).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      notePageRead(currentPage).catch(() => undefined);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentPage, notePageRead]);

  const ayahCountLabel = ayat.length > 0
    ? `${toArabicDigits(ayat.length)} آية`
    : '';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: MUSHAF_BG }]}>
        <InlineHeader title={`سورة ${displayName}`} onBack={onBack} />
        <Text style={styles.subtitle}>
          {ayahCountLabel
            ? `${ayahCountLabel}  ·  صفحة ${toArabicDigits(currentPage)} من ٦٠٤`
            : `صفحة ${toArabicDigits(currentPage)} من ٦٠٤`}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
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
        <AsyncContent
          status={ayatStatus}
          error={ayatError}
          onRetry={refreshAyat}
          skeleton={<SkeletonRowList count={5} />}
          emptyMessage="لا توجد آيات لهذه السورة"
        >
          <Text
            style={[
              styles.ayatBody,
              { fontSize: ayatFontSize, lineHeight: ayatLineHeight },
            ]}
          >
            {ayat.map((a, i) => (
              <React.Fragment key={a.number}>
                {a.text}
                <AyahNum n={String(a.number)} />
                {i < ayat.length - 1 ? ' ' : ''}
              </React.Fragment>
            ))}
          </Text>
        </AsyncContent>
      </ScrollView>
      {/* Footer order RTL: حفظ علامة (right), الانتقال للعلامة (center), الفهرس (left). */}
      <View style={styles.footer}>
        <MushafBtn label="الفهرس" icon={<MenuGlyph />} />
        <MushafBtn label="الانتقال للعلامة" icon={<BookmarkFilledGlyph />} />
        <MushafBtn label="حفظ علامة" icon={<BookmarkGlyph />} />
      </View>
    </SafeAreaView>
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
    <Pressable style={({ pressed }) => [styles.footerBtn, { opacity: pressed ? 0.7 : 1 }]}>
      {icon}
      <Text style={styles.footerBtnLabel}>{label}</Text>
    </Pressable>
  );
}

function BookmarkGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 3v14l5-4 5 4V3H5z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkFilledGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 3v14l5-4 5 4V3H5z"
        fill={KhazainColors.navy800}
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MenuGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 5h12M4 10h12M4 15h12"
        stroke={KhazainColors.navy800}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M2 5h0.5M2 10h0.5M2 15h0.5"
        stroke={KhazainColors.navy800}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MUSHAF_BG },
  listScreen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  surahList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  headerBg: {
    paddingBottom: 8,
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.gold600,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingTop: 6,
    writingDirection: 'rtl',
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
  ayahNum: {
    fontSize: 14,
    color: KhazainColors.gold600,
    fontFamily: 'Amiri-Bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(141,107,52,0.15)',
    backgroundColor: FOOTER_BG,
  },
  footerBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  footerBtnLabel: {
    fontSize: 11,
    fontFamily: 'TheSansArabic',
    fontWeight: '600',
    color: KhazainColors.navy800,
  },
});
