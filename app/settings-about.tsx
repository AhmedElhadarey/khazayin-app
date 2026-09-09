import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { MORE_EXTERNAL_URLS } from '@/data/content/sections';
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
            <Text style={styles.versionLabel}>الإصدار</Text>
            <Text style={styles.versionValue}>{version}</Text>
          </View>
          {build ? (
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>رقم البناء</Text>
              <Text style={styles.versionValue}>{build}</Text>
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
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    writingDirection: 'rtl',
  },
  body: { paddingHorizontal: 16, gap: 12 },
  card: {
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
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
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 8,
  },
  versionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  versionLabel: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  versionValue: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '600',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
  },
  linkCard: {
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'flex-end',
    gap: 4,
  },
  linkTitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '600',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  linkValue: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.goldAccent,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
