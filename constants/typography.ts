/**
 * The type scale, keyed by role.
 *
 * Figma `docs/KHAZAYIN.fig` uses exactly two Arabic faces across 1,153 text
 * nodes, and only ever in one style each: **TheSansArabic Bold** for anything
 * that labels or titles, and **TheMixArab Regular** for anything that reads as
 * prose. It splits between them almost evenly (481 / 484).
 *
 * The app had drifted a long way from that. It named `TheSansArabic` 157 times
 * against `TheMixArab` 8, so body copy was being set in the display face; 121
 * of those 157 were not bold and 5 of the 8 TheMixArab uses were, inverting
 * the rule in both directions; and 113 of 305 `fontSize` declarations used a
 * value the design file never states.
 *
 * The fix is to stop assembling type at the call site. A caller picks a role —
 * `sectionTitle`, `body` — and gets family, weight, size and line height
 * together, so the pairing cannot drift again.
 *
 * ## Two things this scale deliberately does not do
 *
 * **It does not resolve the licensed-font gap.** `TheSansArabic` and
 * `TheMixArab` both still resolve to `NotoSansArabic-VF.ttf` through
 * `FONT_SUBSTITUTIONS`, so the display/body contrast the design is built on is
 * still not visible. `typographyParityResolved()` reports that. When the
 * licensed files arrive, nothing here changes — only `constants/fonts.ts`.
 *
 * **It does not set the design's smallest sizes.** The Prophet hero's body is
 * 9pt in Figma, the queen card's 8pt, and the `المزيد` pill's label 6pt,
 * because in the design those are pictures of text rather than text. Rendering
 * them at their stated size would be illegible on a real device, so body roles
 * floor at `MIN_BODY_SIZE`. Any role that had to be raised says so.
 */

/**
 * Smallest size we will set live Arabic text at. Below roughly this, Arabic
 * diacritics stop resolving on a phone screen. Apple's own guidance floors
 * body text at 11pt.
 */
export const MIN_BODY_SIZE = 12;

/** The display and UI face. The design only ever pairs it with Bold. */
export const DISPLAY_FAMILY = 'TheSansArabic';

/** The prose face. The design only ever pairs it with Regular. */
export const BODY_FAMILY = 'TheMixArab';

/**
 * The calligraphic face.
 *
 * The design sets book titles, scholar names and Quran text as artwork, so it
 * declares no font for them at all. The app's titles are data, so it has to
 * choose one, and a Naskh face is the honest stand-in for calligraphy — a
 * modern sans there would misrepresent the design more than Amiri does.
 * Reach for this only where the design shows an image, never where it shows
 * text.
 */
export const CALLIGRAPHY_FAMILY = 'Amiri-Bold';

export type TextRole =
  // TheSansArabic Bold — labels and titles.
  | 'displayLarge'
  | 'display'
  | 'screenTitle'
  | 'heroTitle'
  | 'sectionTitle'
  | 'cardTitle'
  | 'label'
  | 'labelSmall'
  // TheMixArab Regular — prose.
  | 'bodyTitle'
  | 'bodyLarge'
  | 'body'
  | 'bodyCompact'
  | 'caption'
  // Amiri — standing in for the design's calligraphy.
  | 'calligraphyTitle'
  | 'calligraphyBody';

export type RoleTextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '700';
  lineHeight: number;
};

/**
 * The smallest line height, as a multiple of the size, that does not clip
 * Arabic.
 *
 * React Native clips a Text's glyph box to `lineHeight`, and Arabic hangs its
 * marks — the madda on آ, the dots on ة — far above the Latin cap height the
 * design's line heights were authored against. Setting the file's own numbers
 * therefore cut the marks off: at 12/16, `٠ ملاحظة نشطة القرآن آخر` rendered on
 * device as `٠ ملاحظه نشطه القران اخر`.
 *
 * Measured on an iPhone 16 simulator, one role at a time: 12/16 and 14/20 clip,
 * 12/18 and 14/21 do not; 16/24 is clean and 20/28 is not. The boundary is a
 * ratio rather than a size, and it sits here.
 *
 * This raises leading above what Figma states for six of the fourteen roles.
 * That is the honest port: the design's line heights come from a browser, where
 * `line-height` positions a line without cropping the glyphs inside it.
 */
export const MIN_LINE_HEIGHT_RATIO = 1.5;

/** The design's line height for a size, floored so Arabic marks survive. */
const leading = (fontSize: number, stated: number) =>
  Math.max(stated, Math.ceil(fontSize * MIN_LINE_HEIGHT_RATIO));

/**
 * Every size below appears in the Figma file, and every line height is either
 * stated there or derived from the ratio it states for that size — then floored
 * by `leading` so the marks are not cropped.
 */
export const TEXT_ROLES: Readonly<Record<TextRole, RoleTextStyle>> = Object.freeze({
  displayLarge: { fontFamily: DISPLAY_FAMILY, fontSize: 32, fontWeight: '700', lineHeight: leading(32, 42) },
  display: { fontFamily: DISPLAY_FAMILY, fontSize: 28, fontWeight: '700', lineHeight: leading(28, 38) },
  screenTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 24, fontWeight: '700', lineHeight: leading(24, 32) },
  /** The Quran hero's `القرآن حــياة`, the one place the design sets 20. */
  heroTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 20, fontWeight: '700', lineHeight: leading(20, 28) },
  /** Home's `العلماء والمشايخ` / `الكتب العلمية` row headings. */
  sectionTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 16, fontWeight: '700', lineHeight: leading(16, 24) },
  cardTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 14, fontWeight: '700', lineHeight: leading(14, 20) },
  /** Nav labels, quick chips, `عرض الكل`. */
  label: { fontFamily: DISPLAY_FAMILY, fontSize: 12, fontWeight: '700', lineHeight: leading(12, 16) },
  labelSmall: { fontFamily: DISPLAY_FAMILY, fontSize: 10, fontWeight: '700', lineHeight: leading(10, 14) },

  /**
   * The contact form's own heading — node 2106:2598 `DIV-126`, the one place
   * the file sets the body face at 20. Every other title on a More screen is
   * 18 (the page title) or 14 (a card's).
   */
  bodyTitle: { fontFamily: BODY_FAMILY, fontSize: 20, fontWeight: '400', lineHeight: leading(20, 21) },
  bodyLarge: { fontFamily: BODY_FAMILY, fontSize: 18, fontWeight: '400', lineHeight: leading(18, 28) },
  body: { fontFamily: BODY_FAMILY, fontSize: 16, fontWeight: '400', lineHeight: leading(16, 24) },
  bodyCompact: { fontFamily: BODY_FAMILY, fontSize: 14, fontWeight: '400', lineHeight: leading(14, 20) },
  /**
   * The design's smallest prose. Figma states 9pt for the Prophet hero and
   * 8pt for the queen card; both are raised to `MIN_BODY_SIZE` because at
   * their stated size they are artwork, not readable text.
   */
  caption: {
    fontFamily: BODY_FAMILY,
    fontSize: MIN_BODY_SIZE,
    fontWeight: '400',
    lineHeight: leading(MIN_BODY_SIZE, 18),
  },

  calligraphyTitle: { fontFamily: CALLIGRAPHY_FAMILY, fontSize: 16, fontWeight: '700', lineHeight: leading(16, 18.5) },
  calligraphyBody: { fontFamily: CALLIGRAPHY_FAMILY, fontSize: 14, fontWeight: '700', lineHeight: leading(14, 20) },
});

/** RTL text direction, spread by every role. There is no LTR copy in this app. */
const RTL = { writingDirection: 'rtl', textAlign: 'right' } as const;

/**
 * The style for a role, with RTL direction applied.
 *
 * `overrides` is for the properties a role does not own — colour, alignment,
 * margins. It deliberately cannot change family, size or weight: that pairing
 * is the whole point of the scale, and letting a call site pick it apart is
 * how the app drifted the first time.
 */
export function textStyle(
  role: TextRole,
  overrides?: { color?: string; textAlign?: 'right' | 'center' | 'left' },
) {
  return { ...RTL, ...TEXT_ROLES[role], ...overrides };
}
