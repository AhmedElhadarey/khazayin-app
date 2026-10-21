import React, { useEffect, useMemo } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AsyncContent, SkeletonRibbonList } from '@/components/khazain';
import { PHYSICAL_BOX } from '@/constants/layout';
import { ONBOARDING_POPULAR_RECITER_IDS } from '@/constants/settings';
import { KhazainColors } from '@/constants/theme';
import { selectOnboardingReciters } from '@/services/onboardingReciters';
import { canPreview, stopPreview, toggleReciterPreview } from '@/services/reciterPreview';
import { usePreviewStore, useRecitersStore, useSettingsStore } from '@/store';

import { PreviewButton } from './PreviewButton';
import { SelectableRow } from './SelectableRow';

/**
 * Onboarding reciter step: the reciters with a verified Al-Fatiha preview
 * (`ONBOARDING_POPULAR_RECITER_IDS`) plus the user's current pick, each
 * previewable row with a play/stop control (design 2026-10-21 §4.3). Selecting
 * and previewing are separate controls; previewing never changes
 * `preferredReciterId`. Reuses the `useRecitersStore` + AsyncContent +
 * SelectableRow pattern from `settings-reciter`.
 */
export function ReciterStep(): React.ReactElement {
  const { data, status, error, fetch, refresh } = useRecitersStore();
  const selectedId = useSettingsStore((s) => s.preferredReciterId);
  const setPreferredReciter = useSettingsStore((s) => s.setPreferredReciter);
  const previewId = usePreviewStore((s) => s.reciterId);
  const previewStatus = usePreviewStore((s) => s.status);
  const reciters = useMemo(
    () => selectOnboardingReciters(data, ONBOARDING_POPULAR_RECITER_IDS, selectedId),
    [data, selectedId],
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Stop on unmount — step change, skip and finish all unmount this step.
  // Empty deps on purpose: selecting a reciter must not stop a preview.
  useEffect(() => () => { void stopPreview(); }, []);

  // Stop when backgrounded: a sample must not keep playing behind the lock screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void stopPreview();
    });
    return () => sub.remove();
  }, []);

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
            {reciters.map((r) => (
              <SelectableRow
                key={r.id}
                title={r.name}
                subtitle={r.styleLabel}
                selected={r.id === selectedId}
                onPress={() => setPreferredReciter(r.id)}
                preview={
                  canPreview(r) ? (
                    <PreviewButton
                      reciterName={r.name}
                      status={previewId === r.id ? previewStatus : 'idle'}
                      onPress={() => {
                        void toggleReciterPreview(r);
                      }}
                    />
                  ) : undefined
                }
              />
            ))}
          </View>
        </AsyncContent>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // PHYSICAL_BOX pins the direction so the `textAlign: 'right'` below means the
  // physical right. Under `forceRTL` alone it resolves to the physical LEFT,
  // which is what pushed these headings to the wrong edge.
  container: { ...PHYSICAL_BOX, flex: 1, paddingHorizontal: 24 },
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
