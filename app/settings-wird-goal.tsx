import React, { useState } from 'react';
import { PillButton } from '@/components/khazain/primitives';
import { SheetHandle } from '@/components/khazain/sheets';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePageSheetLayout } from '@/hooks/useResponsiveLayout';
import { useRouter } from 'expo-router';
import { PHYSICAL_BOX, PHYSICAL_ROW, SHEET_CHROME } from '@/constants/layout';
import { ChoiceRow } from '@/components/khazain/settings';
import { textStyle } from '@/constants/typography';
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
  const { columnStyle } = usePageSheetLayout();
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.handleWrap}>
        <SheetHandle />
      </View>
      <Text style={styles.title}>هدف الورد اليومي</Text>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 120 }, columnStyle]}
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
            <Text style={styles.customUnit}>صفحة</Text>
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
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {/* The rule spans the sheet; the button sits in the reading column. */}
        <View style={[styles.footerInner, columnStyle]}>
          <PillButton variant="navy" label="تطبيق" onPress={apply} style={styles.applyBtn} />
        </View>
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
    <ChoiceRow
      selected={selected}
      onPress={onPress}
      accessibilityLabel={`${label}، ${toArNum(pages)} صفحة`}
    >
      <Text style={styles.rowPages}>{`${toArNum(pages)} صفحة`}</Text>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
    </ChoiceRow>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  title: {
    ...textStyle('bodyLarge', { color: KhazainColors.ink900, textAlign: 'center' }),
    paddingTop: 6,
    paddingBottom: 12,
  },
  body: { paddingHorizontal: SHEET_CHROME.paddingHorizontal, gap: 16 },
  list: { gap: 8 },
  rowLabel: {
    flex: 1,
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  },
  rowPages: textStyle('bodyCompact', { color: KhazainColors.ink500 }),
  customBlock: { ...PHYSICAL_BOX, gap: 8 },
  customLabel: textStyle('cardTitle', { color: KhazainColors.ink700 }),
  customField: {
    // Physical left -> right: unit word, input.
    ...PHYSICAL_ROW,
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
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    paddingVertical: 4,
  },
  customUnit: textStyle('bodyCompact', { color: KhazainColors.ink500 }),
  footer: {
    paddingBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: KhazainColors.cardBorder,
    backgroundColor: KhazainColors.pageBg,
  },
  footerInner: { paddingHorizontal: SHEET_CHROME.paddingHorizontal },
  applyBtn: { width: '100%' },
});
