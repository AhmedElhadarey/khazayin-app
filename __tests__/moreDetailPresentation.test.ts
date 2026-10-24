import { ABOUT_CARDS, ABOUT_PARAGRAPHS, ABOUT_SECTION_ORDER } from '@/data/content/about';
import { ARCHIVE_ROWS } from '@/data/content/archive';

/**
 * Task 5.2 — Contact (2106:2598), About (2106:2712) and Archive (2558:1334).
 *
 * Section order and Archive destinations.
 */

describe('About screen presentation (2106:2712)', () => {
  it('runs paragraphs before the info cards', () => {
    expect(ABOUT_SECTION_ORDER).toEqual(['paragraphs', 'cards']);
  });

  it('keeps the three reference paragraphs in order', () => {
    expect(ABOUT_PARAGRAPHS).toHaveLength(3);
    expect(ABOUT_PARAGRAPHS[0]).toContain('مؤسسة خزائن الرحمن');
    expect(ABOUT_PARAGRAPHS[2]).toContain('٦٥ قناة يوتيوب');
  });

  it('shows vision then mission', () => {
    expect(ABOUT_CARDS.map((c) => c.id)).toEqual(['vision', 'mission']);
    expect(ABOUT_CARDS.map((c) => c.title)).toEqual(['رؤيتنا', 'رسالتنا']);
  });

  it('has no empty copy', () => {
    [...ABOUT_PARAGRAPHS, ...ABOUT_CARDS.map((c) => c.body)].forEach((text) => {
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('Archive destinations (2558:1334)', () => {
  it('lists the three Figma categories in reference order', () => {
    expect(ARCHIVE_ROWS.map((r) => r.id)).toEqual(['scholars', 'books', 'audio']);
  });

  it('routes every row to a real section screen', () => {
    // The audit found the audiobooks row with nowhere to go.
    expect(ARCHIVE_ROWS.map((r) => r.route)).toEqual([
      '/sections/scholar',
      '/sections/books',
      '/sections/audiobooks',
    ]);
  });

  it('gives every row a title, subtitle and count', () => {
    ARCHIVE_ROWS.forEach((row) => {
      expect([row.id, row.title.length > 0]).toEqual([row.id, true]);
      expect([row.id, row.subtitle.length > 0]).toEqual([row.id, true]);
      expect([row.id, row.count.length > 0]).toEqual([row.id, true]);
    });
  });
});
