# Daily wird reminders — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro
(`EXPO_PUBLIC_VISUAL_AUDIT=1`) at `fix/wird-conditional-reminder` @ 9ea327d.
Baseline: same build at 0635ea1. Pending requests were read through
`debugger-evaluate` against `ExpoNotificationScheduler`.

## Visual (Task 9 Step 2)

| # | Check | Result |
|---|---|---|
| V1 | `npm run capture:ios`, fresh install, compared per pixel with the 0635ea1 captures (threshold 16/channel, status bar and home indicator excluded) | ✅ 23 of 23 captured frames at 0.000%, Library frame 06 included (the 5 transition frames are always skipped). Home first read 1.19% because its text drew in the fallback face on the first frame after install; a recapture was 0.000% |
| V2 | `/library` with the goal met (ring 100%) | ✅ same layout; only the caption changes to «التذكير القادم: غدًا ⁦٨:٤٠⁩ م» |
| V3 | `/settings-wird-goal` (via the `/more/settings` row) | ✅ 0.000% against 0635ea1 |
| V4 | `/settings-wird-reminder` (deep link) | ✅ 0.000% against 0635ea1 |
| V5 | `/more/settings`, «هدف الورد اليومي» row | ✅ 0.000% against 0635ea1 |

V3–V5 are full-resolution screenshots from the same fresh-install state on both builds, compared the same way as V1.

## Behaviour (Task 9 Step 3)

| # | Check | Result |
|---|---|---|
| B1 | Upgrade: base build armed, then this branch launched | ✅ base had one repeating `calendar` request at 20:00 with no `localDay`. After the switch it was gone and 13 DATE requests were pending from 22 Oct at 20:00 (today's 20:00 had already passed) |
| B2 | Reminder time changed to 20:30 | ✅ all 14 entries moved to 20:30, today included. With the app in the background the banner «تذكير الورد — حان وقت قراءة وردك اليومي من القرآن الكريم.» arrived at 20:30 |
| B3 | Target 5 pages, reminder 20:40, then 5 pages read | ✅ ring 100%; today's 20:40 entry cancelled within seconds, tomorrow's still armed |
| B4 | Target raised to 10 via the ring | ✅ today's 20:40 entry re-armed |
| B5 | Foreground suppression, goal met, app on Library | ✅ seeded a `wird-daily` request for today (15 s) and a `qa-control` request (45 s). The control was delivered to Notification Center; the wird one was not (the handler returns no alert, banner or list) |
| B6 | Day rollover | Not run on device: the simulator clock follows the host. Covered by `dayRollover.test.ts` |
| B7 | Library toggle off | ✅ 0 pending `wird-daily` requests; the wrapped native cancel counter rose by 14. Still 0 after a background/foreground cycle |
| B8 | Two background/foreground cycles with the reminder on | ✅ identical identifiers before and after; wrapped native `scheduleNotificationAsync` / `cancelScheduledNotificationAsync` counters stayed at 0 |

With the goal met and the reminder on, a fresh reconcile arms 13 requests starting tomorrow (14-day horizon, today skipped).

Gates on 9ea327d: `npx jest` 77 suites, 879 passed / 1 skipped; `npx tsc --noEmit` clean.

Not run in this pass: Android emulator; B6 on a device.
