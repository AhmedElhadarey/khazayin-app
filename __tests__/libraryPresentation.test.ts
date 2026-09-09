import {
  LIBRARY_EXTENSION_SECTIONS,
  LIBRARY_REFERENCE_SECTIONS,
  LIBRARY_SECTION_ORDER,
  LIBRARY_SUMMARY_CARD_ORDER,
  type LibraryFilter,
  isLibrarySectionVisible,
  visibleLibrarySections,
} from '@/constants/libraryPresentation';

/**
 * Figma node 2031:4659. The audit found the reference hierarchy displaced by
 * newer product metrics, so this suite pins both the reference order and the
 * rule that every addition sits below it.
 */
describe('Library reference hierarchy', () => {
  it('keeps the Figma sections in reference order', () => {
    expect(LIBRARY_REFERENCE_SECTIONS).toEqual([
      'header',
      'search',
      'summaryCards',
      'dailyWird',
      'quickNote',
      'filters',
      'savedList',
      'audiobookProgress',
      'smartReminders',
    ]);
  });

  it('renders the reference sections in that order', () => {
    const positions = LIBRARY_REFERENCE_SECTIONS.map((key) =>
      LIBRARY_SECTION_ORDER.indexOf(key),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions).not.toContain(-1);
  });

  it('places every newer section below the whole reference hierarchy', () => {
    const lastReference = Math.max(
      ...LIBRARY_REFERENCE_SECTIONS.map((key) => LIBRARY_SECTION_ORDER.indexOf(key)),
    );
    LIBRARY_EXTENSION_SECTIONS.forEach((key) => {
      expect([key, LIBRARY_SECTION_ORDER.indexOf(key) > lastReference]).toEqual([key, true]);
    });
  });

  it('keeps the newer metrics rather than deleting them', () => {
    expect([...LIBRARY_EXTENSION_SECTIONS].sort()).toEqual([
      'completedLectures',
      'insights',
      'wirdHistory',
      'wirdSuggestion',
      'wirdTrend',
    ]);
  });

  it('accounts for every section exactly once', () => {
    expect(new Set(LIBRARY_SECTION_ORDER).size).toBe(LIBRARY_SECTION_ORDER.length);
    expect(LIBRARY_SECTION_ORDER).toHaveLength(
      LIBRARY_REFERENCE_SECTIONS.length + LIBRARY_EXTENSION_SECTIONS.length + 1,
    );
    // The extra entry is the DB-failure banner, which is an error state rather
    // than a Figma section.
    expect(LIBRARY_SECTION_ORDER).toContain('dbError');
  });
});

describe('Library summary cards', () => {
  it('orders the three cards physical left to right as in the frame', () => {
    expect(LIBRARY_SUMMARY_CARD_ORDER).toEqual(['reminders', 'quranWird', 'notes']);
  });
});

describe('Library filter visibility', () => {
  const alwaysVisible = ['header', 'search', 'summaryCards', 'dailyWird', 'filters'] as const;

  it.each<LibraryFilter>(['all', 'saved', 'notes', 'history'])(
    'keeps the page frame visible under the %s filter',
    (filter) => {
      alwaysVisible.forEach((key) => {
        expect([filter, key, isLibrarySectionVisible(key, filter)]).toEqual([
          filter,
          key,
          true,
        ]);
      });
    },
  );

  it('shows saved items only under all and saved', () => {
    expect(isLibrarySectionVisible('savedList', 'all')).toBe(true);
    expect(isLibrarySectionVisible('savedList', 'saved')).toBe(true);
    expect(isLibrarySectionVisible('savedList', 'notes')).toBe(false);
    expect(isLibrarySectionVisible('savedList', 'history')).toBe(false);
  });

  it('shows the note composer only under all and notes', () => {
    expect(isLibrarySectionVisible('quickNote', 'all')).toBe(true);
    expect(isLibrarySectionVisible('quickNote', 'notes')).toBe(true);
    expect(isLibrarySectionVisible('quickNote', 'saved')).toBe(false);
  });

  it('keeps the audiobook, reminder, and suggestion sections as visible as before', () => {
    // These were unconditional before this track; repositioning them must not
    // also hide them.
    (['audiobookProgress', 'smartReminders', 'wirdSuggestion', 'completedLectures'] as const)
      .forEach((key) => {
        (['all', 'saved', 'notes', 'history'] as LibraryFilter[]).forEach((filter) => {
          expect([key, filter, isLibrarySectionVisible(key, filter)]).toEqual([
            key,
            filter,
            true,
          ]);
        });
      });
  });

  it('confines the trend, history, and insight extras to the history filter', () => {
    (['wirdHistory', 'wirdTrend', 'insights'] as const).forEach((key) => {
      expect([key, isLibrarySectionVisible(key, 'history')]).toEqual([key, true]);
      expect([key, isLibrarySectionVisible(key, 'all')]).toEqual([key, false]);
      expect([key, isLibrarySectionVisible(key, 'saved')]).toEqual([key, false]);
    });
  });

  it('returns the visible sections in running order', () => {
    const visible = visibleLibrarySections('all');
    expect(visible).toEqual(LIBRARY_SECTION_ORDER.filter((key) => visible.includes(key)));
    expect(visible).toContain('audiobookProgress');
    expect(visible).toContain('smartReminders');
  });

  it('never renders a section the filter hides', () => {
    (['all', 'saved', 'notes', 'history'] as LibraryFilter[]).forEach((filter) => {
      visibleLibrarySections(filter).forEach((key) => {
        expect([filter, key, isLibrarySectionVisible(key, filter)]).toEqual([
          filter,
          key,
          true,
        ]);
      });
    });
  });
});
