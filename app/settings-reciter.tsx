import React, { useEffect } from 'react';
import { SheetHandle } from '@/components/khazain/sheets';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePageSheetLayout } from '@/hooks/useResponsiveLayout';
import { useRouter } from 'expo-router';
import { AsyncContent, SkeletonRibbonList } from '@/components/khazain';
import { ChoiceRow } from '@/components/khazain/settings';
import { textStyle } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';
import { useRecitersStore, useSettingsStore } from '@/store';

export default function SettingsReciterScreen() {
  const { columnStyle } = usePageSheetLayout();
  const router = useRouter();
  const { data, status, error, fetch, refresh } = useRecitersStore();
  const selectedId = useSettingsStore((s) => s.preferredReciterId);
  const setPreferredReciter = useSettingsStore((s) => s.setPreferredReciter);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const pick = (id: string) => {
    setPreferredReciter(id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.handleWrap}>
        <SheetHandle />
      </View>
      <Text style={styles.title}>اختر القارئ المفضّل</Text>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 32 }, columnStyle]}
        showsVerticalScrollIndicator={false}
      >
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonRibbonList count={7} />}
          emptyMessage="لا يوجد قراء متاحون"
        >
          {data.map((r) => (
            <SelectableReciterRow
              key={r.id}
              title={r.name}
              subtitle={r.styleLabel}
              selected={r.id === selectedId}
              onPress={() => pick(r.id)}
            />
          ))}
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

function SelectableReciterRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <ChoiceRow selected={selected} onPress={onPress} accessibilityLabel={subtitle ? `${title}، ${subtitle}` : title}>
      <View style={styles.textCol}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
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
  list: { paddingHorizontal: 16, gap: 8 },
  textCol: { flex: 1, gap: 2 },
  rowTitle: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  rowSubtitle: textStyle('caption', { color: KhazainColors.ink500 }),
});
