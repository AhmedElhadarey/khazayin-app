import {
  LIBRARY_EXTENSION_SECTIONS,
  LIBRARY_IN_PLACE_EXTENSIONS,
  LIBRARY_PROGRESS_STAT_ORDER,
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
    LIBRARY_EXTENSION_SECTIONS.filter((key) => !LIBRARY_IN_PLACE_EXTENSIONS.includes(key as 'savedList')).forEach((key) => {
      expect([key, LIBRARY_SECTION_ORDER.indexOf(key) > lastReference]).toEqual([key, true]);
    });
  });

  it('keeps the newer metrics rather than deleting them', () => {
    expect([...LIBRARY_EXTENSION_SECTIONS].sort()).toEqual([
      'insights',
      'playlists',
      'progressStats',
      'savedList',
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

describe('savedList is an in-place extension (LIBRARY-26)', () => {
  it('is not part of the frame but keeps its place between the chips and the audiobook block', () => {
    expect(LIBRARY_REFERENCE_SECTIONS).not.toContain('savedList');
    expect(LIBRARY_EXTENSION_SECTIONS).toContain('savedList');
    expect(LIBRARY_IN_PLACE_EXTENSIONS).toEqual(['playlists', 'savedList']);
    const at = (k: (typeof LIBRARY_SECTION_ORDER)[number]) => LIBRARY_SECTION_ORDER.indexOf(k);
    expect(at('filters')).toBeLessThan(at('savedList'));
    expect(at('savedList')).toBeLessThan(at('audiobookProgress'));
  });
});

describe('Library summary cards', () => {
  it('orders the three cards physical left to right as in the frame', () => {
    expect(LIBRARY_SUMMARY_CARD_ORDER).toEqual(['reminders', 'quranWird', 'notes']);
  });
});

describe('Library progress stats row (no frame — design 2026-10-21 §4.4)', () => {
  it('orders the cards physical left to right so pages read first at the right', () => {
    expect(LIBRARY_PROGRESS_STAT_ORDER).toEqual(['lectures', 'juz', 'pages']);
  });

  it('sits where completedLectures sat: last, below the whole frame', () => {
    expect(LIBRARY_SECTION_ORDER[LIBRARY_SECTION_ORDER.length - 1]).toBe('progressStats');
    expect(LIBRARY_SECTION_ORDER).not.toContain('completedLectures');
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

  it('keeps the reminder and suggestion sections as visible as before', () => {
    // These were unconditional before this track; repositioning them must not
    // also hide them.
    (['smartReminders', 'wirdSuggestion', 'progressStats'] as const)
      .forEach((key) => {
        (['all', 'saved', 'notes', 'completed', 'playlist', 'history'] as LibraryFilter[]).forEach((filter) => {
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

describe('chips that select a view of their own (LIBRARY-17)', () => {
  it('shows the audiobook cards under everything but the playlist view', () => {
    (['all', 'saved', 'notes', 'completed', 'history'] as LibraryFilter[]).forEach((f) =>
      expect(isLibrarySectionVisible('audiobookProgress', f)).toBe(true),
    );
    expect(isLibrarySectionVisible('audiobookProgress', 'playlist')).toBe(false);
  });

  it('shows the playlists empty state only under قوائم التشغيل', () => {
    expect(isLibrarySectionVisible('playlists', 'playlist')).toBe(true);
    (['all', 'saved', 'notes', 'completed', 'history'] as LibraryFilter[]).forEach((f) =>
      expect(isLibrarySectionVisible('playlists', f)).toBe(false),
    );
  });

  it('places the playlists view right under the chips, before the saved list', () => {
    const at = (k: (typeof LIBRARY_SECTION_ORDER)[number]) => LIBRARY_SECTION_ORDER.indexOf(k);
    expect(at('playlists')).toBe(at('filters') + 1);
    expect(at('playlists')).toBeLessThan(at('savedList'));
    expect(LIBRARY_EXTENSION_SECTIONS).toContain('playlists');
  });

  it('hides the note composer and saved list under المكتمل', () => {
    expect(isLibrarySectionVisible('quickNote', 'completed')).toBe(false);
    expect(isLibrarySectionVisible('savedList', 'completed')).toBe(false);
  });
});
