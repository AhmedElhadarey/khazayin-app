import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { apiService } from '@/services/api';
import { Resource, Category } from '@/types';
import {
  MOCK_SCHOLARS,
  MOCK_BOOKS,
  MOCK_QUICK_ACCESS,
} from '@/data/mockData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Section Header (Figma: title+gold bar right, "عرض الكل"+arrow left) ───

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
      {/* Right side: title + gold bar */}
      <View style={styles.sectionTitleRow}>
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: tColor, writingDirection: 'rtl' }}
        >
          {title}
        </Text>
        <View style={[styles.sectionBar, { backgroundColor: bColor }]} />
      </View>
    </View>
  );
}

// ─── القرآن حياة Banner (Figma: navy bg, image left, text right) ───

function QuranBanner() {
  const theme = useColorScheme();
  return (
    <View style={[styles.featuredBanner, { backgroundColor: Colors[theme].primary }]}>
      {/* Decorative placeholder (left side) */}
      <View style={styles.bannerImageArea}>
        <View style={[styles.bannerImagePlaceholder, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <Ionicons name="book" size={36} color="rgba(255,255,255,0.25)" />
        </View>
      </View>
      {/* Arabic content (right side) */}
      <View style={styles.bannerTextArea}>
        <View style={styles.bannerTitleRow}>
          <Text variant="xl" weight="bold" color={Colors[theme].textOnPrimary}>
            القرآن حــياة
          </Text>
          <View style={[styles.bannerTitleBar, { backgroundColor: Colors[theme].goldBar }]} />
        </View>
        <Text
          variant="xs"
          color={Colors[theme].textOnPrimaryFaint}
          align="right"
          style={{ marginTop: 6, lineHeight: 18 }}
        >
          اقْتَرَبَ فَثَمَّ حَيَاة مع القرآن لَمْ تَحْيَهَا بُعْد !
        </Text>
        <TouchableOpacity
          style={[styles.moreButton, { backgroundColor: Colors[theme].goldBar }]}
          accessibilityRole="button"
          accessibilityLabel="المزيد عن القرآن حياة"
        >
          <Ionicons name="arrow-back" size={10} color={Colors[theme].primary} />
          <Text variant="xs" weight="semiBold" color={Colors[theme].primary}>
            المزيد
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── محمد رسول الله Banner (Figma: beige bg, calligraphy left, text right) ───

function ProphetBanner() {
  const theme = useColorScheme();
  return (
    <View style={[styles.prophetBanner, { backgroundColor: Colors[theme].surfaceAlt }]}>
      {/* Decorative placeholder (left side) */}
      <View style={styles.prophetImageArea}>
        <View style={[styles.prophetImagePlaceholder, { backgroundColor: Colors[theme].primary + '15' }]}>
          <Ionicons name="star" size={32} color={Colors[theme].primary} />
        </View>
      </View>
      {/* Text content (right side) */}
      <View style={styles.prophetTextArea}>
        <View style={styles.bannerTitleRow}>
          <Text variant="xl" weight="bold" color={Colors[theme].primary}>
            محمد رسول الله
          </Text>
          <View style={[styles.bannerTitleBar, { backgroundColor: Colors[theme].primary }]} />
        </View>
        <Text
          variant="xs"
          color={Colors[theme].textSecondary}
          align="right"
          style={{ marginTop: 6, lineHeight: 18 }}
        >
          وِجهتُك المُثلى لِتَعرفَ وتَغرفَ مِن سِيرة النبيِّ ﷺ{'\n'}
          وأصحابِه العِظام عَبْرَ محتوًى موثوقٍ شاملٍ
        </Text>
        <TouchableOpacity
          style={[styles.moreButton, { backgroundColor: Colors[theme].primary }]}
          accessibilityRole="button"
          accessibilityLabel="المزيد عن محمد رسول الله"
        >
          <Ionicons name="arrow-back" size={10} color={Colors[theme].textOnPrimaryFaint} />
          <Text variant="xs" weight="semiBold" color={Colors[theme].textOnPrimaryFaint}>
            المزيد
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Scholar Card (Figma: 194-216px wide, 78-88px tall, navy bg, gold bar top) ───

function ScholarCard({ name, title }: { name: string; title: string }) {
  const theme = useColorScheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.scholarCard, { backgroundColor: Colors[theme].primary }]}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${name}`}
    >
      {/* Gold accent bar on top */}
      <View style={[styles.scholarTopBar, { backgroundColor: Colors[theme].goldBar }]} />
      {/* Scholar title (e.g. الشيخ) */}
      <Text
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
      >
        {title}
      </Text>
      {/* Scholar name */}
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: Colors[theme].textOnPrimary,
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Book Card (Figma: 185-192px wide, 80-81px tall, beige bg, blue bar top) ───

function BookCard({ title }: { title: string }) {
  const theme = useColorScheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.bookCard, { backgroundColor: Colors[theme].bookCardBg }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Navy accent bar on top */}
      <View style={[styles.bookTopBar, { backgroundColor: Colors[theme].blueBar }]} />
      {/* Book title */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: Colors[theme].primary,
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Quick Access Card ───

function QuickAccessCard({ label, icon }: { label: string; icon: string }) {
  const theme = useColorScheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.quickCard, { backgroundColor: Colors[theme].surfaceAlt }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {/* Accent bar on top */}
      <View style={[styles.quickCardBar, { backgroundColor: Colors[theme].goldBar }]} />
      <View style={styles.quickCardContent}>
        <Ionicons name={icon as any} size={20} color={Colors[theme].primary} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors[theme].primary,
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── أنتِ ملكة Section (Figma: warm bg, text + decorative image) ───

function QueenSection() {
  const theme = useColorScheme();
  return (
    <View style={[styles.queenSection, { backgroundColor: Colors[theme].queenBg }]}>
      {/* Decorative area (left side) */}
      <View style={styles.queenImageArea}>
        <View style={[styles.queenImagePlaceholder, { backgroundColor: Colors[theme].primary + '12' }]}>
          <Ionicons name="flower" size={40} color={Colors[theme].secondary} />
        </View>
      </View>
      {/* Text content (right side) */}
      <View style={styles.queenTextArea}>
        <View style={styles.bannerTitleRow}>
          <Text variant="xl" weight="bold" color={Colors[theme].primary}>
            أنتِ ملكة
          </Text>
          <View style={[styles.bannerTitleBar, { backgroundColor: Colors[theme].secondary }]} />
        </View>
        <Text
          variant="xs"
          color={Colors[theme].textSecondary}
          align="right"
          style={{ marginTop: 8, lineHeight: 20 }}
        >
          مَلِكةٌ أنتِ لا سِواكِ وفي قُربك من ربك: هُداكِ{'\n'}
          فأعدَدنا لكِ هذا المحتوى النَّدِي لتَصنعي جِيلًا{'\n'}
          على هَدي النبي ﷺ
        </Text>
        <TouchableOpacity
          style={[styles.moreButton, { backgroundColor: Colors[theme].primary }]}
          accessibilityRole="button"
          accessibilityLabel="المزيد عن أنتِ ملكة"
        >
          <Ionicons name="arrow-back" size={10} color={Colors[theme].textOnPrimaryFaint} />
          <Text variant="xs" weight="semiBold" color={Colors[theme].textOnPrimaryFaint}>
            المزيد
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Design Card (Figma: single wide card, ~full width, ~149px tall) ───

function DesignCard() {
  const theme = useColorScheme();
  return (
    <View style={styles.designCardContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="تصميمات دعوية"
        style={[
          styles.designCard,
          {
            backgroundColor: Colors[theme].surfaceAlt,
          },
        ]}
      >
        {/* Placeholder for design card content */}
        <View style={styles.designCardInner}>
          <Ionicons
            name="image-outline"
            size={32}
            color={Colors[theme].secondary}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: Colors[theme].primary,
              textAlign: 'center',
              writingDirection: 'rtl',
              marginTop: 8,
            }}
          >
            تصميمات دعوية
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: Colors[theme].textSecondary,
              textAlign: 'center',
              writingDirection: 'rtl',
              marginTop: 4,
            }}
          >
            تصميمات إسلامية جاهزة للنشر
          </Text>
        </View>
      </TouchableOpacity>
      {/* Dot indicators */}
      <View style={styles.dotIndicators}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === 0
                    ? Colors[theme].primary
                    : Colors[theme].border,
              },
            ]}
          />
        ))}
      </View>
    </View>
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
        <View style={styles.header}>
          {/* Left: search icon */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/search')}
            style={[styles.searchIcon, { backgroundColor: Colors[theme].surface }]}
            accessibilityRole="button"
            accessibilityLabel="البحث"
          >
            <Ionicons name="search" size={18} color={Colors[theme].primary} />
          </TouchableOpacity>
          {/* Right: title + logo */}
          <View style={styles.headerRight}>
            <View style={styles.headerTitleBlock}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: Colors[theme].primary,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                }}
              >
                خزائن الرحمن
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: Colors[theme].secondary,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  marginTop: 1,
                }}
              >
                تأخذ بيدك إلى الجنة
              </Text>
            </View>
            <View style={[styles.logoSmall, { backgroundColor: Colors[theme].primary }]}>
              <Ionicons name="book" size={18} color={Colors[theme].textOnPrimary} />
            </View>
          </View>
        </View>

        {/* Hero decorative separator */}
        <View style={styles.heroSeparator}>
          <View style={[styles.heroSeparatorLine, { backgroundColor: Colors[theme].goldBar }]} />
          <View style={[styles.heroSeparatorDiamond, { backgroundColor: Colors[theme].goldBar }]} />
          <View style={[styles.heroSeparatorLine, { backgroundColor: Colors[theme].goldBar }]} />
        </View>

        {/* 1. القرآن حياة Banner */}
        <View style={styles.bannerSection}>
          <QuranBanner />
        </View>

        {/* 2. محمد رسول الله Banner */}
        <View style={styles.bannerSection}>
          <ProphetBanner />
        </View>

        {/* 3. العلماء والمشايخ - Scholars */}
        <View style={styles.section}>
          <SectionHeader
            title="العلماء والمشايخ"
            titleColor={Colors[theme].primary}
            barColor={Colors[theme].goldBar}
            onSeeAll={() => {}}
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

        {/* 4. الكتب العلمية - Books */}
        <View style={styles.section}>
          <SectionHeader
            title="الكتب العلمية"
            titleColor={Colors[theme].primary}
            barColor={Colors[theme].goldBar}
            onSeeAll={() => {}}
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

        {/* 5. أنتِ ملكة */}
        <View style={styles.section}>
          <QueenSection />
        </View>

        {/* 6. تصميمات دعوية - Dawah Designs */}
        <View style={styles.section}>
          <SectionHeader
            title="تصميمات دعوية"
            titleColor={Colors[theme].primary}
            barColor={Colors[theme].goldBar}
            onSeeAll={() => {}}
          />
          <DesignCard />
        </View>

        {/* 7. Quick Access */}
        <View style={[styles.section, { marginBottom: Spacing.xxxl }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {MOCK_QUICK_ACCESS.map((item) => (
              <QuickAccessCard
                key={item.id}
                label={item.label}
                icon={item.icon}
              />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleBlock: {
    alignItems: 'flex-end',
  },
  logoSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero separator (decorative gold line + diamond)
  heroSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  heroSeparatorLine: {
    height: 1.5,
    width: 70,
    borderRadius: 1,
  },
  heroSeparatorDiamond: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },

  // Section header (Figma: row with title+bar right, "عرض الكل" left)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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

  // Sections
  section: {
    marginBottom: 28,
  },
  bannerSection: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 10,
  },

  // Featured Banner (القرآن حياة)
  featuredBanner: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bannerImageArea: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImagePlaceholder: {
    width: 72,
    height: 82,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextArea: {
    flex: 1,
    paddingVertical: 18,
    paddingEnd: 18,
    alignItems: 'flex-end',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTitleBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 4,
    gap: 4,
    marginTop: 10,
  },

  // Prophet Banner (محمد رسول الله)
  prophetBanner: {
    height: 155,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  prophetImageArea: {
    width: 95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prophetImagePlaceholder: {
    width: 65,
    height: 78,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prophetTextArea: {
    flex: 1,
    paddingVertical: 16,
    paddingEnd: 18,
    alignItems: 'flex-end',
  },

  // Scholar Card (Figma: ~200px wide, ~84px tall, navy bg, gold top bar)
  scholarCard: {
    width: 200,
    height: 84,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    // Shadow from Figma: 2.85px 0.71px 11.41px rgba(20, 64, 100, 0.24)
    shadowColor: '#144064',
    shadowOffset: { width: 2.85, height: 0.71 },
    shadowOpacity: 0.24,
    shadowRadius: 11.41,
    elevation: 4,
  },
  scholarTopBar: {
    position: 'absolute',
    top: -2.5,
    width: 140,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
  },

  // Book Card (Figma: ~190px wide, ~80px tall, beige bg, blue top bar)
  bookCard: {
    width: 190,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    // Shadow from Figma: 2.67px 0.67px 10.66px rgba(20, 64, 100, 0.24)
    shadowColor: '#144064',
    shadowOffset: { width: 2.67, height: 0.67 },
    shadowOpacity: 0.24,
    shadowRadius: 10.66,
    elevation: 4,
  },
  bookTopBar: {
    position: 'absolute',
    top: -2,
    width: 114,
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
  },

  // Quick Access Cards
  quickCard: {
    width: 180,
    height: 90,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    // Shadow
    shadowColor: '#144064',
    shadowOffset: { width: 2, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  quickCardBar: {
    position: 'absolute',
    top: -2.5,
    width: 100,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
  },
  quickCardContent: {
    alignItems: 'center',
    gap: 6,
  },

  // أنتِ ملكة Section
  queenSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 180,
  },
  queenImageArea: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queenImagePlaceholder: {
    width: 72,
    height: 90,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queenTextArea: {
    flex: 1,
    paddingVertical: 18,
    paddingEnd: 18,
    alignItems: 'flex-end',
  },

  // Design Card
  designCardContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  designCard: {
    width: '100%',
    height: 149,
    borderRadius: 12,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#144064',
    shadowOffset: { width: 2, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  designCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dotIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
