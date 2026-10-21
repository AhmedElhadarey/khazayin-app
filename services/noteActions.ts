/**
 * Pure route params for every "take note" action. Each returns what to pass as
 * `params` to `router.push('/note-editor')`; `undefined` means "cannot be linked"; callers use `?? {}` for a plain note.
 * Type-only imports keep this free of store side effects.
 */
import type { LectureSession } from '@/db/types';
import {
  makeAyahRef,
  makeBookRef,
  makeLectureRef,
  noteRefToParams,
} from '@/services/noteRefs';
import type { PlayerTrack } from '@/store/playerStore';

/** `ayah` omitted → a surah-level note (the accessibility path). */
export function takeAyahNoteParams(surahId: string, ayah?: number): Record<string, string> {
  return noteRefToParams(makeAyahRef(surahId, ayah));
}

/** Freezes the current second; `progress` is 0..1 of the track duration. */
export function takeLectureNoteParams(
  track: PlayerTrack | null,
  progress: number,
): Record<string, string> | undefined {
  if (!track) return undefined;
  const hasDuration = typeof track.durationSec === 'number' && track.durationSec > 0;
  const ref = makeLectureRef(
    {
      id: track.id,
      title: track.title,
      speaker: track.reciter,
      positionSec: hasDuration
        ? Math.round((Number.isFinite(progress) ? progress : 0) * (track.durationSec as number))
        : undefined,
    },
    'mini-player',
  );
  return ref ? noteRefToParams(ref) : undefined;
}

export function lectureNoteParamsFromSession(
  session: LectureSession,
): Record<string, string> | undefined {
  const ref = makeLectureRef(
    {
      id: session.lectureId,
      title: session.title,
      speaker: session.author,
      positionSec: session.positionSec,
    },
    'library-progress',
  );
  return ref ? noteRefToParams(ref) : undefined;
}

export function bookNoteParams(book: { id: string; title: string }): Record<string, string> {
  return noteRefToParams(makeBookRef(book));
}
