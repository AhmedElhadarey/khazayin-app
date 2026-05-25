import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { KhazainConfig } from '@/constants/config';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { SettingsSection, SettingsValueRow } from '@/components/khazain/settings';
import type { FontSizeLevel } from '@/types/settings';
import {
  useNotesStore,
  useQiratStore,
  useRecitersStore,
  useSettingsStore,
  useToastStore,
} from '@/store';
import { clearAppCache } from '@/services/cacheFacade';
import { shareNotes } from '@/services/notesExporter';

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
  const qiraat = useQiratStore((s) => s.data);
  const reciters = useRecitersStore((s) => s.data);
  const fetchQiraat = useQiratStore((s) => s.fetch);
  const fetchReciters = useRecitersStore((s) => s.fetch);

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

  const qiraaName =
    qiraat.find((q) => q.id === defaultQiraaId)?.name ?? 'حفص عن عاصم';
  const reciterName =
    reciters.find((r) => r.id === preferredReciterId)?.name ?? '—';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>الإعدادات</Text>
        </View>
        <SettingsSection title="التلاوة">
          <SettingsValueRow
            title="القراءة الافتراضية"
            value={qiraaName}
            icon={<QiraaIcon />}
            onPress={() => router.push('/settings-qiraa' as any)}
          />
          <SettingsValueRow
            title="القارئ المفضّل"
            value={reciterName}
            icon={<ReciterIcon />}
            onPress={() => router.push('/settings-reciter' as any)}
          />
        </SettingsSection>
        <SettingsSection title="القراءة">
          <SettingsValueRow
            title="حجم خط القرآن"
            value={FONT_LEVEL_LABELS[fontSizeLevel]}
            icon={<FontSizeIcon />}
            onPress={() => router.push('/settings-font-size' as any)}
          />
        </SettingsSection>
        <SettingsSection title="الإشعارات">{null}</SettingsSection>
        <SettingsSection title="التطبيق">
          <SettingsValueRow
            title="حول التطبيق"
            value="الإصدار والمؤسسة"
            icon={<AboutIcon />}
            onPress={() => router.push('/settings-about' as any)}
          />
        </SettingsSection>
        <SettingsSection title="البيانات">
          <SettingsValueRow
            title="تفريغ الذاكرة المؤقتة"
            value=""
            icon={<TrashIcon />}
            onPress={onClearCache}
          />
          <SettingsValueRow
            title="تصدير الملاحظات"
            value=""
            icon={<ExportIcon />}
            onPress={onExportNotes}
          />
        </SettingsSection>
        <SettingsSection title="قانوني">
          <SettingsValueRow
            title="سياسة الخصوصية"
            value=""
            icon={<PrivacyIcon />}
            onPress={openPrivacyPolicy}
          />
        </SettingsSection>
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
