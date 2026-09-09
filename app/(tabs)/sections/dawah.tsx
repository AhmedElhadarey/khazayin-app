import { AsyncContent, InlineHeader, MoonMountainBadge, SkeletonCardList } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { useDawahMonthsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// JSX order is [text, badge]. Want text on left, badge on right.

// Page 29: تصميمات دعوية — month-pair cards.
// Data sourced from useDawahMonthsStore (content service layer).

export default function DawahScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useDawahMonthsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openDetail = (id: string) => {
    router.push(`/sections/dawah/${id}` as any);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} coverage="corner" />
      <InlineHeader title="تصميمات دعوية" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonCardList count={5} />}
          emptyMessage="لا يوجد ملصقات دعوية"
        >
          {data.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => openDetail(g.id)}
              style={({ pressed }) => [
                styles.row,
                KhazainShadows.card,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              {/* Physical left → right: count, title, month badge
                  (Figma node 2120:942). */}
              <View style={styles.countBlock}>
                <Text style={styles.count}>{g.count}</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {g.title}
              </Text>
              <MoonMountainBadge size={CARD_DENSITY.lectureBadgeDisc} />
            </Pressable>
          ))}
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
    gap: CARD_DENSITY.listGap,
  },
  row: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.lectureCardMinHeight,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  countBlock: {
    justifyContent: 'center',
    flexShrink: 0,
  },
  count: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '500',
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
  },
});
