/**
 * The palette measured off the `Mobile` page of `KHAZAYIN.fig` during the
 * 2026-09-09 audit, quoted in design specification section 5.4.
 *
 * `constants/theme.ts` remains the palette components import; these are the
 * locked reference values it is checked against, so a drifting hex fails
 * `__tests__/designTokens.test.ts` instead of shipping across several screens
 * before anyone notices.
 */
export const FIGMA_TOKENS = Object.freeze({
  navigationNavy: '#184B76',
  pageBackground: '#F8F2ED',
  cardFill: '#FCFAF8',
  /**
   * Warm and nearly invisible. The previous '#D9D6D3' read as a grey outline,
   * which Android's elevation then doubled into the separator the audit found.
   */
  cardBorder: 'rgba(141, 107, 52, 0.10)',
  inkTitle: '#281E13',
  goldBar: '#C1A584',
  goldAccent: '#A88051',
  activeTabFill: 'rgba(215, 185, 149, 0.16)',
  activeTabIndicator: '#C1A584',

  /**
   * Ornament strength per coverage. The Figma frames use a faint corner motif;
   * the app was tiling a full-screen ornament at full strength on seven
   * routes, which is the single most visible difference in the More section.
   */
  ornamentOpacity: Object.freeze({
    corner: 0.05,
    header: 0.06,
    full: 0.08,
  }),
} as const);

/**
 * How much of a screen an ornament covers.
 *
 *  - `corner` — a soft motif in the top corner only. The Figma default.
 *  - `header` — a band behind a page header.
 *  - `full`   — the whole frame. Only where a Figma frame actually shows it.
 */
export const PATTERN_COVERAGES = Object.freeze(['corner', 'header', 'full'] as const);

export type PatternCoverage = (typeof PATTERN_COVERAGES)[number];
