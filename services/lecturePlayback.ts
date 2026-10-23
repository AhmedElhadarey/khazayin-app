/**
 * services/lecturePlayback.ts
 * ---------------------------
 * UI-facing entry point for starting lecture audio. Wraps the audio-engine
 * `playLecture` with Arabic user feedback so screens can call it directly from
 * an onPress without their own try/catch. Never throws.
 */
import type { Lecture } from '@/types/content';
import { playLecture, NoAudioError, type LectureStart } from '@/services/audioEngine';
import { showNotice } from '@/services/notice';

export async function startLecturePlayback(lecture: Lecture, start?: LectureStart): Promise<void> {
  try {
    // Omit the argument entirely when there is no start so callers and tests
    // that only know about `playLecture(lecture)` see the same call.
    await (start ? playLecture(lecture, start) : playLecture(lecture));
  } catch (err) {
    if (err instanceof NoAudioError) {
      showNotice(lecture.title, 'لا يتوفر تسجيل صوتي لهذه المادة');
    } else {
      showNotice('تعذّر التشغيل', 'حدث خطأ أثناء تحميل التسجيل. تحقق من اتصالك ثم حاول مجددًا.');
    }
  }
}
