/**
 * Public types for the progress-tracking DB layer. These mirror the
 * design-time contract in `specs/001-progress-tracking/contracts/` — app code
 * imports from here.
 */

export type LocalDay = string; // 'YYYY-MM-DD'

export type AchievementId =
  | `juz_completed_${number}`
  | `streak_${7 | 30 | 100}`
  | 'wird_perfect_week';

export type DaySummary = {
  localDay: LocalDay;
  pagesRead: number;
  wirdTargetAtDay: number;
  wirdCompleted: boolean;
};

export type LectureSession = {
  lectureId: string;
  title: string;
  author: string;
  durationSec: number;
  positionSec: number;
  forwardListenedSec: number;
  completed: boolean;
  lastListenedAt: number;
};

export type TrendPoint = {
  localDay: LocalDay;
  pagesRead: number;
};

/**
 * Raw `khz_days` row (snake_case, mirrors the SQLite columns) for the wird
 * completion-history view. Deliberately NOT camelCased: it flows straight from
 * the repository into the pure `services/wirdHistory` selectors, which read
 * `wird_completed` per row so a day stays judged against the goal in force
 * THAT day (`wird_target_at_day`) — never the live target.
 */
export type DayCompletionRow = {
  local_day: LocalDay;
  pages_read: number;
  wird_target_at_day: number;
  wird_completed: number; // 0 | 1
};

export type SuggestionDecision = {
  shouldSuggest: boolean;
  suggestedTarget: number;
  medianRecentPages: number;
  reason: 'eligible' | 'cooldown' | 'insufficient_history' | 'below_threshold';
};

export interface PageReadsRepository {
  recordPageRead(pageNumber: number): Promise<boolean>;
  pagesReadToday(): Promise<number>;
  pagesReadInMonth(yearMonth?: string): Promise<number>;
  currentStreak(): Promise<number>;
  completedJuzCount(): Promise<number>;
  longestStreakEver(): Promise<number>;
  bestWirdDay(): Promise<DaySummary | null>;
  trendLastNDays(n: number): Promise<TrendPoint[]>;
  evaluateWirdSuggestion(currentTarget: number): Promise<SuggestionDecision>;
  setLastReadPage(page: number): Promise<void>;
  getLastReadPage(): Promise<number>;
  /**
   * Local days (inclusive range) whose wird goal was met — i.e.
   * `khz_days.wird_completed = 1`. Consumed by the notification-horizon
   * orchestrator so a completed day emits no wird reminder (FR-028).
   */
  completedDaysInRange(fromLocalDay: string, toLocalDay: string): Promise<string[]>;
  /**
   * Raw `khz_days` rows (inclusive range, ascending) for the completion-history
   * view (US5, FR-055/FR-058). Returns the per-row `wird_target_at_day` /
   * `wird_completed` snapshot so history is judged against the goal in force
   * that day, never the live target. Consumed by `services/wirdHistory`.
   */
  dayCompletionsInRange(
    fromLocalDay: string,
    toLocalDay: string,
  ): Promise<DayCompletionRow[]>;
}

export interface LectureSessionsRepository {
  upsertSession(input: {
    lectureId: string;
    title: string;
    author: string;
    durationSec: number;
    positionSec: number;
    forwardListenedDelta: number;
    nowMs: number;
  }): Promise<LectureSession>;
  findInProgress(): Promise<LectureSession | null>;
  completedCount(): Promise<number>;
  totalListenedSec(): Promise<number>;
}

export interface WirdRepository {
  /**
   * Reads the current wird target. If a pending target was scheduled for a
   * previous day (FR-007c: "from next calendar day"), this promotes it to
   * the active target before returning. Idempotent.
   */
  getTarget(): Promise<number>;
  /**
   * Writes a new wird target.
   *
   * - `applyToday: true` (default — manual settings edit, FR-007a): updates
   *   the active target AND today's `khz_days.wird_target_at_day` snapshot
   *   if today's row exists. Historical days are untouched.
   *
   * - `applyToday: false` (accept-suggestion path, FR-007c): stores the new
   *   target as PENDING with effective day = tomorrow. `getTarget()` rolls
   *   it over once the local day advances. Today's progress is preserved
   *   against the OLD target so the user does not see today regress.
   */
  setTarget(target: number, opts?: { applyToday?: boolean }): Promise<void>;
  recordSuggestionInteraction(nowMs: number): Promise<void>;
  getLastSuggestionAt(): Promise<number | null>;
}

export interface AchievementsRepository {
  unlock(id: AchievementId, nowMs: number): Promise<boolean>;
  has(id: AchievementId): Promise<boolean>;
  list(): Promise<{ id: AchievementId; unlockedAt: number }[]>;
  evaluateAll(): Promise<AchievementId[]>;
}

export interface ProgressResetFacade {
  resetAll(nowMs: number): Promise<void>;
}

export type Repos = {
  pageReads: PageReadsRepository;
  lectureSessions: LectureSessionsRepository;
  wird: WirdRepository;
  achievements: AchievementsRepository;
  reset: ProgressResetFacade;
};
