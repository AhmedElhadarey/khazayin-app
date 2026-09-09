import { DetailHeader } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import {
  MAX_WIRD,
  MIN_WIRD,
  fromArabicDigits,
  toArabicDigits,
} from '@/constants/progress';
import { resetFacade } from '@/db';
import { useProgressStore } from '@/store/progressStore';
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

const toAr = toArabicDigits;

export default function SettingsProgressScreen() {
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
      showToast({ message: `تم تحديث الهدف إلى ${toAr(parsed)} صفحة`, durationMs: 2500 });
    } catch (err) {
      Alert.alert('تعذّر الحفظ', String(err));
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
              await Promise.all([refreshAll(), hydrateWird()]);
              Alert.alert('تم', 'تمت إعادة تعيين التقدّم');
            } catch (err) {
              Alert.alert('تعذّر إعادة التعيين', String(err));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <DetailHeader title="إعدادات التقدّم" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
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
                value={draft}
                onChangeText={(v) => setDraft(v)}
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
                {`الهدف الحالي: ${toAr(currentTarget)} صفحة`}
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
    gap: 10,
  },
  resetCard: {
    borderColor: 'rgba(176,52,40,0.18)',
  },
  cardTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  cardBody: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink500,
    lineHeight: 20,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  input: {
    flex: 1,
    backgroundColor: KhazainColors.cream100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KhazainColors.gold400,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'TheSansArabic',
    fontSize: 18,
    color: KhazainColors.navy800,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputError: {
    borderColor: '#C04A3A',
  },
  inputSuffix: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
  },
  hint: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  error: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: '#C04A3A',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: KhazainColors.ink400,
  },
  saveLabel: {
    color: '#fff',
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    marginTop: 4,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#C04A3A',
    alignItems: 'center',
  },
  resetLabel: {
    color: '#fff',
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '700',
  },
});
