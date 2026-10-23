import { BookmarkIcon } from '@/components/khazain/icons';
import { BookmarkButton } from '@/components/khazain/primitives';
import { SearchGroupHeader, SearchResultRow } from '@/components/khazain/search';
import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { groupSavedItems, SAVED_EMPTY_COPY } from '@/constants/savedPresentation';
import { toArabicDigits } from '@/constants/progress';
import { textStyle } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';
import { rowPropsForSavedItem } from '@/services/search';
import { useSavedStore } from '@/store';
import type { SavedItem } from '@/types/content';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * MySavedSection — the new 'محفوظاتي' block in the Library tab.
 * Groups saved items by type; per-group count; empty state with revised
 * copy per Board condition #8. Grouping, order and copy live in
 * constants/savedPresentation.ts (groups ordered by most recent save).
 *
 * Track: khazain-saved_20260511  T14
 */

export function MySavedSection() {
  const items = useSavedStore((s) => s.items);

  if (items.length === 0) {
    return <EmptySaved />;
  }

  const groups = groupSavedItems(items);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {/* Physical left → right: the count, then the title at the right. */}
        <View style={styles.totalCountChip}>
          <Text style={styles.totalCountText}>{toArabicDigits(items.length)}</Text>
        </View>
        <Text style={styles.title}>محفوظاتي</Text>
      </View>
      {groups.map((g) => (
        <View key={g.type}>
          <SearchGroupHeader title={g.title} count={g.count} />
          {g.entries.map((it) => (
            <SavedRow key={it.id} item={it} />
          ))}
        </View>
      ))}
    </View>
  );
}

function SavedRow({ item }: { item: SavedItem }) {
  const router = useRouter();
  const props = rowPropsForSavedItem(item);

  return (
    <View style={styles.rowContainer}>
      <SearchResultRow
        iconNode={props.iconNode}
        title={props.title}
        subtitle={props.subtitle}
        meta={props.meta}
        accessory={
          <BookmarkButton
            type={item.type}
            entityId={item.entityId}
            snapshot={item.snapshot}
            variant="light"
          />
        }
        onPress={() => router.push(props.route as never)}
      />
    </View>
  );
}

function EmptySaved() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBubble}>
        <BookmarkIcon size={28} color={KhazainColors.gold500} />
      </View>
      <Text style={styles.emptyTitle}>{SAVED_EMPTY_COPY.title}</Text>
      <Text style={styles.emptyBody}>{SAVED_EMPTY_COPY.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerRow: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  title: textStyle('sectionTitle', { color: KhazainColors.inkHeading }),
  totalCountChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: KhazainColors.iconChipBg,
  },
  totalCountText: textStyle('label', { color: KhazainColors.ink500 }),
  rowContainer: {
    ...PHYSICAL_BOX,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  emptyIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: KhazainColors.gold200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: textStyle('sectionTitle', {
    color: KhazainColors.inkHeading,
    textAlign: 'center',
  }),
  emptyBody: textStyle('bodyCompact', {
    color: KhazainColors.ink500,
    textAlign: 'center',
  }),
});
