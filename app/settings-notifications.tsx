import React, { useCallback, useEffect, useState } from 'react';
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
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { SettingsToggleRow } from '@/components/khazain/settings';
import { NOTIFICATION_CATEGORIES } from '@/services/notificationRegistry';
import {
  cancelWirdReminderAsync,
  getPermissionAsync,
  requestPermissionAsync,
  scheduleWirdReminderAsync,
  type PermissionStatus,
} from '@/services/notificationScheduler';
import { WIRD_REMINDER_DEFAULT_TIME } from '@/constants/settings';
import { useSettingsStore } from '@/store';

function promptOpenOsSettings() {
  Alert.alert(
    'إذن الإشعارات مطلوب',
    'لتفعيل الإشعارات، يرجى السماح بها من إعدادات النظام.',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },
    ],
  );
}

export default function SettingsNotificationsScreen() {
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotificationEnabled = useSettingsStore((s) => s.setNotificationEnabled);
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');

  // Read OS permission on mount and whenever the app returns to foreground
  // (Phase 6 board carryforward C2) — keeps the wird toggle in sync if the
  // user revoked permission via system settings while we were backgrounded.
  const syncPermission = useCallback(async () => {
    const status = await getPermissionAsync();
    setPermission(status);
  }, []);

  useEffect(() => {
    syncPermission();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') {
        syncPermission();
      }
    });
    return () => sub.remove();
  }, [syncPermission]);

  const handleWirdToggle = async (next: boolean) => {
    if (!next) {
      setNotificationEnabled('wird-daily', false);
      await cancelWirdReminderAsync();
      return;
    }
    // Turning ON — verify OS permission first.
    let current = permission;
    if (current === 'undetermined') {
      current = await requestPermissionAsync();
      setPermission(current);
    }
    if (current !== 'granted') {
      promptOpenOsSettings();
      return; // don't flip
    }
    setNotificationEnabled('wird-daily', true);
    await scheduleWirdReminderAsync({ ...WIRD_REMINDER_DEFAULT_TIME });
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
          <PermissionDeniedBanner onPress={() => Linking.openSettings()} />
        ) : null}
        <View style={styles.list}>
          {NOTIFICATION_CATEGORIES.map((cat) => {
            const enabled = notifications[cat.id];
            // Per Phase 6 board C1: announcements-general renders as a
            // disabled row with "قريبًا" until a push backend exists.
            const isComingSoon: boolean = cat.id === 'announcements-general';
            if (isComingSoon) {
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
            return (
              <SettingsToggleRow
                key={cat.id}
                title={cat.labelAr}
                description={cat.descriptionAr}
                icon={<BellIcon />}
                value={enabled}
                onValueChange={(next) => {
                  void handleWirdToggle(next);
                }}
                disabled={false}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
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
