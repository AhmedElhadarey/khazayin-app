# Play Console: Foreground service declaration (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`)

Where: Play Console → **App content → Foreground service permissions**. Play shows this form because the merged manifest declares `android.permission.FOREGROUND_SERVICE` and `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`. Both come from `react-native-track-player` and are kept in `app.json`.
No other foreground-service type is declared. expo-location's `LocationTaskService` (type `location`) is removed from the merged manifest, and `FOREGROUND_SERVICE_LOCATION` is in `blockedPermissions` (design §0, §4.3).

## Form answers

**Foreground service type:** Media playback

**Feature using it (task description), to paste:**

> The app plays long-form Islamic audio lectures and scholarly commentaries (for example multi-hour explanations of hadith collections), streamed from archive.org. Playback starts only when the user taps play on a lecture. The media-playback foreground service, provided by react-native-track-player (MusicService), keeps that user-initiated playback running when the user leaves the app or locks the screen. While it runs, a persistent media notification shows the lecture title with play/pause, skip next/previous, seek and stop controls. These are also exposed on the lock screen and through MediaSession to Bluetooth and headset buttons. Playback stops when the user pauses or stops it from the app, the notification or the lock screen.

**Why it must start/continue in the background and can't be deferred or interrupted, to paste:**

> Listening to a lecture is a continuous, user-perceptible task, and users listen with the screen off, during commutes, or while using other apps. If the system deferred or killed the work, the audio the user is actively listening to would cut out mid-sentence. WorkManager or a deferred job cannot provide continuous, real-time audio output. The service runs only while audio is playing or paused in an active session, and always shows a visible notification with controls to stop it.

**User impact if the task is deferred or interrupted:** Audio playback the user started stops abruptly.

**Is the task user-initiated?** Yes. It runs only after the user taps play.

## Required demo video (30 to 60 seconds)

Record on a release build (`com.khazayin.app`) on a Pixel phone, with Arabic UI and the clean demo-mode status bar. Upload it unlisted (for example to the Foundation's YouTube) and paste the link in the form.

| # | Time | What to show |
| --- | --- | --- |
| 1 | 0–5 s | Launch the app → Sections (الأقسام) → العلماء والمشايخ |
| 2 | 5–12 s | Open a scholar (for example الشيخ ابن عثيمين) → tap a lecture series that has audio (for example «شرح رياض الصالحين») → playback starts and the MiniPlayer appears |
| 3 | 12–20 s | Pull down the notification shade: the media notification with title and controls is visible |
| 4 | 20–28 s | Press Home: audio keeps playing. Open another app briefly to show it keeps playing |
| 5 | 28–40 s | Lock the screen: the lock-screen media controls are shown. Tap pause, then play |
| 6 | 40–50 s | Unlock → from the notification tap skip-next (or seek), then stop or close: the notification disappears and audio stops |
| 7 | 50–55 s | End on the app's MiniPlayer showing the stopped state |

Tips: keep media volume audible, avoid showing personal notifications, and use a lecture that is known to stream (an `archiveId` is present in `data/content/scholars.ts`). Recitation audio does not exist in v1, so **do not** demo a reciter or surah.
