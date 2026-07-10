import {
  computePrayerTimes,
  createPrayerTimesProvider,
  methodForCountry,
} from '@/services/prayerTimes';
import type { CalculationMethodId, PrayerConfig } from '@/types/settings';

// Cairo — a sub-tropical latitude where all five prayers are always resolvable.
const CAIRO = { latitude: 30.04, longitude: 31.24 };

function cairoConfig(overrides: Partial<PrayerConfig> = {}): PrayerConfig {
  return {
    location: { kind: 'gps', latitude: CAIRO.latitude, longitude: CAIRO.longitude },
    method: 'egyptian',
    madhab: 'shafi',
    ...overrides,
  };
}

describe('methodForCountry', () => {
  it('maps the five known GCC/Egypt codes', () => {
    expect(methodForCountry('EG')).toBe('egyptian');
    expect(methodForCountry('SA')).toBe('umm-al-qura');
    expect(methodForCountry('KW')).toBe('kuwait');
    expect(methodForCountry('QA')).toBe('qatar');
    expect(methodForCountry('AE')).toBe('dubai');
  });

  it('is case-insensitive', () => {
    expect(methodForCountry('eg')).toBe('egyptian');
    expect(methodForCountry('sa')).toBe('umm-al-qura');
  });

  it('maps the extended South-Asia / Turkey / Iran / SE-Asia / North-America codes', () => {
    expect(methodForCountry('PK')).toBe('karachi');
    expect(methodForCountry('IN')).toBe('karachi');
    expect(methodForCountry('BD')).toBe('karachi');
    expect(methodForCountry('TR')).toBe('turkey');
    expect(methodForCountry('IR')).toBe('tehran');
    expect(methodForCountry('ID')).toBe('singapore');
    expect(methodForCountry('MY')).toBe('singapore');
    expect(methodForCountry('SG')).toBe('singapore');
    expect(methodForCountry('BN')).toBe('singapore');
    expect(methodForCountry('US')).toBe('north-america');
    expect(methodForCountry('CA')).toBe('north-america');
  });

  it('is case-insensitive for the extended codes too', () => {
    expect(methodForCountry('pk')).toBe('karachi');
    expect(methodForCountry('us')).toBe('north-america');
  });

  it('falls back to muslim-world-league for null, empty, all Levant, and unknown codes', () => {
    expect(methodForCountry(null)).toBe('muslim-world-league');
    expect(methodForCountry('')).toBe('muslim-world-league');
    // adhan ships no Levant method — every Levant country must degrade to MWL.
    expect(methodForCountry('JO')).toBe('muslim-world-league');
    expect(methodForCountry('SY')).toBe('muslim-world-league');
    expect(methodForCountry('LB')).toBe('muslim-world-league');
    expect(methodForCountry('PS')).toBe('muslim-world-league');
    expect(methodForCountry('ZZ')).toBe('muslim-world-league');
  });
});

describe('computePrayerTimes', () => {
  it('returns null when location.kind is none', () => {
    const config: PrayerConfig = {
      location: { kind: 'none' },
      method: 'muslim-world-league',
      madhab: 'shafi',
    };
    expect(computePrayerTimes('2026-07-09', config)).toBeNull();
  });

  it('returns five valid, strictly-increasing instants for Cairo and echoes localDay', () => {
    const set = computePrayerTimes('2026-07-09', cairoConfig());
    expect(set).not.toBeNull();
    if (set === null) throw new Error('unreachable');

    expect(set.localDay).toBe('2026-07-09');

    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(set[prayer]).toBeInstanceOf(Date);
      expect(Number.isNaN(set[prayer].getTime())).toBe(false);
    }

    expect(set.fajr.getTime()).toBeLessThan(set.dhuhr.getTime());
    expect(set.dhuhr.getTime()).toBeLessThan(set.asr.getTime());
    expect(set.asr.getTime()).toBeLessThan(set.maghrib.getTime());
    expect(set.maghrib.getTime()).toBeLessThan(set.isha.getTime());
  });

  // GUARD: a UTC CI runner can NEVER catch a `new Date(localDay)` regression,
  // because at UTC the parsed instant is already on the correct calendar day.
  // This test only fails on machines west of Greenwich, so it is a code-review
  // guard, not a CI guard — its presence documents the invariant.
  it('builds the day from LOCAL calendar components (dhuhr lands on the requested local day)', () => {
    const set = computePrayerTimes('2026-07-09', cairoConfig());
    expect(set).not.toBeNull();
    if (set === null) throw new Error('unreachable');
    // 2026-07-09 → month index 6, date 9, in the runner's LOCAL zone.
    expect(set.dhuhr.getMonth()).toBe(6);
    expect(set.dhuhr.getDate()).toBe(9);
  });

  // CONTRACT (changed): at extreme latitude on the summer solstice, adhan's
  // PolarCircleResolution.AqrabYaum resolves every prayer to the nearest day on
  // which it is defined — so the day yields five VALID instants and NEVER blanks
  // the screen. Under the old `Unresolved` mode fajr/maghrib/isha came back as
  // Invalid Date, dropping the whole day (including the well-defined dhuhr/asr)
  // and rendering a blank screen that read as a broken app.
  it('returns five valid instants at polar latitude (no day ever renders blank)', () => {
    const config: PrayerConfig = {
      location: { kind: 'gps', latitude: 78.22, longitude: 15.65 },
      method: 'muslim-world-league',
      madhab: 'shafi',
    };
    const set = computePrayerTimes('2026-06-21', config);
    expect(set).not.toBeNull();
    if (set === null) throw new Error('unreachable');
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(set[prayer]).toBeInstanceOf(Date);
      expect(Number.isNaN(set[prayer].getTime())).toBe(false);
    }
  });

  it('places Hanafi asr strictly later than Shafi asr for the same day/place', () => {
    const shafi = computePrayerTimes('2026-07-09', cairoConfig({ madhab: 'shafi' }));
    const hanafi = computePrayerTimes('2026-07-09', cairoConfig({ madhab: 'hanafi' }));
    expect(shafi).not.toBeNull();
    expect(hanafi).not.toBeNull();
    if (shafi === null || hanafi === null) throw new Error('unreachable');
    expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime());
  });

  it('returns null for malformed localDay strings', () => {
    expect(computePrayerTimes('2026-7-9', cairoConfig())).toBeNull();
    expect(computePrayerTimes('garbage', cairoConfig())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Ramadan Isha +30 — Umm al-Qurā ONLY (adhan METHODS.md)
// ---------------------------------------------------------------------------

// Makkah — where the Umm al-Qurā fixed 90-minute Isha interval (120 in Ramadan)
// is authoritative.
const MAKKAH = { latitude: 21.42, longitude: 39.83 };
const RAMADAN_DAY = '2026-03-10'; // Ramadan 21, 1447
const SHAWWAL_DAY = '2026-03-25'; // Shawwal 6, 1447 (not Ramadan)

function ishaMinusMaghribMinutes(
  localDay: string,
  method: PrayerConfig['method'],
): number {
  const set = computePrayerTimes(localDay, {
    location: { kind: 'gps', latitude: MAKKAH.latitude, longitude: MAKKAH.longitude },
    method,
    madhab: 'shafi',
  });
  if (set === null) throw new Error('unreachable — Makkah always resolves');
  return (set.isha.getTime() - set.maghrib.getTime()) / 60000;
}

describe('Ramadan Isha adjustment (Umm al-Qurā only)', () => {
  it('adds +30 min to Isha on a Ramadan day for umm-al-qura (120 min after maghrib)', () => {
    expect(ishaMinusMaghribMinutes(RAMADAN_DAY, 'umm-al-qura')).toBe(120);
  });

  it('leaves Isha at the base 90 min after maghrib on a non-Ramadan day for umm-al-qura', () => {
    expect(ishaMinusMaghribMinutes(SHAWWAL_DAY, 'umm-al-qura')).toBe(90);
  });

  // REGRESSION GUARD: Qatar shares the 90-minute Isha interval but has NO
  // Ramadan adjustment in adhan's METHODS.md. Applying +30 to Qatar would be a
  // BUG. Both the Ramadan and non-Ramadan days must stay at exactly 90 minutes.
  it('does NOT apply the Ramadan +30 to Qatar (guards against the earlier error)', () => {
    expect(ishaMinusMaghribMinutes(RAMADAN_DAY, 'qatar')).toBe(90);
    expect(ishaMinusMaghribMinutes(SHAWWAL_DAY, 'qatar')).toBe(90);
  });

  // The Isha adjustment must never move Maghrib. Maghrib derives from sunset and
  // is identical for umm-al-qura and qatar on the same Makkah day; the Ramadan
  // adjustment leaves that untouched.
  it('does not change Maghrib when adjusting Isha (Ramadan day)', () => {
    const ummSet = computePrayerTimes(RAMADAN_DAY, {
      location: { kind: 'gps', latitude: MAKKAH.latitude, longitude: MAKKAH.longitude },
      method: 'umm-al-qura',
      madhab: 'shafi',
    });
    const qatarSet = computePrayerTimes(RAMADAN_DAY, {
      location: { kind: 'gps', latitude: MAKKAH.latitude, longitude: MAKKAH.longitude },
      method: 'qatar',
      madhab: 'shafi',
    });
    expect(ummSet).not.toBeNull();
    expect(qatarSet).not.toBeNull();
    if (ummSet === null || qatarSet === null) throw new Error('unreachable');
    expect(ummSet.maghrib.getTime()).toBe(qatarSet.maghrib.getTime());
  });
});

// ---------------------------------------------------------------------------
// Every calculation method computes — guards the detached METHOD_FACTORY refs
// ---------------------------------------------------------------------------

describe('all eleven calculation methods compute for Cairo', () => {
  const ALL_METHODS: readonly CalculationMethodId[] = [
    'umm-al-qura',
    'muslim-world-league',
    'egyptian',
    'kuwait',
    'qatar',
    'dubai',
    'karachi',
    'turkey',
    'tehran',
    'singapore',
    'north-america',
  ];

  it.each(ALL_METHODS)('method %s yields five valid instants', (method) => {
    const set = computePrayerTimes('2026-07-09', cairoConfig({ method }));
    expect(set).not.toBeNull();
    if (set === null) throw new Error('unreachable');
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(set[prayer]).toBeInstanceOf(Date);
      expect(Number.isNaN(set[prayer].getTime())).toBe(false);
    }
  });
});

describe('createPrayerTimesProvider', () => {
  it('produces the same result as computePrayerTimes for the same day', () => {
    const config = cairoConfig();
    const provider = createPrayerTimesProvider(config);
    const direct = computePrayerTimes('2026-07-09', config);
    const viaProvider = provider('2026-07-09');
    expect(viaProvider).not.toBeNull();
    expect(direct).not.toBeNull();
    if (viaProvider === null || direct === null) throw new Error('unreachable');
    expect(viaProvider.dhuhr.getTime()).toBe(direct.dhuhr.getTime());
    expect(viaProvider.localDay).toBe(direct.localDay);
  });

  it('returns null for a none-location config', () => {
    const provider = createPrayerTimesProvider({
      location: { kind: 'none' },
      method: 'muslim-world-league',
      madhab: 'shafi',
    });
    expect(provider('2026-07-09')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-PT-NONEXIST — a well-formed but non-existent day must not silently roll.
//
// `'2026-02-31'` passes a naive 1..31 day check, and `new Date(2026, 1, 31)`
// normalises to 3 March. Without a round-trip check `computePrayerTimes` would
// return a set whose `localDay` reads February 31st while its five instants
// belong to March 3rd — and `reconcileHorizonAsync` keys armed notifications on
// exactly that `(category, localDay)` pair.
// ---------------------------------------------------------------------------
describe('T-PT-NONEXIST — non-existent calendar days', () => {
  const CAIRO = {
    location: { kind: 'gps', latitude: 30.04, longitude: 31.24 },
    method: 'egyptian',
    madhab: 'shafi',
  } as const;

  it('rejects 2026-02-31 rather than rolling it into March', () => {
    expect(computePrayerTimes('2026-02-31', CAIRO)).toBeNull();
  });

  it('rejects 2027-02-29 (2027 is not a leap year) but accepts 2028-02-29', () => {
    expect(computePrayerTimes('2027-02-29', CAIRO)).toBeNull();
    expect(computePrayerTimes('2028-02-29', CAIRO)).not.toBeNull();
  });

  it('rejects 2026-04-31 (April has 30 days)', () => {
    expect(computePrayerTimes('2026-04-31', CAIRO)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-PT-CROSSDAY — `localDay` is a GROUPING KEY, not a claim about when the
// instant occurs.
//
// A code reviewer flagged that under `AqrabYaum` a polar entry's `fireAt` can
// land outside its `localDay`, and proposed dropping such entries. That "fix"
// would DELETE isha at high latitudes. Verified in Europe/Oslo (Svalbard's real
// zone): isha for localDay 2026-06-21 occurs at 00:02 local on the 22nd. The
// same thing happens at ordinary European latitudes in high summer, so the
// invariant `fireAt ∈ localDay` never held in the first place.
//
// `computeHorizon` only ever filters on `fireAt > now`, and consecutive days
// yield distinct instants, so there is no duplicate-notification or
// fire-in-the-past hazard. This test exists to stop someone "restoring" an
// invariant that was never true.
// ---------------------------------------------------------------------------
describe('T-PT-CROSSDAY — a late isha may fall on the next local day', () => {
  it('still returns five valid instants, and consecutive days never collide', () => {
    const svalbard = {
      location: { kind: 'gps', latitude: 78.22, longitude: 15.65 },
      method: 'muslim-world-league',
      madhab: 'shafi',
    } as const;

    const a = computePrayerTimes('2026-06-21', svalbard);
    const b = computePrayerTimes('2026-06-22', svalbard);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    if (a === null || b === null) return;

    for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(Number.isNaN(a[p].getTime())).toBe(false);
      // Distinct instants per day — no duplicate notification at the same time.
      expect(a[p].getTime()).not.toBe(b[p].getTime());
    }
  });
});
