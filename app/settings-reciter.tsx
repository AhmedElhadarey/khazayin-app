import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { AsyncContent, SkeletonRibbonList } from '@/components/khazain';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { useRecitersStore, useSettingsStore } from '@/store';

export default function SettingsReciterScreen() {
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
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>اختر القارئ المفضّل</Text>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 32 }]}
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
        selected ? styles.rowSelected : null,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
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
      {selected ? (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path
            d="M4 9.5l3.5 3.5L14 5.5"
            stroke={KhazainColors.goldAccent}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
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
  list: { paddingHorizontal: 16, gap: 8 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  rowSelected: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
  textCol: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowSubtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
