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
});
