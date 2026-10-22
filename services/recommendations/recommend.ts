/**
 * Pure on-device recommendation engine (design §4, §5.3).
 *
 * Signals decay with a 21-day half-life, add up per topic and per scholar
 * under caps, and a candidate scores by its best topic (max, never a sum, so a
 * two-topic title is not counted twice). Every ordering is total and every
 * candidate pool is sorted by key before a pick, so input order and the clock
 * (a parameter) can never change the output.
 *
 * Imports no React, Zustand, `db/` or `contentService`; the adapters feed it.
 */
import type { Book, Lecture, Scholar } from '@/types/content';
import { SURAH_START_PAGES } from '@/constants/progress';
import { QURAN_PAGE_STARTS } from '@/constants/quranPageData';
import {
  RECOMMENDATION_TOPICS,
  topicsForTitle,
  type TopicId,
} from '@/constants/recommendationTopics';
import {
  HALF_LIFE_MS,
  MAX_SIGNAL_AGE_MS,
  MIN_SCORE,
  RECOMMENDATION_COPY,
  REASON_LABEL_MAX,
  SCHOLAR_CAP,
  TOPIC_CAP,
  WEIGHTS,
} from '@/constants/recommendations';
import { normalize } from '@/services/search/normalize';
import { archiveIdOfEpisode, isEpisodeId } from '@/services/noteRefs';
import type {
  CatalogueIndex,
  CatalogueSnapshot,
  LectureCandidate,
  PageRead,
  Recommendation,
  Signal,
  SignalKind,
} from './types';

const TOPIC_ORDER = Object.keys(RECOMMENDATION_TOPICS) as TopicId[];
const KIND_RANK: Record<SignalKind, number> = { saved: 0, note: 1, completed: 2, listened: 3, read: 4 };
const REC_KIND_RANK = { lecture: 0, book: 1, scholar: 2 } as const;
const SCHOLAR_TERM = 0.5;
const SCHOLAR_CANDIDATE_TERM = 0.8;
const CONTEXT_TOP_K = 3;

export const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const round6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const byTopicOrder = (a: TopicId, b: TopicId): number => TOPIC_ORDER.indexOf(a) - TOPIC_ORDER.indexOf(b);

// ---------------------------------------------------------------------------
// Catalogue index (design §4.4)
// ---------------------------------------------------------------------------

export const lectureKey = (l: Lecture): string => `lecture:${l.archiveId ?? l.id}`;

export function indexCatalogue(snapshot: CatalogueSnapshot): CatalogueIndex {
  // Same-name scholars (s1-s3 are one person) merge onto the smallest id, so
  // affinity and candidates are not split across duplicates.
  const scholars = [...snapshot.scholars].sort((a, b) => cmp(a.id, b.id));
  const canonicalByName = new Map<string, string>();
  const canonicalScholarId = new Map<string, string>();
  const scholarById = new Map<string, Scholar>();
  for (const s of scholars) {
    const name = normalize(s.name);
    if (!canonicalByName.has(name)) canonicalByName.set(name, s.id);
    canonicalScholarId.set(s.id, canonicalByName.get(name) as string);
    scholarById.set(s.id, s);
  }
  const canon = (id: string): string => canonicalScholarId.get(id) ?? id;

  const lectures = [...snapshot.lectures].sort((a, b) => cmp(a.id, b.id));
  const byLectureId = new Map<string, Lecture>();
  const byArchiveId = new Map<string, Lecture>();
  const byKey = new Map<string, Lecture>();
  const grouped = new Map<string, Lecture[]>();
  for (const l of lectures) {
    if (!byLectureId.has(l.id)) byLectureId.set(l.id, l);
    if (l.archiveId && !byArchiveId.has(l.archiveId)) byArchiveId.set(l.archiveId, l);
    if (!byKey.has(lectureKey(l))) byKey.set(lectureKey(l), l);
    if (l.scholarId) {
      const id = canon(l.scholarId);
      const list = grouped.get(id);
      if (list) list.push(l);
      else grouped.set(id, [l]);
    }
  }
  const lecturesByScholar = new Map<string, readonly Lecture[]>(grouped);

  const lectureCandidates: LectureCandidate[] = [...byKey.entries()]
    .sort(([a], [b]) => cmp(a, b))
    .map(([key, lecture]) => ({
      key,
      lecture,
      topics: topicsForTitle(lecture.title, lecture.category),
      scholarId: lecture.scholarId ? canon(lecture.scholarId) : undefined,
    }));

  const bookById = new Map<string, Book>();
  for (const b of [...snapshot.books].sort((a, c) => cmp(a.id, c.id))) {
    if (!bookById.has(b.id)) bookById.set(b.id, b);
  }
  const bookCandidates = [...bookById.values()]
    .map((book) => ({ key: `book:${book.id}`, book, topics: topicsForTitle(book.title) }))
    .sort((a, b) => cmp(a.key, b.key));

  const scholarCandidates = scholars
    .filter((s) => canon(s.id) === s.id)
    .map((scholar) => ({
      key: `scholar:${scholar.id}`,
      scholar,
      topics: topicsOfScholar(lecturesByScholar.get(scholar.id) ?? []),
    }))
    .sort((a, b) => cmp(a.key, b.key));

  return {
    byLectureId,
    byArchiveId,
    bookById,
    lecturesByScholar,
    scholarById,
    canonicalScholarId,
    lectureCandidates,
    bookCandidates,
    scholarCandidates,
  };
}

const topicsOfScholar = (lectures: readonly Lecture[]): TopicId[] =>
  [...new Set(lectures.flatMap((l) => topicsForTitle(l.title, l.category)))].sort(byTopicOrder);

// ---------------------------------------------------------------------------
// Surah "read" derivation (design §5.3)
// ---------------------------------------------------------------------------

/** Last Mushaf page of surah `n`, from the static tables only. */
export function surahLastPage(n: number): number {
  if (n >= 114) return 604;
  const p = SURAH_START_PAGES[n + 1];
  const opening = QURAN_PAGE_STARTS[p - 1];
  return opening[0] === n + 1 && opening[1] === 1 ? p - 1 : p;
}

/**
 * Surahs counted as read: the last page has a read row and, for a surah
 * longer than one page, so does its start page. Approximate by design: one
 * Juz 'Amma page marks several surahs.
 */
export function surahsRead(
  pageReads: readonly PageRead[],
): { number: number; atMs: number }[] {
  const at = new Map<number, number>();
  for (const r of pageReads) at.set(r.page, Math.max(at.get(r.page) ?? 0, r.atMs));
  const out: { number: number; atMs: number }[] = [];
  for (let n = 1; n <= 114; n++) {
    const start = at.get(SURAH_START_PAGES[n]);
    const last = at.get(surahLastPage(n));
    if (start === undefined || last === undefined) continue;
    out.push({ number: n, atMs: Math.max(start, last) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Signal resolution (design §4.4)
// ---------------------------------------------------------------------------

interface Resolved {
  sig: Signal;
  sigKey: string;
  /** Decayed weight; 0 once the signal is older than MAX_SIGNAL_AGE_MS. */
  c: number;
  topics: readonly TopicId[];
  scholarId?: string;
  /** Key of the item the signal points at, which is never recommended back. */
  excludeKey?: string;
}

function targetKey(sig: Signal): string {
  const t = sig.target;
  return t.type === 'surah' ? `surah:${t.number}` : `${t.type}:${t.id}`;
}

function resolve(sig: Signal, index: CatalogueIndex, nowMs: number): Resolved {
  const age = Math.max(0, nowMs - sig.atMs);
  const c = age > MAX_SIGNAL_AGE_MS ? 0 : WEIGHTS[sig.kind] * Math.pow(0.5, age / HALF_LIFE_MS);
  const base = { sig, sigKey: `${sig.kind}|${targetKey(sig)}`, c };
  const t = sig.target;
  const canon = (id: string): string => index.canonicalScholarId.get(id) ?? id;

  if (t.type === 'lecture') {
    const archiveId = t.archiveId ?? (isEpisodeId(t.id) ? archiveIdOfEpisode(t.id) : undefined);
    const l = index.byLectureId.get(t.id) ?? (archiveId ? index.byArchiveId.get(archiveId) : undefined);
    if (l) {
      return {
        ...base,
        topics: topicsForTitle(l.title, l.category),
        scholarId: l.scholarId ? canon(l.scholarId) : undefined,
        excludeKey: lectureKey(l),
      };
    }
    // Not in the catalogue: keywords on the title, no scholar.
    return { ...base, topics: topicsForTitle(t.title ?? sig.label), excludeKey: `lecture:${archiveId ?? t.id}` };
  }
  if (t.type === 'scholar') {
    const id = canon(t.id);
    return {
      ...base,
      topics: topicsOfScholar(index.lecturesByScholar.get(id) ?? []),
      scholarId: id,
      excludeKey: `scholar:${id}`,
    };
  }
  if (t.type === 'book') {
    const title = index.bookById.get(t.id)?.title ?? t.title ?? sig.label;
    return { ...base, topics: topicsForTitle(title), excludeKey: `book:${t.id}` };
  }
  return { ...base, topics: ['tafsir'] };
}

// ---------------------------------------------------------------------------
// Scoring (design §4.5)
// ---------------------------------------------------------------------------

type Affinity = ReadonlyMap<string, number>;

/** Best topic by affinity; `value` is 0 (never -Infinity) for no topics. */
function bestTopic(topics: readonly TopicId[], aff: Affinity): { topic?: TopicId; value: number } {
  let topic: TopicId | undefined;
  let value = 0;
  for (const t of topics) {
    const v = aff.get(t) ?? 0;
    if (v > value) {
      value = v;
      topic = t;
    }
  }
  return { topic, value };
}

interface Cand {
  key: string;
  kind: Recommendation['kind'];
  entityId: string;
  title: string;
  meta: string;
  score: number;
  topics: readonly TopicId[];
  primary?: TopicId;
  scholarId?: string;
  lecture?: Lecture;
}

const byOrder = (a: Cand, b: Cand): number =>
  b.score - a.score || REC_KIND_RANK[a.kind] - REC_KIND_RANK[b.kind] || cmp(a.key, b.key);

// Whitespace runs (tabs, newlines, doubles) collapse to one space before the
// label is measured, so a raw title cannot put a TAB into the reason.
const cut = (raw: string): string => {
  const label = raw.replace(/\s+/g, ' ').trim();
  return label.length > REASON_LABEL_MAX ? `${label.slice(0, REASON_LABEL_MAX).trimEnd()}…` : label;
};

function reasonFor(c: Cand, live: readonly Resolved[]): string {
  if (c.kind === 'scholar') {
    const topic = c.primary ?? c.topics[0];
    return RECOMMENDATION_COPY.reasonScholar(topic ? RECOMMENDATION_TOPICS[topic].label : '');
  }
  // What a signal contributed to this candidate: full weight through its
  // primary topic, half weight through the same scholar (design §4.5, §4.7).
  const share = (r: Resolved): number =>
    c.primary && r.topics.includes(c.primary)
      ? r.c
      : c.scholarId && r.scholarId === c.scholarId
        ? SCHOLAR_TERM * r.c
        : 0;
  const top = live
    .map((r) => ({ r, v: round6(share(r)) }))
    .filter((x) => x.v > 0)
    .sort(
      (a, b) => b.v - a.v || KIND_RANK[a.r.sig.kind] - KIND_RANK[b.r.sig.kind] || cmp(a.r.sigKey, b.r.sigKey),
    )[0]?.r;
  if (!top) return RECOMMENDATION_COPY.reasonMushafFallback;
  const label = cut(top.sig.label);
  switch (top.sig.kind) {
    case 'saved':
      return top.sig.target.type === 'scholar' && c.kind === 'lecture' && c.scholarId === top.scholarId
        ? RECOMMENDATION_COPY.reasonFollowedScholar(label)
        : RECOMMENDATION_COPY.reasonSaved(label);
    case 'note':
      return RECOMMENDATION_COPY.reasonNote(label);
    case 'completed':
    case 'listened':
      return RECOMMENDATION_COPY.reasonListened(label);
    case 'read':
      return RECOMMENDATION_COPY.reasonRead(label.replace(/^سورة\s+/, ''));
  }
}

// ---------------------------------------------------------------------------
// recommend (design §4.6, §4.7, §6.4)
// ---------------------------------------------------------------------------

export function recommend(
  signals: readonly Signal[],
  index: CatalogueIndex,
  nowMs: number,
  dismissed: ReadonlySet<string>,
  limit: number,
  contextSurah?: number,
): Recommendation[] {
  const n = Math.floor(limit);
  if (!(n > 0)) return [];

  // One signal per (kind, target), newest wins; sorted so sums are order-free.
  const newest = new Map<string, Signal>();
  for (const s of signals) {
    const k = `${s.kind}|${targetKey(s)}`;
    const prev = newest.get(k);
    if (!prev || s.atMs > prev.atMs || (s.atMs === prev.atMs && cmp(s.label, prev.label) < 0)) newest.set(k, s);
  }
  const resolved = [...newest.values()]
    .map((s) => resolve(s, index, nowMs))
    .sort((a, b) => cmp(a.sigKey, b.sigKey));

  // Even an expired signal's target is excluded: a save older than 120 days is
  // still saved.
  const excluded = new Set<string>(dismissed);
  for (const r of resolved) if (r.excludeKey) excluded.add(r.excludeKey);
  const live = resolved.filter((r) => r.c > 0);

  const topicSum = new Map<string, number>();
  const scholarSum = new Map<string, number>();
  for (const r of live) {
    for (const t of r.topics) topicSum.set(t, (topicSum.get(t) ?? 0) + r.c);
    if (r.scholarId) scholarSum.set(r.scholarId, (scholarSum.get(r.scholarId) ?? 0) + r.c);
  }
  const topicAff = new Map([...topicSum].map(([t, v]) => [t, Math.min(TOPIC_CAP, v)]));
  const scholarAff = new Map([...scholarSum].map(([s, v]) => [s, Math.min(SCHOLAR_CAP, v)]));

  const lectures: Cand[] = [];
  for (const lc of index.lectureCandidates) {
    if (excluded.has(lc.key)) continue;
    const best = bestTopic(lc.topics, topicAff);
    const term = lc.scholarId ? SCHOLAR_TERM * (scholarAff.get(lc.scholarId) ?? 0) : 0;
    lectures.push({
      key: lc.key,
      kind: 'lecture',
      entityId: lc.lecture.id,
      title: lc.lecture.title,
      meta: [lc.lecture.scholar, lc.lecture.duration].filter(Boolean).join(' · '),
      score: round6(best.value + term),
      topics: lc.topics,
      primary: best.topic,
      scholarId: lc.scholarId,
      lecture: lc.lecture,
    });
  }
  const books: Cand[] = [];
  for (const bc of index.bookCandidates) {
    if (excluded.has(bc.key)) continue;
    const best = bestTopic(bc.topics, topicAff);
    books.push({
      key: bc.key,
      kind: 'book',
      entityId: bc.book.id,
      title: bc.book.title,
      meta: RECOMMENDATION_COPY.metaBook,
      score: round6(best.value),
      topics: bc.topics,
      primary: best.topic,
    });
  }

  const finish = (c: Cand, reason: string): Recommendation => {
    const base = { key: c.key, entityId: c.entityId, title: c.title, meta: c.meta, reason, score: c.score };
    if (c.kind === 'lecture') {
      return { ...base, kind: 'lecture', lecture: c.lecture as Lecture, ...(c.scholarId ? { scholarId: c.scholarId } : {}) };
    }
    return c.kind === 'scholar'
      ? { ...base, kind: 'scholar', scholarId: c.scholarId as string }
      : { ...base, kind: 'book' };
  };

  // Mushaf end block: tafsir lecture series and books only, one pick that
  // rotates with the surah number (design §6.4).
  if (contextSurah !== undefined) {
    const pool = [...lectures, ...books].filter((c) => c.topics.includes('tafsir')).sort((a, b) => cmp(a.key, b.key));
    const top = pool.filter((c) => c.score >= MIN_SCORE).sort(byOrder).slice(0, CONTEXT_TOP_K);
    if (top.length > 0) {
      const pick = top[contextSurah % top.length];
      return [finish(pick, reasonFor(pick, live))];
    }
    if (pool.length === 0) return [];
    return [finish(pool[contextSurah % pool.length], RECOMMENDATION_COPY.reasonMushafFallback)];
  }

  const scholars: Cand[] = [];
  for (const sc of index.scholarCandidates) {
    if (excluded.has(sc.key) || (scholarAff.get(sc.scholar.id) ?? 0) > 0) continue;
    const best = bestTopic(sc.topics, topicAff);
    scholars.push({
      key: sc.key,
      kind: 'scholar',
      entityId: sc.scholar.id,
      title: sc.scholar.name,
      meta: RECOMMENDATION_COPY.metaScholar,
      score: round6(SCHOLAR_CANDIDATE_TERM * best.value),
      topics: sc.topics,
      primary: best.topic,
      scholarId: sc.scholar.id,
    });
  }

  const ranked = [...lectures, ...books, ...scholars].filter((c) => c.score >= MIN_SCORE).sort(byOrder);

  // Diversity: at most ceil(n/3) per scholar, per primary topic and of kind
  // scholar. A scholar item counts toward its scholar but not toward a topic.
  const cap = Math.ceil(n / 3);
  const counts = (items: readonly Cand[]) => {
    const perScholar = new Map<string, number>();
    const perTopic = new Map<string, number>();
    let scholarKind = 0;
    for (const c of items) {
      if (c.scholarId) perScholar.set(c.scholarId, (perScholar.get(c.scholarId) ?? 0) + 1);
      if (c.kind === 'scholar') scholarKind++;
      else if (c.primary) perTopic.set(c.primary, (perTopic.get(c.primary) ?? 0) + 1);
    }
    return { perScholar, perTopic, scholarKind };
  };
  const fits = (c: Cand, k: ReturnType<typeof counts>): boolean =>
    (!c.scholarId || (k.perScholar.get(c.scholarId) ?? 0) < cap) &&
    (c.kind === 'scholar' ? k.scholarKind < cap : !c.primary || (k.perTopic.get(c.primary) ?? 0) < cap);

  let picked: Cand[] = [];
  for (const c of ranked) {
    if (picked.length >= n) break;
    if (fits(c, counts(picked))) picked.push(c);
  }

  // Reserved scholar slot (S10): the best qualifying scholar is placed by
  // replacing the lowest-ranked pick that blocks it (that scholar's lowest
  // lecture when the scholar is at its cap, otherwise the lowest pick). If no
  // swap makes it fit, it is left out rather than break a cap.
  if (n >= 3 && !picked.some((c) => c.kind === 'scholar')) {
    const best = ranked.find((c) => c.kind === 'scholar');
    if (best) {
      let rest = picked;
      if ((counts(picked).perScholar.get(best.scholarId as string) ?? 0) >= cap) {
        const blocker = [...picked].reverse().find((c) => c.scholarId === best.scholarId);
        rest = picked.filter((c) => c !== blocker);
      } else if (picked.length >= n) {
        rest = picked.slice(0, -1);
      }
      if (fits(best, counts(rest))) picked = [...rest, best];
    }
  }

  return picked.sort(byOrder).map((c) => finish(c, reasonFor(c, live)));
}
