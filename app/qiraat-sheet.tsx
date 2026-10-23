import { AsyncContent, ReciterRow, SkeletonRibbonList } from '@/components/khazain';
import { SheetShell } from '@/components/khazain/sheets';
import { CARD_DENSITY } from '@/constants/layout';
import { DEFAULT_SETTINGS } from '@/constants/settings';
import { pickQiraa } from '@/services/reciterNavigation';
import { useQiratStore, useSettingsStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

// Figma 2457:954: «اختر القراءة» as a bottom sheet over the reciter screen.
// Presented as a root-level transparentModal (see app/_layout.tsx); the
// backdrop, Android back and the swipe-back all close it through the router.
export default function QiraatSheet() {
  const router = useRouter();
  const close = () => router.back();
  const { data, status, error, fetch, refresh } = useQiratStore();
  const defaultQiraaId = useSettingsStore((s) => s.defaultQiraaId);
  const setDefaultQiraa = useSettingsStore((s) => s.setDefaultQiraa);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Stale-id fallback (track 002): revert a persisted default the content
  // service no longer lists, so the highlight stays consistent.
  useEffect(() => {
    if (data.length === 0) return;
    if (!data.some((q) => q.id === defaultQiraaId)) {
      setDefaultQiraa(DEFAULT_SETTINGS.defaultQiraaId);
    }
  }, [data, defaultQiraaId, setDefaultQiraa]);

  return (
    <SheetShell title="اختر القراءة" onClose={close} layout="list">
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonRibbonList count={10} />}
          emptyMessage="لا توجد قراءات متاحة"
        >
          {/* The gap sits on our own view: AsyncContent wraps its children. */}
          <View style={styles.rows}>
            {data.map((q) => (
              <ReciterRow
                key={q.id}
                title={q.name}
                isDefault={q.id === defaultQiraaId}
                onPress={() => pickQiraa(q.id, setDefaultQiraa, close)}
              />
            ))}
          </View>
        </AsyncContent>
      </ScrollView>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  rows: { gap: CARD_DENSITY.lectureListGap },
});
