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

const mockStopPreview = jest.fn().mockResolvedValue(undefined);
let mockOwner: 'none' | 'lecture' | 'preview' = 'lecture';
jest.mock('../../audioEngine', () => ({
  getQueueOwner: () => mockOwner,
  stopReciterPreview: () => mockStopPreview(),
  PREVIEW_ERROR_MESSAGE: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
}));
import { usePreviewStore } from '@/store/previewStore';

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
    mockOwner = 'lecture'; // a lecture queue behaves exactly as before previews existed
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

  describe('while a reciter preview owns the queue', () => {
    beforeEach(() => {
      mockOwner = 'preview';
      usePreviewStore.getState().begin('r3');
    });
    afterEach(() => usePreviewStore.getState().clear());

    it('B1: ignores active-track changes (MiniPlayer keeps the user track)', () => {
      handlerFor(Event.PlaybackActiveTrackChanged)({ track: { id: 'preview:r3', url: 'u' } });
      expect(mockSetTrack).not.toHaveBeenCalled();
    });
    it('B2: ignores progress (no lecture tick into SQLite)', () => {
      handlerFor(Event.PlaybackProgressUpdated)({ position: 5, duration: 50 });
      expect(mockSetProgress).not.toHaveBeenCalled();
    });
    it('B3: never writes isPlaying', () => {
      handlerFor(Event.PlaybackState)({ state: State.Playing });
      handlerFor(Event.PlaybackState)({ state: State.Paused });
      expect(mockSetIsPlaying).not.toHaveBeenCalled();
    });
    it("B4: Stopped/None while loading (the preview's own reset) does not end it", () => {
      handlerFor(Event.PlaybackState)({ state: State.Stopped });
      handlerFor(Event.PlaybackState)({ state: State.None });
      expect(mockStopPreview).not.toHaveBeenCalled();
    });
    it.each([State.Paused, State.Stopped, State.Ended])('B5: %s while playing ends the preview', (s) => {
      usePreviewStore.getState().markPlaying('r3');
      handlerFor(Event.PlaybackState)({ state: s });
      expect(mockStopPreview).toHaveBeenCalled();
    });
    it('B6: queue end stops the preview and NEVER clears the MiniPlayer track', () => {
      usePreviewStore.getState().markPlaying('r3');
      handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
      expect(mockStopPreview).toHaveBeenCalled();
      expect(mockSetTrack).not.toHaveBeenCalled();
    });
    it('B7: an error stops the preview and shows the preview toast exactly once', () => {
      handlerFor(Event.PlaybackError)({ code: 'x', message: 'net' });
      expect(mockStopPreview).toHaveBeenCalled();
      expect(mockToastShow).toHaveBeenCalledTimes(1);
      expect(mockToastShow).toHaveBeenCalledWith({
        message: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
      });
    });

    it("B6b: queue end while still loading (the preview's own reset) does not end it", () => {
      handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 0 });
      expect(mockStopPreview).not.toHaveBeenCalled();
      expect(mockSetTrack).not.toHaveBeenCalled();
    });
    it('B10: a failed stop is reported to Sentry, not swallowed silently', async () => {
      usePreviewStore.getState().markPlaying('r3');
      const err = new Error('bridge down');
      mockStopPreview.mockRejectedValueOnce(err);
      handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
      await Promise.resolve();
      await Promise.resolve();
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });
  });

  describe('late events after a preview stopped (owner none) never reach the MiniPlayer', () => {
    beforeEach(() => {
      mockOwner = 'none';
    });
    it('N1: progress is ignored (no tick over the restored lecture position)', () => {
      handlerFor(Event.PlaybackProgressUpdated)({ position: 5, duration: 50 });
      expect(mockSetProgress).not.toHaveBeenCalled();
    });
    it('N2: an active-track change is ignored (the preview title never lands in the MiniPlayer)', () => {
      handlerFor(Event.PlaybackActiveTrackChanged)({ track: { id: 'preview:r3', title: 'سورة الفاتحة — عيّنة', url: 'u' } });
      expect(mockSetTrack).not.toHaveBeenCalled();
    });
    it('N3: an error is ignored (no lecture toast over onboarding)', () => {
      handlerFor(Event.PlaybackError)({ code: 'x', message: 'net' });
      expect(mockToastShow).not.toHaveBeenCalled();
      expect(mockSetIsPlaying).not.toHaveBeenCalled();
    });
    it('N4: Playing never sets isPlaying without a lecture queue', () => {
      handlerFor(Event.PlaybackState)({ state: State.Playing });
      expect(mockSetIsPlaying).not.toHaveBeenCalled();
    });
    it.each([State.Paused, State.Stopped, State.Ended, State.None])(
      'N5: %s still settles isPlaying to false',
      (st) => {
        handlerFor(Event.PlaybackState)({ state: st });
        expect(mockSetIsPlaying).toHaveBeenLastCalledWith(false);
      },
    );
  });

  describe('queue-end only clears the MiniPlayer for a lecture queue', () => {
    it('B8: owner none (e.g. a late event after a preview stopped) → ignored', () => {
      mockOwner = 'none';
      handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
      expect(mockSetTrack).not.toHaveBeenCalled();
      expect(mockStopPreview).not.toHaveBeenCalled();
    });
    it('B9: owner lecture → clears as before', () => {
      mockOwner = 'lecture';
      handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
      expect(mockSetTrack).toHaveBeenCalledWith(null);
    });
  });
});
