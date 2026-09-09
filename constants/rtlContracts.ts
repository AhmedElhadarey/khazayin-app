/**
 * Physical child order for the shared primitives, in visual LEFT → RIGHT order.
 *
 * These arrays are the single source of truth: each primitive builds a slot
 * map and renders `ORDER.map(...)`, so reordering an array here reorders the
 * UI. That is what makes the order testable without a renderer, and what stops
 * a future edit from reversing a row by rearranging JSX.
 *
 * Every consumer must place the mapped slots inside a `PHYSICAL_ROW` container
 * (see `constants/layout.ts`) so React Native cannot flip the authored order
 * under `forceRTL`.
 *
 * Orders are quoted from `docs/plans/2026-09-09-figma-style-remediation-design.md`
 * section 5.1 and measured against the numbered frames in
 * `docs/audit/2026-09-09/figma-reference`.
 */

/** Section/root list card — node 2031:5675. */
export const LIST_ROW_ORDER = Object.freeze(['disclosure', 'text', 'iconBadge'] as const);
export type ListRowSlot = (typeof LIST_ROW_ORDER)[number];

/** Lecture-style card — nodes 2465:1911, 2589:1772, 2597:2552, 2606:3830. */
export const LECTURE_CARD_ORDER = Object.freeze(['meta', 'text', 'badge'] as const);
export type LectureCardSlot = (typeof LECTURE_CARD_ORDER)[number];

/** Reciter and Qiraa row — nodes 2031:6193, 2457:954. */
export const RECITER_ROW_ORDER = Object.freeze(['disclosure', 'text', 'quranBadge'] as const);
export type ReciterRowSlot = (typeof RECITER_ROW_ORDER)[number];

/** Inline page header — title sits at the physical right, chevron beyond it. */
export const INLINE_HEADER_ORDER = Object.freeze(['title', 'back'] as const);
export type InlineHeaderSlot = (typeof INLINE_HEADER_ORDER)[number];

/** Search control — magnifier at the physical left, Arabic placeholder right. */
export const SEARCH_PILL_ORDER = Object.freeze(['icon', 'field', 'clear'] as const);
export type SearchPillSlot = (typeof SEARCH_PILL_ORDER)[number];

/** Mushaf reader footer — node 2349:982. */
export const MUSHAF_FOOTER_ORDER = Object.freeze([
  'index',
  'goToBookmark',
  'saveBookmark',
] as const);
export type MushafFooterSlot = (typeof MUSHAF_FOOTER_ORDER)[number];

/** The alphabet rail is pinned to the physical right edge on every screen. */
export const LETTER_INDEX_EDGE = 'right';

/**
 * Back affordances point right: in RTL, "back" is the direction the previous
 * screen came from. Unified across InlineHeader and DetailHeader.
 */
export const BACK_CHEVRON_DIRECTION = 'right';

/**
 * Arabic accessibility label for a section/list row. Kept as a pure function
 * so the label contract is asserted without rendering.
 */
export function listRowAccessibilityLabel(parts: {
  title: string;
  subtitle?: string;
  count?: string | null;
}): string {
  return [parts.title, parts.subtitle, parts.count].filter(Boolean).join('، ');
}

/** Arabic accessibility label for a back affordance that also names its screen. */
export function backAccessibilityLabel(title: string): string {
  return `رجوع، ${title}`;
}
