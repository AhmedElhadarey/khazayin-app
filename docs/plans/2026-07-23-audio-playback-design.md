# Audio Playback (react-native-track-player) — Design

**Date:** 2026-07-23
**Branch:** `005-audio-playback-trackplayer`
**Status:** Approved (design), pre-implementation

## Problem

The MiniPlayer UI exists but plays no audio. `playerStore` is a UI-only boundary
(documented in its header JSDoc) that a real engine must drive. Quran recitation
and scholarly lectures are the app's core value, yet nothing is playable.

## Decisions (locked with user)

1. **Engine:** `react-native-track-player` (lock-screen play/pause/**skip**,
   background audio, **queue** management — all explicit acceptance criteria).
   Dependency add is USER_ONLY; user approved the engine.
2. **Content source:** Internet Archive account `@user_42102` — **100 scholarly
   lecture series** (book explanations, fatwa programs, lectures). Each item is a
   multi-episode series (up to 753 mp3 files). URL pattern:
   `https://archive.org/download/<identifier>/<episode>.mp3`
3. **Data mapping:** *Real series catalogue.* Each lecture = one archive series,
   storing its `archiveId`. Episodes are resolved at play time from the archive
   metadata API and loaded as the track-player **queue** (skip = next/prev
   episode). No thousands of URLs embedded in the store.
4. **Reciter/Quran side:** OUT OF SCOPE — the archive has no per-reciter surah
   recitations. Original acceptance criterion #1 is met via lecture play. The
   reciter/mushaf screens are untouched.

## Architecture

### Content model
- `Lecture` type gains `archiveId?: string`.
- `data/content/scholars.ts` + `LECTURES_BY_SCHOLAR` **rebuilt from the real
  archive** (real titles/scholars + `archiveId`). Scholar names already match.
- `PROPHET/BOOK/QUEEN/RADIO` lists get a real `archiveId` where a sensible match
  exists; otherwise left audio-less (card renders, play disabled) — never a
  forced wrong match.

### Engine boundary (mirrors `services/notificationScheduler.ts` single-boundary)
- `services/audioEngine.ts` — the ONLY module importing
  `react-native-track-player`. API: `setupPlayer()`, `playLecture(lecture)`,
  `togglePlay()`, `seekTo(sec)`, `skipNext()`, `skipPrev()`, `stop()`.
- `services/audioEngine/playbackService.ts` — RNTP's required background service
  (remote play/pause/next/prev/seek).
- `services/archive/episodeResolver.ts` — **pure** function:
  archive metadata JSON → sorted episode queue (filter `.mp3`, sort, build
  download URLs, parse durations). Fully unit-testable, no native deps.
  Cached via the existing SWR cache tier (`services/cache/*`).
- **Web/Expo-Go guard:** engine no-ops on web (`Platform.OS === 'web'`), matching
  `db/web-shim.ts` philosophy. Web build must not crash.

### Store sync (preserves the existing `playerStore` contract)
- RNTP event listeners drive `setTrack` / `isPlaying` / `setProgress(~1s)`, which
  ALREADY forward to `progressStore`/SQLite. That forwarding is not rewritten.
- `togglePlay` becomes engine-backed (`TrackPlayer.play()/pause()`) so `isPlaying`
  reflects real engine state (criterion #5), not a flipped boolean.
- Add `seekTo/skipNext/skipPrev`; wire MiniPlayer's existing skip glyphs + play
  button to them.
- `lectureId` = per-episode id so resume is per-episode.

### Resume-after-restart
- On launch (after existing SQLite hydrate in `app/_layout.tsx`), read last
  lecture + position from `progressStore`, restore MiniPlayer **paused**; play
  resumes from the saved offset (criterion #6).

### Error handling
- Metadata/stream failure → Arabic `Alert` + `ToastOverlay`, never a crash.
- `PlaybackError` events → Sentry (already a dependency).

### Config / build (USER action items)
- `react-native-track-player` added to `package.json` + config plugin:
  iOS `UIBackgroundModes: ["audio"]`, Android foreground-service.
- User runs `npx expo install react-native-track-player`, then a **dev-client /
  EAS build** (RNTP can't run in Expo Go). Exact commands provided at handoff.
- No commits without user go-ahead.

## Testing (TDD, jest; RNTP native mocked)
- Pure: `episodeResolver` (metadata → queue), URL builder, sort/duration parse.
- Store sync reducers against a **fake engine** interface.
- Data-integrity: every lecture `archiveId` well-formed; catalogue output valid.

## Acceptance-criteria coverage
| Criterion | Met by |
|---|---|
| Tap play → real audio | lecture play → RNTP stream |
| Progress bar ~1s | `PlaybackProgressUpdated` → `setProgress` |
| Background audio | RNTP background service + iOS audio mode |
| Lock-screen play/pause/skip | RNTP remote events (skip = episode nav) |
| `isPlaying` = engine truth | engine-backed `togglePlay` + state events |
| Resume after restart | `progressStore` position → restore on launch |
| No unexpected pause/skip | audio-focus / interruption config |

## Out of scope (future tracks)
- Quran-by-reciter recitation audio (needs a different source + surah-list UI).
- Local-file downloads for offline playback (streaming only for now).
- Full series → episode browsing screens (each lecture plays its series as a
  queue; a dedicated episode-list UI is a follow-up).
