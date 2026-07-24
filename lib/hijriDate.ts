/**
 * Today's Hijri date in Arabic, e.g. "١٧ ذو القعدة ١٤٤٧ هـ".
 *
 * Returns `null` — never a guess — when the device cannot compute it. Callers
 * must render nothing rather than substitute a placeholder.
 *
 * Two hard-won constraints:
 *
 * 1. **Use `format()`, not `formatToParts()`.** `Intl.DateTimeFormat.prototype
 *    .formatToParts` has been undefined on iOS Hermes across several React
 *    Native releases (0.74 / 0.76 / 0.77; this app is on 0.81), and Hermes'
 *    iOS Intl is `NSDateFormatter`-backed rather than ICU-backed, so it has
 *    historically returned wrong values on real devices while working in the
 *    simulator. `format()` is reliable on both platforms.
 *
 * 2. **Never fall back to a hardcoded date.** The previous implementation
 *    returned a frozen literal (`'١٧ ذو القعدة ١٤٤٧ هـ'`) whenever `Intl`
 *    threw — which, given (1), is exactly what happened on affected iOS
 *    devices. Those users saw that same wrong Hijri date on the home screen
 *    every day, with no error anywhere.
 */

export function todayHijriArabic(date: Date = new Date()): string | null {
  try {
    const formatted = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);

    if (typeof formatted !== 'string' || formatted.trim().length === 0) return null;

    // `format()` already appends the era ("هـ") for the islamic-umalqura
    // calendar in most ICU builds; only add it when it is genuinely absent.
    return formatted.includes('هـ') ? formatted : `${formatted} هـ`;
  } catch {
    return null;
  }
}

/** The Hijri month number for Ramadan. */
export const RAMADAN_MONTH = 9;

/**
 * Hijri month number 1..12 (Ramadan = 9), or `null` when undeterminable.
 *
 * Obeys the same two constraints as {@link todayHijriArabic}:
 *
 * 1. **Use `format()`, never `formatToParts()`** — `formatToParts` has been
 *    undefined on iOS Hermes across several React Native releases.
 *
 * 2. **Never guess.** A device whose `Intl` cannot do the Hijri calendar (or
 *    returns anything unexpected) yields `null`, never a fabricated month.
 *
 * The `en-u-ca-islamic-umalqura` locale with `{ month: 'numeric' }` returns a
 * bare ASCII month token (e.g. `"9"` for Ramadan). We parse it strictly: the
 * token must match `/^\d{1,2}$/` and land in `1..12`, else `null`.
 */
export function hijriMonth(date: Date): number | null {
  try {
    const token = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      month: 'numeric',
    }).format(date);

    if (typeof token !== 'string' || !/^\d{1,2}$/.test(token)) return null;

    const month = Number(token);
    if (!Number.isInteger(month) || month < 1 || month > 12) return null;

    return month;
  } catch {
    return null;
  }
}
