import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { SettingsToggleRow, SettingsValueRow } from '@/components/khazain/settings';
import { NOTIFICATION_CATEGORIES } from '@/services/notificationRegistry';
import { getPermissionAsync, type PermissionStatus } from '@/services/notificationScheduler';
import { formatClockTime, isWirdReminderArmed } from '@/services/wirdReminder';
import { setWirdReminderEnabled } from '@/services/wirdReminderToggle';
import { useSettingsStore } from '@/store';
import { useWirdStore } from '@/store/wirdStore';

// Guarded open of OS settings — Linking.openSettings() can reject on some
// platforms/OEMs; match the project's external-action convention (try/catch +
// Arabic Alert fallback) instead of a floating rejection (T5.3).
function openOsSettings() {
  Linking.openSettings().catch(() => {
    Alert.alert('خطأ', 'تعذّر فتح الإعدادات.');
  });
}

function promptOpenOsSettings() {
  Alert.alert(
    'إذن الإشعارات مطلوب',
    'لتفعيل الإشعارات، يرجى السماح بها من إعدادات النظام.',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'فتح الإعدادات', onPress: openOsSettings },
    ],
  );
}

export default function SettingsNotificationsScreen() {
  const router = useRouter();
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotificationEnabled = useSettingsStore((s) => s.setNotificationEnabled);
  const wirdReminderTime = useSettingsStore((s) => s.wirdReminderTime);
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const isMounted = useRef(true);

  // Read OS permission on mount and whenever the app returns to foreground
  // (Phase 6 board carryforward C2) — keeps the wird toggle in sync if the
  // user revoked permission via system settings while we were backgrounded.
  // `isMounted` guard prevents a setState-after-unmount warning if the modal
  // closes mid-await (final-review Risk #4).
  const syncPermission = useCallback(async () => {
    const status = await getPermissionAsync();
    if (isMounted.current) setPermission(status);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    syncPermission();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') {
        syncPermission();
      }
    });
    return () => {
      isMounted.current = false;
      sub.remove();
    };
  }, [syncPermission]);

  // Reconcile the OS schedule with the persisted wird preference on mount
  // (final-review Risk #1). Handles fresh installs where settings says
  // "wird-daily=true" but no OS schedule yet exists (idempotent in the
  // scheduler — it cancels any prior wird before scheduling the next).
  useEffect(() => {
    if (notifications['wird-daily'] && permission === 'granted') {
      void useWirdStore.getState().setWirdEnabledFromSettings(true);
    }
    // intentionally only runs when permission flips to 'granted' (and not on
    // every toggle change — handleWirdToggle handles those).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  // Delegates to `setWirdReminderEnabled`, the single boundary shared with the
  // Library tab's inline toggle. It checks OS permission, refuses to flip the
  // stored preference when permission is denied, and routes the schedule change
  // through the horizon orchestrator (which reads the user's persisted
  // `wirdReminderTime` rather than the WIRD_REMINDER_DEFAULT_TIME constant).
  // Keeping the decision in one module is what stops these two screens drifting
  // into different notions of what "on" means.
  const handleWirdToggle = async (next: boolean) => {
    const outcome = await setWirdReminderEnabled(next);
    if (outcome === 'permission-denied') {
      await syncPermission(); // reflect the OS answer in the banner
      promptOpenOsSettings();
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>الإشعارات</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {permission === 'denied' ? (
          <PermissionDeniedBanner onPress={openOsSettings} />
        ) : null}
        <View style={styles.list}>
          {NOTIFICATION_CATEGORIES.map((cat) => {
            const enabled = notifications[cat.id];
            // A category with no working scheduler yet (announcements-general,
            // and the five prayer-* categories) renders as a disabled row with
            // "قريبًا". Driven by the registry `available` flag rather than a
            // hardcoded id list, so registering a new not-yet-wired category is
            // enough to keep it out of the live toggles.
            if (!cat.available) {
              return (
                <SettingsToggleRow
                  key={cat.id}
                  title={cat.labelAr}
                  description="قريبًا"
                  icon={<BellIcon />}
                  value={false}
                  onValueChange={() => undefined}
                  disabled
                />
              );
            }
            // Only wird-daily has a real OS schedule today. Branching on
            // `cat.id` keeps a future non-wird category from accidentally
            // being wired to the wird scheduler (final-review fix).
            if (cat.id === 'wird-daily') {
              return (
                <SettingsToggleRow
                  key={cat.id}
                  title={cat.labelAr}
                  description={cat.descriptionAr}
                  icon={<BellIcon />}
                  // NOT `enabled` — the stored preference alone. `wird-daily` is
                  // `defaultOn: true`, so on a fresh install this rendered ON
                  // while nothing was scheduled and the Library card correctly
                  // showed OFF. Worse, an already-ON switch can only be tapped
                  // OFF, so the one gesture that requests notification permission
                  // was unreachable from the notifications screen itself.
                  value={isWirdReminderArmed(enabled, permission)}
                  onValueChange={(next) => {
                    void handleWirdToggle(next);
                  }}
                  disabled={false}
                />
              );
            }
            // Fallback for any future category with no dedicated handler:
            // toggle persists in settingsStore but no scheduler call fires.
            return (
              <SettingsToggleRow
                key={cat.id}
                title={cat.labelAr}
                description={cat.descriptionAr}
                icon={<BellIcon />}
                value={enabled}
                onValueChange={(next) => setNotificationEnabled(cat.id, next)}
                disabled={false}
              />
            );
          })}
        </View>

        {/* Reminder-time picker entry (T045). Displayed whenever the wird
            reminder is enabled — editing the time re-arms the DAILY trigger. */}
        {notifications['wird-daily'] ? (
          <SettingsValueRow
            title="وقت تذكير الورد"
            value={formatClockTime(wirdReminderTime)}
            icon={<ClockIcon />}
            onPress={() => router.push('/settings-wird-reminder' as any)}
          />
        ) : null}

        {/* Honest delivery disclosure (T119). */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            تعتمد التذكيرات على إيقاظ النظام للتطبيق في وقتها، وقد تتأخر أحيانًا.
          </Text>
          <Text style={styles.noteText}>
            على أجهزة أندرويد، استثنِ التطبيق من إعدادات توفير البطارية لضمان وصول
            التذكيرات في موعدها.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ClockIcon() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={c} strokeWidth={1.5} />
      <Path d="M12 7v5l3.5 2" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PermissionDeniedBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        KhazainShadows.card,
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Text style={styles.bannerTitle}>الإشعارات معطّلة من النظام</Text>
      <Text style={styles.bannerBody}>
        لتفعيل التذكيرات، اضغط هنا لفتح إعدادات النظام والسماح بالإشعارات.
      </Text>
    </Pressable>
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
  body: { paddingHorizontal: 16, gap: 16 },
  list: { gap: 8 },
  noteCard: {
    backgroundColor: KhazainColors.cream100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.18)',
    padding: 14,
    gap: 8,
  },
  noteText: {
    fontFamily: 'TheSansArabic',
    fontSize: 12.5,
    lineHeight: 20,
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  banner: {
    backgroundColor: '#FCE9D6',
    borderWidth: 1,
    borderColor: KhazainColors.gold500,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    gap: 4,
  },
  bannerTitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  bannerBody: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
