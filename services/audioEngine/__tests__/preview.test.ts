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

import TrackPlayer from 'react-native-track-player';
import { Platform } from 'react-native';
import * as engine from '../../audioEngine';
import { fetchItemMetadata } from '../../archive/archiveClient';
import { PREVIEW_MAX_SEC } from '@/constants/settings';
import { usePreviewStore } from '@/store/previewStore';

const reciter = { id: 'r3', name: 'المنشاوي', style: 'murattal', styleLabel: 'x' } as any;
const SRC = { archiveId: 'Item_1', file: '001 Fatiha.mp3' };
/** Let in-flight awaits advance (real timers only). */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const deferred = () => {
  let resolve!: () => void;
  const p = new Promise<void>((r) => {
    resolve = r;
  });
  return { p, resolve };
};
const lecture = { id: 'l', title: 't', scholar: 's', duration: '', category: 'scholar', archiveId: 'L' } as any;
const lectureMeta = { files: [{ name: 'a.mp3', track: '1', length: '60' }] };

beforeEach(() => {
  (Platform as any).OS = 'ios';
  jest.clearAllMocks();
  engine.__resetForTests();
  usePreviewStore.getState().clear();
  mockInProgress = null;
  mockTrack = null;
});

it('P1: canPreviewAudio — native & no lecture → true; web → false; lecture owns queue → false', async () => {
  expect(engine.canPreviewAudio()).toBe(true);
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  await engine.playLecture(lecture);
  expect(engine.getQueueOwner()).toBe('lecture');
  expect(engine.canPreviewAudio()).toBe(false);
  engine.__resetForTests();
  (Platform as any).OS = 'web';
  expect(engine.canPreviewAudio()).toBe(false);
});

it('P2: plays the verified file as a single preview track; owner preview; never touches playerStore', async () => {
  await engine.startReciterPreview(reciter, SRC);
  expect(engine.getQueueOwner()).toBe('preview');
  const added = (TrackPlayer.add as jest.Mock).mock.calls[0][0];
  expect(added).toMatchObject({
    id: 'preview:r3',
    url: 'https://archive.org/download/Item_1/001%20Fatiha.mp3',
  });
  expect(TrackPlayer.play).toHaveBeenCalled();
  expect(fetchItemMetadata).not.toHaveBeenCalled(); // no metadata round trip
  expect(mockSetTrack).not.toHaveBeenCalled();
  expect(mockSetIsPlaying).not.toHaveBeenCalled();
  expect(mockSetVisible).not.toHaveBeenCalled();
});

it('P3: status becomes playing only once play() resolves', async () => {
  const d = deferred();
  (TrackPlayer.play as jest.Mock).mockImplementationOnce(() => d.p);
  const run = engine.startReciterPreview(reciter, SRC);
  await flush();
  expect(usePreviewStore.getState().status).toBe('loading');
  d.resolve();
  await run;
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'r3', status: 'playing' });
});

it('P4: owner is set synchronously, before any await', () => {
  void engine.startReciterPreview(reciter, SRC);
  expect(engine.getQueueOwner()).toBe('preview');
  expect(usePreviewStore.getState().reciterId).toBe('r3');
});

it.each(['setupPlayer', 'reset', 'add', 'play'] as const)(
  'P5: a start superseded while awaiting %s issues no further command and never plays',
  async (stage) => {
    const d = deferred();
    (TrackPlayer[stage] as jest.Mock).mockImplementationOnce(() => d.p);
    const a = engine.startReciterPreview({ ...reciter, id: 'rA' }, SRC);
    const b = engine.startReciterPreview({ ...reciter, id: 'rB' }, SRC);
    d.resolve();
    await a;
    await b;
    const addIds = (TrackPlayer.add as jest.Mock).mock.calls.map((c) => c[0].id);
    expect(addIds[addIds.length - 1]).toBe('preview:rB');
    // A mock records an add the moment it is issued, so a start parked on
    // add/play has already issued its add; one parked earlier never has.
    expect(addIds.filter((id) => id === 'preview:rA').length).toBeLessThanOrEqual(
      stage === 'add' || stage === 'play' ? 1 : 0,
    );
    expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'rB', status: 'playing' });
  },
);

it('P6: stop during an in-flight start — the stale start never plays; owner none; state idle', async () => {
  const d = deferred();
  (TrackPlayer.add as jest.Mock).mockImplementationOnce(() => d.p);
  const a = engine.startReciterPreview(reciter, SRC);
  await flush();
  await engine.stopReciterPreview();
  d.resolve();
  await a;
  expect(TrackPlayer.play).not.toHaveBeenCalled();
  expect(engine.getQueueOwner()).toBe('none');
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});

it('P7: stop is a no-op unless a preview owns the queue (never resets a lecture)', async () => {
  await engine.stopReciterPreview();
  expect(TrackPlayer.reset).not.toHaveBeenCalled();
});

it('P8: stop resets the queue, owner none, state idle', async () => {
  await engine.startReciterPreview(reciter, SRC);
  (TrackPlayer.reset as jest.Mock).mockClear();
  await engine.stopReciterPreview();
  expect(TrackPlayer.reset).toHaveBeenCalledTimes(1);
  expect(engine.getQueueOwner()).toBe('none');
  expect(usePreviewStore.getState().reciterId).toBeNull();
});

it('P9: a current start that fails clears state, releases the owner, and rethrows', async () => {
  (TrackPlayer.add as jest.Mock).mockRejectedValueOnce(new Error('net'));
  await expect(engine.startReciterPreview(reciter, SRC)).rejects.toThrow('net');
  expect(usePreviewStore.getState().reciterId).toBeNull();
  expect(engine.getQueueOwner()).toBe('none');
});

it('P10: a superseded start that fails does not throw', async () => {
  const d = deferred();
  (TrackPlayer.add as jest.Mock).mockImplementationOnce(() =>
    d.p.then(() => {
      throw new Error('net');
    }),
  );
  const a = engine.startReciterPreview({ ...reciter, id: 'rA' }, SRC);
  await flush();
  const b = engine.startReciterPreview({ ...reciter, id: 'rB' }, SRC);
  d.resolve();
  await expect(a).resolves.toBeUndefined();
  await b;
});

it('P11: auto-stops after PREVIEW_MAX_SEC', async () => {
  jest.useFakeTimers();
  try {
    await engine.startReciterPreview(reciter, SRC);
    (TrackPlayer.reset as jest.Mock).mockClear();
    jest.advanceTimersByTime(PREVIEW_MAX_SEC * 1000);
    await Promise.resolve();
    expect(TrackPlayer.reset).toHaveBeenCalled();
    expect(engine.getQueueOwner()).toBe('none');
  } finally {
    jest.useRealTimers();
  }
});

it('P12: playLecture abandons an active preview synchronously and ends up owning the queue', async () => {
  await engine.startReciterPreview(reciter, SRC);
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  const p = engine.playLecture(lecture);
  // Released (not yet claimed) while the preview's native queue is reset.
  expect(engine.getQueueOwner()).toBe('none');
  expect(usePreviewStore.getState().reciterId).toBeNull();
  await p;
  expect(engine.getQueueOwner()).toBe('lecture');
});

it('P12b: a playing preview is reset BEFORE the lecture loads', async () => {
  await engine.startReciterPreview(reciter, SRC);
  (TrackPlayer.reset as jest.Mock).mockClear();
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  await engine.playLecture(lecture);
  const resetOrder = (TrackPlayer.reset as jest.Mock).mock.invocationCallOrder[0];
  const fetchOrder = (fetchItemMetadata as jest.Mock).mock.invocationCallOrder[0];
  expect(resetOrder).toBeLessThan(fetchOrder);
});

it('P12c: a lecture with no audio still silences a playing preview', async () => {
  await engine.startReciterPreview(reciter, SRC);
  (TrackPlayer.reset as jest.Mock).mockClear();
  await expect(engine.playLecture({ ...lecture, archiveId: undefined })).rejects.toBeInstanceOf(
    engine.NoAudioError,
  );
  expect(TrackPlayer.reset).toHaveBeenCalledTimes(1);
});

it('P12e: a preview started during the playLecture reset gap is abandoned, not left loading', async () => {
  await engine.startReciterPreview(reciter, SRC);
  const d = deferred();
  (TrackPlayer.reset as jest.Mock).mockImplementationOnce(() => d.p);
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  const p = engine.playLecture(lecture);
  expect(engine.getQueueOwner()).toBe('none');
  const b = engine.startReciterPreview({ ...reciter, id: 'rB' }, SRC); // owner 'none' → allowed
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'rB', status: 'loading' });
  d.resolve();
  await p;
  await b;
  expect(engine.getQueueOwner()).toBe('lecture');
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});

it('P12f: a note start never jumps within a preview queue — reset first, then a fresh load', async () => {
  await engine.startReciterPreview(reciter, SRC);
  (TrackPlayer.reset as jest.Mock).mockClear();
  (TrackPlayer.getQueue as jest.Mock).mockClear();
  // The preview reset left its track behind (e.g. it failed natively).
  (TrackPlayer.getQueue as jest.Mock).mockResolvedValueOnce([{ id: 'preview:r3', url: 'u' }]);
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  await engine.playLecture(lecture, { episodeId: 'L/a.mp3', positionSec: 5 });
  const resetOrder = (TrackPlayer.reset as jest.Mock).mock.invocationCallOrder[0];
  const queueOrder = (TrackPlayer.getQueue as jest.Mock).mock.invocationCallOrder[0];
  expect(resetOrder).toBeLessThan(queueOrder);
  expect(fetchItemMetadata).toHaveBeenCalled();
  expect(TrackPlayer.setQueue).toHaveBeenCalled();
  expect(engine.getQueueOwner()).toBe('lecture');
});

it('P12d: no preview → playLecture claims the queue synchronously, as before', () => {
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  void engine.playLecture(lecture);
  expect(engine.getQueueOwner()).toBe('lecture');
});

it('P13: togglePlayback treats a preview-owned queue as "no queue" and rebuilds the lecture', async () => {
  await engine.startReciterPreview(reciter, SRC);
  mockTrack = { id: 'L/a.mp3', title: 't', reciter: 's' };
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  await engine.togglePlayback();
  expect(TrackPlayer.setQueue).toHaveBeenCalled(); // rebuilt via playLecture
  expect(engine.getQueueOwner()).toBe('lecture');
});

it('P14: setupPlayer adopts the owner of a queue that survived a JS restart', async () => {
  (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValueOnce({ id: 'preview:r3', url: 'u' });
  await engine.setupPlayer();
  expect(engine.getQueueOwner()).toBe('preview');
  engine.__resetForTests();
  (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValueOnce({ id: 'L/a.mp3', url: 'u' });
  await engine.setupPlayer();
  expect(engine.getQueueOwner()).toBe('lecture');
});

it('P14b: adoption does not overwrite an owner claimed while getActiveTrack was in flight', async () => {
  let resolveActive!: (t: unknown) => void;
  (TrackPlayer.getActiveTrack as jest.Mock).mockImplementationOnce(
    () => new Promise((r) => {
      resolveActive = r;
    }),
  );
  const setup = engine.setupPlayer();
  await flush(); // parked on getActiveTrack
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(lectureMeta);
  const p = engine.playLecture(lecture); // claims 'lecture' synchronously
  expect(engine.getQueueOwner()).toBe('lecture');
  resolveActive({ id: 'preview:r3', url: 'u' }); // a stale surviving track
  await setup;
  await p;
  expect(engine.getQueueOwner()).toBe('lecture');
});

it('P15: web is a silent no-op', async () => {
  (Platform as any).OS = 'web';
  await engine.startReciterPreview(reciter, SRC);
  expect(TrackPlayer.add).not.toHaveBeenCalled();
});
