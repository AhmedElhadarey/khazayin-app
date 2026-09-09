import {
  CONTENT_MAX_WIDTH,
  MIN_TOUCH_TARGET,
  PHYSICAL_ROW,
  REFERENCE_WIDTH,
  RTL_TEXT,
  TAB_BAR,
  TAB_PHYSICAL_ORDER,
  tabBarHeight,
  contentWidth,
  horizontalGutter,
  responsiveCarouselCardWidth,
  shouldShowMainTabBar,
  widthProfile,
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

describe('physical RTL layout contract', () => {
  it('authors the bottom navigation in physical left-to-right order', () => {
    // Figma node 2031:5675, left → right: More, Sections, Library, Home.
    expect(TAB_PHYSICAL_ORDER).toEqual(['more', 'sections', 'library', 'index']);
  });

  it('pins a physically authored row to left-to-right regardless of I18nManager', () => {
    expect(PHYSICAL_ROW).toEqual({ flexDirection: 'row', direction: 'ltr' });
  });

  it('keeps Arabic text right-aligned and right-to-left', () => {
    expect(RTL_TEXT).toEqual({ writingDirection: 'rtl', textAlign: 'right' });
  });

  it('does not read I18nManager to decide physical order', () => {
    // A frozen literal cannot depend on runtime locale state, which is the
    // whole point: module-init order must not change between platforms.
    expect(Object.isFrozen(PHYSICAL_ROW)).toBe(true);
    expect(Object.isFrozen(TAB_PHYSICAL_ORDER)).toBe(true);
  });

  it('keeps the audited reference width and content cap', () => {
    expect(REFERENCE_WIDTH).toBe(393);
    expect(CONTENT_MAX_WIDTH).toBe(480);
    expect(MIN_TOUCH_TARGET).toBe(44);
  });
});

describe('width profiles', () => {
  it.each([320, 360, 374])('treats %ipt as compact', (width) => {
    expect(widthProfile(width)).toBe('compact');
  });

  it.each([375, 393, 411, 430])('treats %ipt as a regular phone', (width) => {
    expect(widthProfile(width)).toBe('regular');
  });

  it.each([431, 480, 1024])('treats %ipt as wide', (width) => {
    expect(widthProfile(width)).toBe('wide');
  });

  describe('horizontalGutter', () => {
    it('uses the Figma 16pt gutter at and above 375', () => {
      expect(horizontalGutter(375)).toBe(16);
      expect(horizontalGutter(393)).toBe(16);
      expect(horizontalGutter(480)).toBe(16);
    });

    it('reduces the gutter before touching type on narrow phones', () => {
      expect(horizontalGutter(320)).toBe(12);
      expect(horizontalGutter(360)).toBe(12);
    });
  });

  describe('contentWidth', () => {
    it('fills the screen minus gutters through 480', () => {
      expect(contentWidth(320)).toBe(296);
      expect(contentWidth(393)).toBe(361);
      expect(contentWidth(411)).toBe(379);
      expect(contentWidth(480)).toBe(448);
    });

    it('caps content above the widest supported phone instead of stretching', () => {
      expect(contentWidth(768)).toBe(448);
      expect(contentWidth(1024)).toBe(448);
    });
  });
});

describe('bottom navigation geometry', () => {
  // Every figure below is quoted from design specification section 5.2 and
  // measured against Figma node 2031:5675.
  it('uses the Figma navy and gold', () => {
    expect(TAB_BAR.background).toBe('#184B76');
    expect(TAB_BAR.indicatorColor).toBe('#C1A584');
    expect(TAB_BAR.activeFill).toBe('rgba(215, 185, 149, 0.16)');
  });

  it('sizes the active item and its indicator to the reference frame', () => {
    expect(TAB_BAR.itemWidth).toBe(67);
    expect(TAB_BAR.itemHeight).toBe(49);
    expect(TAB_BAR.itemRadius).toBe(8);
    expect(TAB_BAR.indicatorWidth).toBe(40);
    expect(TAB_BAR.indicatorHeight).toBe(4);
    expect(TAB_BAR.iconSize).toBe(24);
  });

  it('keeps the active item at or above the minimum touch target', () => {
    expect(TAB_BAR.itemHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(TAB_BAR.itemWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('adds the safe-area inset exactly once', () => {
    // 49pt controls + 34pt iPhone home-indicator inset = the audited 83pt bar.
    expect(tabBarHeight(34)).toBe(83);
    expect(TAB_BAR.controlsHeight).toBe(49);
  });

  it('collapses to the controls row on devices without a bottom inset', () => {
    expect(tabBarHeight(0)).toBe(49);
  });

  it('never subtracts a negative inset', () => {
    expect(tabBarHeight(-10)).toBe(49);
  });
});

describe('root route tab-bar visibility', () => {
  it('shows the bar on exactly the four Figma tab roots', () => {
    const roots = TAB_PHYSICAL_ORDER.map((tab) => (tab === 'index' ? '/' : `/${tab}`));
    expect(roots.every(shouldShowMainTabBar)).toBe(true);
  });
});
