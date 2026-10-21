/**
 * Note references: what a note points at (an ayah, a lecture second or a
 * book), the Arabic label shown for it, lenient validation of stored refs and
 * the route-param encoding the note editor receives.
 *
 * Pure, no store or navigator imports. Design:
 * docs/plans/2026-10-21-contextual-notes-design.md §4.1-4.2.
 */
import { pageForAyah } from '@/constants/quranPages';
import { SURAH_NAMES_AR, toArabicDigits } from '@/constants/progress';
import { normalizeSurahParam } from '@/services/mushafNavigation';

export const NOTE_REF_TYPES = Object.freeze(['ayah', 'lecture', 'book'] as const);
export type NoteRefType = (typeof NOTE_REF_TYPES)[number];

/**
 * Stored shape. `type` and `context` are open strings so a newer build's refs
 * survive a round trip through this build; unknown keys are preserved too.
 */
export type NoteRef = {
  /** NoteRefType for refs this build creates. */
  type: string;
  /** ayah: padded surah id '002'; lecture: episode id 'ABC/002.mp3'; book: Book.id. */
  id: string;
  /** ayah: ayah number; lecture: whole seconds; book: page (unused today). */
  position?: number;
  /** Arabic label frozen at creation, shown verbatim. */
  label: string;
  /** 'mushaf' | 'mini-player' | 'library-progress' | 'book-detail' */
  context?: string;
  /** Ayah refs: Madani page from pageForAyah. */
  page?: number;
  /** Lecture/book title (needed to rebuild playback). */
  title?: string;
  /** Lecture scholar (RNTP `artist`). */
  speaker?: string;
  [extra: string]: unknown;
};

const SEP = ' — ';
const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatPlaybackTime(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return toArabicDigits(h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`);
}

export function ayahRefLabel(surah: number, ayah?: number): string {
  const name = SURAH_NAMES_AR[surah] ?? '';
  return ayah == null ? `سورة ${name}` : `${name}: ${toArabicDigits(ayah)}`;
}

export function lectureRefLabel(title: string, speaker: string, positionSec?: number): string {
  const lead = title.trim() || speaker.trim();
  const base = lead ? `محاضرة ${lead}` : 'محاضرة';
  return positionSec == null ? base : `${base}${SEP}${formatPlaybackTime(positionSec)}`;
}

export function bookRefLabel(title: string, page?: number): string {
  const base = `كتاب ${title.trim()}`;
  return page == null ? base : `${base}${SEP}صفحة ${toArabicDigits(page)}`;
}

/** Episode ids are `${archiveId}/${file}`; anything else cannot be resolved back. */
export const isEpisodeId = (id: string): boolean => /^[^/]+\/.+$/.test(id);

/** Archive (series) id of an episode id `${archiveId}/${file}`. */
export const archiveIdOfEpisode = (episodeId: string): string => episodeId.split('/')[0];

export function makeAyahRef(surah: string | number, ayah?: number): NoteRef {
  const id = normalizeSurahParam(String(surah)) ?? String(surah);
  const n = Number(id);
  if (ayah == null) {
    return { type: 'ayah', id, label: ayahRefLabel(n), context: 'mushaf' };
  }
  const page = pageForAyah(n, ayah);
  return {
    type: 'ayah',
    id,
    position: ayah,
    ...(page != null ? { page } : {}),
    label: ayahRefLabel(n, ayah),
    context: 'mushaf',
  };
}

export function makeLectureRef(
  input: { id: string; title: string; speaker: string; positionSec?: number },
  context: string,
): NoteRef | undefined {
  if (!isEpisodeId(input.id)) return undefined;
  const position =
    input.positionSec != null && Number.isFinite(input.positionSec) && input.positionSec >= 0
      ? Math.round(input.positionSec)
      : undefined;
  return {
    type: 'lecture',
    id: input.id,
    ...(position != null ? { position } : {}),
    label: lectureRefLabel(input.title, input.speaker, position),
    context,
    title: input.title,
    speaker: input.speaker,
  };
}

export function makeBookRef(input: { id: string; title: string }, page?: number): NoteRef {
  return {
    type: 'book',
    id: input.id,
    ...(page != null ? { position: page } : {}),
    label: bookRefLabel(input.title, page),
    context: 'book-detail',
  };
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNonNegInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/**
 * Lenient: drops a ref only when it is structurally malformed. Unknown types,
 * contexts and keys are kept so a newer build's refs survive. Never throws.
 */
export function coerceNoteRef(raw: unknown): NoteRef | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.type) || !isNonEmptyString(r.id) || !isNonEmptyString(r.label)) {
    return undefined;
  }
  if ('position' in r && r.position !== undefined && !isNonNegInt(r.position)) return undefined;
  if ('page' in r && r.page !== undefined && !isNonNegInt(r.page)) return undefined;
  return { ...r } as NoteRef;
}

type ParamValue = string | string[] | undefined;

export function noteRefToParams(ref: NoteRef): Record<string, string> {
  const p: Record<string, string> = { refType: ref.type, refId: ref.id, refLabel: ref.label };
  if (ref.position != null) p.refPos = String(ref.position);
  if (ref.page != null) p.refPage = String(ref.page);
  if (ref.context != null) p.refContext = ref.context;
  if (ref.title != null) p.refTitle = ref.title;
  if (ref.speaker != null) p.refSpeaker = ref.speaker;
  return p;
}

export function noteRefFromParams(params: Record<string, ParamValue>): NoteRef | undefined {
  const one = (k: string): string | undefined => {
    const v = params[k];
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === 'string' && s.length > 0 ? s : undefined;
  };
  const type = one('refType');
  const id = one('refId');
  const label = one('refLabel');
  if (!type || !id || !label) return undefined;
  const ref: NoteRef = { type, id, label };
  for (const [key, field] of [
    ['refPos', 'position'],
    ['refPage', 'page'],
  ] as const) {
    const s = one(key);
    if (s !== undefined) {
      if (!/^\d+$/.test(s)) return undefined;
      ref[field] = Number(s);
    }
  }
  const context = one('refContext');
  const title = one('refTitle');
  const speaker = one('refSpeaker');
  if (context) ref.context = context;
  if (title) ref.title = title;
  if (speaker) ref.speaker = speaker;
  return ref;
}
