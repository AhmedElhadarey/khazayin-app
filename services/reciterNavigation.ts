/**
 * Where picking a reciter goes, and how one of that reciter's surahs becomes a
 * playable record.
 *
 * The audit found `onPickReciter` ignoring its argument and pushing the general
 * Mushaf, which lost the reciter entirely (Figma node 2207:5270). Both rules
 * live here as pure functions so the routing is asserted without a navigator.
 */
import type { Lecture, Reciter, Surah } from '@/types/content';

/** The Qiraa tab is a list of readings, not of reciters, and keeps its screen. */
const QIRAAT_STYLE = 'qiraat';

export function reciterDestination(reciter: Reciter): string {
  if (reciter.style === QIRAAT_STYLE) return '/sections/qiraat';
  return `/sections/reciter/${reciter.id}`;
}

/**
 * Adapts a (reciter, surah) pair onto the existing lecture-playback boundary
 * rather than adding a second player path. `archiveId` comes from the reciter,
 * so when a recitation source is added only the fixture changes.
 */
export function surahAsLecture(reciter: Reciter, surah: Surah): Lecture {
  return {
    id: `${reciter.id}:${surah.id}`,
    title: surah.name,
    scholar: reciter.name,
    scholarId: reciter.id,
    duration: surah.meta,
    category: 'general',
    archiveId: reciter.archiveId,
  };
}
