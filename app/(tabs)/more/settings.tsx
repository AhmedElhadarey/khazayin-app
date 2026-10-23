import { InlineHeader, ListRowCard } from '@/components/khazain';
import { HeaderArt } from '@/components/khazain/patterns';
import { SettingsSection, SettingsToggleRow, SettingsValueRow } from '@/components/khazain/settings';
import {
  AboutGlyph,
  CacheGlyph,
  CommunityGlyph,
  ExportNotesGlyph,
  FontSizeGlyph,
  InfoGlyph,
  LanguageGlyph,
  NotificationsGlyph,
  PrayerTimesGlyph,
  PrivacyGlyph,
  QiraaGlyph,
  ReciterGlyph,
  RestoreGlyph,
  WirdGoalGlyph,
} from '@/components/khazain/settings/SettingsGlyphs';
import { COMMUNITY_COPY, mutedMemberLabel, nextAttemptCopy } from '@/constants/communityCopy';
import { toArabicDigits as toArNum } from '@/constants/progress';
import { arabicCopyForCode } from '@/services/api/errors';
import { COMMUNITY_MODE } from '@/services/community/config';
import { runDeletionIfDue } from '@/services/community/deletionRunner';
import { GUIDELINES_VERSION } from '@/services/community/gate';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import { RECOMMENDATIONS_ENABLED, RECOMMENDATION_COPY } from '@/constants/recommendations';
import { PRAYER_METHOD_LABELS_AR } from '@/constants/settings';
import { useRecommendationsStore } from '@/store/recommendationsStore';
import { useWirdStore } from '@/store/wirdStore';
import { KhazainConfig } from '@/constants/config';
import { CARD_DENSITY, PHYSICAL_BOX, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { clearAppCache } from '@/services/cacheFacade';
import { shareNotes } from '@/services/notesExporter';
import { NOTIFICATION_CATEGORIES } from '@/services/notificationRegistry';
import { openPrivacyPolicy } from '@/services/privacyPolicy';
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
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const FONT_LEVEL_LABELS: Record<FontSizeLevel, string> = {
  1: 'صغير جدًا',
  2: 'صغير',
  3: 'متوسط',
  4: 'كبير',
  5: 'كبير جدًا',
};


export default function SettingsScreen() {
  const { columnStyle } = useResponsiveLayout();
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

  const onOpenPrivacyPolicy = () =>
    openPrivacyPolicy({
      url: KhazainConfig.privacyPolicyUrl,
      openBrowser: (url) => WebBrowser.openBrowserAsync(url),
      alert: (title, body) => Alert.alert(title, body),
    });

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

  const onResetRecommendations = () => {
    useRecommendationsStore.getState().clearDismissed();
    useToastStore.getState().show({ message: RECOMMENDATION_COPY.resetDone });
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <ScrollView
        contentContainerStyle={[{ paddingBottom: 60 }, columnStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/*
          InlineHeader, not a bare title: this is a nested route under the More
          stack and it was the one live screen in the app with no way back on
          screen at all — only the system gesture. Its four siblings
          (about, archive, contact, settings-progress) all use it, so this is
          the header they already share rather than a new one.
        */}
        <InlineHeader title="الإعدادات" onBack={() => router.back()} />
        <SettingsSection title="التلاوة">
          <ListRowCard
            variant="more"
            title="القراءة الافتراضية"
            subtitle={qiraaName}
            icon={<QiraaGlyph />}
            onPress={() => router.push('/settings-qiraa' as any)}
          />
          <ListRowCard
            variant="more"
            title="القارئ المفضّل"
            subtitle={reciterName}
            icon={<ReciterGlyph />}
            onPress={() => router.push('/settings-reciter' as any)}
          />
        </SettingsSection>
        <SettingsSection title="القراءة">
          <ListRowCard
            variant="more"
            title="حجم خط القرآن"
            subtitle={FONT_LEVEL_LABELS[fontSizeLevel]}
            icon={<FontSizeGlyph />}
            onPress={() => router.push('/settings-font-size' as any)}
          />
          <SettingsValueRow
            title="هدف الورد اليومي"
            value={`${toArNum(wirdTarget)} صفحة`}
            icon={<WirdGoalGlyph />}
            onPress={() => router.push('/settings-wird-goal' as any)}
          />
        </SettingsSection>
        <SettingsSection title="الإشعارات">
          <ListRowCard
            variant="more"
            title="الإشعارات"
            subtitle={notificationsSummary}
            icon={<NotificationsGlyph />}
            onPress={() => router.push('/settings-notifications' as any)}
          />
        </SettingsSection>
        <SettingsSection title="مواقيت الصلاة">
          <ListRowCard
            variant="more"
            title="مواقيت الصلاة"
            subtitle={prayerSubtitle}
            icon={<PrayerTimesGlyph />}
            onPress={() => router.push('/settings-prayer' as any)}
          />
        </SettingsSection>
        <SettingsSection title="التطبيق">
          <ListRowCard
            variant="more"
            title="اللغة"
            subtitle="العربية"
            icon={<LanguageGlyph />}
            onPress={() =>
              Alert.alert('اللغة', 'هذا التطبيق متاح باللغة العربية فقط.')
            }
          />
          <ListRowCard
            variant="more"
            title="حول التطبيق"
            subtitle="الإصدار والمؤسسة"
            icon={<AboutGlyph />}
            onPress={() => router.push('/settings-about' as any)}
          />
        </SettingsSection>
        <SettingsSection title="البيانات">
          <ListRowCard
            variant="more"
            title="تفريغ الذاكرة المؤقتة"
            subtitle=""
            icon={<CacheGlyph />}
            onPress={onClearCache}
          />
          <ListRowCard
            variant="more"
            title="تصدير الملاحظات"
            subtitle=""
            icon={<ExportNotesGlyph />}
            onPress={onExportNotes}
          />
          {RECOMMENDATIONS_ENABLED ? (
            <ListRowCard
              variant="more"
              title={RECOMMENDATION_COPY.resetRow}
              subtitle=""
              icon={<RestoreGlyph />}
              onPress={onResetRecommendations}
            />
          ) : null}
        </SettingsSection>
        {COMMUNITY_MODE !== 'off' ? <CommunitySettingsSection /> : null}
        <SettingsSection title="قانوني">
          <ListRowCard
            variant="more"
            title="سياسة الخصوصية"
            subtitle=""
            icon={<PrivacyGlyph />}
            onPress={onOpenPrivacyPolicy}
          />
        </SettingsSection>
        {__DEV__ ? (
          <SettingsSection title="للمطوّرين">
            <ListRowCard
              variant="more"
              title="إعادة الإعداد الأولي"
              subtitle="عرض شاشة الترحيب من جديد"
              icon={<InfoGlyph />}
              onPress={onResetOnboarding}
            />
            <ListRowCard
              variant="more"
              title="إرسال حدث تجريبي لتسجيل الأعطال"
              subtitle="للتحقق من تسجيل الأعطال"
              icon={<InfoGlyph />}
              onPress={onTestSentry}
            />
          </SettingsSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const COMMUNITY_HUB = '/(tabs)/more/community';

/** «hh:mm» in Arabic-Indic digits, local time. */
function clockLabel(ms: number): string {
  const d = new Date(ms);
  return `${toArNum(String(d.getHours()).padStart(2, '0'))}:${toArNum(String(d.getMinutes()).padStart(2, '0'))}`;
}

/**
 * The «المجتمع» section (design §8.3). Rendered by the screen only when the
 * community mode is not `off`, so a production build shows nothing new.
 */
function CommunitySettingsSection() {
  const router = useRouter();
  const profile = useCommunityLocalStore((s) => s.profile);
  const optedIn = useCommunityLocalStore((s) => s.prefs.optedIn);
  const guidelinesVersion = useCommunityLocalStore((s) => s.prefs.guidelinesVersion);
  const acceptedAt = useCommunityLocalStore((s) => s.prefs.acceptedAt);
  const deletion = useCommunityLocalStore((s) => s.deletion);
  const muted = useCommunityLocalStore((s) => s.mutedMemberIds);
  const [mutedOpen, setMutedOpen] = React.useState(false);

  const onParticipate = (next: boolean) => {
    const store = useCommunityLocalStore.getState();
    if (!next) return store.pause();
    // A stale acceptance goes back through the hub, where the member re-accepts.
    // Safe to call optIn directly only because enrollMember records the
    // acceptance (acceptedAt > 0) after the service has registered the member:
    // a profile with a current acceptance is a registered one.
    if (profile && acceptedAt > 0 && guidelinesVersion >= GUIDELINES_VERSION) store.optIn(profile.displayName);
    else router.push(COMMUNITY_HUB as any);
  };

  const onDelete = () => {
    Alert.alert(COMMUNITY_COPY.deleteMyData, COMMUNITY_COPY.deleteConfirmBody, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: COMMUNITY_COPY.deleteMyData,
        style: 'destructive',
        onPress: () => {
          const now = Date.now();
          useCommunityLocalStore.getState().beginDeletion(now);
          void runDeletionIfDue(now, { force: true });
        },
      },
    ]);
  };

  if (deletion.state === 'pending') {
    return (
      <SettingsSection title={COMMUNITY_COPY.settingsSection}>
        {/* A status, not a button: ListRowCard is always a pressable. */}
        <StatusRow
          title={COMMUNITY_COPY.deletionPending}
          lines={[
            nextAttemptCopy(
              deletion.nextAttemptAt <= Date.now() ? COMMUNITY_COPY.dueNow : clockLabel(deletion.nextAttemptAt),
            ),
            ...(deletion.lastError ? [arabicCopyForCode(deletion.lastError)] : []),
          ]}
          icon={<CacheGlyph />}
        />
        <ListRowCard
          variant="more"
          title={COMMUNITY_COPY.retryNow}
          subtitle=""
          icon={<CommunityGlyph />}
          onPress={() => void runDeletionIfDue(Date.now(), { force: true })}
        />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title={COMMUNITY_COPY.settingsSection}>
      {profile ? (
        <SettingsToggleRow
          title={COMMUNITY_COPY.participate}
          description={COMMUNITY_COPY.pauseNote}
          icon={<CommunityGlyph />}
          value={optedIn && guidelinesVersion >= GUIDELINES_VERSION}
          onValueChange={onParticipate}
        />
      ) : (
        <ListRowCard
          variant="more"
          title={COMMUNITY_COPY.joinCommunity}
          subtitle=""
          icon={<CommunityGlyph />}
          onPress={() => router.push(COMMUNITY_HUB as any)}
        />
      )}
      {muted.length > 0 ? (
        <>
          <SettingsValueRow
            title={COMMUNITY_COPY.mutedMembers}
            value={toArNum(muted.length)}
            icon={<InfoGlyph />}
            expanded={mutedOpen}
            onPress={() => setMutedOpen((v) => !v)}
          />
          {mutedOpen
            ? muted.map((id, i) => (
                <SettingsValueRow
                  key={id}
                  title={mutedMemberLabel(i + 1)}
                  value={COMMUNITY_COPY.unmute}
                  icon={<InfoGlyph />}
                  onPress={() => useCommunityLocalStore.getState().unmute(id)}
                />
              ))
            : null}
        </>
      ) : null}
      {profile ? (
        <ListRowCard
          variant="more"
          title={COMMUNITY_COPY.deleteMyData}
          subtitle=""
          icon={<CacheGlyph />}
          onPress={onDelete}
        />
      ) : null}
    </SettingsSection>
  );
}

function StatusRow({ title, lines, icon }: { title: string; lines: string[]; icon: React.ReactNode }) {
  return (
    <View accessible accessibilityLabel={[title, ...lines].join('، ')} style={styles.statusCard}>
      {/* Physical left → right: text, icon chip. The box pins the text to the physical right. */}
      <View style={styles.statusText}>
        <Text style={styles.statusTitle}>{title}</Text>
        {lines.map((l) => (
          <Text key={l} style={styles.statusLine}>
            {l}
          </Text>
        ))}
      </View>
      <View style={styles.statusChip}>{icon}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  statusCard: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 16,
    minHeight: CARD_DENSITY.moreCardHeight,
    paddingVertical: 8,
    paddingHorizontal: CARD_DENSITY.moreCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.moreCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineCream,
    ...KhazainShadows.listRow,
  },
  statusText: { ...PHYSICAL_BOX, flex: 1, minWidth: 0, gap: 2 },
  statusTitle: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  statusLine: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }) },
  statusChip: {
    width: CARD_DENSITY.moreChipSize,
    aspectRatio: 1,
    borderRadius: CARD_DENSITY.moreChipRadius,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
