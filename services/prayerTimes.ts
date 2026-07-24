/**
 * prayerTimes — the SOLE `adhan` boundary (US3, ungated portion).
 *
 * Every use of the `adhan` library in the app funnels through this module.
 * `services/notificationHorizon.ts` stays pure by consuming the derived
 * `PrayerTimeSet` via an injected callback and NEVER importing `adhan`; this
 * module is where that callback's data is actually computed.
 *
 * This module imports ONLY from `adhan` and `@/types/settings`. It must NOT
 * import `expo-notifications`, `expo-location`, any zustand store, or `@/db` —
 * keeping it a small, side-effect-free, unit-testable seam.
 *
 * No `Date.now()` anywhere: every function is pure w.r.t. the wall clock. The
 * `localDay` a caller asks about is the only time source.
 *
 * Contract: `PrayerTimeSet` is defined once in `@/types/settings` (single
 * source of truth per FR-040) and re-exported here for the contract surface.
 */

import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
} from 'adhan';

// Pure, no native deps — safe to import here. `hijriMonth` only touches `Intl`.
import { RAMADAN_MONTH, hijriMonth } from '@/lib/hijriDate';
import type {
  CalculationMethodId,
  PrayerConfig,
  PrayerId,
  PrayerTimeSet,
} from '@/types/settings';

export type { PrayerTimeSet } from '@/types/settings';

// ---------------------------------------------------------------------------
// Country → method mapping
// ---------------------------------------------------------------------------

/**
 * ISO-3166 alpha-2 → calculation method. Only the codes with a dedicated adhan
 * method are mapped; everything else — including `null`, `''`, unknown codes,
 * and every Levant country (adhan ships NO Levant/Jordan/Syria method) — falls
 * back to Muslim World League, the widely-accepted default.
 */
const COUNTRY_METHOD: Readonly<Record<string, CalculationMethodId>> = {
  EG: 'egyptian',
  SA: 'umm-al-qura',
  KW: 'kuwait',
  QA: 'qatar',
  AE: 'dubai',
  // South Asia — adhan's Karachi (Univ. of Islamic Sciences).
  PK: 'karachi',
  IN: 'karachi',
  BD: 'karachi',
  TR: 'turkey',
  IR: 'tehran',
  // South-East Asia — adhan's Singapore method (MUIS).
  ID: 'singapore',
  MY: 'singapore',
  SG: 'singapore',
  BN: 'singapore',
  // North America — adhan's ISNA method.
  US: 'north-america',
  CA: 'north-america',
  // NOTE: the Levant (JO/SY/LB/PS) is deliberately ABSENT. adhan ships no
  // Levant method, so those codes fall through to Muslim World League below.
  // This is a documented, intentional fallback — not an oversight.
};

export function methodForCountry(isoCountryCode: string | null): CalculationMethodId {
  if (isoCountryCode === null || isoCountryCode === '') return 'muslim-world-league';
  return COUNTRY_METHOD[isoCountryCode.toUpperCase()] ?? 'muslim-world-league';
}

// ---------------------------------------------------------------------------
// Method id → adhan CalculationMethod factory
// ---------------------------------------------------------------------------

/** Maps our persisted method id to the adhan `CalculationMethod` factory key. */
const METHOD_FACTORY: Readonly<Record<CalculationMethodId, () => ReturnType<
  typeof CalculationMethod.MuslimWorldLeague
>>> = {
  'umm-al-qura': CalculationMethod.UmmAlQura,
  'muslim-world-league': CalculationMethod.MuslimWorldLeague,
  egyptian: CalculationMethod.Egyptian,
  kuwait: CalculationMethod.Kuwait,
  qatar: CalculationMethod.Qatar,
  dubai: CalculationMethod.Dubai,
  karachi: CalculationMethod.Karachi,
  turkey: CalculationMethod.Turkey,
  tehran: CalculationMethod.Tehran,
  singapore: CalculationMethod.Singapore,
  'north-america': CalculationMethod.NorthAmerica,
};

// ---------------------------------------------------------------------------
// localDay parsing
// ---------------------------------------------------------------------------

const LOCAL_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a strict `'YYYY-MM-DD'` string into calendar parts, or return `null`
 * if malformed. Rejects single-digit month/day (`'2026-7-9'`) and out-of-range
 * months/days — a loose parse would silently roll `2026-13-01` into next year.
 *
 * Also rejects dates that are well-formed but do not EXIST (`'2026-02-31'`,
 * `'2027-02-29'`). A `1..31` range check alone lets those through, and
 * `new Date(2026, 1, 31)` silently rolls to 3 March — so `computePrayerTimes`
 * would return a set whose `localDay` says February 31st while its five instants
 * belong to March 3rd. No caller can reach that today (`toLocalDay()` and
 * `addLocalDays()` both emit real days), but `reconcileHorizonAsync` keys armed
 * notifications on `(category, localDay)`, so a future caller passing a synthetic
 * day would mint a key pointing at the wrong instants. Cheaper to close now.
 */
function parseLocalDay(localDay: string): { y: number; m: number; d: number } | null {
  const match = LOCAL_DAY_RE.exec(localDay);
  if (match === null) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  // Round-trip: a non-existent day normalises to a different month/day.
  const probe = new Date(y, m - 1, d);
  if (probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return { y, m, d };
}

const PRAYER_ORDER: readonly PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// ---------------------------------------------------------------------------
// computePrayerTimes
// ---------------------------------------------------------------------------

/**
 * Compute the five prayer instants for `localDay` under `config`, or `null`
 * when the day cannot yield a usable set. Never throws.
 *
 * Returns `null` when:
 *  - `config.location.kind === 'none'` (no location chosen yet);
 *  - `localDay` is not a well-formed `'YYYY-MM-DD'`;
 *  - any of the five instants is an `Invalid Date`. With
 *    `PolarCircleResolution.AqrabYaum` this is not expected to happen (each
 *    undefined polar prayer resolves to the nearest day on which it is
 *    defined), but the NaN check is kept as defence in depth: letting such a
 *    value reach `Notifications.scheduleNotificationAsync` would throw;
 *  - the adhan call throws for any other reason.
 */
export function computePrayerTimes(
  localDay: string,
  config: PrayerConfig,
): PrayerTimeSet | null {
  if (config.location.kind === 'none') return null;

  const parts = parseLocalDay(localDay);
  if (parts === null) return null;

  try {
    const coords = new Coordinates(config.location.latitude, config.location.longitude);

    // Build the adhan input Date from LOCAL calendar components. NEVER
    // `new Date(localDay)` — that parses as UTC midnight and yields the
    // PREVIOUS calendar day for every user west of Greenwich. A UTC CI runner
    // can never catch that regression, so it must be enforced by construction.
    const date = new Date(parts.y, parts.m - 1, parts.d);

    const params = METHOD_FACTORY[config.method]();
    params.madhab = config.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
    params.highLatitudeRule = HighLatitudeRule.recommended(coords);
    // AqrabYaum (nearest-day) rather than Unresolved. Under `Unresolved`,
    // adhan leaves fajr/maghrib/isha as `Invalid Date` at polar latitudes,
    // which forced the NaN-guard below to drop the WHOLE day — suppressing
    // dhuhr and asr, which are perfectly well-defined under the midnight sun,
    // and rendering a blank screen that reads as a broken app. `AqrabYaum`
    // resolves each undefined prayer to the nearest day on which it is defined,
    // so every day yields a usable five-prayer set.
    params.polarCircleResolution = PolarCircleResolution.AqrabYaum;

    // Ramadan Isha adjustment — Umm al-Qurā ONLY. adhan's METHODS.md instructs
    // implementers to add +30 min to Isha during Ramadan for Umm al-Qurā
    // (Makkah's Isha is 90 min after Maghrib, 120 during Ramadan). `adjustments`
    // (NOT `methodAdjustments`) is the field adhan applies verbatim; `isha = 30`
    // shifts Isha by exactly +30 and leaves Maghrib untouched. This applies to
    // Umm al-Qurā ALONE — Qatar shares the 90-minute interval but has no Ramadan
    // adjustment, so applying it there would be a bug. If `hijriMonth` returns
    // `null` (device `Intl` cannot do the Hijri calendar) we apply NO adjustment,
    // failing safe to exactly today's behaviour rather than guessing.
    if (config.method === 'umm-al-qura' && hijriMonth(date) === RAMADAN_MONTH) {
      params.adjustments.isha = 30;
    }

    const times = new PrayerTimes(coords, date, params);

    const set = {
      localDay,
      fajr: times.fajr,
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
    } as const;

    // Defence in depth. `AqrabYaum` above is expected to make this loop
    // unreachable (every prayer resolves to a valid instant), but a future
    // adhan change or an exotic coordinate must never let an `Invalid Date`
    // reach `Notifications.scheduleNotificationAsync`, which would throw. If any
    // instant is still NaN, drop the whole day rather than leak it.
    for (const prayer of PRAYER_ORDER) {
      if (Number.isNaN(set[prayer].getTime())) return null;
    }

    return set;
  } catch (err) {
    // Surface the failure in dev. Returning a bare `null` made an adhan throw
    // indistinguishable from the legitimate "no location chosen" empty state:
    // the screen renders `تعذّر حساب المواقيت` either way, with nothing in the
    // console. `console.warn` is a global — no import, so the module stays free
    // of native dependencies.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[prayerTimes] computePrayerTimes failed', err);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// createPrayerTimesProvider
// ---------------------------------------------------------------------------

/**
 * Build a `(localDay) => PrayerTimeSet | null` closure over a SHALLOW snapshot of
 * `config`, suitable for `horizonOrchestrator.setPrayerTimesProvider`.
 *
 * `location` is copied by reference, not deep-cloned. That is safe because
 * `settingsStore` never mutates a `PrayerLocation` in place — `setPrayerLocation`
 * always replaces `prayer` with a fresh object built by `coerceLocation` — so the
 * captured reference points at an effectively immutable value. Deep-cloning here
 * would only hide a future in-place mutation rather than prevent it.
 */
export function createPrayerTimesProvider(
  config: PrayerConfig,
): (localDay: string) => PrayerTimeSet | null {
  const captured: PrayerConfig = {
    location: config.location,
    method: config.method,
    madhab: config.madhab,
  };
  return (localDay: string) => computePrayerTimes(localDay, captured);
}
