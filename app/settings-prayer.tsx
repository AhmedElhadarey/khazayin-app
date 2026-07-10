/**
 * settings-prayer — prayer-times configuration with a LIVE preview.
 *
 * The five times shown here are REAL, computed on the fly by
 * `services/prayerTimes.ts` (the sole `adhan` boundary) from the persisted
 * `prayer` config — never a placeholder. Prayer *notifications* remain gated on
 * client-approved copy, but the computed instants are honest today, so this
 * screen displays them. When a value cannot be computed (no location, or a
 * polar / unresolvable latitude) the screen says so in Arabic rather than
 * rendering a dash.
 *
 * This screen imports NOTHING native (`adhan` / `expo-location` /
 * `expo-notifications`): every side effect goes through a service module.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { CALCULATION_METHOD_IDS, PRAYER_METHOD_LABELS_AR } from '@/constants/settings';
import { toArabicDigits as toArNum, toLocalDay } from '@/constants/progress';
import { computePrayerTimes } from '@/services/prayerTimes';
import { formatPrayerRows } from '@/services/prayerFormat';
import { applyDeviceLocationToPrayerConfig } from '@/services/prayerLocation';
import { getCategory } from '@/services/notificationRegistry';
import { useSettingsStore } from '@/store';
import type {
  CalculationMethodId,
  MadhabId,
  NotificationCategoryId,
  PrayerId,
} from '@/types/settings';

// Prayer id → registry category id, so the five Arabic prayer names come from
// the single source already used by the notifications screen (no new names).
const PRAYER_CATEGORY: Record<PrayerId, NotificationCategoryId> = {
  fajr: 'prayer-fajr',
  dhuhr: 'prayer-dhuhr',
  asr: 'prayer-asr',
  maghrib: 'prayer-maghrib',
  isha: 'prayer-isha',
};

function prayerLabel(id: PrayerId): string {
  return getCategory(PRAYER_CATEGORY[id])?.labelAr ?? id;
}

// Derived from the single exhaustive source, so a method can never be computable
// yet unselectable. A hand-written array here compiled cleanly with an id
// missing; `Record<CalculationMethodId, string>` does not.
const METHOD_OPTIONS: readonly { id: CalculationMethodId; label: string }[] =
  CALCULATION_METHOD_IDS.map((id) => ({ id, label: PRAYER_METHOD_LABELS_AR[id] }));

const MADHAB_OPTIONS: readonly { id: MadhabId; label: string }[] = [
  { id: 'shafi', label: 'الشافعي' },
  { id: 'hanafi', label: 'الحنفي' },
];

// Arabic decimal separator (U+066B) so coordinates read natively, e.g. ٣٠٫٠٤.
function formatCoord(n: number): string {
  return toArNum(n.toFixed(2)).replace('.', '٫');
}

// Guarded open of OS settings — copied verbatim from settings-notifications.tsx
// (Linking.openSettings can reject on some OEMs; fall back to an Arabic Alert).
function openOsSettings() {
  Linking.openSettings().catch(() => {
    Alert.alert('خطأ', 'تعذّر فتح الإعدادات.');
  });
}

function promptLocationPermission() {
  Alert.alert(
    'إذن الموقع مطلوب',
    'لحساب مواقيت الصلاة، يرجى السماح بالوصول إلى الموقع من إعدادات النظام.',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'فتح الإعدادات', onPress: openOsSettings },
    ],
  );
}

export default function SettingsPrayerScreen() {
  const config = useSettingsStore((s) => s.prayer);
  const setPrayerMethod = useSettingsStore((s) => s.setPrayerMethod);
  const setPrayerMadhab = useSettingsStore((s) => s.setPrayerMadhab);

  // Recompute only when the config changes. `toLocalDay()` is read at render
  // time (no live clock subscription is required for a config screen).
  const set = useMemo(() => computePrayerTimes(toLocalDay(), config), [config]);

  const [busy, setBusy] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const onLocate = async () => {
    if (busy) return; // guard against double taps
    setBusy(true);
    try {
      const outcome = await applyDeviceLocationToPrayerConfig();
      if (outcome === 'permission-denied') {
        promptLocationPermission();
      } else if (outcome === 'unavailable') {
        Alert.alert('تعذّر تحديد الموقع', 'تأكّد من تفعيل خدمة الموقع وحاول مرة أخرى.');
      }
      // 'updated' → nothing to alert; the store re-renders this screen.
    } finally {
      if (isMounted.current) setBusy(false);
    }
  };

  const rows = set === null ? [] : formatPrayerRows(set, prayerLabel);
  const locationLabel =
    config.location.kind === 'none'
      ? 'غير محدّد'
      : `${formatCoord(config.location.latitude)}، ${formatCoord(config.location.longitude)}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>مواقيت الصلاة</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Today's times — the live preview. */}
        <Text style={styles.sectionTitle}>مواقيت اليوم</Text>
        <View style={[styles.card, KhazainShadows.card]}>
          {config.location.kind === 'none' ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>لم يتم تحديد الموقع بعد</Text>
              <Text style={styles.emptyBody}>حدّد موقعك لحساب مواقيت الصلاة.</Text>
            </View>
          ) : set === null ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyBody}>تعذّر حساب المواقيت لهذا الموقع.</Text>
            </View>
          ) : (
            rows.map((row, i) => (
              <View
                key={row.id}
                style={[styles.timeRow, i < rows.length - 1 ? styles.timeRowDivider : null]}
              >
                <Text style={styles.timeName}>{row.labelAr}</Text>
                <Text style={styles.timeValue}>{row.time}</Text>
              </View>
            ))
          )}
        </View>

        {/* 2. Location. */}
        <Text style={styles.sectionTitle}>الموقع</Text>
        <View style={[styles.card, KhazainShadows.card]}>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabelText}>الموقع الحالي</Text>
            <Text style={styles.locationValue}>{locationLabel}</Text>
          </View>
          <Pressable
            onPress={onLocate}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel="تحديد موقعي"
            style={({ pressed }) => [
              styles.locateBtn,
              { opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.locateBtnLabel}>
              {busy ? 'جارٍ التحديد…' : 'تحديد موقعي'}
            </Text>
          </Pressable>
        </View>

        {/* 3. Calculation method. */}
        <Text style={styles.sectionTitle}>طريقة الحساب</Text>
        <View style={[styles.card, KhazainShadows.card]}>
          {METHOD_OPTIONS.map((opt, i) => (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={config.method === opt.id}
              onPress={() => setPrayerMethod(opt.id)}
              divider={i < METHOD_OPTIONS.length - 1}
            />
          ))}
        </View>

        {/* 4. Madhab. */}
        <Text style={styles.sectionTitle}>المذهب</Text>
        <View style={[styles.card, KhazainShadows.card]}>
          {MADHAB_OPTIONS.map((opt, i) => (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={config.madhab === opt.id}
              onPress={() => setPrayerMadhab(opt.id)}
              divider={i < MADHAB_OPTIONS.length - 1}
            />
          ))}
        </View>
        <Text style={styles.caption}>يؤثّر على وقت صلاة العصر فقط.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SelectRow({
  label,
  selected,
  onPress,
  divider,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  divider: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.selectRow,
        divider ? styles.selectRowDivider : null,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.selectLabel, selected ? styles.selectLabelActive : null]}>
        {label}
      </Text>
      {selected ? <CheckMark /> : null}
    </Pressable>
  );
}

function CheckMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10.5l3.5 3.5L16 6"
        stroke={KhazainColors.navy800}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  body: { paddingHorizontal: 16, gap: 8 },
  sectionTitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.navy900,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 12,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'flex-end',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  emptyBody: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    lineHeight: 22,
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  timeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
  },
  timeRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(141,107,52,0.12)',
  },
  timeName: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '600',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  timeValue: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
  },
  locationLabelText: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '600',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  locationValue: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
  },
  locateBtn: {
    backgroundColor: KhazainColors.navy800,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  locateBtnLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    writingDirection: 'rtl',
  },
  selectRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
  },
  selectRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(141,107,52,0.12)',
  },
  selectLabel: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  selectLabelActive: {
    fontWeight: '700',
    color: KhazainColors.navy800,
  },
  caption: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    lineHeight: 20,
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
    textAlign: 'right',
    paddingHorizontal: 4,
    marginTop: 6,
  },
});
