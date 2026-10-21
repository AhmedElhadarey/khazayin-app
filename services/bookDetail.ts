/**
 * What the book detail screen shows for a Book id (search results only).
 * The Book → sharh link is by normalised title until the backend supplies an
 * explicit one; replace it here only. Book ids (bk*) and book-lecture ids (b*)
 * are separate identities — see design R7.
 */
import { isCorpusLoading } from '@/services/loadState';
import { normalize } from '@/services/search/normalize';
import type { Book, Lecture, LoadState } from '@/types/content';

export interface BookDetail {
  id: string;
  title: string;
  author?: string;
  lecture?: Lecture;
}

export function bookDetailHref(id: string): string {
  return `/sections/book/${id}`;
}

export function resolveBookDetail(id: string, books: Book[], bookLectures: Lecture[]): BookDetail | null {
  const book = books.find((b) => b.id === id);
  if (!book) return null;
  const key = normalize(book.title);
  const lecture = bookLectures.find((l) => normalize(l.title) === key);
  return { id: book.id, title: book.title, author: lecture?.scholar, lecture };
}

export type BookDetailBody = 'book' | 'loading' | 'error' | 'missing';

/**
 * What the screen shows in place of the book. A resolved book always shows,
 * even if a later refresh failed (stores keep data on error). Without one:
 * a retry when the books failed, a placeholder while they load, and
 * "unavailable" only once they settled without this id.
 */
export function bookDetailBody(i: { found: boolean; booksStatus: LoadState }): BookDetailBody {
  if (i.found) return 'book';
  if (i.booksStatus === 'error') return 'error';
  if (isCorpusLoading([i.booksStatus])) return 'loading';
  return 'missing';
}

export type BookPrimaryAction = 'play' | 'loading' | 'none';

/** The listen button, a placeholder while the sharh list loads, or the no-audio caption. */
export function bookPrimaryAction(i: { hasLecture: boolean; lecturesStatus: LoadState }): BookPrimaryAction {
  if (i.hasLecture) return 'play';
  if (isCorpusLoading([i.lecturesStatus])) return 'loading';
  return 'none';
}
