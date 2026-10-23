/**
 * Pure view decisions for the Library tab, kept out of the screen so they are
 * tested as behaviour rather than read off the source text.
 */
import type { ReminderSummary } from '@/components/khazain/library/ReminderCard';
import type { NotificationCategory } from '@/services/notificationRegistry';
import { wirdReminderDescription } from '@/services/libraryStats';
import {
  describeWirdReminder,
  formatNextWirdReminder,
  isWirdReminderArmed,
  type NotificationPermission,
} from '@/services/wirdReminder';
import type { LibraryFilterId } from '@/types/content';
import type { NotificationCategoryId, TimeOfDay } from '@/types/settings';

/**
 * One card per shipped reminder. A card is armed only when the user wants it
 * AND the OS permits it — the stored preference alone defaults to on and would
 * advertise reminders that can never fire. The stat card counts these cards.
 */
export function buildSmartReminders(input: {
  categories: readonly NotificationCategory[];
  isEnabled: (id: NotificationCategoryId) => boolean;
  permission: NotificationPermission;
  now: Date;
  wirdTime: TimeOfDay;
  goalMetToday: boolean;
  trend: readonly { pagesRead: number }[];
  totalPagesRead: number;
  onToggle: (id: NotificationCategoryId, next: boolean) => void;
}): ReminderSummary[] {
  return input.categories
    .filter((c) => c.available)
    .map((c): ReminderSummary => {
      const armed = isWirdReminderArmed(input.isEnabled(c.id), input.permission);
      const base = {
        id: c.id,
        labelAr: c.libraryLabelAr ?? c.labelAr,
        armed,
        onToggle: (next: boolean) => input.onToggle(c.id, next),
      };
      if (c.id !== 'wird-daily') return { ...base, descriptionAr: c.descriptionAr };
      const state = describeWirdReminder(input.now, input.wirdTime, {
        enabled: input.isEnabled(c.id),
        permission: input.permission,
        goalMetToday: input.goalMetToday,
      });
      return {
        ...base,
        descriptionAr: wirdReminderDescription(input.trend, c.descriptionAr, input.totalPagesRead),
        nextLabel: armed
          ? // «غداً» as the frame writes it (node 2031:4659).
            formatNextWirdReminder(input.now, input.wirdTime, input.goalMetToday, 'التذكير التالي')
          : undefined,
        statusLabel: armed ? undefined : state.caption,
      };
    });
}

export type AudiobookView = {
  inProgress: boolean;
  completed: boolean;
  /** Which empty card to show when no real card is shown. */
  empty: 'browse' | 'completed' | null;
};

/**
 * What the audiobook section shows. Under المكتمل it is the completed card
 * alone (or its own empty state); elsewhere whichever real cards exist, and the
 * browse card only when there is neither.
 */
export function audiobookCardsFor(
  filter: LibraryFilterId,
  inProgress: unknown | null,
  completed: unknown | null,
): AudiobookView {
  if (filter === 'completed') {
    return completed
      ? { inProgress: false, completed: true, empty: null }
      : { inProgress: false, completed: false, empty: 'completed' };
  }
  const hasIn = Boolean(inProgress);
  const hasDone = Boolean(completed);
  return {
    inProgress: hasIn,
    completed: hasDone,
    empty: hasIn || hasDone ? null : 'browse',
  };
}

/**
 * `isEnabled` derived from the subscribed `notifications` map (not a snapshot
 * read), so a component that selects the whole map re-renders on any toggle.
 * A missing key falls back to the category's registered default.
 */
export function enabledFromMap(
  categories: readonly NotificationCategory[],
  stored: Partial<Record<NotificationCategoryId, boolean>>,
): (id: NotificationCategoryId) => boolean {
  return (id) => {
    const v = stored[id];
    if (typeof v === 'boolean') return v;
    return categories.find((c) => c.id === id)?.defaultOn ?? false;
  };
}

/**
 * Single-flight guard: runs `task` unless `key` is already pending (returns
 * null). The key is released when the task settles; a rejection goes to
 * `onError` and never escapes.
 */
export function runSingleFlight<K>(
  pending: Set<K>,
  key: K,
  task: () => Promise<unknown>,
  onError?: (err: unknown) => void,
): Promise<void> | null {
  if (pending.has(key)) return null;
  pending.add(key);
  // The executor runs task() synchronously (so it starts now) and turns a
  // synchronous throw into a rejection that the catch below handles.
  return new Promise<unknown>((resolve) => resolve(task()))
    .then(() => undefined)
    .catch((err) => onError?.(err))
    .finally(() => {
      pending.delete(key);
    });
}
