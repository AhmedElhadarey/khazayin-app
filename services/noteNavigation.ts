/**
 * Resolves a note's content reference back to its source: a route to open or
 * a lecture to play at a given second. Pure; the caller owns presentation, so
 * nothing here dismisses a sheet (the notes viewer closes itself first).
 */
import { bookDetailHref } from '@/services/bookDetail';
import { archiveIdOfEpisode, isEpisodeId, type NoteRef } from '@/services/noteRefs';
import { normalizeSurahParam } from '@/services/mushafNavigation';
import type { LectureStart } from '@/services/audioEngine';
import type { Lecture } from '@/types/content';

export type NoteSourceTarget =
  | { kind: 'route'; href: string }
  | { kind: 'lecture'; lecture: Lecture; start: LectureStart };

export function noteSourceTarget(ref: NoteRef): NoteSourceTarget | null {
  switch (ref.type) {
    case 'ayah': {
      const surahId = normalizeSurahParam(ref.id);
      if (!surahId) return null;
      const base = `/sections/mushaf?surah=${Number(surahId)}`;
      const ayah = ref.position;
      return {
        kind: 'route',
        href: typeof ayah === 'number' && ayah >= 1 ? `${base}&ayah=${ayah}` : base,
      };
    }
    case 'lecture': {
      if (!isEpisodeId(ref.id)) return null;
      const archiveId = archiveIdOfEpisode(ref.id);
      // Mirrors the Lecture audioEngine.togglePlayback rebuilds from a track.
      const lecture: Lecture = {
        id: archiveId,
        archiveId,
        title: ref.title ?? '',
        scholar: ref.speaker ?? '',
        duration: '',
        category: 'scholar',
      };
      return {
        kind: 'lecture',
        lecture,
        start: { episodeId: ref.id, positionSec: ref.position ?? 0 },
      };
    }
    case 'book':
      return { kind: 'route', href: bookDetailHref(ref.id) };
    default:
      return null;
  }
}

export type NoteSourceDeps = {
  navigate: (href: string) => void;
  play: (lecture: Lecture, start: LectureStart) => Promise<void> | void;
};

/** Runs a target. Deliberately has no dismiss dependency. */
export function runNoteSource(target: NoteSourceTarget | null, deps: NoteSourceDeps): void {
  if (!target) return;
  if (target.kind === 'route') deps.navigate(target.href);
  else void deps.play(target.lecture, target.start);
}

/**
 * The notes viewer's link tap: close the sheet, then navigate. An unlinkable
 * ref (or none) leaves the sheet open.
 */
export function viewerSourceAction(
  ref: NoteRef | undefined,
  deps: NoteSourceDeps & { back: () => void },
): void {
  const target = ref ? noteSourceTarget(ref) : null;
  if (!target) return;
  deps.back();
  runNoteSource(target, deps);
}
