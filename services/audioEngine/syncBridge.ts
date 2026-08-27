/**
 * services/audioEngine/syncBridge.ts
 * ----------------------------------
 * Registers react-native-track-player event listeners that drive `playerStore`
 * so the MiniPlayer reflects REAL engine state (play/pause, progress, active
 * episode). Part of the audio-engine boundary — only engine-boundary modules
 * import `react-native-track-player`.
 */
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Event, State, TrackPlayer, nativeAudioAvailable, type Track } from './rntp';
import { usePlayerStore, type PlayerTrack } from '@/store/playerStore';
import { useToastStore } from '@/store/toastStore';

// Inert on web and in Expo Go (no native module) — see ./rntp.
const isInert = () => Platform.OS === 'web' || !nativeAudioAvailable;

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
  if (isInert()) return;
  unregisterPlaybackListeners();
  const store = () => usePlayerStore.getState();

  _subs.push(
    TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
      if (e.state === State.Playing) store().setIsPlaying(true);
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
      if (e.duration > 0) store().setProgress(e.position / e.duration);
    }),
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
      const t = toPlayerTrack(e.track);
      if (t) store().setTrack(t);
    }),
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      store().setTrack(null);
      store().setIsPlaying(false);
    }),
    TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
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
