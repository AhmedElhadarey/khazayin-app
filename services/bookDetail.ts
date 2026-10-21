/**
 * What the book detail screen shows for a Book id (search results only).
 * The Book → sharh link is by normalised title until the backend supplies an
 * explicit one; replace it here only. Book ids (bk*) and book-lecture ids (b*)
 * are separate identities — see design R7.
 */
import { normalize } from '@/services/search/normalize';
import type { Book, Lecture } from '@/types/content';

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
