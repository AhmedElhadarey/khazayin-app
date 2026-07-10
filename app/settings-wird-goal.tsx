import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import {
  JUZ_PRESET_PAGES,
  fromArabicDigits,
  toArabicDigits as toArNum,
  type JuzPreset,
} from '@/constants/progress';
import { presetToPages } from '@/db/helpers/wirdPresets';
import { useWirdStore } from '@/store/wirdStore';

// Labels use the traditional ḥizb family (جزء → حزب = ½ juz → ربع الحزب = ⅛ juz),
// NOT juz fractions.
//
// The arithmetic of "ربع الجزء = ٥ صفحات" is correct (¼ × 20), but the phrase
// collides with **ربع الحزب** — the ۞-marked unit, which is ⅛ of a juz, ~2.5
// pages. A Quran-literate reader can see "ربع" and estimate half the pages we
// mean. `نصف حزب` is exactly 5 pages and stays inside the authentic naming
// family, so there is nothing to misread. Page counts are shown alongside to
// remove any residual ambiguity.
const PRESETS: readonly { id: JuzPreset; label: string }[] = [
  { id: 'quarter', label: 'نصف حزب' },
  { id: 'half', label: 'حزب' },
  { id: 'full', label: 'جزء' },
];

export default function SettingsWirdGoalScreen() {
  const router = useRouter();
  const currentTarget = useWirdStore((s) => s.target);
  const setTarget = useWirdStore((s) => s.setTarget);

  // Staged draft — nothing is committed until تطبيق (matches settings-font-size).
  const [draft, setDraft] = useState<string>(String(currentTarget));

  const parsed = Number(fromArabicDigits(draft.trim()));
  const draftPages = Number.isFinite(parsed) ? parsed : NaN;

  const apply = async () => {
    try {
      // The repository owns the 1..604 range rule — do not re-implement it here.
      // An invalid draft (empty, non-integer, out of range) rejects there and we
      // surface a single Arabic message instead of duplicating the bound.
      await setTarget(draftPages);
      router.back();
    } catch {
      Alert.alert(
        'قيمة غير صالحة',
        'الرجاء إدخال عدد صفحات بين ١ و ٦٠٤.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>هدف الورد اليومي</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {PRESETS.map((preset) => {
            const pages = presetToPages(preset.id);
            return (
              <PresetRow
                key={preset.id}
                label={preset.label}
                pages={pages}
                selected={draftPages === pages}
                onPress={() => setDraft(String(pages))}
              />
            );
          })}
        </View>

        <View style={styles.customBlock}>
          <Text style={styles.customLabel}>عدد مخصّص من الصفحات</Text>
          <View style={[styles.customField, KhazainShadows.card]}>
            <TextInput
              style={styles.customInput}
              value={toArNum(draft)}
              onChangeText={(text) => setDraft(fromArabicDigits(text).replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              textAlign="center"
              placeholder={toArNum(JUZ_PRESET_PAGES.half)}
              placeholderTextColor={KhazainColors.ink400}
            />
            <Text style={styles.customUnit}>صفحة</Text>
          </View>
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

function PresetRow({
  label,
  pages,
  selected,
  onPress,
}: {
  label: string;
  pages: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
        selected ? styles.rowSelected : null,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.rowPages}>{`${toArNum(pages)} صفحة`}</Text>
      {selected ? (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path
            d="M4 9.5l3.5 3.5L14 5.5"
            stroke={KhazainColors.goldAccent}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
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
  body: { paddingHorizontal: 16, gap: 16 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  rowSelected: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Amiri-Bold',
    fontWeight: '700',
    fontSize: 16,
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowPages: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  customBlock: { gap: 8 },
  customLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '600',
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  customField: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  customInput: {
    flex: 1,
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    paddingVertical: 4,
  },
  customUnit: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
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
