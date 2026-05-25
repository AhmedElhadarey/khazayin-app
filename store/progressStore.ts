/**
 * Read-mostly progress snapshot for the Library tab. NOT persisted via zustand
 * middleware — SQLite (or the web shim) is the source of truth. Actions call
 * into the repositories then refresh the affected snapshot fields.
 *
 * Hydrated once at app boot from `app/_layout.tsx`.
 */

import { create } from 'zustand';
import { TREND_DAYS, toArabicDigits, toLocalDay } from '@/constants/progress';
import {
  achievementsRepo,
  getRepos,
  lectureRepo,
  progressRepo,
} from '@/db';
import type { AchievementId, LectureSession, TrendPoint } from '@/db/types';
import { useToastStore } from './toastStore';
import { useWirdStore } from './wirdStore';

const ACHIEVEMENT_COPY: Partial<Record<AchievementId, string>> = {
  streak_7: '٧ أيام متتالية',
  streak_30: '٣٠ يوم متتالي ✨',
  streak_100: '١٠٠ يوم ❤️',
  wird_perfect_week: 'أسبوع كامل من الورد ✓',
};

function achievementToastTitle(id: AchievementId): string {
  if (id.startsWith('juz_completed_')) {
    const n = Number(id.slice('juz_completed_'.length));
    return `أكملت الجزء ${toArabicDigits(n)}`;
  }
  return ACHIEVEMENT_COPY[id] ?? id;
}

export type ProgressSnapshot = {
  pagesReadThisMonth: number;
  pagesReadLastMonth: number;
  currentStreak: number;
  completedJuzCount: number;
  pagesToday: number;
  longestStreakEver: number;
  bestWirdDayPages: number;
  trendLast28: TrendPoint[];

  inProgressLecture: LectureSession | null;
  totalListenedMinutes: number;
  completedLectureCount: number;

  ready: boolean;
};

function previousMonthString(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export type ProgressStoreActions = {
  hydrate(): Promise<void>;
  notePageRead(pageNumber: number): Promise<void>;
  noteLectureTick(input: {
    lectureId: string;
    title: string;
    author: string;
    durationSec: number;
    positionSec: number;
    forwardListenedDelta: number;
  }): Promise<void>;
  refreshWird(): Promise<void>;
  refreshAll(): Promise<void>;
};

const EMPTY: ProgressSnapshot = {
  pagesReadThisMonth: 0,
  pagesReadLastMonth: 0,
  currentStreak: 0,
  completedJuzCount: 0,
  pagesToday: 0,
  longestStreakEver: 0,
  bestWirdDayPages: 0,
  trendLast28: [],
  inProgressLecture: null,
  totalListenedMinutes: 0,
  completedLectureCount: 0,
  ready: false,
};

// Serialize notePageRead calls so achievement evaluation never interleaves
// (web-shim uses a non-transactional in-memory store; two concurrent calls
// could otherwise double-insert the same achievement).
let _notePageQueue: Promise<void> = Promise.resolve();

// Throttle lecture-tick snapshot refresh to once per LECTURE_TICK_REFRESH_MS.
// Position is written every tick (correctness), but the Library StatCards
// (completed-count, total-listened, in-progress card) don't need 1Hz updates.
const LECTURE_TICK_REFRESH_MS = 5000;
let _lastLectureRefreshAt = 0;

export const useProgressStore = create<ProgressSnapshot & ProgressStoreActions>(
  (set, get) => ({
    ...EMPTY,

    async hydrate() {
      await getRepos();
      const [
        pagesToday,
        pagesReadThisMonth,
        pagesReadLastMonth,
        currentStreak,
        completedJuzCount,
        longestStreakEver,
        bestWirdDay,
        trendLast28,
        inProgressLecture,
        totalListenedSec,
        completedLectureCount,
      ] = await Promise.all([
        progressRepo.pagesReadToday(),
        progressRepo.pagesReadInMonth(),
        progressRepo.pagesReadInMonth(previousMonthString()),
        progressRepo.currentStreak(),
        progressRepo.completedJuzCount(),
        progressRepo.longestStreakEver(),
        progressRepo.bestWirdDay(),
        progressRepo.trendLastNDays(TREND_DAYS),
        lectureRepo.findInProgress(),
        lectureRepo.totalListenedSec(),
        lectureRepo.completedCount(),
      ]);
      set({
        pagesToday,
        pagesReadThisMonth,
        pagesReadLastMonth,
        currentStreak,
        completedJuzCount,
        longestStreakEver,
        bestWirdDayPages: bestWirdDay?.pagesRead ?? 0,
        trendLast28,
        inProgressLecture,
        totalListenedMinutes: Math.floor(totalListenedSec / 60),
        completedLectureCount,
        ready: true,
      });
    },

    notePageRead(pageNumber) {
      const job = _notePageQueue.then(async () => {
        const inserted = await progressRepo.recordPageRead(pageNumber);
        if (!inserted) return;
        const [
          pagesToday,
          pagesReadThisMonth,
          currentStreak,
          completedJuzCount,
          longestStreakEver,
          bestWirdDay,
          trendLast28,
        ] = await Promise.all([
          progressRepo.pagesReadToday(),
          progressRepo.pagesReadInMonth(),
          progressRepo.currentStreak(),
          progressRepo.completedJuzCount(),
          progressRepo.longestStreakEver(),
          progressRepo.bestWirdDay(),
          progressRepo.trendLastNDays(TREND_DAYS),
        ]);
        set({
          pagesToday,
          pagesReadThisMonth,
          currentStreak,
          completedJuzCount,
          longestStreakEver,
          bestWirdDayPages: bestWirdDay?.pagesRead ?? 0,
          trendLast28,
        });
        await useWirdStore.getState().recomputeTodayPct();
        await useWirdStore.getState().reevaluateSuggestion();

        try {
          const newly = await achievementsRepo.evaluateAll();
          for (const id of newly) {
            useToastStore.getState().show({
              message: achievementToastTitle(id),
              variant: 'achievement',
              durationMs: 4500,
            });
          }
        } catch (err) {
          console.warn('[progressStore] achievement eval failed', err);
        }
      });
      _notePageQueue = job.catch(() => undefined);
      return job;
    },

    async noteLectureTick(input) {
      await lectureRepo.upsertSession({ ...input, nowMs: Date.now() });
      // Position is always persisted (above). The Library snapshot only
      // refreshes at most once per LECTURE_TICK_REFRESH_MS — every audio
      // tick otherwise issues 3 extra SELECTs that don't visibly change
      // the UI.
      const now = Date.now();
      if (now - _lastLectureRefreshAt < LECTURE_TICK_REFRESH_MS) return;
      _lastLectureRefreshAt = now;
      const [inProgressLecture, totalListenedSec, completedLectureCount] =
        await Promise.all([
          lectureRepo.findInProgress(),
          lectureRepo.totalListenedSec(),
          lectureRepo.completedCount(),
        ]);
      set({
        inProgressLecture,
        totalListenedMinutes: Math.floor(totalListenedSec / 60),
        completedLectureCount,
      });
    },

    async refreshWird() {
      const [pagesToday] = await Promise.all([progressRepo.pagesReadToday()]);
      set({ pagesToday });
    },

    async refreshAll() {
      _lastLectureRefreshAt = 0;
      set({ ...EMPTY });
      await get().hydrate();
    },
  }),
);

// expose today() for selectors that need the local day
export { toLocalDay };
