/**
 * services/audioEngine.ts
 * -----------------------
 * THE audio-engine boundary. This is the ONLY module in the app allowed to
 * import `react-native-track-player`. Everything else drives audio through the
 * functions exported here. Mirrors the single-boundary pattern of
 * `services/notificationScheduler.ts`.
 *
 * Web guard: react-native-track-player is native-only. On web every function is
 * a resolved no-op so the web bundle never touches the native module.
 */
import { Platform } from 'react-native';
import {
  AppKilledPlaybackBehavior,
  Capability,
  State,
  TrackPlayer,
  nativeAudioAvailable,
} from './audioEngine/rntp';
import * as Sentry from '@sentry/react-native';
import { usePlayerStore } from '@/store/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { fetchItemMetadata } from './archive/archiveClient';
import { resolveEpisodes } from './archive/episodeResolver';
import type { Lecture } from '@/types/content';

const isWeb = () => Platform.OS === 'web';

/**
 * "Inert" = no real audio engine behind us: on web, or in Expo Go where the
 * react-native-track-player native module is absent (see ./audioEngine/rntp).
 * Every engine function short-circuits here so touching the undefined native
 * `TrackPlayer` never throws.
 */
const isInert = () => isWeb() || !nativeAudioAvailable;

/**
 * Tell the user why playback did nothing. Only meaningful in Expo Go (a native
 * platform missing the module) — web is a silent no-op by design.
 */
function notifyAudioUnavailable(): void {
  if (isWeb()) return;
  useToastStore.getState().show({
    message: 'تشغيل الصوت غير متاح في Expo Go — يتطلب نسخة تطوير من التطبيق (Development Build).',
  });
}

let _setupPromise: Promise<void> | null = null;

/** Test-only: reset the one-time setup guard. */
export function __resetForTests(): void {
  _setupPromise = null;
}

/** Idempotent one-time player initialisation + transport capability config. */
export async function setupPlayer(): Promise<void> {
  if (isInert()) return;
  if (_setupPromise) return _setupPromise;
  _setupPromise = (async () => {
    try {
      // Audio focus: pause/duck automatically on calls & other-app playback.
      // (PlayerOptions field — RNTP v4 only reads it here, not in updateOptions.)
      await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
    } catch {
      // "player already initialized" after a fast refresh / re-entry — safe.
    }
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      // RNTP v4 only emits PlaybackProgressUpdated when an interval is set —
      // without it the progress bar, resume position and progress tracking
      // silently never update on device.
      progressUpdateEventInterval: 1,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
    });
  })();
  try {
    await _setupPromise;
  } catch (e) {
    _setupPromise = null; // allow a later retry instead of caching the failure
    throw e;
  }
}

export async function play(): Promise<void> {
  if (isInert()) return;
  await TrackPlayer.play();
}

export async function pause(): Promise<void> {
  if (isInert()) return;
  await TrackPlayer.pause();
}

export async function seekTo(positionSec: number): Promise<void> {
  if (isInert()) return;
  await TrackPlayer.seekTo(positionSec);
}

export async function skipNext(): Promise<void> {
  if (isInert()) return;
  try {
    await TrackPlayer.skipToNext();
  } catch {
    // at end of queue — no next track.
  }
}

export async function skipPrev(): Promise<void> {
  if (isInert()) return;
  try {
    await TrackPlayer.skipToPrevious();
  } catch {
    // at start of queue — no previous track.
  }
}

export async function stop(): Promise<void> {
  if (isInert()) return;
  await TrackPlayer.reset();
}

/** Thrown when a lecture cannot be streamed (no archiveId or no episodes). */
export class NoAudioError extends Error {
  constructor(message = 'لا يتوفر تسجيل صوتي لهذه المادة') {
    super(message);
    this.name = 'NoAudioError';
  }
}

/**
 * Resolve a lecture's archive series into the RNTP queue and start playback,
 * resuming from the saved position when the in-progress session matches an
 * episode. Mirrors UI state onto the player store.
 */
export async function playLecture(lecture: Lecture): Promise<void> {
  if (isInert()) return notifyAudioUnavailable();
  if (!lecture.archiveId) throw new NoAudioError();

  await setupPlayer();
  const meta = await fetchItemMetadata(lecture.archiveId);
  const episodes = resolveEpisodes(lecture.archiveId, meta);
  if (episodes.length === 0) throw new NoAudioError();

  // Resume: if the in-progress lecture session matches an episode in this
  // series (and isn't finished), start there at the saved position.
  const inProgress = useProgressStore.getState().inProgressLecture;
  let startIndex = 0;
  let startPos = 0;
  if (inProgress && !inProgress.completed) {
    const idx = episodes.findIndex((e) => e.id === inProgress.lectureId);
    if (idx >= 0) {
      startIndex = idx;
      startPos = Math.max(0, inProgress.positionSec);
    }
  }

  await TrackPlayer.reset();
  await TrackPlayer.setQueue(
    episodes.map((e) => ({
      id: e.id,
      url: e.url,
      title: e.title,
      artist: lecture.scholar,
      duration: e.durationSec > 0 ? e.durationSec : undefined,
    })),
  );
  if (startIndex > 0) await TrackPlayer.skip(startIndex);
  if (startPos > 0) await TrackPlayer.seekTo(startPos);
  await TrackPlayer.play();

  const startEp = episodes[startIndex];
  const initialProgress = startEp.durationSec > 0 ? startPos / startEp.durationSec : 0;
  usePlayerStore.getState().setTrack(
    {
      id: startEp.id,
      title: startEp.title,
      reciter: lecture.scholar,
      durationSec: startEp.durationSec > 0 ? startEp.durationSec : undefined,
    },
    initialProgress,
  );
  usePlayerStore.getState().setVisible(true);
  usePlayerStore.getState().setIsPlaying(true);
}

/**
 * The MiniPlayer play button's entry point. Toggles the running queue, or — on
 * a cold restart where only the restored track exists — rebuilds the series and
 * resumes (playLecture reads the saved position from progressStore).
 */
export async function togglePlayback(): Promise<void> {
  if (isInert()) return notifyAudioUnavailable();
  try {
    await setupPlayer();
    const idx = await TrackPlayer.getActiveTrackIndex();
    const hasQueue = idx !== undefined && idx !== null;
    if (!hasQueue) {
      const track = usePlayerStore.getState().track;
      if (!track) return;
      const archiveId = track.id.split('/')[0];
      await playLecture({
        id: track.id,
        title: track.title,
        scholar: track.reciter,
        duration: '',
        category: 'scholar',
        archiveId,
      } as Lecture);
      return;
    }
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Playing) await TrackPlayer.pause();
    else await TrackPlayer.play();
  } catch (err) {
    Sentry.captureException(err);
    useToastStore.getState().show({ message: 'تعذّر تشغيل الصوت. تحقق من اتصالك ثم حاول مجددًا.' });
    usePlayerStore.getState().setIsPlaying(false);
  }
}

/**
 * Register the RNTP background playback service (lock-screen remote controls).
 * Must be called once at app entry, before setupPlayer(). Native only.
 */
export function registerPlaybackService(): void {
  if (isInert()) return;
  TrackPlayer.registerPlaybackService(() => require('./audioEngine/playbackService').default);
}

/**
 * Restore the last in-progress lecture into the MiniPlayer on launch, PAUSED.
 * Playback resumes only when the user presses play (→ togglePlayback rebuilds
 * the queue and seeks to the saved position).
 */
export function restoreLastLecture(): void {
  if (isInert()) return;
  const inProgress = useProgressStore.getState().inProgressLecture;
  if (!inProgress || inProgress.completed) return;
  const initialProgress =
    inProgress.durationSec > 0 ? inProgress.positionSec / inProgress.durationSec : 0;
  usePlayerStore.getState().setTrack(
    {
      id: inProgress.lectureId,
      title: inProgress.title,
      reciter: inProgress.author,
      durationSec: inProgress.durationSec > 0 ? inProgress.durationSec : undefined,
    },
    initialProgress,
  );
  usePlayerStore.getState().setVisible(true);
  // isPlaying deliberately left false — resume is user-initiated.
}
