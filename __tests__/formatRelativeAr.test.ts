import { formatRelativeAr } from '@/store/notesStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = 1_800_000_000_000;
const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => jest.restoreAllMocks());

const at = (ms: number) => formatRelativeAr(NOW - ms);

describe('formatRelativeAr', () => {
  it.each([
    // under a minute and minutes (abbreviated unit, no agreement needed)
    [0, 'الآن'],
    [30e3, 'الآن'],
    [MIN, 'منذ ١ د'],
    [2 * MIN, 'منذ ٢ د'],
    [59 * MIN, 'منذ ٥٩ د'],
    // hours: 1 singular, 2 dual, 3-10 plural, 11+ singular
    [HOUR, 'منذ ساعة'],
    [2 * HOUR, 'منذ ساعتين'],
    [3 * HOUR, 'منذ ٣ ساعات'],
    [10 * HOUR, 'منذ ١٠ ساعات'],
    [11 * HOUR, 'منذ ١١ ساعة'],
    [23 * HOUR, 'منذ ٢٣ ساعة'],
    // days
    [DAY, 'أمس'],
    [2 * DAY, 'قبل يومين'],
    [3 * DAY, 'قبل ٣ أيام'],
    [6 * DAY, 'قبل ٦ أيام'],
    // weeks
    [7 * DAY, 'قبل أسبوع'],
    [13 * DAY, 'قبل أسبوع'],
    [14 * DAY, 'قبل أسبوعين'],
    [21 * DAY, 'قبل ٣ أسابيع'],
    [49 * DAY, 'قبل ٧ أسابيع'],
    [70 * DAY, 'قبل ١٠ أسابيع'],
    [77 * DAY, 'قبل ١١ أسبوع'],
    [364 * DAY, 'قبل ٥٢ أسبوع'],
  ])('%d ms ago reads «%s»', (ms, expected) => {
    expect(at(ms)).toBe(expected);
  });
});
