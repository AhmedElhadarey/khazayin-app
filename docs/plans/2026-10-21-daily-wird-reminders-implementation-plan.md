# Daily Wird Reminders: Audit Gap Closure Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: use gilfoyle:executing-plans (or the
> CLAUDE.md §4 subagent pattern) to implement this plan task by task. Give each
> implementer the full task text inline. Run the spec review before the quality
> review.

**Goal:** Make the wird reminder fire only when today's goal is not met, and
reset the Library wird ring when the local day changes while the app is still
in memory.

**Architecture:**
- The wird reminder moves from one repeating `DAILY` trigger to one-shot `DATE`
  entries on the existing rolling notification horizon, 14 days long.
- Today's entry is dropped once `khz_days.wird_completed = 1`. That one DB
  read is also the store's only "goal met" signal.
- Every reschedule goes through the serialised `assembleAndReconcile`.
- A mount-once `useDayRollover` re-hydrates the wird and progress stores when
  the local day changes.
- The foreground notification handler gets an injected suppression predicate
  as defence in depth.

**Tech Stack:** Expo SDK 54, expo-notifications (DATE triggers), zustand 5,
expo-sqlite repos via `@/db`, Jest (`jest-expo` preset, manual mock
`__mocks__/expo-notifications.ts`).

**Design:** `docs/plans/2026-10-21-daily-wird-reminders-design.md` (v2).
Section references (§) below point there.

**User decisions (approved 2026-10-21):**
- Q1: reverse the `dd26902` descope.
- Q2: 14-day horizon.
- Q3: midnight reset, not Fajr.

Q4 and Q5 stay at their defaults: not done.

**v2 changes after CTO review:** design §11. The most important one: **every
commit is green.** The wird switch-over is a single atomic commit (Task 4).

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
  6. Run the wird/notification suite and confirm it is green:
     `npx jest __tests__/horizonOrchestrator.test.ts __tests__/notificationHorizon __tests__/notificationScheduler __tests__/wird __tests__/horizonRefreshTask.test.ts`
     (`__tests__/notificationScheduler` also matches `notificationSchedulerExpoGo.test.ts`.)
  7. Commit.
- **Invariant:** no commit may leave the suite red. In particular,
  `__tests__/wirdReminderReschedule.test.ts:87` (one armed wird) and `:94`
  (`type: 'daily'`) **must stay green through Tasks 1–3**. Task 4 rewrites
  them atomically with the switch-over.
- Baseline before Task 1: that suite is 10 suites and 71 tests, all passing
  (checked 2026-10-21).
- Do not touch any JSX or style in `app/(tabs)/library.tsx`. The Library must
  stay pixel-identical to frame 06 (`2031:4659`).

---

### Task 1: `msUntilNextLocalMidnight`, including TZ-pinned DST tests (~30 min)

**Files:**
- Modify: `constants/progress.ts` (append after `toLocalDay`, `:162-169`)
- Test: create `__tests__/localMidnight.test.ts`
- Test: create `__tests__/localMidnightDst.test.ts`

(v1's `isWirdGoalMet` and T-GM-* are **cut**. "Goal met" comes only from the
DB; see Task 5.)

**Step 1: Write the failing tests**

`__tests__/localMidnight.test.ts`:

```ts
import { msUntilNextLocalMidnight } from '@/constants/progress';

describe('msUntilNextLocalMidnight', () => {
  it('T-LM-1: 23:59:00 local is 60s from midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 21, 23, 59, 0, 0))).toBe(60_000);
  });
  it('T-LM-2: exactly 00:00 local returns a full day, never 0', () => {
    const now = new Date(2026, 9, 21, 0, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(new Date(2026, 9, 22).getTime() - now.getTime());
  });
  it('T-LM-3: crosses a month/year boundary', () => {
    const now = new Date(2026, 11, 31, 12, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(new Date(2027, 0, 1).getTime() - now.getTime());
  });
});
```

`__tests__/localMidnightDst.test.ts` is TZ-pinned. Node re-reads `process.env.TZ`
on change, but set it **before any Date is constructed**:

```ts
process.env.TZ = 'America/New_York';
import { msUntilNextLocalMidnight } from '@/constants/progress';

describe('msUntilNextLocalMidnight across DST (America/New_York)', () => {
  it('precondition: the TZ pin took effect', () => {
    // Fails loudly instead of passing vacuously if the runtime ignored TZ.
    expect(new Date(2026, 2, 7, 12).getTimezoneOffset()).not.toBe(new Date(2026, 2, 9, 12).getTimezoneOffset());
  });
  it('T-LM-DST-1: spring-forward day 2026-03-08 is 23h long', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 2, 8, 0, 0, 0, 0))).toBe(23 * 3600_000);
  });
  it('T-LM-DST-2: fall-back day 2026-11-01 is 25h long', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 1, 0, 0, 0, 0))).toBe(25 * 3600_000);
  });
});
```

**Step 2:** Run `npx jest __tests__/localMidnight.test.ts __tests__/localMidnightDst.test.ts`.
Expected: FAIL with "msUntilNextLocalMidnight is not a function".

**Step 3: Implement** (in `constants/progress.ts`)

```ts
/** Milliseconds until the next LOCAL midnight. Built from local components so
 *  23h/25h DST days are correct. Never returns 0. */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}
```

**Step 4:** Re-run both files and confirm PASS. Then run tsc and the suite.

**Step 5: Commit**

```bash
git add constants/progress.ts __tests__/localMidnight.test.ts __tests__/localMidnightDst.test.ts
git commit -m "feat(progress): add DST-safe next-local-midnight helper"
```

---

### Task 2: `computeHorizon` can emit wird DATE entries (orchestrator keeps them off) (~1.5 h)

**Files:**
- Modify: `services/notificationHorizon.ts`:
  - `:16-20` imports (`TimeOfDay`)
  - `:32-39` `HorizonInput`
  - `:45-69` budget
  - `:78-95` category comments
  - `:131-165` `computeHorizon`
- Modify: `services/horizonOrchestrator.ts:159-164`. **Stopgap call site only.**
- Test: `__tests__/notificationHorizon.test.ts`:
  - `baseInput` at `:93-101` gains the two new required fields
  - T-NH-3's wird case at `:146-155` is **inverted**
  - T-NH-6 at `:195-208` is updated
  - new `describe('T-NH-W …')`

**Step 1: Write the failing tests**

- `baseInput` adds `wirdReminderTime: { hour: 20, minute: 0 }, wirdGoalMetToday: false`.
  Existing prayer tests pass `enabled` with `'wird-daily': false`, so they still
  emit no wird entries.
- Replace the T-NH-3 wird case ("wird-daily never emits even when enabled") with
  `'T-NH-3b: wird-daily emits only when enabled'`. With
  `enabled({ 'wird-daily': true })` there are wird entries; with `ALL_OFF` there
  are none.
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
    for (const e of es) { expect(e.fireAt.getHours()).toBe(5); expect(e.fireAt.getMinutes()).toBe(30); }
  });
  it('T-NH-W5: ordering is by day, prayers (chronological) then wird', () => {
    const all = computeHorizon(baseInput({ enabled: { ...allPrayersOn(), 'wird-daily': true } }));
    expect(all.filter((e) => e.localDay === TODAY).map((e) => e.categoryId).at(-1)).toBe('wird-daily');
  });
  it('T-NH-W6: wird disabled reserves no slots (prayer days unchanged)', () => {
    expect(distinctDays(computeHorizon(baseInput())).length).toBe(horizonDaysFor(5));
  });
  it('T-NH-W7: changing the time after today’s reminder fired re-emits today at the later time (design §3.2)', () => {
    // 08:00 already fired; the user moves the time to 20:00 at 09:00. The goal is unmet, so today is re-emitted.
    const es = wird(computeHorizon(baseInput({ enabled: wirdOnly(), now: atLocal(TODAY, 9, 0), wirdReminderTime: { hour: 20, minute: 0 } })));
    expect(es[0]).toEqual({ categoryId: 'wird-daily', localDay: TODAY, fireAt: atLocal(TODAY, 20, 0) });
  });
});
```

- T-NH-6 becomes
  `'horizonDaysFor(n, WIRD_HORIZON_DAYS) * n + WIRD_HORIZON_DAYS <= 56 for every n in 1..7'`.
  Keep the existing `horizonDaysFor(n) * n <= 56` assertion as well. Add
  `'five prayers + wird arm 35 + 14 = 49 slots'`, computed from
  `computeHorizon(baseInput({ enabled: { ...allPrayersOn(), 'wird-daily': true } })).length`.

**Step 2:** Run `npx jest __tests__/notificationHorizon.test.ts`. Expected:
FAIL. `WIRD_HORIZON_DAYS` is not exported, and wird entries are missing.

**Step 3: Implement**

`services/notificationHorizon.ts`:
- `HorizonInput` gains:
  - `wirdReminderTime: TimeOfDay` — the persisted time, never the default constant.
  - `wirdGoalMetToday: boolean` — from the DB, through the orchestrator.

  Both are **required**: a partial input must not be able to compile
  (`horizonOrchestrator.ts:5-13`).
- `export const WIRD_HORIZON_DAYS = 14;`. Its comment carries the slot math
  (design §4) and the Q2 approval.
- `export function horizonDaysFor(n: number, reservedSlots = 0): number`
  computes `Math.min(MAX_HORIZON_DAYS, Math.floor((IOS_PENDING_CAP - SAFETY_MARGIN - reservedSlots) / n))`,
  then clamps to at least 1 and returns 0 when n <= 0.
- `computeHorizon`:
  - `wirdOn = !!input.enabled['wird-daily']`
  - `prayerDays = horizonDaysFor(enabledPrayerCount, wirdOn ? WIRD_HORIZON_DAYS : 0)`
  - `wirdDays = wirdOn ? WIRD_HORIZON_DAYS : 0`
  - loop `dayOffset < Math.max(prayerDays, wirdDays)`
  - emit prayers only while `dayOffset < prayerDays`
  - then the wird entry:
    - skip if `dayOffset === 0 && input.wirdGoalMetToday`
    - `fireAt = new Date(y, m - 1, d, time.hour, time.minute, 0, 0)` from `partsOf(localDay)`
    - push only if `fireAt.getTime() > nowMs`
- Rewrite the "wird is deliberately absent" comments (`:59-61`, `:78-88`,
  `:125-130`) to describe the new contract, which the orchestrator turns on in
  Task 4.

`services/horizonOrchestrator.ts:159-164` stopgap. The scheduler cannot own
`wird-daily` yet: the DAILY trigger is still canonical until Task 4. Keep wird
out of the computed horizon:

```ts
const intended = computeHorizon({
  now, todayLocalDay, prayerTimesFor,
  // STOPGAP (Task 2 → removed in Task 4): wird stays on its DAILY trigger until
  // the atomic switch-over, so it must not appear in the horizon yet.
  enabled: { ...enabled, 'wird-daily': false },
  wirdReminderTime: settings.wirdReminderTime,
  wirdGoalMetToday: false,
});
```

The DAILY branch at `:145-156` stays untouched.

**Step 4:** Run `npx jest __tests__/notificationHorizon.test.ts` and confirm
PASS. Run tsc. Run the suite: `wirdReminderReschedule.test.ts` and
`horizonOrchestrator.test.ts` stay green **unchanged** (T-HO-3/4 still see no
wird in intended).

**Step 5: Commit**

```bash
git add services/notificationHorizon.ts services/horizonOrchestrator.ts __tests__/notificationHorizon.test.ts
git commit -m "feat(notifications): teach the horizon to compute wird reminders"
```

---

### Task 3: Scheduler prep — realistic mock, `fireAt` in the key, cancel pass without permission (~1.5 h)

Wird is **not** yet in `OUR_CATEGORIES`. This task changes only behaviour that
prayers (and the tests) can observe.

**Files:**
- Modify: `__mocks__/expo-notifications.ts`:
  - `:64-67` `MockScheduledNotification` gains `trigger?: MockTriggerInput`
  - `:111-123` `scheduleNotificationAsync` stores the `trigger` and stores `data`
    as `JSON.parse(JSON.stringify(request.content.data ?? {}))`, mirroring the
    native bridge's serialisation
- Modify: `services/notificationScheduler.ts`:
  - `:283-285` `keyOf`
  - `:295-311` `scheduleHorizonEntryAsync` `data`
  - `:313-373` the reconcile body and its doc comment
- Test: `__tests__/notificationHorizonScheduler.test.ts`:
  - T-NHS-3 `keep` seed at `:130` gains `fireAt`
  - T-NHS-6 at `:190-201`
  - T-NHS-7 at `:203-209` is extended
  - new T-NHS-9, T-NHS-11 and T-NHS-12

**Step 1: Write the failing tests**

- **T-NHS-3:** the `keep` seed (`:130`) must carry the `fireAt` the intended
  entry has, or it would be cancelled as stale under the new key:

```ts
{ identifier: 'keep', content: { data: { category: 'prayer-fajr', localDay: '2026-07-09',
  fireAt: entry('prayer-fajr', '2026-07-09', 5).fireAt.getTime() } } },
```

- **T-NHS-6:** the data payload is `{ category, localDay, fireAt }`. Assert
  `typeof data.fireAt === 'number'` and that it equals `entry.fireAt.getTime()`.
  Also assert that the pending request now carries
  `trigger: expect.objectContaining({ type: 'date' })` (mock realism).
- **T-NHS-7 extended** (cancel pass without permission):

```ts
it('T-NHS-7b: with permission denied, surplus entries are still CANCELLED (only scheduling is gated)', async () => {
  Mock.__setScheduledNotifications([{ identifier: 'stale', content: { data: { category: 'prayer-fajr', localDay: '2026-07-01' } } }]);
  Mock.__setPermissionResponse('denied');
  await reconcileHorizonAsync([]);
  expect(Mock.__getCancelCalls()).toEqual(['stale']);
  expect(Mock.__getScheduleCalls()).toHaveLength(0);
});
```

- **New tests:**

```ts
describe('T-NHS-9 a changed fire time re-arms the same (category, localDay)', () => {
  it('cancels the 05:00 entry and schedules the 06:00 one', async () => {
    await reconcileHorizonAsync([entry('prayer-fajr', '2026-07-10', 5)]);
    await reconcileHorizonAsync([entry('prayer-fajr', '2026-07-10', 6)]);
    const pending = Mock.__getScheduledNotifications().filter((n) => n.content.data?.category === 'prayer-fajr');
    expect(pending).toHaveLength(1);
    expect(new Date(Number(pending[0].content.data!.fireAt)).getHours()).toBe(6);
  });
});
describe('T-NHS-11 tolerant key', () => {
  it('treats a string-serialised fireAt as the same key (no churn)', async () => {
    const e = entry('prayer-fajr', '2026-07-10', 5);
    Mock.__setScheduledNotifications([{ identifier: 'str', content: { data: { category: 'prayer-fajr', localDay: '2026-07-10', fireAt: String(e.fireAt.getTime()) } } }]);
    await reconcileHorizonAsync([e]);
    expect(Mock.__getCancelCalls()).toHaveLength(0);
    expect(Mock.__getScheduleCalls()).toHaveLength(0);
  });
  it('cancels an entry whose fireAt is missing or non-finite', async () => {
    Mock.__setScheduledNotifications([
      { identifier: 'nofire', content: { data: { category: 'prayer-fajr', localDay: '2026-07-10' } } },
      { identifier: 'nan', content: { data: { category: 'prayer-fajr', localDay: '2026-07-10', fireAt: 'abc' } } },
    ]);
    await reconcileHorizonAsync([]);
    expect([...Mock.__getCancelCalls()].sort()).toEqual(['nan', 'nofire']);
  });
});
describe('T-NHS-12 two consecutive reconciles are a no-op (mirrors QA B8)', () => {
  it('zero cancels/schedules on the second run; identical identifiers', async () => {
    const intended = [entry('prayer-fajr', '2026-07-10', 5), entry('prayer-isha', '2026-07-10', 19)];
    await reconcileHorizonAsync(intended);
    const ids = Mock.__getScheduledNotifications().map((n) => n.identifier).sort();
    const [c0, s0] = [Mock.__getCancelCalls().length, Mock.__getScheduleCalls().length];
    await reconcileHorizonAsync(intended);
    expect(Mock.__getCancelCalls().length).toBe(c0);
    expect(Mock.__getScheduleCalls().length).toBe(s0);
    expect(Mock.__getScheduledNotifications().map((n) => n.identifier).sort()).toEqual(ids);
  });
});
```

**Step 2:** Run `npx jest __tests__/notificationHorizonScheduler.test.ts`.
Expected FAILs:
- T-NHS-6: `fireAt` and `trigger` are missing.
- T-NHS-7b: the early return skips the cancel.
- T-NHS-9: the stale 05:00 entry is kept.
- T-NHS-11: no tolerant key yet.

T-NHS-3 already passes under the old key. Its seed edit is preparation and
must still pass after Step 3.

**Step 3: Implement**

- `keyOf(category, localDay, fireAtMs)` returns
  `` `${category}|${localDay}|${fireAtMs}` ``.
- Add a helper `keyOfPending(data)`. It returns a key only when
  `typeof data.category === 'string'`, `typeof data.localDay === 'string'` and
  `Number.isFinite(Number(data.fireAt))`. Otherwise it returns `null`, which
  means cancel.
- `scheduleHorizonEntryAsync` data becomes
  `{ category, localDay, fireAt: entry.fireAt.getTime() }`.
- Reconcile order:
  1. Read pending.
  2. Cancel pass over `OUR_CATEGORIES` entries not in intended.
  3. **Then** the permission check: if not granted, return.
  4. Ensure the Android channels.
  5. Schedule pass.

  Rewrite the doc comment (`:313-331`) to state: cancel is ungated, scheduling
  is gated.
- **Do not** touch `OUR_CATEGORIES`, `scheduleWirdReminderAsync` or
  `cancelWirdReminderAsync`. `wirdReminderReschedule.test.ts:87,94` must stay
  green.

**Step 4:** Re-run the file and confirm PASS. Run the whole suite: green,
including `wirdReminderReschedule.test.ts`, `notificationScheduler.test.ts` and
`notificationSchedulerExpoGo.test.ts`, all unchanged. Then run tsc.

**Step 5: Commit**

```bash
git add __mocks__/expo-notifications.ts services/notificationScheduler.ts __tests__/notificationHorizonScheduler.test.ts
git commit -m "fix(notifications): key horizon entries by fire time and cancel without permission"
```

---

### Task 4: ATOMIC switch-over — the wird reminder moves onto the horizon; the DAILY trigger is retired (~2 h)

Everything that flips wird ownership lands in **one commit**, so no
intermediate state has two owners of `wird-daily`.

**Files:**
- Modify: `services/notificationScheduler.ts`:
  - `:78-92` `OUR_CATEGORIES` gains `'wird-daily'`; rewrite its comment, which
    must stop claiming that adding wird destroys the reminder
  - **delete** `WirdReminderConfig` (`:47-52`), `isWirdDaily` (`:121-125`),
    `scheduleWirdReminderAsync` (`:196-234`), `cancelWirdReminderAsync`
    (`:236-250`) and `cancelEntryAsync` (`:391-407`)
  - drop `isCategoryEnabled` from the import at `:14` (keep `getCategory`)
  - keep `WIRD_CATEGORY`, `WIRD_TITLE`, `WIRD_BODY`, `ensureAndroidChannelAsync`
    and `cancelCategoryAsync`
- Modify: `services/horizonOrchestrator.ts`:
  - header `:1-26`
  - imports `:28-38`: drop `scheduleWirdReminderAsync` and `cancelCategoryAsync`;
    add `progressRepo`
  - `runOnce` `:119-166`: remove the Task 2 stopgap and the DAILY branch
    `:145-156`; read goal-met
- Modify (comments only):
  - `services/wirdReminder.ts:1-11,111`
  - `services/wirdReminderToggle.ts:8,66-74`
  - `services/horizonRefreshTask.ts:1-15` (wird now depends on the top-up task)
  - `store/wirdStore.ts:14-21`
  - `app/(tabs)/library.tsx:126` (comment only; no JSX or style)
- Test: `__tests__/notificationHorizonScheduler.test.ts`:
  - T107 `:236-265` **inverted**
  - add T-NHS-10
  - delete the `cancelEntryAsync` describe (`:319-334`) and its import (`:16`)
- Test: `__tests__/horizonOrchestrator.test.ts`:
  - `@/db` mock `:31-34` gains `progressRepo.completedDaysInRange`
  - scheduler mock `:24-29` drops `scheduleWirdReminderAsync` and `cancelCategoryAsync`
  - T-HO-3 `:93-106` and T-HO-4 `:169-186` rewritten
  - add T-HO-8 and T-HO-9
- Test: `__tests__/wirdReminderReschedule.test.ts`:
  - `@/db` mock `:21-24` gains `progressRepo.completedDaysInRange`
  - T039 `:84-101`, T040 and T041 `:119-139` ported to DATE
- Test: `__tests__/notificationScheduler.test.ts`, ports for T-NS-2 to T-NS-6
  and T-NS-8 (`:76-176`, `:193-203`):
  - **T-NS-3** (category disabled) is replaced by T-HO-4. Delete it, with a
    one-line comment naming T-HO-4.
  - **T-NS-5** (idempotency) is replaced by T-NHS-2 and T-NHS-12. Delete it,
    with a comment.
  - **T-NS-2:** `reconcileHorizonAsync([wirdEntry])` gives
    `trigger.type === 'date'` and `channelId === 'wird-daily'`.
  - **T-NS-4:** the same call with permission denied schedules nothing.
  - **T-NS-6:** `cancelCategoryAsync('wird-daily')` cancels only wird-tagged
    requests.
  - **T-NS-8:** the same call yields the exact Arabic title and body.
- Test: `__tests__/notificationSchedulerExpoGo.test.ts`, imports `:46-51` and
  ports for T-EG-1 and T-EG-5 (`:71-83`, `:103-109`):
  - **T-EG-1:** `await reconcileHorizonAsync([wirdEntry(5, 35)])` with permission
    granted gives exactly one schedule call, with
    `trigger` `toMatchObject({ type: 'date' })`. The trigger's `date` has local
    hours 5 and minutes 35, and `content.data` `toMatchObject({ category: 'wird-daily' })`.
  - **T-EG-5:** the same call with permission denied gives zero schedule calls.
  - The registry mock at `:38-41` still provides `getCategory`.
    `mockIsCategoryEnabled` becomes unused; remove it.

`wirdEntry(h, m)` is a local helper:
`{ categoryId: 'wird-daily', localDay: <tomorrow>, fireAt: new Date(<tomorrow at h:m local>) }`.
Build it from local components, like `entry()` in
`notificationHorizonScheduler.test.ts:73-82`.

**Step 1: Write the failing tests** (the headline ones)

```ts
// notificationHorizonScheduler.test.ts — replaces the T107 survival describe
describe('T107 legacy repeating DAILY wird trigger is torn down', () => {
  it('cancels the legacy request and arms the horizon entry', async () => {
    Mock.__setScheduledNotifications([{ identifier: 'wird-repeating', content: { data: { category: 'wird-daily' } } }]);
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-10')]);
    expect(Mock.__getCancelCalls()).toContain('wird-repeating');
    const wird = Mock.__getScheduledNotifications().filter((n) => n.content.data?.category === 'wird-daily');
    expect(wird).toHaveLength(1);
    expect(wird[0].content.data!.localDay).toBe('2026-07-10');
  });
  it('an empty intended set cancels every wird request', async () => {
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-10')]);
    await reconcileHorizonAsync([]);
    expect(Mock.__getScheduledNotifications().filter((n) => n.content.data?.category === 'wird-daily')).toHaveLength(0);
  });
});
describe('T-NHS-10 goal met: dropping today from intended cancels exactly today', () => {
  it('cancels today and leaves tomorrow armed', async () => {
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-09'), entry('wird-daily', '2026-07-10')]);
    await reconcileHorizonAsync([entry('wird-daily', '2026-07-10')]);
    expect(Mock.__getScheduledNotifications().map((n) => n.content.data?.localDay)).toEqual(['2026-07-10']);
  });
});
```

```ts
// horizonOrchestrator.test.ts
const mockCompletedDays = jest.fn<Promise<string[]>, [string, string]>(async () => []);
jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: () => mockGetRepos(),
  progressRepo: { completedDaysInRange: (a: string, b: string) => mockCompletedDays(a, b) },
}));
const wirdIntended = () => lastIntended().filter((e) => e.categoryId === 'wird-daily');

describe('T-HO wird (Date pinned)', () => {
  // Fake ONLY Date; T-HO-5/6 rely on real setTimeout and would hang otherwise.
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 9, 21, 9, 0));
  });
  afterEach(() => jest.useRealTimers());

  it('T-HO-3: wird entries are armed at the PERSISTED time (not the default constant)', async () => {
    useSettingsStore.setState({ wirdReminderTime: { hour: 6, minute: 15 } });
    await assembleAndReconcile();
    expect(wirdIntended().length).toBeGreaterThan(0);
    for (const e of wirdIntended()) expect([e.fireAt.getHours(), e.fireAt.getMinutes()]).toEqual([6, 15]);
  });
  it('T-HO-4: a disabled wird category arms no wird entry', async () => { /* 'wird-daily': false */ await assembleAndReconcile(); expect(wirdIntended()).toHaveLength(0); });
  it("T-HO-8: today's goal met ⇒ no wird entry for today, tomorrow still armed", async () => {
    mockCompletedDays.mockResolvedValueOnce(['2026-10-21']);
    useSettingsStore.setState({ wirdReminderTime: { hour: 20, minute: 0 } });
    await assembleAndReconcile();
    expect(mockCompletedDays).toHaveBeenCalledWith('2026-10-21', '2026-10-21');
    expect(wirdIntended()[0].localDay).toBe('2026-10-22');
  });
  it('T-HO-9: a DB read failure is treated as NOT met (fail toward reminding)', async () => {
    mockCompletedDays.mockRejectedValueOnce(new Error('db closed'));
    useSettingsStore.setState({ wirdReminderTime: { hour: 20, minute: 0 } });
    await assembleAndReconcile();
    expect(wirdIntended()[0].localDay).toBe('2026-10-21');
  });
});
```

**wirdReminderReschedule.test.ts**, with Date pinned the same way to
2026-10-21 09:00:
- **T039:** after the first reconcile at 06:15 there are `WIRD_HORIZON_DAYS - 1`
  pending wird requests, because today's 06:15 has already passed at 09:00.
  After the time changes to 21:45 there are `WIRD_HORIZON_DAYS`, because
  today's 21:45 is still ahead. Every one has `trigger.type === 'date'` with
  local time 21:45, and no request is still at 06:15.
- **T040:** unchanged (nothing scheduled, nothing pending).
- **T041:** the seeded `legacy-0530` is cancelled. All pending wird requests
  are DATE triggers at 20:00, and there are `WIRD_HORIZON_DAYS` of them.

**Step 2:** Run
`npx jest __tests__/notificationHorizonScheduler.test.ts __tests__/horizonOrchestrator.test.ts __tests__/wirdReminderReschedule.test.ts __tests__/notificationScheduler.test.ts __tests__/notificationSchedulerExpoGo.test.ts`.
Expected: FAIL. The legacy request survives, there are no wird entries in
intended, and the deleted functions are still imported.

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

Then complete the deletions listed under Files, and the comment edits.
`grep -rn "scheduleWirdReminderAsync\|cancelWirdReminderAsync\|cancelEntryAsync\|WirdReminderConfig\|US4 descoped" app components services store hooks __tests__`
must return nothing, except a test comment that names a replacement.

**Step 4:** Run the five files and confirm PASS. Then run the whole suite and tsc.

**Step 5: Commit.** The body names the reversal.

```bash
git add services/notificationScheduler.ts services/horizonOrchestrator.ts services/wirdReminder.ts services/wirdReminderToggle.ts services/horizonRefreshTask.ts store/wirdStore.ts "app/(tabs)/library.tsx" __tests__/notificationHorizonScheduler.test.ts __tests__/horizonOrchestrator.test.ts __tests__/wirdReminderReschedule.test.ts __tests__/notificationScheduler.test.ts __tests__/notificationSchedulerExpoGo.test.ts
git commit -F - <<'MSG'
feat(wird): skip today's reminder once the goal is met; retire the repeating trigger

Reverses the "US4 descoped" decision recorded in dd26902, which kept the wird
reminder as a single repeating DAILY trigger ("immortal-but-redundant over
cancellable-but-silently-dies"). The ticket's acceptance criterion requires the
reminder only "if goal not met", and the user approved the reversal on
2026-10-21.

The wird reminder now lives on the rolling one-shot DATE horizon (14 days).
Today's entry is dropped once khz_days.wird_completed is set, read inside the
serialised assembleAndReconcile; a read failure counts as "not met". The legacy
DAILY request is torn down by the total reconcile on first launch (T107
inverted). Residual risk, accepted: reminders lapse if the app is not opened
for 14 days; every foreground and background top-up re-arms the full horizon.

Removes scheduleWirdReminderAsync, cancelWirdReminderAsync, cancelEntryAsync
and WirdReminderConfig (no production callers remain).
MSG
```

---

### Task 5: `wirdStore` — `goalMetToday` from the DB, `snapshotDay`, transition reconcile, disable race (~1.5 h)

**Files:**
- Modify: `store/wirdStore.ts`:
  - `:26-33` `WirdSnapshot`
  - `:45-49` initial state
  - `:51-72` `hydrate`
  - `:74-92` `setTarget`
  - `:94-98` `recomputeTodayPct`
  - `:106-122` `acceptSuggestion`
  - `:129-137` `setWirdEnabledFromSettings`
- Test: `__tests__/wirdStore.test.ts`:
  - the `@/db` mock `:35-48` gains `progressRepo.completedDaysInRange`
  - the `beforeEach` `setState` at `:72-80` gains `goalMetToday: false, snapshotDay: ''`
  - add `describe('T-WS …')`
- Test: create `__tests__/wirdDisableRace.test.ts` (real store, real
  orchestrator and real scheduler; `@/db` and AsyncStorage are mocked)

**Step 1: Write the failing tests**

```ts
// wirdStore.test.ts
const mockCompletedDays = jest.fn<Promise<string[]>, [string, string]>(async () => []);
// add to the progressRepo mock: completedDaysInRange: (a: string, b: string) => mockCompletedDays(a, b)
import { assembleAndReconcile } from '@/services/horizonOrchestrator';
import { toLocalDay } from '@/constants/progress';
const mockReconcile = assembleAndReconcile as jest.Mock;
const TODAY = () => toLocalDay();

describe('T-WS goal state comes from the same DB read as the horizon', () => {
  beforeEach(() => { mockReconcile.mockClear(); mockCompletedDays.mockReset().mockResolvedValue([]); });

  it('T-WS-1: hydrate sets goalMetToday from completedDaysInRange(today,today) and snapshotDay', async () => {
    mockCompletedDays.mockResolvedValue([TODAY()]);
    await useWirdStore.getState().hydrate();
    expect(mockCompletedDays).toHaveBeenCalledWith(TODAY(), TODAY());
    expect(useWirdStore.getState().goalMetToday).toBe(true);
    expect(useWirdStore.getState().snapshotDay).toBe(TODAY());
  });
  it('T-WS-2: recomputeTodayPct reconciles exactly once when the goal flips to met', async () => {
    useWirdStore.setState({ goalMetToday: false });
    mockCompletedDays.mockResolvedValue([TODAY()]);
    await useWirdStore.getState().recomputeTodayPct();
    expect(useWirdStore.getState().goalMetToday).toBe(true);
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });
  it('T-WS-3: no reconcile while still below the goal', async () => {
    useWirdStore.setState({ goalMetToday: false });
    await useWirdStore.getState().recomputeTodayPct();
    expect(mockReconcile).not.toHaveBeenCalled();
  });
  it('T-WS-4: no reconcile for pages read after the goal was already met', async () => {
    useWirdStore.setState({ goalMetToday: true });
    mockCompletedDays.mockResolvedValue([TODAY()]);
    await useWirdStore.getState().recomputeTodayPct();
    expect(mockReconcile).not.toHaveBeenCalled();
  });
  it('T-WS-5: setTarget re-reads goalMetToday from the DB (raising the target un-meets it)', async () => {
    useWirdStore.setState({ goalMetToday: true });
    mockCompletedDays.mockResolvedValue([]); // wirdRepo.setTarget cleared wird_completed
    await useWirdStore.getState().setTarget(20);
    expect(useWirdStore.getState().goalMetToday).toBe(false);
  });
  it('T-WS-6: the ring percentage is NOT what decides goal-met (199/200 rounds to 100%)', async () => {
    useWirdStore.setState({ target: 200, goalMetToday: false });
    mockPagesReadToday.mockResolvedValueOnce(199);
    await useWirdStore.getState().recomputeTodayPct();
    expect(useWirdStore.getState().todayPct).toBe(100);
    expect(useWirdStore.getState().goalMetToday).toBe(false); // the DB says not complete
  });
  it('T-WS-7: disabling cancels directly AND awaits a serialised reconcile', async () => {
    const { cancelCategoryAsync } = jest.requireMock('@/services/notificationScheduler');
    await useWirdStore.getState().setWirdEnabledFromSettings(false);
    expect(cancelCategoryAsync).toHaveBeenCalledWith('wird-daily');
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });
});
```

`__tests__/wirdDisableRace.test.ts`: disabling mid-flight leaves zero pending
wird requests.

```ts
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
let release!: () => void;
const gate = new Promise<void>((r) => (release = r));
jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: jest.fn(async () => ({})),
  // The first (in-flight) run blocks AFTER its settings snapshot, inside the goal-met read.
  progressRepo: { completedDaysInRange: jest.fn().mockImplementationOnce(async () => { await gate; return []; }).mockResolvedValue([]) },
  wirdRepo: {},
}));
import * as Mock from 'expo-notifications';
import { assembleAndReconcile } from '@/services/horizonOrchestrator';
import { useSettingsStore } from '@/store/settingsStore';
import { useWirdStore } from '@/store/wirdStore';

it('T-RACE-1: toggling wird off while a reconcile is in flight leaves ZERO pending wird requests', async () => {
  (Mock as any).__resetMock(); (Mock as any).__setPermissionResponse('granted');
  jest.spyOn(useSettingsStore.persist, 'hasHydrated').mockReturnValue(true);
  useSettingsStore.setState({ notifications: { ...useSettingsStore.getState().notifications, 'wird-daily': true }, wirdReminderTime: { hour: 23, minute: 59 } });

  const inFlight = assembleAndReconcile();   // snapshots wird=ON, then blocks
  useSettingsStore.getState().setNotificationEnabled('wird-daily', false);
  const disabling = useWirdStore.getState().setWirdEnabledFromSettings(false);
  release();
  await Promise.all([inFlight, disabling]);

  const wird = (Mock as any).__getScheduledNotifications().filter((n: any) => n.content.data?.category === 'wird-daily');
  expect(wird).toHaveLength(0);
});
```

Confirm at Step 2 that this test fails **without** the
`await assembleAndReconcile()` line. That proves it detects the race.

**Step 2:** Run `npx jest __tests__/wirdStore.test.ts __tests__/wirdDisableRace.test.ts`.
Expected: FAIL. `goalMetToday` and `snapshotDay` are undefined, there is no
reconcile on the transition, and the race leaves 13 or 14 pending wird requests.

**Step 3: Implement**

- `WirdSnapshot` gains:
  - `goalMetToday: boolean` — from `progressRepo.completedDaysInRange(today, today)`,
    the SAME read the horizon uses. Never `pages >= target` in JS.
  - `snapshotDay: string` — the local day this snapshot describes; `''`
    before the first hydrate.
- Add a private helper:

```ts
async function readGoalMetToday(today: string): Promise<boolean> {
  try { return (await progressRepo.completedDaysInRange(today, today)).includes(today); }
  catch { return false; } // same fail direction as the orchestrator
}
```

- `hydrate`:
  - capture `const today = toLocalDay()` **before** the reads;
  - add `readGoalMetToday(today)` to the `Promise.all`;
  - set `goalMetToday` and `snapshotDay: today`.
- `setTarget` and `acceptSuggestion`: after the repo write, set
  `goalMetToday: await readGoalMetToday(toLocalDay())`.
- `recomputeTodayPct`:

```ts
const { target, goalMetToday: wasMet } = get();
const today = toLocalDay();
const [pagesToday, met] = await Promise.all([progressRepo.pagesReadToday(), readGoalMetToday(today)]);
set({ todayPct: wirdPercent(pagesToday, target), goalMetToday: met });
// Audit gap 1: the page that completes today's wird cancels today's reminder,
// via the serialised orchestrator — never a direct cancel (design §3.3).
// Fire-and-forget so the notePageRead queue (achievement toasts) is not held.
if (met && !wasMet) void assembleAndReconcile().catch(() => undefined);
```

- `setWirdEnabledFromSettings(false)`:

```ts
await cancelCategoryAsync('wird-daily');     // immediate effect
await assembleAndReconcile();                // trailing run sees wird=OFF (design §3.1, trigger 4)
return;
```

**Step 4:** Re-run both files and confirm PASS. Then run tsc and the suite.

**Step 5: Commit**

```bash
git add store/wirdStore.ts __tests__/wirdStore.test.ts __tests__/wirdDisableRace.test.ts
git commit -m "feat(wird): cancel today's reminder the moment the goal is met"
```

---

### Task 6: Foreground handler suppresses a wird reminder whose goal is already met (~1 h)

**Files:**
- Modify: `__mocks__/expo-notifications.ts`:
  - `:97-101` store the handler
  - add `export function __getHandler(): MockNotificationHandler | null`
  - reset it in `__resetMock`
- Modify: `services/notificationScheduler.ts:147-174` `bootstrapNotificationHandler(options?)`
- Modify: `services/wirdReminder.ts` (append `shouldSuppressWirdNotification`)
- Modify: `app/_layout.tsx:283`. Pass the predicate. Import `toLocalDay` from
  `@/constants/progress`; `useWirdStore` is already imported.
- Test: `__tests__/wirdReminder.test.ts` (append T-SUP-*)
- Test: `__tests__/notificationScheduler.test.ts` (append T-NS-9)

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
  it('T-SUP-5: never suppresses another day’s entry, another category, or junk', () => {
    expect(shouldSuppressWirdNotification({ category: 'wird-daily', localDay: '2026-10-22' }, S)).toBe(false);
    expect(shouldSuppressWirdNotification({ category: 'prayer-fajr', localDay: '2026-10-21' }, S)).toBe(false);
    expect(shouldSuppressWirdNotification(null, S)).toBe(false);
  });
});

// __tests__/notificationScheduler.test.ts — isolated module so handlerRegistered is fresh
describe('T-NS-9 handler honours the injected suppress predicate', () => {
  const note = (data: Record<string, unknown>) => ({ request: { content: { data } } });
  it('all-false when suppressed, all-true otherwise, fails OPEN on throw', async () => {
    await jest.isolateModulesAsync(async () => {
      const M = require('expo-notifications');
      M.__resetMock();
      const { bootstrapNotificationHandler } = require('@/services/notificationScheduler');
      bootstrapNotificationHandler({ suppress: (d: { category?: string }) => {
        if (d.category === 'boom') throw new Error('x');
        return d.category === 'wird-daily';
      } });
      const h = M.__getHandler();
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

`services/wirdReminder.ts` stays pure: no store import and no `Date.now()`.

```ts
export type WirdSuppressionState = Readonly<{ goalMetToday: boolean; snapshotDay: string; todayLocalDay: string }>;
/** Foreground-only belt-and-braces (design §3.1): the in-flight race and the
 *  legacy DAILY request on first launch after upgrade. */
export function shouldSuppressWirdNotification(data: unknown, s: WirdSuppressionState): boolean {
  if (data === null || typeof data !== 'object') return false;
  const d = data as { category?: unknown; localDay?: unknown };
  if (d.category !== 'wird-daily') return false;
  if (!s.goalMetToday || s.snapshotDay !== s.todayLocalDay) return false;
  return d.localDay === undefined || d.localDay === s.todayLocalDay;
}
```

`bootstrapNotificationHandler(options?: Readonly<{ suppress?: (data: Readonly<Record<string, unknown>>) => boolean }>)`:
`handleNotification: async (notification)` reads
`notification?.request?.content?.data ?? {}`. It wraps `options?.suppress?.(data)`
in try/catch: a throw is logged via `logDev` and treated as `false`. It returns
the existing all-true object, or the same keys all set to `false`. Keep the
idempotency guard (T-NS-7 / T-EG-4).

In `app/_layout.tsx:283`:

```ts
bootstrapNotificationHandler({
  suppress: (data) => {
    const w = useWirdStore.getState();
    return shouldSuppressWirdNotification(data, {
      goalMetToday: w.goalMetToday, snapshotDay: w.snapshotDay, todayLocalDay: toLocalDay(),
    });
  },
});
```

**Step 4:** Re-run both files and confirm PASS. T-NS-7 and T-EG-4 still pass.
Then run tsc and the suite.

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
  `useDayRollover(navigatorReady);` right after `useHorizonReconcile(navigatorReady);`
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

- `arm()` clears the timer. **Only when `AppState.currentState === 'active'`**,
  it sets `timer = setTimeout(tick, msUntilNextLocalMidnight(new Date()) + 1000)`.
- `tick` is `void refreshIfLocalDayChanged(new Date()).finally(arm)`.
- Call `arm()` once when the effect starts. It is a no-op if the app is not active.
- AppState `change`:
  - `next !== 'active'`: clear the timer
  - `prev !== 'active' && next === 'active'`:
    `void refreshIfLocalDayChanged(new Date())`, then `arm()`
- Cleanup: clear the timer and `sub.remove()`.
- The header comment explains:
  - why only a day change triggers work;
  - why the timer runs only while active (iOS suspends JS timers; the
    foreground check covers the gap; a headless or background mount never
    holds a timer);
  - that the +1 s guards against firing a hair before midnight.

There is no hook unit test: the repo has no hook-testing library, and adding
one is a new dependency. Its logic lives in the tested `refreshIfLocalDayChanged`
and `msUntilNextLocalMidnight`. It is verified on device in Task 9 (B6).

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
- Test: `__tests__/wirdReminder.test.ts`. The existing T-WRC calls (`:59-105`)
  add `goalMetToday: false`. Append the two tests below.

**Step 1: Write the failing tests**

```ts
it('T050-5: goal met ⇒ next reminder is tomorrow even when today’s time is still ahead', () => {
  expect(computeNextWirdReminder(new Date(2026, 9, 21, 9, 0), { hour: 20, minute: 0 }, { goalMetToday: true }))
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

**Step 2:** Run `npx jest __tests__/wirdReminder.test.ts`. Expected: FAIL
(T050-5 returns today, T-WRC-6 contains اليوم).

**Step 3: Implement.** When `opts?.goalMetToday` is true, skip the
"today if still ahead" branch. Thread `goalMetToday` through
`formatNextWirdReminder(now, time, goalMetToday = false)`.

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
npm run lint 2>&1 | grep -E "notificationScheduler|notificationHorizon|horizonOrchestrator|horizonRefreshTask|wirdStore|wirdReminder|dayRollover|useDayRollover|progress\.ts|_layout\.tsx|library\.tsx|expo-notifications" -A 2
# expect: no new findings (pre-existing browse.tsx:603 is out of scope)
grep -rn "scheduleWirdReminderAsync\|cancelWirdReminderAsync\|cancelEntryAsync\|WirdReminderConfig\|isWirdGoalMet\|US4 descoped" app components services store hooks db
# expect: no hits
git diff main -- "app/(tabs)/library.tsx"   # expect: only the reminder-status lines + comment edits
git log --oneline main..HEAD               # expect: 8 implementation commits, each green (spot-check: git stash; git checkout <sha>; npx jest)
```

**Step 2: Visual QA (iOS simulator)**

Follow argent rules: `list-devices` first, then the
`argent-react-native-app-workflow` and `argent-device-interact` skills. Capture
at the 393 pt width that frame 06 was drawn at.

| # | Route / state | Compare against | Pass condition |
|---|---|---|---|
| V1 | `/library`, default state (goal **not** met, reminder on, permission granted) | `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/06-2031-4659.png` (node `2031:4659`) | Pixel-identical to a capture of `main` taken the same way (`screenshot-diff` shows no regression vs `main`). Wird card `DIV-75` geometry unchanged. |
| V2 | `/library` after reading pages to meet the goal (ring 100%) | No frame for this state. Contract: frame 06 layout plus `constants/layout.ts` / `constants/typography.ts` | Same layout as V1; only the caption text changes to "التذكير القادم: غدًا ⁦…⁩"; no new element; RTL intact |
| V3 | `/settings-wird-goal` (via the ring and via `/more/settings`) | No frame. Contract: `constants/layout.ts`, `constants/typography.ts`, `constants/rtlContracts.ts` | Unchanged from `main` |
| V4 | `/settings-wird-reminder` (via `/settings-notifications`) | No frame. Same contracts as V3. | Unchanged from `main` |
| V5 | `/more/settings` "هدف الورد اليومي" row | No frame. Same contracts as V3. | Unchanged |

**Step 3: Behavioural QA (simulator)**

List pending requests with argent `debugger-evaluate`:

```js
require('expo-notifications').getAllScheduledNotificationsAsync()
  .then(a => a.map(n => [n.identifier, n.content.data, n.trigger]))
```

- **B1 (upgrade migration).** Install `main`, grant permission, launch once
  (the legacy DAILY request is armed). Install this branch and launch. Expect
  no `wird-daily` request without `localDay`, and 14 DATE requests (13 if
  today's time has passed or the goal is met).
- **B2 (time change).** Set the reminder to now + 3 min from `/settings-wird-reminder`.
  Expect every pending wird `fireAt` to have the new time. Background the app.
  The notification arrives at that time.
- **B3 (goal met cancels today).** Set the target to 1 page and the reminder to
  now + 3 min. Record one page in the Mushaf. Expect today's `localDay` to be
  absent from the pending list within a few seconds and tomorrow to be present.
  Background the app. **No** notification at that time.
- **B4 (target raised re-arms).** After B3, raise the target to 5 via the ring.
  Today's entry is re-armed if its time is still ahead.
- **B5 (foreground suppression).** Keep the app foregrounded on Library with
  the goal met. Seed a request through `debugger-evaluate`: call
  `scheduleNotificationAsync` with data `{ category: 'wird-daily' }` and a
  1-minute DATE trigger. No banner appears.
- **B6 (day rollover).** The simulator clock follows the host and cannot be
  shifted safely. Covered by `dayRollover.test.ts`. Optional real check: leave
  the app foregrounded on Library across a local midnight; the ring returns to
  0% within about 1 s, without backgrounding.
- **B7 (disable).** Turn the reminder off on the Library toggle. Zero pending
  `wird-daily` requests, including right after a foreground (race fix).
- **B8 (idempotent foregrounds).** Run the pending-list snippet. Background and
  foreground the app twice, waiting more than 1 s each time for the debounced
  reconcile. Run the snippet again. The identifiers are identical and in the
  same set. Wrap `cancelScheduledNotificationAsync` and `scheduleNotificationAsync`
  with counters via `debugger-evaluate` before the two foregrounds; both stay
  at **0**. This catches any native `data` serialisation that breaks the
  `fireAt` key.

Record the results in `docs/plans/2026-10-21-daily-wird-reminders-qa.md`.
Screenshots stay untracked, like the other audit renders.

**Step 4: Commit QA record**

```bash
git add docs/plans/2026-10-21-daily-wird-reminders-qa.md
git commit -m "docs(qa): daily wird reminders on-device verification"
```

---

## Task order and dependencies (every commit green)

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

| Task | Leaves wird on | `wirdReminderReschedule.test.ts:87,94` |
|---|---|---|
| 1 | DAILY | green, unchanged |
| 2 | DAILY. The horizon can compute wird, but the orchestrator stopgap passes `'wird-daily': false`. | green, unchanged |
| 3 | DAILY. Scheduler key and cancel pass change for `OUR_CATEGORIES` (prayers only). | green, unchanged |
| 4 | **Horizon (atomic switch-over)** | rewritten to DATE in the same commit |
| 5–8 | Horizon | green |

- Task 5 depends on Task 4: the orchestrator's goal-met read and the real reconcile used by the race test.
- Tasks 6, 7 and 8 depend on Task 5 (`goalMetToday` and `snapshotDay`).

---

## Deviations (recorded during implementation)

- **Task 1, TZ pin.** The plan's `process.env.TZ = 'America/New_York'` at the
  top of `__tests__/localMidnightDst.test.ts` has no effect under Jest: each
  test file runs in a vm sandbox whose `process.env` is a plain copy, so the
  assignment never reaches Node's TZ setter (the precondition test caught it:
  both offsets stayed at the host's `-120`). The test now reaches the worker's
  real `process.env` through `vm.runInThisContext('process.env')`, sets TZ in
  `beforeAll` and restores it in `afterAll`, because the worker goes on to run
  other files. No dependency, no global Jest config change.
- **Task 3, Step 2.** T-NHS-11 (both cases) and T-NHS-12 already pass under
  the old `category|localDay` key, so they did not fail first: the old key
  ignores `fireAt` entirely, which makes the string-`fireAt` case a match and
  leaves the missing/non-finite case to the "not intended" cancel. They are
  guards for the new key rather than red tests; T-NHS-6, T-NHS-7b and T-NHS-9
  failed for the stated reasons.
- **Task 5, T-RACE-1.** As written, the test passed WITHOUT the fix: the
  in-flight run takes its settings snapshot only after `await getRepos()`, so
  toggling wird off synchronously after `assembleAndReconcile()` returned meant
  the "in-flight" run already read wird=OFF. The gated `completedDaysInRange`
  mock now also resolves a `mockParked` promise, and the test awaits it before
  toggling, so the toggle really lands after the snapshot. It then failed for
  the stated reason (14 pending wird requests) and passes with the fix. The
  gate variables carry a `mock` prefix because `jest.mock` factories may only
  reference such names. Added T-WS-5b (`acceptSuggestion` re-reads
  `goalMetToday`), which the plan's Step 3 requires but no listed test covered.
- **Task 3, `keyOfPending`.** Tighter than the plan's
  `Number.isFinite(Number(data.fireAt))`: it also returns null (cancel) when
  `fireAt` is neither a number nor a string, or is an empty/blank string. The
  plan's check would have accepted `''` (and `null`) as `0`. Behaviour-safe:
  the scheduler only ever writes a finite number, so the tightening can only
  cancel-and-re-arm a malformed pending entry, never keep one.
- **Spec-review follow-up, `recomputeTodayPct`.** `wasMet` now trusts the
  stored `goalMetToday` only when `snapshotDay` is today. Otherwise, if the day
  rolled over and today's goal completed before the rollover hydrate ran,
  yesterday's "met" flag would have masked today's false → true transition and
  skipped the reconcile that cancels today's reminder. `snapshotDay` itself is
  left for the rollover hydrate, which also promotes the pending target.
  Pinned by T-WS-4b.
