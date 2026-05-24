/**
 * services/search/rowProps.tsx
 * ----------------------------
 * Shared row-shape helper used by BOTH:
 *   - app/search.tsx — for SearchResultRow rendering of search results
 *   - components/khazain/library/MySavedSection.tsx — for SavedRow rendering
 *
 * Per design §7.4 + §9.4: single source of truth for the per-type icon,
 * title, subtitle, meta, and navigation route across both features.
 *
 * Track: khazain-saved_20260511  T9
 */

import { MicBadge, OpenBookBadge, ProphetMedallionBadge, TulipBadge } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import type { Book, Lecture, Scholar, Surah, SavedItem } from '@/types/content';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SearchResultGroup } from './searchAll';

// ---------------------------------------------------------------------------
// Inline badges shared between search + library
// ---------------------------------------------------------------------------

/** Surah index circle: cream bg, gold border, gold Arabic-Indic numeral. */
export function SurahNumberBadge({ displayNumber }: { displayNumber: string }) {
  return (
    <View style={badgeStyles.surahBadge}>
      <Text style={badgeStyles.surahBadgeText} numberOfLines={1}>
        {displayNumber}
      </Text>
    </View>
  );
}

/** Scholar medallion: 40px gold disc with the Arabic honorific 'ع'. */
export function ScholarMedallion() {
  return (
    <View style={badgeStyles.scholarBadge}>
      <Text style={badgeStyles.scholarBadgeText}>ع</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  surahBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1, borderColor: KhazainColors.gold200,
    alignItems: 'center', justifyContent: 'center',
  },
  surahBadgeText: {
    fontFamily: 'TheSansArabic', fontSize: 14, fontWeight: '700',
    color: KhazainColors.gold200,
  },
  scholarBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: KhazainColors.gold200,
    alignItems: 'center', justifyContent: 'center',
  },
  scholarBadgeText: {
    fontFamily: 'TheMixArab', fontSize: 18, fontWeight: '700',
    color: KhazainColors.cream50,
  },
});

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
 * Build row props for a search result group + item.
 * Used by app/search.tsx.
 */
export function rowPropsForSearchResult(
  group: SearchResultGroup,
  item: { id: string },
): RowProps {
  if (group.type === 'surah') {
    const s = item as Surah;
    return {
      iconNode: <SurahNumberBadge displayNumber={s.displayNumber} />,
      title: s.name,
      subtitle: s.meta,
      route: '/sections/mushaf',
    };
  }
  if (group.type === 'scholar') {
    const s = item as Scholar;
    return {
      iconNode: <ScholarMedallion />,
      title: s.name,
      route: `/sections/scholar/${s.id}`,
    };
  }
  if (group.type === 'book') {
    const b = item as Book;
    return {
      iconNode: <OpenBookBadge size={40} />,
      title: b.title,
      route: '/sections/books',
    };
  }
  const l = item as Lecture;
  return {
    iconNode: lectureIconFor(l.category),
    title: l.title,
    subtitle: l.scholar,
    meta: l.duration,
    route: lectureRouteFor(l.category),
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
        iconNode: <SurahNumberBadge displayNumber={item.snapshot.displayNumber} />,
        title: item.snapshot.name,
        subtitle: item.snapshot.meta,
        route: '/sections/mushaf',
      };
    case 'scholar':
      return {
        iconNode: <ScholarMedallion />,
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
