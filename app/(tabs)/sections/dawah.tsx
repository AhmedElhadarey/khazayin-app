import { AsyncContent, InlineHeader, MoonMountainBadge, SkeletonCardList } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { useDawahMonthsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// JSX order is [text, badge]. Want text on left, badge on right.
const HEAD_FLEX: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row-reverse' : 'row';

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
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
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
              {/* Right edge: icon + title (absolute-positioned for RTL safety). */}
              <View style={styles.headBlock}>
                <Text style={styles.title} numberOfLines={1}>
                  {g.title}
                </Text>
                <MoonMountainBadge size={44} />
              </View>
              {/* Left edge: count chip. */}
              <View style={styles.countBlock}>
                <Text style={styles.count}>{g.count}</Text>
              </View>
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
    gap: 10,
  },
  row: {
    minHeight: 70,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    position: 'relative',
    justifyContent: 'center',
  },
  headBlock: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    flexDirection: HEAD_FLEX,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  countBlock: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  count: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '500',
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
  },
});
