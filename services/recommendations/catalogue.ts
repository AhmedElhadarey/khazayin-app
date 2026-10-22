/**
 * Pure helpers for the guarded catalogue loader (design §7.4). The IO lives in
 * store/recommendationInputsStore.ts; nothing here imports a store, the db or
 * contentService.
 */
import type { Book, Lecture, Scholar } from '@/types/content';
import type { CatalogueSnapshot } from './types';

/** N1: a fresh install still loads when the Mushaf supplies a surah. */
export const shouldLoadCatalogue = (signalCount: number, contextSurah?: number | null): boolean =>
  signalCount > 0 || contextSurah != null;

export interface CatalogueParts {
  scholars: readonly Scholar[];
  /** Per-scholar series, keyed by the scholar they were fetched for. */
  scholarLectures: ReadonlyMap<string, readonly Lecture[]>;
  /** Page 1 of each paginated lecture store. */
  pagedLectures: readonly (readonly Lecture[])[];
  books: readonly Book[];
}

/**
 * Whatever loaded, as the engine's snapshot. A scholar's series without its
 * own `scholarId` gets the id it was fetched under. Lectures are de-duplicated
 * by id (first one wins).
 */
export function toCatalogueSnapshot(parts: CatalogueParts): CatalogueSnapshot {
  const seen = new Set<string>();
  const lectures: Lecture[] = [];
  const add = (l: Lecture) => {
    if (seen.has(l.id)) return;
    seen.add(l.id);
    lectures.push(l);
  };
  for (const [scholarId, list] of parts.scholarLectures) {
    for (const l of list) add(l.scholarId ? l : { ...l, scholarId });
  }
  for (const page of parts.pagedLectures) page.forEach(add);
  return { scholars: parts.scholars, lectures, books: parts.books };
}

/**
 * Runs `tasks` in batches of at most `size`, each batch settled with
 * `Promise.allSettled`. After every batch `isFatal()` is consulted; when it
 * returns true the remaining batches are skipped. Task errors never propagate:
 * a failed task simply contributes nothing.
 */
export async function runPool(
  tasks: readonly (() => Promise<unknown>)[],
  size: number,
  isFatal: () => boolean,
): Promise<{ aborted: boolean }> {
  for (let i = 0; i < tasks.length; i += size) {
    await Promise.allSettled(tasks.slice(i, i + size).map((run) => run()));
    if (isFatal()) return { aborted: true };
  }
  return { aborted: false };
}
