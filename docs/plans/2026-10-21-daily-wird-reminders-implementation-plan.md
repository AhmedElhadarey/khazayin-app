# Daily Wird Reminders: Audit Gap Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: use gilfoyle:executing-plans (or the
> CLAUDE.md §4 subagent pattern) to implement this plan task by task. Give each
> implementer the full task text inline. Run the spec review before the quality
> review.

**Goal:** Make the wird reminder fire only when today's goal is not met, and
reset the Library wird ring when the local day changes while the app is still
in memory.

**Architecture:** The wird reminder moves from one repeating `DAILY` trigger to
one-shot `DATE` entries on the existing rolling notification horizon, 14 days
long. Today's entry is dropped once `khz_days.wird_completed = 1`. Every
reschedule goes through the serialised `assembleAndReconcile`. A new mount-once
`useDayRollover` hook re-hydrates the wird and progress stores when the local
day changes: on the transition back to the foreground, and from a midnight
timer while the app is foregrounded. The foreground notification handler gets
an injected suppression predicate as defence in depth.

**Tech Stack:** Expo SDK 54, expo-notifications (DATE triggers), zustand 5,
expo-sqlite repos via `@/db`, Jest (`jest-expo` preset, manual mock
`__mocks__/expo-notifications.ts`).

**Design:** `docs/plans/2026-10-21-daily-wird-reminders-design.md`. Section
references (§) below point there.

**Defaults assumed from the design's open questions:**
- Q1: reverse the descope.
- Q2: 14-day horizon.
- Q3: midnight reset.
- Q4 and Q5: not done.

---

## Ground rules for every task

- Worktree: `/Users/ahmedelhadarey/samer/khazayin-worktrees/wird`. Branch:
  `fix/wird-conditional-reminder`. Never commit to `main`.
- No new dependencies. Never use `--no-verify`. Commit messages carry no
  `Co-Authored-By` line and no AI attribution.
- Per task:
  1. Write the failing test.
  2. `npx jest <file>` and confirm it FAILS for the stated reason.
  3. Implement.
  4. `npx jest <file>` and confirm it passes.
  5. `npx tsc --noEmit --pretty false`.
  6. Run the wird/notification suite:
     `npx jest __tests__/horizonOrchestrator.test.ts __tests__/notificationHorizon __tests__/notificationScheduler __tests__/wird __tests__/horizonRefreshTask.test.ts`
  7. Commit.
- Baseline before Task 1: that suite is 10 suites and 71 tests, all passing
  (checked 2026-10-21).
- Do not touch any JSX or style in `app/(tabs)/library.tsx`. The Library must
  stay pixel-identical to frame 06 (`2031:4659`).

---

### Task 1: Pure helpers — `isWirdGoalMet` and `msUntilNextLocalMidnight` (~30 min)

**Files:**
- Modify: `db/helpers/wirdMath.ts` (append after `wirdPercent`, `:7-13`)
- Modify: `constants/progress.ts` (append after `toLocalDay`, `:162-169`)
- Test: `__tests__/wird-math.test.ts` (append)
- Test: create `__tests__/localMidnight.test.ts`

**Step 1: Write the failing tests**

Append to `__tests__/wird-math.test.ts`:

```ts
import { isWirdGoalMet } from '@/db/helpers/wirdMath';

describe('isWirdGoalMet', () => {
  it('T-GM-1: met exactly at the target', () => {
    expect(isWirdGoalMet(20, 20)).toBe(true);
  });
  it('T-GM-2: NOT met at 199/200 even though wirdPercent rounds it to 100', () => {
    expect(isWirdGoalMet(199, 200)).toBe(false);
  });
  it('T-GM-3: over-reading still counts as met', () => {
    expect(isWirdGoalMet(25, 20)).toBe(true);
  });
  it('T-GM-4: defensive — zero/negative/non-finite target is never met', () => {
    expect(isWirdGoalMet(5, 0)).toBe(false);
    expect(isWirdGoalMet(5, Number.NaN)).toBe(false);
  });
});
```

Create `__tests__/localMidnight.test.ts`:

```ts
import { msUntilNextLocalMidnight } from '@/constants/progress';

describe('msUntilNextLocalMidnight', () => {
  it('T-LM-1: 23:59:00 local is 60s from midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 21, 23, 59, 0, 0))).toBe(60_000);
  });
  it('T-LM-2: exactly 00:00 local returns a full day, never 0', () => {
    const now = new Date(2026, 9, 21, 0, 0, 0, 0);
    const next = new Date(2026, 9, 22, 0, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(next.getTime() - now.getTime());
  });
  it('T-LM-3: crosses a month/year boundary', () => {
    const now = new Date(2026, 11, 31, 12, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(
      new Date(2027, 0, 1, 0, 0, 0, 0).getTime() - now.getTime(),
    );
  });
  it('T-LM-4: always positive and at most ~25h (DST-safe)', () => {
    const ms = msUntilNextLocalMidnight(new Date());
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(25 * 3600_000);
  });
});
```

**Step 2:** Run `npx jest __tests__/wird-math.test.ts __tests__/localMidnight.test.ts`.
Expected: FAIL with "isWirdGoalMet is not a function" and
"msUntilNextLocalMidnight is not a function".

**Step 3: Implement**

```ts
// db/helpers/wirdMath.ts
/**
 * "Today's goal is met". Deliberately NOT `wirdPercent(...) === 100`:
 * wirdPercent rounds, so 199/200 renders as 100% but is not complete. Matches
 * the `khz_days.wird_completed` rule in `recordPageRead` (pages_read >= target).
 */
export function isWirdGoalMet(pagesRead: number, target: number): boolean {
  if (!Number.isFinite(target) || target <= 0) return false;
  if (!Number.isFinite(pagesRead)) return false;
  return pagesRead >= target;
}

// constants/progress.ts
/** Milliseconds until the next LOCAL midnight. Built from local components so
 *  23h/25h DST days are correct. Never returns 0. */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}
```

**Step 4:** Re-run both test files and confirm PASS. Then run tsc.

**Step 5: Commit**

```bash
git add db/helpers/wirdMath.ts constants/progress.ts __tests__/wird-math.test.ts __tests__/localMidnight.test.ts
git commit -m "feat(wird): add goal-met predicate and next-local-midnight helper"
```

---

### Task 2: `computeHorizon` emits wird DATE entries on a 14-day horizon (~1.5 h)

**Files:**
- Modify: `services/notificationHorizon.ts`:
  - `:16-20` imports (`TimeOfDay`)
  - `:32-39` `HorizonInput`
  - `:45-69` budget
  - `:78-95` category comments
  - `:131-165` `computeHorizon`
- Test: `__tests__/notificationHorizon.test.ts`:
  - `baseInput` at `:93-101` gains the two new required fields
  - T-NH-3's wird case at `:146-155` is **inverted**
  - T-NH-6 at `:195-208` is updated
  - new `describe('T-NH-W …')`

**Step 1: Write the failing tests**

- Update `baseInput` to add
  `wirdReminderTime: { hour: 20, minute: 0 }, wirdGoalMetToday: false`.
  Existing prayer tests pass `enabled` with `'wird-daily': false`, so they
  still emit no wird entries.
- Replace the T-NH-3 wird case ("wird-daily never emits even when enabled")
  with: `'T-NH-3b: wird-daily emits only when enabled'`. With
  `enabled({ 'wird-daily': true })` there are wird entries; with `ALL_OFF`
  there are none.
- Add:

```ts
describe('T-NH-W wird horizon', () => {
  const wirdOnly = () => enabled({ 'wird-daily': true });
  const wird = (es: readonly HorizonEntry[]) => es.filter((e) => e.categoryId === 'wird-daily');

  it('T-NH-W1: one entry per day for WIRD_HORIZON_DAYS days at the persisted time', () => {
    const es = wird(computeHorizon(baseInput({ enabled: wirdOnly(), now: atLocal(TODAY, 6, 0) })));
    expect(es).toHaveLength(WIRD_HORIZON_DAYS);
    expect(es[0]).toEqual({ categoryId: 'wird-daily', localDay: TODAY, fireAt: atLocal(TODAY, 20, 0) });
    expect(es.at(-1)!.localDay).toBe(addDays(TODAY, WIRD_HORIZON_DAYS - 1));
  });
  it('T-NH-W2: goal met today drops ONLY today', () => {
    const es = wird(computeHorizon(baseInput({ enabled: wirdOnly(), now: atLocal(TODAY, 6, 0), wirdGoalMetToday: true })));
    expect(es.map((e) => e.localDay)).not.toContain(TODAY);
    expect(es[0].localDay).toBe(addDays(TODAY, 1));
    expect(es).toHaveLength(WIRD_HORIZON_DAYS - 1);
  });
  it('T-NH-W3: today is omitted once its fire time has passed', () => {
    const es = wird(computeHorizon(baseInput({ enabled: wirdOnly(), now: atLocal(TODAY, 21, 0) })));
    expect(es[0].localDay).toBe(addDays(TODAY, 1));
  });
  it('T-NH-W4: fireAt is built from LOCAL components (no UTC drift)', () => {
    const es = wird(computeHorizon(baseInput({ enabled: wirdOnly(), wirdReminderTime: { hour: 5, minute: 30 } })));
    for (const e of es) {
      expect(e.fireAt.getHours()).toBe(5);
      expect(e.fireAt.getMinutes()).toBe(30);
    }
  });
  it('T-NH-W5: ordering is by day, prayers (chronological) then wird', () => {
    const all = computeHorizon(baseInput({ enabled: { ...allPrayersOn(), 'wird-daily': true } }));
    const firstDay = all.filter((e) => e.localDay === TODAY).map((e) => e.categoryId);
    expect(firstDay.at(-1)).toBe('wird-daily');
  });
  it('T-NH-W6: wird disabled reserves no slots (prayer days unchanged)', () => {
    expect(distinctDays(computeHorizon(baseInput())).length).toBe(horizonDaysFor(5));
  });
});
```

- T-NH-6 becomes
  `'horizonDaysFor(n, WIRD_HORIZON_DAYS) * n + WIRD_HORIZON_DAYS <= 56 for every n in 1..7'`.
  Keep the existing `horizonDaysFor(n) * n <= 56` assertion as well.
  Add `'five prayers + wird arm 35 + 14 = 49 slots'`, computed from
  `computeHorizon(baseInput({ enabled: { ...allPrayersOn(), 'wird-daily': true } })).length`.

**Step 2:** Run `npx jest __tests__/notificationHorizon.test.ts`. Expected:
FAIL. `WIRD_HORIZON_DAYS` is not exported, and wird entries are missing.

**Step 3: Implement** (in `services/notificationHorizon.ts`)

- `HorizonInput` gains:
  - `wirdReminderTime: TimeOfDay` — the persisted time, never the default constant.
  - `wirdGoalMetToday: boolean` — read from the DB by the orchestrator.

  Both are **required**: a partial input must not be able to compile (same
  rationale as `horizonOrchestrator.ts:5-13`).
- `export const WIRD_HORIZON_DAYS = 14;`. Its comment carries the slot math
  from design §4 and why 14.
- `export function horizonDaysFor(n: number, reservedSlots = 0): number`
  computes `Math.min(MAX_HORIZON_DAYS, Math.floor((IOS_PENDING_CAP - SAFETY_MARGIN - reservedSlots) / n))`,
  then clamps to at least 1 and returns 0 when n <= 0.
- `computeHorizon`:
  - `const wirdOn = !!input.enabled['wird-daily']`
  - `const prayerDays = horizonDaysFor(enabledPrayerCount, wirdOn ? WIRD_HORIZON_DAYS : 0)`
  - `const wirdDays = wirdOn ? WIRD_HORIZON_DAYS : 0`
  - loop `dayOffset < Math.max(prayerDays, wirdDays)`
  - emit prayers only while `dayOffset < prayerDays`
  - then the wird entry:
    - skip if `dayOffset === 0 && input.wirdGoalMetToday`
    - `fireAt = new Date(y, m - 1, d, time.hour, time.minute, 0, 0)` from `partsOf(localDay)`
    - push only if `fireAt.getTime() > nowMs`
- Rewrite the "wird is deliberately absent" comments (`:59-61`, `:78-88`,
  `:125-130`) to describe the new contract. Remove the phrase "US4 descoped"
  and reference this design doc instead.

**Step 4:** Run `npx jest __tests__/notificationHorizon.test.ts` and confirm
PASS. Then run tsc. tsc will flag `services/horizonOrchestrator.ts:159`
because the required fields are missing there. **That is expected; Task 4
fixes it.** To keep this commit green, pass
`wirdReminderTime: settings.wirdReminderTime, wirdGoalMetToday: false` at that
call site now, with a `// Task 4 replaces false with the DB read` comment. Do
not touch the DAILY wird branch yet.

**Step 5: Commit**

```bash
git add services/notificationHorizon.ts services/horizonOrchestrator.ts __tests__/notificationHorizon.test.ts
git commit -m "feat(notifications): emit wird reminders on the rolling DATE horizon"
```

---

### Task 3: Scheduler — wird is a horizon category, and `fireAt` is part of reconcile identity (~1.5 h)

**Files:**
- Modify: `services/notificationScheduler.ts`:
  - `:78-92` `OUR_CATEGORIES` and its comment
  - `:283-285` `keyOf`
  - `:295-311` `scheduleHorizonEntryAsync` `data`
  - `:313-373` reconcile and its doc comment
- Test: `__tests__/notificationHorizonScheduler.test.ts`:
  - T-NHS-6 at `:190-201`
  - T107 at `:245-265` (**inverted**)
  - new T-NHS-9 and T-NHS-10

**Step 1: Write the failing tests**

- T-NHS-6: the data payload is now
  `{ category, localDay, fireAt: entry.fireAt.getTime() }`. Assert
  `typeof data.fireAt === 'number'` and that it equals the entry's `fireAt`.
- Replace the T107 describe with
  `describe('T107 legacy repeating DAILY wird trigger is torn down', …)`:
  - seed `{ identifier: 'wird-repeating', content: { data: { category: 'wird-daily' } } }`
  - reconcile with `[entry('wird-daily', '2026-07-10')]`
  - expect the cancel calls to contain `'wird-repeating'`
  - expect exactly one pending `wird-daily` entry, carrying `localDay: '2026-07-10'`
  - reconciling with `[]` cancels every wird entry
- New:

```ts
describe('T-NHS-9 a changed fire time re-arms the same (category, localDay)', () => {
  it('cancels the 20:00 entry and schedules the 06:00 one', async () => {
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-10', 20)]);
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-10', 6)]);
    const pending = Mock.__getScheduledNotifications().filter((n) => n.content.data?.category === 'wird-daily');
    expect(pending).toHaveLength(1);
    expect(new Date(pending[0].content.data!.fireAt as number).getHours()).toBe(6);
  });
});
describe('T-NHS-10 goal met: dropping today from intended cancels exactly today', () => {
  it('cancels today and leaves tomorrow armed', async () => {
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-09'), entry('wird-daily', '2026-07-10')]);
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-10')]);
    const days = Mock.__getScheduledNotifications().map((n) => n.content.data?.localDay);
    expect(days).toEqual(['2026-07-10']);
  });
});
```

- T-NHS-2 (idempotency) must still pass unchanged. It is the guard against
  cancel-and-reschedule churn.

**Step 2:** Run `npx jest __tests__/notificationHorizonScheduler.test.ts`.
Expected FAILs:
- T107: the legacy request survives.
- T-NHS-6: `fireAt` is missing.
- T-NHS-9: the stale 20:00 entry is kept.
- T-NHS-10: today is not cancelled, because wird is not in `OUR_CATEGORIES`.

**Step 3: Implement**

- Add `'wird-daily'` to `OUR_CATEGORIES`. Rewrite the comment at `:78-85`.
  The old warning ("Adding `wird-daily` back here would … destroy the user's
  real wird reminder") is now false and must be removed, not left contradicting
  the code.
- `keyOf(category, localDay, fireAtMs)` returns
  `` `${category}|${localDay}|${fireAtMs}` ``. When reading pending
  notifications, build the key only if `category`, `localDay` and `fireAt`
  (a number) are all present. Otherwise the key is null, which means cancel.
  This covers the legacy DAILY wird request and any pre-`fireAt` entry.
- `scheduleHorizonEntryAsync` data becomes
  `{ category, localDay, fireAt: entry.fireAt.getTime() }`.
- Rewrite the reconcile doc comment (`:313-331`) to say that `wird-daily`
  is now owned by the horizon.
- **Do not** remove `scheduleWirdReminderAsync` yet; the orchestrator still
  calls it until Task 4.

**Step 4:** Re-run the file and confirm PASS. Run `npx jest __tests__/notificationScheduler.test.ts`
and confirm it still passes (it exercises `scheduleWirdReminderAsync` directly).
Then run tsc.

**Step 5: Commit**

```bash
git add services/notificationScheduler.ts __tests__/notificationHorizonScheduler.test.ts
git commit -m "feat(notifications): reconcile wird on the horizon and key entries by fire time"
```

---

### Task 4: Orchestrator — read "goal met today" from the DB and retire the DAILY trigger (~1.5 h)

**Files:**
- Modify: `services/horizonOrchestrator.ts`:
  - `:1-26` header
  - `:28-38` imports
  - `:119-166` `runOnce`
- Modify: `services/notificationScheduler.ts`. **Delete** `scheduleWirdReminderAsync`
  (`:196-234`), `cancelWirdReminderAsync` (`:236-250`) and `isWirdDaily`
  (`:121-125`), if it is now unused. Keep `WIRD_CATEGORY`, `WIRD_TITLE`,
  `WIRD_BODY` and `ensureAndroidChannelAsync`, which are still used by
  `contentFor` and the reconcile.
- Test: `__tests__/horizonOrchestrator.test.ts`:
  - the `@/db` mock at `:31-34` gains `progressRepo.completedDaysInRange`
  - the scheduler mock at `:24-29` drops `scheduleWirdReminderAsync`
  - T-HO-3 (`:93-106`) and T-HO-4 (`:169-186`) are rewritten
  - new T-HO-8 and T-HO-9
- Test: `__tests__/wirdReminderReschedule.test.ts`. The `@/db` mock at `:21-24`
  gains `progressRepo`. T039, T040 and T041 (`:84-139`) assert DATE triggers.
- Test: `__tests__/notificationScheduler.test.ts`. T-NS-2 to T-NS-6 and T-NS-8
  (`:76-176`, `:193-203`) exercise the deleted functions. **Rewrite** them:
  - T-NS-3 (category disabled) and T-NS-5 (idempotency) are already covered:
    by T-HO-4 and by T-NHS-2 respectively. Delete them with a one-line
    comment pointing at the replacement.
  - Port T-NS-4 (permission denied) and T-NS-8 (exact Arabic copy) to call
    `reconcileHorizonAsync([wirdEntry])` and assert the same expectations.
  - Port T-NS-2 to assert `trigger.type === 'date'` and `channelId === 'wird-daily'`.
  - Port T-NS-6 to `cancelCategoryAsync('wird-daily')`, which touches only
    wird-tagged requests.
- Test: `__tests__/notificationHorizonScheduler.test.ts`. The `@/db` mock at
  `:25-28` already has `completedDaysInRange`; confirm T104 still passes.

**Step 1: Write the failing tests** (horizonOrchestrator.test.ts)

```ts
const mockCompletedDays = jest.fn<Promise<string[]>, [string, string]>(async () => []);
jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: () => mockGetRepos(),
  progressRepo: { completedDaysInRange: (a: string, b: string) => mockCompletedDays(a, b) },
}));
const wirdIntended = () => lastIntended().filter((e) => e.categoryId === 'wird-daily');

it('T-HO-3: wird entries are armed at the PERSISTED time (not the default constant)', async () => {
  useSettingsStore.setState({ wirdReminderTime: { hour: 6, minute: 15 } });
  await assembleAndReconcile();
  const es = wirdIntended();
  expect(es.length).toBeGreaterThan(0);
  for (const e of es) {
    expect([e.fireAt.getHours(), e.fireAt.getMinutes()]).toEqual([6, 15]);
  }
});
it('T-HO-4: a disabled wird category arms no wird entry', async () => {
  /* set 'wird-daily': false */
  await assembleAndReconcile();
  expect(wirdIntended()).toHaveLength(0);
});
it("T-HO-8: today's goal met ⇒ no wird entry for today, tomorrow still armed", async () => {
  const today = toLocalDay();
  mockCompletedDays.mockResolvedValueOnce([today]);
  useSettingsStore.setState({ wirdReminderTime: { hour: 23, minute: 59 } });
  await assembleAndReconcile();
  expect(mockCompletedDays).toHaveBeenCalledWith(today, today);
  expect(wirdIntended().map((e) => e.localDay)).not.toContain(today);
  expect(wirdIntended().length).toBeGreaterThan(0);
});
it('T-HO-9: a DB read failure is treated as NOT met (fail toward reminding)', async () => {
  mockCompletedDays.mockRejectedValueOnce(new Error('db closed'));
  useSettingsStore.setState({ wirdReminderTime: { hour: 23, minute: 59 } });
  await assembleAndReconcile();
  expect(wirdIntended()[0]?.localDay).toBe(toLocalDay());
  expect(mockReconcile).toHaveBeenCalled(); // the run did not abort
});
```

T-HO-8 and T-HO-9 use 23:59 so today's fire time is still in the future
whenever the suite runs. If the suite happens to run during 23:59 local, the
test must not flake. Guard it:
`if (new Date().getHours() === 23 && new Date().getMinutes() === 59) return;`,
or better, inject a fixed clock in a `describe`-scoped `beforeEach` for these
two tests only, restored with `jest.useRealTimers()` in `afterEach`. **Use the
fake-clock form**, and fake only `Date`:

```ts
jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask'] });
jest.setSystemTime(new Date(2026, 9, 21, 9, 0));
```

T-HO-5 and T-HO-6 rely on real `setTimeout` and would hang under fully faked
timers.

wirdReminderReschedule.test.ts:
- T039: after changing 20:00 to 06:15, every pending `wird-daily` request has
  `trigger.type === 'date'` and `new Date(trigger.date).getHours() === 6`.
  No pending request is still at 20:00.
- T040: unchanged expectations (nothing scheduled, nothing pending).
- T041: the seeded legacy `legacy-0530` is cancelled, and the pending wird
  requests are all DATE triggers at 20:00. Pin the clock (Date-only fake timers, as above) so
  the count equals `WIRD_HORIZON_DAYS`.

**Step 2:** Run `npx jest __tests__/horizonOrchestrator.test.ts __tests__/wirdReminderReschedule.test.ts __tests__/notificationScheduler.test.ts`.
Expected: FAIL. The orchestrator still calls `scheduleWirdReminderAsync`, and
there are no wird entries in intended.

**Step 3: Implement** (`runOnce`)

```ts
const todayLocalDay = toLocalDay();
let wirdGoalMetToday = false;
try {
  const done = await progressRepo.completedDaysInRange(todayLocalDay, todayLocalDay);
  wirdGoalMetToday = done.includes(todayLocalDay);
} catch (err) {
  // Fail toward reminding: a redundant reminder beats a silently missing one.
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[horizonOrchestrator] goal-met read failed', err);
}
const intended = computeHorizon({
  now, todayLocalDay, enabled, prayerTimesFor,
  wirdReminderTime: settings.wirdReminderTime,
  wirdGoalMetToday,
});
await reconcileHorizonAsync(intended);
```

- Delete the `--- wird: a single repeating DAILY trigger` block (`:145-156`),
  and the `scheduleWirdReminderAsync` / `cancelCategoryAsync` imports.
- Import `progressRepo` from `@/db`.
- Rewrite the header (`:19-23`). The orchestrator now reconciles one horizon
  holding both wird and prayer entries.
- Delete the two scheduler functions. `grep -rn "scheduleWirdReminderAsync\|cancelWirdReminderAsync" app components services store hooks`
  must return only comments. Fix the comments that mention them:
  `services/wirdReminder.ts:111`, `services/wirdReminderToggle.ts:8,66-74`,
  `app/(tabs)/library.tsx:126` (comment only; no JSX change),
  `services/horizonRefreshTask.ts:5-9` (wird now depends on this task) and
  `store/wirdStore.ts:14-21`.

**Step 4:** Run the three files plus `__tests__/notificationHorizonScheduler.test.ts`
and confirm PASS. Then run tsc.

**Step 5: Commit**

```bash
git add services/horizonOrchestrator.ts services/notificationScheduler.ts services/wirdReminder.ts services/wirdReminderToggle.ts services/horizonRefreshTask.ts store/wirdStore.ts "app/(tabs)/library.tsx" __tests__/horizonOrchestrator.test.ts __tests__/wirdReminderReschedule.test.ts __tests__/notificationScheduler.test.ts
git commit -m "feat(wird): skip today's reminder once the goal is met; retire the repeating trigger"
```

---

### Task 5: `wirdStore` tracks `goalMetToday` and `snapshotDay`, and reconciles on the goal transition (~1 h)

**Files:**
- Modify: `store/wirdStore.ts`:
  - `:26-33` `WirdSnapshot`
  - `:45-49` initial state
  - `:51-72` `hydrate`
  - `:74-92` `setTarget`
  - `:94-98` `recomputeTodayPct`
  - `:106-122` `acceptSuggestion` (keep `goalMetToday` consistent with the unchanged today target)
- Test: `__tests__/wirdStore.test.ts`. The `beforeEach` `setState` at `:72-80`
  gains `goalMetToday: false, snapshotDay: ''`. Add `describe('T-WS goal transition')`.

**Step 1: Write the failing tests**

```ts
import { assembleAndReconcile } from '@/services/horizonOrchestrator';
const mockReconcile = assembleAndReconcile as jest.Mock;

describe('T-WS goal transition (audit gap 1)', () => {
  beforeEach(() => mockReconcile.mockClear());

  it('T-WS-1: hydrate sets goalMetToday and snapshotDay', async () => {
    mockPagesReadToday.mockResolvedValueOnce(10); // target mock = 10
    await useWirdStore.getState().hydrate();
    expect(useWirdStore.getState().goalMetToday).toBe(true);
    expect(useWirdStore.getState().snapshotDay).toBe(toLocalDay());
  });
  it('T-WS-2: recomputeTodayPct reconciles exactly once when the goal flips to met', async () => {
    useWirdStore.setState({ target: 10, goalMetToday: false });
    mockPagesReadToday.mockResolvedValueOnce(10);
    await useWirdStore.getState().recomputeTodayPct();
    expect(useWirdStore.getState().goalMetToday).toBe(true);
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });
  it('T-WS-3: no reconcile while still below the goal', async () => {
    useWirdStore.setState({ target: 10, goalMetToday: false });
    mockPagesReadToday.mockResolvedValueOnce(9);
    await useWirdStore.getState().recomputeTodayPct();
    expect(mockReconcile).not.toHaveBeenCalled();
  });
  it('T-WS-4: no reconcile for pages read after the goal was already met', async () => {
    useWirdStore.setState({ target: 10, goalMetToday: true });
    mockPagesReadToday.mockResolvedValueOnce(12);
    await useWirdStore.getState().recomputeTodayPct();
    expect(mockReconcile).not.toHaveBeenCalled();
  });
  it('T-WS-5: setTarget recomputes goalMetToday (raising the target un-meets the goal)', async () => {
    useWirdStore.setState({ target: 10, goalMetToday: true });
    mockPagesReadToday.mockResolvedValueOnce(10);
    await useWirdStore.getState().setTarget(20);
    expect(useWirdStore.getState().goalMetToday).toBe(false);
  });
});
```

**Step 2:** Run `npx jest __tests__/wirdStore.test.ts`. Expected: FAIL.
`goalMetToday` and `snapshotDay` are undefined, and no reconcile happens.

**Step 3: Implement**

- `WirdSnapshot` gains:
  - `goalMetToday: boolean` — today's pages are at or above today's target
    (`isWirdGoalMet`).
  - `snapshotDay: string` — the local day this snapshot describes; `''` until
    the first hydrate.
- `hydrate` sets `goalMetToday: isWirdGoalMet(pagesToday, target)` and
  `snapshotDay: toLocalDay()`. Capture the day **before** the reads so a read
  that straddles midnight labels itself with the older day; the next rollover
  check then refreshes it.
- `setTarget` sets `goalMetToday: isWirdGoalMet(pagesToday, newTarget)`. It
  already reconciles at `:91`.
- `acceptSuggestion` sets `goalMetToday: isWirdGoalMet(pagesToday, target)`,
  using the old target, which matches `:114-121`.
- `recomputeTodayPct`:

```ts
const { target, goalMetToday: wasMet } = get();
const pagesToday = await progressRepo.pagesReadToday();
const met = isWirdGoalMet(pagesToday, target);
set({ todayPct: wirdPercent(pagesToday, target), goalMetToday: met });
// Audit gap 1: the page that completes today's wird cancels today's reminder.
// Through the serialised orchestrator, never a direct cancel (design §3.3).
// Fire-and-forget so the notePageRead queue (achievement toasts) is not held.
if (met && !wasMet) void assembleAndReconcile().catch(() => undefined);
```

**Step 4:** Run `npx jest __tests__/wirdStore.test.ts` and confirm PASS. Then
run tsc and the suite.

**Step 5: Commit**

```bash
git add store/wirdStore.ts __tests__/wirdStore.test.ts
git commit -m "feat(wird): cancel today's reminder the moment the goal is met"
```

---

### Task 6: Foreground handler suppresses a wird reminder whose goal is already met (~1 h)

**Files:**
- Modify: `__mocks__/expo-notifications.ts`:
  - `:97-101` store the handler
  - add `export function __getHandler(): MockNotificationHandler | null`
  - reset it in `__resetMock` at `:176-189`
- Modify: `services/notificationScheduler.ts:147-174` `bootstrapNotificationHandler(options?)`
- Modify: `services/wirdReminder.ts` (append `shouldSuppressWirdNotification`)
- Modify: `app/_layout.tsx:283`. Pass the predicate. Imports: `useWirdStore`
  is already imported there; `toLocalDay` comes from `@/constants/progress`.
- Test: `__tests__/wirdReminder.test.ts` (append `T-SUP-*`)
- Test: `__tests__/notificationScheduler.test.ts` (append `T-NS-9`)

**Step 1: Write the failing tests**

```ts
// __tests__/wirdReminder.test.ts
import { shouldSuppressWirdNotification } from '@/services/wirdReminder';
const S = { goalMetToday: true, snapshotDay: '2026-10-21', todayLocalDay: '2026-10-21' };
describe('T-SUP shouldSuppressWirdNotification', () => {
  it('T-SUP-1: suppresses today’s wird when today’s goal is met', () => {
    expect(shouldSuppressWirdNotification({ category: 'wird-daily', localDay: '2026-10-21' }, S)).toBe(true);
  });
  it('T-SUP-2: suppresses the legacy DAILY wird (no localDay) when met', () => {
    expect(shouldSuppressWirdNotification({ category: 'wird-daily' }, S)).toBe(true);
  });
  it('T-SUP-3: never suppresses when the goal is not met', () => {
    expect(shouldSuppressWirdNotification({ category: 'wird-daily', localDay: '2026-10-21' }, { ...S, goalMetToday: false })).toBe(false);
  });
  it('T-SUP-4: never trusts a stale snapshot (yesterday met ≠ today met)', () => {
    expect(shouldSuppressWirdNotification({ category: 'wird-daily', localDay: '2026-10-21' }, { ...S, snapshotDay: '2026-10-20' })).toBe(false);
  });
  it('T-SUP-5: never suppresses another day’s entry or another category', () => {
    expect(shouldSuppressWirdNotification({ category: 'wird-daily', localDay: '2026-10-22' }, S)).toBe(false);
    expect(shouldSuppressWirdNotification({ category: 'prayer-fajr', localDay: '2026-10-21' }, S)).toBe(false);
    expect(shouldSuppressWirdNotification(null, S)).toBe(false);
  });
});

// __tests__/notificationScheduler.test.ts — isolated module so handlerRegistered is fresh
describe('T-NS-9 handler honours the injected suppress predicate', () => {
  const note = (data: Record<string, unknown>) => ({ request: { content: { data } } });
  it('returns all-false when suppress says so, all-true otherwise, and fails OPEN on throw', async () => {
    await jest.isolateModulesAsync(async () => {
      const Mock = require('expo-notifications');
      Mock.__resetMock();
      const { bootstrapNotificationHandler } = require('@/services/notificationScheduler');
      bootstrapNotificationHandler({ suppress: (d: { category?: string }) => {
        if (d.category === 'boom') throw new Error('x');
        return d.category === 'wird-daily';
      } });
      const h = Mock.__getHandler();
      expect(await h.handleNotification(note({ category: 'wird-daily' }))).toEqual(expect.objectContaining({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false }));
      expect(await h.handleNotification(note({ category: 'prayer-fajr' }))).toEqual(expect.objectContaining({ shouldShowBanner: true }));
      expect(await h.handleNotification(note({ category: 'boom' }))).toEqual(expect.objectContaining({ shouldShowBanner: true }));
    });
  });
});
```

**Step 2:** Run `npx jest __tests__/wirdReminder.test.ts __tests__/notificationScheduler.test.ts`.
Expected: FAIL. `shouldSuppressWirdNotification` is undefined, and
`__getHandler` is not a function.

**Step 3: Implement**

- `services/wirdReminder.ts`. The module stays pure: no store import and no
  `Date.now()`.

```ts
export type WirdSuppressionState = Readonly<{ goalMetToday: boolean; snapshotDay: string; todayLocalDay: string }>;
/** Foreground-only belt-and-braces (design §3.1). The horizon already drops
 *  today's entry once the goal is met; this covers the in-flight race and the
 *  legacy DAILY request on the first launch after upgrade. */
export function shouldSuppressWirdNotification(data: unknown, s: WirdSuppressionState): boolean {
  if (data === null || typeof data !== 'object') return false;
  const d = data as { category?: unknown; localDay?: unknown };
  if (d.category !== 'wird-daily') return false;
  if (!s.goalMetToday || s.snapshotDay !== s.todayLocalDay) return false;
  return d.localDay === undefined || d.localDay === s.todayLocalDay;
}
```

- `bootstrapNotificationHandler(options?: Readonly<{ suppress?: (data: Readonly<Record<string, unknown>>) => boolean }>)`.
  `handleNotification: async (notification) => { … }` reads
  `notification?.request?.content?.data ?? {}`, wraps `options?.suppress?.(data)`
  in try/catch (a throw logs via `logDev` and counts as `false`), and returns
  the existing all-true object or the same keys all set to `false`. Keep the
  idempotency guard.
- `app/_layout.tsx:283`:

```ts
bootstrapNotificationHandler({
  suppress: (data) => {
    const w = useWirdStore.getState();
    return shouldSuppressWirdNotification(data, {
      goalMetToday: w.goalMetToday,
      snapshotDay: w.snapshotDay,
      todayLocalDay: toLocalDay(),
    });
  },
});
```

**Step 4:** Re-run both files and confirm PASS. Confirm T-NS-7 (at most one
registration) still passes. Then run tsc.

**Step 5: Commit**

```bash
git add __mocks__/expo-notifications.ts services/notificationScheduler.ts services/wirdReminder.ts app/_layout.tsx __tests__/wirdReminder.test.ts __tests__/notificationScheduler.test.ts
git commit -m "feat(wird): suppress a foreground wird reminder once today's goal is met"
```

---

### Task 7: Day rollover — re-hydrate on foreground and at local midnight (~1.5 h)

**Files:**
- Create: `services/dayRollover.ts`
- Create: `hooks/useDayRollover.ts`
- Modify: `app/_layout.tsx`. Import the hook next to `:14`. Call
  `useDayRollover(navigatorReady);` directly after `useHorizonReconcile(navigatorReady);`
  at `:261`, with a comment naming audit gap 2.
- Test: create `__tests__/dayRollover.test.ts`

**Step 1: Write the failing test**

```ts
const mockProgressHydrate = jest.fn(async () => undefined);
const mockWirdHydrate = jest.fn(async () => undefined);
jest.mock('@/store/progressStore', () => ({ useProgressStore: { getState: () => ({ hydrate: mockProgressHydrate }) } }));
const wirdState = { snapshotDay: '2026-10-21', hydrate: mockWirdHydrate };
jest.mock('@/store/wirdStore', () => ({ useWirdStore: { getState: () => wirdState } }));

import { refreshIfLocalDayChanged } from '@/services/dayRollover';

beforeEach(() => { mockProgressHydrate.mockClear(); mockWirdHydrate.mockClear(); wirdState.snapshotDay = '2026-10-21'; });

it('T-DR-1: same local day ⇒ no DB work', async () => {
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 21, 23, 0))).toBe(false);
  expect(mockWirdHydrate).not.toHaveBeenCalled();
});
it('T-DR-2: a new local day re-hydrates BOTH stores (ring resets to the new day)', async () => {
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 22, 0, 0, 1))).toBe(true);
  expect(mockProgressHydrate).toHaveBeenCalledTimes(1);
  expect(mockWirdHydrate).toHaveBeenCalledTimes(1);
});
it('T-DR-3: concurrent calls coalesce into one refresh', async () => {
  const d = new Date(2026, 9, 22, 8, 0);
  await Promise.all([refreshIfLocalDayChanged(d), refreshIfLocalDayChanged(d)]);
  expect(mockWirdHydrate).toHaveBeenCalledTimes(1);
});
it('T-DR-4: never throws — a hydrate failure is swallowed (dbFailed drives the retry banner)', async () => {
  mockWirdHydrate.mockRejectedValueOnce(new Error('db'));
  await expect(refreshIfLocalDayChanged(new Date(2026, 9, 22, 8, 0))).resolves.toBe(true);
});
it('T-DR-5: a never-hydrated store (snapshotDay "") is left to boot hydration', async () => {
  wirdState.snapshotDay = '';
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 22, 8, 0))).toBe(false);
});
```

**Step 2:** Run `npx jest __tests__/dayRollover.test.ts`. Expected: FAIL with
"Cannot find module '@/services/dayRollover'".

**Step 3: Implement**

`services/dayRollover.ts`:

```ts
/** Audit gap 2: an app left in memory overnight must not show yesterday's ring. */
let inFlight: Promise<boolean> | null = null;
export function refreshIfLocalDayChanged(now: Date): Promise<boolean> {
  if (inFlight) return inFlight;
  const snapshotDay = useWirdStore.getState().snapshotDay;
  if (snapshotDay === '' || toLocalDay(now) === snapshotDay) return Promise.resolve(false);
  inFlight = (async () => {
    try {
      await Promise.all([
        useProgressStore.getState().hydrate().catch(() => undefined),
        useWirdStore.getState().hydrate().catch(() => undefined), // also reconciles → horizon rolls
      ]);
    } finally { inFlight = null; }
    return true;
  })();
  return inFlight;
}
```

`hooks/useDayRollover.ts` is mount-once (same constraint as
`useHorizonReconcile`) and gated on `ready`:

- In the effect, define `arm()`:
  - clear the timer
  - `timer = setTimeout(tick, msUntilNextLocalMidnight(new Date()) + 1000)`
  - `tick` is `void refreshIfLocalDayChanged(new Date()).finally(arm)`
- Call `arm()` when the effect starts.
- AppState `change`:
  - entering background/inactive: clear the timer
  - `prev !== 'active' && next === 'active'`: `void refreshIfLocalDayChanged(new Date())`, then `arm()`
- Cleanup: clear the timer and `sub.remove()`.
- The header comment explains:
  - why only a day change triggers work;
  - why the timer is cleared in the background (iOS suspends JS timers; the
    foreground check covers it);
  - that the +1 s guards against firing a hair before midnight.

The hook has no unit test (the repo has no hook-testing library and adding one
is a new dependency). Its logic lives in the two tested pure functions. It is
verified on device in Task 9.

**Step 4:** Run `npx jest __tests__/dayRollover.test.ts` and confirm PASS.
Then run tsc and the suite.

**Step 5: Commit**

```bash
git add services/dayRollover.ts hooks/useDayRollover.ts app/_layout.tsx __tests__/dayRollover.test.ts
git commit -m "feat(wird): reset the Library wird ring when the local day changes"
```

---

### Task 8: An honest "next reminder" caption once the goal is met (~45 min)

**Files:**
- Modify: `services/wirdReminder.ts`:
  - `:27-48` `computeNextWirdReminder(now, time, opts?: { goalMetToday?: boolean })`
  - `:68-76` `formatNextWirdReminder`
  - `:122-136` `describeWirdReminder`: status gains a required `goalMetToday: boolean`
- Modify: `app/(tabs)/library.tsx:128-134`. Add
  `const goalMetToday = useWirdStore((s) => s.goalMetToday);` and pass it in
  the status object. **Logic only. No JSX, style or layout change.**
- Test: `__tests__/wirdReminder.test.ts`. Existing T-WRC calls at `:59-105`
  add `goalMetToday: false`. Append the T-WRC-6 and T050-5 tests below.

**Step 1: Write the failing tests**

```ts
it('T050-5: goal met ⇒ next reminder is tomorrow even when today’s time is still ahead', () => {
  const now = new Date(2026, 9, 21, 9, 0);
  expect(computeNextWirdReminder(now, { hour: 20, minute: 0 }, { goalMetToday: true }))
    .toEqual(new Date(2026, 9, 22, 20, 0, 0, 0));
});
it('T-WRC-6: armed + goal met ⇒ caption says غدًا, never اليوم', () => {
  const r = describeWirdReminder(new Date(2026, 9, 21, 9, 0), { hour: 20, minute: 0 },
    { enabled: true, permission: 'granted', goalMetToday: true });
  expect(r.armed).toBe(true);
  expect(r.caption).toContain('غدًا');
  expect(r.caption).not.toContain('اليوم');
});
```

**Step 2:** Run `npx jest __tests__/wirdReminder.test.ts`. Expected: T050-5
returns today 20:00 and T-WRC-6 contains اليوم, so both FAIL. tsc also fails
on the new required field until library.tsx passes it.

**Step 3: Implement.** When `opts?.goalMetToday` is true, skip the
"today if still ahead" branch. Thread `goalMetToday` through
`formatNextWirdReminder(now, time, goalMetToday = false)`. Update the
`services/wirdReminder.ts:1-9` header so it no longer says "repeating DAILY
trigger".

**Step 4:** Run the file and confirm PASS. Then run tsc and
`npm run lint 2>&1 | grep -E "library.tsx|wirdReminder" -A 2`.
Expect no new findings.

**Step 5: Commit**

```bash
git add services/wirdReminder.ts "app/(tabs)/library.tsx" __tests__/wirdReminder.test.ts
git commit -m "fix(library): next-reminder caption skips today once the wird goal is met"
```

---

### Task 9: Full verification and visual/behavioural QA (~1.5 h)

**Step 1: Full automated gates**

```bash
npx jest                                   # expect: all suites pass, 0 failures
npx tsc --noEmit --pretty false            # expect: no output
npm run lint 2>&1 | grep -E "notificationScheduler|notificationHorizon|horizonOrchestrator|horizonRefreshTask|wirdStore|wirdReminder|wirdMath|dayRollover|useDayRollover|progress\.ts|_layout\.tsx|library\.tsx|expo-notifications" -A 2
# expect: no new findings (pre-existing browse.tsx:603 is out of scope)
grep -rn "scheduleWirdReminderAsync\|cancelWirdReminderAsync\|US4 descoped" app components services store hooks
# expect: no hits
git diff main --stat -- "app/(tabs)/library.tsx"   # expect: only the reminder-status lines + one comment
```

**Step 2: Visual QA (iOS simulator)**

Follow argent rules: `list-devices` first, then the
`argent-react-native-app-workflow` and `argent-device-interact` skills. Capture
at the 393 pt width that frame 06 was drawn at.

| # | Route / state | Compare against | Pass condition |
|---|---|---|---|
| V1 | `/library`, default state (goal **not** met, reminder on, permission granted) | `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/06-2031-4659.png` (node `2031:4659`) | Pixel-identical to a capture of `main` taken the same way: the same `screenshot-diff` result as before this branch. Wird card `DIV-75` geometry unchanged. |
| V2 | `/library` after reading pages to meet the goal (ring 100%) | No frame for this state. Contract: frame 06 layout plus `constants/layout.ts` / `constants/typography.ts` | Same layout as V1; only the caption text changes to "التذكير القادم: غدًا ⁦…⁩"; no new element; RTL intact |
| V3 | `/settings-wird-goal` (via the ring and via `/more/settings`) | No frame. Contract: `constants/layout.ts`, `constants/typography.ts`, `constants/rtlContracts.ts` | Unchanged from `main` |
| V4 | `/settings-wird-reminder` (via `/settings-notifications`) | No frame. Same contracts as V3. | Unchanged from `main`; picking a time still re-arms (see B2) |
| V5 | `/more/settings` "هدف الورد اليومي" row | No frame. Same contracts as V3. | Unchanged |

**Step 3: Behavioural QA (simulator)**

List pending requests with argent `debugger-evaluate`:

```js
require('expo-notifications').getAllScheduledNotificationsAsync()
  .then(a => a.map(n => [n.content.data, n.trigger]))
```

- **B1 (upgrade migration).** Install `main`, grant permission, launch once
  (the legacy DAILY request is armed). Install this branch and launch. Expect
  no `wird-daily` request without `localDay`, and 14 DATE requests (13 if
  today's time has passed or the goal is met).
- **B2 (time change).** Set the reminder to now + 3 min from `/settings-wird-reminder`.
  Expect every pending wird `fireAt` to have the new time. Background the app.
  The notification arrives at that time.
- **B3 (goal met cancels today).** Set the target to 1 page and the reminder to
  now + 3 min. Open the Mushaf and record one page. Expect today's `localDay`
  to be absent from the pending list within a few seconds and tomorrow to be
  present. Background the app. **No** notification at that time.
- **B4 (target raised re-arms).** After B3, raise the target to 5 (via the
  ring). Today's entry is re-armed if its time is still ahead.
- **B5 (foreground suppression).** Keep the app foregrounded on Library with
  the goal met. Confirm no banner appears if a legacy or raced request fires.
  Exercise this via a seeded DAILY request using `debugger-evaluate` and
  `scheduleNotificationAsync` with `{ category: 'wird-daily' }`, firing in 1 minute.
- **B6 (day rollover).** The simulator clock follows the host and cannot be
  shifted safely. Covered by `__tests__/dayRollover.test.ts`. If an on-device
  check is wanted, leave the app foregrounded on Library across a real local
  midnight: the ring returns to 0% within about 1 s of 00:00 without
  backgrounding.
- **B7 (disable).** Turn the reminder off on the Library toggle. Zero pending
  `wird-daily` requests.

Record results in `docs/plans/2026-10-21-daily-wird-reminders-qa.md`, the QA
record named in the design. Do not commit screenshots; they are untracked like
the other audit renders.

**Step 4: Commit QA record**

```bash
git add docs/plans/2026-10-21-daily-wird-reminders-qa.md
git commit -m "docs(qa): daily wird reminders on-device verification"
```

---

## Task order and dependencies

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

- Task 2 leaves a temporary `wirdGoalMetToday: false` at the orchestrator call site; Task 4 replaces it.
- Task 3 keeps `scheduleWirdReminderAsync` alive until Task 4 deletes it.
- Task 6 depends on Task 5 (`goalMetToday` and `snapshotDay` exist).
- Task 7 depends on Task 5 (`snapshotDay`).
- Task 8 depends on Task 5 (`goalMetToday`).
