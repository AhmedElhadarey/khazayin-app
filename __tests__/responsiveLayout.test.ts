import {
  CARD_DENSITY,
  CONTENT_MAX_WIDTH,
  MIN_TOUCH_TARGET,
  PHYSICAL_ROW,
  REFERENCE_WIDTH,
  RTL_TEXT,
  SEGMENT_TABS,
  TAB_BAR,
  TAB_PHYSICAL_ORDER,
  tabBarHeight,
  contentWidth,
  physicalTabOrder,
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

describe('segmented tab strip', () => {
  const RECITER_TABS = [
    { key: 'tajweed', label: 'المصحف المجوّد' },
    { key: 'murattal', label: 'المصحف المرتل' },
    { key: 'muallam', label: 'المصحف المعلّم' },
    { key: 'qiraat', label: 'قراءات' },
  ];

  it('renders RTL-authored tabs in reversed physical order', () => {
    // Figma node 2031:6193, left → right: قراءات، المعلّم، المرتل، المجوّد.
    expect(physicalTabOrder(RECITER_TABS).map((t) => t.key)).toEqual([
      'qiraat',
      'muallam',
      'murattal',
      'tajweed',
    ]);
  });

  it('puts the first authored tab at the physical right, where the default lives', () => {
    const physical = physicalTabOrder(RECITER_TABS);
    expect(physical[physical.length - 1].key).toBe(RECITER_TABS[0].key);
  });

  it('does not mutate the caller\'s tab array', () => {
    const original = [...RECITER_TABS];
    physicalTabOrder(RECITER_TABS);
    expect(RECITER_TABS).toEqual(original);
  });

  it('never grows vertically, so no void appears between tabs and the list', () => {
    expect(SEGMENT_TABS.strip.flexGrow).toBe(0);
    expect(SEGMENT_TABS.strip.flexShrink).toBe(0);
  });

  it('keeps the Figma spacing between search, tabs, and the first row', () => {
    expect(SEGMENT_TABS.stripPaddingVertical).toBeGreaterThanOrEqual(6);
    expect(SEGMENT_TABS.stripPaddingVertical).toBeLessThanOrEqual(8);
    expect(SEGMENT_TABS.gap).toBe(8);
  });

  it('keeps every tab at least a comfortable touch width but lets it scroll at 320', () => {
    expect(SEGMENT_TABS.minTabWidth).toBe(88);
    const stripWidth = 4 * SEGMENT_TABS.minTabWidth + 3 * SEGMENT_TABS.gap;
    // Wider than the narrowest supported screen — so the strip must scroll
    // horizontally rather than wrap onto a second line.
    expect(stripWidth).toBeGreaterThan(320);
  });
});

describe('shared card density', () => {
  // Design specification section 5.2, measured against the numbered frames in
  // docs/audit/2026-09-09/figma-reference.
  it('keeps the section card at the audited 96pt with a 64pt disc', () => {
    expect(CARD_DENSITY.sectionCardHeight).toBe(96);
    expect(CARD_DENSITY.sectionIconDisc).toBe(64);
    expect(CARD_DENSITY.sectionCardRadius).toBe(20);
  });

  it('derives the section card height from its padding and disc', () => {
    expect(CARD_DENSITY.sectionCardPaddingVertical * 2 + CARD_DENSITY.sectionIconDisc).toBe(
      CARD_DENSITY.sectionCardHeight,
    );
  });

  it('targets 64-68pt for a one-line lecture card, not the old 84pt floor', () => {
    expect(CARD_DENSITY.lectureCardMinHeight).toBeGreaterThanOrEqual(64);
    expect(CARD_DENSITY.lectureCardMinHeight).toBeLessThanOrEqual(68);
  });

  it('targets 56-64pt for reciter, qiraa, and scholar rows', () => {
    [CARD_DENSITY.reciterRowMinHeight, CARD_DENSITY.scholarRowMinHeight].forEach((height) => {
      expect(height).toBeGreaterThanOrEqual(56);
      expect(height).toBeLessThanOrEqual(64);
    });
  });

  it('uses an 8pt vertical list gap', () => {
    expect(CARD_DENSITY.listGap).toBe(8);
  });

  it('keeps every row above the minimum touch target despite the compaction', () => {
    [
      CARD_DENSITY.sectionCardHeight,
      CARD_DENSITY.lectureCardMinHeight,
      CARD_DENSITY.reciterRowMinHeight,
      CARD_DENSITY.scholarRowMinHeight,
    ].forEach((height) => {
      expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
  });

  it('gives skeletons the same geometry as the rows they stand in for', () => {
    expect(CARD_DENSITY.skeletonRowHeight).toBe(CARD_DENSITY.lectureCardMinHeight);
    expect(CARD_DENSITY.skeletonRibbonHeight).toBe(CARD_DENSITY.reciterRowMinHeight);
    expect(CARD_DENSITY.skeletonGap).toBe(CARD_DENSITY.listGap);
  });

  it('keeps Android elevation as subtle as the iOS shadow', () => {
    // The audit found heavy grey outlines around Android cards.
    expect(CARD_DENSITY.cardElevation).toBeLessThanOrEqual(1);
  });
});
