import { BookmarkIcon } from '@/components/khazain/icons';
import { BookmarkButton } from '@/components/khazain/primitives';
import { SearchGroupHeader, SearchResultRow } from '@/components/khazain/search';
import { KhazainColors } from '@/constants/theme';
import { rowPropsForSavedItem } from '@/services/search';
import { useSavedStore } from '@/store';
import type { SavedItem, SavedType } from '@/types/content';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * MySavedSection — the new 'محفوظاتي' block in the Library tab.
 * Groups saved items by type; per-group count; empty state with revised
 * copy per Board condition #8.
 *
 * Track: khazain-saved_20260511  T14
 */

const GROUP_ORDER: SavedType[] = ['surah', 'scholar', 'book', 'lecture', 'dawah'];
const GROUP_TITLES: Record<SavedType, string> = {
  surah: 'سور',
  scholar: 'علماء',
  book: 'كتب',
  lecture: 'محاضرات',
  dawah: 'تصاميم',
};

export function MySavedSection() {
  const items = useSavedStore((s) => s.items);

  if (items.length === 0) {
    return <EmptySaved />;
  }

  const groups = GROUP_ORDER
    .map((type) => ({ type, entries: items.filter((it) => it.type === type) }))
    .filter((g) => g.entries.length > 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>محفوظاتي</Text>
        <View style={styles.totalCountChip}>
          <Text style={styles.totalCountText}>{items.length}</Text>
        </View>
      </View>
      {groups.map((g) => (
        <View key={g.type}>
          <SearchGroupHeader title={GROUP_TITLES[g.type]} count={g.entries.length} />
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
        onPress={() => router.push(props.route as never)}
      />
      <View style={styles.rowBookmarkSlot} pointerEvents="box-none">
        <BookmarkButton
          type={item.type}
          entityId={item.entityId}
          snapshot={item.snapshot}
          variant="light"
        />
      </View>
    </View>
  );
}

function EmptySaved() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBubble}>
        <BookmarkIcon size={28} color={KhazainColors.gold500} />
      </View>
      <Text style={styles.emptyTitle}>ابدأ مكتبتك الشخصية</Text>
      <Text style={styles.emptyBody}>
        احفظ ما تحب الرجوع إليه — سوراً، علماء، كتباً ومحاضرات — لتجده هنا في أي وقت.
      </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
  totalCountChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: KhazainColors.gold200,
  },
  totalCountText: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '700',
    color: KhazainColors.gold200,
  },
  rowContainer: {
    position: 'relative',
  },
  rowBookmarkSlot: {
    position: 'absolute',
    top: '50%',
    left: 16,
    marginTop: -16,
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
  emptyTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyBody: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink500,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
});
