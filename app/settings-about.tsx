import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePageSheetLayout } from '@/hooks/useResponsiveLayout';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { MORE_EXTERNAL_URLS } from '@/data/content/sections';
import { resolveBuildNumber } from '@/services/appBuildInfo';
import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { textStyle } from '@/constants/typography';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import {
  QURAN_PAGE_DATA_CHANGES,
  QURAN_PAGE_DATA_CREDIT,
  QURAN_PAGE_DATA_LICENSE_LABEL,
  QURAN_PAGE_DATA_LICENSE_URL,
} from '@/constants/quranPages';

function resolveVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/** canOpenURL + Arabic fallback alert — the repo's external-link pattern. */
async function openExternalUrl(url: string) {
  if (!url) return;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) throw new Error('cannot open');
    await Linking.openURL(url);
  } catch {
    Alert.alert('الرابط غير متاح', 'تعذّر فتح الرابط على هذا الجهاز.');
  }
}

function openFoundationWebsite() {
  void openExternalUrl(MORE_EXTERNAL_URLS.web);
}

export default function SettingsAboutScreen() {
  const { columnStyle } = usePageSheetLayout();
  const version = resolveVersion();
  const build = resolveBuildNumber({
    executionEnvironment: Constants.executionEnvironment,
    nativeBuildVersion: Application.nativeBuildVersion,
    expoConfig: Constants.expoConfig,
  });
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>حول التطبيق</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 48 }, columnStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, KhazainShadows.card]}>
          <Text style={styles.appName}>خزائن الرحمن</Text>
          <Text style={styles.foundation}>مؤسسة خزائن الرحمن العالمية</Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionValue}>{version}</Text>
            <Text style={styles.versionLabel}>الإصدار</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionValue}>{build ?? '—'}</Text>
            <Text style={styles.versionLabel}>رقم البناء</Text>
          </View>
        </View>
        <Pressable
          onPress={openFoundationWebsite}
          style={({ pressed }) => [
            styles.linkCard,
            KhazainShadows.card,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.linkTitle}>موقع المؤسسة</Text>
          <Text style={styles.linkValue}>khazayin.com</Text>
        </Pressable>
        {/* CC BY 3.0 notice for the mushaf page/juz data (constants/quranPageData.ts). */}
        <View style={[styles.linkCard, KhazainShadows.card]}>
          <Text style={styles.linkTitle}>مصادر البيانات</Text>
          <Text style={styles.creditValue}>{QURAN_PAGE_DATA_CREDIT}</Text>
          <Text style={styles.creditValue}>{QURAN_PAGE_DATA_CHANGES}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={QURAN_PAGE_DATA_LICENSE_LABEL}
            hitSlop={8}
            onPress={() => void openExternalUrl(QURAN_PAGE_DATA_LICENSE_URL)}
          >
            <Text style={styles.linkValue}>{QURAN_PAGE_DATA_LICENSE_LABEL}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    ...textStyle('bodyLarge', { color: KhazainColors.ink900, textAlign: 'center' }),
    paddingTop: 6,
    paddingBottom: 12,
  },
  body: { paddingHorizontal: 16, gap: 12 },
  card: {
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    // PHYSICAL_BOX so `flex-end` is the physical right. Unpinned, the card is
    // RTL and `flex-end` stacked every line against the physical left.
    ...PHYSICAL_BOX,
    alignItems: 'flex-end',
    gap: 8,
  },
  appName: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.navy900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  foundation: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
    marginBottom: 8,
  },
  versionRow: {
    // Physical left -> right: value, label.
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  versionLabel: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
    flex: 1,
  },
  versionValue: textStyle('cardTitle', { color: KhazainColors.ink900 }),
  linkCard: {
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...PHYSICAL_BOX,
    alignItems: 'flex-end',
    gap: 4,
  },
  linkTitle: textStyle('sectionTitle', { color: KhazainColors.ink900 }),
  linkValue: textStyle('bodyCompact', { color: KhazainColors.goldAccent }),
  creditValue: textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
});
