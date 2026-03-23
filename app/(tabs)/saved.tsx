import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import { MOCK_RESOURCES, MOCK_CHANNELS } from '@/data/mockData';

type QuickFilter = 'favorites' | 'quran' | 'downloads';
type BookTab = 'all' | 'favorites' | 'downloads';

const QUICK_FILTERS: { key: QuickFilter; label: string; icon: string }[] = [
  { key: 'downloads', label: 'التحميلات', icon: 'download' },
  { key: 'quran', label: 'ورد القرآن', icon: 'book' },
  { key: 'favorites', label: 'مفضلاتي', icon: 'heart' },
];

const BOOK_TABS: { key: BookTab; label: string; icon: string }[] = [
  { key: 'downloads', label: 'التحميلات', icon: 'download-outline' },
  { key: 'favorites', label: 'المفضلات', icon: 'heart-outline' },
  { key: 'all', label: 'الكل', icon: 'layers-outline' },
];

// ─── Section Header (matches home page pattern: title+bar right, "عرض الكل"+arrow left) ───

function SectionHeader({
  title,
  titleColor,
  barColor,
  onSeeAll,
}: {
  title: string;
  titleColor?: string;
  barColor?: string;
  onSeeAll?: () => void;
}) {
  const theme = useColorScheme();
  const tColor = titleColor || Colors[theme].primary;
  const bColor = barColor || Colors[theme].goldBar;

  return (
    <View style={styles.sectionHeader}>
      {/* Left side: "عرض الكل" + arrow */}
      {onSeeAll ? (
        <TouchableOpacity
          onPress={onSeeAll}
          style={styles.seeAllButton}
          accessibilityRole="button"
          accessibilityLabel={`عرض الكل - ${title}`}
        >
          <Ionicons name="chevron-back" size={20} color={Colors[theme].secondary} />
          <Text variant="xs" weight="semiBold" color={Colors[theme].secondary}>
            عرض الكل
          </Text>
        </TouchableOpacity>
      ) : (
        <View />
      )}
      {/* Right side: title + gold/blue bar */}
      <View style={styles.sectionTitleRow}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: tColor,
            writingDirection: 'rtl',
          }}
        >
          {title}
        </Text>
        <View style={[styles.sectionBar, { backgroundColor: bColor }]} />
      </View>
    </View>
  );
}

export default function SavedScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const {
    favorites,
    downloads,
    dailyQuranPage,
    readingProgress,
    listeningProgress,
  } = useAppStore();
  const [bookTab, setBookTab] = useState<BookTab>('all');
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilter | null>(null);

  const booksWithProgress = MOCK_RESOURCES.filter((r) => r.fileType === 'pdf').slice(0, 5);
  const audioWithProgress = MOCK_RESOURCES.filter((r) => r.fileType === 'audio').slice(0, 3);

  const getBookTabData = () => {
    let data = booksWithProgress;
    switch (bookTab) {
      case 'favorites':
        data = booksWithProgress.filter((b) => favorites.some((f) => f.id === b.id));
        break;
      case 'downloads':
        data = booksWithProgress.filter((b) => downloads.some((d) => d.id === b.id));
        break;
      default:
        data = booksWithProgress;
    }
    // Filter by search text if present
    if (searchText.trim()) {
      data = data.filter(
        (b) =>
          b.title.includes(searchText) ||
          b.author.includes(searchText)
      );
    }
    return data;
  };

  const quranProgress = Math.round((dailyQuranPage / 604) * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: Colors[theme].primary,
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          >
            مكتبتي
          </Text>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchBarContainer}>
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
              style={[
                styles.searchInput,
                {
                  color: Colors[theme].text,
                },
              ]}
              placeholder="ابحث في مكتبتك..."
              placeholderTextColor={Colors[theme].textMuted}
              value={searchText}
              onChangeText={setSearchText}
              textAlign="right"
            />
            <Ionicons name="search" size={18} color={Colors[theme].textMuted} />
          </View>
        </View>

        {/* ── Quick Filter Pills ── */}
        <View style={styles.filterRow}>
          {QUICK_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? Colors[theme].primary
                      : Colors[theme].surface,
                    borderColor: isActive
                      ? Colors[theme].primary
                      : Colors[theme].borderLight,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() =>
                  setActiveFilter(isActive ? null : filter.key)
                }
                accessibilityRole="button"
                accessibilityLabel={filter.label}
              >
                <Text
                  variant="xs"
                  weight="semiBold"
                  color={
                    isActive
                      ? Colors[theme].textOnPrimary
                      : Colors[theme].primary
                  }
                >
                  {filter.label}
                </Text>
                <Ionicons
                  name={filter.icon as any}
                  size={14}
                  color={
                    isActive
                      ? Colors[theme].textOnPrimary
                      : Colors[theme].secondary
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Daily Quran Reading Card ── */}
        <View style={styles.cardSection}>
          <View
            style={[
              styles.quranCard,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].borderLight,
              },
              Shadows.sm,
            ]}
          >
            {/* Header row: icon + title */}
            <View style={styles.quranHeader}>
              <View style={styles.quranTitleRow}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: Colors[theme].primary,
                    writingDirection: 'rtl',
                  }}
                >
                  ورد القرآن اليومي
                </Text>
                <View
                  style={[
                    styles.quranIcon,
                    { backgroundColor: Colors[theme].primary + '10' },
                  ]}
                >
                  <Ionicons name="book" size={20} color={Colors[theme].primary} />
                </View>
              </View>
            </View>

            {/* Body: two columns (labels+values) */}
            <View style={styles.quranBody}>
              {/* Labels row */}
              <View style={styles.quranInfoRow}>
                <Text variant="sm" color={Colors[theme].textSecondary}>
                  آخر قراءة اليوم
                </Text>
                <Text variant="sm" color={Colors[theme].textSecondary}>
                  الصفحة الحالية
                </Text>
              </View>
              {/* Values row */}
              <View style={styles.quranInfoRow}>
                <TouchableOpacity
                  style={[
                    styles.quranButton,
                    { backgroundColor: Colors[theme].primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="ورد اليوم"
                >
                  <Text variant="sm" weight="bold" color={Colors[theme].textOnPrimary}>
                    ورد اليوم
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: Colors[theme].primary,
                    writingDirection: 'rtl',
                  }}
                >
                  {dailyQuranPage}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressRow}>
                <Text variant="xxs" color={Colors[theme].textMuted}>
                  {quranProgress}%
                </Text>
                <View
                  style={[
                    styles.progressBg,
                    { backgroundColor: Colors[theme].borderLight },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: Colors[theme].primary,
                        width: `${quranProgress}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Book Progress Section ── */}
        <View style={styles.section}>
          <SectionHeader
            title="تقدم كتبك"
            titleColor={Colors[theme].primary}
            barColor={Colors[theme].goldBar}
          />

          {/* Tab pills row */}
          <View style={styles.tabPillsRow}>
            {BOOK_TABS.map((tab) => {
              const isActive = bookTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: isActive
                        ? Colors[theme].primary
                        : 'transparent',
                      borderColor: isActive
                        ? Colors[theme].primary
                        : Colors[theme].border,
                    },
                  ]}
                  onPress={() => setBookTab(tab.key)}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={12}
                    color={
                      isActive
                        ? Colors[theme].textOnPrimary
                        : Colors[theme].textSecondary
                    }
                    style={{ marginStart: 4 }}
                  />
                  <Text
                    variant="xs"
                    weight={isActive ? 'bold' : 'regular'}
                    color={
                      isActive
                        ? Colors[theme].textOnPrimary
                        : Colors[theme].textSecondary
                    }
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Book list */}
          {getBookTabData().length === 0 ? (
            <View style={styles.emptyMini}>
              <Ionicons
                name="book-outline"
                size={36}
                color={Colors[theme].border}
              />
              <Text
                variant="sm"
                color={Colors[theme].textMuted}
                style={{ marginTop: Spacing.sm }}
              >
                لا توجد كتب في هذا القسم
              </Text>
            </View>
          ) : (
            getBookTabData().map((book, index) => {
              const fallbackProgress =
                ((booksWithProgress.indexOf(book) + 1) * 25) % 80 + 15;
              const progress = readingProgress[book.id] || fallbackProgress;
              return (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    styles.progressItem,
                    {
                      borderBottomColor: Colors[theme].borderLight,
                      borderBottomWidth:
                        index < getBookTabData().length - 1
                          ? StyleSheet.hairlineWidth
                          : 0,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/resource/${book.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${book.title} - ${progress}%`}
                >
                  {/* Left side: progress percentage + bar */}
                  <View style={styles.progressItemLeft}>
                    <Text variant="sm" weight="bold" color={Colors[theme].primary}>
                      {progress}%
                    </Text>
                    <View
                      style={[
                        styles.miniProgressBg,
                        { backgroundColor: Colors[theme].borderLight },
                      ]}
                    >
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            backgroundColor: Colors[theme].primary,
                            width: `${progress}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  {/* Right side: title + author */}
                  <View style={styles.progressItemText}>
                    <Text
                      variant="sm"
                      weight="semiBold"
                      color={Colors[theme].text}
                      numberOfLines={1}
                    >
                      {book.title}
                    </Text>
                    <Text variant="xs" color={Colors[theme].textSecondary}>
                      {book.author}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* "عرض المزيد" link at bottom of book section */}
          {getBookTabData().length > 0 && (
            <TouchableOpacity
              style={styles.showMoreRow}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="عرض المزيد"
            >
              <Ionicons
                name="chevron-back"
                size={14}
                color={Colors[theme].secondary}
              />
              <Text variant="xs" weight="semiBold" color={Colors[theme].secondary}>
                عرض المزيد
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Audio Progress Section ── */}
        <View style={styles.section}>
          <SectionHeader
            title="تقدم الكتب المسموعة"
            titleColor={Colors[theme].primary}
            barColor={Colors[theme].goldBar}
          />

          {audioWithProgress.map((audio, index) => {
            const fallbackProgress =
              ((audioWithProgress.indexOf(audio) + 1) * 20) % 70 + 10;
            const progress = listeningProgress[audio.id] || fallbackProgress;
            return (
              <TouchableOpacity
                key={audio.id}
                style={[
                  styles.progressItem,
                  {
                    borderBottomColor: Colors[theme].borderLight,
                    borderBottomWidth:
                      index < audioWithProgress.length - 1
                        ? StyleSheet.hairlineWidth
                        : 0,
                  },
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${audio.title} - ${progress}%`}
              >
                {/* Left side: headset icon + progress */}
                <View style={styles.audioItemLeft}>
                  <Ionicons
                    name="headset"
                    size={18}
                    color={Colors[theme].secondary}
                  />
                  <View style={styles.progressItemLeft}>
                    <Text
                      variant="sm"
                      weight="bold"
                      color={Colors[theme].secondary}
                    >
                      {progress}%
                    </Text>
                    <View
                      style={[
                        styles.miniProgressBg,
                        { backgroundColor: Colors[theme].borderLight },
                      ]}
                    >
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            backgroundColor: Colors[theme].secondary,
                            width: `${progress}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
                {/* Right side: title + author + duration */}
                <View style={styles.progressItemText}>
                  <Text
                    variant="sm"
                    weight="semiBold"
                    color={Colors[theme].text}
                    numberOfLines={1}
                  >
                    {audio.title}
                  </Text>
                  <Text variant="xs" color={Colors[theme].textSecondary}>
                    {audio.author} · {audio.durationMinutes} دقيقة
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Badge indicator for audio section */}
          <View style={styles.audioBadgeRow}>
            <View
              style={[
                styles.audioBadge,
                { backgroundColor: Colors[theme].secondary + '18' },
              ]}
            >
              <Ionicons
                name="musical-notes"
                size={12}
                color={Colors[theme].secondary}
              />
              <Text variant="xxs" color={Colors[theme].secondary}>
                {audioWithProgress.length} كتب مسموعة
              </Text>
            </View>
          </View>
        </View>

        {/* ── Religious Channels Section ── */}
        <View style={[styles.section, { marginBottom: Spacing.xxxl }]}>
          <SectionHeader
            title="القنوات الدينية"
            titleColor={Colors[theme].primary}
            barColor={Colors[theme].blueBar}
          />

          {MOCK_CHANNELS.map((channel, index) => (
            <TouchableOpacity
              key={channel.id}
              style={[
                styles.channelRow,
                {
                  borderBottomColor: Colors[theme].borderLight,
                  borderBottomWidth:
                    index < MOCK_CHANNELS.length - 1
                      ? StyleSheet.hairlineWidth
                      : 0,
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={channel.name}
            >
              {/* Left: chevron */}
              <Ionicons
                name="chevron-back"
                size={14}
                color={Colors[theme].textMuted}
              />
              {/* Center: channel info */}
              <View style={styles.channelInfo}>
                <Text
                  variant="sm"
                  weight="semiBold"
                  color={Colors[theme].text}
                >
                  {channel.name}
                </Text>
                <Text
                  variant="xs"
                  color={Colors[theme].textSecondary}
                  numberOfLines={1}
                >
                  {channel.description}
                </Text>
              </View>
              {/* Right: avatar */}
              <View
                style={[
                  styles.channelAvatar,
                  { backgroundColor: Colors[theme].primary },
                ]}
              >
                <Ionicons
                  name="radio"
                  size={18}
                  color={Colors[theme].textOnPrimary}
                />
              </View>
            </TouchableOpacity>
          ))}
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

  // ── Page Header ──
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    alignItems: 'flex-end',
  },

  // ── Search Bar ──
  searchBarContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderRadius: Border.radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    writingDirection: 'rtl',
    textAlign: 'right',
    paddingVertical: 0,
  },

  // ── Filter Pills ──
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.xl,
    borderWidth: 1,
  },

  // ── Quran Card ──
  cardSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  quranCard: {
    borderRadius: Border.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  quranHeader: {
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  quranTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  quranIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quranBody: {
    padding: Spacing.lg,
  },
  quranInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quranButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.lg,
    borderRadius: Border.radius.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Section Header (matches home page pattern) ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBar: {
    width: 5,
    height: 21,
    borderRadius: 4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // ── Section ──
  section: {
    marginBottom: Spacing.xl,
  },

  // ── Tab Pills ──
  tabPillsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.xl,
    borderWidth: 1,
    gap: 4,
  },

  // ── Empty State ──
  emptyMini: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },

  // ── Progress Item Row ──
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  progressItemText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  progressItemLeft: {
    alignItems: 'center',
    minWidth: 50,
  },
  miniProgressBg: {
    width: 50,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // ── Audio item left area ──
  audioItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // ── Show More ──
  showMoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
  },

  // ── Audio badge ──
  audioBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Border.radius.sm,
  },

  // ── Channel Row ──
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  channelInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
