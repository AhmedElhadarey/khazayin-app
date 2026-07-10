import { ListRowCard } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { SettingsSection, SettingsValueRow } from '@/components/khazain/settings';
import { toArabicDigits as toArNum } from '@/constants/progress';
import { PRAYER_METHOD_LABELS_AR } from '@/constants/settings';
import { useWirdStore } from '@/store/wirdStore';
import { KhazainConfig } from '@/constants/config';
import { KhazainColors } from '@/constants/theme';
import { clearAppCache } from '@/services/cacheFacade';
import { shareNotes } from '@/services/notesExporter';
import { NOTIFICATION_CATEGORIES } from '@/services/notificationRegistry';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { LEGACY_ONBOARDING_FLAG_KEY } from '@/services/onboardingGate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import {
  useNotesStore,
  useQiratStore,
  useRecitersStore,
  useSettingsStore,
  useToastStore,
} from '@/store';
import type { FontSizeLevel } from '@/types/settings';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const FONT_LEVEL_LABELS: Record<FontSizeLevel, string> = {
  1: 'صغير جدًا',
  2: 'صغير',
  3: 'متوسط',
  4: 'كبير',
  5: 'كبير جدًا',
};


export default function SettingsScreen() {
  const router = useRouter();
  const defaultQiraaId = useSettingsStore((s) => s.defaultQiraaId);
  const preferredReciterId = useSettingsStore((s) => s.preferredReciterId);
  const fontSizeLevel = useSettingsStore((s) => s.fontSizeLevel);
  const notifications = useSettingsStore((s) => s.notifications);
  const prayer = useSettingsStore((s) => s.prayer);
  const notificationPermission = useNotificationPermission();

  // Count only categories that can ACTUALLY fire: registered `available` (a
  // scheduler exists), switched on by the user, and permitted by the OS.
  //
  // Counting the raw preference record instead reported "٦ من ٧ مفعّلة" on a
  // fresh install — the five `prayer-*` categories are `defaultOn: true` but
  // `available: false`, so none of them can produce a notification, and the wird
  // reminder still needs an OS grant. Six of seven "enabled", zero deliverable.
  const availableCategories = NOTIFICATION_CATEGORIES.filter((c) => c.available);
  const armedCount = availableCategories.filter(
    (c) => notifications[c.id] && notificationPermission === 'granted',
  ).length;
  const notificationsSummary =
    armedCount === 0
      ? 'لا توجد إشعارات مفعّلة'
      : `${toArNum(armedCount)} من ${toArNum(availableCategories.length)} مفعّلة`;
  // The row displays real computed times, so it is shown even while prayer
  // notifications remain disabled. The subtitle surfaces the chosen calculation
  // method once a location exists; before that, prompts the user to set one.
  const prayerSubtitle =
    prayer.location.kind !== 'none'
      ? PRAYER_METHOD_LABELS_AR[prayer.method]
      : 'لم يتم تحديد الموقع';
  const qiraat = useQiratStore((s) => s.data);
  const reciters = useRecitersStore((s) => s.data);
  const fetchQiraat = useQiratStore((s) => s.fetch);
  const fetchReciters = useRecitersStore((s) => s.fetch);
  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const wirdTarget = useWirdStore((s) => s.target);

  // Resolve labels on cold open: fetch qiraat/reciters lists so the row
  // values show the Arabic name instead of a fallback dash.
  useEffect(() => {
    fetchQiraat();
    fetchReciters();
  }, [fetchQiraat, fetchReciters]);

  const openPrivacyPolicy = async () => {
    const url = KhazainConfig.privacyPolicyUrl;
    if (!url) {
      Alert.alert('سياسة الخصوصية', 'سياسة الخصوصية ستُضاف قريبًا.');
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('سياسة الخصوصية', 'تعذّر فتح سياسة الخصوصية. حاول مجددًا.');
    }
  };

  const onClearCache = () => {
    Alert.alert(
      'تفريغ الذاكرة المؤقتة',
      'سيتم تفريغ ذاكرة الصور المؤقتة. لن يتم حذف الملاحظات أو القراءات أو الإعدادات.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تفريغ',
          style: 'destructive',
          onPress: async () => {
            await clearAppCache();
            useToastStore.getState().show({ message: 'تم تفريغ الذاكرة المؤقتة' });
          },
        },
      ],
    );
  };

  const onExportNotes = async () => {
    const notes = useNotesStore.getState().notes;
    if (notes.length === 0) {
      Alert.alert('لا توجد ملاحظات', 'لا يوجد شيء للتصدير حاليًا.');
      return;
    }
    await shareNotes(notes);
  };

  const onResetOnboarding = async () => {
    await AsyncStorage.removeItem(LEGACY_ONBOARDING_FLAG_KEY);
    setOnboardingStep(0);
    setOnboardingComplete(false);
    router.replace('/onboarding' as any);
  };

  const onTestSentry = () => {
    const dsnConfigured = !!process.env.EXPO_PUBLIC_SENTRY_DSN;
    Sentry.captureException(new Error('Khazayin test event (dev settings)'));
    Sentry.captureMessage('Khazayin test message (dev settings)', 'info');
    Alert.alert(
      'Sentry',
      dsnConfigured
        ? 'تم إرسال حدث تجريبي إلى Sentry. تحقّق من لوحة المشاريع خلال دقيقة.'
        : 'لم يُضبط EXPO_PUBLIC_SENTRY_DSN — لن يُرسَل الحدث.',
    );
  };

  const qiraaName =
    qiraat.find((q) => q.id === defaultQiraaId)?.name ?? 'حفص عن عاصم';
  const reciterName =
    reciters.find((r) => r.id === preferredReciterId)?.name ?? '—';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>الإعدادات</Text>
        </View>
        <SettingsSection title="التلاوة">
          <ListRowCard
            title="القراءة الافتراضية"
            subtitle={qiraaName}
            icon={<QiraaIcon />}
            onPress={() => router.push('/settings-qiraa' as any)}
          />
          <ListRowCard
            title="القارئ المفضّل"
            subtitle={reciterName}
            icon={<ReciterIcon />}
            onPress={() => router.push('/settings-reciter' as any)}
          />
        </SettingsSection>
        <SettingsSection title="القراءة">
          <ListRowCard
            title="حجم خط القرآن"
            subtitle={FONT_LEVEL_LABELS[fontSizeLevel]}
            icon={<FontSizeIcon />}
            onPress={() => router.push('/settings-font-size' as any)}
          />
          <SettingsValueRow
            title="هدف الورد اليومي"
            value={`${toArNum(wirdTarget)} صفحة`}
            icon={<WirdGoalIcon />}
            onPress={() => router.push('/settings-wird-goal' as any)}
          />
        </SettingsSection>
        <SettingsSection title="الإشعارات">
          <ListRowCard
            title="الإشعارات"
            subtitle={notificationsSummary}
            icon={<BellIcon />}
            onPress={() => router.push('/settings-notifications' as any)}
          />
        </SettingsSection>
        <SettingsSection title="مواقيت الصلاة">
          <ListRowCard
            title="مواقيت الصلاة"
            subtitle={prayerSubtitle}
            icon={<PrayerTimesIcon />}
            onPress={() => router.push('/settings-prayer' as any)}
          />
        </SettingsSection>
        <SettingsSection title="التطبيق">
          <ListRowCard
            title="اللغة"
            subtitle="العربية"
            icon={<GlobeIcon />}
            onPress={() =>
              Alert.alert('اللغة', 'هذا التطبيق متاح باللغة العربية فقط.')
            }
          />
          <ListRowCard
            title="حول التطبيق"
            subtitle="الإصدار والمؤسسة"
            icon={<AboutIcon />}
            onPress={() => router.push('/settings-about' as any)}
          />
        </SettingsSection>
        <SettingsSection title="البيانات">
          <ListRowCard
            title="تفريغ الذاكرة المؤقتة"
            subtitle=""
            icon={<TrashIcon />}
            onPress={onClearCache}
          />
          <ListRowCard
            title="تصدير الملاحظات"
            subtitle=""
            icon={<ExportIcon />}
            onPress={onExportNotes}
          />
        </SettingsSection>
        <SettingsSection title="قانوني">
          <ListRowCard
            title="سياسة الخصوصية"
            subtitle=""
            icon={<PrivacyIcon />}
            onPress={openPrivacyPolicy}
          />
        </SettingsSection>
        {__DEV__ ? (
          <SettingsSection title="مطوّر (Dev)">
            <ListRowCard
              title="إعادة الإعداد الأولي"
              subtitle="عرض شاشة الترحيب من جديد"
              icon={<AboutIcon />}
              onPress={onResetOnboarding}
            />
            <ListRowCard
              title="إرسال حدث تجريبي إلى Sentry"
              subtitle="للتحقق من تسجيل الأعطال"
              icon={<AboutIcon />}
              onPress={onTestSentry}
            />
          </SettingsSection>
        ) : null}
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

function WirdGoalIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={5} stroke={c} strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={1.6} fill={c} />
    </Svg>
  );
}

function FontSizeIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={9} height={2} fill={c} />
      <Path d="M7 6v13M5 19h4" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x={14} y={10} width={7} height={1.6} fill={c} />
      <Path d="M17.5 11v8M16 19h3" stroke={c} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

function GlobeIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7} stroke={c} strokeWidth={1.5} />
      <Path
        d="M3 10h14M10 3c2.5 3 2.5 11 0 14M10 3c-2.5 3-2.5 11 0 14"
        stroke={c}
        strokeWidth={1.3}
      />
    </Svg>
  );
}

function AboutIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.5} />
      <Path d="M12 11v6M12 7v.5" stroke={c} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

function PrivacyIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l8 3v5c0 4.5-3.4 8.5-8 10-4.6-1.5-8-5.5-8-10V6l8-3z"
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M8.5 12l2.5 2.5L15.5 10" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 11v6M14 11v6" stroke={c} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 16V11a6 6 0 0112 0v5l1.5 2H4.5L6 16z"
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M10 20a2 2 0 004 0" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={5} r={1.2} fill={c} />
    </Svg>
  );
}

function PrayerTimesIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c2 2 3 3.5 3 5a3 3 0 01-6 0c0-1.5 1-3 3-5z"
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M4 20v-6a8 8 0 0116 0v6"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 20h18M10 20v-4a2 2 0 014 0v4"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ExportIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v12M8 8l4-4 4 4"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"
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
