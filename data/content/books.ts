/**
 * data/content/books.ts
 * ---------------------
 * Mock data for the Book domain.
 *
 * IMPORTANT — C2 COMPLIANCE:
 *   This file does NOT import data/mockData.ts. The 4 filler titles below
 *   were copied verbatim from MOCK_BOOKS in data/mockData.ts by reading the
 *   source array; the import itself is absent so legacy isolation is preserved.
 *
 * Sources:
 *   - 3 titles from app/(tabs)/index.tsx BOOKS array (lines 37-40),
 *     converted to { id, title } shape.
 *   - 4 filler titles copied from MOCK_BOOKS in data/mockData.ts
 *     (without importing that file).
 *
 * Track: khazain-content-service_20260506  Phase 1 / T1.6
 */

import type { Book } from '../../types/content';

// ---------------------------------------------------------------------------
// BOOKS
// ---------------------------------------------------------------------------

export const BOOKS: Book[] = [
  // ── From app/(tabs)/index.tsx BOOKS ──
  { id: 'bk1', title: 'إضاءات على طريق العباد' },
  { id: 'bk2', title: 'شرح رياض الصالحين' },
  { id: 'bk3', title: 'تفسير آيات الأحكام' },
  // ── Filler copied verbatim from data/mockData.ts MOCK_BOOKS ──
  { id: 'bk4', title: 'إضاءات في العقيدة' },
  { id: 'bk5', title: 'شرح كتاب التوحيد' },
  { id: 'bk6', title: 'فقه العبادات' },
  { id: 'bk7', title: 'أصول التفسير' },
];
