import React, { useEffect } from 'react';
import { SheetHandle } from '@/components/khazain/sheets';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SHEET_CHROME } from '@/constants/layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePageSheetLayout } from '@/hooks/useResponsiveLayout';
import { useRouter } from 'expo-router';
import { AsyncContent, SkeletonRibbonList } from '@/components/khazain';
import { ChoiceRow } from '@/components/khazain/settings';
import { textStyle } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';
import { useQiratStore, useSettingsStore } from '@/store';

export default function SettingsQiraaScreen() {
  const { columnStyle } = usePageSheetLayout();
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useQiratStore();
  const selectedId = useSettingsStore((s) => s.defaultQiraaId);
  const setDefaultQiraa = useSettingsStore((s) => s.setDefaultQiraa);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const pick = (id: string) => {
    setDefaultQiraa(id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.handleWrap}>
        <SheetHandle />
      </View>
      <Text style={styles.title}>اختر القراءة الافتراضية</Text>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 32 }, columnStyle]}
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
            <SelectableRow
              key={q.id}
              title={q.name}
              selected={q.id === selectedId}
              onPress={() => pick(q.id)}
            />
          ))}
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

function SelectableRow({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <ChoiceRow selected={selected} onPress={onPress} accessibilityLabel={title}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {title}
      </Text>
    </ChoiceRow>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  title: {
    ...textStyle('bodyLarge', { color: KhazainColors.ink900, textAlign: 'center' }),
    paddingTop: 6,
    paddingBottom: 12,
  },
  list: { paddingHorizontal: SHEET_CHROME.paddingHorizontal, gap: 8 },
  rowTitle: {
    flex: 1,
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  },
});
