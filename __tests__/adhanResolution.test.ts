// T052 probe: does jest-expo resolve adhan's CJS entry and load it?
import { CalculationMethod, Coordinates, PrayerTimes, Madhab } from 'adhan';

it('T052-probe: adhan imports and computes under jest-expo', () => {
  const coords = new Coordinates(21.4225, 39.8262); // Makkah
  const params = CalculationMethod.UmmAlQura();
  params.madhab = Madhab.Shafi;
  const pt = new PrayerTimes(coords, new Date(2026, 6, 9), params);
  expect(pt.fajr instanceof Date).toBe(true);
  expect(Number.isNaN(pt.fajr.getTime())).toBe(false);
  console.log('fajr(UTC):', pt.fajr.toISOString(), 'isha:', pt.isha.toISOString());
});
