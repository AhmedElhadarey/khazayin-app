import { JUZ_PAGE_RANGES } from '@/constants/progress';

/**
 * @param pagesEverRead distinct page numbers (1..604) the user has read at
 *                      least once. Returns the count of juz whose ENTIRE
 *                      page range is covered.
 */
export function countCompletedJuz(pagesEverRead: readonly number[]): number {
  if (pagesEverRead.length === 0) return 0;
  const set = new Set(pagesEverRead);
  let count = 0;
  for (const { startPage, endPage } of JUZ_PAGE_RANGES) {
    let complete = true;
    for (let p = startPage; p <= endPage; p += 1) {
      if (!set.has(p)) {
        complete = false;
        break;
      }
    }
    if (complete) count += 1;
  }
  return count;
}

/** Which juz numbers are completed. Used by achievement evaluator. */
export function completedJuzList(pagesEverRead: readonly number[]): number[] {
  if (pagesEverRead.length === 0) return [];
  const set = new Set(pagesEverRead);
  const out: number[] = [];
  for (const { juz, startPage, endPage } of JUZ_PAGE_RANGES) {
    let complete = true;
    for (let p = startPage; p <= endPage; p += 1) {
      if (!set.has(p)) {
        complete = false;
        break;
      }
    }
    if (complete) out.push(juz);
  }
  return out;
}
