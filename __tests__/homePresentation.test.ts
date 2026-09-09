import {
  HOME_QUICK_CHIPS,
  HOME_SECTION_GAP,
  HOME_SECTION_ORDER,
  type HomeSectionKey,
} from '@/constants/homePresentation';
import { CONTENT_MAX_WIDTH, responsiveCarouselCardWidth } from '@/constants/layout';

/**
 * The Home screen renders straight from HOME_SECTION_ORDER, so this array is
 * the running order — not a description of it. Figma node 2001:940.
 */
describe('Home section order', () => {
  it('matches the reference scroll order', () => {
    expect(HOME_SECTION_ORDER).toEqual([
      'header',
      'quranHero',
      'prophetHero',
      'scholars',
      'books',
      'queen',
      'quickChips',
      'dawah',
    ]);
  });

  it('opens with the header and both heroes before any carousel', () => {
    const firstCarousel = HOME_SECTION_ORDER.indexOf('scholars');
    (['header', 'quranHero', 'prophetHero'] as HomeSectionKey[]).forEach((key) => {
      expect(HOME_SECTION_ORDER.indexOf(key)).toBeLessThan(firstCarousel);
    });
  });

  it('has no duplicate sections', () => {
    expect(new Set(HOME_SECTION_ORDER).size).toBe(HOME_SECTION_ORDER.length);
  });

  it('uses one vertical rhythm between sections', () => {
    expect(HOME_SECTION_GAP).toBe(24);
  });
});

describe('Home quick chips', () => {
  it('lists the three Figma chips in physical left-to-right order', () => {
    expect(HOME_QUICK_CHIPS.map((chip) => chip.label)).toEqual([
      'كتب صوتية',
      'برامج إذاعية',
      'حصريات خزائن الرحمن',
    ]);
  });

  it('routes the radio chip to the implemented radio section', () => {
    const radio = HOME_QUICK_CHIPS.find((chip) => chip.label === 'برامج إذاعية');
    expect(radio?.route).toBe('/sections/radio');
  });

  it('marks the chips whose Figma routes do not exist yet', () => {
    // Implemented by Task 4.5; until then the chip must not push a dead route.
    const pending = HOME_QUICK_CHIPS.filter((chip) => chip.route === null);
    expect(pending.map((chip) => chip.plannedRoute)).toEqual([
      '/sections/audiobooks',
      '/sections/exclusive',
    ]);
  });
});

describe('Home carousel width', () => {
  it.each([320, 360, 375, 393, 411, 430, 480])(
    'keeps a usable card width at %ipt',
    (width) => {
      const cardWidth = responsiveCarouselCardWidth(width);
      expect(cardWidth).toBeGreaterThanOrEqual(150);
      // A carousel card must never fill the content column, or it stops
      // reading as a carousel.
      expect(cardWidth).toBeLessThan(width - 32);
    },
  );

  it('stops growing once the content column is capped', () => {
    expect(responsiveCarouselCardWidth(CONTENT_MAX_WIDTH)).toBe(
      responsiveCarouselCardWidth(1024),
    );
  });
});
