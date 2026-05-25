/**
 * Pure streak math. Tested in `__tests__/streak.test.ts`.
 *
 * Input: sorted list of `local_day` strings present in `khz_days`, plus
 * today's `local_day`. Output: the count of consecutive days ending today
 * or yesterday (spec FR-004 — yesterday-tolerance lets the streak survive
 * a day the user hasn't opened the app yet).
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Returns 'YYYY-MM-DD' shifted by `deltaDays` (negative = earlier). */
function shiftLocalDay(localDay: string, deltaDays: number): string {
  // Parse as UTC noon to dodge DST edges, then format back as YYYY-MM-DD.
  const [y, m, d] = localDay.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d, 12, 0, 0) + deltaDays * ONE_DAY_MS;
  const shifted = new Date(ms);
  const yy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * @param presentDays distinct YYYY-MM-DD strings the user had ≥ 1 page on.
 *                    Order doesn't matter (we Set them).
 * @param today current local day (caller supplies — keeps fn pure).
 */
export function computeCurrentStreak(presentDays: readonly string[], today: string): number {
  if (presentDays.length === 0) return 0;
  const set = new Set(presentDays);

  // FR-004 tolerance: if today wasn't read, start counting from yesterday.
  let cursor = set.has(today) ? today : shiftLocalDay(today, -1);
  if (!set.has(cursor)) return 0;

  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = shiftLocalDay(cursor, -1);
  }
  return count;
}

/** Longest consecutive chain anywhere in history. Insight surface. */
export function computeLongestStreak(presentDays: readonly string[]): number {
  if (presentDays.length === 0) return 0;
  const set = new Set(presentDays);

  let longest = 0;
  for (const day of set) {
    // Only count from chain starts (prev day absent) to keep this O(n).
    const prev = shiftLocalDay(day, -1);
    if (set.has(prev)) continue;
    let cursor = day;
    let len = 0;
    while (set.has(cursor)) {
      len += 1;
      cursor = shiftLocalDay(cursor, 1);
    }
    if (len > longest) longest = len;
  }
  return longest;
}
