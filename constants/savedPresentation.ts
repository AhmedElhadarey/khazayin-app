/**
 * The Library's محفوظاتي block — grouping, order and copy.
 *
 * Frame 2031:4659 draws no saved list (filters DIV-141 lead straight into
 * books-progress-198), so this file — not Figma — is the authority for the
 * section's internals. Design: docs/plans/2026-10-21-saved-content-bookmarks-design.md §6.
 *
 * Order: groups by their most recent save (newest group first), entries
 * newest-first inside each group — so the first row is always the last save.
 */
import type { SavedItem, SavedType } from '@/types/content';

export const SAVED_GROUP_TITLES: Readonly<Record<SavedType, string>> = Object.freeze({
  surah: 'سور',
  scholar: 'علماء',
  book: 'كتب',
  lecture: 'محاضرات',
  dawah: 'تصاميم',
});

export const SAVED_EMPTY_COPY = Object.freeze({
  title: 'ابدأ مكتبتك الشخصية',
  body: 'احفظ ما تحب الرجوع إليه — سوراً، علماء، كتباً ومحاضرات — لتجده هنا في أي وقت.',
});

export interface SavedGroup {
  type: SavedType;
  title: string;
  count: number;
  entries: SavedItem[];
}

export function groupSavedItems(items: readonly SavedItem[]): SavedGroup[] {
  // Stable sort: equal timestamps keep store order.
  const newestFirst = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const byType = new Map<SavedType, SavedItem[]>(); // insertion order = recency of each group's newest entry
  for (const it of newestFirst) {
    const bucket = byType.get(it.type);
    if (bucket) bucket.push(it);
    else byType.set(it.type, [it]);
  }
  return Array.from(byType, ([type, entries]) => ({
    type,
    title: SAVED_GROUP_TITLES[type],
    count: entries.length,
    entries,
  }));
}
