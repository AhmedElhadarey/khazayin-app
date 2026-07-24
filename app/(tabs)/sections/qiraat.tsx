import { AsyncContent, ReciterRow, SkeletonRibbonList } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { DEFAULT_SETTINGS } from '@/constants/settings';
import { useQiratStore, useSettingsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 16: آختر القراءة — 10 qira'at rows (bottom-sheet style).
// Each row uses ReciterRow without subtitle.
// Data sourced from useQiratStore (content service layer).

export default function QiraatScreen() {
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useQiratStore();
  const defaultQiraaId = useSettingsStore((s) => s.defaultQiraaId);
  const setDefaultQiraa = useSettingsStore((s) => s.setDefaultQiraa);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Stale-id fallback (track 002): if the persisted default no longer exists
  // in the current qiraat list (e.g., content service removed it), silently
  // revert to the foundation default so the highlight stays consistent.
  useEffect(() => {
    if (data.length === 0) return;
    if (!data.some((q) => q.id === defaultQiraaId)) {
      setDefaultQiraa(DEFAULT_SETTINGS.defaultQiraaId);
    }
  }, [data, defaultQiraaId, setDefaultQiraa]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* sheet-like handle + centered title */}
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>آختر القراءة</Text>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonRibbonList count={10} />}
          emptyMessage="لا توجد قراءات متاحة"
        >
          {data.map((q) => (
            <ReciterRow
              key={q.id}
              title={q.name}
              isDefault={q.id === defaultQiraaId}
              onPress={() => router.back()}
            />
          ))}
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(40,30,19,0.18)',
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    writingDirection: 'rtl',
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
});
