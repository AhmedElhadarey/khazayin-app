/**
 * Adapters from saved items, notes and activity to engine signals (design
 * §4.2, §4.3). Pure: callers pass plain arrays and the catalogue index.
 *
 * Privacy (C8): a note's title and body are never read; the label is the
 * frozen `NoteRef.label` only.
 */
import { isListened } from '@/db/helpers/lectureCompletion';
import { surahName } from '@/constants/progress';
import { LISTEN_LIMIT } from '@/constants/recommendations';
import { archiveIdOfEpisode, isEpisodeId } from '@/services/noteRefs';
import { cmp, surahsRead } from './recommend';
import type {
  ActivityInput,
  CatalogueIndex,
  NoteInput,
  SavedInput,
  SessionInput,
  Signal,
  SignalKind,
  SignalTarget,
} from './types';

const SAVED_LIMIT = 200;
const NOTE_LIMIT = 100;

/**
 * Newest `limit` entries, newest first. At a cap boundary, entries with equal
 * timestamps are kept in input order.
 */
const newestFirst = <T>(items: readonly T[], at: (t: T) => number, limit: number): T[] =>
  [...items].sort((a, b) => at(b) - at(a)).slice(0, limit);

const surahNumber = (id: string): number | undefined => {
  const n = Number(id);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : undefined;
};

/** The catalogue lecture for an id, or its archive series for an episode id. */
function resolveLecture(id: string, index: CatalogueIndex) {
  const archiveId = isEpisodeId(id) ? archiveIdOfEpisode(id) : undefined;
  return index.byLectureId.get(id) ?? (archiveId ? index.byArchiveId.get(archiveId) : undefined);
}

/**
 * A lecture target keyed by the catalogue lecture when the id resolves (an
 * episode id falls back to its archive id), so episodes of one series dedupe.
 */
function lectureTarget(id: string, index: CatalogueIndex, title?: string): SignalTarget {
  const archiveId = isEpisodeId(id) ? archiveIdOfEpisode(id) : undefined;
  const l = resolveLecture(id, index);
  if (l) return { type: 'lecture', id: l.id, archiveId: l.archiveId, title: l.title };
  return { type: 'lecture', id, ...(archiveId ? { archiveId } : {}), ...(title ? { title } : {}) };
}

// A lecture is keyed by its series (archiveId), so episodes of one series collapse.
const seriesKey = (t: SignalTarget): string =>
  t.type === 'surah'
    ? `surah:${t.number}`
    : t.type === 'lecture'
      ? `lecture:${t.archiveId ?? t.id}`
      : `${t.type}:${t.id}`;

function fromSaved(item: SavedInput, index: CatalogueIndex): Signal | undefined {
  const name = item.snapshot.name ?? item.snapshot.title ?? '';
  const make = (target: SignalTarget): Signal => ({ kind: 'saved', target, atMs: item.savedAt, label: name });
  switch (item.type) {
    case 'lecture':
      return make(lectureTarget(item.entityId, index, item.snapshot.title));
    case 'scholar':
      return make({ type: 'scholar', id: item.entityId });
    case 'book':
      return make({ type: 'book', id: item.entityId, title: item.snapshot.title });
    case 'surah': {
      const number = surahNumber(item.entityId);
      return number === undefined ? undefined : make({ type: 'surah', number });
    }
    default:
      return undefined; // dawah and anything unknown
  }
}

function fromNote(note: NoteInput, index: CatalogueIndex): Signal | undefined {
  const ref = note.ref;
  if (!ref) return undefined;
  const make = (target: SignalTarget): Signal => ({ kind: 'note', target, atMs: note.updatedAt, label: ref.label });
  switch (ref.type) {
    case 'ayah': {
      const number = surahNumber(ref.id);
      return number === undefined ? undefined : make({ type: 'surah', number });
    }
    case 'lecture':
      return make(lectureTarget(ref.id, index, ref.title));
    case 'book':
      return make({ type: 'book', id: ref.id, title: ref.title });
    default:
      return undefined;
  }
}

function fromSession(s: SessionInput, index: CatalogueIndex): Signal | undefined {
  if (!isListened(s)) return undefined;
  const kind: SignalKind = s.completed ? 'completed' : 'listened';
  // The reason names what the user thinks they listened to: the catalogue
  // series title when the id resolves, else the session's own title.
  const label = resolveLecture(s.lectureId, index)?.title || s.title;
  return { kind, target: lectureTarget(s.lectureId, index, s.title), atMs: s.lastListenedAt, label };
}

export function toSignals(
  saved: readonly SavedInput[],
  notes: readonly NoteInput[],
  activity: ActivityInput | null,
  index: CatalogueIndex,
): Signal[] {
  const all: (Signal | undefined)[] = [
    ...newestFirst(saved, (s) => s.savedAt, SAVED_LIMIT).map((s) => fromSaved(s, index)),
    ...newestFirst(notes, (n) => n.updatedAt, NOTE_LIMIT).map((n) => fromNote(n, index)),
  ];
  if (activity) {
    all.push(
      ...newestFirst(activity.sessions, (s) => s.lastListenedAt, LISTEN_LIMIT).map((s) => fromSession(s, index)),
      ...surahsRead(activity.pageReads).map(
        (r): Signal => ({ kind: 'read', target: { type: 'surah', number: r.number }, atMs: r.atMs, label: surahName(r.number) }),
      ),
    );
  }

  // One signal per (kind, target), keeping the newest; equal times break on
  // the smaller label, as recommend() does, so input order never matters.
  const newest = new Map<string, Signal>();
  for (const s of all) {
    if (!s) continue;
    const key = `${s.kind}|${seriesKey(s.target)}`;
    const prev = newest.get(key);
    if (!prev || s.atMs > prev.atMs || (s.atMs === prev.atMs && cmp(s.label, prev.label) < 0)) newest.set(key, s);
  }
  return [...newest.entries()]
    .sort(([ka, a], [kb, b]) => b.atMs - a.atMs || cmp(ka, kb))
    .map(([, s]) => s);
}
