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
 * ## Weight lives in the face, not in `fontWeight`
 *
 * Every role sets `fontWeight: '400'`. A registered custom family is a single
 * static face: iOS ignores `fontWeight` for it, and Android maps a bold weight
 * to the empty BOLD slot and falls back to the system bold (a different
 * typeface). `TheSansArabic` is therefore the Bold file and `TheMixArab` the
 * Regular file (see `constants/fonts.ts`). NEVER pair a registered family with
 * a bold `fontWeight`, anywhere, including a parent `<Text>` whose nested
 * children inherit it; pick the weight-specific family with `fontFace()`.
 * `__tests__/fontWeightGuard.test.ts` enforces this.
 *
 * ## Two things this scale deliberately does not do
 *
 * **It does not resolve the licensed-font gap.** `TheSansArabic` and
 * `TheMixArab` still resolve to static Noto Sans Arabic faces through
 * `FONT_SUBSTITUTIONS` (Noto Sans Arabic Bold and Regular), so the faces differ
 * in weight but not in design. `typographyParityResolved()` reports that. When the
 * licensed files arrive, nothing here changes — only `constants/fonts.ts`.
 *
 * **It does not set the design's smallest sizes.** The Prophet hero's body is
 * 9pt in Figma, the queen card's 8pt, and the `المزيد` pill's label 6pt,
 * because in the design those are pictures of text rather than text. Rendering
 * them at their stated size would be illegible on a real device, so body roles
 * floor at `MIN_BODY_SIZE`. Any role that had to be raised says so.
 */

import type { RegisteredFontFamily } from './fonts';

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
  | 'captionLoose'
  | 'bodyCompactLoose'
  // TheSansArabic Bold, taller leading.
  | 'cardTitleLoose'
  // Amiri — standing in for the design's calligraphy.
  | 'calligraphyTitle'
  | 'calligraphyBody';

export type RoleTextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400';
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

/**
 * Ceiling for the OS font-size multiplier on CHROME text — tab labels, chip
 * captions, stat sublabels. Pass it as `maxFontSizeMultiplier`.
 *
 * Android multiplies every `fontSize` by the system font scale, and nothing in
 * this app used to opt out. Samsung's slider goes well past stock: the Galaxy
 * A30 this was found on reports `font_scale = 1.7` with Screen zoom also
 * raised (density override 450 → 384dp). At 1.7 the 12pt nav label becomes
 * ~20pt inside a fixed 49pt item, which both truncated the longest label
 * (الرئيسية → الرئيس…) and pushed the icon out of its box.
 *
 * CONTENT is deliberately NOT capped. Someone who raises the system font size
 * needs the Quran text, prose and titles to grow — that is the setting working.
 * Chrome sits in fixed boxes beside redundant icons, so bounded growth there
 * is the accessible trade, not a defeat of it.
 */
export const CHROME_MAX_FONT_SCALE = 1.2;

/** The design's line height for a size, floored so Arabic marks survive. */
const leading = (fontSize: number, stated: number) =>
  Math.max(stated, Math.ceil(fontSize * MIN_LINE_HEIGHT_RATIO));

/**
 * Every size below appears in the Figma file, and every line height is either
 * stated there or derived from the ratio it states for that size — then floored
 * by `leading` so the marks are not cropped.
 */
export const TEXT_ROLES: Readonly<Record<TextRole, RoleTextStyle>> = Object.freeze({
  displayLarge: { fontFamily: DISPLAY_FAMILY, fontSize: 32, fontWeight: '400', lineHeight: leading(32, 42) },
  display: { fontFamily: DISPLAY_FAMILY, fontSize: 28, fontWeight: '400', lineHeight: leading(28, 38) },
  screenTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 24, fontWeight: '400', lineHeight: leading(24, 32) },
  /** The Quran hero's `القرآن حــياة`, the one place the design sets 20. */
  heroTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 20, fontWeight: '400', lineHeight: leading(20, 28) },
  /** Home's `العلماء والمشايخ` / `الكتب العلمية` row headings. */
  sectionTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 16, fontWeight: '400', lineHeight: leading(16, 24) },
  cardTitle: { fontFamily: DISPLAY_FAMILY, fontSize: 14, fontWeight: '400', lineHeight: leading(14, 20) },
  /** Nav labels, quick chips, `عرض الكل`. */
  label: { fontFamily: DISPLAY_FAMILY, fontSize: 12, fontWeight: '400', lineHeight: leading(12, 16) },
  labelSmall: { fontFamily: DISPLAY_FAMILY, fontSize: 10, fontWeight: '400', lineHeight: leading(10, 14) },

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

  // Loose variants: same family and size as the base role, taller leading, for
  // the places the design sets 24pt leading under small text. Base roles unchanged.
  captionLoose: { fontFamily: BODY_FAMILY, fontSize: MIN_BODY_SIZE, fontWeight: '400', lineHeight: 24 },
  bodyCompactLoose: { fontFamily: BODY_FAMILY, fontSize: 14, fontWeight: '400', lineHeight: 24 },
  cardTitleLoose: { fontFamily: DISPLAY_FAMILY, fontSize: 14, fontWeight: '400', lineHeight: 24 },

  calligraphyTitle: { fontFamily: CALLIGRAPHY_FAMILY, fontSize: 16, fontWeight: '400', lineHeight: leading(16, 18.5) },
  calligraphyBody: { fontFamily: CALLIGRAPHY_FAMILY, fontSize: 14, fontWeight: '400', lineHeight: leading(14, 20) },
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

/**
 * Family for an ad-hoc weight, for the few sites a role does not cover.
 *
 * 700 is the design's display face (`TheSansArabic`, the Bold file), 600 the
 * SemiBold face, 400 the prose face (`TheMixArab`, the Regular file). It always
 * returns `fontWeight: '400'` because the weight is in the face; spread it into
 * a style instead of writing `fontWeight: '700'`.
 *
 * Amiri sites do not use this: `Amiri-Bold` is already bold, so they just drop
 * their `fontWeight`. 600 maps to `NotoSansArabic-SemiBold`, which has no
 * proprietary alias yet (see `FONT_SUBSTITUTIONS`).
 */
export function fontFace(weight: 400 | 600 | 700): {
  fontFamily: RegisteredFontFamily;
  fontWeight: '400';
} {
  const fontFamily: RegisteredFontFamily =
    weight === 700 ? DISPLAY_FAMILY : weight === 600 ? 'NotoSansArabic-SemiBold' : BODY_FAMILY;
  return { fontFamily, fontWeight: '400' };
}
