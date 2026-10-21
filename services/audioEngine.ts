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
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  State,
} from 'react-native-track-player';
import * as Sentry from '@sentry/react-native';
import { PREVIEW_MAX_SEC, type PreviewSource } from '@/constants/settings';
import { usePlayerStore } from '@/store/playerStore';
import { usePreviewStore } from '@/store/previewStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { fetchItemMetadata } from './archive/archiveClient';
import { buildDownloadUrl, resolveEpisodes } from './archive/episodeResolver';
import type { Lecture, Reciter } from '@/types/content';

const isWeb = () => Platform.OS === 'web';

let _setupPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// QUEUE OWNER — synchronous, module-level. Who the RNTP queue currently belongs
// to. Written before the first await of every operation that takes or releases
// the queue, so the sync bridge can never observe a stale owner.
//   'lecture' — playLecture took it (the MiniPlayer's queue)
//   'preview' — a reciter preview took it (bridge drops all playerStore writes)
//   'none'    — nothing queued by this JS session
// ---------------------------------------------------------------------------
export type QueueOwner = 'none' | 'lecture' | 'preview';
let _queueOwner: QueueOwner = 'none';

export function getQueueOwner(): QueueOwner {
  return _queueOwner;
}

// Reciter-preview bookkeeping (see the RECITER PREVIEW section below).
const PREVIEW_ID_PREFIX = 'preview:';
let _previewToken = 0;
let _previewTimer: ReturnType<typeof setTimeout> | null = null;

function clearPreviewTimer(): void {
  if (_previewTimer) clearTimeout(_previewTimer);
  _previewTimer = null;
}

/** Drop any preview bookkeeping (token, timer, UI state). Does not touch RNTP. */
function abandonPreview(): void {
  _previewToken += 1;
  clearPreviewTimer();
  usePreviewStore.getState().clear();
}

/** Test-only: reset the one-time setup guard and the queue owner. */
export function __resetForTests(): void {
  _setupPromise = null;
  _queueOwner = 'none';
  _previewToken = 0;
  clearPreviewTimer();
}

const TRANSPORT_CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.SeekTo,
  Capability.Stop,
];

/** Idempotent one-time player initialisation + transport capability config. */
export async function setupPlayer(): Promise<void> {
  if (isWeb()) return;
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
      capabilities: TRANSPORT_CAPABILITIES,
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
    // Adopt the owner of a native queue that outlived the JS session (Android
    // ContinuePlayback): a preview track stays a preview, anything else is the
    // user's lecture. Without this the bridge would treat a surviving preview
    // as a lecture and write it into the MiniPlayer.
    if (_queueOwner === 'none') {
      const active = await TrackPlayer.getActiveTrack();
      if (active) {
        _queueOwner = String((active as { id?: unknown }).id ?? '').startsWith(PREVIEW_ID_PREFIX)
          ? 'preview'
          : 'lecture';
      }
    }
  })();
  try {
    await _setupPromise;
  } catch (e) {
    _setupPromise = null; // allow a later retry instead of caching the failure
    throw e;
  }
}

export async function play(): Promise<void> {
  if (isWeb()) return;
  await TrackPlayer.play();
}

export async function pause(): Promise<void> {
  if (isWeb()) return;
  await TrackPlayer.pause();
}

export async function seekTo(positionSec: number): Promise<void> {
  if (isWeb()) return;
  await TrackPlayer.seekTo(positionSec);
}

export async function skipNext(): Promise<void> {
  if (isWeb()) return;
  try {
    await TrackPlayer.skipToNext();
  } catch {
    // at end of queue — no next track.
  }
}

export async function skipPrev(): Promise<void> {
  if (isWeb()) return;
  try {
    await TrackPlayer.skipToPrevious();
  } catch {
    // at start of queue — no previous track.
  }
}

export async function stop(): Promise<void> {
  if (isWeb()) return;
  abandonPreview();
  _queueOwner = 'none';
  await TrackPlayer.reset();
}

// ---------------------------------------------------------------------------
// RECITER PREVIEW (onboarding, design 2026-10-21 §4.3). A verified Al-Fatiha
// file, capped at PREVIEW_MAX_SEC. Never offered while a lecture owns the
// queue; never writes playerStore; stop is a no-op unless a preview owns the
// queue, so it can never reset the user's lecture.
// ---------------------------------------------------------------------------
export const PREVIEW_ERROR_MESSAGE = 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.';

/** True when a preview may be offered: native, and no lecture owns the queue. */
export function canPreviewAudio(): boolean {
  return !isWeb() && _queueOwner !== 'lecture';
}

export async function stopReciterPreview(): Promise<void> {
  if (isWeb() || _queueOwner !== 'preview') return;
  abandonPreview();
  _queueOwner = 'none';
  await TrackPlayer.reset();
}

/**
 * Play `source` as a single-track preview queue. A start superseded by a newer
 * start or a stop checks currency after every await and issues no further
 * command. Rethrows only while still current (the caller shows the toast).
 */
export async function startReciterPreview(reciter: Reciter, source: PreviewSource): Promise<void> {
  if (!canPreviewAudio()) return;
  abandonPreview();
  const token = _previewToken;
  _queueOwner = 'preview';
  usePreviewStore.getState().begin(reciter.id);
  const isCurrent = () => token === _previewToken && _queueOwner === 'preview';
  try {
    await setupPlayer();
    if (!isCurrent()) return;
    await TrackPlayer.reset();
    if (!isCurrent()) return;
    await TrackPlayer.add({
      id: `${PREVIEW_ID_PREFIX}${reciter.id}`,
      url: buildDownloadUrl(source.archiveId, source.file),
      title: 'سورة الفاتحة — عيّنة',
      artist: reciter.name,
    });
    if (!isCurrent()) return;
    await TrackPlayer.play();
    if (!isCurrent()) return;
    usePreviewStore.getState().markPlaying(reciter.id);
    _previewTimer = setTimeout(() => {
      if (isCurrent()) void stopReciterPreview().catch(() => undefined);
    }, PREVIEW_MAX_SEC * 1000);
  } catch (err) {
    if (!isCurrent()) return; // superseded — the newer owner handles the UI
    abandonPreview();
    _queueOwner = 'none';
    throw err;
  }
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
  if (isWeb()) return;
  // A playing preview is silenced first, with the owner released ('none') so
  // the sync bridge drops its late events, and before any network await — so a
  // NoAudioError below cannot leave it playing uncapped. Then take the queue:
  // from here the bridge treats every event as the lecture's.
  if (_queueOwner === 'preview') {
    abandonPreview();
    _queueOwner = 'none';
    await TrackPlayer.reset().catch((err: unknown) => Sentry.captureException(err));
  }
  _queueOwner = 'lecture';
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
  if (isWeb()) return;
  try {
    await setupPlayer();
    const idx = await TrackPlayer.getActiveTrackIndex();
    // A preview-owned queue is not the user's: rebuild their lecture instead
    // of toggling the preview track.
    const hasQueue = _queueOwner !== 'preview' && idx !== undefined && idx !== null;
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
  if (isWeb()) return;
  TrackPlayer.registerPlaybackService(() => require('./audioEngine/playbackService').default);
}

/**
 * Restore the last in-progress lecture into the MiniPlayer on launch, PAUSED.
 * Playback resumes only when the user presses play (→ togglePlayback rebuilds
 * the queue and seeks to the saved position).
 */
export function restoreLastLecture(): void {
  if (isWeb()) return;
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
