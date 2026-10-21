# Daily Wird & Prayer Reminders — audit gap closure (design)

- **Ticket:** "Daily Wird & Prayer Reminders" — https://trello.com/c/ZJpUFYQB
- **Branch:** `fix/wird-conditional-reminder`
- **Date:** 2026-10-21
- **Status:** v2 — CTO review APPROVE WITH CHANGES applied (see §11); Q1–Q3 **approved by the user 2026-10-21**
- **Companion:** `docs/plans/2026-10-21-daily-wird-reminders-implementation-plan.md`

---

## 1. Problem

The ticket was marked Done but failed the acceptance-criteria audit. Two
criteria are only partially met, one needs a recorded decision, and two
minor findings need a recorded scope call.

| # | Audit finding | Evidence in code |
|---|---|---|
| 1 | **PARTIAL — "if goal not met".** The wird reminder is a repeating `DAILY` trigger that fires every day whatever the user has read. Nothing cancels or skips it when the goal is met, and the foreground handler always shows it. | `services/notificationScheduler.ts:196-229` (trigger at `:221-226`), handler at `:157-166`; `services/horizonOrchestrator.ts:145-156` re-asserts the `DAILY` trigger on every reconcile |
| 2 | **PARTIAL — no on-screen reset.** Nothing re-reads `useWirdStore` / `recomputeTodayPct` when the app returns to the foreground. If the app stays in memory overnight, the Library ring shows yesterday's percentage. | `store/wirdStore.ts:51-98` is hydrated once from `app/_layout.tsx:281-292`; the only AppState listeners are `hooks/useHorizonReconcile.ts:70`, `hooks/useBackgroundRefresh.ts:74`, `store/savedStore.ts:81`, `hooks/useNotificationPermission.ts:30`, `app/settings-notifications.tsx:67`, and none of them touch wird progress |
| 3 | **Decision — Fajr reset.** "Progress resets daily at midnight (or Fajr time if available)". | Day bucketing is `toLocalDay()` (`constants/progress.ts:162-169`), used by `db/repositories/pageReads.ts:30,81` and `db/repositories/wird.ts:76-78` |
| 4 | **Minor — Library card shows only %.** | `app/(tabs)/library.tsx:384-441` (`dailyWird` block) |
| 5 | **Minor — reminder time not editable from Library.** The goal screen is reached from Library only by tapping the ring. | `app/(tabs)/library.tsx:390-397`, `app/(tabs)/more/settings.tsx:189-194`, `app/settings-notifications.tsx:187` |

### Why finding 1 exists: the earlier descope

Finding 1 is a deliberate descope, not an oversight. Commit `dd26902`
("feat(wird): daily wird tracking…") records it:

> US4 (suppress the reminder once the goal is met) is descoped: a repeating
> trigger cannot be cancelled for a single day, setNotificationHandler only runs
> in the foreground, and an iOS UNNotificationServiceExtension intercepts remote
> push only. **Immortal-but-redundant was chosen over cancellable-but-silently-dies.**

The comments at `services/notificationScheduler.ts:78-92`, `:322-330`,
`services/notificationHorizon.ts:78-88` and `services/horizonRefreshTask.ts:5-9`
all say the same thing. The facts behind the descope still hold:

- a repeating `DAILY` trigger cannot skip one day;
- `setNotificationHandler` runs only while the app is in the foreground;
- background execution is not guaranteed (`services/horizonRefreshTask.ts:17-29`
  documents this frankly: iOS gives a force-quit app no background time, and
  Android OEM battery managers defer or kill tasks).

The acceptance criterion still says "reminds user **if goal not met**", so the
descope has to be reversed. This design does that, and treats the descope's
reason ("silently dies") as the main risk to engineer around (§4, "Residual risk") rather than
dismissing it. **The user approved the reversal on 2026-10-21 (Q1, §10).**

---

## 2. Acceptance criteria (verbatim)

- Users can set a daily wird goal (number of pages or juz fraction)
- Library tab wird card shows progress toward today's goal
- Progress resets daily at midnight (or Fajr time if available)
- Optional local notification reminds user if goal not met by configurable time
- Weekly/monthly wird completion history is viewable
- Wird settings are accessible from both Library tab and Settings screen

Criteria 1, 5 and 6 pass the audit and are untouched by this plan.
Criterion 2 passes (the ring is progress toward the goal); finding 4 is a
display nicety, covered in §6.

---

## 3. Approach chosen

### 3.1 Conditional reminder: move wird back onto the rolling one-shot horizon

Replace the repeating `DAILY` wird trigger with **one-shot `DATE` triggers, one
per local day, over a rolling `WIRD_HORIZON_DAYS = 14` day horizon**. Every
pending wird request is tagged `{ category: 'wird-daily', localDay, fireAt }`.
**Today's entry is left out of the intended horizon once today's goal is met**,
so the total reconcile cancels it.

This reuses the machinery the repo already has instead of building a second
system:

| Existing piece | Role in this design |
|---|---|
| `computeHorizon` (`services/notificationHorizon.ts:131-165`), a pure function with the clock injected | Also emits the wird entries. Gains two **required** inputs, `wirdReminderTime` and `wirdGoalMetToday` |
| `horizonDaysFor` (`:63-69`), the iOS 64-slot budget | Gains a `reservedSlots` argument so the prayer horizon shrinks to fit around the wird slots instead of overflowing |
| `reconcileHorizonAsync` (`services/notificationScheduler.ts:332-373`), a total, idempotent diff | `wird-daily` joins `OUR_CATEGORIES` (`:86-92`). The identity key gains `fireAt`, so a changed reminder time re-arms (see §3.2) |
| `assembleAndReconcile` (`services/horizonOrchestrator.ts:83-100`), the only assembler, serialised leading + trailing | Reads "goal met today" from the DB inside the serialised run and drops the special `DAILY` branch (`:145-156`) |
| `useHorizonReconcile` (`hooks/useHorizonReconcile.ts`): boot + foreground | Unchanged. It now tops up the wird horizon as well |
| `horizonRefreshTask` (`services/horizonRefreshTask.ts`): best-effort background top-up | Unchanged in code. It now tops up the wird horizon as well (header comment updated) |
| `cancelEntryAsync` (`services/notificationScheduler.ts:391-407`), "Used when a goal is met" | **Deleted.** It has no production caller. The goal-met path goes through `assembleAndReconcile` instead, so it cannot race a reconcile that is already in flight (see §3.3) |

**Goal-met source of truth.** The orchestrator reads
`progressRepo.completedDaysInRange(today, today)` (`db/repositories/pageReads.ts:152-160`).
That reads `khz_days.wird_completed`, the flag the history grid also uses. It is
maintained by `recordPageRead` (`pageReads.ts:44-66`) and by `wirdRepo.setTarget`
(`db/repositories/wird.ts:103-115`). Reading the DB rather than `useWirdStore`
matters because the headless background task has no hydrated store. **If the
read fails, the orchestrator treats the goal as not met**, so failures lean
toward a redundant reminder rather than a missing one, in keeping with the
original descope's preference.

**One source of truth for "goal met" (v2).** `useWirdStore.goalMetToday` is
derived from **the same** DB read: `completedDaysInRange(today, today)`, called
in `hydrate`, `recomputeTodayPct`, `setTarget` and `acceptSuggestion`. It is
never recomputed from `pagesToday >= target` in JS. The ring, the foreground
suppressor, the Library caption and the horizon can therefore never disagree
about whether today's goal is met. (v1 had a separate `isWirdGoalMet` helper;
it was cut.)

**Triggers that re-run the reconcile** (each one is serialised through
`assembleAndReconcile`):

1. Boot and every foreground (`useHorizonReconcile`), unchanged.
2. **Goal transition** (new): `wirdStore.recomputeTodayPct` fires a reconcile
   when `goalMetToday` flips from false to true. That is the page that
   completes the wird, reached through `progressStore.notePageRead`
   (`store/progressStore.ts:191`).
3. Target change: `wirdStore.setTarget` already reconciles (`store/wirdStore.ts:91`).
   Raising the target above today's pages re-arms today's reminder if its time
   is still ahead. Lowering it below today's pages cancels the reminder.
4. Reminder-time change and toggle: `applyWirdReminderTime` and
   `setWirdReminderEnabled` (`services/wirdReminderToggle.ts`).
   **Disable race (v2):** `wirdStore.setWirdEnabledFromSettings(false)`
   (`store/wirdStore.ts:129-134`) keeps its direct `cancelCategoryAsync('wird-daily')`
   for an immediate effect, then **`await assembleAndReconcile()`**. Without that,
   a reconcile that started before the toggle (its settings snapshot still says
   wird is on) would schedule its delta after the direct cancel and re-arm up to
   14 entries. The trailing run reads the new setting and cancels them. A test
   pins this: disabling mid-flight leaves zero pending wird requests.
5. Day rollover (new, §3.4): `wirdStore.hydrate` reconciles (`store/wirdStore.ts:67`).
6. Background task, unchanged.

**Foreground suppression (defence in depth).** The goal can be met seconds
before the reminder fires, while a reconcile is still in flight. Also, on the
first launch after upgrade, the legacy `DAILY` request may still be pending.
To cover both, `bootstrapNotificationHandler` takes an optional `suppress`
predicate. `app/_layout.tsx` installs one, backed by a pure
`shouldSuppressWirdNotification(data, state)` in `services/wirdReminder.ts`.
It returns true only when all of the following hold:

- `data.category === 'wird-daily'`;
- the wird store's snapshot is for today and its goal is met;
- the notification's `localDay` is today, or missing (the legacy `DAILY` request).

The predicate fails open: if it throws, the notification is shown. The
scheduler module still imports no store, and the predicate is injected.

### 3.2 Reconcile identity includes `fireAt`

Today the reconcile key is `category|localDay` (`notificationScheduler.ts:283-285`),
and an already-armed entry with a matching key is left alone (`:359-360`).
Under a wird horizon, a user who changes the reminder time from 20:00 to 06:00
would therefore keep fourteen stale 20:00 entries. Prayers have the same latent
bug when the location changes, but it never shows because no prayer is ever
armed in production (`horizonOrchestrator.ts:44-50`; every prayer is
`available: false`).

Fix: the key becomes `category|localDay|fireAtMs`, and `data.fireAt` (epoch ms)
is written on every scheduled entry. Entries armed by older builds carry no
`fireAt`, so they are cancelled and re-armed once, which is harmless.

**Tolerant key (v2).** The native bridge round-trips `data` through
serialisation, so the key reads `Number(data.fireAt)`. It is null (meaning
cancel) unless that is finite, and unless `category` and `localDay` are
strings. The Jest mock is made realistic to match: it JSON round-trips `data`
and stores the `trigger` on each pending request. A unit test plus on-device
check B8 pin that two consecutive reconciles with unchanged input produce zero
cancels and zero schedules, with identical identifiers.

**Changing the time after today's reminder fired (documented behaviour).**
Say today's 08:00 reminder fires, the goal is not met, and the user then moves
the time to 20:00. The key now differs and 20:00 is still ahead, so a new entry
for today is armed and the user is reminded again at 20:00. This is intended:
the user asked to be reminded at 20:00 and the goal is unmet. Moving the time
earlier than "now" arms nothing for today; the past instant is dropped by
`computeHorizon`.

**Permission gate narrowed (v2).** `reconcileHorizonAsync` currently returns
early when permission is not granted (`notificationScheduler.ts:336-337`), so a
user who disables wird while permission is revoked keeps stale pending
requests. v2 runs the **cancel pass** regardless of permission and gates only
the **schedule pass** (and Android channel creation).

### 3.3 Why the goal-met path does not call `cancelEntryAsync` directly

A direct cancel races the serialised reconcile. If a foreground reconcile has
already snapshotted "not met" and then schedules the delta, it re-arms the
entry we just cancelled. `assembleAndReconcile` exists to prevent exactly this:
a caller that arrives mid-flight gets a guaranteed trailing run that reads
fresh state (`horizonOrchestrator.ts:77-81`). The goal-met path therefore calls
`assembleAndReconcile()` fire-and-forget, and does not block the
`_notePageQueue` achievement toasts.

### 3.4 On-screen day reset (finding 2)

- `useWirdStore` gains `snapshotDay: string` (the `toLocalDay()` that `hydrate`
  ran for) and `goalMetToday: boolean`.
- New `services/dayRollover.ts` exports `refreshIfLocalDayChanged(now)`. If
  `toLocalDay(now) !== useWirdStore.getState().snapshotDay`, it re-runs
  `useProgressStore.getState().hydrate()` and `useWirdStore.getState().hydrate()`.
  `wirdStore.hydrate` also promotes any pending target
  (`db/repositories/wird.ts:76-78`) and reconciles, which rolls the horizon.
  Concurrent calls coalesce into one in-flight promise. The function never
  throws: a failure sets `dbFailed`, and the existing Library retry banner
  handles that.
- New mount-once `hooks/useDayRollover.ts`, mounted in `app/_layout.tsx` next
  to `useHorizonReconcile` and gated on `navigatorReady`. It does two things:
  - On every background/inactive → active transition, call
    `refreshIfLocalDayChanged(new Date())`.
  - **Midnight timer while foregrounded:** `setTimeout(msUntilNextLocalMidnight(now) + 1000)`,
    re-armed after each fire, cleared when the app goes to the background
    (iOS suspends JS timers there anyway) and re-armed when it becomes active.
    **The timer is armed only while `AppState.currentState === 'active'` (v2)**,
    both on mount and after each fire, so a hook that mounts during a headless
    or background launch never holds a timer.
- New pure `msUntilNextLocalMidnight(now)` in `constants/progress.ts`, next to
  `toLocalDay`. It builds the target from local components
  (`new Date(y, m, d + 1, 0, 0, 0, 0)`), so DST days of 23 or 25 hours come out
  right. A TZ-pinned test (`America/New_York`, 2026-03-08 and 2026-11-01)
  proves the 23 h and 25 h cases.

Day-change only, rather than on every foreground, so a normal task switch adds
no DB work.

### 3.5 Honest "next reminder" caption

`describeWirdReminder` (`services/wirdReminder.ts:122-136`) derives "التذكير
القادم: اليوم …" purely from the clock. Once today's entry is cancelled because
the goal is met, that caption would be false, which is the defect class
`services/wirdReminder.ts:106-121` was written to prevent. Fix:
`computeNextWirdReminder` takes `{ goalMetToday }` and skips today when it is
true. `describeWirdReminder`'s status gains a **required** `goalMetToday`. The
Library passes `useWirdStore(s => s.goalMetToday)`. Only the text of an existing
line changes ("اليوم" becomes "غدًا"). No element is added.

### 3.6 Fajr reset (finding 3): keep midnight

**Decision: keep local midnight.** The criterion explicitly allows it
("midnight (or Fajr time if available)"). Fajr would be neither cheap nor safe:

1. **Fajr is not available.** `prayerTimesProvider` is never installed
   (`services/horizonOrchestrator.ts:44-58`, `TODO(US3)`). All five prayer
   categories are `available: false` (`services/notificationRegistry.ts:32-67`),
   and the prayer location may be unset. A Fajr boundary would have to fall
   back to midnight anyway for most users.
2. **The day key is everywhere.** `toLocalDay()` buckets page reads
   (`pageReads.ts:30`), the `khz_days` aggregate (`pageReads.ts:48-66`),
   today's pages (`:81`), streaks (`:96`), the trend (`:116`), the history grid
   (`app/(tabs)/library.tsx:220-223`), pending-target promotion (`wird.ts:76-78`)
   and achievements. A Fajr day would need a "wird day" mapping in every one of
   these, plus a migration of historical rows. Reading done between 00:00 and
   Fajr would also silently move to the previous day in the existing history.
3. **Two day definitions would disagree.** If the ring reset at Fajr but the
   streak, history and achievements reset at midnight, the screens would
   contradict each other.

Recorded as out of scope (§9). The `msUntilNextLocalMidnight` seam is where a
future Fajr boundary would plug in.

---

## 4. Alternatives rejected

### 4.1 Keep `DAILY`, suppress only in the foreground handler

`setNotificationHandler` runs only while the app is foregrounded. A reminder
meant to reach a user who is *not* in the app would still fire after the goal
is met, so the criterion would remain unmet. This design keeps the handler only
as defence in depth (§3.1).

### 4.2 Hybrid: `DAILY` normally; on goal met, swap in a one-shot for tomorrow and restore `DAILY` on next launch

There would be two scheduling modes, and both would have to be reconciled. If
the user meets the goal and then does not open the app the next day, the
reminders stop after one day. That is a worse "silently dies" window (1 day)
than a 14-day horizon. Rejected.

### 4.3 Remote push / notification service extension / background check before fire

- There is no backend: `EXPO_PUBLIC_API_BASE` is unset (CLAUDE.md, architecture note).
- A `UNNotificationServiceExtension` intercepts remote push only.
- Background tasks are not guaranteed (`horizonRefreshTask.ts:17-29`).

Rejected as infeasible without new infrastructure or dependencies.

### Residual risk accepted with the chosen approach ("silently dies", reframed)

A user who opens the app on day D has wird reminders armed through day D+13. A
user who does not open the app for 14 days stops getting wird reminders on day
D+14. Mitigations:

- **Horizon length.** Wird costs one slot a day, so it gets 14 days, twice the
  prayers' 7. Budget: 14 wird slots plus 5 × 7 = 35 future prayer slots is 49,
  under the 56-slot ceiling (`notificationHorizon.ts:45-48`). Today, with
  prayers unarmed, it uses 14 of 64.
- **Every touch re-arms.** Any foreground, page read, settings change or
  background-task wake re-arms the full 14 days.
- **Background top-up.** This now covers wird as well. Android in particular
  will usually keep the horizon topped up.
- **Bounded harm.** The lapse affects only users who have not opened the app
  for two weeks.

The user accepted this trade-off on 2026-10-21 (**Q1, approved**).

---

## 5. Data, store, service and route changes

**No schema change, no new route, no new dependency.**

| File | Change |
|---|---|
| `constants/progress.ts` | `+ msUntilNextLocalMidnight(now: Date): number` |
| `services/notificationHorizon.ts` | `HorizonInput` gains `wirdReminderTime: TimeOfDay` and `wirdGoalMetToday: boolean` (both required). `+ WIRD_HORIZON_DAYS = 14`. `horizonDaysFor(n, reservedSlots = 0)`. `computeHorizon` emits wird entries. |
| `services/notificationScheduler.ts` | `wird-daily` joins `OUR_CATEGORIES`. Key and `data` gain `fireAt`; the key is tolerant (`Number(data.fireAt)` with a finite check). The cancel pass runs without permission; only scheduling is gated. **Remove** `scheduleWirdReminderAsync`, `cancelWirdReminderAsync`, `isWirdDaily`, `cancelEntryAsync`, the `WirdReminderConfig` type and the now-unused `isCategoryEnabled` import (none has a production caller after the switch-over). `bootstrapNotificationHandler(options?: { suppress?(data): boolean })`. Comments that describe the descope are rewritten. |
| `services/horizonOrchestrator.ts` | Reads `wirdGoalMetToday` from `progressRepo.completedDaysInRange`, passes the wird fields to `computeHorizon`, and drops the `DAILY` branch and the `scheduleWirdReminderAsync` / `cancelCategoryAsync` imports. |
| `store/wirdStore.ts` | Snapshot `+ goalMetToday` (from `progressRepo.completedDaysInRange(today, today)`, the same read the horizon uses), `+ snapshotDay`. `recomputeTodayPct` reconciles on a false → true transition. `hydrate`, `setTarget` and `acceptSuggestion` set `goalMetToday`. `setWirdEnabledFromSettings(false)` does a direct cancel, then `await assembleAndReconcile()`. |
| `services/dayRollover.ts` (new) | `refreshIfLocalDayChanged(now)` |
| `hooks/useDayRollover.ts` (new) | AppState plus midnight timer; mount-once |
| `services/wirdReminder.ts` | `computeNextWirdReminder(now, time, opts?)`. `describeWirdReminder` status `+ goalMetToday` (required). `+ shouldSuppressWirdNotification(data, state)`. |
| `app/_layout.tsx` | Mount `useDayRollover(navigatorReady)`; pass `suppress` to `bootstrapNotificationHandler` (`:283`). |
| `app/(tabs)/library.tsx` | `:131-134`: pass `goalMetToday` into `describeWirdReminder`. **No JSX or style change.** |
| `services/horizonRefreshTask.ts`, `services/wirdReminderToggle.ts` | Comment-only: wird now depends on the horizon and the top-up task |
| `__mocks__/expo-notifications.ts` | Realism: the pending list stores each request's `trigger`, and `data` is JSON round-tripped as the native bridge does. `+ __getHandler()`, so the installed handler can be invoked in tests. |

**Legacy migration.** On the first reconcile after upgrade, the old repeating
`wird-daily` request (it has no `localDay`) is now inside `OUR_CATEGORIES` and
matches no intended key, so the total reconcile cancels it and arms the 14 DATE
entries. No migration flag is needed. This is the old T107 teardown, restored
deliberately; the T107 survival test is inverted back.

---

## 6. Figma frames affected

| Frame | Node | Reference | What must stay identical |
|---|---|---|---|
| 06 Library | `2031:4659` | `docs/audit/2026-09-09/figma-reference/06-2031-4659.png` | The whole wird card `DIV-75`: ring `DIV-77` showing "70%", title `H3-83` "ورد القرآن اليومي", "بدء الورد" `BUTTON-87`, reading summary `P-91` / `P-94`, toggle row `SPAN-100` "التذكير اليومي", plus every other section of the frame. **This plan changes no JSX, no style and no layout constant in `library.tsx` or `components/khazain/library/libraryLayout.ts`.** |

**Finding 4: pages/target on the card. Out of scope; the frame has no slot.**
Extracting the frame (`scripts/figma/extract-text-styles.js docs/KHAZAYIN.fig`)
shows exactly six text nodes in the wird card `DIV-75`: `70%`, `ورد القرآن
اليومي`, `بدء الورد`, `آخر قراءة: اليوم`, `سورة البقرة - الآية 142`, `التذكير
اليومي`. The ring carries only a percentage, and the title block `DIV-76` holds
only the H3. Adding "١٢ / ٢٠ صفحة" would add a node the frame does not have.
Under "Figma wins for visual layout of a covered screen", it stays out. The
criterion is already met: the ring is progress toward today's goal, and the
goal in pages is shown on `/more/settings` ("هدف الورد اليومي — N صفحة",
`app/(tabs)/more/settings.tsx:189-194`) and on `/settings-wird-goal`. A
zero-pixel `accessibilityValue` on the ring is offered as **Q4**, not planned.

**Finding 5: reminder time not editable from Library. Recorded, no change.**
Criterion 6 is met. Library reaches the goal editor through the ring
(`library.tsx:390-397` (ring `Pressable`, push at `:395`)) and toggles the reminder inline (`:428-432`, `Toggle` at `:430`). The
Settings screen reaches the goal (`more/settings.tsx:189-194`) and, through
`/settings-notifications`, the reminder time (`settings-notifications.tsx:187`).
The frame's toggle row (`DIV-97`) has no time affordance, so adding one would
break the frame.

**Pre-existing divergence, not introduced here.** The app draws a caption line
(`styles.wirdReminderNext`, `library.tsx:435-438`, style at `:781`) that `DIV-75` does not have.
This plan changes only that line's text when the goal is met. Visual QA should
compare the default (goal not met) state, which renders the same as today.

Screens with no frame that this plan touches behaviourally (no layout change):
`/settings-wird-goal`, `/settings-wird-reminder`, `/settings-notifications`
and `/more/settings`. Their contracts are `constants/layout.ts`,
`constants/typography.ts` and `constants/rtlContracts.ts`.

---

## 7. RTL considerations

- No new UI elements, so no new `PHYSICAL_ROW` / `RTL_TEXT` surface.
- The caption change reuses `formatClockTime`, whose LTR isolates
  (`services/wirdReminder.ts:16-20`, T117) keep `٨:٠٠` from reordering, and
  swaps only the existing `اليوم` / `غدًا` word.
- The notification title and body are unchanged (`notificationScheduler.ts:58-60`),
  so the OS renders the same Arabic strings.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Reminders lapse after 14 days without opening the app (the descope's reason) | 14-day horizon, re-arm on every touch, background top-up, user sign-off (**Q1**) |
| The goal is met and the app is killed before the reconcile finishes, so today's reminder still fires | Fails toward a redundant reminder, which is the original preference. The foreground suppressor covers the in-app case. |
| Timezone travel or a DST shift: DATE instants are absolute | The key includes `fireAt`, so the next foreground or background reconcile re-arms at the new local wall time. Until then a reminder may fire at the old wall time. Accepted. |
| iOS 64-slot cap once prayers ship | `horizonDaysFor(n, reservedSlots)`, with a test pinning `days*n + 14 <= 56` for n = 1..7 |
| Concurrency: goal-met cancel vs an in-flight reconcile | Only `assembleAndReconcile` is used (leading + trailing serialisation, T-HO-5/6) |
| `wirdStore.hydrate` double reconcile on rollover (`useHorizonReconcile` foreground + hydrate) | Serialised; at most one trailing run; idempotent |
| A DB read failure in the orchestrator | Treat as not met, so the reminder is still armed |
| Removing `scheduleWirdReminderAsync` breaks hidden callers | grep shows its only caller is `horizonOrchestrator.ts:153`; `cancelWirdReminderAsync` is called only by `scheduleWirdReminderAsync` itself (`:210`); `cancelEntryAsync` is called only by its own test. Tests that used them (`notificationScheduler.test.ts`, `notificationSchedulerExpoGo.test.ts`, `wirdReminderReschedule.test.ts`) are ported in the same atomic commit. |
| Disable toggled while a reconcile is in flight re-arms wird | Direct cancel, then `await assembleAndReconcile()`, which forces a trailing run with the new setting; pinned by a mid-flight test |
| Two sources of "goal met" drift apart (JS `pages >= target` vs DB `wird_completed`) | v2 derives the store field from the DB read the horizon uses |
| Intermediate commits break the suite | v2 task order: the switch-over (categories, orchestrator, removals, test ports) is one atomic commit (Task 4); every commit is green |

---

## 9. Out of scope

- A Fajr-based day boundary (§3.6).
- Pages/target text on the Library card (§6, finding 4).
- A reminder-time editor on the Library card (§6, finding 5).
- Prayer notifications: no provider install, no `available` flip, no FR-068
  copy. Prayers keep working through the same horizon, and only the slot budget
  accounts for them.
- A "reminders paused, open the app" notification at the end of the horizon.
  Rejected for now: a varying body on the last entry makes reconcile identity
  depend on horizon position.
- In-product disclosure (FR-069-style) of the 14-day lapse. See Q1.
- Juz-fraction goal presets: criterion 1 already passes.
- Any change to legacy files listed in CLAUDE.md.

---

## 10. Open questions (each has a default so work can proceed)

| # | Question | Default used by the plan |
|---|---|---|
| Q1 | Reverse the "US4 descoped" decision (commit `dd26902`), accepting that wird reminders lapse after 14 days with no app open (vs the current reminder that fires forever but ignores the goal)? | **APPROVED by the user 2026-10-21:** reverse it. |
| Q2 | Wird horizon length? | **APPROVED by the user 2026-10-21:** 14 days (slot math in §4) |
| Q3 | Keep the midnight reset rather than Fajr? | **APPROVED by the user 2026-10-21:** midnight (§3.6) |
| Q4 | Add a zero-pixel `accessibilityValue` ("١٢ من ٢٠ صفحة") to the Library ring? | **Not done.** Recorded as an optional follow-up; it does not affect pixels. |
| Q5 | Should a user-facing note (e.g. on `/settings-wird-reminder`) disclose that reminders need the app opened at least every two weeks? | **Not done.** No frame or copy exists; copy needs client approval. |

---

## 11. Revision history

**v2, 2026-10-21: CTO review "APPROVE WITH CHANGES".** User approval of Q1–Q3
is recorded in §10. Changes, all reflected above and in the implementation plan:

1. **No red intermediate commits.** Task 2 passes `enabled` with
   `'wird-daily': false` at the orchestrator call site as a stopgap. The
   `OUR_CATEGORIES` change, the T107 inversion and T-NHS-10 move into Task 4,
   so the switch-over is one atomic commit. `wirdReminderReschedule.test.ts:87,94`
   stays green through Tasks 1–3.
2. **T-NHS-3 seed.** The `keep` seed (`notificationHorizonScheduler.test.ts:130`)
   carries `fireAt` under the new key.
3. **Ports and dead code.** `notificationSchedulerExpoGo.test.ts` T-EG-1 and
   T-EG-5 are ported to `reconcileHorizonAsync([wirdEntry])`, asserting
   `type: 'date'`. The unused `isCategoryEnabled` import and `WirdReminderConfig`
   are deleted.
4. **Disable race** (§3.1, trigger 4).
5. **One source of truth for goal met** (§3.1). `isWirdGoalMet` and T-GM-* are cut.
6. **Mock realism.** The mock stores `trigger` and JSON round-trips `data`. The
   key is tolerant (§3.2). QA B8 covers idempotent consecutive foregrounds.
7. **Named reversal.** Task 4's commit body names the `dd26902` reversal.

Optional items accepted:
- `useDayRollover` arms only while the app is active.
- The reconcile cancel pass runs without permission.
- `cancelEntryAsync` is deleted.
- The behaviour of changing the time after a reminder has fired is documented.
- A TZ-pinned DST test is added.
