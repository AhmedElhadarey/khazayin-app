# Exact alarms: not requested in v1

**Status for v1.0.0:** there is no exact-alarm declaration to file. `USE_EXACT_ALARM` and `SCHEDULE_EXACT_ALARM` are both in `app.json` → `android.blockedPermissions`, and `./plugins/withExactAlarmPermissions` has been removed from `plugins` (the file is kept). Design §0 reverses D3. The only notification in v1 is the daily wird reminder. Without either permission, Android schedules it as an inexact alarm, and a few minutes of drift is acceptable for a reminder. Before you upload, confirm that the merged manifest of the release AAB lists neither permission (`aapt dump permissions`). If either appears, Play shows the **Exact alarm permission** form, and the answer would be untrue for this build.

## For the future release that turns on prayer notifications

Re-add the plugin and remove both entries from `blockedPermissions` **in the same change** that enables prayer notifications (RELEASE-READINESS §5: approved copy, `available: true`, provider installed). Then file this declaration.

Where: Play Console → App content → **Exact alarm permission** (`USE_EXACT_ALARM`). Keep `SCHEDULE_EXACT_ALARM` with `maxSdkVersion 32` for older devices.

**Draft text (only valid once prayer notifications ship), to paste:**

> Core functionality: the app's prayer-time feature notifies the user at the start of each of the five daily Islamic prayers (Fajr, Dhuhr, Asr, Maghrib, Isha). The times are calculated on the device from the user's approximate location and chosen calculation method. A prayer-time alert is only useful if it fires at the calculated minute: an alert that arrives several minutes late can fall after the prayer has begun, and for Maghrib and Fajr the window matters for fasting and for the prayer itself. The user enables each prayer individually in the app's notification settings, and can disable any of them at any time. The app schedules at most five exact alarms per day, plus a top-up when the schedule horizon runs low. It does not use exact alarms for any other purpose.

**Risk (design §7 R1):** Play limits `USE_EXACT_ALARM` to apps whose core function is an alarm, clock or calendar. If the reviewer rejects it, fall back to `SCHEDULE_EXACT_ALARM` only, without the `maxSdkVersion` cap, plus the runtime "Alarms & reminders" special-access prompt. That needs no declaration, but the user has to grant it.
