import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/useAppStore';

type LibraryFilter = 'all' | 'favorites' | 'playlists';

// ─── Quick Action Card ───

function QuickActionCard({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].borderLight }]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${subtitle}`}
    >
      <View style={[styles.actionCardIcon, { backgroundColor: Colors[theme].surfaceAlt }]}>
        <Ionicons name={icon} size={20} color={Colors[theme].primary} />
      </View>
      <Text
        style={[styles.actionCardLabel, { color: Colors[theme].text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.actionCardSubtitle, { color: Colors[theme].textMuted }]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ───

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  const theme = useColorScheme();

  return (
    <View style={styles.sectionHeader}>
      {onSeeAll ? (
        <TouchableOpacity
          onPress={onSeeAll}
          style={styles.seeAllButton}
          accessibilityRole="button"
          accessibilityLabel={`عرض الكل - ${title}`}
        >
          <Ionicons name="chevron-back" size={16} color={Colors[theme].textMuted} />
          <Text style={{ fontSize: 12, color: Colors[theme].textMuted }}>
            عرض الكل
          </Text>
        </TouchableOpacity>
      ) : (
        <View />
      )}
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          {title}
        </Text>
        <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />
      </View>
    </View>
  );
}

// ─── Daily Quran Wird Card ───

function DailyWirdCard() {
  const theme = useColorScheme();
  const { dailyQuranPage } = useAppStore();
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const totalPages = 604;
  const progressPercent = Math.round((dailyQuranPage / totalPages) * 100);

  return (
    <View style={[styles.wirdCard, { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].borderLight }]}>
      {/* Header Row */}
      <View style={styles.wirdHeader}>
        <View style={[styles.progressBadge, { backgroundColor: Colors[theme].surfaceAlt }]}>
          <Text style={[styles.progressBadgeText, { color: Colors[theme].textMuted }]}>
            {progressPercent}%
          </Text>
        </View>
        <View style={styles.wirdTitleRow}>
          <Text style={[styles.wirdTitle, { color: Colors[theme].text }]}>
            ورد القرآن اليومي
          </Text>
          <View style={[styles.wirdIcon, { backgroundColor: Colors[theme].surfaceAlt }]}>
            <Ionicons name="book" size={20} color={Colors[theme].primary} />
          </View>
        </View>
      </View>

      {/* Info Row */}
      <View style={styles.wirdInfoRow}>
        <View style={styles.wirdInfoItem}>
          <Text style={[styles.wirdInfoLabel, { color: Colors[theme].textMuted }]}>
            التذكير اليومي
          </Text>
          <View style={styles.reminderToggle}>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: Colors[theme].switchTrack, true: Colors[theme].switchTrackActive }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scale: 0.75 }] }}
            />
          </View>
        </View>
        <View style={styles.wirdInfoItem}>
          <Text style={[styles.wirdInfoLabel, { color: Colors[theme].textMuted }]}>
            آخر قراءة اليوم
          </Text>
          <Text style={[styles.wirdInfoValue, { color: Colors[theme].textSecondary }]}>
            سورة البقرة - الآية ٢٨٤
          </Text>
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

// ─── Quick Note Section ───

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
      <SectionHeader title="ملاحظة سريعة" />

      {/* Note Input */}
      <View
        style={[
          styles.noteInputContainer,
          { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].borderLight },
        ]}
      >
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

      {/* Recent Notes */}
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
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');

  const filters: { key: LibraryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'playlists', label: 'قوائم التشغيل', icon: 'list-outline' },
    { key: 'favorites', label: 'المفضلات', icon: 'heart-outline' },
    { key: 'all', label: 'الكل', icon: 'grid-outline' },
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
      <SectionHeader title="تقدم الكتب المسموعة" />

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
                  backgroundColor: isActive ? Colors[theme].chipBgActive : Colors[theme].surface,
                  borderColor: isActive ? Colors[theme].chipBgActive : Colors[theme].border,
                },
              ]}
              onPress={() => setActiveFilter(filter.key)}
              accessibilityRole="button"
              accessibilityLabel={filter.label}
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={filter.icon}
                size={12}
                color={isActive ? '#FFFFFF' : Colors[theme].textSecondary}
                style={{ marginLeft: 4 }}
              />
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
          style={[styles.audioCard, { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].borderLight }]}
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
                  backgroundColor: book.progress === 100 ? Colors[theme].success : Colors[theme].progressFill,
                  width: `${book.progress}%` as `${number}%`,
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
  const [reminderStates, setReminderStates] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': false,
  });

  const reminders = [
    {
      id: '1',
      icon: 'book' as keyof typeof Ionicons.glyphMap,
      title: 'تذكير ورد القرآن',
      description: 'حان وقت ورد "تأملات سورة البقرة" هل وجدنا الخشوع يوم؟ وشعب للعقول!',
      subtitle: 'التذكير القادم: غدًا الساعة ٦:٠٠ م',
      color: Colors[theme].primary,
    },
    {
      id: '2',
      icon: 'headset' as keyof typeof Ionicons.glyphMap,
      title: 'متابعة الاستماع',
      description: 'حان وقت متابعة "تفسير سورة البقرة"',
      subtitle: 'التذكير القادم: اليوم الساعة ٩:٠٠ م',
      color: Colors[theme].secondary,
    },
    {
      id: '3',
      icon: 'flag' as keyof typeof Ionicons.glyphMap,
      title: 'مراجعة الأهداف',
      description: 'راجع أهدافك من الأهداف الأسبوعية',
      subtitle: 'التذكير القادم: بعد الساعة ١٠:٠٠ م',
      color: Colors[theme].textMuted,
    },
  ];

  const toggleReminder = (id: string) => {
    setReminderStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.remindersSection}>
      <SectionHeader title="التذكيرات الذكية" />

      {reminders.map((reminder) => {
        const enabled = reminderStates[reminder.id] ?? false;
        return (
          <View
            key={reminder.id}
            style={[
              styles.reminderCard,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].borderLight,
                opacity: enabled ? 1 : 0.6,
              },
            ]}
          >
            <View style={styles.reminderHeader}>
              <Switch
                value={enabled}
                onValueChange={() => toggleReminder(reminder.id)}
                trackColor={{ false: Colors[theme].switchTrack, true: Colors[theme].switchTrackActive }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scale: 0.75 }] }}
              />
              <View style={styles.reminderInfo}>
                <Text style={[styles.reminderTitle, { color: Colors[theme].text }]}>
                  {reminder.title}
                </Text>
              </View>
              <View style={[styles.reminderIcon, { backgroundColor: reminder.color + '15' }]}>
                <Ionicons name={reminder.icon} size={18} color={reminder.color} />
              </View>
            </View>

            <Text style={[styles.reminderDesc, { color: Colors[theme].textSecondary }]}>
              {reminder.description}
            </Text>

            <Text style={[styles.reminderSubtitle, { color: Colors[theme].textMuted }]}>
              {reminder.subtitle}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Add Note Modal ───

function AddNoteModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const theme = useColorScheme();
  const [noteText, setNoteText] = useState('');

  const handleSave = () => {
    if (noteText.trim()) {
      onSave(noteText);
      setNoteText('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: Colors[theme].surface }]}>
          <Text style={[styles.modalTitle, { color: Colors[theme].text }]}>إضافة ملاحظة</Text>

          <View style={[styles.modalInput, { backgroundColor: Colors[theme].surfaceAlt, borderColor: Colors[theme].border }]}>
            <TextInput
              style={[styles.modalTextInput, { color: Colors[theme].text }]}
              placeholder="اكتب ملاحظتك هنا..."
              placeholderTextColor={Colors[theme].textMuted}
              value={noteText}
              onChangeText={setNoteText}
              textAlign="right"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: Colors[theme].primary }]}
              onPress={handleSave}
            >
              <Text style={styles.modalButtonText}>حفظ</Text>
            </TouchableOpacity>
            <View style={styles.modalIcons}>
              <TouchableOpacity style={styles.modalIconBtn}>
                <Ionicons name="list-outline" size={20} color={Colors[theme].textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalIconBtn}>
                <Ionicons name="image-outline" size={20} color={Colors[theme].textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalIconBtn}>
                <Ionicons name="trash-outline" size={20} color={Colors[theme].textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors[theme].textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── View Notes Modal ───

function ViewNotesModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useColorScheme();

  const notesData = [
    { id: '1', text: 'تأملات في سورة الفاتحة', category: 'حفظ ساخوطي' },
    { id: '2', text: 'فوائد من درس الأخلاق', category: 'أمس' },
    { id: '3', text: 'فوائد من درس الأخلاق', category: 'أمس' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.notesModalContent, { backgroundColor: Colors[theme].surface }]}>
          <Text style={[styles.modalTitle, { color: Colors[theme].text }]}>عرض الملاحظات</Text>

          {/* Table Header */}
          <View style={[styles.tableHeader, { backgroundColor: Colors[theme].surfaceAlt }]}>
            <Text style={[styles.tableHeaderText, { color: Colors[theme].textSecondary, flex: 1 }]}>آخر الملاحظات</Text>
            <Text style={[styles.tableHeaderText, { color: Colors[theme].textSecondary, flex: 2, textAlign: 'right' }]}>تأملات في سورة الفاتحة</Text>
          </View>

          {/* Table Rows */}
          {notesData.map((note, index) => (
            <View
              key={note.id}
              style={[
                styles.tableRow,
                { borderBottomColor: Colors[theme].borderLight },
                index % 2 === 0 && { backgroundColor: Colors[theme].surfaceAlt + '50' },
              ]}
            >
              <Text style={[styles.tableCell, { color: Colors[theme].textMuted, flex: 1 }]}>{note.category}</Text>
              <Text style={[styles.tableCell, { color: Colors[theme].text, flex: 2, textAlign: 'right' }]}>{note.text}</Text>
            </View>
          ))}

          {/* Underline accent */}
          <View style={[styles.tableAccent, { backgroundColor: Colors[theme].primary }]} />

          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors[theme].textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Audio Player Modal ───

function AudioPlayerModal({
  visible,
  onClose,
  book,
}: {
  visible: boolean;
  onClose: () => void;
  book: { title: string; author: string } | null;
}) {
  const theme = useColorScheme();
  const [isPlaying, setIsPlaying] = useState(false);

  if (!book) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.playerModalOverlay}>
        <View style={[styles.playerModalContent, { backgroundColor: Colors[theme].surface }]}>
          {/* Handle bar */}
          <View style={[styles.playerHandle, { backgroundColor: Colors[theme].border }]} />

          {/* Book Cover Placeholder */}
          <View style={[styles.playerCover, { backgroundColor: Colors[theme].surfaceAlt }]}>
            <Ionicons name="book" size={40} color={Colors[theme].primary} />
          </View>

          {/* Book Info */}
          <Text style={[styles.playerTitle, { color: Colors[theme].text }]}>{book.title}</Text>
          <Text style={[styles.playerAuthor, { color: Colors[theme].textMuted }]}>{book.author}</Text>

          {/* Progress Bar */}
          <View style={styles.playerProgressContainer}>
            <View style={[styles.playerProgressBar, { backgroundColor: Colors[theme].progressBg }]}>
              <View style={[styles.playerProgressFill, { backgroundColor: Colors[theme].progressFill, width: '35%' }]} />
            </View>
          </View>

          {/* Playback Controls */}
          <View style={styles.playerControls}>
            <TouchableOpacity style={styles.playerControlBtn}>
              <Ionicons name="play-skip-forward" size={28} color={Colors[theme].text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playerPlayBtn, { backgroundColor: Colors[theme].primary }]}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playerControlBtn}>
              <Ionicons name="play-skip-back" size={28} color={Colors[theme].text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Library Screen ───

export default function SavedScreen() {
  const theme = useColorScheme();
  const [searchText, setSearchText] = useState('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showViewNotesModal, setShowViewNotesModal] = useState(false);
  const [showAudioPlayerModal, setShowAudioPlayerModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<{ title: string; author: string } | null>(null);

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
                borderColor: Colors[theme].borderLight,
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: Colors[theme].text }]}
              placeholder="ابحث..."
              placeholderTextColor={Colors[theme].textMuted}
              value={searchText}
              onChangeText={setSearchText}
              textAlign="right"
            />
            <Ionicons name="search-outline" size={18} color={Colors[theme].textMuted} />
          </View>
        </View>

        {/* Quick Action Cards */}
        <View style={styles.actionCardsRow}>
          <QuickActionCard
            icon="mic-outline"
            label="بودكاستاتي"
            subtitle="+٣ تذكيرات نشطة"
          />
          <QuickActionCard
            icon="book-outline"
            label="ورد القرآن"
            subtitle="٧ أيام متتالية"
          />
          <QuickActionCard
            icon="pencil-outline"
            label="ملاحظاتي"
            subtitle="٢٣ ملاحظة"
            onPress={() => setShowViewNotesModal(true)}
          />
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

      {/* Modals */}
      <AddNoteModal
        visible={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        onSave={(note: string) => { /* Note saved */ }}
      />
      <ViewNotesModal
        visible={showViewNotesModal}
        onClose={() => setShowViewNotesModal(false)}
      />
      <AudioPlayerModal
        visible={showAudioPlayerModal}
        onClose={() => setShowAudioPlayerModal(false)}
        book={selectedBook}
      />
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
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'center',
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
    borderRadius: Border.radius.xxl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    writingDirection: 'rtl',
  },

  // Quick Action Cards
  actionCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Border.radius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  actionCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actionCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  actionCardSubtitle: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
  },
  wirdInfoValue: {
    fontSize: 12,
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
  },
  noteText: {
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
    writingDirection: 'rtl',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.xl,
    borderWidth: 1,
    gap: 4,
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
    writingDirection: 'rtl',
  },
  audioCardAuthor: {
    fontSize: 11,
    marginTop: 2,
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
  },
  audioDuration: {
    fontSize: 10,
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
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
    writingDirection: 'rtl',
  },
  reminderSubtitle: {
    fontSize: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Border.radius.lg,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  notesModalContent: {
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    writingDirection: 'rtl',
  },
  modalInput: {
    borderRadius: Border.radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  modalTextInput: {
    fontSize: 14,
    writingDirection: 'rtl',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.xl,
    borderRadius: Border.radius.sm,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalIcons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalIconBtn: {
    padding: 4,
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    padding: 4,
  },

  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.sm,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    fontSize: 12,
    writingDirection: 'rtl',
  },
  tableAccent: {
    height: 3,
    width: 60,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
  },

  // Audio Player Modal
  playerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  playerModalContent: {
    borderTopLeftRadius: Border.radius.xl,
    borderTopRightRadius: Border.radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  playerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  playerCover: {
    width: 100,
    height: 100,
    borderRadius: Border.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    writingDirection: 'rtl',
  },
  playerAuthor: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    writingDirection: 'rtl',
  },
  playerProgressContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  playerProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  playerProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  playerControlBtn: {
    padding: Spacing.sm,
  },
  playerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
