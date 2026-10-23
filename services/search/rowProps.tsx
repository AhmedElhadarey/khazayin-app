/**
 * services/search/rowProps.tsx
 * ----------------------------
 * Shared row-shape helper used by BOTH:
 *   - app/content-search.tsx — for SearchResultRow rendering of search results
 *   - components/khazain/library/MySavedSection.tsx — for SavedRow rendering
 *
 * Per design §7.4 + §9.4: single source of truth for the per-type icon,
 * title, subtitle, meta, and navigation route across both features.
 *
 * Track: khazain-saved_20260511  T9
 */

import { MicBadge, OpenBookBadge, ProphetMedallionBadge, QuillBadge, TulipBadge } from '@/components/khazain';
import { SurahStar } from '@/components/khazain/primitives/SurahStar';
import { CARD_DENSITY } from '@/constants/layout';
import type { Book, Lecture, Scholar, Surah, SavedItem } from '@/types/content';
import React from 'react';
import type { SearchResultGroup } from './searchAll';
import { searchTargetFor, type SearchTarget } from './searchTarget';

// ---------------------------------------------------------------------------
// Row badges (no frame covers search or the Library saved rows)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Row props builder
// ---------------------------------------------------------------------------

export interface RowProps {
  iconNode: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  route: string;
}

/**
 * A search result row: same shape as a saved row, but it carries where the
 * tap goes (a route or playback) instead of a bare route — see searchTarget.ts.
 */
export type SearchRowProps = Omit<RowProps, 'route'> & { target: SearchTarget };

/**
 * Build row props for a search result group + item.
 * Used by app/content-search.tsx.
 */
export function rowPropsForSearchResult(
  group: SearchResultGroup,
  item: { id: string },
): SearchRowProps {
  const target = searchTargetFor(group, item);
  if (group.type === 'surah') {
    const s = item as Surah;
    return {
      iconNode: <SurahStar index={s.displayNumber} size={CARD_DENSITY.surahBadgeDisc} />,
      title: s.name,
      subtitle: s.meta,
      target,
    };
  }
  if (group.type === 'scholar') {
    const s = item as Scholar;
    return {
      iconNode: <QuillBadge size={40} />,
      title: s.name,
      target,
    };
  }
  if (group.type === 'book') {
    const b = item as Book;
    return {
      iconNode: <OpenBookBadge size={40} />,
      title: b.title,
      target,
    };
  }
  const l = item as Lecture;
  return {
    iconNode: lectureIconFor(l.category),
    title: l.title,
    subtitle: l.scholar,
    meta: l.duration,
    target,
  };
}

/**
 * Build row props from a SavedItem (Library section). Reads from the
 * snapshot — no domain-store lookup required.
 */
export function rowPropsForSavedItem(item: SavedItem): RowProps {
  switch (item.snapshot.type) {
    case 'surah':
      return {
        iconNode: <SurahStar index={item.snapshot.displayNumber} size={CARD_DENSITY.surahBadgeDisc} />,
        title: item.snapshot.name,
        subtitle: item.snapshot.meta,
        route: '/sections/mushaf',
      };
    case 'scholar':
      return {
        iconNode: <QuillBadge size={40} />,
        title: item.snapshot.name,
        route: `/sections/scholar/${item.entityId}`,
      };
    case 'book':
      return {
        iconNode: <OpenBookBadge size={40} />,
        title: item.snapshot.title,
        route: '/sections/books',
      };
    case 'lecture':
      return {
        iconNode: lectureIconFor(item.snapshot.category),
        title: item.snapshot.title,
        subtitle: item.snapshot.scholar,
        meta: item.snapshot.duration,
        route: lectureRouteFor(item.snapshot.category),
      };
    case 'dawah':
      return {
        iconNode: <OpenBookBadge size={40} />,
        title: item.snapshot.title,
        subtitle: item.snapshot.body,
        route: '/sections/dawah',
      };
  }
}

// ---------------------------------------------------------------------------
// Lecture category helpers
// ---------------------------------------------------------------------------

function lectureIconFor(category: Lecture['category']): React.ReactNode {
  return category === 'prophet' ? <ProphetMedallionBadge size={40} /> :
         category === 'queen'   ? <TulipBadge size={40} /> :
         category === 'radio'   ? <MicBadge size={40} /> :
         category === 'book'    ? <OpenBookBadge size={40} /> :
         /* scholar | general */  <OpenBookBadge size={40} />;
}

function lectureRouteFor(category: Lecture['category']): string {
  return category === 'prophet' ? '/sections/prophet' :
         category === 'book'    ? '/sections/books' :
         category === 'queen'   ? '/sections/queen' :
         category === 'radio'   ? '/sections/radio' :
         /* scholar | general */  '/(tabs)/sections';
}
