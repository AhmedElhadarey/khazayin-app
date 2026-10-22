/**
 * Recommendation engine fixture, built from the real `data/content/*` rows so
 * ids and archive ids are the ones the app ships.
 */
import { SCHOLARS, LECTURES_BY_SCHOLAR } from '@/data/content/scholars';
import {
  BOOK_LECTURES,
  PROPHET_LECTURES,
  QUEEN_LECTURES,
  RADIO_PROGRAMS,
} from '@/data/content/lectures';
import { BOOKS } from '@/data/content/books';
import type { CatalogueSnapshot } from '@/services/recommendations/types';

export const catalogue: CatalogueSnapshot = {
  scholars: SCHOLARS,
  lectures: [
    ...Object.values(LECTURES_BY_SCHOLAR).flat(),
    ...PROPHET_LECTURES,
    ...BOOK_LECTURES,
    ...QUEEN_LECTURES,
    ...RADIO_PROGRAMS,
  ],
  books: BOOKS,
};
