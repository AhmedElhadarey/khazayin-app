/**
 * Tests for `services/notesExporter` (T-NE-1..T-NE-8).
 *
 * `react-native`'s `Share.share` is mocked via `jest.mock` so this file does
 * not need a real RN runtime. `Date.now()` is frozen with `jest.useFakeTimers`
 * so the relative-time helper produces deterministic Arabic strings.
 */

import { Share } from 'react-native';

import type { Note } from '@/store/notesStore';
import { formatNotesExport, shareNotes } from '@/services/notesExporter';

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
}));

const mockShare = Share.share as jest.MockedFunction<typeof Share.share>;

// 2026-05-25T12:00:00Z — used as both the "now" arg for the date line and as
// the frozen `Date.now()` so `formatRelativeAr` returns predictable values.
const FROZEN_NOW_MS = Date.UTC(2026, 4, 25, 12, 0, 0);
const FROZEN_NOW = new Date(FROZEN_NOW_MS);

// One hour before "now" → relative-time helper returns 'منذ ساعة'.
const ONE_HOUR_AGO_MS = FROZEN_NOW_MS - 60 * 60 * 1000;

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'بسم الله',
    body: 'الحمد لله رب العالمين',
    createdAt: ONE_HOUR_AGO_MS,
    updatedAt: ONE_HOUR_AGO_MS,
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FROZEN_NOW);
  mockShare.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('formatNotesExport', () => {
  // T-NE-1
  it('returns empty string for an empty notes array', () => {
    expect(formatNotesExport([])).toBe('');
  });

  // T-NE-2
  it('renders a single note using the documented template (exact match)', () => {
    const note = makeNote();

    const expected =
      'خزائن — تصدير الملاحظات\n' +
      'عدد الملاحظات: 1\n' +
      'التاريخ: 2026-05-25\n' +
      '\n' +
      '── بسم الله ──\n' +
      'منذ ساعة\n' +
      '\n' +
      'الحمد لله رب العالمين\n' +
      '\n' +
      '───────\n';

    expect(formatNotesExport([note], FROZEN_NOW)).toBe(expected);
  });

  // T-NE-3
  it('substitutes the title placeholder when title is empty', () => {
    const note = makeNote({ title: '' });
    const out = formatNotesExport([note], FROZEN_NOW);
    expect(out).toContain('── بدون عنوان ──');
    expect(out).not.toContain('── بسم الله ──');
  });

  // T-NE-4
  it('substitutes the body placeholder when body is empty', () => {
    const note = makeNote({ body: '' });
    const out = formatNotesExport([note], FROZEN_NOW);
    expect(out).toContain('(لا يوجد محتوى)');
    expect(out).not.toContain('الحمد لله رب العالمين');
  });

  // T-NE-5
  it('preserves the order of notes received', () => {
    const n1 = makeNote({ id: 'a', title: 'الأول' });
    const n2 = makeNote({ id: 'b', title: 'الثاني' });

    const out = formatNotesExport([n1, n2], FROZEN_NOW);
    const idxFirst = out.indexOf('الأول');
    const idxSecond = out.indexOf('الثاني');

    expect(idxFirst).toBeGreaterThanOrEqual(0);
    expect(idxSecond).toBeGreaterThan(idxFirst);
  });
});

describe('shareNotes', () => {
  // T-NE-6
  it('returns { shared: false } and does not call Share for an empty array', async () => {
    await expect(shareNotes([])).resolves.toEqual({ shared: false });
    expect(mockShare).not.toHaveBeenCalled();
  });

  // T-NE-7
  it('returns { shared: true } when Share resolves sharedAction', async () => {
    mockShare.mockResolvedValueOnce({ action: 'sharedAction' });
    await expect(shareNotes([makeNote()])).resolves.toEqual({ shared: true });
    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  // T-NE-8
  it('returns { shared: false } when Share rejects (error is swallowed)', async () => {
    mockShare.mockRejectedValueOnce(new Error('boom'));
    await expect(shareNotes([makeNote()])).resolves.toEqual({ shared: false });
  });
});
