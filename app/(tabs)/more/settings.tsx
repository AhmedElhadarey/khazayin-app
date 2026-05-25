import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { SettingsSection, SettingsValueRow } from '@/components/khazain/settings';
import { useQiratStore, useRecitersStore, useSettingsStore } from '@/store';

export default function SettingsScreen() {
  const router = useRouter();
  const defaultQiraaId = useSettingsStore((s) => s.defaultQiraaId);
  const preferredReciterId = useSettingsStore((s) => s.preferredReciterId);
  const qiraat = useQiratStore((s) => s.data);
  const reciters = useRecitersStore((s) => s.data);

  const qiraaName =
    qiraat.find((q) => q.id === defaultQiraaId)?.name ?? 'حفص عن عاصم';
  const reciterName =
    reciters.find((r) => r.id === preferredReciterId)?.name ?? '—';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>الإعدادات</Text>
        </View>
        <SettingsSection title="التلاوة">
          <SettingsValueRow
            title="القراءة الافتراضية"
            value={qiraaName}
            icon={<QiraaIcon />}
            onPress={() => router.push('/settings-qiraa' as any)}
          />
          <SettingsValueRow
            title="القارئ المفضّل"
            value={reciterName}
            icon={<ReciterIcon />}
            onPress={() => router.push('/settings-reciter' as any)}
          />
        </SettingsSection>
        <SettingsSection title="القراءة">{null}</SettingsSection>
        <SettingsSection title="الإشعارات">{null}</SettingsSection>
        <SettingsSection title="التطبيق">{null}</SettingsSection>
        <SettingsSection title="البيانات">{null}</SettingsSection>
        <SettingsSection title="قانوني">{null}</SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function QiraaIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M13 3v5h5" stroke={c} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M8 13h7M8 16h5" stroke={c} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

function ReciterIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={9} r={3.5} stroke={c} strokeWidth={1.5} />
      <Path
        d="M5 19a7 7 0 0114 0"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headerBlock: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'flex-end',
  },
  h1: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
