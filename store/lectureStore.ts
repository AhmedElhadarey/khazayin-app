/**
 * store/lectureStore.ts
 * ---------------------
 * Four Zustand stores for lecture categories (one per category, per board directive).
 * Backed by contentService.lectures.listByCategory(*).
 *
 * Exports:
 *   useProphetLecturesStore  — category 'prophet'
 *   useBookLecturesStore     — category 'book'
 *   useQueenLecturesStore    — category 'queen'
 *   useRadioProgramsStore    — category 'radio'
 *
 * Board note: T2.3 ships as 4 separate stores (not a parameterised hook) because
 * the user-facing call-site is static-per-screen — 4 named stores read cleaner
 * than useLectureStore('prophet').
 *
 * Track: khazain-content-service_20260506  Phase 2 / T2.3
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Lecture } from '../types/content';

// ---------------------------------------------------------------------------
// useProphetLecturesStore
// ---------------------------------------------------------------------------

export const useProphetLecturesStore = createAsyncStore<Lecture[]>({
  name: 'prophet-lectures',
  initialData: [],
  fetcher: () => contentService.lectures.listByCategory('prophet'),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useBookLecturesStore
// ---------------------------------------------------------------------------

export const useBookLecturesStore = createAsyncStore<Lecture[]>({
  name: 'book-lectures',
  initialData: [],
  fetcher: () => contentService.lectures.listByCategory('book'),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useQueenLecturesStore
// ---------------------------------------------------------------------------

export const useQueenLecturesStore = createAsyncStore<Lecture[]>({
  name: 'queen-lectures',
  initialData: [],
  fetcher: () => contentService.lectures.listByCategory('queen'),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useRadioProgramsStore
// ---------------------------------------------------------------------------

export const useRadioProgramsStore = createAsyncStore<Lecture[]>({
  name: 'radio-programs',
  initialData: [],
  fetcher: () => contentService.lectures.listByCategory('radio'),
  isEmpty: (data) => data.length === 0,
});
