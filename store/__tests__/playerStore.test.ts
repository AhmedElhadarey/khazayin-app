jest.mock('@/store/progressStore', () => {
  const noteLectureTick = jest.fn().mockResolvedValue(undefined);
  return {
    useProgressStore: { getState: () => ({ noteLectureTick }) },
    __noteLectureTick: noteLectureTick,
  };
});
import { usePlayerStore } from '../playerStore';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __noteLectureTick } = require('@/store/progressStore') as { __noteLectureTick: jest.Mock };

const TRACK = { id: 'a/001.mp3', title: 't', reciter: 'r', durationSec: 100 };

describe('playerStore engine sync', () => {
  beforeEach(() => {
    __noteLectureTick.mockClear();
    usePlayerStore.setState({ track: null, isPlaying: false, progress: 0, isVisible: true });
  });

  it('starts with no track (no mock seed)', () => {
    expect(usePlayerStore.getState().track).toBeNull();
  });

  it('setTrack with initialProgress sets progress without emitting a tick', () => {
    usePlayerStore.getState().setTrack(TRACK, 0.4);
    expect(usePlayerStore.getState().progress).toBeCloseTo(0.4);
    expect(__noteLectureTick).not.toHaveBeenCalled();
  });

  it('setIsPlaying(false) after playing flushes position with zero forward delta', () => {
    usePlayerStore.setState({ track: TRACK, isPlaying: true, progress: 0.5 });
    usePlayerStore.getState().setIsPlaying(false);
    expect(__noteLectureTick).toHaveBeenCalledTimes(1);
    const arg = __noteLectureTick.mock.calls[0][0];
    expect(arg.positionSec).toBeCloseTo(50);
    expect(arg.forwardListenedDelta).toBe(0);
  });

  it('setIsPlaying(true) does not flush', () => {
    usePlayerStore.setState({ track: TRACK, isPlaying: false, progress: 0.5 });
    usePlayerStore.getState().setIsPlaying(true);
    expect(__noteLectureTick).not.toHaveBeenCalled();
  });

  it('setIsPlaying is a no-op when value is unchanged', () => {
    usePlayerStore.setState({ track: TRACK, isPlaying: false, progress: 0.5 });
    usePlayerStore.getState().setIsPlaying(false);
    expect(__noteLectureTick).not.toHaveBeenCalled();
  });

  it('togglePlay preserves the paused flush', () => {
    usePlayerStore.setState({ track: TRACK, isPlaying: true, progress: 0.3 });
    usePlayerStore.getState().togglePlay();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(__noteLectureTick).toHaveBeenCalledTimes(1);
  });

  it('setProgress emits a forward tick for a normal ~1s advance', () => {
    usePlayerStore.setState({ track: TRACK, isPlaying: true, progress: 0.10 });
    usePlayerStore.getState().setProgress(0.11); // 10s -> 11s = +1s
    const arg = __noteLectureTick.mock.calls.at(-1)![0];
    expect(arg.forwardListenedDelta).toBeCloseTo(1, 1);
  });

  it('setProgress treats a large jump (seek/resume) as zero forward delta', () => {
    usePlayerStore.setState({ track: TRACK, isPlaying: true, progress: 0.10 });
    usePlayerStore.getState().setProgress(0.90); // 10s -> 90s = +80s > 30s
    const arg = __noteLectureTick.mock.calls.at(-1)![0];
    expect(arg.forwardListenedDelta).toBe(0);
  });

  it('setTrack(null) flushes a final completed tick at progress=1', () => {
    usePlayerStore.setState({ track: TRACK, isPlaying: false, progress: 0.7 });
    usePlayerStore.getState().setTrack(null);
    const arg = __noteLectureTick.mock.calls.at(-1)![0];
    expect(arg.positionSec).toBeCloseTo(100); // progress 1 * dur 100
  });
});
