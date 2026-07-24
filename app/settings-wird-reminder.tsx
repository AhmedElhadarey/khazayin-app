import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { useSettingsStore } from '@/store';
import { applyWirdReminderTime } from '@/services/wirdReminderToggle';
import { formatClockTime } from '@/services/wirdReminder';
import type { TimeOfDay } from '@/types/settings';

type Period = 'ص' | 'م';

// Mirrors the identical pair in `app/settings-notifications.tsx`. Both screens
// can strand the user on a denied permission, and both must offer the same way
// out. (Third copy — worth hoisting into a shared helper next time one is added.)
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

function toParts(t: TimeOfDay): { hour12: number; period: Period } {
  const raw = t.hour % 12;
  return { hour12: raw === 0 ? 12 : raw, period: t.hour < 12 ? 'ص' : 'م' };
}

function build(hour12: number, minute: number, period: Period): TimeOfDay {
  const base = hour12 % 12; // 12 → 0
  const hour = period === 'م' ? base + 12 : base;
  return { hour, minute };
}

export default function SettingsWirdReminderScreen() {
  const router = useRouter();
  const current = useSettingsStore((s) => s.wirdReminderTime);

  const [draft, setDraft] = useState<TimeOfDay>(current);
  const { hour12, period } = toParts(draft);

  const stepHour = (delta: number) => {
    const next = ((hour12 - 1 + delta + 12) % 12) + 1; // wrap 1..12
    setDraft(build(next, draft.minute, period));
  };
  const stepMinute = (delta: number) => {
    const next = (draft.minute + delta + 60) % 60; // wrap 0..59, step 5
    setDraft(build(hour12, next, period));
  };
  const setPeriod = (p: Period) => setDraft(build(hour12, draft.minute, p));

  const apply = async () => {
    // `applyWirdReminderTime` persists the time, then — because choosing a time
    // is an unambiguous statement of intent — requests OS notification permission
    // if it has never been asked. Without that request a fresh install could
    // never arm the reminder at all: the switch ships default-on, so the only
    // other prompt (the toggle handler) never ran. See wirdReminderToggle.ts.
    const outcome = await applyWirdReminderTime(draft);
    if (outcome === 'permission-denied') {
      promptOpenOsSettings();
      return; // keep the screen open so the chosen time stays visible
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>وقت تذكير الورد</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Live preview — the same 12-hour, LTR-isolated string the card shows. */}
        <View style={[styles.preview, KhazainShadows.card]}>
          <Text style={styles.previewTime}>{formatClockTime(draft)}</Text>
        </View>

        <Stepper
          label="الساعة"
          onIncrement={() => stepHour(1)}
          onDecrement={() => stepHour(-1)}
          incrementLabel="زيادة الساعة"
          decrementLabel="إنقاص الساعة"
        />
        <Stepper
          label="الدقيقة"
          onIncrement={() => stepMinute(5)}
          onDecrement={() => stepMinute(-5)}
          incrementLabel="زيادة الدقائق"
          decrementLabel="إنقاص الدقائق"
        />

        <View style={styles.periodRow}>
          <PeriodPill label="صباحًا" selected={period === 'ص'} onPress={() => setPeriod('ص')} />
          <PeriodPill label="مساءً" selected={period === 'م'} onPress={() => setPeriod('م')} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          onPress={apply}
          accessibilityRole="button"
          accessibilityLabel="تطبيق"
          style={({ pressed }) => [styles.applyBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.applyBtnLabel}>تطبيق</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Stepper({
  label,
  onIncrement,
  onDecrement,
  incrementLabel,
  decrementLabel,
}: {
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel: string;
  decrementLabel: string;
}) {
  return (
    <View style={[styles.stepperRow, KhazainShadows.card]}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        {/* Minus on the left, plus on the right (RTL visual order via row-reverse). */}
        <StepButton onPress={onDecrement} accessibilityLabel={decrementLabel} sign="minus" />
        <StepButton onPress={onIncrement} accessibilityLabel={incrementLabel} sign="plus" />
      </View>
    </View>
  );
}

function StepButton({
  onPress,
  accessibilityLabel,
  sign,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  sign: 'plus' | 'minus';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.stepBtn, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Path d="M4 9h10" stroke={KhazainColors.navy800} strokeWidth={2} strokeLinecap="round" />
        {sign === 'plus' ? (
          <Path d="M9 4v10" stroke={KhazainColors.navy800} strokeWidth={2} strokeLinecap="round" />
        ) : null}
      </Svg>
    </Pressable>
  );
}

function PeriodPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.periodPill,
        selected ? styles.periodPillActive : styles.periodPillInactive,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.periodLabel, selected ? styles.periodLabelActive : null]}>
        {label}
      </Text>
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
  body: { paddingHorizontal: 16, gap: 12 },
  preview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    marginBottom: 4,
  },
  previewTime: {
    fontFamily: 'Amiri-Bold',
    fontSize: 34,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  stepperRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  stepperLabel: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '600',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  stepperControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: 'rgba(26,53,87,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  periodPillActive: {
    backgroundColor: KhazainColors.navy800,
    borderColor: KhazainColors.navy800,
  },
  periodPillInactive: {
    backgroundColor: KhazainColors.cardBg,
    borderColor: KhazainColors.cardBorder,
  },
  periodLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '600',
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
  },
  periodLabelActive: { color: '#fff' },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(141,107,52,0.12)',
    backgroundColor: KhazainColors.pageBg,
  },
  applyBtn: {
    backgroundColor: KhazainColors.navy800,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    writingDirection: 'rtl',
  },
});
