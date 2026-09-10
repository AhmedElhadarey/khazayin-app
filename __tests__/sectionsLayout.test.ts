import { CARD_DENSITY, SECTION_CHROME } from '@/constants/layout';
import { TEXT_ROLES } from '@/constants/typography';

// Every number here is stated by `docs/KHAZAYIN.fig`, read out of the binary
// node graph rather than measured off an export. The frames are the seventeen
// under the Sections tab: 2031:5675 (root), 2031:6193 / 2102:3187 (reciters),
// 2102:2975 (scholars), 2510:1990 (scholar detail), 2120:942 / 2120:1857
// (dawah), 2207:5270 (reciter surahs), 2207:17898 / 2349:982 (mushaf),
// 2457:954 (qiraat), 2465:1911 (prophet), 2589:1772 (queen), 2597:2552
// (books), 2606:3830 (radio), 2869:2088 (audiobooks), 2869:2306 (exclusive).

describe('the section root card — node 2031:5675, `DIV-43`', () => {
  it('is 96 tall at radius 20, inset 12 with a 64 disc', () => {
    expect(CARD_DENSITY.sectionCardHeight).toBe(96);
    expect(CARD_DENSITY.sectionCardRadius).toBe(20);
    expect(CARD_DENSITY.sectionCardPaddingVertical).toBe(16);
    expect(CARD_DENSITY.sectionCardPaddingHorizontal).toBe(12);
    expect(CARD_DENSITY.sectionIconDisc).toBe(64);
  });

  it('leaves the width the frame states once its insets are taken', () => {
    // The card is 361 wide at a 16 side margin; `DIV-44` is 337 inside it.
    expect(361 - CARD_DENSITY.sectionCardPaddingHorizontal * 2).toBe(337);
  });
});

describe('the lecture row — node 2465:1911, `DIV-139`', () => {
  it('is 64 tall at radius 16, inset 8 with a 40 disc', () => {
    expect(CARD_DENSITY.lectureCardMinHeight).toBe(64);
    expect(CARD_DENSITY.lectureCardRadius).toBe(16);
    expect(CARD_DENSITY.lectureCardPaddingHorizontal).toBe(8);
    expect(CARD_DENSITY.lectureBadgeDisc).toBe(40);
  });

  it('sits 6 from the next row, not the 8 the rail lists use', () => {
    // 141, 211, 281 … — a 70 step over a 64 row.
    expect(CARD_DENSITY.lectureListGap).toBe(6);
    expect(CARD_DENSITY.listGap).toBe(8);
  });
});

describe('the reciter and qiraa row — nodes 2031:6193, 2457:954', () => {
  it('is 56 tall at radius 12, one step tighter than a lecture row', () => {
    expect(CARD_DENSITY.reciterRowMinHeight).toBe(56);
    expect(CARD_DENSITY.reciterRowRadius).toBe(12);
    expect(CARD_DENSITY.reciterRowRadius).toBeLessThan(CARD_DENSITY.lectureCardRadius);
  });
});

describe('the rows that sit beside the letter rail — nodes 2102:2975, 2869:2088', () => {
  it('are drawn at radius 20 and no stroke, unlike every other row', () => {
    expect(CARD_DENSITY.railRowRadius).toBe(20);
    expect(CARD_DENSITY.scholarRowMinHeight).toBe(64);
  });
});

describe('the page chrome every section frame repeats', () => {
  it('sets the search field 40 tall at radius 12', () => {
    // node "Inputs", 361 x 40, in every one of the seventeen frames.
    expect(SECTION_CHROME.searchHeight).toBe(40);
    expect(SECTION_CHROME.searchRadius).toBe(12);
  });

  it('drops the title 8 under the status bar', () => {
    // Status bar 45 tall; the title box starts at y=53.
    expect(SECTION_CHROME.headerPaddingTop).toBe(53 - 45);
  });

  it('sizes the letter rail from the 16 x 22 chip the file states', () => {
    expect(SECTION_CHROME.letterChipWidth).toBe(16);
    expect(SECTION_CHROME.letterChipHeight).toBe(22);
    expect(SECTION_CHROME.letterChipRadius).toBe(4);
    // 141, 167, 193 … — a 26 step over a 22 chip.
    expect(SECTION_CHROME.letterChipGap).toBe(4);
  });

  it('widens the active chip rather than only recolouring it', () => {
    expect(SECTION_CHROME.letterChipActiveWidth).toBeGreaterThan(
      SECTION_CHROME.letterChipWidth,
    );
    expect(SECTION_CHROME.letterChipActiveRadius).toBe(8);
  });

  it('fits four reciter tabs and their gaps into the content column', () => {
    const { tabWidth, tabGap } = SECTION_CHROME;
    expect(tabWidth * 4 + tabGap * 3).toBe(360);
    expect(SECTION_CHROME.tabHeight).toBe(45);
    expect(SECTION_CHROME.tabUnderlineWidth).toBe(70);
    expect(SECTION_CHROME.tabUnderlineHeight).toBe(4);
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
