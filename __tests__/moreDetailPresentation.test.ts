import { ABOUT_CARDS, ABOUT_PARAGRAPHS, ABOUT_SECTION_ORDER } from '@/data/content/about';
import { ARCHIVE_ROWS } from '@/data/content/archive';
import {
  CONTACT_INCOMPLETE_ALERT,
  CONTACT_SENT_ALERT,
  isContactFormComplete,
} from '@/services/contactForm';

/**
 * Task 5.2 — Contact (2106:2598), About (2106:2712) and Archive (2558:1334).
 *
 * Section order, Archive destinations, and contact validation behaviour.
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

describe('Contact form validation (2106:2598)', () => {
  const full = { name: 'أحمد', email: 'a@example.com', message: 'السلام عليكم' };

  it('accepts a fully filled form', () => {
    expect(isContactFormComplete(full)).toBe(true);
  });

  it.each(['name', 'email', 'message'] as const)('rejects a missing %s', (field) => {
    expect(isContactFormComplete({ ...full, [field]: '' })).toBe(false);
  });

  it.each(['name', 'email', 'message'] as const)(
    'rejects a whitespace-only %s',
    (field) => {
      expect(isContactFormComplete({ ...full, [field]: '   \n\t' })).toBe(false);
    },
  );

  it('keeps the Arabic alert copy', () => {
    expect(CONTACT_INCOMPLETE_ALERT.title).toBe('البيانات ناقصة');
    expect(CONTACT_INCOMPLETE_ALERT.body).toBe('يرجى ملء جميع الحقول.');
    expect(CONTACT_SENT_ALERT.title).toBe('تم الإرسال');
  });
});
