/**
 * services/audioEngine/syncBridge.ts
 * ----------------------------------
 * Registers react-native-track-player event listeners that drive `playerStore`
 * so the MiniPlayer reflects REAL engine state (play/pause, progress, active
 * episode). Part of the audio-engine boundary — only engine-boundary modules
 * import `react-native-track-player`.
 *
 * Queue ownership (design 2026-10-21 §4.3): while a reciter preview owns the
 * queue (`getQueueOwner() === 'preview'`) every playerStore write is dropped —
 * no MiniPlayer change and no lecture progress tick — and end/pause/error only
 * end the preview. QueueEnded clears the MiniPlayer only for a lecture queue.
 *
 * Owner 'none' (e.g. late events after a preview stopped: the owner is released
 * synchronously, before the native reset lands) is never treated as a lecture:
 * progress, active-track and error events are dropped, and playback state may
 * only settle isPlaying to false. Every lecture path claims 'lecture'
 * synchronously (playLecture, and the restart adoption in setupPlayer).
 */
import { Platform } from 'react-native';
import TrackPlayer, { Event, State, type Track } from 'react-native-track-player';
import * as Sentry from '@sentry/react-native';
import { usePlayerStore, type PlayerTrack } from '@/store/playerStore';
import { usePreviewStore } from '@/store/previewStore';
import { useToastStore } from '@/store/toastStore';
import { getQueueOwner, PREVIEW_ERROR_MESSAGE, stopReciterPreview } from '../audioEngine';

const isWeb = () => Platform.OS === 'web';

let _subs: { remove(): void }[] = [];

function toPlayerTrack(track: Track | undefined): PlayerTrack | null {
  if (!track) return null;
  return {
    id: String((track as any).id ?? track.url),
    title: (track.title as string) ?? '',
    reciter: (track.artist as string) ?? '',
    durationSec: typeof track.duration === 'number' ? track.duration : undefined,
  };
}

/** Register all playback listeners (idempotent — clears prior subscriptions). */
export function registerPlaybackListeners(): void {
  if (isWeb()) return;
  unregisterPlaybackListeners();
  const store = () => usePlayerStore.getState();
  const previewOwns = () => getQueueOwner() === 'preview';
  const lectureOwns = () => getQueueOwner() === 'lecture';
  const endPreview = () => {
    stopReciterPreview().catch((err: unknown) => Sentry.captureException(err));
  };

  _subs.push(
    TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
      if (previewOwns()) {
        // Only a pause/stop/end of a preview that is actually playing ends it.
        // The preview's own reset() fires while it is still 'loading'.
        const { status } = usePreviewStore.getState();
        if (
          status === 'playing' &&
          (e.state === State.Paused || e.state === State.Stopped || e.state === State.Ended)
        ) {
          endPreview();
        }
        return;
      }
      // Without a lecture queue only the "not playing" transitions may land.
      if (e.state === State.Playing) {
        if (lectureOwns()) store().setIsPlaying(true);
      }
      else if (
        e.state === State.Paused ||
        e.state === State.Stopped ||
        e.state === State.Ended ||
        e.state === State.None
      ) {
        store().setIsPlaying(false);
      }
      // Buffering / Ready / Loading: leave isPlaying untouched.
    }),
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
      if (!lectureOwns()) return; // preview, or a late event after it stopped
      if (e.duration > 0) store().setProgress(e.position / e.duration);
    }),
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
      if (!lectureOwns()) return; // preview, or a late event after it stopped
      const t = toPlayerTrack(e.track);
      if (t) store().setTrack(t);
    }),
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      if (previewOwns()) {
        // Only a preview that is actually playing can have ended; its own
        // reset() fires while it is still 'loading'.
        if (usePreviewStore.getState().status === 'playing') endPreview();
        return;
      }
      // A spurious end (e.g. a late event after a preview stopped, owner 'none')
      // must not clear the restored lecture or flush a completed tick for it.
      if (getQueueOwner() !== 'lecture') return;
      store().setTrack(null);
      store().setIsPlaying(false);
    }),
    TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
      if (previewOwns()) {
        Sentry.captureException(
          e instanceof Error ? e : new Error(`Preview error: ${JSON.stringify(e)}`),
        );
        endPreview();
        useToastStore.getState().show({ message: PREVIEW_ERROR_MESSAGE });
        return;
      }
      if (!lectureOwns()) return; // a late error from a stopped preview
      Sentry.captureException(
        e instanceof Error ? e : new Error(`Playback error: ${JSON.stringify(e)}`),
      );
      store().setIsPlaying(false);
      useToastStore.getState().show({ message: 'تعذّر تشغيل الصوت. تحقق من اتصالك ثم حاول مجددًا.' });
    }),
  );
}

/** Remove all registered listeners. */
export function unregisterPlaybackListeners(): void {
  _subs.forEach((s) => s.remove());
  _subs = [];
}
