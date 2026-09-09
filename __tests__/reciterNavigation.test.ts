import { RECITERS, SURAHS } from '@/data/content/quran';
import { reciterDestination, surahAsLecture } from '@/services/reciterNavigation';
import { startSurahPlayback } from '@/services/surahPlayback';

// The audio boundary pulls in react-native-track-player and Sentry, neither of
// which this suite is exercising. Mock the boundary itself: what matters here
// is that surah playback delegates to it and never throws at the screen.
const mockStartLecturePlayback = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/lecturePlayback', () => ({
  startLecturePlayback: (...args: unknown[]) => mockStartLecturePlayback(...args),
}));

/**
 * Figma node 2207:5270. The audit found reciter selection ignoring the picked
 * reciter and opening the general Mushaf instead.
 */
describe('reciterDestination', () => {
  it('opens the reciter-specific surah list, carrying the reciter id', () => {
    const reciter = RECITERS.find((r) => r.id === 'r1')!;
    expect(reciterDestination(reciter)).toBe('/sections/reciter/r1');
  });

  it('never collapses two reciters onto the same destination', () => {
    const nonQiraa = RECITERS.filter((r) => r.style !== 'qiraat');
    const destinations = nonQiraa.map(reciterDestination);
    expect(new Set(destinations).size).toBe(nonQiraa.length);
  });

  it('keeps the Qiraa tab pointing at the qiraat screen', () => {
    const qiraa = RECITERS.find((r) => r.style === 'qiraat')!;
    expect(reciterDestination(qiraa)).toBe('/sections/qiraat');
  });

  it('never routes to the general Mushaf', () => {
    RECITERS.forEach((reciter) => {
      expect([reciter.id, reciterDestination(reciter)]).not.toEqual([
        reciter.id,
        '/sections/mushaf',
      ]);
    });
  });
});

describe('surahAsLecture', () => {
  const reciter = RECITERS.find((r) => r.id === 'r1')!;
  const surah = SURAHS[0];

  it('preserves the reciter identity on the playable record', () => {
    const lecture = surahAsLecture(reciter, surah);
    expect(lecture.scholar).toBe(reciter.name);
    expect(lecture.title).toBe(surah.name);
    expect(lecture.scholarId).toBe(reciter.id);
  });

  it('keys the record by reciter and surah so two reciters never collide', () => {
    const other = RECITERS.find((r) => r.id === 'r2')!;
    expect(surahAsLecture(reciter, surah).id).not.toBe(surahAsLecture(other, surah).id);
    expect(surahAsLecture(reciter, surah).id).not.toBe(
      surahAsLecture(reciter, SURAHS[1]).id,
    );
  });

  it('carries no archive id while no reciter audio source exists', () => {
    expect(surahAsLecture(reciter, surah).archiveId).toBeUndefined();
  });
});

describe('startSurahPlayback', () => {
  const reciter = RECITERS.find((r) => r.id === 'r1')!;

  beforeEach(() => mockStartLecturePlayback.mockClear());

  it('goes through the one shared audio boundary', async () => {
    await startSurahPlayback(reciter, SURAHS[0]);
    expect(mockStartLecturePlayback).toHaveBeenCalledTimes(1);
    expect(mockStartLecturePlayback.mock.calls[0][0]).toMatchObject({
      title: SURAHS[0].name,
      scholar: reciter.name,
    });
  });

  it('resolves without throwing, so a missing recording leaves the screen put', async () => {
    await expect(startSurahPlayback(reciter, SURAHS[0])).resolves.toBeUndefined();
  });
});
