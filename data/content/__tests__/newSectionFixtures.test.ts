import { existsSync } from 'fs';
import path from 'path';

import { AUDIOBOOKS } from '../audiobooks';
import { EXCLUSIVE_ITEMS } from '../exclusive';
import { PENDING_SECTION_ROUTES, SECTIONS } from '../sections';
import { HOME_QUICK_CHIPS } from '@/constants/homePresentation';
import { ARCHIVE_ROWS } from '../archive';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Figma nodes 2869:2088 (audiobooks) and 2869:2306 (exclusive content). */
describe('Audiobook and exclusive fixtures', () => {
  it('ships deterministic audiobook rows', () => {
    expect(AUDIOBOOKS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(AUDIOBOOKS.map((a) => a.id)).size).toBe(AUDIOBOOKS.length);
    AUDIOBOOKS.forEach((item) => {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.category).toBe('general');
    });
  });

  it('ships deterministic exclusive rows', () => {
    expect(EXCLUSIVE_ITEMS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(EXCLUSIVE_ITEMS.map((a) => a.id)).size).toBe(EXCLUSIVE_ITEMS.length);
  });

  it('does not collide ids between the two new domains', () => {
    const ids = [...AUDIOBOOKS, ...EXCLUSIVE_ITEMS].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Route coverage for the new sections', () => {
  it('leaves no section without a route', () => {
    expect(SECTIONS.filter((s) => s.route === null)).toEqual([]);
    expect(PENDING_SECTION_ROUTES).toEqual([]);
  });

  it('routes the audiobook and exclusive sections at their screens', () => {
    expect(SECTIONS.find((s) => s.id === 'audiobooks')?.route).toBe('/sections/audiobooks');
    expect(SECTIONS.find((s) => s.id === 'exclusive')?.route).toBe('/sections/exclusive');
  });

  it('has a real screen file behind each new route', () => {
    ['audiobooks', 'exclusive'].forEach((name) => {
      expect([name, existsSync(path.join(REPO_ROOT, `app/(tabs)/sections/${name}.tsx`))]).toEqual([
        name,
        true,
      ]);
    });
  });

  it('activates every Home quick chip', () => {
    HOME_QUICK_CHIPS.forEach((chip) => {
      expect([chip.id, chip.route.startsWith('/sections/')]).toEqual([chip.id, true]);
    });
  });

  it('routes the Archive audiobooks row at the audiobooks screen', () => {
    const audio = ARCHIVE_ROWS.find((row) => row.id === 'audio');
    expect(audio?.route).toBe('/sections/audiobooks');
  });

  it('gives every Archive row a destination', () => {
    ARCHIVE_ROWS.forEach((row) => {
      expect([row.id, row.route]).toEqual([row.id, expect.stringMatching(/^\/sections\//)]);
    });
  });
});
