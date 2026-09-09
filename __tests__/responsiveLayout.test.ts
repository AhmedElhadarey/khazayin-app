import {
  responsiveCarouselCardWidth,
  shouldShowMainTabBar,
} from '@/constants/layout';

describe('responsive layout helpers', () => {
  describe('shouldShowMainTabBar', () => {
    it.each(['/', '/library', '/sections', '/more', '/sections/']) (
      'shows the tab bar on the root route %s',
      (pathname) => {
        expect(shouldShowMainTabBar(pathname)).toBe(true);
      },
    );

    it.each([
      '/sections/books',
      '/sections/scholar/s1',
      '/sections/mushaf',
      '/more/contact',
      '/more/settings',
      '/search',
    ])('hides the tab bar on the secondary route %s', (pathname) => {
      expect(shouldShowMainTabBar(pathname)).toBe(false);
    });
  });

  describe('responsiveCarouselCardWidth', () => {
    it('keeps cards usable on a 320-point screen', () => {
      expect(responsiveCarouselCardWidth(320)).toBeCloseTo(153.33, 1);
    });

    it('matches the existing proportion on an iPhone 16', () => {
      expect(responsiveCarouselCardWidth(393)).toBeCloseTo(193.89, 1);
    });

    it('caps cards on tablets and large windows', () => {
      expect(responsiveCarouselCardWidth(1024)).toBe(216.1);
    });

    it('does not shrink below the supported compact width', () => {
      expect(responsiveCarouselCardWidth(240)).toBe(150);
    });
  });
});
