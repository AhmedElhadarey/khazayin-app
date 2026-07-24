/**
 * services/audioEngine/playbackService.ts
 * ---------------------------------------
 * RNTP background service — handles lock-screen / notification remote commands.
 * Runs in a headless JS context, so it drives TrackPlayer directly (it must not
 * depend on React or app stores). Registered via
 * `audioEngine.registerPlaybackService()` at app entry.
 */
import TrackPlayer, { Event } from 'react-native-track-player';

export default async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext().catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious().catch(() => undefined);
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => {
    TrackPlayer.seekTo(e.position);
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.reset();
  });
}
