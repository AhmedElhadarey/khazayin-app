import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import { MOCK_RESOURCES} from '@/data/mockData';

type AudioFilter = 'all' | 'playlists' | 'collections';

// ─── Quick Stats Card ───

function QuickStatCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const theme = useColorScheme();
  
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: Colors[theme].surface }]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon as any} size={24} color={Colors[theme].primary} />
      <Text style={[styles.statLabel, { color: Colors[theme].textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: Colors[theme].textMuted }]}>{value}</Text>
    </TouchableOpacity>
  );
}

// ─── Daily Quran Wird Card ───

function DailyWirdCard() {
  const theme = useColorScheme();
  const { dailyQuranPage } = useAppStore();
  
  // Calculate progress (604 total pages in Quran)
  const totalPages = 604;
  const progressPercent = Math.round((dailyQuranPage / totalPages) * 100);
  
  return (
    <View style={[styles.wirdCard, { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].border }]}>
      {/* Header */}
      <View style={styles.wirdHeader}>
        <View style={styles.wirdTitleRow}>
          <Text style={[styles.wirdTitle, { color: Colors[theme].text }]}>
            ورد القرآن اليومي
          </Text>
          <View style={[styles.wirdIcon, { backgroundColor: Colors[theme].surfaceAlt }]}>
            <Ionicons name="book" size={20} color={Colors[theme].primary} />
          </View>
        </View>
        {/* Progress Badge */}
        <View style={[styles.progressBadge, { backgroundColor: Colors[theme].surfaceAlt }]}>
          <Text style={[styles.progressBadgeText, { color: Colors[theme].textMuted }]}>
            {progressPercent}%
          </Text>
        </View>
      </View>
      
      {/* Info Row */}
      <View style={styles.wirdInfoRow}>
        <View style={styles.wirdInfoItem}>
          <Text style={[styles.wirdInfoLabel, { color: Colors[theme].textMuted }]}>
            آخر قراءة اليوم
          </Text>
          <Text style={[styles.wirdInfoValue, { color: Colors[theme].textSecondary }]}>
            سورة البقرة - الآية ٢٨٤
          </Text>
        </View>
        <View style={styles.wirdInfoItem}>
          <Text style={[styles.wirdInfoLabel, { color: Colors[theme].textMuted }]}>
            التذكير اليومي
          </Text>
          <View style={styles.reminderToggle}>
            <Switch
              value={true}
              trackColor={{ false: Colors[theme].border, true: Colors[theme].primary }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scale: 0.8 }] }}
            />
          </View>
        </View>
      </View>
      
      {/* Start Button */}
      <TouchableOpacity
        style={[styles.wirdButton, { backgroundColor: Colors[theme].primary }]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="بدء الورد"
      >
        <Text style={styles.wirdButtonText}>بدء الورد</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Quick Note Input ───

function QuickNoteSection() {
  const theme = useColorScheme();
  const [noteText, setNoteText] = useState('');
  const [recentNotes] = useState([
    { id: '1', text: 'تأملات في سورة الفاتحة', category: 'حفظ ساخوطي' },
    { id: '2', text: 'فوائد من درس الأخلاق', category: 'أمس' },
    { id: '3', text: 'فوائد من درس الأخلاق', category: 'أمس' },
  ]);
  
  return (
    <View style={styles.noteSection}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View />
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
            ملاحظة سريعة
          </Text>
          <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />
        </View>
      </View>
      
      {/* Note Input */}
      <View style={[styles.noteInputContainer, { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].border }]}>
        <TextInput
          style={[styles.noteInput, { color: Colors[theme].text }]}
          placeholder="اكتب ملاحظتك هنا..."
          placeholderTextColor={Colors[theme].textMuted}
          value={noteText}
          onChangeText={setNoteText}
          textAlign="right"
          multiline
        />
      </View>
      
      {/* Note Actions */}
      <View style={styles.noteActionsRow}>
        <TouchableOpacity
          style={[styles.noteSaveButton, { backgroundColor: Colors[theme].primary }]}
          accessibilityRole="button"
          accessibilityLabel="حفظ"
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>حفظ</Text>
        </TouchableOpacity>
        <View style={styles.noteIcons}>
          <TouchableOpacity style={styles.noteIconBtn} accessibilityLabel="قائمة">
            <Ionicons name="list-outline" size={18} color={Colors[theme].textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.noteIconBtn} accessibilityLabel="صورة">
            <Ionicons name="image-outline" size={18} color={Colors[theme].textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.noteIconBtn} accessibilityLabel="حذف">
            <Ionicons name="trash-outline" size={18} color={Colors[theme].textMuted} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Recent Notes List */}
      <View style={styles.recentNotesHeader}>
        <Text style={[styles.recentNotesTitle, { color: Colors[theme].textSecondary }]}>
          آخر الملاحظات
        </Text>
      </View>
      
      {recentNotes.map((note) => (
        <TouchableOpacity
          key={note.id}
          style={[styles.noteItem, { borderBottomColor: Colors[theme].borderLight }]}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.noteCategory, { color: Colors[theme].textMuted }]}>
            {note.category}
          </Text>
          <Text style={[styles.noteText, { color: Colors[theme].text }]} numberOfLines={1}>
            {note.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Audio Book Progress Section ───

function AudioBookProgress() {
  const theme = useColorScheme();
  const [activeFilter, setActiveFilter] = useState<AudioFilter>('all');
  
  const filters: { key: AudioFilter; label: string }[] = [
    { key: 'playlists', label: 'قوائم التشغيل' },
    { key: 'collections', label: 'المجموعات' },
    { key: 'all', label: 'الكل' },
  ];
  
  const audioBooks = [
    {
      id: '1',
      title: 'تفسير سورة البقرة',
      author: 'الشيخ محمد الشنقيطي',
      progress: 75,
      status: '٧٥٪ مكتمل',
      duration: 'الحلقة ١٥ من ٢٠',
    },
    {
      id: '2',
      title: 'شرح الأربعين النووية',
      author: 'الشيخ صالح الفوزان',
      progress: 100,
      status: 'مكتمل',
      duration: '',
    },
  ];
  
  return (
    <View style={styles.audioSection}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View />
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
            تقدم الكتب المسموعة
          </Text>
          <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />
        </View>
      </View>
      
      {/* Filter Chips */}
      <View style={styles.filterChipsRow}>
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? Colors[theme].primary : Colors[theme].surface,
                  borderColor: isActive ? Colors[theme].primary : Colors[theme].border,
                },
              ]}
              onPress={() => setActiveFilter(filter.key)}
              accessibilityRole="button"
              accessibilityLabel={filter.label}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? '#FFFFFF' : Colors[theme].textSecondary,
                }}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Audio Book Cards */}
      {audioBooks.map((book) => (
        <View
          key={book.id}
          style={[styles.audioCard, { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].border }]}
        >
          <View style={styles.audioCardHeader}>
            <View style={styles.audioCardInfo}>
              <Text style={[styles.audioCardTitle, { color: Colors[theme].text }]}>
                {book.title}
              </Text>
              <Text style={[styles.audioCardAuthor, { color: Colors[theme].textMuted }]}>
                {book.author}
              </Text>
            </View>
            <View style={[styles.audioIcon, { backgroundColor: Colors[theme].surfaceAlt }]}>
              <Ionicons name="headset" size={20} color={Colors[theme].primary} />
            </View>
          </View>
          
          {book.progress < 100 && (
            <View style={styles.audioProgressRow}>
              <Text style={[styles.audioProgressText, { color: Colors[theme].textMuted }]}>
                {book.status}
              </Text>
              <Text style={[styles.audioDuration, { color: Colors[theme].textSecondary }]}>
                {book.duration}
              </Text>
            </View>
          )}
          
          {/* Progress Bar */}
          <View style={[styles.audioProgressBar, { backgroundColor: Colors[theme].progressBg }]}>
            <View
              style={[
                styles.audioProgressFill,
                {
                  backgroundColor: book.progress === 100 ? Colors[theme].success : Colors[theme].primary,
                  width: `${book.progress}%`,
                },
              ]}
            />
          </View>
          
          {/* Action Buttons */}
          <View style={styles.audioActions}>
            {book.progress === 100 ? (
              <TouchableOpacity
                style={[styles.audioActionBtn, { backgroundColor: Colors[theme].surfaceAlt }]}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 11, color: Colors[theme].textSecondary }}>عرض الملاحظات</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.audioActionBtn, { backgroundColor: Colors[theme].surfaceAlt }]}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 11, color: Colors[theme].textSecondary }}>إضافة ملاحظة</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.audioActionBtn, { backgroundColor: Colors[theme].primary }]}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '600' }}>متابعة</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Smart Reminders Section ───

function SmartReminders() {
  const theme = useColorScheme();
  
  const reminders = [
    {
      id: '1',
      icon: 'book',
      title: 'تذكير ورد القرآن',
      description: 'حان وقت ورد "تأملات سورة البقرة" هل وجدنا الخشوع يوم؟ وشعب للعقول!',
      subtitle: 'التذكير القادم: غدًا الساعة ٦:٠٠ م',
      enabled: true,
      color: Colors[theme].primary,
    },
    {
      id: '2',
      icon: 'headset',
      title: 'متابعة الاستماع',
      description: 'حان وقت متابعة "تفسير سورة البقرة"',
      subtitle: 'التذكير القادم: اليوم الساعة ٩:٠٠ م',
      enabled: true,
      color: Colors[theme].secondary,
    },
    {
      id: '3',
      icon: 'flag',
      title: 'مراجعة الأهداف',
      description: 'راجع أهدافك من الأهداف الأسبوعية',
      subtitle: 'التذكير القادم: بعد الساعة ١٠:٠٠ م',
      enabled: false,
      color: Colors[theme].textMuted,
    },
  ];
  
  return (
    <View style={styles.remindersSection}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View />
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
            التذكيرات الذكية
          </Text>
          <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />
        </View>
      </View>
      
      {/* Reminder Cards */}
      {reminders.map((reminder) => (
        <View
          key={reminder.id}
          style={[
            styles.reminderCard,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
              opacity: reminder.enabled ? 1 : 0.6,
            },
          ]}
        >
          <View style={styles.reminderHeader}>
            <Switch
              value={reminder.enabled}
              trackColor={{ false: Colors[theme].border, true: Colors[theme].primary }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scale: 0.75 }] }}
            />
            <View style={styles.reminderInfo}>
              <Text style={[styles.reminderTitle, { color: Colors[theme].text }]}>
                {reminder.title}
              </Text>
            </View>
            <View style={[styles.reminderIcon, { backgroundColor: reminder.color + '15' }]}>
              <Ionicons name={reminder.icon as any} size={18} color={reminder.color} />
            </View>
          </View>
          
          <Text style={[styles.reminderDesc, { color: Colors[theme].textSecondary }]}>
            {reminder.description}
          </Text>
          
          <Text style={[styles.reminderSubtitle, { color: Colors[theme].textMuted }]}>
            {reminder.subtitle}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Library Screen ───

export default function SavedScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const [searchText, setSearchText] = useState('');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: Colors[theme].text }]}>
            مكتبتي
          </Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: Colors[theme].text }]}
              placeholder="بحث..."
              placeholderTextColor={Colors[theme].textMuted}
              value={searchText}
              onChangeText={setSearchText}
              textAlign="right"
            />
            <Ionicons name="search-outline" size={18} color={Colors[theme].textMuted} />
          </View>
        </View>
        
        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <QuickStatCard icon="alarm-outline" label="تذكيراتي" value="+٣ تذكيرات نشطة" />
          <QuickStatCard icon="book-outline" label="ورد القرآن" value="٧ أيام متتالية" />
          <QuickStatCard icon="pencil-outline" label="ملاحظاتي" value="٢٣ ملاحظة" />
        </View>
        
        {/* Daily Wird Card */}
        <View style={styles.cardSection}>
          <DailyWirdCard />
        </View>
        
        {/* Quick Notes Section */}
        <QuickNoteSection />
        
        {/* Audio Book Progress */}
        <AudioBookProgress />
        
        {/* Smart Reminders */}
        <View style={{ marginBottom: Spacing.xxxl }}>
          <SmartReminders />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Page Header
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  
  // Search
  searchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: Border.radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    writingDirection: 'rtl',
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Border.radius.md,
    ...Shadows.sm,
  },
  statLabel: {
    fontSize: 11,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Card Section
  cardSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  
  // Wird Card
  wirdCard: {
    borderRadius: Border.radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  wirdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  wirdTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wirdTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  wirdIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Border.radius.sm,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  wirdInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  wirdInfoItem: {
    alignItems: 'flex-end',
  },
  wirdInfoLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  wirdInfoValue: {
    fontSize: 12,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wirdButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Border.radius.md,
  },
  wirdButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  
  // Note Section
  noteSection: {
    marginBottom: Spacing.xl,
  },
  noteInputContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: Border.radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 80,
    marginBottom: Spacing.sm,
  },
  noteInput: {
    fontSize: 14,
    writingDirection: 'rtl',
    textAlignVertical: 'top',
  },
  noteActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  noteSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.lg,
    borderRadius: Border.radius.sm,
  },
  noteIcons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  noteIconBtn: {
    padding: 4,
  },
  recentNotesHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  recentNotesTitle: {
    fontSize: 12,
    textAlign: 'right',
  },
  noteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noteCategory: {
    fontSize: 10,
  },
  noteText: {
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  
  // Audio Section
  audioSection: {
    marginBottom: Spacing.xl,
  },
  filterChipsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.xl,
    borderWidth: 1,
  },
  audioCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: Border.radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  audioCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  audioCardInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  audioCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  audioCardAuthor: {
    fontSize: 11,
    marginTop: 2,
  },
  audioIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  audioProgressText: {
    fontSize: 10,
  },
  audioDuration: {
    fontSize: 10,
  },
  audioProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  audioProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  audioActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Spacing.sm,
  },
  audioActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.sm,
  },
  
  // Reminders Section
  remindersSection: {
    marginBottom: Spacing.lg,
  },
  reminderCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: Border.radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reminderInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderDesc: {
    fontSize: 11,
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  reminderSubtitle: {
    fontSize: 10,
    textAlign: 'right',
  },
});
