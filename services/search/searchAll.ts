/**
 * services/search/searchAll.ts
 * ----------------------------
 * Per-domain orchestrator. Pure function — no React, no I/O.
 *
 * Caps:
 *   surah:   8
 *   scholar: 8
 *   book:    8
 *   lecture: 12
 *
 * Order of returned groups: surahs → scholars → books → lectures.
 * Empty groups are omitted. Empty query returns [].
 *
 * Track: khazain-search_20260510  T3
 */

import { normalize } from './normalize';
import { match } from './match';
import type { Surah, Scholar, Book, Lecture } from '../../types/content';

const SURAH_CAP = 8;
const SCHOLAR_CAP = 8;
const BOOK_CAP = 8;
const LECTURE_CAP = 12;

export type SearchResultGroup =
  | { type: 'surah'; items: Surah[] }
  | { type: 'scholar'; items: Scholar[] }
  | { type: 'book'; items: Book[] }
  | { type: 'lecture'; items: Lecture[] };

export interface SearchAllInput {
  query: string;
  surahs: Surah[];
  scholars: Scholar[];
  books: Book[];
  lectures: Lecture[]; // pre-flattened from the 4 category stores
}

/**
 * Runs the search across all 4 domains and returns grouped results.
 *
 * @example
 *   searchAll({ query: 'البقرة', surahs, scholars, books, lectures })
 *   // → [{ type: 'surah', items: [Surah(2)] }]
 */
export function searchAll(input: SearchAllInput): SearchResultGroup[] {
  const needle = normalize(input.query);
  if (!needle) return [];

  const out: SearchResultGroup[] = [];

  // Surah — match name OR displayNumber OR String(number)
  const surahMatches: Surah[] = [];
  for (const s of input.surahs) {
    const name = normalize(s.name);
    const dn = normalize(s.displayNumber);
    const num = normalize(String(s.number));
    if (match(name, needle) || match(dn, needle) || match(num, needle)) {
      surahMatches.push(s);
      if (surahMatches.length >= SURAH_CAP) break;
    }
  }
  if (surahMatches.length > 0) out.push({ type: 'surah', items: surahMatches });

  // Scholar — match name
  const scholarMatches: Scholar[] = [];
  for (const sc of input.scholars) {
    const name = normalize(sc.name);
    if (match(name, needle)) {
      scholarMatches.push(sc);
      if (scholarMatches.length >= SCHOLAR_CAP) break;
    }
  }
  if (scholarMatches.length > 0) out.push({ type: 'scholar', items: scholarMatches });

  // Book — match title (no author field today)
  const bookMatches: Book[] = [];
  for (const b of input.books) {
    const title = normalize(b.title);
    if (match(title, needle)) {
      bookMatches.push(b);
      if (bookMatches.length >= BOOK_CAP) break;
    }
  }
  if (bookMatches.length > 0) out.push({ type: 'book', items: bookMatches });

  // Lecture — match title OR scholar (denormalised name string)
  const lectureMatches: Lecture[] = [];
  for (const l of input.lectures) {
    const title = normalize(l.title);
    const scholar = normalize(l.scholar);
    if (match(title, needle) || match(scholar, needle)) {
      lectureMatches.push(l);
      if (lectureMatches.length >= LECTURE_CAP) break;
    }
  }
  if (lectureMatches.length > 0) out.push({ type: 'lecture', items: lectureMatches });

  return out;
}
