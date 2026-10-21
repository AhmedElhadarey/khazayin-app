import fs from 'fs';
import path from 'path';
import { CARD_DENSITY, LETTER_RAIL, PAGE_CHROME, SEGMENT_TABS } from '@/constants/layout';
import { TEXT_ROLES } from '@/constants/typography';

// Every number here is stated by `docs/KHAZAYIN.fig`, read out of the binary
// node graph rather than measured off an export. The frames are the seventeen
// under the Sections tab: 2031:5675 (root), 2031:6193 / 2102:3187 (reciters),
// 2102:2975 (scholars), 2510:1990 (scholar detail), 2120:942 / 2120:1857
// (dawah), 2207:5270 (reciter surahs), 2207:17898 / 2349:982 (mushaf),
// 2457:954 (qiraat), 2465:1911 (prophet), 2589:1772 (queen), 2597:2552
// (books), 2606:3830 (radio), 2869:2088 (audiobooks), 2869:2306 (exclusive).

describe('the row boxes the frames state', () => {
  it('gives the section card 96 at radius 20 with a 64 disc', () => {
    // node 2031:5675 `DIV-43`
    expect(CARD_DENSITY.sectionCardHeight).toBe(96);
    expect(CARD_DENSITY.sectionCardRadius).toBe(20);
    expect(CARD_DENSITY.sectionIconDisc).toBe(64);
    expect(CARD_DENSITY.sectionCardPaddingHorizontal).toBe(12);
    // `DIV-44` is 64 inset 16, but the text beside the disc (`DIV-48`, 68)
    // overflows it, so the inset the file renders to the first line is 14.
    expect(CARD_DENSITY.sectionCardPaddingVertical).toBe(14);
  });

  it('gives the lecture row 64 at radius 16 with a 40 disc', () => {
    // node 2465:1911 `DIV-139`, redrawn identically in 2589:1772, 2597:2552
    // and 2606:3830.
    expect(CARD_DENSITY.lectureCardMinHeight).toBe(64);
    expect(CARD_DENSITY.lectureCardRadius).toBe(16);
    expect(CARD_DENSITY.lectureCardPaddingHorizontal).toBe(8);
    expect(CARD_DENSITY.lectureBadgeDisc).toBe(40);
  });

  it('gives the reciter and qiraa row 56 at radius 12', () => {
    // nodes 2031:6193, 2102:3187, 2457:954
    expect(CARD_DENSITY.reciterRowMinHeight).toBe(56);
    expect(CARD_DENSITY.reciterRowRadius).toBe(12);
    expect(CARD_DENSITY.reciterRowRadius).toBeLessThan(CARD_DENSITY.lectureCardRadius);
  });

  it('gives the surah row 60 with a badge one step under the shared disc', () => {
    // nodes 2207:17898 and 2207:5270 both draw `DIV-67` / `DIV-79`
    expect(CARD_DENSITY.surahRowMinHeight).toBe(60);
    expect(CARD_DENSITY.surahBadgeDisc).toBe(36);
    expect(CARD_DENSITY.surahBadgeDisc).toBeLessThan(CARD_DENSITY.lectureBadgeDisc);
  });

  it('draws the rows beside the letter rail at radius 20', () => {
    // nodes 2102:2975, 2869:2088 — the only rows in the file with no stroke
    expect(CARD_DENSITY.railRowRadius).toBe(20);
    expect(CARD_DENSITY.scholarRowMinHeight).toBe(64);
  });

  it('keeps three distinct list rhythms, because the file does', () => {
    // 70 over a 64 row; 72 over a 64 row; 60 over a 56 row.
    expect(CARD_DENSITY.lectureListGap).toBe(6);
    expect(CARD_DENSITY.listGap).toBe(8);
    expect(CARD_DENSITY.dawahListGap).toBe(4);
  });
});

describe('the page chrome every section frame repeats', () => {
  it('sets the search field 40 tall at radius 12', () => {
    // node "Inputs", 361 x 40, in every one of the seventeen frames
    expect(PAGE_CHROME.searchHeight).toBe(40);
    expect(PAGE_CHROME.searchRadius).toBe(12);
  });

  it('leaves the search field under the touch minimum, deliberately', () => {
    // It is 40 because the file says 40; the target is made up with hitSlop.
    // If this ever stops being true the hitSlop in SearchPill is dead weight.
    expect(PAGE_CHROME.searchHeight).toBeLessThan(44);
  });

  it('sizes the letter rail from the 16 x 22 chip the file states', () => {
    expect(LETTER_RAIL.chipWidth).toBe(16);
    expect(LETTER_RAIL.chipHeight).toBe(22);
    expect(LETTER_RAIL.chipRadius).toBe(4);
    // 141, 167, 193 … — a 26 step over a 22 chip.
    expect(LETTER_RAIL.chipGap).toBe(4);
  });

  it('keeps the rail wider than its chips, so a chip can centre in it', () => {
    expect(LETTER_RAIL.width).toBeGreaterThan(LETTER_RAIL.chipWidth);
  });

  it('fits four reciter tabs and their gaps into the content column', () => {
    expect(SEGMENT_TABS.minTabWidth * 4 + SEGMENT_TABS.gap * 3).toBe(360);
    expect(SEGMENT_TABS.tabHeight).toBe(45);
    expect(SEGMENT_TABS.underlineWidth).toBe(70);
    expect(SEGMENT_TABS.underlineHeight).toBe(4);
  });
});

describe('the roles the section frames set their text in', () => {
  it('titles a row in the body face at 14, not the display face', () => {
    // `H3-145` is TheMixArab Regular 14 on every row in every frame.
    expect(TEXT_ROLES.bodyCompact.fontSize).toBe(14);
    expect(TEXT_ROLES.bodyCompact.fontWeight).toBe('400');
  });

  it('titles a section card in the display face at 16', () => {
    // `H3-49` on node 2031:5675 is TheSansArabic Bold 16.
    expect(TEXT_ROLES.sectionTitle.fontSize).toBe(16);
    expect(TEXT_ROLES.sectionTitle.fontWeight).toBe('700');
  });

  it('sets a page title at 18 in the body face', () => {
    // Every frame's header is TheMixArab Regular 18.
    expect(TEXT_ROLES.bodyLarge.fontSize).toBe(18);
    expect(TEXT_ROLES.bodyLarge.fontWeight).toBe('400');
  });
});

// The block above only pins the numbers. What actually regressed before this
// branch is components drifting away from them — every row had its own
// hardcoded height and radius. These read the sources the way
// `fontRegistry.test.ts` does, so re-hardcoding a box fails the suite rather
// than passing it quietly.
describe('the components read the boxes rather than restating them', () => {
  const read = (rel: string) =>
    fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  const CONSUMERS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['components/khazain/primitives/LectureCard.tsx', [
      'CARD_DENSITY.lectureCardMinHeight',
      'CARD_DENSITY.lectureCardRadius',
      'CARD_DENSITY.lectureCardPaddingHorizontal',
    ]],
    ['components/khazain/primitives/ListRowCard.tsx', [
      'CARD_DENSITY.sectionCardHeight',
      'CARD_DENSITY.sectionCardRadius',
      'CARD_DENSITY.sectionIconDisc',
    ]],
    ['components/khazain/primitives/ReciterRow.tsx', [
      'CARD_DENSITY.reciterRowMinHeight',
      'CARD_DENSITY.reciterRowRadius',
    ]],
    ['components/khazain/primitives/RibbonCard.tsx', [
      'CARD_DENSITY.scholarRowMinHeight',
      'CARD_DENSITY.railRowRadius',
      'CARD_DENSITY.reciterRowMinHeight',
    ]],
    ['components/khazain/sections/SurahRow.tsx', [
      'CARD_DENSITY.surahRowMinHeight',
      'CARD_DENSITY.surahBadgeDisc',
    ]],
    ['components/khazain/sections/ReciterSurahRow.tsx', [
      'CARD_DENSITY.surahRowMinHeight',
      'CARD_DENSITY.surahBadgeDisc',
    ]],
    ['components/khazain/primitives/LetterIndex.tsx', [
      'LETTER_RAIL.chipWidth',
      'LETTER_RAIL.chipHeight',
      'LETTER_RAIL.chipRadius',
    ]],
    ['components/khazain/primitives/SearchPill.tsx', [
      'PAGE_CHROME.searchHeight',
      'PAGE_CHROME.searchRadius',
    ]],
    ['components/khazain/primitives/SegmentTabs.tsx', [
      'SEGMENT_TABS.tabHeight',
      'SEGMENT_TABS.tabRadius',
      'SEGMENT_TABS.underlineWidth',
    ]],
  ];

  it.each(CONSUMERS)('%s reads its box from the shared constants', (file, refs) => {
    const src = read(file);
    for (const ref of refs) expect(src).toContain(ref);
  });

  it('leaves no row component setting a height the file already states', () => {
    const stated = [56, 60, 64, 96];
    for (const [file] of CONSUMERS) {
      const src = read(file);
      for (const n of stated) {
        expect(src).not.toMatch(new RegExp(`minHeight:\\s*${n}\\b`));
      }
    }
  });
});
