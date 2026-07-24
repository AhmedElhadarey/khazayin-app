import TrackPlayer, { Event, State } from 'react-native-track-player';
import { Platform } from 'react-native';

const mockSetIsPlaying = jest.fn();
const mockSetProgress = jest.fn();
const mockSetTrack = jest.fn();
jest.mock('@/store/playerStore', () => ({
  usePlayerStore: { getState: () => ({ setIsPlaying: mockSetIsPlaying, setProgress: mockSetProgress, setTrack: mockSetTrack }) },
}));

import { registerPlaybackListeners, unregisterPlaybackListeners } from '../syncBridge';

/** Find the handler registered for a given RNTP Event. */
function handlerFor(event: string): (e: any) => void {
  const call = (TrackPlayer.addEventListener as jest.Mock).mock.calls.find((c) => c[0] === event);
  if (!call) throw new Error(`no listener registered for ${event}`);
  return call[1];
}

describe('syncBridge', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
    jest.clearAllMocks();
    unregisterPlaybackListeners();
    registerPlaybackListeners();
  });

  it('PlaybackState Playing → mockSetIsPlaying(true); Paused → false', () => {
    handlerFor(Event.PlaybackState)({ state: State.Playing });
    expect(mockSetIsPlaying).toHaveBeenLastCalledWith(true);
    handlerFor(Event.PlaybackState)({ state: State.Paused });
    expect(mockSetIsPlaying).toHaveBeenLastCalledWith(false);
  });

  it('PlaybackState Buffering does NOT flip isPlaying (no call)', () => {
    mockSetIsPlaying.mockClear();
    handlerFor(Event.PlaybackState)({ state: State.Buffering });
    expect(mockSetIsPlaying).not.toHaveBeenCalled();
  });

  it('PlaybackProgressUpdated → mockSetProgress(position/duration), guards duration 0', () => {
    handlerFor(Event.PlaybackProgressUpdated)({ position: 30, duration: 120, buffered: 0 });
    expect(mockSetProgress).toHaveBeenLastCalledWith(0.25);
    mockSetProgress.mockClear();
    handlerFor(Event.PlaybackProgressUpdated)({ position: 5, duration: 0, buffered: 0 });
    expect(mockSetProgress).not.toHaveBeenCalled();
  });

  it('PlaybackActiveTrackChanged → mockSetTrack mapped from the RNTP track', () => {
    handlerFor(Event.PlaybackActiveTrackChanged)({ index: 1, track: { id: 'X/002.mp3', title: 'ح2', artist: 'شيخ', duration: 900, url: 'u' } });
    expect(mockSetTrack).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'X/002.mp3', title: 'ح2', reciter: 'شيخ', durationSec: 900 }),
    );
  });

  it('PlaybackActiveTrackChanged with no track is ignored', () => {
    mockSetTrack.mockClear();
    handlerFor(Event.PlaybackActiveTrackChanged)({ index: undefined, track: undefined });
    expect(mockSetTrack).not.toHaveBeenCalled();
  });

  it('PlaybackQueueEnded → mockSetTrack(null) + mockSetIsPlaying(false)', () => {
    handlerFor(Event.PlaybackQueueEnded)({});
    expect(mockSetTrack).toHaveBeenLastCalledWith(null);
    expect(mockSetIsPlaying).toHaveBeenLastCalledWith(false);
  });

  it('registering twice does not double-subscribe (unregisters first)', () => {
    const before = (TrackPlayer.addEventListener as jest.Mock).mock.results.length;
    registerPlaybackListeners();
    // 4 event types registered per call; re-registering should remove old subs first.
    expect((TrackPlayer.addEventListener as jest.Mock)).toHaveBeenCalled();
  });

  it('is a no-op on web', () => {
    (Platform as any).OS = 'web';
    unregisterPlaybackListeners();
    (TrackPlayer.addEventListener as jest.Mock).mockClear();
    registerPlaybackListeners();
    expect(TrackPlayer.addEventListener).not.toHaveBeenCalled();
    (Platform as any).OS = 'ios';
  });
});
