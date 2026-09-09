/**
 * data/content/archive.ts
 * ----------------------
 * The three archive categories from Figma node 2558:1334, each with the
 * section screen it opens. Extracted from the screen so the destinations are
 * asserted rather than buried in JSX — the audit found the audiobooks row with
 * nowhere to go.
 */

export type ArchiveRow = {
  id: 'scholars' | 'books' | 'audio';
  title: string;
  subtitle: string;
  count: string;
  route: string;
};

export const ARCHIVE_ROWS: readonly ArchiveRow[] = [
  {
    id: 'scholars',
    title: 'العلماء والمشايخ',
    subtitle: 'محاضرات ودروس كبار العلماء',
    count: '٢٤٣ حلقة',
    route: '/sections/scholar',
  },
  {
    id: 'books',
    title: 'الكتب العلمية',
    subtitle: 'شروحات الكتب الإسلامية المهمة',
    count: '٨٩ حلقة',
    route: '/sections/books',
  },
  {
    id: 'audio',
    title: 'كتب صوتية',
    subtitle: 'كتب إسلامية مقروءة بصوت عذب',
    count: '٦٧ كتاب',
    route: '/sections/audiobooks',
  },
];
