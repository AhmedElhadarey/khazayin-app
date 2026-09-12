import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { MORE_EXTERNAL_URLS } from '@/data/content/sections';
import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { textStyle } from '@/constants/typography';
import { KhazainColors, KhazainShadows } from '@/constants/theme';

function resolveVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function resolveBuildNumber(): string {
  const cfg = Constants.expoConfig;
  if (!cfg) return '';
  const ios = cfg.ios?.buildNumber;
  if (typeof ios === 'string' && ios.length > 0) return ios;
  const android = cfg.android?.versionCode;
  if (typeof android === 'number') return String(android);
  return '';
}

async function openFoundationWebsite() {
  const url = MORE_EXTERNAL_URLS.web;
  if (!url) return;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) throw new Error('cannot open');
    await Linking.openURL(url);
  } catch {
    Alert.alert('الرابط غير متاح', 'تعذّر فتح الرابط على هذا الجهاز.');
  }
}

export default function SettingsAboutScreen() {
  const version = resolveVersion();
  const build = resolveBuildNumber();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>حول التطبيق</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, KhazainShadows.card]}>
          <Text style={styles.appName}>خزائن الرحمن</Text>
          <Text style={styles.foundation}>مؤسسة خزائن الرحمن العالمية</Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionValue}>{version}</Text>
            <Text style={styles.versionLabel}>الإصدار</Text>
          </View>
          {build ? (
            <View style={styles.versionRow}>
              <Text style={styles.versionValue}>{build}</Text>
              <Text style={styles.versionLabel}>رقم البناء</Text>
            </View>
          ) : null}
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
});
