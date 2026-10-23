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

/**
 * Community group row (design §8.5). No Figma frame, contract-only: the
 * disclosure at the physical left, the name and member count, then the
 * progress or glyph badge at the physical right.
 */
export const GROUP_ROW_ORDER = Object.freeze(['disclosure', 'text', 'progress'] as const);
export type GroupRowSlot = (typeof GROUP_ROW_ORDER)[number];

/**
 * Discussion post (design §8.5): the row's actions at the physical left, the
 * text block, then the author's avatar at the right edge. Contract-only.
 */
export const COMMUNITY_POST_ORDER = Object.freeze(['actions', 'text', 'avatar'] as const);
export type CommunityPostSlot = (typeof COMMUNITY_POST_ORDER)[number];

/** Discussion composer: the send button at the physical left, the field at the right edge. */
export const COMPOSER_ORDER = Object.freeze(['send', 'field'] as const);
export type ComposerSlot = (typeof COMPOSER_ORDER)[number];

/** Lecture-style card — nodes 2465:1911, 2589:1772, 2597:2552, 2606:3830. */
export const LECTURE_CARD_ORDER = Object.freeze(['meta', 'text', 'badge'] as const);
export type LectureCardSlot = (typeof LECTURE_CARD_ORDER)[number];

/**
 * Home recommendation row — contract-only, no Figma frame (design §6.3).
 * `dismiss` is a sibling of the card, not inside it, so screen readers reach
 * it as its own button after the card's texts.
 */
export const RECOMMENDATION_ROW_ORDER = Object.freeze(['dismiss', 'card'] as const);
export type RecommendationRowSlot = (typeof RECOMMENDATION_ROW_ORDER)[number];

/** Reciter and Qiraa row — nodes 2031:6193, 2457:954. */
export const RECITER_ROW_ORDER = Object.freeze(['disclosure', 'text', 'quranBadge'] as const);
export type ReciterRowSlot = (typeof RECITER_ROW_ORDER)[number];

/**
 * Onboarding selectable row (qira'a / reciter). No Figma frame — contract-only.
 * `select` is the radio Pressable; inside it the order stays tick → text.
 * The optional preview control is a sibling so screen readers reach it.
 */
export const SELECTABLE_ROW_ORDER = Object.freeze(['preview', 'select'] as const);
export type SelectableRowSlot = (typeof SELECTABLE_ROW_ORDER)[number];

/** Inline page header — title sits at the physical right, chevron beyond it. */
export const INLINE_HEADER_ORDER = Object.freeze(['title', 'back'] as const);
export type InlineHeaderSlot = (typeof INLINE_HEADER_ORDER)[number];

/**
 * Search control — magnifier at the physical left, Arabic placeholder right,
 * and the clear affordance at the physical right (the RTL start edge). No
 * reference frame shows a filled search field, so the clear placement is this
 * app's choice rather than a Figma measurement; it is recorded here so the
 * component and its prop documentation cannot drift apart.
 */
export const SEARCH_PILL_ORDER = Object.freeze(['icon', 'field', 'clear'] as const);
export type SearchPillSlot = (typeof SEARCH_PILL_ORDER)[number];

/** Mushaf reader footer — node 2349:982. */
export const MUSHAF_FOOTER_ORDER = Object.freeze([
  'index',
  'goToBookmark',
  'saveBookmark',
] as const);
export type MushafFooterSlot = (typeof MUSHAF_FOOTER_ORDER)[number];

/**
 * Mushaf surah cartouche, physical left -> right. The page image
 * (docs/KHAZAYIN.fig images/02f06fab…) shows «آياتها ١٧٦» at the left and
 * «ترتيبها ٤» at the right.
 */
export const CARTOUCHE_PHYSICAL_ORDER = Object.freeze(['ayahs', 'name', 'order'] as const);
export type CartoucheSlot = (typeof CARTOUCHE_PHYSICAL_ORDER)[number];

/**
 * Mushaf reader meta strip (DIV-47, 2349:994), physical left -> right. The
 * frame's children run مكية, ٧ آيات, صفحة ١ من ٦٠٤ in reading order, so the
 * revelation type sits at the physical right.
 */
export const MUSHAF_META_PHYSICAL_ORDER = Object.freeze(['page', 'ayahs', 'revelation'] as const);
export type MushafMetaSlot = (typeof MUSHAF_META_PHYSICAL_ORDER)[number];

/**
 * The same strip in reading order — the reverse of the physical order, pinned
 * by `mushafPresentation.test.ts`. The strip is a `READING_GRID`, so its
 * children are authored in this order and a wrap moves the part read last.
 */
export const MUSHAF_META_READING_ORDER = Object.freeze(['revelation', 'ayahs', 'page'] as const);

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
