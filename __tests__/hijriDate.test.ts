/**
 * Tests for `lib/hijriDate.ts`.
 *
 * The home screen renders this string. The previous implementation returned a
 * HARDCODED date (`'١٧ ذو القعدة ١٤٤٧ هـ'`) whenever `Intl` misbehaved — which
 * is exactly what happens on iOS Hermes, where `Intl.DateTimeFormat.prototype
 * .formatToParts` has been undefined across several React Native releases
 * (0.74 / 0.76 / 0.77; we are on 0.81). Affected users saw a frozen, wrong
 * Hijri date on the home screen forever, with no error.
 *
 * A date we cannot compute must be ABSENT, never invented.
 */

import { RAMADAN_MONTH, hijriMonth, todayHijriArabic } from '@/lib/hijriDate';

describe('T-HD — todayHijriArabic', () => {
  it('T-HD-1: returns a Hijri string with Arabic-Indic digits when Intl works', () => {
    const result = todayHijriArabic(new Date(2026, 6, 9));
    expect(result).not.toBeNull();
    expect(result).toMatch(/[٠-٩]/);
    expect(result).toContain('هـ');
  });

  it('T-HD-2: different Gregorian dates produce different Hijri strings', () => {
    const a = todayHijriArabic(new Date(2026, 0, 1));
    const b = todayHijriArabic(new Date(2026, 6, 9));
    expect(a).not.toBeNull();
    expect(a).not.toBe(b);
  });

  it('T-HD-3: returns null — never a fabricated date — when Intl.DateTimeFormat throws', () => {
    const original = Intl.DateTimeFormat;
    // @ts-expect-error deliberately breaking Intl to simulate iOS Hermes
    Intl.DateTimeFormat = () => {
      throw new Error('Intl unavailable');
    };
    try {
      expect(todayHijriArabic(new Date(2026, 6, 9))).toBeNull();
    } finally {
      Intl.DateTimeFormat = original;
    }
  });

  it('T-HD-4: returns null when format() yields an empty string', () => {
    const original = Intl.DateTimeFormat;
    // @ts-expect-error deliberately stubbing Intl
    Intl.DateTimeFormat = function () {
      return { format: () => '' };
    };
    try {
      expect(todayHijriArabic(new Date(2026, 6, 9))).toBeNull();
    } finally {
      Intl.DateTimeFormat = original;
    }
  });

  it('T-HD-5: never returns the old hardcoded fallback string', () => {
    const result = todayHijriArabic(new Date(2027, 2, 3));
    expect(result).not.toBe('١٧ ذو القعدة ١٤٤٧ هـ');
  });
});

describe('T-HM — hijriMonth', () => {
  it('T-HM-0: RAMADAN_MONTH is 9', () => {
    expect(RAMADAN_MONTH).toBe(9);
  });

  // Dates constructed from LOCAL components — NEVER new Date('2026-02-10'),
  // which parses as UTC midnight and can shift the Hijri month.
  it('T-HM-1: 2026-02-10 (Shaban) → 8', () => {
    expect(hijriMonth(new Date(2026, 1, 10))).toBe(8);
  });

  it('T-HM-2: 2026-02-19 (Ramadan) → 9', () => {
    expect(hijriMonth(new Date(2026, 1, 19))).toBe(9);
  });

  it('T-HM-3: 2026-03-10 (Ramadan) → 9', () => {
    expect(hijriMonth(new Date(2026, 2, 10))).toBe(9);
  });

  it('T-HM-4: 2026-03-25 (Shawwal) → 10', () => {
    expect(hijriMonth(new Date(2026, 2, 25))).toBe(10);
  });

  it('T-HM-5: returns null — never a guess — when Intl yields garbage', () => {
    const original = Intl.DateTimeFormat;
    // @ts-expect-error deliberately stubbing Intl to return an unparseable token
    Intl.DateTimeFormat = function () {
      return { format: () => 'ramadan' };
    };
    try {
      expect(hijriMonth(new Date(2026, 1, 19))).toBeNull();
    } finally {
      Intl.DateTimeFormat = original;
    }
  });

  it('T-HM-6: returns null when Intl.DateTimeFormat throws', () => {
    const original = Intl.DateTimeFormat;
    // @ts-expect-error deliberately breaking Intl to simulate iOS Hermes
    Intl.DateTimeFormat = () => {
      throw new Error('Intl unavailable');
    };
    try {
      expect(hijriMonth(new Date(2026, 1, 19))).toBeNull();
    } finally {
      Intl.DateTimeFormat = original;
    }
  });
});
