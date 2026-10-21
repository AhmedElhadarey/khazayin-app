/**
 * Top-to-bottom order of the book detail screen. No Figma frame covers it —
 * governed by constants/layout.ts + constants/typography.ts.
 */
export const BOOK_DETAIL_SECTIONS = Object.freeze(['cover', 'meta', 'primaryAction', 'notes'] as const);
export type BookDetailSection = (typeof BOOK_DETAIL_SECTIONS)[number];
