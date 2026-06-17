/**
 * Web/no-SQLite fallback. Implements the same `Repos` surface as the native
 * repositories but backed by AsyncStorage. Loads the dataset once into
 * memory and throttle-flushes writes (research R2).
 *
 * Not intended for primary user data — design QA / web preview only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BEGINNER_WIRD,
  MAX_WIRD,
  MIN_WIRD,
  STREAK_MILESTONES,
  nextLocalDay,
  toLocalDay,
} from '@/constants/progress';
import { hasPerfectWirdWeek, shiftDay } from './helpers/calendar';
import { completedJuzList, countCompletedJuz } from './helpers/juz';
import { isCompleted } from './helpers/lectureCompletion';
import { median } from './helpers/median';
import { computeCurrentStreak, computeLongestStreak } from './helpers/streak';
import { decideSuggestion } from './helpers/suggestion';
import type {
  AchievementId,
  AchievementsRepository,
  DaySummary,
  LectureSession,
  LectureSessionsRepository,
  PageReadsRepository,
  ProgressResetFacade,
  Repos,
  TrendPoint,
  WirdRepository,
} from './types';

const STORAGE_KEY = '@khazain/progress-shim';

type ShimState = {
  pageReads: { localDay: string; pageNumber: number; recordedAt: number }[];
  days: Record<string, {
    pagesRead: number;
    wirdTargetAtDay: number;
    wirdCompleted: 0 | 1;
  }>;
  lectures: Record<string, LectureSession>;
  achievements: { id: AchievementId; unlockedAt: number }[];
  settings: {
    wird_target: number;
    last_read_page: number;
    last_suggestion_at: number | null;
    last_reset_at: number | null;
    pending_wird_target: number | null;
    pending_wird_target_effective_day: string | null;
  };
};

function emptyState(): ShimState {
  return {
    pageReads: [],
    days: {},
    lectures: {},
    achievements: [],
    settings: {
      wird_target: BEGINNER_WIRD,
      last_read_page: 1,
      last_suggestion_at: null,
      last_reset_at: null,
      pending_wird_target: null,
      pending_wird_target_effective_day: null,
    },
  };
}

function promotePendingIfDue(s: ShimState, today: string): number {
  const { pending_wird_target, pending_wird_target_effective_day } = s.settings;
  if (
    pending_wird_target !== null &&
    pending_wird_target_effective_day !== null &&
    today >= pending_wird_target_effective_day
  ) {
    s.settings.wird_target = pending_wird_target;
    s.settings.pending_wird_target = null;
    s.settings.pending_wird_target_effective_day = null;
  }
  return s.settings.wird_target;
}

let cache: ShimState | null = null;
let loadPromise: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Test utility — never call from app code. */
export function __resetWebShimForTesting(): void {
  cache = null;
  loadPromise = null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

async function load(): Promise<void> {
  if (cache) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = emptyState();
      return;
    }
    try {
      cache = { ...emptyState(), ...(JSON.parse(raw) as Partial<ShimState>) };
    } catch {
      cache = emptyState();
    }
  })().catch((err: unknown) => {
    // Don't cache a rejected load (e.g. AsyncStorage.getItem rejecting) — clear
    // so the next op retries instead of replaying the failure forever.
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (cache) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch(() => undefined);
    }
  }, 250);
}

function padWindow(today: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(shiftDay(today, -i));
  }
  return out;
}

function ensure(): ShimState {
  if (!cache) throw new Error('[web-shim] not loaded — call load() before any op');
  return cache;
}

export function createWebRepos(): Repos {
  const pageReads: PageReadsRepository = {
    async recordPageRead(pageNumber) {
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
        throw new Error(`[pageReads] invalid pageNumber=${pageNumber}`);
      }
      await load();
      const s = ensure();
      const localDay = toLocalDay();
      const exists = s.pageReads.some(
        (r) => r.localDay === localDay && r.pageNumber === pageNumber,
      );
      if (exists) return false;
      s.pageReads.push({ localDay, pageNumber, recordedAt: Date.now() });
      const target = s.settings.wird_target;
      const existing = s.days[localDay];
      if (!existing) {
        s.days[localDay] = {
          pagesRead: 1,
          wirdTargetAtDay: target,
          wirdCompleted: 1 >= target ? 1 : 0,
        };
      } else {
        existing.pagesRead += 1;
        existing.wirdCompleted = existing.pagesRead >= existing.wirdTargetAtDay ? 1 : 0;
      }
      s.settings.last_read_page = pageNumber;
      scheduleFlush();
      return true;
    },

    async pagesReadToday() {
      await load();
      return ensure().days[toLocalDay()]?.pagesRead ?? 0;
    },

    async pagesReadInMonth(yearMonth) {
      await load();
      const ym = yearMonth ?? toLocalDay().slice(0, 7);
      let total = 0;
      for (const [day, info] of Object.entries(ensure().days)) {
        if (day.startsWith(`${ym}-`)) total += info.pagesRead;
      }
      return total;
    },

    async currentStreak() {
      await load();
      const days = Object.entries(ensure().days)
        .filter(([, v]) => v.pagesRead > 0)
        .map(([k]) => k);
      return computeCurrentStreak(days, toLocalDay());
    },

    async completedJuzCount() {
      await load();
      const pages = ensure().pageReads.map((r) => r.pageNumber);
      return countCompletedJuz(pages);
    },

    async longestStreakEver() {
      await load();
      const days = Object.entries(ensure().days)
        .filter(([, v]) => v.pagesRead > 0)
        .map(([k]) => k);
      return computeLongestStreak(days);
    },

    async bestWirdDay(): Promise<DaySummary | null> {
      await load();
      const entries = Object.entries(ensure().days);
      if (entries.length === 0) return null;
      let best: [string, ShimState['days'][string]] | null = null;
      for (const e of entries) {
        if (e[1].pagesRead === 0) continue;
        if (!best || e[1].pagesRead > best[1].pagesRead) best = e;
      }
      if (!best) return null;
      return {
        localDay: best[0],
        pagesRead: best[1].pagesRead,
        wirdTargetAtDay: best[1].wirdTargetAtDay,
        wirdCompleted: best[1].wirdCompleted === 1,
      };
    },

    async trendLastNDays(n): Promise<TrendPoint[]> {
      await load();
      const days = padWindow(toLocalDay(), n);
      const dayMap = ensure().days;
      return days.map((d) => ({ localDay: d, pagesRead: dayMap[d]?.pagesRead ?? 0 }));
    },

    async evaluateWirdSuggestion(currentTarget) {
      await load();
      const s = ensure();
      const sortedDays = Object.entries(s.days)
        .filter(([, v]) => v.pagesRead > 0)
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, 14)
        .map(([, v]) => v.pagesRead);
      return decideSuggestion({
        recentActivePages: sortedDays,
        currentTarget,
        lastSuggestionAtMs: s.settings.last_suggestion_at,
        nowMs: Date.now(),
      });
    },

    async setLastReadPage(page) {
      if (!Number.isInteger(page) || page < 1 || page > 604) return;
      await load();
      ensure().settings.last_read_page = page;
      scheduleFlush();
    },

    async getLastReadPage() {
      await load();
      return ensure().settings.last_read_page || 1;
    },
  };

  const lectureSessions: LectureSessionsRepository = {
    async upsertSession(input) {
      await load();
      const s = ensure();
      const delta = input.forwardListenedDelta > 0 ? input.forwardListenedDelta : 0;
      const positionSec = Math.max(0, Math.min(input.durationSec, input.positionSec));
      const newlyCompleted = isCompleted(positionSec, input.durationSec);
      const prev = s.lectures[input.lectureId];
      const nextForward = Math.min(
        (prev?.forwardListenedSec ?? 0) + delta,
        input.durationSec,
      );
      const session: LectureSession = {
        lectureId: input.lectureId,
        title: input.title,
        author: input.author,
        durationSec: input.durationSec,
        positionSec,
        forwardListenedSec: nextForward,
        completed: prev?.completed === true || newlyCompleted,
        lastListenedAt: input.nowMs,
      };
      s.lectures[input.lectureId] = session;
      scheduleFlush();
      return session;
    },

    async findInProgress() {
      await load();
      const candidates = Object.values(ensure().lectures).filter(
        (l) => !l.completed && l.positionSec > 0,
      );
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.lastListenedAt - a.lastListenedAt);
      return candidates[0];
    },

    async completedCount() {
      await load();
      return Object.values(ensure().lectures).filter((l) => l.completed).length;
    },

    async totalListenedSec() {
      await load();
      return Object.values(ensure().lectures).reduce(
        (acc, l) => acc + l.forwardListenedSec,
        0,
      );
    },
  };

  const wird: WirdRepository = {
    async getTarget() {
      await load();
      const s = ensure();
      const promoted = promotePendingIfDue(s, toLocalDay());
      scheduleFlush();
      return promoted;
    },
    async setTarget(target, opts) {
      if (!Number.isInteger(target) || target < MIN_WIRD || target > MAX_WIRD) {
        throw new Error(`[wird] invalid target=${target}`);
      }
      await load();
      const s = ensure();
      const today = toLocalDay();
      const applyToday = opts?.applyToday ?? true;

      if (!applyToday) {
        // FR-007c: schedule for tomorrow; today's snapshot stays put.
        s.settings.pending_wird_target = target;
        s.settings.pending_wird_target_effective_day = nextLocalDay(today);
        scheduleFlush();
        return;
      }

      s.settings.wird_target = target;
      s.settings.pending_wird_target = null;
      s.settings.pending_wird_target_effective_day = null;
      if (s.days[today]) {
        s.days[today].wirdTargetAtDay = target;
        s.days[today].wirdCompleted = s.days[today].pagesRead >= target ? 1 : 0;
      }
      scheduleFlush();
    },
    async recordSuggestionInteraction(nowMs) {
      await load();
      ensure().settings.last_suggestion_at = nowMs;
      scheduleFlush();
    },
    async getLastSuggestionAt() {
      await load();
      return ensure().settings.last_suggestion_at;
    },
  };

  const achievements: AchievementsRepository = {
    async unlock(id, nowMs) {
      await load();
      const s = ensure();
      if (s.achievements.some((a) => a.id === id)) return false;
      s.achievements.push({ id, unlockedAt: nowMs });
      scheduleFlush();
      return true;
    },
    async has(id) {
      await load();
      return ensure().achievements.some((a) => a.id === id);
    },
    async list() {
      await load();
      return [...ensure().achievements].sort((a, b) => a.unlockedAt - b.unlockedAt);
    },
    async evaluateAll() {
      await load();
      const s = ensure();
      const newly: AchievementId[] = [];
      const nowMs = Date.now();

      // Check liveness of `s.achievements` BEFORE every push so two concurrent
      // evaluateAll() calls cannot race-double-insert the same id (the cache
      // is non-transactional; native SQLite handles this via INSERT OR IGNORE).
      const tryUnlock = (id: AchievementId): void => {
        if (s.achievements.some((a) => a.id === id)) return;
        s.achievements.push({ id, unlockedAt: nowMs });
        newly.push(id);
      };

      const completedJuz = completedJuzList(s.pageReads.map((r) => r.pageNumber));
      for (const j of completedJuz) {
        tryUnlock(`juz_completed_${j}` as AchievementId);
      }

      const days = Object.entries(s.days)
        .filter(([, v]) => v.pagesRead > 0)
        .map(([k]) => k);
      const longest = computeLongestStreak(days);
      for (const m of STREAK_MILESTONES) {
        if (longest >= m) {
          tryUnlock(`streak_${m}` as AchievementId);
        }
      }

      const completedDays = Object.entries(s.days)
        .filter(([, v]) => v.wirdCompleted === 1)
        .map(([k]) => k);
      if (hasPerfectWirdWeek(completedDays, toLocalDay())) {
        tryUnlock('wird_perfect_week');
      }

      if (newly.length > 0) scheduleFlush();
      return newly;
    },
  };

  const reset: ProgressResetFacade = {
    async resetAll(nowMs) {
      await load();
      const s = ensure();
      const preservedTarget = s.settings.wird_target;
      cache = {
        ...emptyState(),
        settings: {
          wird_target: preservedTarget,
          last_read_page: 1,
          last_suggestion_at: null,
          last_reset_at: nowMs,
          pending_wird_target: null,
          pending_wird_target_effective_day: null,
        },
      };
      scheduleFlush();
    },
  };

  return { pageReads, lectureSessions, wird, achievements, reset };
}

