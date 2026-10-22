/**
 * Types for the pure recommendation engine (design §4.1, §4.4, §4.7).
 *
 * Plain data only. The adapters (signals.ts, catalogue.ts) translate store and
 * repo shapes into these, so the engine never sees React, Zustand, SQLite or
 * contentService.
 */
import type { Book, Lecture, Scholar } from '@/types/content';
import type { TopicId } from '@/constants/recommendationTopics';

/** Where the catalogue load stands (design §7.4). */
export type CatalogueStatus = 'idle' | 'loading' | 'ready' | 'aborted';

export type SignalKind = 'saved' | 'note' | 'listened' | 'completed' | 'read';

export type SignalTarget =
  | { readonly type: 'lecture'; readonly id: string; readonly archiveId?: string; readonly title?: string }
  | { readonly type: 'scholar'; readonly id: string }
  | { readonly type: 'book'; readonly id: string; readonly title?: string }
  | { readonly type: 'surah'; readonly number: number };

export interface Signal {
  readonly kind: SignalKind;
  readonly target: SignalTarget;
  readonly atMs: number;
  /** Arabic text quoted in the reason line (never a note's title or body). */
  readonly label: string;
}

/** Everything the engine may recommend, as plain arrays (order irrelevant). */
/**
 * One page with the time it was last read. Mirrors `RecentPageRead` in
 * db/types.ts, redeclared so the engine stays free of db imports.
 */
export interface PageRead {
  readonly page: number;
  readonly atMs: number;
}

export interface CatalogueSnapshot {
  scholars: readonly Scholar[];
  /** Every known lecture/series, including each scholar's series. */
  lectures: readonly Lecture[];
  books: readonly Book[];
}

/** A lecture series that can be recommended, de-duplicated by key. */
export interface LectureCandidate {
  readonly key: string;
  readonly lecture: Lecture;
  readonly topics: readonly TopicId[];
  /** Canonical scholar id (same-name scholars are merged). */
  readonly scholarId?: string;
}

export interface BookCandidate {
  readonly key: string;
  readonly book: Book;
  readonly topics: readonly TopicId[];
}

export interface ScholarCandidate {
  readonly key: string;
  readonly scholar: Scholar;
  readonly topics: readonly TopicId[];
}

export interface CatalogueIndex {
  byLectureId: ReadonlyMap<string, Lecture>;
  byArchiveId: ReadonlyMap<string, Lecture>;
  bookById: ReadonlyMap<string, Book>;
  /** Keyed by canonical scholar id. */
  lecturesByScholar: ReadonlyMap<string, readonly Lecture[]>;
  scholarById: ReadonlyMap<string, Scholar>;
  /** Any scholar id to the canonical id of the scholar with the same name. */
  canonicalScholarId: ReadonlyMap<string, string>;
  /** Candidate pools, each sorted by key (design §4.6, S8). */
  lectureCandidates: readonly LectureCandidate[];
  bookCandidates: readonly BookCandidate[];
  scholarCandidates: readonly ScholarCandidate[];
}

interface RecommendationBase {
  /** Dismissal key: `lecture:${archiveId ?? id}` | `book:${id}` | `scholar:${id}`. */
  readonly key: string;
  readonly entityId: string;
  readonly title: string;
  readonly meta: string;
  readonly reason: string;
  readonly score: number;
}

export interface LectureRecommendation extends RecommendationBase {
  readonly kind: 'lecture';
  readonly lecture: Lecture;
  readonly scholarId?: string;
}

export interface BookRecommendation extends RecommendationBase {
  readonly kind: 'book';
  readonly lecture?: undefined;
  readonly scholarId?: undefined;
}

export interface ScholarRecommendation extends RecommendationBase {
  readonly kind: 'scholar';
  readonly lecture?: undefined;
  readonly scholarId: string;
}

/** Narrow on `kind`; `lecture` and `scholarId` are then typed without `!`. */
export type Recommendation = LectureRecommendation | BookRecommendation | ScholarRecommendation;

/**
 * Minimal structural inputs for services/recommendations/signals.ts. They
 * mirror SavedItem (types/content.ts), Note (store/notesStore.ts) and
 * LectureSession (db/types.ts), redeclared so the engine stays free of
 * store and db imports. The real shapes are assignable to these.
 */
export interface SavedInput {
  readonly type: string;
  readonly entityId: string;
  readonly savedAt: number;
  readonly snapshot: { readonly name?: string; readonly title?: string };
}

export interface NoteInput {
  readonly updatedAt: number;
  readonly ref?: { readonly type: string; readonly id: string; readonly label: string; readonly title?: string };
}

export interface SessionInput {
  readonly lectureId: string;
  readonly title: string;
  readonly durationSec: number;
  readonly forwardListenedSec: number;
  readonly completed: boolean;
  readonly lastListenedAt: number;
}

export interface ActivityInput {
  readonly sessions: readonly SessionInput[];
  readonly pageReads: readonly PageRead[];
  readonly failed: boolean;
}
