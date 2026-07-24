import TrackPlayer, { Event } from 'react-native-track-player';
import playbackService from '../playbackService';

describe('playbackService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers all remote command handlers', async () => {
    await playbackService();
    const events = (TrackPlayer.addEventListener as jest.Mock).mock.calls.map((c) => c[0]);
    expect(events).toEqual(expect.arrayContaining([
      Event.RemotePlay, Event.RemotePause, Event.RemoteNext, Event.RemotePrevious, Event.RemoteSeek, Event.RemoteStop,
    ]));
  });

  it('RemotePlay handler calls TrackPlayer.play', async () => {
    await playbackService();
    const call = (TrackPlayer.addEventListener as jest.Mock).mock.calls.find((c) => c[0] === Event.RemotePlay);
    call[1]();
    expect(TrackPlayer.play).toHaveBeenCalled();
  });

  it('RemoteSeek handler seeks to the event position', async () => {
    await playbackService();
    const call = (TrackPlayer.addEventListener as jest.Mock).mock.calls.find((c) => c[0] === Event.RemoteSeek);
    call[1]({ position: 55 });
    expect(TrackPlayer.seekTo).toHaveBeenCalledWith(55);
  });

  // L8: every remote handler must attach .catch so a rejected TrackPlayer call
  // never becomes an unhandled rejection in the headless service context.
  it.each([
    [Event.RemotePlay, 'play', undefined],
    [Event.RemotePause, 'pause', undefined],
    [Event.RemoteNext, 'skipToNext', undefined],
    [Event.RemotePrevious, 'skipToPrevious', undefined],
    [Event.RemoteSeek, 'seekTo', { position: 12 }],
    [Event.RemoteStop, 'reset', undefined],
  ] as const)('%s handler attaches .catch to %s()', async (event, method, payload) => {
    await playbackService();
    const catchSpy = jest.fn();
    ((TrackPlayer as any)[method] as jest.Mock).mockReturnValueOnce({ catch: catchSpy });
    const call = (TrackPlayer.addEventListener as jest.Mock).mock.calls.find((c) => c[0] === event);
    call[1](payload);
    expect((TrackPlayer as any)[method]).toHaveBeenCalled();
    expect(catchSpy).toHaveBeenCalledWith(expect.any(Function));
    // the rejection handler swallows the error (returns undefined)
    expect(catchSpy.mock.calls[0][0]()).toBeUndefined();
  });
});
