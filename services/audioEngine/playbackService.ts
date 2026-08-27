/**
 * services/audioEngine/playbackService.ts
 * ---------------------------------------
 * RNTP background service — handles lock-screen / notification remote commands.
 * Runs in a headless JS context, so it drives TrackPlayer directly (it must not
 * depend on React or app stores). Registered via
 * `audioEngine.registerPlaybackService()` at app entry.
 *
 * Every TrackPlayer call is `.catch`-guarded: in the headless context a
 * rejected call would otherwise surface as an unhandled promise rejection.
 */
import { Event, TrackPlayer } from './rntp';

export default async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play().catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause().catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext().catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious().catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => {
    TrackPlayer.seekTo(e.position).catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.reset().catch(() => undefined);
  });
}
