/**
 * Starts a surah recitation for a specific reciter.
 *
 * Delegates to the shared lecture-playback boundary, so there is exactly one
 * player path and one place that owns player state. While no reciter audio
 * source exists the boundary raises NoAudioError, which surfaces as an Arabic
 * alert and leaves the user on the surah list — never a silent reroute.
 */
import { startLecturePlayback } from '@/services/lecturePlayback';
import { surahAsLecture } from '@/services/reciterNavigation';
import type { Reciter, Surah } from '@/types/content';

export async function startSurahPlayback(reciter: Reciter, surah: Surah): Promise<void> {
  await startLecturePlayback(surahAsLecture(reciter, surah));
}
