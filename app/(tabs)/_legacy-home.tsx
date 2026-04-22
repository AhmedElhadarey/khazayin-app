import { Text } from '@/components/ui/Text';
import { Border, Colors, Shadows, Spacing } from '@/constants/theme';
import {
  MOCK_BOOKS,
  MOCK_DESIGNS,
  MOCK_SCHOLARS
} from '@/data/mockData';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiService } from '@/services/api';
import { Category, Resource } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to get Hijri date
function getHijriDate(): string {
  // This would ideally use a proper Hijri calendar library
  // For now, returning a placeholder
  return '٤ جمادى الآخرة ١٤٤٧ هـ';
}

// ─── Header Component ───

function Header({ onProfilePress }: { onProfilePress?: () => void }) {
  const theme = useColorScheme();

  return (
    <View style={styles.header}>
      {/* Left: Profile Icon */}
      <TouchableOpacity
        onPress={onProfilePress}
        style={[styles.profileButton, { backgroundColor: Colors[theme].surfaceAlt }]}
        accessibilityRole="button"
        accessibilityLabel="الملف الشخصي"
      >
        <Ionicons name="person-outline" size={20} color={Colors[theme].textMuted} />
      </TouchableOpacity>

      {/* Right: Title, Date, Logo */}
      <View style={styles.headerRight}>
        <View style={styles.headerTitleBlock}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: Colors[theme].text,
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          >
            سبحان الله
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: Colors[theme].textMuted,
              textAlign: 'right',
              writingDirection: 'rtl',
              marginTop: 2,
            }}
          >
            {getHijriDate()}
          </Text>
        </View>
        {/* Logo */}
        <View style={[styles.logoContainer, { backgroundColor: Colors[theme].surface }]}>
          <View style={styles.logoInner}>
            <Ionicons name="book" size={24} color={Colors[theme].primary} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Search Bar Component ───

function SearchBar({ onPress }: { onPress: () => void }) {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.searchBar, { backgroundColor: Colors[theme].surface, borderColor: Colors[theme].border }]}
      accessibilityRole="button"
      accessibilityLabel="البحث"
    >
      <Ionicons name="search-outline" size={18} color={Colors[theme].textMuted} style={styles.searchIcon} />
      <Text style={{ color: Colors[theme].textMuted, fontSize: 14, flex: 1, textAlign: 'right' }}>
        بحث..
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
      {/* Left side: "عرض الكل" */}
      {onSeeAll ? (
        <TouchableOpacity
          onPress={onSeeAll}
          style={styles.seeAllButton}
          accessibilityRole="button"
          accessibilityLabel={`عرض الكل - ${title}`}
        >
          <Text style={{ fontSize: 12, color: Colors[theme].textMuted }}>
            عرض الكل
          </Text>
          <Ionicons name="chevron-back" size={18} color={Colors[theme].textMuted} />

        </TouchableOpacity>
      ) : (
        <View />
      )}
      {/* Right side: title + gold bar */}
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />

        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: Colors[theme].text,
            writingDirection: 'rtl',
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

// ─── Quran Banner (القرآن حياة) ───

function QuranBanner() {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={[styles.quranBanner, { backgroundColor: Colors[theme].bannerBlue }]}
      accessibilityRole="button"
      accessibilityLabel="القرآن حياة"
    >
      {/* Left: Decorative Image Area */}
      <View style={styles.quranBannerLeft}>
        <View style={styles.quranImagePlaceholder}>
          <Ionicons name="book-outline" size={40} color="rgba(255,255,255,0.3)" />
        </View>
      </View>

      {/* Right: Content */}
      <View style={styles.quranBannerRight}>
        {/* Title Row with Bar */}
        <View style={styles.bannerTitleRow}>
          <Text style={styles.quranBannerTitle}>القرآن حياة</Text>
          <View style={[styles.bannerTitleBar, { backgroundColor: Colors[theme].goldBar }]} />
        </View>

        {/* Logo Text */}
        <Text style={styles.quranLogoText}>القرآن حياة</Text>

        {/* Description */}
        <Text style={styles.quranBannerDesc}>
          اقْتَرَبَ فَثَمَّ حَيَاة مع القرآن لَمْ تَحْيَهَا بُعْد!
        </Text>

        {/* More Button */}
        <TouchableOpacity
          style={[styles.bannerButton, { backgroundColor: Colors[theme].goldBar }]}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={12} color={Colors[theme].primary} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: Colors[theme].primary }}>
            المزيد
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Prophet Banner (محمد رسول الله) ───

function ProphetBanner() {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={[styles.prophetBanner, { backgroundColor: Colors[theme].surfaceAlt }]}
      accessibilityRole="button"
      accessibilityLabel="محمد رسول الله"
    >
      {/* Left: Decorative Image */}
      <View style={styles.prophetBannerLeft}>
        <View style={[styles.prophetImagePlaceholder, { backgroundColor: Colors[theme].primary + '15' }]}>
          <Ionicons name="star" size={32} color={Colors[theme].primary} />
        </View>
      </View>

      {/* Right: Content */}
      <View style={styles.prophetBannerRight}>
        {/* Title with calligraphy style */}
        <Text style={[styles.prophetCalligraphy, { color: Colors[theme].primary }]}>
          محمد رسول الله
        </Text>

        {/* Description */}
        <Text style={[styles.prophetDesc, { color: Colors[theme].textSecondary }]}>
          وِجهتُك المُثلى لِتَعرفَ وتَغرفَ مِن سِيرة{'\n'}
          النبيِّ ﷺ وأصحابِه العِظام. وأزواجِه الكِرام{'\n'}
          عَبْرَ محتوًى موثوقٍ شاملٍ يعزّز الفهم العميش{'\n'}
          لشخصيّاتهم ويبيّن الأثر العظيم لتضحياتهم
        </Text>

        {/* More Button */}
        <TouchableOpacity
          style={[styles.bannerButton, { backgroundColor: Colors[theme].primary }]}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={12} color="#FFFFFF" />
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
            المزيد
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Books Banner (إضاءات في العقيدة) ───

function BooksBanner() {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={[styles.booksBanner, { backgroundColor: Colors[theme].surfaceAlt }]}
      accessibilityRole="button"
      accessibilityLabel="إضاءات في العقيدة"
    >
      {/* Decorative scroll/paper image */}
      <View style={styles.booksBannerContent}>
        <View style={[styles.scrollDecoration, { borderColor: Colors[theme].secondary }]}>
          <Text style={[styles.scrollText, { color: Colors[theme].secondary }]}>
            إضاءات أنت على{'\n'}طريق المغاني
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Queen Section (أنتِ ملكة) ───

function QueenSection() {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={[styles.queenSection, { backgroundColor: Colors[theme].surfaceAlt }]}
      accessibilityRole="button"
      accessibilityLabel="أنتِ ملكة"
    >
      {/* Left: Crown/Image */}
      <View style={styles.queenLeft}>
        <View style={[styles.queenImagePlaceholder, { backgroundColor: Colors[theme].secondary + '20' }]}>
          <Ionicons name="diamond" size={36} color={Colors[theme].secondary} />
        </View>
      </View>

      {/* Right: Content */}
      <View style={styles.queenRight}>
        {/* Title with bar */}
        <View style={styles.bannerTitleRow}>
          <Text style={[styles.queenTitle, { color: Colors[theme].primary }]}>
            أنتِ ملكة
          </Text>
          <View style={[styles.bannerTitleBar, { backgroundColor: Colors[theme].secondary }]} />
        </View>

        {/* Subtitle */}
        <Text style={[styles.queenSubtitle, { color: Colors[theme].secondary }]}>
          مَلِكةٌ أنتِ لا سِواكِ
        </Text>

        {/* Description */}
        <Text style={[styles.queenDesc, { color: Colors[theme].textSecondary }]}>
          وفي قُربك من ربك: هُداكِ فأعدَدنا{'\n'}
          لكِ هذا المحتوى النَّدِي{'\n'}
          لتَصنعي جِيلًا على هَدي النبي ﷺ
        </Text>

        {/* More Button */}
        <TouchableOpacity
          style={[styles.queenButton, { backgroundColor: Colors[theme].primary }]}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={12} color="#FFFFFF" />
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
            المزيد
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Quick Access Card (Circular) ───

function QuickAccessCard({ label, icon }: { label: string; icon: string }) {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.quickAccessItem}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickAccessCircle, { backgroundColor: Colors[theme].surfaceAlt }]}>
        <Ionicons name={icon as any} size={24} color={Colors[theme].primary} />
      </View>
      <Text
        style={{
          fontSize: 11,
          color: Colors[theme].text,
          textAlign: 'center',
          marginTop: 8,
          writingDirection: 'rtl',
        }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Scholar Card ───

function ScholarCard({ name, title }: { name: string; title: string }) {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.scholarCard, { backgroundColor: Colors[theme].bannerBlue }]}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${name}`}
    >
      {/* Gold accent bar */}
      <View style={[styles.scholarBar, { backgroundColor: Colors[theme].goldBar }]} />

      {/* Title text (faded) */}
      <Text style={styles.scholarTitle}>{title}</Text>

      {/* Name in calligraphy style */}
      <Text style={styles.scholarName}>{name}</Text>
    </TouchableOpacity>
  );
}

// ─── Book Card ───

function BookCard({ title }: { title: string }) {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.bookCard, { backgroundColor: Colors[theme].surfaceAlt }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Blue accent bar */}
      <View style={[styles.bookBar, { backgroundColor: Colors[theme].primary }]} />

      {/* Book title */}
      <Text
        style={[styles.bookTitle, { color: Colors[theme].primary }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Design Card ───

function DesignCard({ title, index }: { title: string; index: number }) {
  const theme = useColorScheme();
  const isFirst = index === 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.designCard,
        { backgroundColor: isFirst ? Colors[theme].bannerBlue : Colors[theme].surfaceAlt },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.designCardContent}>
        <Ionicons
          name="image-outline"
          size={28}
          color={isFirst ? 'rgba(255,255,255,0.5)' : Colors[theme].textMuted}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: isFirst ? '#FFFFFF' : Colors[theme].text,
            textAlign: 'center',
            marginTop: 8,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Home Screen ───

export default function HomeScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const [featured, setFeatured] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setError(null);
      setLoading(true);
      const [featuredRes, categoriesRes, resources] = await Promise.all([
        apiService.getFeaturedResources(),
        apiService.getCategories(),
        apiService.getResources(),
      ]);
      setFeatured(featuredRes);
      setCategories(categoriesRes);
      setAllResources(resources);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Colors[theme].background }]}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: Colors[theme].background }]}>
        <Ionicons name="cloud-offline-outline" size={56} color={Colors[theme].border} />
        <Text
          variant="md"
          color={Colors[theme].textSecondary}
          style={{ marginTop: Spacing.lg }}
        >
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadData}
          style={{ marginTop: Spacing.lg }}
          accessibilityRole="button"
          accessibilityLabel="إعادة المحاولة"
        >
          <Text variant="md" weight="bold" color={Colors[theme].primary}>
            إعادة المحاولة
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Header onProfilePress={() => router.push('/(tabs)/settings')} />

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar onPress={() => router.push('/(tabs)/search')} />
        </View>

        {/* 1. Quran Banner */}
        <View style={styles.bannerSection}>
          <QuranBanner />
        </View>

        {/* 2. Prophet Banner */}
        <View style={styles.bannerSection}>
          <ProphetBanner />
        </View>

        {/* 3. Books Banner */}
        <View style={styles.bannerSection}>
          <BooksBanner />
        </View>

        {/* 4. Queen Section */}
        <View style={styles.bannerSection}>
          <QueenSection />
        </View>

        {/* 5. Quick Access */}
        <View style={styles.quickAccessSection}>
          <View style={styles.quickAccessRow}>
            <QuickAccessCard label="كتب صوتية" icon="headset" />
            <QuickAccessCard label="برامج إذاعية" icon="radio" />
            <QuickAccessCard label="حصريات خزائن الرحمن" icon="diamond" />
          </View>
        </View>

        {/* 6. Scholars Section */}
        <View style={styles.section}>
          <SectionHeader
            title="العلماء والمشايخ"
            onSeeAll={() => { }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {MOCK_SCHOLARS.map((scholar) => (
              <ScholarCard
                key={scholar.id}
                name={scholar.name}
                title={scholar.title}
              />
            ))}
          </ScrollView>
        </View>

        {/* 7. Books Section */}
        <View style={styles.section}>
          <SectionHeader
            title="الكتب العلمية"
            onSeeAll={() => { }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {MOCK_BOOKS.map((book) => (
              <BookCard key={book.id} title={book.title} />
            ))}
          </ScrollView>
        </View>

        {/* 8. Dawah Designs Section */}
        <View style={[styles.section, { marginBottom: Spacing.xxxl }]}>
          <SectionHeader
            title="تصميمات دعوية"
            onSeeAll={() => { }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {MOCK_DESIGNS.map((design, index) => (
              <DesignCard key={design.id} title={design.title} index={index} />
            ))}
          </ScrollView>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleBlock: {
    alignItems: 'flex-end',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: Border.radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
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
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  bannerSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  // Quran Banner
  quranBanner: {
    borderRadius: Border.radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 160,
  },
  quranBannerLeft: {
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quranImagePlaceholder: {
    width: 80,
    height: 90,
    borderRadius: Border.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  quranBannerRight: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.lg,
    alignItems: 'flex-end',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitleBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  quranBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quranLogoText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.15)',
    marginTop: 4,
  },
  quranBannerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 20,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Border.radius.sm,
    marginTop: Spacing.md,
  },

  // Prophet Banner
  prophetBanner: {
    borderRadius: Border.radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 180,
  },
  prophetBannerLeft: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prophetImagePlaceholder: {
    width: 70,
    height: 85,
    borderRadius: Border.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prophetBannerRight: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.lg,
    alignItems: 'flex-end',
  },
  prophetCalligraphy: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  prophetDesc: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 18,
  },

  // Books Banner
  booksBanner: {
    borderRadius: Border.radius.xl,
    overflow: 'hidden',
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  booksBannerContent: {
    alignItems: 'center',
  },
  scrollDecoration: {
    borderWidth: 2,
    borderRadius: Border.radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  scrollText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Queen Section
  queenSection: {
    borderRadius: Border.radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 180,
  },
  queenLeft: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queenImagePlaceholder: {
    width: 70,
    height: 85,
    borderRadius: Border.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queenRight: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.lg,
    alignItems: 'flex-end',
  },
  queenTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  queenSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  queenDesc: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 18,
  },
  queenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Border.radius.sm,
    marginTop: Spacing.md,
  },

  // Quick Access
  quickAccessSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAccessItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 64) / 3,
  },
  quickAccessCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scholar Card
  scholarCard: {
    width: 180,
    height: 80,
    borderRadius: Border.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  scholarBar: {
    position: 'absolute',
    top: 0,
    width: 100,
    height: 4,
    borderRadius: 2,
  },
  scholarTitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  scholarName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },

  // Book Card
  bookCard: {
    width: 160,
    height: 75,
    borderRadius: Border.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  bookBar: {
    position: 'absolute',
    top: 0,
    width: 80,
    height: 4,
    borderRadius: 2,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Design Card
  designCard: {
    width: 140,
    height: 160,
    borderRadius: Border.radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  designCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
});
