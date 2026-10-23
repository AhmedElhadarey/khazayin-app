import { readFileSync } from 'fs';
import { join } from 'path';

import { HEADER_BAND } from '@/constants/layout';
import { MIN_TOUCH_TARGET, PAGE_CHROME, SEGMENT_TABS } from '@/constants/layout';

const read = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');

const SEARCH_SCREENS = [
  'app/(tabs)/sections/radio.tsx',
  'app/(tabs)/sections/queen.tsx',
  'app/(tabs)/sections/reciter.tsx',
  'app/(tabs)/sections/mushaf.tsx',
  'app/(tabs)/sections/books.tsx',
  'app/(tabs)/sections/scholar.tsx',
  'app/(tabs)/sections/prophet.tsx',
  'app/(tabs)/sections/reciter/[id].tsx',
  'app/(tabs)/sections/scholar/[id].tsx',
  'components/khazain/sections/RailedLectureList.tsx',
];

describe('search pill and first-row offsets', () => {
  it('states the pill gaps once, in PAGE_CHROME', () => {
    expect(PAGE_CHROME.searchPaddingTop).toBe(0);
    expect(PAGE_CHROME.searchPaddingBottom).toBe(8);
    expect(PAGE_CHROME.rootSearchPaddingBottom).toBe(20);
    expect(PAGE_CHROME.listAfterSearch).toBe(2);
    expect(PAGE_CHROME.cardListAfterSearch).toBe(4);
    expect(PAGE_CHROME.listAfterTabs).toBe(8);
    expect(PAGE_CHROME.railTop).toBe(4);
  });

  it("agrees with HeaderArt's 'search' band (pill 40 + 8 below the 44 row)", () => {
    expect(HEADER_BAND.search - MIN_TOUCH_TARGET).toBe(
      PAGE_CHROME.searchPaddingTop + PAGE_CHROME.searchHeight + PAGE_CHROME.searchPaddingBottom,
    );
  });

  it.each(SEARCH_SCREENS)('%s lays its search block from the shared constants', (file) => {
    const src = read(file);
    expect(src).toMatch(/searchBlock:\s*\{[^}]*paddingTop:\s*PAGE_CHROME\.searchPaddingTop/);
    expect(src).toMatch(/searchBlock:\s*\{[^}]*paddingBottom:\s*PAGE_CHROME\.searchPaddingBottom/);
  });

  it('Sections root pads 20 under the pill', () => {
    expect(read('app/(tabs)/sections/index.tsx')).toMatch(
      /searchBlock:\s*\{[^}]*paddingBottom:\s*PAGE_CHROME\.rootSearchPaddingBottom/,
    );
  });

  it.each([
    'app/(tabs)/sections/scholar.tsx',
    'components/khazain/sections/RailedLectureList.tsx',
  ])('%s starts rows 2 under the pill and the rail 4', (file) => {
    const src = read(file);
    expect(src).toMatch(/body:\s*\{[^}]*paddingTop:\s*PAGE_CHROME\.listAfterSearch/);
    expect(src).toMatch(/rail:\s*\{[^}]*top:\s*PAGE_CHROME\.railTop/);
  });

  it('reciter detail starts rows and state card 2 under the pill', () => {
    const src = read('app/(tabs)/sections/reciter/[id].tsx');
    expect(src).toMatch(/list:\s*\{[^}]*paddingTop:\s*PAGE_CHROME\.listAfterSearch/);
    expect(src).toMatch(/stateBlock:\s*\{[^}]*paddingTop:\s*PAGE_CHROME\.listAfterSearch/);
  });

  it('reciter steps 16 search-to-tabs and tabs-to-list', () => {
    expect(SEGMENT_TABS.stripPaddingVertical).toBe(8);
    expect(PAGE_CHROME.searchPaddingBottom + SEGMENT_TABS.stripPaddingVertical).toBe(16);
    const src = read('app/(tabs)/sections/reciter.tsx');
    expect(src).toMatch(/body:\s*\{[^}]*paddingTop:\s*PAGE_CHROME\.listAfterTabs\b/);
    expect(src).toMatch(/rail:\s*\{[^}]*top:\s*PAGE_CHROME\.listAfterTabs\b/);
  });

  it.each([
    'app/(tabs)/sections/prophet.tsx',
    'app/(tabs)/sections/queen.tsx',
    'app/(tabs)/sections/books.tsx',
    'app/(tabs)/sections/radio.tsx',
  ])('%s starts its card list 4 under the pill', (file) => {
    expect(read(file)).toMatch(/list:\s*\{[^}]*paddingTop:\s*PAGE_CHROME\.cardListAfterSearch/);
  });

  it('Mushaf index starts its rows 2 under the pill', () => {
    expect(read('app/(tabs)/sections/mushaf.tsx')).toMatch(
      /surahList:\s*\{[^}]*paddingTop:\s*PAGE_CHROME\.listAfterSearch/,
    );
  });
});
