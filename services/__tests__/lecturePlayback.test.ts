import { Alert } from 'react-native';

jest.mock('@/services/audioEngine', () => ({
  playLecture: jest.fn(),
  // Real class so `instanceof` works in the service under test.
  NoAudioError: class NoAudioError extends Error {},
}));

import { playLecture, NoAudioError } from '@/services/audioEngine';
import { startLecturePlayback } from '../lecturePlayback';

const LECTURE = { id: 'sl5-1', title: 'تفسير القرآن', scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar' } as any;

describe('startLecturePlayback', () => {
  let alertSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => alertSpy.mockRestore());

  it('calls playLecture with the lecture and shows no alert on success', async () => {
    (playLecture as jest.Mock).mockResolvedValue(undefined);
    await startLecturePlayback(LECTURE);
    expect(playLecture).toHaveBeenCalledWith(LECTURE);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows the "no recording" alert on NoAudioError', async () => {
    (playLecture as jest.Mock).mockRejectedValue(new (NoAudioError as any)());
    await startLecturePlayback(LECTURE);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('تفسير القرآن');
    expect(alertSpy.mock.calls[0][1]).toContain('لا يتوفر');
  });

  it('shows a generic error alert on any other failure', async () => {
    (playLecture as jest.Mock).mockRejectedValue(new Error('network down'));
    await startLecturePlayback(LECTURE);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][1]).toMatch(/تعذّر|خطأ|حاول/);
  });

  it('never rejects (errors are handled, not propagated)', async () => {
    (playLecture as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(startLecturePlayback(LECTURE)).resolves.toBeUndefined();
  });
});
