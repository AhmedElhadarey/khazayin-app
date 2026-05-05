import {
  AudioProgressCard,
  CircularProgress,
  ReminderCard,
  SearchPill,
  StatCard,
  Toggle,
} from '@/components/khazain';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { formatRelativeAr, useNotesStore } from '@/store/notesStore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const FILTERS: { id: string; label: string; count: string }[] = [
  { id: 'all', label: 'الكل', count: '١٢' },
  { id: 'saved', label: 'المحفوظات', count: '١٨' },
  { id: 'playlist', label: 'قوائم التشغيل', count: '٥' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const notes = useNotesStore((s) => s.notes);

  const [reminderOn, setReminderOn] = useState(true);
  const [smart1, setSmart1] = useState(true);
  const [smart2, setSmart2] = useState(true);
  const [smart3, setSmart3] = useState(false);
  const [filter, setFilter] = useState('all');

  const recentNotes = notes.slice(0, 2);

  // expo-router typed routes haven't regenerated for the new modals yet — cast to any.
  const openNewNote = (seedTitle?: string) =>
    router.push({ pathname: '/note-editor' as any, params: seedTitle ? { title: seedTitle } : {} });
  const openNotesViewer = () => router.push('/notes-viewer' as any);
  const openExistingNote = (id: string) =>
    router.push({ pathname: '/note-editor' as any, params: { id } });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>مكتبتي</Text>
        </View>
        <View style={styles.searchBlock}>
          <SearchPill placeholder="ابحث في مكتبتك..." />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            title="ملاحظاتي"
            subtitle={`${toArNum(notes.length)} ملاحظة`}
            icon={<PencilGlyph />}
          />
          <StatCard title="ورد القرآن" subtitle="٧ أيام متتالية" icon={<BookGlyph />} />
          <StatCard title="تذكراتي" subtitle="٣ تذكيرات" icon={<BellGlyph />} />
        </View>

        {/* Daily Wird card */}
        <View style={styles.block}>
          <View style={[styles.card, KhazainShadows.card]}>
            <View style={styles.wirdTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.wirdTitle}>وردُ القرآن اليومي</Text>
                <Text style={styles.wirdMeta}>آخر قراءة: اليوم</Text>
                <Text style={styles.wirdHighlight}>سورة البقرة · الآية ١٤٢</Text>
              </View>
              <CircularProgress pct={70} />
            </View>
            {/* Actions row: "بدء الورد" navy pill on RIGHT (first), toggle row on LEFT.
                Under forceRTL+row, JSX-first lands visually on the right. */}
            <View style={styles.wirdActions}>
              <Pressable
                onPress={() => {}}
                style={({ pressed }) => [styles.startBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.startBtnLabel}>بدء الورد</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <View style={styles.reminderInline}>
                <Text style={styles.reminderInlineLabel}>التذكير اليومي</Text>
                <Toggle on={reminderOn} onChange={setReminderOn} />
              </View>
            </View>
          </View>
        </View>

        {/* Quick note */}
        <View style={styles.block}>
          <View style={[styles.card, KhazainShadows.card]}>
            <Text style={styles.quickNoteTitle}>ملاحظة سريعة</Text>
            <Pressable
              onPress={() => openNewNote()}
              style={({ pressed }) => [styles.noteBody, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.noteBodyPlaceholder}>اكتب ملاحظتك هنا...</Text>
            </Pressable>
            {/* Toolbar: format buttons on the RIGHT (RTL leading), save pill on the LEFT.
                JSX order is right→left under forceRTL+row, so format btns come first. */}
            <View style={styles.noteToolbar}>
              <FormatBtn bold>B</FormatBtn>
              <FormatBtn italic>I</FormatBtn>
              <FormatBtn>
                <ListGlyph />
              </FormatBtn>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => openNewNote()}
                style={({ pressed }) => [styles.noteSaveBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.noteSaveLabel}>حفظ</Text>
              </Pressable>
            </View>
            <View style={styles.recentBlock}>
              <Text style={styles.recentHeader}>آخر الملاحظات</Text>
              {recentNotes.length === 0 ? (
                <Text style={styles.recentEmpty}>لا توجد ملاحظات بعد</Text>
              ) : (
                recentNotes.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => openExistingNote(n.id)}
                    style={({ pressed }) => [styles.recentRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {n.title || 'ملاحظة بلا عنوان'}
                    </Text>
                    <Text style={styles.recentTime}>{formatRelativeAr(n.updatedAt)}</Text>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        </View>

        {/* Filter pills */}
        <View style={styles.filtersRow}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={({ pressed }) => [
                  styles.filterPill,
                  active ? styles.filterPillActive : styles.filterPillInactive,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {f.label} {f.count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Audio progress */}
        <Text style={styles.sectionTitle}>تقدّم الكتب المسموعة</Text>
        <View style={styles.block}>
          <AudioProgressCard
            title="تفسير سورة البقرة"
            author="الشيخ محمد الشعراوي"
            pct={15}
            subtitle="١٥٪ مكتمل · الحلقة ١٣ من ٢٠"
            primaryLabel="متابعة"
            secondaryLabel="إضافة ملاحظة"
            onSecondary={() => openNewNote('تفسير سورة البقرة')}
          />
          <View style={{ height: 10 }} />
          <AudioProgressCard
            title="شرح الأربعين النووية"
            author="الشيخ صالح الفوزان"
            pct={100}
            subtitle="مكتمل · ٤٢ حلقة"
            primaryLabel="مراجعة"
            secondaryLabel="عرض الملاحظات"
            gold
            onSecondary={openNotesViewer}
          />
        </View>

        {/* Smart reminders */}
        <Text style={styles.sectionTitle}>التذكيرات الذكية</Text>
        <View style={styles.remindersBlock}>
          <ReminderCard
            active
            on={smart1}
            onToggle={setSmart1}
            title="تذكير ورد القرآن"
            body="لم تقرأ الورد منذ ٣ أيام. تذكّر أن قراءة القرآن نور وشفاء للقلوب."
            next="التذكير التالي: غداً الساعة ٨:٠٠ ص"
            icon={<BookGlyph size={14} />}
          />
          <ReminderCard
            on={smart2}
            onToggle={setSmart2}
            title="متابعة الاستماع"
            body='حان وقت متابعة "تفسير سورة البقرة"'
            next="التذكير التالي: اليوم الساعة ٧:٠٠ م"
            icon={<HeadphonesGlyph size={14} />}
          />
          <ReminderCard
            on={smart3}
            onToggle={setSmart3}
            title="مراجعة الأهداف"
            body="راجع تقدّمك في الأهداف الأسبوعية."
            next="التذكير التالي: الأحد الساعة ١٠:٠٠ ص"
            icon={<StarGlyph size={14} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small inline components / glyphs ──────────────────────────────

function FormatBtn({
  children,
  bold,
  italic,
}: {
  children: React.ReactNode;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [formatStyles.btn, { opacity: pressed ? 0.75 : 1 }]}>
      {typeof children === 'string' ? (
        <Text
          style={[
            formatStyles.label,
            bold && { fontWeight: '700' },
            italic && { fontStyle: 'italic' },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

function toArNum(n: number): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return n
    .toString()
    .split('')
    .map((c) => map[Number(c)] ?? c)
    .join('');
}

function PencilGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 17l1-4 10-10 3 3L7 16l-4 1z"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 4h12v14H6a2 2 0 01-2-2V4z"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function BellGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 3a5 5 0 00-5 5v3L3 14h14l-2-3V8a5 5 0 00-5-5zM8 17a2 2 0 004 0"
        stroke={KhazainColors.gold500}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeadphonesGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10V8a6 6 0 0112 0v2M4 10v3a2 2 0 002 2h1v-5H4zm12 0v3a2 2 0 01-2 2h-1v-5h3z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function StarGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 3l2.5 5 5.5.8-4 3.8 1 5.4L10 15.5 5 18l1-5.4-4-3.8L7.5 8 10 3z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ListGlyph() {
  return (
    <Svg width={12} height={12} viewBox="0 0 14 14">
      <Path
        d="M2 3h10M2 7h10M2 11h10"
        stroke={KhazainColors.ink700}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headerBlock: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, alignItems: 'center' },
  h1: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
  searchBlock: { paddingHorizontal: 18, paddingBottom: 14 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  block: { paddingHorizontal: 14, marginBottom: 14 },
  remindersBlock: { paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
  },
  wirdTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  wirdTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  wirdMeta: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginTop: 4,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  wirdHighlight: {
    fontSize: 12,
    color: KhazainColors.ink700,
    marginTop: 2,
    fontWeight: '600',
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  wirdActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  startBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnLabel: {
    color: '#fff',
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '600',
  },
  reminderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  reminderInlineLabel: {
    fontSize: 11,
    color: KhazainColors.ink500,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  quickNoteTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.navy800,
    marginBottom: 8,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  noteBody: {
    backgroundColor: KhazainColors.cream100,
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  noteBodyPlaceholder: {
    fontSize: 12,
    color: KhazainColors.ink400,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  noteToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  noteSaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
  },
  noteSaveLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'TheSansArabic',
  },
  recentBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(141,107,52,0.1)',
    marginTop: 12,
    paddingTop: 10,
  },
  recentHeader: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginBottom: 6,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  recentTitle: {
    color: KhazainColors.ink900,
    fontWeight: '500',
    fontSize: 12,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  recentTime: {
    color: KhazainColors.ink400,
    fontSize: 12,
    fontFamily: 'TheSansArabic',
  },
  recentEmpty: {
    color: KhazainColors.ink400,
    fontSize: 12,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
    paddingVertical: 6,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  filterPillActive: {
    backgroundColor: KhazainColors.navy800,
  },
  filterPillInactive: {
    backgroundColor: KhazainColors.cream50,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  filterLabelActive: { color: '#fff' },
  sectionTitle: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});

const formatStyles = StyleSheet.create({
  btn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: KhazainColors.cream100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'System',
    fontSize: 13,
    color: KhazainColors.ink700,
  },
});
