/**
 * The single registry of Arabic font families this app registers at startup.
 *
 * React Native does not throw on an unresolvable `fontFamily` — it silently
 * falls back to the platform Arabic face. That is how the audited typography
 * drifted, so `__tests__/fontRegistry.test.ts` scans shipping source and fails
 * on any family that is not listed here.
 *
 * `app/_layout.tsx` is the only place that calls `useFonts`, and it registers
 * exactly `FONT_ASSET_MODULES`.
 *
 * ## Why every weight is its own static face
 *
 * A family registered through expo-font is ONE face; `fontWeight` cannot pick
 * another weight from it.
 * - iOS: Fabric chooses the closest weight from a one-element list, so a
 *   variable font always rendered at wght 400 and `fontWeight: '700'` was
 *   ignored (no synthetic bold).
 * - Android: expo-font registers the alias only in the NORMAL typeface slot.
 *   `fontWeight: '700'` asks for the empty BOLD slot, so Android falls back to
 *   the system bold, which is a different typeface (Noto Naskh for Arabic).
 *
 * So the weight lives in the face: `TheSansArabic` IS Noto Sans Arabic Bold,
 * `TheMixArab` IS Regular, and styles always use `fontWeight: '400'`. Pick a
 * weight with `fontFace()` in `constants/typography.ts`. The static files are
 * cut from the former variable font; see `scripts/fonts/README.md`. Each has a
 * unique PostScript name, which expo-font on iOS requires.
 */

/** Family name → repo-relative asset path. Used by the registry test. */
export const ARABIC_FONT_ASSETS = {
  Amiri: 'assets/fonts/Amiri-Regular.ttf',
  'Amiri-Bold': 'assets/fonts/Amiri-Bold.ttf',
  NotoSansArabic: 'assets/fonts/NotoSansArabic-Regular.ttf',
  'NotoSansArabic-SemiBold': 'assets/fonts/NotoSansArabic-SemiBold.ttf',
  'NotoSansArabic-Bold': 'assets/fonts/NotoSansArabic-Bold.ttf',
  NotoNaskhArabic: 'assets/fonts/NotoNaskhArabic-VF.ttf',
  // Aliases for the licensed design families — see FONT_SUBSTITUTIONS.
  // The design only ever pairs TheSansArabic with Bold and TheMixArab with Regular.
  TheSansArabic: 'assets/fonts/NotoSansArabic-Bold.ttf',
  TheMixArab: 'assets/fonts/NotoSansArabic-Regular.ttf',
} as const satisfies Record<string, string>;

export type RegisteredFontFamily = keyof typeof ARABIC_FONT_ASSETS;

export const REGISTERED_FONT_FAMILIES = Object.keys(
  ARABIC_FONT_ASSETS,
) as RegisteredFontFamily[];

/**
 * Families rendered by a stand-in face because the licensed original has not
 * been supplied. Declared rather than hidden: while this map is non-empty, the
 * typography gate in the design specification is unresolved and every parity
 * screenshot must be labelled "typography provisional".
 *
 * When the licensed TheSansArabic / TheMixArab files arrive, drop them into
 * `assets/fonts/`, point ARABIC_FONT_ASSETS at them, and delete the entry here.
 * No component style changes, because components already name the real family.
 *
 * Remember `NotoSansArabic-SemiBold` (used by `fontFace(600)`): it has no
 * proprietary alias yet, so the licensed swap must decide what 600 becomes.
 */
export const FONT_SUBSTITUTIONS: Partial<Record<RegisteredFontFamily, string>> = {
  TheSansArabic: 'NotoSansArabic-Bold.ttf',
  TheMixArab: 'NotoSansArabic-Regular.ttf',
};

/** True only once every family renders in its own licensed face. */
export function typographyParityResolved(): boolean {
  return Object.keys(FONT_SUBSTITUTIONS).length === 0;
}

/**
 * The exact map handed to `useFonts`. `require` calls must be literal for the
 * Metro asset resolver, so they cannot be derived from ARABIC_FONT_ASSETS —
 * the registry test keeps the two in step.
 */
export const FONT_ASSET_MODULES = {
  Amiri: require('../assets/fonts/Amiri-Regular.ttf'),
  'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
  NotoSansArabic: require('../assets/fonts/NotoSansArabic-Regular.ttf'),
  'NotoSansArabic-SemiBold': require('../assets/fonts/NotoSansArabic-SemiBold.ttf'),
  'NotoSansArabic-Bold': require('../assets/fonts/NotoSansArabic-Bold.ttf'),
  NotoNaskhArabic: require('../assets/fonts/NotoNaskhArabic-VF.ttf'),
  TheSansArabic: require('../assets/fonts/NotoSansArabic-Bold.ttf'),
  TheMixArab: require('../assets/fonts/NotoSansArabic-Regular.ttf'),
};
