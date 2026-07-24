# Audio Playback — Device QA & Build Instructions

**Feature:** Real audio playback via `react-native-track-player` (branch
`005-audio-playback-trackplayer`). Content: scholarly lecture series from
Internet Archive account `@user_42102`, streamed as track-player queues.

> The automated suite (jest, RNTP mocked) and `tsc` pass in CI, but **native
> audio, background playback, and lock-screen controls can only be verified on a
> real device / emulator using a dev-client build** — not in Expo Go, not in
> jest. This checklist is that verification.

## Build & run (required — RNTP is a native module)

```bash
# 1. Install the JS package (already in package.json; run if node_modules is fresh)
npx expo install react-native-track-player

# 2. Prebuild native projects (RNTP has NO Expo config plugin — it auto-links)
npx expo prebuild --clean

# 3. Run a dev-client build on a device/emulator (NOT Expo Go)
npx expo run:android      # or: npx expo run:ios
#   — or an EAS dev build:  eas build --profile development --platform android
```

### ⚠️ New Architecture caveat (read before building)
- Expo warns: *"react-native-track-player does not support the New Architecture."*
- This app has `newArchEnabled: true` in `app.json`, and **`react-native-reanimated` 4
  (a dependency) REQUIRES the New Architecture** — so it cannot simply be disabled.
- **Action:** build as-is and verify RNTP works via the New-Arch bridgeless
  interop layer (it often does). If audio fails to initialise on device:
  - The engine is isolated behind `services/audioEngine.ts`. The contained
    fallback is to swap RNTP for **`expo-audio`** (New-Arch compatible) behind the
    same boundary — only `audioEngine.ts`, `syncBridge.ts`, `playbackService.ts`
    change; the stores, catalogue, and UI stay untouched.
  - Do NOT set `newArchEnabled: false` (it would break Reanimated 4).

## Acceptance-criteria checklist (run on device)

| # | Criterion | How to test | Pass? |
|---|-----------|-------------|-------|
| 1 | Tap play → real audio | Sections → العلماء والمشايخ → a scholar (e.g. ابن عثيمين) → tap a lecture. Audio should stream within a few seconds. | ☐ |
| 2 | MiniPlayer progress ~1s | While playing, the bottom progress bar advances ~once per second and matches real position. | ☐ |
| 3 | Background audio | Play a lecture, background the app (home button). Audio keeps playing. | ☐ |
| 4 | Lock-screen controls | Lock the phone. Notification/lock-screen shows title + play/pause + next/prev; each works (skip moves between episodes of the series). | ☐ |
| 5 | `isPlaying` = engine truth | Pause from the lock screen → MiniPlayer play button flips to "play" (state reflects the engine, not just a local toggle). | ☐ |
| 6 | Resume after restart | Play a lecture ~1 min in, kill the app, reopen. MiniPlayer restores that lecture **paused**; pressing play resumes near where you left off. | ☐ |
| 7 | No unexpected pause/skip | Play for several minutes across episode boundaries; audio does not randomly stop or skip (audio-focus handling). | ☐ |

### Extra checks
- ☐ Tapping a lecture with **no audio** (prophet/books/queen/radio cards, which
  have no `archiveId`) shows the Arabic alert "لا يتوفر تسجيل صوتي لهذه المادة" — no crash.
- ☐ Airplane mode → tap a lecture → generic Arabic error alert, no crash.
- ☐ Web build (`npm run web`) still loads; MiniPlayer stays hidden / no native
  audio calls (engine no-ops on web).
- ☐ RTL: MiniPlayer transport order stays [skip-back][play][skip-fwd] visually.

## Architecture (for the reviewer)
- **Single boundary:** only `services/audioEngine.ts`, `services/audioEngine/syncBridge.ts`,
  and `services/audioEngine/playbackService.ts` import `react-native-track-player`.
- **Data:** `Lecture.archiveId` → `services/archive/archiveClient` fetches item
  metadata → `services/archive/episodeResolver` builds the sorted episode queue.
- **Store sync:** RNTP events → `syncBridge` → `playerStore` setters (which
  forward to `progressStore`/SQLite, unchanged). `playerStore` never imports the
  engine (one-directional).
- **Resume:** `restoreLastLecture()` reads `progressStore.inProgressLecture` on
  launch (paused); `togglePlayback()` rebuilds the queue + seeks on first play.

## Known limitations (documented, out of scope)
- **Streaming only** — no offline download of episodes yet.
- **No episode-list UI** — a lecture plays its whole series as a queue; there is
  no screen to browse/pick a specific episode (skip-next/prev navigates them).
- **Resume/seek listened-time accounting** — a forward jump > 30s (seek or
  resume) is intentionally counted as 0 listened seconds to avoid over-counting;
  this is a deliberate approximation in `playerStore.emitLectureTick`.
- **Quran-by-reciter audio** — not wired (this archive has no recitations; needs a
  separate source + surah-list UI).
