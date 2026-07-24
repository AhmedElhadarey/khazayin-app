/**
 * services/lecturePlayback.ts
 * ---------------------------
 * UI-facing entry point for starting lecture audio. Wraps the audio-engine
 * `playLecture` with Arabic user feedback so screens can call it directly from
 * an onPress without their own try/catch. Never throws.
 */
import { Alert } from 'react-native';
import type { Lecture } from '@/types/content';
import { playLecture, NoAudioError } from '@/services/audioEngine';

export async function startLecturePlayback(lecture: Lecture): Promise<void> {
  try {
    await playLecture(lecture);
  } catch (err) {
    if (err instanceof NoAudioError) {
      Alert.alert(lecture.title, 'لا يتوفر تسجيل صوتي لهذه المادة');
    } else {
      Alert.alert('تعذّر التشغيل', 'حدث خطأ أثناء تحميل التسجيل. تحقق من اتصالك ثم حاول مجددًا.');
    }
  }
}
