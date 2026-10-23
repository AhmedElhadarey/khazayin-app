import { AsyncContent, InlineHeader, MoonMountainBadge, SkeletonCardList } from '@/components/khazain';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useDawahMonthsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useLineClamp } from '@/hooks/useLineClamp';

// JSX order is [text, badge]. Want text on left, badge on right.

// Page 29: تصميمات دعوية — month-pair cards.
// Data sourced from useDawahMonthsStore (content service layer).

export default function DawahScreen() {
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useDawahMonthsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openDetail = (id: string) => {
    router.push(`/sections/dawah/${id}` as any);
  };

  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const oneLine = useLineClamp(1);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt corners="single" bandHeight={headerBandHeight(insets.top, 'inline', fontScale)} />
      <InlineHeader title="تصميمات دعوية" onBack={() => router.back()} style={columnStyle} />
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 24 }, columnStyle]}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonCardList count={5} />}
          emptyMessage="لا يوجد ملصقات دعوية"
        >
          {/* The gap sits on a view of our own: AsyncContent renders its
              children inside a wrapper, so a `gap` on the scroll container
              never reaches the rows. */}
          <View style={styles.rows}>
          {data.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => openDetail(g.id)}
              style={({ pressed }) => [
                styles.row,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              {/* Physical left → right: count, title, month badge
                  (Figma node 2120:942). */}
              <View style={styles.countBlock}>
                <Text style={styles.count}>{g.count}</Text>
              </View>
              <Text style={styles.title} numberOfLines={oneLine}>
                {g.title}
              </Text>
              <MoonMountainBadge size={CARD_DENSITY.lectureBadgeDisc} />
            </Pressable>
          ))}
          </View>
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // node 2120:942 `DIV-139` steps 60 over a 56 row.
  rows: {
    gap: CARD_DENSITY.dawahListGap,
  },
  // Node 2120:942 `DIV-139` — 361 x 56 at radius 16 behind a 1pt `#D9D6D3`
  // hairline, inset 8, casting no shadow.
  row: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    // 1 + 7 + 40 + 7 + 1 = 56.
    paddingVertical: 7,
    paddingHorizontal: CARD_DENSITY.lectureCardPaddingHorizontal,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...textStyle('cardTitle', { color: KhazainColors.inkTitle }),
    flex: 1,
    minWidth: 0,
  },
  countBlock: {
    justifyContent: 'center',
    flexShrink: 0,
  },
  count: textStyle('label', { color: KhazainColors.ink500 }),
});
