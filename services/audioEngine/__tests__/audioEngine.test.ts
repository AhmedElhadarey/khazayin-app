const mockSetTrack = jest.fn();
const mockSetVisible = jest.fn();
const mockSetIsPlaying = jest.fn();
let mockInProgress: any = null;
let mockTrack: any = null;
jest.mock('@/store/playerStore', () => ({
  usePlayerStore: { getState: () => ({ setTrack: mockSetTrack, setVisible: mockSetVisible, setIsPlaying: mockSetIsPlaying, track: mockTrack }) },
}));
jest.mock('@/store/progressStore', () => ({
  useProgressStore: { getState: () => ({ inProgressLecture: mockInProgress }) },
}));
jest.mock('../../archive/archiveClient', () => ({
  fetchItemMetadata: jest.fn(),
}));

import TrackPlayer, { Capability, State } from 'react-native-track-player';
import { Platform } from 'react-native';
import * as engine from '../../audioEngine';
import { fetchItemMetadata } from '../../archive/archiveClient';

describe('audioEngine (native path)', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
    jest.clearAllMocks();
    engine.__resetForTests();
  });

  it('setupPlayer initialises the player and sets transport capabilities once', async () => {
    await engine.setupPlayer();
    await engine.setupPlayer(); // idempotent

    expect(TrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
    expect(TrackPlayer.updateOptions).toHaveBeenCalledTimes(1);
    const opts = (TrackPlayer.updateOptions as jest.Mock).mock.calls[0][0];
    expect(opts.capabilities).toEqual(
      expect.arrayContaining([
        Capability.Play, Capability.Pause, Capability.SkipToNext,
        Capability.SkipToPrevious, Capability.SeekTo, Capability.Stop,
      ]),
    );
  });

  it('tolerates a "player already initialized" throw from setupPlayer', async () => {
    (TrackPlayer.setupPlayer as jest.Mock).mockRejectedValueOnce(new Error('already initialized'));
    await expect(engine.setupPlayer()).resolves.toBeUndefined();
    expect(TrackPlayer.updateOptions).toHaveBeenCalledTimes(1);
  });

  it('play/pause/seekTo/skipNext/skipPrev/stop delegate to TrackPlayer', async () => {
    await engine.play();      expect(TrackPlayer.play).toHaveBeenCalled();
    await engine.pause();     expect(TrackPlayer.pause).toHaveBeenCalled();
    await engine.seekTo(42);  expect(TrackPlayer.seekTo).toHaveBeenCalledWith(42);
    await engine.skipNext();  expect(TrackPlayer.skipToNext).toHaveBeenCalled();
    await engine.skipPrev();  expect(TrackPlayer.skipToPrevious).toHaveBeenCalled();
    await engine.stop();      expect(TrackPlayer.reset).toHaveBeenCalled();
  });

  it('swallows skip errors at queue boundaries', async () => {
    (TrackPlayer.skipToNext as jest.Mock).mockRejectedValueOnce(new Error('no next track'));
    await expect(engine.skipNext()).resolves.toBeUndefined();
  });
});

describe('audioEngine (web no-op)', () => {
  beforeEach(() => { (Platform as any).OS = 'web'; jest.clearAllMocks(); engine.__resetForTests(); });
  afterEach(() => { (Platform as any).OS = 'ios'; });

  it('does nothing on web', async () => {
    await engine.setupPlayer();
    await engine.play();
    await engine.pause();
    expect(TrackPlayer.setupPlayer).not.toHaveBeenCalled();
    expect(TrackPlayer.play).not.toHaveBeenCalled();
  });
});

const META = {
  files: [
    { name: '001.mp3', title: 'ح1', track: '001/3', length: '600', format: 'VBR MP3', source: 'original' },
    { name: '002.mp3', title: 'ح2', track: '002/3', length: '900', format: 'VBR MP3', source: 'original' },
    { name: '003.mp3', title: 'ح3', track: '003/3', length: '800', format: 'VBR MP3', source: 'original' },
  ],
};
const LECTURE = { id: 'sl5-1', title: 'تفسير', scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: 'ABC' } as const;

describe('playLecture', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
    jest.clearAllMocks();
    engine.__resetForTests();
    mockInProgress = null;
    (fetchItemMetadata as jest.Mock).mockResolvedValue(META);
  });

  it('throws NoAudioError when the lecture has no archiveId', async () => {
    await expect(engine.playLecture({ ...LECTURE, archiveId: undefined } as any))
      .rejects.toBeInstanceOf(engine.NoAudioError);
  });

  it('throws NoAudioError when the series resolves to zero episodes', async () => {
    (fetchItemMetadata as jest.Mock).mockResolvedValue({ files: [] });
    await expect(engine.playLecture(LECTURE as any)).rejects.toBeInstanceOf(engine.NoAudioError);
  });

  it('builds the RNTP queue from resolved episodes and plays from the top', async () => {
    await engine.playLecture(LECTURE as any);
    expect(TrackPlayer.reset).toHaveBeenCalled();
    const queue = (TrackPlayer.setQueue as jest.Mock).mock.calls[0][0];
    expect(queue).toHaveLength(3);
    expect(queue[0]).toEqual(expect.objectContaining({
      id: 'ABC/001.mp3', url: 'https://archive.org/download/ABC/001.mp3', title: 'ح1', artist: 'الشيخ ابن عثيمين',
    }));
    expect(TrackPlayer.skip).not.toHaveBeenCalled();
    expect(TrackPlayer.play).toHaveBeenCalled();
    expect(mockSetTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ABC/001.mp3', title: 'ح1', reciter: 'الشيخ ابن عثيمين', durationSec: 600 }),
      0,
    );
    expect(mockSetVisible).toHaveBeenCalledWith(true);
    expect(mockSetIsPlaying).toHaveBeenCalledWith(true);
  });

  it('resumes: skips to the saved episode and seeks to its position', async () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', positionSec: 120, durationSec: 900, completed: false, title: 'ح2', author: 'x', forwardListenedSec: 0, lastListenedAt: 0 };
    await engine.playLecture(LECTURE as any);
    expect(TrackPlayer.skip).toHaveBeenCalledWith(1);
    expect(TrackPlayer.seekTo).toHaveBeenCalledWith(120);
    // initialProgress passed to setTrack = 120/900
    const [, initialProgress] = (mockSetTrack as jest.Mock).mock.calls[0];
    expect(initialProgress).toBeCloseTo(120 / 900);
  });

  it('ignores a completed in-progress session (starts from the top)', async () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', positionSec: 120, durationSec: 900, completed: true };
    await engine.playLecture(LECTURE as any);
    expect(TrackPlayer.skip).not.toHaveBeenCalled();
  });
});

describe('togglePlayback', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
    jest.clearAllMocks();
    engine.__resetForTests();
    mockInProgress = null;
    mockTrack = null;
    (fetchItemMetadata as jest.Mock).mockResolvedValue({ files: [{ name: '001.mp3', title: 'ح1', track: '001/1', length: '600', format: 'VBR MP3', source: 'original' }] });
  });

  it('pauses when a queue is active and state is Playing', async () => {
    (TrackPlayer.getActiveTrackIndex as jest.Mock).mockResolvedValue(0);
    (TrackPlayer.getPlaybackState as jest.Mock).mockResolvedValue({ state: State.Playing });
    await engine.togglePlayback();
    expect(TrackPlayer.pause).toHaveBeenCalled();
    expect(TrackPlayer.play).not.toHaveBeenCalled();
  });

  it('plays when a queue is active and state is Paused', async () => {
    (TrackPlayer.getActiveTrackIndex as jest.Mock).mockResolvedValue(0);
    (TrackPlayer.getPlaybackState as jest.Mock).mockResolvedValue({ state: State.Paused });
    await engine.togglePlayback();
    expect(TrackPlayer.play).toHaveBeenCalled();
    expect(TrackPlayer.pause).not.toHaveBeenCalled();
  });

  it('cold-start resume: with no queue, rebuilds the series from the restored track', async () => {
    (TrackPlayer.getActiveTrackIndex as jest.Mock).mockResolvedValue(undefined);
    mockTrack = { id: 'ABC/001.mp3', title: 'ح1', reciter: 'الشيخ ابن عثيمين', durationSec: 600 };
    await engine.togglePlayback();
    // playLecture path ran: queue set + play, derived archiveId 'ABC'
    const queue = (TrackPlayer.setQueue as jest.Mock).mock.calls[0][0];
    expect(queue[0].url).toBe('https://archive.org/download/ABC/001.mp3');
    expect(TrackPlayer.play).toHaveBeenCalled();
  });

  it('no queue and no restored track → does nothing', async () => {
    (TrackPlayer.getActiveTrackIndex as jest.Mock).mockResolvedValue(undefined);
    mockTrack = null;
    await engine.togglePlayback();
    expect(TrackPlayer.setQueue).not.toHaveBeenCalled();
    expect(TrackPlayer.play).not.toHaveBeenCalled();
  });
});

describe('restoreLastLecture', () => {
  beforeEach(() => { (Platform as any).OS = 'ios'; jest.clearAllMocks(); mockInProgress = null; });

  it('restores an in-progress lecture into the MiniPlayer, paused', () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', title: 'ح2', author: 'شيخ', durationSec: 900, positionSec: 180, forwardListenedSec: 0, completed: false, lastListenedAt: 0 };
    engine.restoreLastLecture();
    expect(mockSetTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ABC/002.mp3', title: 'ح2', reciter: 'شيخ', durationSec: 900 }),
      180 / 900,
    );
    expect(mockSetVisible).toHaveBeenCalledWith(true);
    expect(mockSetIsPlaying).not.toHaveBeenCalled(); // stays paused
  });

  it('does nothing when there is no in-progress lecture', () => {
    mockInProgress = null;
    engine.restoreLastLecture();
    expect(mockSetTrack).not.toHaveBeenCalled();
  });

  it('ignores a completed lecture', () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', title: 'ح2', author: 'شيخ', durationSec: 900, positionSec: 900, completed: true };
    engine.restoreLastLecture();
    expect(mockSetTrack).not.toHaveBeenCalled();
  });
});
