import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AsyncContent, SkeletonRibbonList } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useQiratStore, useSettingsStore } from '@/store';

import { SelectableRow } from './SelectableRow';

/**
 * Onboarding step 1 (track 003, US2): choose the default qira'a. Reuses the
 * `useQiratStore` + AsyncContent + SelectableRow pattern from `settings-qiraa`.
 * Selection writes the store default; navigation is driven by the footer.
 */
export function QiraaStep(): React.ReactElement {
  const { data, status, error, fetch, refresh } = useQiratStore();
  const selectedId = useSettingsStore((s) => s.defaultQiraaId);
  const setDefaultQiraa = useSettingsStore((s) => s.setDefaultQiraa);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>اختر القراءة الافتراضية</Text>
      <Text style={styles.subtitle}>يمكنك تغييرها لاحقاً من الإعدادات.</Text>
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
          <View accessibilityRole="radiogroup" style={styles.group}>
            {data.map((q) => (
              <SelectableRow
                key={q.id}
                title={q.name}
                selected={q.id === selectedId}
                onPress={() => setDefaultQiraa(q.id)}
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
