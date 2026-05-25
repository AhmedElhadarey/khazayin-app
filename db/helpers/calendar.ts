/**
 * Local-day arithmetic. Shared by `achievements.ts` (native) and `web-shim.ts`
 * so both platforms agree on date math.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function shiftDay(localDay: string, deltaDays: number): string {
  const [y, m, d] = localDay.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d, 12, 0, 0) + deltaDays * ONE_DAY_MS;
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * 7 consecutive days (ending today or yesterday) where every day had
 * `wird_completed = 1`. Used by the `wird_perfect_week` achievement.
 */
export function hasPerfectWirdWeek(
  completedDays: readonly string[],
  today: string,
): boolean {
  if (completedDays.length < 7) return false;
  const set = new Set(completedDays);
  const start = set.has(today) ? today : shiftDay(today, -1);
  for (let i = 0; i < 7; i += 1) {
    if (!set.has(shiftDay(start, -i))) return false;
  }
  return true;
}
