import { InlineHeader } from '@/components/khazain';
import { HeaderArt } from '@/components/khazain/patterns';
import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import {
  MAX_WIRD,
  MIN_WIRD,
  fromArabicDigits,
  toArabicDigits,
} from '@/constants/progress';
import { RECOMMENDATIONS_ENABLED } from '@/constants/recommendations';
import { resetFacade } from '@/db';
import { pageCountLabel } from '@/services/libraryStats';
import { useProgressStore } from '@/store/progressStore';
import { useRecommendationInputsStore } from '@/store/recommendationInputsStore';
import { useToastStore } from '@/store/toastStore';
import { useWirdStore } from '@/store/wirdStore';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { textStyle } from '@/constants/typography';
import { showNotice } from '@/services/notice';

const toAr = toArabicDigits;

export default function SettingsProgressScreen() {
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const currentTarget = useWirdStore((s) => s.target);
  const setTarget = useWirdStore((s) => s.setTarget);
  const refreshAll = useProgressStore((s) => s.refreshAll);
  const hydrateWird = useWirdStore((s) => s.hydrate);
  const showToast = useToastStore((s) => s.show);

  const [draft, setDraft] = useState<string>(String(currentTarget));
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => Number(fromArabicDigits(draft)), [draft]);
  const valid = Number.isInteger(parsed) && parsed >= MIN_WIRD && parsed <= MAX_WIRD;
  const dirty = valid && parsed !== currentTarget;

  const onSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await setTarget(parsed);
      showToast({ message: `تم تحديث الهدف إلى ${pageCountLabel(parsed)}`, durationMs: 2500 });
    } catch (err) {
      showNotice('تعذّر الحفظ', String(err));
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    Alert.alert(
      'إعادة تعيين التقدّم؟',
      'سيتم مسح بيانات القراءة والاستماع. الملاحظات والمحفوظات لن تتأثر.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد المسح',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetFacade.resetAll(Date.now());
              await Promise.all([
                refreshAll(),
                hydrateWird(),
                RECOMMENDATIONS_ENABLED
                  ? useRecommendationInputsStore.getState().refreshActivity()
                  : undefined,
              ]);
              showNotice('تم', 'تمت إعادة تعيين التقدّم');
            } catch (err) {
              showNotice('تعذّر إعادة التعيين', String(err));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      {/* Every other sub-screen in the app — all twelve under Sections and the
          other three under More — uses InlineHeader, which puts the title at the
          physical right in the body face. This screen was the last one still on
          InlineHeader, whose Amiri title is centred. */}
      <InlineHeader title="إعدادات التقدّم" onBack={() => router.back()} style={columnStyle} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, columnStyle]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, KhazainShadows.card]}>
            <Text style={styles.cardTitle}>هدف الورد اليومي</Text>
            <Text style={styles.cardBody}>
              عدد الصفحات التي تنوي قراءتها كل يوم. التغيير يسري على اليوم الحالي
              فورًا، والأيام السابقة تحتفظ بهدفها الأصلي.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={toArabicDigits(draft)}
                onChangeText={(t) => setDraft(fromArabicDigits(t).replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={3}
                style={[styles.input, !valid && styles.inputError]}
                placeholder={toAr(currentTarget)}
                placeholderTextColor={KhazainColors.ink400}
              />
              <Text style={styles.inputSuffix}>صفحة / يوم</Text>
            </View>
            {!valid ? (
              <Text style={styles.error}>
                {`أدخل رقمًا بين ${toAr(MIN_WIRD)} و ${toAr(MAX_WIRD)}`}
              </Text>
            ) : (
              <Text style={styles.hint}>
                {`الهدف الحالي: ${pageCountLabel(currentTarget)}`}
              </Text>
            )}
            <Pressable
              onPress={onSave}
              disabled={!dirty || saving}
              style={({ pressed }) => [
                styles.saveBtn,
                (!dirty || saving) && styles.saveBtnDisabled,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.saveLabel}>{saving ? 'جارٍ الحفظ...' : 'حفظ الهدف'}</Text>
            </Pressable>
          </View>

          <View style={[styles.card, styles.resetCard, KhazainShadows.card]}>
            <Text style={styles.cardTitle}>إعادة تعيين التقدّم</Text>
            <Text style={styles.cardBody}>
              يمحو سجل القراءة والمحاضرات والإنجازات. الملاحظات والمحفوظات تبقى كما هي.
            </Text>
            <Pressable
              onPress={onReset}
              style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.resetLabel}>إعادة تعيين التقدّم</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  // PHYSICAL_BOX so the cards below keep their authored edges: an unpinned
  // container under forceRTL resolves `textAlign: 'right'` to the physical
  // left, which is what put every heading and paragraph on this screen on the
  // wrong side.
  content: {
    ...PHYSICAL_BOX,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    gap: 10,
  },
  resetCard: {
    borderColor: KhazainColors.dangerBorder,
  },
  cardTitle: textStyle('sectionTitle', { color: KhazainColors.navy800 }),
  cardBody: textStyle('caption', { color: KhazainColors.ink500 }),
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  input: {
    ...textStyle('bodyLarge', { color: KhazainColors.navy800 }),
    flex: 1,
    backgroundColor: KhazainColors.cream100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KhazainColors.gold400,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: KhazainColors.danger,
  },
  inputSuffix: textStyle('caption', { color: KhazainColors.ink500 }),
  hint: textStyle('caption', { color: KhazainColors.ink500 }),
  error: textStyle('caption', { color: KhazainColors.danger }),
  saveBtn: {
    marginTop: 8,
    paddingVertical: 11,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: KhazainColors.ink400,
  },
  saveLabel: textStyle('cardTitle', { color: KhazainColors.pageBg, textAlign: 'center' }),
  resetBtn: {
    marginTop: 4,
    paddingVertical: 11,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.danger,
    alignItems: 'center',
  },
  resetLabel: textStyle('cardTitle', { color: KhazainColors.pageBg, textAlign: 'center' }),
});
