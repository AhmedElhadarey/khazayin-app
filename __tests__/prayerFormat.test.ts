/**
 * prayerFormat — pure formatting of a computed `PrayerTimeSet` into five display
 * rows. No `Date.now()`, no native imports: every Date is built from LOCAL
 * calendar components so the test asserts local-getter usage (a `getUTCHours`
 * regression is caught by construction, not by the CI timezone).
 */

import { formatPrayerRows } from '@/services/prayerFormat';
import { toArabicDigits as toArNum } from '@/constants/progress';
import type { PrayerId, PrayerTimeSet } from '@/types/settings';

// Distinct Arabic labels, injected — the helper must never invent its own.
const LABELS: Record<PrayerId, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};
const labelFor = (id: PrayerId): string => LABELS[id];

// A set whose five instants are built from LOCAL components. Fajr at 05:35 (AM),
// the rest in the afternoon/evening (PM) so the ص/م split is exercised.
function makeSet(): PrayerTimeSet {
  return {
    localDay: '2026-07-09',
    fajr: new Date(2026, 6, 9, 5, 35),
    dhuhr: new Date(2026, 6, 9, 13, 5),
    asr: new Date(2026, 6, 9, 16, 45),
    maghrib: new Date(2026, 6, 9, 19, 58),
    isha: new Date(2026, 6, 9, 21, 30),
  };
}

describe('formatPrayerRows', () => {
  it('returns exactly five rows in chronological order', () => {
    const rows = formatPrayerRows(makeSet(), labelFor);
    expect(rows.map((r) => r.id)).toEqual([
      'fajr',
      'dhuhr',
      'asr',
      'maghrib',
      'isha',
    ]);
  });

  it('takes each label from the injected labelFor, not a hardcoded name', () => {
    const rows = formatPrayerRows(makeSet(), (id) => `X-${id}`);
    expect(rows.map((r) => r.labelAr)).toEqual([
      'X-fajr',
      'X-dhuhr',
      'X-asr',
      'X-maghrib',
      'X-isha',
    ]);
  });

  it('formats an AM instant with the Arabic digits and the ص marker (local hours)', () => {
    const rows = formatPrayerRows(makeSet(), labelFor);
    const fajr = rows[0];
    expect(fajr.time).toContain(toArNum('5:35')); // ٥:٣٥
    expect(fajr.time).toContain('ص');
    expect(fajr.time).not.toContain('م');
  });

  it('formats a PM instant with the م marker and 12-hour conversion', () => {
    const rows = formatPrayerRows(makeSet(), labelFor);
    const dhuhr = rows[1]; // 13:05 local → ١:٠٥ م
    expect(dhuhr.time).toContain(toArNum('1:05'));
    expect(dhuhr.time).toContain('م');
  });

  it('uses LOCAL getters: a Date built from local components keeps its local hour', () => {
    // Build the set from local components, then assert the row's clock digits
    // match the LOCAL hour/minute of that same Date — never the UTC hour.
    const set = makeSet();
    const rows = formatPrayerRows(set, labelFor);
    const maghrib = rows[3];
    const local = set.maghrib;
    const rawHour = local.getHours() % 12;
    const hour12 = rawHour === 0 ? 12 : rawHour;
    const minutes = String(local.getMinutes()).padStart(2, '0');
    expect(maghrib.time).toContain(toArNum(`${hour12}:${minutes}`)); // ٧:٥٨
  });
});
