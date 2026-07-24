import TrackPlayer, { Event, State } from 'react-native-track-player';
import { Platform } from 'react-native';

const mockSetIsPlaying = jest.fn();
const mockSetProgress = jest.fn();
const mockSetTrack = jest.fn();
jest.mock('@/store/playerStore', () => ({
  usePlayerStore: { getState: () => ({ setIsPlaying: mockSetIsPlaying, setProgress: mockSetProgress, setTrack: mockSetTrack }) },
}));

const mockToastShow = jest.fn();
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({ show: mockToastShow }) } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
import * as Sentry from '@sentry/react-native';

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

  it('PlaybackError → Sentry.captureException + setIsPlaying(false) + Arabic toast', () => {
    handlerFor(Event.PlaybackError)({ code: 'x', message: 'boom' });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(mockSetIsPlaying).toHaveBeenLastCalledWith(false);
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
  });

  it('registering twice unregisters the first batch of listeners before re-subscribing', () => {
    // The RNTP mock returns the SAME { remove } subscription object for every
    // addEventListener call, so its `remove` spy counts removals across all subs.
    const sharedSub = (TrackPlayer.addEventListener as jest.Mock).mock.results[0].value;
    const firstBatchCount = (TrackPlayer.addEventListener as jest.Mock).mock.calls.length;
    expect(firstBatchCount).toBeGreaterThan(0);
    sharedSub.remove.mockClear();

    registerPlaybackListeners();

    // Every listener from the first register() must have been removed.
    expect(sharedSub.remove).toHaveBeenCalledTimes(firstBatchCount);
    // And the same number of listeners was re-registered (no net growth).
    expect((TrackPlayer.addEventListener as jest.Mock).mock.calls.length).toBe(firstBatchCount * 2);
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
