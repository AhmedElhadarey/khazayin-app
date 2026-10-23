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
  type ReminderSummary,
  MySavedSection,
  TrendSparkline,
  WirdHistory,
  WirdSuggestionBanner,
} from '@/components/khazain/library';
import { PAGE_CHROME, PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import {
  LIBRARY_PROGRESS_STAT_ORDER,
  LIBRARY_SUMMARY_CARD_ORDER,
  type LibraryProgressStatKey,
  type LibrarySectionKey,
  type LibraryFilter,
  type LibrarySummaryCardKey,
  visibleLibrarySections,
} from '@/constants/libraryPresentation';
import {
  filterChipCount,
  juzCompletedSubtitle,
  lecturesListenedSubtitle,
  nextReminderLabel,
  notesSubtitle,
  pagesReadSubtitle,
  remindersSubtitle,
  streakSubtitle,
  wirdHighlightLabel,
  wirdReminderDescription,
} from '@/services/libraryStats';
import { NOTIFICATION_CATEGORIES, isCategoryEnabled } from '@/services/notificationRegistry';
import { usePlayerStore } from '@/store/playerStore';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { FormatButton } from '@/components/khazain/primitives/FormatButton';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import {
  FILTER_CHIP,
  LIBRARY_CARD_RADIUS,
  LIBRARY_DESIGN,
  LIBRARY_SEARCH_MARGIN_BELOW,
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
import { selectGoalMetToday, useWirdStore } from '@/store/wirdStore';
import { getRepos, progressRepo } from '@/db';
import type { LectureSession } from '@/db/types';
import { lectureNoteParamsFromSession } from '@/services/noteActions';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { useResponsiveLayout, useWindowControlsInset } from '@/hooks/useResponsiveLayout';
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

/** `DIV-46` draws its stat glyph at 22.2 x 21.3 inside a 40pt chip. */
const STAT_GLYPH = 22;
/** `BUTTON-113` draws its toolbar mark at 16.7 x 16 inside a 32pt button. */
const FORMAT_GLYPH = 16;

export default function LibraryScreen() {
  const { columnStyle } = useResponsiveLayout();
  const controls = useWindowControlsInset();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notes = useNotesStore((s) => s.notes);
  const { data: filters, status: filtersStatus, error: filtersError, fetch: fetchFilters, refresh: refreshFilters } = useLibraryFiltersStore();

  const [filter, setFilter] = useState<LibraryFilter>('all');

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
  // the preference AND re-arms/cancels the wird reminder horizon (T047).
  //
  // Routed through `setWirdReminderEnabled` so this toggle has the SAME
  // permission semantics as the one in settings-notifications. Without it, a
  // user who has denied notification permission could switch this on: the
  // preference would persist, the card would render a next-reminder time, and
  // the scheduler would silently arm nothing — the card would be
  // advertising a reminder that can never fire.
  const wirdReminderOn = useSettingsStore((s) => s.notifications['wird-daily']);
  const wirdReminderTime = useSettingsStore((s) => s.wirdReminderTime);
  const notificationPermission = useNotificationPermission();
  // Once today's goal is met, today's reminder is cancelled, so the caption
  // names tomorrow (design 2026-10-21 §3.5). Same DB-derived flag as the horizon.
  const goalMetToday = useWirdStore((s) => selectGoalMetToday(s, toLocalDay()));
  const reminder = describeWirdReminder(new Date(), wirdReminderTime, {
    enabled: wirdReminderOn,
    permission: notificationPermission,
    goalMetToday,
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
  const lastReadPage = useProgressStore((s) => s.lastReadPage);
  const trendLast28 = useProgressStore((s) => s.trendLast28);
  const longestStreak = useProgressStore((s) => s.longestStreakEver);
  const bestDayPages = useProgressStore((s) => s.bestWirdDayPages);
  const pagesThisMonth = useProgressStore((s) => s.pagesReadThisMonth);
  const pagesLastMonth = useProgressStore((s) => s.pagesReadLastMonth);
  const todayPct = useWirdStore((s) => s.todayPct);
  const wirdTarget = useWirdStore((s) => s.target);
  const inProgressLecture = useProgressStore((s) => s.inProgressLecture);
  const recentCompletedLecture = useProgressStore((s) => s.recentCompletedLecture);
  const completedLectureCount = useProgressStore((s) => s.completedLectureCount);
  const totalPagesRead = useProgressStore((s) => s.totalPagesRead);
  const completedJuzCount = useProgressStore((s) => s.completedJuzCount);
  const listenedLectureCount = useProgressStore((s) => s.listenedLectureCount);
  const pendingSuggestion = useWirdStore((s) => s.pendingSuggestion);
  const acceptSuggestion = useWirdStore((s) => s.acceptSuggestion);
  const dismissSuggestion = useWirdStore((s) => s.dismissSuggestion);

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
  // The data model holds a page, not an ayah, so the page stays; with no
  // reading history the line is hidden rather than repeating the line above.
  const wirdHighlight = wirdHighlightLabel(lastSurah?.name ?? null, lastReadPage);
  const monthDeltaPct =
    pagesLastMonth > 0
      ? ((pagesThisMonth - pagesLastMonth) / pagesLastMonth) * 100
      : pagesThisMonth > 0
        ? 100
        : 0;

  // US5: the 'history' (السجل) pill is now live and renders <WirdHistory/>.
  // Override mock counts with real values from savedStore + notesStore.
  const realFilters = filters.map((f) => ({
    ...f,
    count: filterChipCount(f.id, {
      saved: savedCount,
      notes: notes.length,
      completed: completedLectureCount,
    }),
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

  // Every shipped reminder gets a card with its own switch. The wird switch
  // goes through `onToggleWirdReminder` (permission-aware, same as the settings
  // screen); a card is armed only when the OS permits it, never on the stored
  // preference alone.
  const now = new Date();
  const smartReminders: ReminderSummary[] = NOTIFICATION_CATEGORIES.filter((c) => c.available).map(
    (c) =>
      c.id === 'wird-daily'
        ? {
            id: c.id,
            labelAr: c.libraryLabelAr ?? c.labelAr,
            descriptionAr: wirdReminderDescription(trendLast28, c.descriptionAr),
            armed: reminder.armed,
            nextLabel: reminder.armed
              ? nextReminderLabel(now, wirdReminderTime, goalMetToday)
              : undefined,
            statusLabel: reminder.armed ? undefined : reminder.caption,
            onToggle: onToggleWirdReminder,
          }
        : {
            id: c.id,
            labelAr: c.libraryLabelAr ?? c.labelAr,
            descriptionAr: c.descriptionAr,
            armed: isCategoryEnabled(c.id),
            onToggle: (next: boolean) => useSettingsStore.getState().setNotificationEnabled(c.id, next),
          },
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
        subtitle={remindersSubtitle(activeReminders.length)}
        icon={<FigmaIcon name="LibraryReminders" size={STAT_GLYPH} color={KhazainColors.goldAccent} />}
      />
    ),
    quranWird: (
      <StatCard
        title="ورد القرآن"
        subtitle={streakSubtitle(currentStreak)}
        icon={<FigmaIcon name="LibraryWird" size={STAT_GLYPH} color={KhazainColors.goldAccent} />}
      />
    ),
    notes: (
      <StatCard
        title="ملاحظاتي"
        subtitle={notesSubtitle(notes.length)}
        icon={<FigmaIcon name="LibraryNotes" size={STAT_GLYPH} color={KhazainColors.goldAccent} />}
      />
    ),
  };

  // Below the frame (no Figma frame — design 2026-10-21 §4.4). Same StatCard,
  // geometry and PHYSICAL_ROW as the frame's summary row.
  const progressStatCards: Record<LibraryProgressStatKey, React.ReactNode> = {
    lectures: (
      <StatCard
        title="المحاضرات"
        subtitle={lecturesListenedSubtitle(listenedLectureCount, completedLectureCount)}
        icon={<HeadphonesGlyph size={STAT_GLYPH} />}
      />
    ),
    juz: (
      <StatCard
        title="الأجزاء"
        subtitle={juzCompletedSubtitle(completedJuzCount)}
        icon={<FigmaIcon name="SectionQuran" size={STAT_GLYPH} color={KhazainColors.goldAccent} />}
      />
    ),
    pages: (
      <StatCard
        title="الصفحات"
        subtitle={pagesReadSubtitle(totalPagesRead)}
        icon={<FigmaIcon name="LibraryWird" size={STAT_GLYPH} color={KhazainColors.goldAccent} />}
      />
    ),
  };

  // The data model has no episode position or series length, so the card's
  // «الحلقة n من m» meta is omitted until it can be stated truthfully.
  const playLecture = (lecture: LectureSession, fromStart: boolean) => {
    usePlayerStore.getState().setTrack({
      id: lecture.lectureId,
      title: lecture.title,
      reciter: lecture.author,
      durationSec: lecture.durationSec,
    });
    usePlayerStore
      .getState()
      .setProgress(!fromStart && lecture.durationSec > 0 ? lecture.positionSec / lecture.durationSec : 0);
    usePlayerStore.getState().setVisible(true);
  };

  const inProgressCard = inProgressLecture ? (
    (() => {
      const lecture = inProgressLecture;
      const pct = lecture.durationSec > 0
        ? Math.min(100, Math.round((lecture.positionSec / lecture.durationSec) * 100))
        : 0;
      return (
        <AudioProgressCard
          title={lecture.title}
          author={lecture.author}
          pct={pct}
          subtitle={`${toArNum(pct)}٪ مكتمل`}
          primaryLabel="متابعة"
          secondaryLabel="إضافة ملاحظة"
          onPrimary={() => playLecture(lecture, false)}
          onSecondary={() => {
            // Linked to the saved second. A session whose id is not an episode
            // id cannot be linked, so it keeps the old title-seeded note.
            const linked = lectureNoteParamsFromSession(lecture);
            if (!linked) openNewNote(lecture.title);
            else router.push({ pathname: '/note-editor' as any, params: linked });
          }}
        />
      );
    })()
  ) : null;

  // The most recently finished lecture: gold accent, full track.
  const completedCard = recentCompletedLecture ? (
    <AudioProgressCard
      variant="completed"
      title={recentCompletedLecture.title}
      author={recentCompletedLecture.author}
      pct={100}
      subtitle="مكتمل"
      primaryLabel="مراجعة"
      secondaryLabel="عرض الملاحظات"
      onPrimary={() => playLecture(recentCompletedLecture, true)}
      onSecondary={() => router.push('/notes-viewer' as any)}
    />
  ) : null;

  // With nothing in progress and nothing finished the section shows the empty
  // card; otherwise it shows whichever real cards exist.
  const audiobookProgressCard =
    inProgressCard || completedCard ? (
      <View style={styles.audiobookStack}>
        {inProgressCard}
        {completedCard}
      </View>
    ) : (
      <EmptyInProgressCard onBrowse={() => router.push('/(tabs)/sections/scholar' as any)} />
    );

  // Rendered from LIBRARY_SECTION_ORDER so the reference hierarchy is a
  // single declaration, and every newer metric provably sits below it.
  const sections: Partial<Record<LibrarySectionKey, React.ReactNode>> = {
    header: (
      <View style={styles.headerBlock}>
        <Text style={[styles.h1, { marginLeft: controls.left, marginRight: controls.right }]}>مكتبتي</Text>
      </View>
    ),

    search: (
      <View style={styles.searchBlock}>
        <SearchPill onPress={openSearch} />
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
              {wirdHighlight ? <Text style={styles.wirdHighlight}>{wirdHighlight}</Text> : null}
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
            <FormatButton accessibilityLabel="قائمة">
              <FigmaIcon name="NoteListFormat" size={FORMAT_GLYPH} color={KhazainColors.ink500} />
            </FormatButton>
            <FormatButton accessibilityLabel="مائل">
              <FigmaIcon name="NoteItalic" size={FORMAT_GLYPH} color={KhazainColors.ink500} />
            </FormatButton>
            <FormatButton accessibilityLabel="عريض">
              <FigmaIcon name="NoteBold" size={FORMAT_GLYPH} color={KhazainColors.ink500} />
            </FormatButton>
          </View>
          <View style={styles.recentBlock}>
            <Text style={styles.recentHeader}>آخر الملاحظات</Text>
            {notes.length === 0 ? (
              <Text style={styles.recentEmpty}>لا توجد ملاحظات بعد</Text>
            ) : (
              notes.slice(0, 3).map((n, i) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={n.title}
                  onPress={() => openExistingNote(n.id)}
                  style={[styles.recentRow, i > 0 && styles.recentRowGap]}
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
                {f.count ? (
                  <Text style={[styles.filterCount, active && styles.filterLabelActive]}>
                    {f.count}
                  </Text>
                ) : null}
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
        <SectionTitle>تقدم الكتب المسموعة</SectionTitle>
        <View style={styles.blockAfterTitle}>{audiobookProgressCard}</View>
      </>
    ),

    smartReminders: (
      <>
        <SectionTitle paddingBottom={12}>التذكيرات الذكية</SectionTitle>
        <View style={styles.block}>
          <ReminderList
            reminders={smartReminders}
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

    // Physical left → right: محاضرات مسموعة، الأجزاء المكتملة، صفحات مقروءة.
    progressStats: (
      <View style={styles.statsRow}>
        {LIBRARY_PROGRESS_STAT_ORDER.map((key) => (
          <React.Fragment key={key}>{progressStatCards[key]}</React.Fragment>
        ))}
      </View>
    ),
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <HeaderArt corners="pair" smallCorner="library" bandHeight={headerBandHeight(insets.top, 'root')} />
      <ScrollView
        contentContainerStyle={[{ paddingBottom: 24 }, columnStyle]}
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

/**
 * A block heading. The wrapper is pinned so the title's right alignment is the
 * physical right: a bare right-aligned Text in an unpinned RTL container lands
 * on the physical left.
 */
function SectionTitle({
  children,
  paddingBottom = 8,
}: {
  children: string;
  paddingBottom?: number;
}) {
  return (
    <View style={[styles.sectionTitleBox, { paddingBottom }]}>
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

function HeadphonesGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10V8a6 6 0 0112 0v2M4 10v3a2 2 0 002 2h1v-5H4zm12 0v3a2 2 0 01-2 2h-1v-5h3z"
        stroke={KhazainColors.goldAccent}
        strokeWidth={1.5}
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
    // h1 keeps its 28pt line; 12 below it puts the field where the frame does.
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  // The frame sets the page title in the body face, not the display face:
  // TheMixArab Regular 18 in ink, where every heading below it is
  // TheSansArabic Bold.
  h1: textStyle('bodyLarge', { color: KhazainColors.inkTitle }),
  // The search field ends at y=128 and the stat cards start at 160: a 32 gap.
  searchBlock: {
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    paddingBottom: PAGE_CHROME.searchPaddingBottom + LIBRARY_SEARCH_MARGIN_BELOW,
  },
  // No frame covers the failure banner; geometry is the Library contract.
  dbErrorBanner: {
    ...PHYSICAL_BOX,
    marginHorizontal: LIBRARY_DESIGN.sideMargin,
    marginBottom: 14,
    padding: 14,
    borderRadius: LIBRARY_CARD_RADIUS,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
    alignItems: 'stretch',
    gap: 10,
  },
  dbErrorText: textStyle('bodyCompact', { color: KhazainColors.ink700, textAlign: 'center' }),
  dbErrorBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: KhazainColors.navy800,
  },
  dbErrorBtnLabel: textStyle('cardTitle', { color: KhazainColors.pageBg, textAlign: 'center' }),
  statsRow: {
    ...PHYSICAL_ROW,
    gap: STAT_CARD.gap,
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    marginBottom: LIBRARY_SECTION_GAP,
  },
  block: { paddingHorizontal: LIBRARY_DESIGN.sideMargin, marginBottom: LIBRARY_SECTION_GAP },
  // The audiobook block sits 16 above the next block title (LIBRARY-20), not
  // the 40 that separates two top-level sections.
  audiobookStack: { gap: 8 },
  blockAfterTitle: { paddingHorizontal: LIBRARY_DESIGN.sideMargin, marginBottom: 16 },
  sparklineBlock: {
    marginTop: 12,
    alignItems: 'stretch',
  },
  // Every card in the frame is a flat fill with a 1pt hairline. None of them
  // casts a shadow, so none is drawn with one.
  card: {
    ...PHYSICAL_BOX,
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
    ...PHYSICAL_BOX,
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
    ...PHYSICAL_BOX,
    padding: QUICK_NOTE_CARD.padding,
    paddingTop: 17,
    paddingBottom: QUICK_NOTE_CARD.paddingBottom,
    borderRadius: QUICK_NOTE_CARD.radius,
    backgroundColor: KhazainColors.pageBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
  },
  noteBody: {
    ...PHYSICAL_BOX,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: NOTE_FIELD.radius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    height: NOTE_FIELD.height,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  noteBodyPlaceholder: textStyle('cardTitle', { color: KhazainColors.placeholder }),
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
  // The recent-notes block opens with a 1pt hairline rule, 12 below the
  // toolbar and 13 above its heading. The last row ends flush with the card's
  // 24pt bottom padding, so the block carries no bottom padding of its own.
  recentBlock: {
    ...PHYSICAL_BOX,
    marginTop: 12,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: KhazainColors.hairlineFaint,
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
    paddingHorizontal: 8,
    borderRadius: RECENT_NOTE_ROW.radius,
    backgroundColor: KhazainColors.cardBg,
  },
  // Between rows only, so the last row ends on the card's bottom padding.
  recentRowGap: { marginTop: RECENT_NOTE_ROW.gap },
  recentTitle: textStyle('cardTitle', { color: KhazainColors.ink500 }),
  recentTime: textStyle('label', { color: KhazainColors.ink500 }),
  recentEmpty: {
    ...textStyle('caption', { color: KhazainColors.ink400 }),
    paddingTop: 6,
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
  sectionTitleBox: {
    ...PHYSICAL_BOX,
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
  },
  sectionTitle: textStyle('sectionTitle', { color: KhazainColors.inkHeading }),
  historyLoading: {
    ...textStyle('caption', { color: KhazainColors.ink400, textAlign: 'center' }),
    paddingVertical: 24,
  },
});

