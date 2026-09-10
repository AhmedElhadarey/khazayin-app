import {
  AsyncContent,
  AudioProgressCard,
  CircularProgress,
  RtlCarousel,
  SearchPill,
  SkeletonPillList,
  StatCard,
  Toggle,
} from '@/components/khazain';
import {
  EmptyInProgressCard,
  InsightRow,
  ReminderList,
  MySavedSection,
  TrendSparkline,
  WirdHistory,
  WirdSuggestionBanner,
} from '@/components/khazain/library';
import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import {
  LIBRARY_SUMMARY_CARD_ORDER,
  type LibrarySectionKey,
  type LibraryFilter,
  type LibrarySummaryCardKey,
  visibleLibrarySections,
} from '@/constants/libraryPresentation';
import { NOTIFICATION_CATEGORIES, isCategoryEnabled } from '@/services/notificationRegistry';
import { usePlayerStore } from '@/store/playerStore';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import {
  FILTER_CHIP,
  LIBRARY_CARD_RADIUS,
  LIBRARY_DESIGN,
  LIBRARY_SECTION_GAP,
  NOTE_FIELD,
  QUICK_NOTE_CARD,
  RECENT_NOTE_ROW,
  STAT_CARD,
  WIRD_CARD,
} from '@/components/khazain/library/libraryLayout';
import {
  SURAH_NAMES_AR,
  SURAH_START_PAGES,
  toArabicDigits as toArNum,
  toLocalDay,
} from '@/constants/progress';
import { shiftDay } from '@/db/helpers/calendar';
import {
  buildHistoryGrid,
  completionByWeekday,
  type HistoryCell,
  type WeekdayCompletion,
} from '@/services/wirdHistory';
import { useLibraryFiltersStore, useSavedStore, useSettingsStore } from '@/store';
import { describeWirdReminder } from '@/services/wirdReminder';
import { setWirdReminderEnabled } from '@/services/wirdReminderToggle';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { formatRelativeAr, useNotesStore } from '@/store/notesStore';
import { useProgressStore } from '@/store/progressStore';
import { useWirdStore } from '@/store/wirdStore';
import { getRepos, progressRepo } from '@/db';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [lastReadPage, setLastReadPage] = useState<number>(1);

  // Wird completion history (US5). Loaded lazily when the السجل pill is active.
  // The window defaults to 12 weeks and grows via the "show more" affordance so
  // multi-year grids are never eagerly rendered.
  const HISTORY_WEEKS_INITIAL = 12;
  const HISTORY_WEEKS_STEP = 12;
  const HISTORY_WEEKS_MAX = 52;
  const [historyWeeks, setHistoryWeeks] = useState(HISTORY_WEEKS_INITIAL);
  const [history, setHistory] = useState<{
    byWeekday: WeekdayCompletion[];
    weeks: HistoryCell[][];
    hasHistory: boolean;
  } | null>(null);

  // Wird reminder state lives in settingsStore (the single source of truth that
  // the scheduler reads), not in local component state. Toggling here persists
  // the preference AND re-arms/cancels the repeating DAILY trigger (T047).
  //
  // Routed through `setWirdReminderEnabled` so this toggle has the SAME
  // permission semantics as the one in settings-notifications. Without it, a
  // user who has denied notification permission could switch this on: the
  // preference would persist, the card would render a next-reminder time, and
  // `scheduleWirdReminderAsync` would silently no-op — the card would be
  // advertising a reminder that can never fire.
  const wirdReminderOn = useSettingsStore((s) => s.notifications['wird-daily']);
  const wirdReminderTime = useSettingsStore((s) => s.wirdReminderTime);
  const notificationPermission = useNotificationPermission();
  const reminder = describeWirdReminder(new Date(), wirdReminderTime, {
    enabled: wirdReminderOn,
    permission: notificationPermission,
  });
  const onToggleWirdReminder = (next: boolean) => {
    void setWirdReminderEnabled(next).then((outcome) => {
      if (outcome === 'permission-denied') {
        Alert.alert(
          'إذن الإشعارات مطلوب',
          'لتفعيل التذكير، يرجى السماح بالإشعارات من إعدادات النظام.',
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'فتح الإعدادات',
              onPress: () => {
                Linking.openSettings().catch(() => {
                  Alert.alert('خطأ', 'تعذّر فتح الإعدادات.');
                });
              },
            },
          ],
        );
      }
    });
  };

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const savedCount = useSavedStore((s) => s.items.length);

  // T1.2 — if progress hydration failed at boot, surface a retry instead of
  // silently showing zeroed stats. Re-runs both SQLite-backed store hydrations.
  // `retrying` guards against overlapping hydrations from repeated taps.
  const dbFailed = useProgressStore((s) => s.dbFailed);
  const [retrying, setRetrying] = useState(false);
  const retryHydrate = () => {
    if (retrying) return;
    setRetrying(true);
    Promise.all([
      useProgressStore.getState().hydrate(),
      useWirdStore.getState().hydrate(),
    ])
      .catch(() => undefined)
      .finally(() => setRetrying(false));
  };

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

  // Load completion history when the السجل pill is active. Re-runs when the
  // window grows (show more) or when today's wird ring nudges (a fresh page
  // read should appear immediately). Guarded on `dbFailed` so the retry banner —
  // not zeroed history — is what a hydration failure shows.
  useEffect(() => {
    if (filter !== 'history' || dbFailed) return;
    let cancelled = false;
    (async () => {
      await getRepos();
      const to = toLocalDay();
      const from = shiftDay(to, -(historyWeeks * 7 - 1));
      const rows = await progressRepo.dayCompletionsInRange(from, to);
      if (cancelled) return;
      setHistory({
        byWeekday: completionByWeekday(rows, { from, to }),
        weeks: buildHistoryGrid(rows, { from, to }),
        // "Empty state" means no reading EVER — a user whose reading predates the
        // current window still gets the grid + a way to expand it (show more).
        hasHistory: rows.length > 0 || bestDayPages > 0,
      });
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [filter, historyWeeks, dbFailed, todayPct, bestDayPages]);

  const lastSurah = surahNameForPage(lastReadPage);
  const monthDeltaPct =
    pagesLastMonth > 0
      ? ((pagesThisMonth - pagesLastMonth) / pagesLastMonth) * 100
      : pagesThisMonth > 0
        ? 100
        : 0;

  // US5: the 'history' (السجل) pill is now live and renders <WirdHistory/>.
  // Override mock counts with real values from savedStore + notesStore.
  const realFilters = filters
    .map((f) => ({
      ...f,
      count:
        f.id === 'all' ? toArNum(savedCount + notes.length) :
        f.id === 'saved' ? toArNum(savedCount) :
        f.id === 'notes' ? toArNum(notes.length) :
        f.count,
    }));

  // Reminder categories that are both shipped and switched on. Derived from the
  // notification registry, so the Library never advertises a reminder that has
  // no scheduler behind it.
  // Subscribe to the notifications slice so the list re-renders on a toggle;
  // `isCategoryEnabled` owns the backfill semantics for unregistered ids.
  useSettingsStore((st) => st.notifications);
  const activeReminders = NOTIFICATION_CATEGORIES.filter(
    (category) => category.available && isCategoryEnabled(category.id),
  );

  // expo-router typed routes haven't regenerated for the new modals yet — cast to any.
  const openNewNote = (seedTitle?: string) =>
    router.push({ pathname: '/note-editor' as any, params: seedTitle ? { title: seedTitle } : {} });
  const openExistingNote = (id: string) =>
    router.push({ pathname: '/note-editor' as any, params: { id } });

  // The three Figma summary cards, keyed so LIBRARY_SUMMARY_CARD_ORDER can
  // place them without the JSX order mattering.
  const summaryCards: Record<LibrarySummaryCardKey, React.ReactNode> = {
    reminders: (
      <StatCard
        title="تذكيراتي"
        subtitle={
          activeReminders.length === 0
            ? 'لا تذكيرات نشطة'
            : `${toArNum(activeReminders.length)} تذكيرات نشطة`
        }
        icon={<StatBellGlyph />}
      />
    ),
    quranWird: (
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
    ),
    notes: (
      <StatCard
        title="ملاحظاتي"
        subtitle={`${toArNum(notes.length)} ملاحظة`}
        icon={<PencilGlyph />}
      />
    ),
  };

  const audiobookProgressCard = inProgressLecture ? (
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
    <EmptyInProgressCard onBrowse={() => router.push('/(tabs)/sections/scholar' as any)} />
  );

  // Rendered from LIBRARY_SECTION_ORDER so the reference hierarchy is a
  // single declaration, and every newer metric provably sits below it.
  const sections: Partial<Record<LibrarySectionKey, React.ReactNode>> = {
    header: (
      <View style={styles.headerBlock}>
        <Text style={styles.h1}>مكتبتي</Text>
      </View>
    ),

    search: (
      <View style={styles.searchBlock}>
        <SearchPill onPress={() => router.push('/search' as any)} />
      </View>
    ),

    // T1.2 — DB hydration failure banner with retry.
    dbError: dbFailed ? (
      <View style={styles.dbErrorBanner}>
        <Text style={styles.dbErrorText}>
          تعذّر تحميل بيانات التقدّم. الأرقام أدناه قد تكون غير دقيقة.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إعادة المحاولة"
          onPress={retryHydrate}
          disabled={retrying}
          style={({ pressed }) => [styles.dbErrorBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.dbErrorBtnLabel}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    ) : null,

    // Physical left → right: تذكيراتي، ورد القرآن، ملاحظاتي.
    summaryCards: (
      <View style={styles.statsRow}>
        {LIBRARY_SUMMARY_CARD_ORDER.map((key) => (
          <React.Fragment key={key}>{summaryCards[key]}</React.Fragment>
        ))}
      </View>
    ),

    dailyWird: (
      <View style={styles.block}>
        {/* Three rows, as the frame draws them: ring + title, then the start
            button beside the reading summary, then the toggle on its own. */}
        <View style={styles.wirdCard}>
          <View style={styles.wirdTop}>
            {/* The ring is the goal area — tap it to edit the daily target. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تعديل هدف الورد اليومي"
              hitSlop={8}
              onPress={() => router.push('/settings-wird-goal' as any)}
            >
              <CircularProgress pct={todayPct} size={WIRD_CARD.ring} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.wirdTitle}>ورد القرآن اليومي</Text>
            </View>
          </View>
          {/* Physical left → right: "بدء الورد", then the reading summary. */}
          <View style={styles.wirdActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="بدء الورد"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/sections/mushaf' as any,
                  params: lastSurah ? { surah: String(lastSurah.surahNumber) } : {},
                })
              }
              style={({ pressed }) => [styles.startBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.startBtnLabel}>بدء الورد</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <View>
              <Text style={styles.wirdMeta}>{lastReadingLabel(trendLast28)}</Text>
              <Text style={styles.wirdHighlight}>
                {lastSurah
                  ? `سورة ${lastSurah.name} — صفحة ${toArNum(lastReadPage)}`
                  : 'لم تبدأ القراءة بعد'}
              </Text>
            </View>
          </View>
          {/* Physical left → right: the toggle, then its label. */}
          <View style={styles.reminderInline}>
            <Toggle on={reminder.armed} onChange={onToggleWirdReminder} label="التذكير اليومي" />
            <View style={{ flex: 1 }} />
            <Text style={styles.reminderInlineLabel}>التذكير اليومي</Text>
          </View>
          {/* The design has no frame for a blocked reminder, so this line is
              drawn only when there is something the reader has to act on. */}
          {reminder.caption ? (
            <Text style={styles.wirdReminderNext}>{reminder.caption}</Text>
          ) : null}
        </View>
      </View>
    ),

    quickNote: (
      <View style={styles.block}>
        <View style={styles.quickNoteCard}>
          <Text style={styles.quickNoteTitle}>ملاحظة سريعة</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="اكتب ملاحظة"
            onPress={() => openNewNote()}
            style={styles.noteBody}
          >
            <Text style={styles.noteBodyPlaceholder}>اكتب ملاحظتك هنا...</Text>
          </Pressable>
          {/* Physical left → right: حفظ, then the format buttons at the right. */}
          <View style={styles.noteToolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="حفظ الملاحظة"
              onPress={() => openNewNote()}
              style={({ pressed }) => [styles.noteSaveBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.noteSaveLabel}>حفظ</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <FormatBtn>
              <ListGlyph />
            </FormatBtn>
            <FormatBtn italic>I</FormatBtn>
            <FormatBtn bold>B</FormatBtn>
          </View>
          <View style={styles.recentBlock}>
            <Text style={styles.recentHeader}>آخر الملاحظات</Text>
            {notes.length === 0 ? (
              <Text style={styles.recentEmpty}>لا توجد ملاحظات بعد</Text>
            ) : (
              notes.slice(0, 3).map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={n.title}
                  onPress={() => openExistingNote(n.id)}
                  style={styles.recentRow}
                >
                  <Text style={styles.recentTime}>{formatRelativeAr(n.updatedAt)}</Text>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {n.title}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </View>
    ),

    filters: (
      <AsyncContent
        status={filtersStatus}
        error={filtersError}
        onRetry={refreshFilters}
        skeleton={<SkeletonPillList count={3} />}
        emptyMessage="لا توجد تصنيفات"
      >
        {/* The frame's chips run out past the leading edge, so the rail
            scrolls rather than wrapping. The row style has to sit on the
            content container: AsyncContent renders its children inside a view
            of its own, which would otherwise stack the chips vertically. */}
        {/* Logical order, not physical: RtlCarousel puts the first child at
            the visual right, which is where the frame puts الكل. */}
        <RtlCarousel contentContainerStyle={styles.filtersRow}>
          {realFilters.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={f.label}
                onPress={() => setFilter(f.id as LibraryFilter)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                {/* The frame sets the label at 14 and the count at 12, with a
                    12pt gap — physical left → right: count, then label. */}
                <Text style={[styles.filterCount, active && styles.filterLabelActive]}>
                  {f.count}
                </Text>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </RtlCarousel>
      </AsyncContent>
    ),

    savedList: <MySavedSection />,

    audiobookProgress: (
      <>
        <Text style={styles.sectionTitle}>تقدم الكتب المسموعة</Text>
        <View style={styles.block}>{audiobookProgressCard}</View>
      </>
    ),

    smartReminders: (
      <>
        <Text style={styles.sectionTitle}>التذكيرات الذكية</Text>
        <View style={styles.block}>
          <ReminderList
            reminders={activeReminders.map((c) => ({
              id: c.id,
              labelAr: c.labelAr,
              descriptionAr: c.descriptionAr,
            }))}
            onManage={() => router.push('/settings-notifications' as any)}
          />
        </View>
      </>
    ),

    // ── Sections added after the design; never above the reference set. ──

    wirdHistory: dbFailed ? null : history ? (
      <WirdHistory
        byWeekday={history.byWeekday}
        weeks={history.weeks}
        hasHistory={history.hasHistory}
        onShowMore={
          historyWeeks < HISTORY_WEEKS_MAX
            ? () => setHistoryWeeks((w) => Math.min(HISTORY_WEEKS_MAX, w + HISTORY_WEEKS_STEP))
            : undefined
        }
      />
    ) : (
      <View style={styles.block}>
        <Text style={styles.historyLoading}>جارٍ تحميل السجل…</Text>
      </View>
    ),

    wirdTrend: (
      <View style={styles.block}>
        <View style={styles.card}>
          <Text style={styles.quickNoteTitle}>آخر ٢٨ يومًا</Text>
          <View style={styles.sparklineBlock}>
            <TrendSparkline points={trendLast28} wirdTarget={wirdTarget} />
          </View>
        </View>
      </View>
    ),

    insights: (
      <InsightRow
        longestStreak={longestStreak}
        bestDayPages={bestDayPages}
        monthDeltaPct={monthDeltaPct}
      />
    ),

    wirdSuggestion: pendingSuggestion?.shouldSuggest ? (
      <WirdSuggestionBanner
        suggestedTarget={pendingSuggestion.suggestedTarget}
        onAccept={() => {
          acceptSuggestion().catch(() => undefined);
        }}
        onDismiss={() => {
          dismissSuggestion().catch(() => undefined);
        }}
      />
    ) : null,

    completedLectures: (
      <View style={styles.block}>
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
    ),
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {visibleLibrarySections(filter).map((key) => (
          <React.Fragment key={key}>{sections[key]}</React.Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small inline components / glyphs ──

function StatBellGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.44 17.29c-.78 0-1.22-1.05-.66-1.62l1.12-1.12c.3-.3.48-.75.48-1.2v-3.24c0-3.95 3.21-7.16 7.16-7.16 3.94 0 7.16 3.21 7.16 7.16v3.24c0 .45.18.9.48 1.2l1.12 1.12c.57.57.17 1.62-.66 1.62H3.44z"
        fill={KhazainColors.navy800}
        opacity={0.4}
      />
      <Path
        d="M14.83 18.3a2.85 2.85 0 0 1-5.66 0"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

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
  // Figma node 2031:4659 anchors the page title at the physical right.
  headerBlock: {
    ...PHYSICAL_BOX,
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  // The frame sets the page title in the body face, not the display face:
  // TheMixArab Regular 18 in ink, where every heading below it is
  // TheSansArabic Bold.
  h1: textStyle('bodyLarge', { color: KhazainColors.inkTitle }),
  searchBlock: { paddingHorizontal: LIBRARY_DESIGN.sideMargin, paddingBottom: 8 },
  dbErrorBanner: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.25)',
    alignItems: 'center',
    gap: 10,
  },
  dbErrorText: {
    fontSize: 13,
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  dbErrorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
  },
  dbErrorBtnLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  statsRow: {
    ...PHYSICAL_ROW,
    gap: STAT_CARD.gap,
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    marginBottom: LIBRARY_SECTION_GAP,
  },
  block: { paddingHorizontal: LIBRARY_DESIGN.sideMargin, marginBottom: LIBRARY_SECTION_GAP },
  sparklineBlock: {
    marginTop: 12,
    alignItems: 'stretch',
  },
  // Every card in the frame is a flat fill with a 1pt hairline. None of them
  // casts a shadow, so none is drawn with one.
  card: {
    padding: 16,
    borderRadius: LIBRARY_CARD_RADIUS,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
  },
  // The daily-wird card is the one card the frame tints, which is what makes
  // it read as the page's focal card rather than another white panel.
  // The frame's vertical rhythm inside the card: 16 above the 48pt ring, 14
  // to the 36pt button row, 14 to the toggle, 12 below.
  wirdCard: {
    paddingHorizontal: WIRD_CARD.padding,
    paddingTop: 16,
    paddingBottom: 12,
    borderRadius: WIRD_CARD.radius,
    backgroundColor: KhazainColors.iconChipBg,
  },
  // Physical left → right: progress ring, then the reading summary.
  wirdTop: { ...PHYSICAL_ROW, alignItems: 'center', gap: 14 },
  wirdTitle: textStyle('sectionTitle', { color: KhazainColors.inkHeading }),
  wirdMeta: textStyle('cardTitle', { color: KhazainColors.inkTitle }),
  wirdHighlight: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    marginTop: 4,
  },
  // Physical left → right: بدء الورد, spacer, daily-reminder toggle.
  wirdActions: {
    ...PHYSICAL_ROW,
    marginTop: 14,
    alignItems: 'flex-start',
  },
  startBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnLabel: textStyle('cardTitle', { color: KhazainColors.pageBg }),
  reminderInline: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    marginTop: 14,
  },
  reminderInlineLabel: textStyle('cardTitle', { color: KhazainColors.ink500 }),
  wirdReminderNext: {
    ...textStyle('label', { color: KhazainColors.gold600 }),
    marginTop: 8,
  },
  quickNoteTitle: {
    ...textStyle('sectionTitle', { color: KhazainColors.inkHeading }),
    marginBottom: 12,
  },
  // The frame inverts the usual pairing here: the card takes the page colour
  // and the field inside it is the lighter surface.
  quickNoteCard: {
    padding: QUICK_NOTE_CARD.padding,
    paddingTop: 17,
    paddingBottom: QUICK_NOTE_CARD.paddingBottom,
    borderRadius: QUICK_NOTE_CARD.radius,
    backgroundColor: KhazainColors.pageBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
  },
  noteBody: {
    backgroundColor: KhazainColors.cardBg,
    borderRadius: NOTE_FIELD.radius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    height: NOTE_FIELD.height,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  noteBodyPlaceholder: textStyle('cardTitle', { color: KhazainColors.ink400 }),
  // Physical left → right: حفظ, spacer, then the format buttons at the right.
  noteToolbar: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  noteSaveBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSaveLabel: textStyle('cardTitle', { color: KhazainColors.pageBg }),
  // DIV-122 carries no rule; the design separates the block with space.
  recentBlock: {
    marginTop: 12,
    paddingBottom: 16,
  },
  recentHeader: {
    ...textStyle('cardTitle', { color: KhazainColors.ink500 }),
    marginBottom: 8,
  },
  // Physical left → right: relative time, then the note title at the right.
  // DIV-127/134: each recent note is its own 36pt card, not a bare row.
  recentRow: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    marginBottom: RECENT_NOTE_ROW.gap,
    paddingHorizontal: 8,
    borderRadius: RECENT_NOTE_ROW.radius,
    backgroundColor: KhazainColors.cardBg,
  },
  recentTitle: textStyle('cardTitle', { color: KhazainColors.ink500 }),
  recentTime: textStyle('label', { color: KhazainColors.ink500 }),
  recentEmpty: {
    color: KhazainColors.ink400,
    fontSize: 12,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
    paddingVertical: 6,
  },
  filtersRow: {
    gap: FILTER_CHIP.gap,
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    paddingBottom: LIBRARY_SECTION_GAP,
    alignItems: 'center',
  },
  filterPill: {
    ...PHYSICAL_ROW,
    height: FILTER_CHIP.height,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: FILTER_CHIP.radius,
    backgroundColor: KhazainColors.iconChipBg,
  },
  filterPillActive: {
    backgroundColor: KhazainColors.navy800,
  },
  filterLabel: textStyle('cardTitle', { color: KhazainColors.ink500 }),
  filterCount: textStyle('label', { color: KhazainColors.ink500 }),
  filterLabelActive: { color: KhazainColors.pageBg },
  sectionTitle: {
    ...textStyle('sectionTitle', { color: KhazainColors.inkHeading }),
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    paddingBottom: 8,
  },
  historyLoading: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink400,
    writingDirection: 'rtl',
    textAlign: 'center',
    paddingVertical: 24,
  },
});

const formatStyles = StyleSheet.create({
  // BUTTON-113/116/119: 32 x 32 discs on the card's lighter surface.
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'System',
    fontSize: 13,
    color: KhazainColors.ink700,
  },
});
