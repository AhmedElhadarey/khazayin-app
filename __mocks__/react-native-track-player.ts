/* eslint-disable @typescript-eslint/no-explicit-any */
// Jest manual mock — the native module cannot run under jest. Mapped via
// jest.config.js moduleNameMapper so it resolves even when the package is not
// installed in this environment.
export const State = { None: 'none', Playing: 'playing', Paused: 'paused', Ready: 'ready', Buffering: 'buffering', Stopped: 'stopped', Ended: 'ended' } as const;
export const Event = { PlaybackState: 'playback-state', PlaybackProgressUpdated: 'playback-progress-updated', PlaybackActiveTrackChanged: 'playback-active-track-changed', PlaybackQueueEnded: 'playback-queue-ended', PlaybackError: 'playback-error', RemotePlay: 'remote-play', RemotePause: 'remote-pause', RemoteNext: 'remote-next', RemotePrevious: 'remote-previous', RemoteSeek: 'remote-seek', RemoteStop: 'remote-stop' } as const;
export const Capability = { Play: 0, Pause: 1, SkipToNext: 2, SkipToPrevious: 3, SeekTo: 4, Stop: 5 } as const;
export const AppKilledPlaybackBehavior = { ContinuePlayback: 'continue-playback' } as const;

const TrackPlayer = {
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  updateOptions: jest.fn().mockResolvedValue(undefined),
  registerPlaybackService: jest.fn(),
  add: jest.fn().mockResolvedValue(undefined),
  setQueue: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  skipToNext: jest.fn().mockResolvedValue(undefined),
  skipToPrevious: jest.fn().mockResolvedValue(undefined),
  skip: jest.fn().mockResolvedValue(undefined),
  getProgress: jest.fn().mockResolvedValue({ position: 0, duration: 0, buffered: 0 }),
  getActiveTrackIndex: jest.fn().mockResolvedValue(0),
  getPlaybackState: jest.fn().mockResolvedValue({ state: State.Paused }),
  getActiveTrack: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
};
export const useProgress = jest.fn().mockReturnValue({ position: 0, duration: 0, buffered: 0 });
export const useActiveTrack = jest.fn().mockReturnValue(undefined);
export const usePlaybackState = jest.fn().mockReturnValue({ state: State.None });
export default TrackPlayer;
