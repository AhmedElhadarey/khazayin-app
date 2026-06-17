import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AsyncContent, SkeletonRibbonList } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRecitersStore, useSettingsStore } from '@/store';

import { SelectableRow } from './SelectableRow';

/**
 * Onboarding step 2 (track 003, US3): choose the preferred reciter. Reuses the
 * `useRecitersStore` + AsyncContent + SelectableRow pattern from
 * `settings-reciter`. Visual-only — audio previews are deferred (FR-006); the
 * row's trailing slot can host a play/stop affordance later without restructuring.
 */
export function ReciterStep(): React.ReactElement {
  const { data, status, error, fetch, refresh } = useRecitersStore();
  const selectedId = useSettingsStore((s) => s.preferredReciterId);
  const setPreferredReciter = useSettingsStore((s) => s.setPreferredReciter);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>اختر القارئ المفضّل</Text>
      <Text style={styles.subtitle}>يمكنك تغييره لاحقاً من الإعدادات.</Text>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonRibbonList count={7} />}
          emptyMessage="لا يوجد قراء متاحون"
        >
          <View accessibilityRole="radiogroup" style={styles.group}>
            {data.map((r) => (
              <SelectableRow
                key={r.id}
                title={r.name}
                subtitle={r.styleLabel}
                selected={r.id === selectedId}
                onPress={() => setPreferredReciter(r.id)}
              />
            ))}
          </View>
        </AsyncContent>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  list: { paddingBottom: 16 },
  group: { gap: 8 },
});
