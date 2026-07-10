import { completionByWeekday, buildHistoryGrid } from '../services/wirdHistory';

/**
 * Row shape mirrors `khz_days` columns exactly (snake_case), the same shape the
 * repository layer returns. `r()` honours the invariant
 * `wird_completed = (pages_read >= wird_target_at_day)` at every seed so the
 * fixtures cannot drift from real write-path data.
 */
type Row = {
  local_day: string;
  pages_read: number;
  wird_target_at_day: number;
  wird_completed: number;
};
const r = (local_day: string, pages_read: number, wird_target_at_day: number): Row => ({
  local_day,
  pages_read,
  wird_target_at_day,
  wird_completed: pages_read >= wird_target_at_day ? 1 : 0,
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/** Noon-UTC stepper — DST-immune. Independent re-implementation for the test. */
function daysBetween(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const end = Date.UTC(ty, tm - 1, td, 12, 0, 0);
  const out: string[] = [];
  for (let ms = start; ms <= end; ms += ONE_DAY_MS) {
    const dt = new Date(ms);
    out.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
        dt.getUTCDate(),
      ).padStart(2, '0')}`,
    );
  }
  return out;
}

// Verified weekdays (see Node computation in the task log):
//   2025-07-05 Sat · 07-06 Sun · 07-07 Mon · 07-08 Tue · 07-09 Wed · 07-10 Thu · 07-11 Fri

describe('completionByWeekday (T078)', () => {
  it('returns 7 Saturday-first buckets; an unread day AFTER the first row counts as missed', () => {
    const rows: Row[] = [
      r('2025-07-05', 10, 5), // Sat — completed; FIRST row
      r('2025-07-12', 2, 5), //  Sat — not completed
      r('2025-07-09', 8, 5), //  Wed — completed
      r('2025-07-10', 1, 5), //  Thu — not completed
    ];

    // Sat 07-05 .. Sat 07-12 inclusive.
    const buckets = completionByWeekday(rows, { from: '2025-07-05', to: '2025-07-12' });

    expect(buckets).toHaveLength(7);
    // Order: Sat, Sun, Mon, Tue, Wed, Thu, Fri.
    // Sun/Mon/Tue/Fri have NO rows, but they fall after the first recorded day,
    // so they are genuine misses — not "no data". That is the point of the view.
    expect(buckets[0]).toEqual({ completed: 1, total: 2, rate: 0.5 }); // Sat: 05 ✓, 12 ✗
    expect(buckets[1]).toEqual({ completed: 0, total: 1, rate: 0 }); //   Sun 06 missed
    expect(buckets[2]).toEqual({ completed: 0, total: 1, rate: 0 }); //   Mon 07 missed
    expect(buckets[3]).toEqual({ completed: 0, total: 1, rate: 0 }); //   Tue 08 missed
    expect(buckets[4]).toEqual({ completed: 1, total: 1, rate: 1 }); //   Wed 09 ✓
    expect(buckets[5]).toEqual({ completed: 0, total: 1, rate: 0 }); //   Thu 10 ✗
    expect(buckets[6]).toEqual({ completed: 0, total: 1, rate: 0 }); //   Fri 11 missed
  });
});

describe('buildHistoryGrid (T079)', () => {
  it('emits Saturday-first weeks; a day before the first row is no-data, never missed', () => {
    const rows: Row[] = [
      r('2025-07-05', 10, 5), // Sat — completed; this is the FIRST row
      r('2025-07-08', 2, 5), //  Tue — has a row but not completed → missed
    ];
    // Range starts 2 days BEFORE the first row (2025-07-03 Thu) through 07-11 Fri.
    const weeks = buildHistoryGrid(rows, { from: '2025-07-03', to: '2025-07-11' });

    expect(weeks).toHaveLength(2);
    expect(weeks.every((w) => w.length === 7)).toBe(true);

    // Week 1: Thu(2025-07-03) sits at Saturday-first column index 5, so columns
    // 0..4 are structural pad cells (null local_day).
    const week1 = weeks[0];
    for (let i = 0; i < 5; i += 1) {
      expect(week1[i].localDay).toBeNull();
      expect(week1[i].state).toBe('no-data');
    }
    // 2025-07-03 / 07-04 precede the first row → no-data, NOT missed.
    expect(week1[5].localDay).toBe('2025-07-03');
    expect(week1[5].state).toBe('no-data');
    expect(week1[6].localDay).toBe('2025-07-04');
    expect(week1[6].state).toBe('no-data');

    const week2 = weeks[1];
    expect(week2[0].localDay).toBe('2025-07-05');
    expect(week2[0].weekday).toBe(0); // Saturday is index 0
    expect(week2[0].state).toBe('completed');
    expect(week2[1].localDay).toBe('2025-07-06'); // Sun, no row, after first row
    expect(week2[1].state).toBe('missed');
    expect(week2[3].localDay).toBe('2025-07-08'); // Tue, has row, not completed
    expect(week2[3].state).toBe('missed');
    expect(week2[6].localDay).toBe('2025-07-11'); // Fri
    expect(week2[6].weekday).toBe(6);
  });

  it('with no rows at all, every real cell is no-data (empty-history signal)', () => {
    const weeks = buildHistoryGrid([], { from: '2025-07-05', to: '2025-07-11' });
    const real = weeks.flat().filter((c) => c.localDay !== null);
    expect(real).toHaveLength(7);
    expect(real.every((c) => c.state === 'no-data')).toBe(true);
  });
});

describe('buildHistoryGrid DST guard (T080)', () => {
  it('spans spring-forward and fall-back with no skipped/duplicated day; every local_day unique and contiguous', () => {
    // 2025-03-09 is US spring-forward; 2025-11-02 is US fall-back. Range covers both.
    const from = '2025-03-01';
    const to = '2025-11-30';
    const weeks = buildHistoryGrid([], { from, to });

    const emitted = weeks
      .flat()
      .map((c) => c.localDay)
      .filter((d): d is string => d !== null);

    const expected = daysBetween(from, to);

    // No day skipped or duplicated.
    expect(emitted).toEqual(expected);
    // Unique.
    expect(new Set(emitted).size).toBe(emitted.length);
    // Contiguous: every step is exactly +1 day.
    for (let i = 1; i < emitted.length; i += 1) {
      const prev = new Date(`${emitted[i - 1]}T12:00:00Z`).getTime();
      const cur = new Date(`${emitted[i]}T12:00:00Z`).getTime();
      expect(cur - prev).toBe(ONE_DAY_MS);
    }
  });
});

describe('per-row target regression guard (T081)', () => {
  it("judges a day completed when pages_read >= wird_target_at_day, regardless of any later/live target", () => {
    // The day was completed at a 5-page goal. The pure functions receive ONLY
    // the per-row snapshot — no live target parameter exists — so raising the
    // goal to 20 afterwards can never retroactively un-complete this day.
    const rows: Row[] = [r('2025-07-09', 5, 5)]; // Wed — pages == target → completed

    const weeks = buildHistoryGrid(rows, { from: '2025-07-09', to: '2025-07-09' });
    const cell = weeks.flat().find((c) => c.localDay === '2025-07-09');
    expect(cell?.state).toBe('completed');

    const buckets = completionByWeekday(rows, { from: '2025-07-09', to: '2025-07-09' });
    expect(buckets[4]).toEqual({ completed: 1, total: 1, rate: 1 }); // Wed
  });
});

// ---------------------------------------------------------------------------
// T-WBW — the primary view must SURFACE the pattern, not hide it.
//
// Review finding: counting only days that HAVE a row means a user who never
// opens the app on Thursday has zero Thursday rows, so Thursday renders as
// "no data" rather than 0%. The person who "always misses Thursdays" — the
// exact user this feature was built for — sees their Thursdays vanish.
//
// A weekday must count every calendar day in the window from the user's first
// recorded day onward. Days before that are genuinely unknowable and excluded.
// ---------------------------------------------------------------------------
describe('T-WBW — completionByWeekday counts missed days, not just engaged ones', () => {
  // 2026-07-04 is a Saturday. Four full weeks, Sat 2026-07-04 .. Fri 2026-07-31.
  const RANGE = { from: '2026-07-04', to: '2026-07-31' };
  // Thursdays in that span: 07-09, 07-16, 07-23, 07-30.
  const THURSDAYS = ['2026-07-09', '2026-07-16', '2026-07-23', '2026-07-30'];

  function everyDayExceptThursdays(): { local_day: string; pages_read: number; wird_target_at_day: number; wird_completed: number }[] {
    const out = [];
    const d = new Date(Date.UTC(2026, 6, 4, 12));
    const end = new Date(Date.UTC(2026, 6, 31, 12));
    while (d <= end) {
      const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      if (!THURSDAYS.includes(day)) {
        out.push({ local_day: day, pages_read: 10, wird_target_at_day: 10, wird_completed: 1 });
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }

  it('T-WBW-1: a never-read weekday reports 0%, not "no data"', () => {
    const buckets = completionByWeekday(everyDayExceptThursdays(), RANGE);
    // Saturday-first indexing: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6.
    const thursday = buckets[5];
    expect(thursday.total).toBe(4); // four Thursdays fell inside the window
    expect(thursday.completed).toBe(0);
    expect(thursday.rate).toBe(0);
  });

  it('T-WBW-2: a fully-read weekday still reports 100%', () => {
    const buckets = completionByWeekday(everyDayExceptThursdays(), RANGE);
    expect(buckets[0].completed).toBe(4);
    expect(buckets[0].rate).toBe(1);
  });

  it('T-WBW-3: days before the first-ever row are excluded from the denominator', () => {
    // Only one row, on the last Saturday. Earlier Saturdays are unknowable.
    const rows = [{ local_day: '2026-07-25', pages_read: 10, wird_target_at_day: 10, wird_completed: 1 }];
    const buckets = completionByWeekday(rows, RANGE);
    expect(buckets[0].total).toBe(1); // only 2026-07-25, not the three prior Saturdays
    expect(buckets[0].rate).toBe(1);
  });
});
