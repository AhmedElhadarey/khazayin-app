import fs from 'fs';
import path from 'path';

import { RESERVED_COLUMNS } from '@/constants/layout';
import { RAIL_EDGE_GUTTER, railListGeometry } from '@/constants/railList';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/** List and scroll screens: `columnStyle` must ride the content container. */
const SCROLL_SCREENS: (readonly [string, number])[] = [
  ['app/(tabs)/sections/books.tsx', 1],
  ['app/(tabs)/sections/prophet.tsx', 1],
  ['app/(tabs)/sections/queen.tsx', 1],
  ['app/(tabs)/sections/radio.tsx', 1],
  ['app/(tabs)/sections/scholar.tsx', 1],
  ['app/(tabs)/sections/reciter.tsx', 1],
  ['app/(tabs)/sections/qiraat.tsx', 1],
  ['app/(tabs)/sections/dawah.tsx', 1],
  ['app/(tabs)/sections/reciter/[id].tsx', 1],
  ['app/(tabs)/sections/dawah/[month].tsx', 1],
  ['app/(tabs)/sections/book/[id].tsx', 1],
  ['components/khazain/sections/RailedLectureList.tsx', 1],
  ['app/(tabs)/library.tsx', 1],
  ['app/(tabs)/more/index.tsx', 1],
  ['app/(tabs)/more/about.tsx', 1],
  ['app/(tabs)/more/archive.tsx', 1],
  ['app/(tabs)/more/contact.tsx', 1],
  ['app/(tabs)/more/settings.tsx', 1],
  ['app/(tabs)/more/settings-progress.tsx', 1],
  ['app/settings-about.tsx', 1],
  ['app/settings-font-size.tsx', 1],
  ['app/settings-notifications.tsx', 1],
  ['app/settings-prayer.tsx', 1],
  ['app/settings-qiraa.tsx', 1],
  ['app/settings-reciter.tsx', 1],
  ['app/settings-wird-goal.tsx', 1],
  ['app/settings-wird-reminder.tsx', 1],
  ['app/content-search.tsx', 2],
];

const HEADER_SCREENS = [
  'app/(tabs)/sections/books.tsx',
  'app/(tabs)/sections/prophet.tsx',
  'app/(tabs)/sections/queen.tsx',
  'app/(tabs)/sections/radio.tsx',
  'app/(tabs)/sections/scholar.tsx',
  'app/(tabs)/sections/reciter.tsx',
  'app/(tabs)/sections/dawah.tsx',
  'app/(tabs)/sections/reciter/[id].tsx',
  'app/(tabs)/sections/dawah/[month].tsx',
  'app/(tabs)/sections/book/[id].tsx',
  'components/khazain/sections/RailedLectureList.tsx',
  'app/(tabs)/more/about.tsx',
  'app/(tabs)/more/archive.tsx',
  'app/(tabs)/more/contact.tsx',
  'app/(tabs)/more/settings-progress.tsx',
  'app/content-search.tsx',
];

const RAIL_SCREENS = [
  'components/khazain/sections/RailedLectureList.tsx',
  'app/(tabs)/sections/scholar.tsx',
  'app/(tabs)/sections/reciter.tsx',
];

describe('every list screen sits in the tablet reading column', () => {
  it.each(SCROLL_SCREENS)('%s reads the layout hook', (file) => {
    const src = read(file);
    expect(src).toMatch(/useResponsiveLayout/);
    expect(src).toMatch(/columnStyle/);
  });

  it.each(SCROLL_SCREENS)('%s puts columnStyle on the content container', (file, count) => {
    const hits = read(file).match(/contentContainerStyle=\{[^\n]*columnStyle/g) ?? [];
    expect(hits.length).toBeGreaterThanOrEqual(count);
  });

  it.each(SCROLL_SCREENS)(
    '%s never puts columnStyle on the ScrollView/FlatList itself',
    (file) => {
      const src = read(file);
      const re = /^\s*style=\{[^\n]*columnStyle/gm;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const tags = [...src.slice(0, m.index).matchAll(/<([A-Z][A-Za-z.]*)\b/g)];
        expect(['ScrollView', 'FlatList']).not.toContain(tags[tags.length - 1]?.[1]);
      }
      expect(src).not.toMatch(/<(ScrollView|FlatList)\b[^\n]*\sstyle=\{[^\n]*columnStyle/);
    },
  );

  it.each(HEADER_SCREENS)('%s gives its fixed header the column', (file) => {
    const src = read(file);
    const tags = [...src.matchAll(/<InlineHeader\b[\s\S]*?\/>/g)].map((m) => m[0]);
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(tag).toMatch(/style=\{columnStyle\}/);
  });

  // archive and settings-progress render their search/input block inside the
  // scroll content, which already carries the column.
  const OUTSIDE_SCROLL = HEADER_SCREENS.filter(
    (f) => !/more\/(archive|settings-progress)/.test(f),
  );
  it.each(OUTSIDE_SCROLL)('%s gives every search block outside the scroll the column', (file) => {
    const src = read(file);
    for (const m of src.matchAll(/<View style=(\{[^\n]*\})>/g)) {
      if (/styles\.(searchBlock|inputRow|stateBlock)\b/.test(m[1])) {
        expect(m[1]).toMatch(/columnStyle/);
      }
    }
  });
});

describe('the alphabet rail follows the column on tablets', () => {
  it.each(RAIL_SCREENS)('%s positions the rail from the reading inset', (file) => {
    const src = read(file);
    expect(src).toMatch(/railListGeometry\(/);
    expect(src).toMatch(/reading\.inset/);
    expect(src).toMatch(/\[LETTER_INDEX_EDGE\]: rail\.edge/);
    expect(src).not.toMatch(/\[LETTER_INDEX_EDGE\]: 16/);
  });
});

describe('onboarding keeps its hero full width and its steps in the column', () => {
  it('puts the progress dots and footer in the column', () => {
    const src = read('app/onboarding.tsx');
    expect(src).toMatch(/useResponsiveLayout/);
    expect(src).toMatch(/styles\.progressWrap, columnStyle/);
    expect(src).toMatch(/styles\.footerWrap, columnStyle/);
  });

  it.each(['Qiraa', 'Reciter', 'Welcome', 'Channels'])('%sStep reads the column', (name) => {
    const src = read(`components/khazain/onboarding/${name}Step.tsx`);
    expect(src).toMatch(/useResponsiveLayout/);
    expect(src).toMatch(/columnStyle\]/);
  });

  it('leaves the welcome gradient full width and only the content in the column', () => {
    const src = read('components/khazain/onboarding/WelcomeStep.tsx');
    expect(src).toMatch(/style=\{styles\.gradient\}/);
    expect(src).toMatch(/contentContainerStyle=\{\[styles\.container, columnStyle\]\}/);
  });
});

describe('railListGeometry', () => {
  it('leaves a phone exactly as authored', () => {
    expect(railListGeometry(false, 123)).toEqual({
      list: { flex: 1, paddingLeft: 16, paddingRight: RESERVED_COLUMNS.letterRailInset },
      inner: undefined,
      edge: 16,
    });
  });

  it('moves the padding inside the column and the rail to its edge on a tablet', () => {
    const g = railListGeometry(true, 24);
    expect(g.list).toEqual({ flex: 1 });
    expect(g.inner).toEqual({
      paddingLeft: RAIL_EDGE_GUTTER,
      paddingRight: RESERVED_COLUMNS.letterRailInset,
    });
    expect(g.edge).toBe(24 + RAIL_EDGE_GUTTER);
  });
});
