import {
  AsyncContent,
  AudioProgressCard,
  CircularProgress,
  ReminderCard,
  SearchPill,
  SkeletonPillList,
  StatCard,
  Toggle,
} from '@/components/khazain';
import {
  EmptyInProgressCard,
  InsightRow,
  MySavedSection,
  TrendSparkline,
  WirdSuggestionBanner,
} from '@/components/khazain/library';
import { usePlayerStore } from '@/store/playerStore';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import {
  SURAH_NAMES_AR,
  SURAH_START_PAGES,
  toArabicDigits as toArNum,
} from '@/constants/progress';
import { useLibraryFiltersStore, useSavedStore } from '@/store';
import { formatRelativeAr, useNotesStore } from '@/store/notesStore';
import { useProgressStore } from '@/store/progressStore';
import { useWirdStore } from '@/store/wirdStore';
import { getRepos, progressRepo } from '@/db';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

function surahNameForPage(page: number): { name: string; surahNumber: number } | null {
  if (!Number.isInteger(page) || page < 1 || page > 604) return null;
  for (let n = 114; n >= 1; n -= 1) {
    if (SURAH_START_PAGES[n] <= page) {
      return { name: SURAH_NAMES_AR[n], surahNumber: n };
    }
  }
  return null;
}

function lastReadingLabel(trend: { localDay: string; pagesRead: number }[]): string {
  for (let i = trend.length - 1; i >= 0; i -= 1) {
    if (trend[i].pagesRead > 0) {
      if (i === trend.length - 1) return 'آخر قراءة: اليوم';
      if (i === trend.length - 2) return 'آخر قراءة: أمس';
      return `آخر قراءة: قبل ${toArNum(trend.length - 1 - i)} أيام`;
    }
  }
  return 'لم تبدأ القراءة بعد';
}

export default function LibraryScreen() {
  const router = useRouter();
  const notes = useNotesStore((s) => s.notes);
  const { data: filters, status: filtersStatus, error: filtersError, fetch: fetchFilters, refresh: refreshFilters } = useLibraryFiltersStore();

  const [reminderOn, setReminderOn] = useState(true);
  const [smart1, setSmart1] = useState(true);
  const [smart2, setSmart2] = useState(true);
  const [smart3, setSmart3] = useState(false);
  const [filter, setFilter] = useState('all');
  const [lastReadPage, setLastReadPage] = useState<number>(1);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const recentNotes = notes.slice(0, 2);

  const savedCount = useSavedStore((s) => s.items.length);

  // Progress snapshot (SQLite-backed, hydrated at app boot).
  const currentStreak = useProgressStore((s) => s.currentStreak);
  const trendLast28 = useProgressStore((s) => s.trendLast28);
  const longestStreak = useProgressStore((s) => s.longestStreakEver);
  const bestDayPages = useProgressStore((s) => s.bestWirdDayPages);
  const pagesThisMonth = useProgressStore((s) => s.pagesReadThisMonth);
  const pagesLastMonth = useProgressStore((s) => s.pagesReadLastMonth);
  const todayPct = useWirdStore((s) => s.todayPct);
  const wirdTarget = useWirdStore((s) => s.target);
  const inProgressLecture = useProgressStore((s) => s.inProgressLecture);
  const completedLectureCount = useProgressStore((s) => s.completedLectureCount);
  const pendingSuggestion = useWirdStore((s) => s.pendingSuggestion);
  const acceptSuggestion = useWirdStore((s) => s.acceptSuggestion);
  const dismissSuggestion = useWirdStore((s) => s.dismissSuggestion);

  // last_read_page lives in settings — refresh whenever the wird ring nudges
  // (proxy for "user just recorded a page"). Awaits `getRepos()` so the Proxy
  // accessor never throws the pre-hydration error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await getRepos();
      const p = await progressRepo.getLastReadPage();
      if (!cancelled) setLastReadPage(p);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [todayPct]);

  const lastSurah = surahNameForPage(lastReadPage);
  const monthDeltaPct =
    pagesLastMonth > 0
      ? ((pagesThisMonth - pagesLastMonth) / pagesLastMonth) * 100
      : pagesThisMonth > 0
        ? 100
        : 0;

  // Board condition #9: hide 'history' pill until feature exists.
  // Override mock counts with real values from savedStore + notesStore.
  const realFilters = filters
    .filter((f) => f.id !== 'history')
    .map((f) => ({
      ...f,
      count:
        f.id === 'all' ? toArNum(savedCount + notes.length) :
        f.id === 'saved' ? toArNum(savedCount) :
        f.id === 'notes' ? toArNum(notes.length) :
        f.count,
    }));

  const showSaved = filter === 'all' || filter === 'saved';
  const showNotes = filter === 'all' || filter === 'notes';

  // expo-router typed routes haven't regenerated for the new modals yet — cast to any.
  const openNewNote = (seedTitle?: string) =>
    router.push({ pathname: '/note-editor' as any, params: seedTitle ? { title: seedTitle } : {} });
  const openExistingNote = (id: string) =>
    router.push({ pathname: '/note-editor' as any, params: { id } });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>مكتبتي</Text>
        </View>
        <View style={styles.searchBlock}>
          <SearchPill placeholder="ابحث في مكتبتك..." onPress={() => router.push('/search' as any)} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            title="ملاحظاتي"
            subtitle={`${toArNum(notes.length)} ملاحظة`}
            icon={<PencilGlyph />}
          />
          <StatCard
            title="ورد القرآن"
            subtitle={
              currentStreak === 0
                ? 'لم تبدأ بعد'
                : currentStreak === 1
                  ? 'يوم واحد متتالي'
                  : `${toArNum(currentStreak)} يوم متتالي`
            }
            icon={<BookGlyph />}
          />
          <StatCard
            title="محاضرات مكتملة"
            subtitle={
              completedLectureCount === 0
                ? 'لم تكتمل بعد'
                : `${toArNum(completedLectureCount)} محاضرة`
            }
            icon={<HeadphonesGlyph />}
          />
        </View>

        {/* Insight row — longest streak / best wird day / month delta. */}
        <InsightRow
          longestStreak={longestStreak}
          bestDayPages={bestDayPages}
          monthDeltaPct={monthDeltaPct}
        />

        {/* Adaptive wird-target suggestion (research R7) */}
        {pendingSuggestion?.shouldSuggest ? (
          <WirdSuggestionBanner
            suggestedTarget={pendingSuggestion.suggestedTarget}
            onAccept={() => {
              acceptSuggestion().catch(() => undefined);
            }}
            onDismiss={() => {
              dismissSuggestion().catch(() => undefined);
            }}
          />
        ) : null}

        {/* Daily Wird card */}
        <View style={styles.block}>
          <View style={[styles.card, KhazainShadows.card]}>
            <View style={styles.wirdTop}>
              <CircularProgress pct={todayPct} />
              <View style={{ flex: 1 }}>
                <Text style={styles.wirdTitle}>وردُ القرآن اليومي</Text>
                <Text style={styles.wirdMeta}>{lastReadingLabel(trendLast28)}</Text>
                <Text style={styles.wirdHighlight}>
                  {lastSurah
                    ? `سورة ${lastSurah.name} · الصفحة ${toArNum(lastReadPage)}`
                    : `الصفحة ${toArNum(lastReadPage)} من ٦٠٤`}
                </Text>
              </View>

            </View>
            {/* 28-day pages-per-day sparkline below the ring. */}
            <View style={styles.sparklineBlock}>
              <TrendSparkline points={trendLast28} wirdTarget={wirdTarget} />
            </View>
            {/* Actions row: "بدء الورد" navy pill on RIGHT (first), toggle row on LEFT.
                Under forceRTL+row, JSX-first lands visually on the right. */}
            <View style={styles.wirdActions}>
              <Pressable
                onPress={() => { }}
                style={({ pressed }) => [styles.startBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.startBtnLabel}>بدء الورد</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <View style={styles.reminderInline}>
                <Toggle on={reminderOn} onChange={setReminderOn} />

                <Text style={styles.reminderInlineLabel}>التذكير اليومي</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick note */}
        {showNotes ? (
        <View style={styles.block}>
          <View style={[styles.card, KhazainShadows.card]}>
            <Text style={styles.quickNoteTitle}>ملاحظة سريعة</Text>
            <Pressable
              onPress={() => openNewNote()}
              style={({ pressed }) => [styles.noteBody, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.noteBodyPlaceholder}>اكتب ملاحظتك هنا...</Text>
            </Pressable>
            {/* Toolbar: format buttons on the RIGHT (RTL leading), save pill on the LEFT.
                JSX order is right→left under forceRTL+row, so format btns come first. */}
            <View style={styles.noteToolbar}>
              <FormatBtn bold>B</FormatBtn>
              <FormatBtn italic>I</FormatBtn>
              <FormatBtn>
                <ListGlyph />
              </FormatBtn>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => openNewNote()}
                style={({ pressed }) => [styles.noteSaveBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.noteSaveLabel}>حفظ</Text>
              </Pressable>
            </View>
            <View style={styles.recentBlock}>
              <Text style={styles.recentHeader}>آخر الملاحظات</Text>
              {recentNotes.length === 0 ? (
                <Text style={styles.recentEmpty}>لا توجد ملاحظات بعد</Text>
              ) : (
                recentNotes.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => openExistingNote(n.id)}
                    style={({ pressed }) => [styles.recentRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {n.title || 'ملاحظة بلا عنوان'}
                    </Text>
                    <Text style={styles.recentTime}>{formatRelativeAr(n.updatedAt)}</Text>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        </View>
        ) : null}

        {/* Filter pills */}
        <View style={styles.filtersRow}>
          <AsyncContent
            status={filtersStatus}
            error={filtersError}
            onRetry={refreshFilters}
            skeleton={<SkeletonPillList count={3} />}
            emptyMessage="لا توجد تصنيفات"
          >
            {realFilters.map((f) => {
              const active = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={({ pressed }) => [
                    styles.filterPill,
                    active ? styles.filterPillActive : styles.filterPillInactive,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                    {f.label} {f.count}
                  </Text>
                </Pressable>
              );
            })}
          </AsyncContent>
        </View>

        {showSaved ? <MySavedSection /> : null}

        {/* Audio progress — real in-progress lecture from progressStore. */}
        <Text style={styles.sectionTitle}>تقدّم الكتب المسموعة</Text>
        <View style={styles.block}>
          {inProgressLecture ? (
            (() => {
              const lecture = inProgressLecture;
              const pct = lecture.durationSec > 0
                ? Math.min(100, Math.round((lecture.positionSec / lecture.durationSec) * 100))
                : 0;
              const resume = () => {
                usePlayerStore.getState().setTrack({
                  id: lecture.lectureId,
                  title: lecture.title,
                  reciter: lecture.author,
                  durationSec: lecture.durationSec,
                });
                usePlayerStore.getState().setProgress(
                  lecture.durationSec > 0 ? lecture.positionSec / lecture.durationSec : 0,
                );
                usePlayerStore.getState().setVisible(true);
              };
              return (
                <AudioProgressCard
                  title={lecture.title}
                  author={lecture.author}
                  pct={pct}
                  subtitle={`${toArNum(pct)}٪ مكتمل`}
                  primaryLabel="متابعة"
                  secondaryLabel="إضافة ملاحظة"
                  onPrimary={resume}
                  onSecondary={() => openNewNote(lecture.title)}
                />
              );
            })()
          ) : (
            <EmptyInProgressCard
              onBrowse={() => router.push('/(tabs)/sections/scholar' as any)}
            />
          )}
        </View>

        {/* Smart reminders */}
        <Text style={styles.sectionTitle}>التذكيرات الذكية</Text>
        <View style={styles.remindersBlock}>
          <ReminderCard
            active
            on={smart1}
            onToggle={setSmart1}
            title="تذكير ورد القرآن"
            body="لم تقرأ الورد منذ ٣ أيام. تذكّر أن قراءة القرآن نور وشفاء للقلوب."
            next="التذكير التالي: غداً الساعة ٨:٠٠ ص"
            icon={<BookGlyph size={14} />}
          />
          <ReminderCard
            on={smart2}
            onToggle={setSmart2}
            title="متابعة الاستماع"
            body='حان وقت متابعة "تفسير سورة البقرة"'
            next="التذكير التالي: اليوم الساعة ٧:٠٠ م"
            icon={<HeadphonesGlyph size={14} />}
          />
          <ReminderCard
            on={smart3}
            onToggle={setSmart3}
            title="مراجعة الأهداف"
            body="راجع تقدّمك في الأهداف الأسبوعية."
            next="التذكير التالي: الأحد الساعة ١٠:٠٠ ص"
            icon={<StarGlyph size={14} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small inline components / glyphs ──────────────────────────────

function FormatBtn({
  children,
  bold,
  italic,
}: {
  children: React.ReactNode;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [formatStyles.btn, { opacity: pressed ? 0.75 : 1 }]}>
      {typeof children === 'string' ? (
        <Text
          style={[
            formatStyles.label,
            bold && { fontWeight: '700' },
            italic && { fontStyle: 'italic' },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

function PencilGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 17l1-4 10-10 3 3L7 16l-4 1z"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 4h12v14H6a2 2 0 01-2-2V4z"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function HeadphonesGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10V8a6 6 0 0112 0v2M4 10v3a2 2 0 002 2h1v-5H4zm12 0v3a2 2 0 01-2 2h-1v-5h3z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function StarGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 3l2.5 5 5.5.8-4 3.8 1 5.4L10 15.5 5 18l1-5.4-4-3.8L7.5 8 10 3z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ListGlyph() {
  return (
    <Svg width={12} height={12} viewBox="0 0 14 14">
      <Path
        d="M2 3h10M2 7h10M2 11h10"
        stroke={KhazainColors.ink700}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headerBlock: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, alignItems: 'center' },
  h1: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
  searchBlock: { paddingHorizontal: 18, paddingBottom: 14 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  block: { paddingHorizontal: 14, marginBottom: 14 },
  sparklineBlock: {
    marginTop: 12,
    alignItems: 'stretch',
  },
  remindersBlock: { paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
  },
  wirdTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  wirdTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  wirdMeta: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginTop: 4,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  wirdHighlight: {
    fontSize: 12,
    color: KhazainColors.ink700,
    marginTop: 2,
    fontWeight: '600',
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  wirdActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  startBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnLabel: {
    color: '#fff',
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '600',
  },
  reminderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  reminderInlineLabel: {
    fontSize: 11,
    color: KhazainColors.ink500,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  quickNoteTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.navy800,
    marginBottom: 8,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  noteBody: {
    backgroundColor: KhazainColors.cream100,
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  noteBodyPlaceholder: {
    fontSize: 12,
    color: KhazainColors.ink400,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  noteToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  noteSaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
  },
  noteSaveLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'TheSansArabic',
  },
  recentBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(141,107,52,0.1)',
    marginTop: 12,
    paddingTop: 10,
  },
  recentHeader: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginBottom: 6,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  recentTitle: {
    color: KhazainColors.ink900,
    fontWeight: '500',
    fontSize: 12,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  recentTime: {
    color: KhazainColors.ink400,
    fontSize: 12,
    fontFamily: 'TheSansArabic',
  },
  recentEmpty: {
    color: KhazainColors.ink400,
    fontSize: 12,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
    paddingVertical: 6,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  filterPillActive: {
    backgroundColor: KhazainColors.navy800,
  },
  filterPillInactive: {
    backgroundColor: KhazainColors.cream50,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  filterLabelActive: { color: '#fff' },
  sectionTitle: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});

const formatStyles = StyleSheet.create({
  btn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: KhazainColors.cream100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'System',
    fontSize: 13,
    color: KhazainColors.ink700,
  },
});
