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
const mockToastShow = jest.fn();
jest.mock('@/store/toastStore', () => ({
  useToastStore: { getState: () => ({ show: mockToastShow }) },
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

import TrackPlayer, { Capability, Event, State } from 'react-native-track-player';
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
    // FINDING #1: RNTP v4 emits PlaybackProgressUpdated only when an interval is set.
    expect(opts.progressUpdateEventInterval).toBe(1);
    // FINDING #3: audio-focus interruptions must pause/duck automatically.
    // autoHandleInterruptions is a PlayerOptions field → goes to setupPlayer().
    expect(TrackPlayer.setupPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ autoHandleInterruptions: true }),
    );
  });

  it('does not memoize a failed setup — a later retry can succeed (L6)', async () => {
    (TrackPlayer.updateOptions as jest.Mock).mockRejectedValueOnce(new Error('native bridge down'));
    await expect(engine.setupPlayer()).rejects.toThrow('native bridge down');

    // Second attempt: updateOptions resolves again (mock default) → setup succeeds.
    await expect(engine.setupPlayer()).resolves.toBeUndefined();
    expect(TrackPlayer.setupPlayer).toHaveBeenCalledTimes(2); // retry actually re-ran init
    expect(TrackPlayer.updateOptions).toHaveBeenCalledTimes(2);
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

  // Changed deliberately (contextual notes): resume now starts via
  // skip(index, initialPosition) in one call instead of skip(index) + seekTo.
  it('resumes: starts the saved episode at its position in one skip', async () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', positionSec: 120, durationSec: 900, completed: false, title: 'ح2', author: 'x', forwardListenedSec: 0, lastListenedAt: 0 };
    await engine.playLecture(LECTURE as any);
    expect(TrackPlayer.skip).toHaveBeenCalledWith(1, 120);
    expect(TrackPlayer.seekTo).not.toHaveBeenCalled();
    // initialProgress passed to setTrack = 120/900
    const [, initialProgress] = (mockSetTrack as jest.Mock).mock.calls[0];
    expect(initialProgress).toBeCloseTo(120 / 900);
  });

  it('resumes on episode 0 via skip(0, pos)', async () => {
    mockInProgress = { lectureId: 'ABC/001.mp3', positionSec: 90, durationSec: 600, completed: false };
    await engine.playLecture(LECTURE as any);
    expect(TrackPlayer.skip).toHaveBeenCalledWith(0, 90);
  });

  it('explicit start beats the saved session', async () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', positionSec: 120, durationSec: 900, completed: false };
    await engine.playLecture(LECTURE as any, { episodeId: 'ABC/003.mp3', positionSec: 45 });
    expect(TrackPlayer.skip).toHaveBeenCalledWith(2, 45);
    const [track, initialProgress] = (mockSetTrack as jest.Mock).mock.calls[0];
    expect(track.id).toBe('ABC/003.mp3');
    expect(initialProgress).toBeCloseTo(45 / 800);
  });

  it('explicit start falls back to resume when the episode is not in the series', async () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', positionSec: 120, durationSec: 900, completed: false };
    await engine.playLecture(LECTURE as any, { episodeId: 'ABC/999.mp3', positionSec: 45 });
    expect(TrackPlayer.skip).toHaveBeenCalledWith(1, 120);
  });

  it('start is capped at duration - 1', async () => {
    await engine.playLecture(LECTURE as any, { episodeId: 'ABC/001.mp3', positionSec: 5000 });
    expect(TrackPlayer.skip).toHaveBeenCalledWith(0, 599);
  });

  describe('one-shot seek correction', () => {
    const listeners = () => {
      const subs: { event: string; cb: (e: any) => any; remove: jest.Mock }[] = [];
      (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, cb: any) => {
        const remove = jest.fn();
        subs.push({ event, cb, remove });
        return { remove };
      });
      return subs;
    };
    const stateCb = (subs: ReturnType<typeof listeners>, i = 0) =>
      subs.filter((x) => x.event === Event.PlaybackState)[i];
    const start45 = () =>
      engine.playLecture(LECTURE as any, { episodeId: 'ABC/001.mp3', positionSec: 45 });

    beforeEach(() => {
      jest.useFakeTimers();
      (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValue({ id: 'ABC/001.mp3' });
      (TrackPlayer.getProgress as jest.Mock).mockResolvedValue({ position: 0, duration: 600, buffered: 0 });
    });
    afterEach(() => {
      jest.useRealTimers();
      (TrackPlayer.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
      (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValue(undefined);
    });

    it('is armed before skip and play', async () => {
      const subs = listeners();
      const order: string[] = [];
      (TrackPlayer.skip as jest.Mock).mockImplementationOnce(async () => { order.push('skip'); });
      (TrackPlayer.play as jest.Mock).mockImplementationOnce(async () => { order.push('play'); });
      (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, cb: any) => {
        order.push(`listen:${event}`);
        const remove = jest.fn();
        subs.push({ event, cb, remove });
        return { remove };
      });
      await start45();
      expect(order.indexOf(`listen:${Event.PlaybackState}`)).toBeLessThan(order.indexOf('skip'));
      expect(order.indexOf('skip')).toBeLessThan(order.indexOf('play'));
    });

    it('seeks once when playback starts short, then removes its listeners', async () => {
      const subs = listeners();
      await start45();
      const st = stateCb(subs);
      await st.cb({ state: State.Ready });
      expect(TrackPlayer.seekTo).toHaveBeenCalledWith(45);
      subs.forEach((x) => expect(x.remove).toHaveBeenCalled());
      await st.cb({ state: State.Playing });
      expect(TrackPlayer.seekTo).toHaveBeenCalledTimes(1);
    });

    it('does not seek within 2 s of the target', async () => {
      const subs = listeners();
      await start45();
      (TrackPlayer.getProgress as jest.Mock).mockResolvedValue({ position: 44, duration: 600, buffered: 0 });
      await stateCb(subs).cb({ state: State.Playing });
      expect(TrackPlayer.seekTo).not.toHaveBeenCalled();
    });

    it('ignores states before the item is ready', async () => {
      const subs = listeners();
      await start45();
      await stateCb(subs).cb({ state: State.Buffering });
      expect(TrackPlayer.getProgress).not.toHaveBeenCalled();
    });

    it('does not seek when a different track is active', async () => {
      const subs = listeners();
      await start45();
      (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValue({ id: 'ABC/002.mp3' });
      await stateCb(subs).cb({ state: State.Ready });
      expect(TrackPlayer.seekTo).not.toHaveBeenCalled();
    });

    it('is cancelled once the player moves away from the episode it reached', async () => {
      const subs = listeners();
      await start45();
      const changed = subs.find((x) => x.event === Event.PlaybackActiveTrackChanged)!;
      changed.cb({ track: { id: 'ABC/001.mp3' } });
      subs.forEach((x) => expect(x.remove).not.toHaveBeenCalled());
      changed.cb({ track: { id: 'ABC/002.mp3' } });
      subs.forEach((x) => expect(x.remove).toHaveBeenCalled());
    });

    it('survives the reset/setQueue track change to episode 0 before reaching its target', async () => {
      const subs = listeners();
      (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValue({ id: 'ABC/003.mp3' });
      await engine.playLecture(LECTURE as any, { episodeId: 'ABC/003.mp3', positionSec: 45 });
      const changed = subs.find((x) => x.event === Event.PlaybackActiveTrackChanged)!;
      changed.cb({ track: { id: 'ABC/001.mp3' } }); // late event from reset()/setQueue()
      subs.forEach((x) => expect(x.remove).not.toHaveBeenCalled());
      await stateCb(subs).cb({ state: State.Ready });
      expect(TrackPlayer.seekTo).toHaveBeenCalledWith(45);
    });

    it.each([Event.RemoteSeek, Event.RemoteNext, Event.RemotePrevious])(
      'lock-screen %s cancels it',
      async (event) => {
        const subs = listeners();
        await start45();
        subs.find((x) => x.event === event)!.cb({});
        subs.forEach((x) => expect(x.remove).toHaveBeenCalled());
      },
    );

    it('survives the active-track change to its own episode', async () => {
      const subs = listeners();
      await start45();
      const changed = subs.find((x) => x.event === Event.PlaybackActiveTrackChanged)!;
      changed.cb({ track: { id: 'ABC/001.mp3' } });
      subs.forEach((x) => expect(x.remove).not.toHaveBeenCalled());
    });

    it('gives up after the timeout', async () => {
      const subs = listeners();
      await start45();
      jest.advanceTimersByTime(10_000);
      subs.forEach((x) => expect(x.remove).toHaveBeenCalled());
    });

    it('a second playLecture removes the first listeners', async () => {
      const subs = listeners();
      await start45();
      await engine.playLecture(LECTURE as any, { episodeId: 'ABC/001.mp3', positionSec: 60 });
      const first = subs.slice(0, 2);
      first.forEach((x) => expect(x.remove).toHaveBeenCalled());
    });

    it.each([
      ['skipNext', () => engine.skipNext()],
      ['skipPrev', () => engine.skipPrev()],
      ['seekTo', () => engine.seekTo(5)],
      ['stop', () => engine.stop()],
    ])('%s cancels it', async (_n, act) => {
      const subs = listeners();
      await start45();
      await act();
      subs.forEach((x) => expect(x.remove).toHaveBeenCalled());
    });

    it('arms no listener when starting from the top', async () => {
      await engine.playLecture(LECTURE as any);
      expect(TrackPlayer.addEventListener).not.toHaveBeenCalled();
    });
  });

  it('pure start helpers', () => {
    const eps = [
      { id: 'ABC/001.mp3', durationSec: 600 },
      { id: 'ABC/002.mp3', durationSec: 900 },
    ] as any;
    expect(engine.resolveStartPoint(eps, null, undefined)).toEqual({ index: 0, positionSec: 0 });
    expect(engine.resolveStartPoint(eps, null, { episodeId: 'ABC/002.mp3', positionSec: 30 })).toEqual({ index: 1, positionSec: 30 });
    expect(engine.clampStartPosition(-5, 600)).toBe(0);
    expect(engine.clampStartPosition(700, 0)).toBe(700);
    expect(engine.clampStartPosition(5000, 600)).toBe(599);
    expect(engine.needsSeekCorrection(0, 45)).toBe(true);
    expect(engine.needsSeekCorrection(43.5, 45)).toBe(false);
  });

  it('ignores a completed in-progress session (starts from the top)', async () => {
    mockInProgress = { lectureId: 'ABC/002.mp3', positionSec: 120, durationSec: 900, completed: true };
    await engine.playLecture(LECTURE as any);
    expect(TrackPlayer.skip).not.toHaveBeenCalled();
  });
});

describe('playLecture active-queue fast path', () => {
  const QUEUE = ['001', '002', '003'].map((n, i) => ({
    id: `ABC/${n}.mp3`,
    url: `u${n}`,
    title: `ح${i + 1}`,
    artist: 'الشيخ ابن عثيمين',
    duration: [600, 900, 800][i],
  }));
  beforeEach(() => {
    (Platform as any).OS = 'ios';
    jest.clearAllMocks();
    engine.__resetForTests();
    mockInProgress = null;
    (fetchItemMetadata as jest.Mock).mockResolvedValue(META);
    (TrackPlayer.getQueue as jest.Mock).mockResolvedValue(QUEUE);
  });
  afterEach(() => (TrackPlayer.getQueue as jest.Mock).mockResolvedValue([]));

  it('an explicit start already in the active queue skips there without reset or fetch', async () => {
    await engine.playLecture(LECTURE as any, { episodeId: 'ABC/002.mp3', positionSec: 30 });
    expect(fetchItemMetadata).not.toHaveBeenCalled();
    expect(TrackPlayer.reset).not.toHaveBeenCalled();
    expect(TrackPlayer.setQueue).not.toHaveBeenCalled();
    expect(TrackPlayer.skip).toHaveBeenCalledWith(1, 30);
    expect(TrackPlayer.play).toHaveBeenCalled();
    const [track, progress] = (mockSetTrack as jest.Mock).mock.calls[0];
    expect(track).toEqual(expect.objectContaining({ id: 'ABC/002.mp3', title: 'ح2', durationSec: 900 }));
    expect(progress).toBeCloseTo(30 / 900);
    expect(mockSetVisible).toHaveBeenCalledWith(true);
    expect(mockSetIsPlaying).toHaveBeenCalledWith(true);
  });

  it('without an explicit start the fast path is never taken', async () => {
    await engine.playLecture(LECTURE as any);
    expect(fetchItemMetadata).toHaveBeenCalled();
  });

  it('an episode not in the queue takes the normal path', async () => {
    await engine.playLecture(LECTURE as any, { episodeId: 'ABC/999.mp3', positionSec: 30 });
    expect(fetchItemMetadata).toHaveBeenCalled();
    expect(TrackPlayer.reset).toHaveBeenCalled();
  });

  it('a getQueue failure falls back to the normal path', async () => {
    (TrackPlayer.getQueue as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await engine.playLecture(LECTURE as any, { episodeId: 'ABC/002.mp3', positionSec: 30 });
    expect(fetchItemMetadata).toHaveBeenCalled();
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

  it('never rejects: getActiveTrackIndex failure → toast + isPlaying=false (H1)', async () => {
    (TrackPlayer.getActiveTrackIndex as jest.Mock).mockRejectedValueOnce(new Error('player not initialized'));
    await expect(engine.togglePlayback()).resolves.toBeUndefined();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(mockSetIsPlaying).toHaveBeenCalledWith(false);
  });

  it('never rejects: cold-start playLecture network failure → toast (H1)', async () => {
    (TrackPlayer.getActiveTrackIndex as jest.Mock).mockResolvedValue(undefined);
    mockTrack = { id: 'ABC/001.mp3', title: 'ح1', reciter: 'الشيخ ابن عثيمين', durationSec: 600 };
    (fetchItemMetadata as jest.Mock).mockRejectedValueOnce(new Error('network request failed'));
    await expect(engine.togglePlayback()).resolves.toBeUndefined();
    expect(mockToastShow).toHaveBeenCalled();
    expect(mockSetIsPlaying).toHaveBeenCalledWith(false);
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
    expect(mockSetVisible).not.toHaveBeenCalled(); // never overrides the Mushaf's hide
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
