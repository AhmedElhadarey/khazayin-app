import { AsyncContent, ListRowCard, SearchPill, SkeletonRibbonList } from '@/components/khazain';
import { SECTION_ICONS, SectionIconKey } from '@/components/khazain/icons/sections';
import { KhazainColors } from '@/constants/theme';
import { useSectionsStore } from '@/store';
import type { SectionEntry } from '@/types/content';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SectionsScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useSectionsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const open = (s: SectionEntry) => {
    if (s.route) {
      router.push(s.route as any);
    } else {
      Alert.alert(s.title, 'قريباً بإذن الله');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>الأقسام</Text>
        </View>
        <View style={styles.searchBlock}>
          <SearchPill placeholder="ابحث في الأقسام.." onPress={() => router.push('/search' as any)} />
        </View>
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonRibbonList count={9} />}
          emptyMessage="لا يوجد أقسام متاحة"
        >
          <View style={styles.list}>
            {data.map((s) => {
              const Icon = SECTION_ICONS[s.iconKey as SectionIconKey];
              return (
                <ListRowCard
                  key={s.id}
                  title={s.title}
                  subtitle={s.subtitle}
                  count={s.count ?? undefined}
                  onPress={() => open(s)}
                  icon={<Icon size={34} />}
                />
              );
            })}
          </View>
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  container: { paddingTop: 0 },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  h1: {
    fontFamily: 'TheSansArabic',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: KhazainColors.inkTitle,
    writingDirection: 'rtl',
  },
  searchBlock: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
});
