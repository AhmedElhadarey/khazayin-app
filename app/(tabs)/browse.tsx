import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Category } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, G, Rect, Circle, Line } from 'react-native-svg';

// ─── Category Icons ───

function QuranIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6v7M9 9.5h6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ProphetIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M12 4V2M8 5l-1-1.5M16 5l1-1.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ScholarsIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L2 9l10 6 10-6-10-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 9v8M22 9v4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M6 11.5v5c0 2 3 4 6 4s6-2 6-4v-5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BooksIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h4v16H4V4zM8 4h4v16H8V4zM12 4h4v16h-4V4z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 4l4 2v14l-4-2V4z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HadithIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4}
        y={3}
        width={16}
        height={18}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M8 7h8M8 11h8M8 15h5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AqeedahIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3 6h7l-5.5 4.5L18 20l-6-4-6 4 1.5-7.5L2 8h7l3-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AdabIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QueenIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 22h12"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AudioBookIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 18V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.5} />
      <Path
        d="M12 9V4M12 20v-5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MiscBooksIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4}
        y={4}
        width={16}
        height={16}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M9 8h6M9 12h6M9 16h4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DesignsIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={3}
        width={18}
        height={18}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M3 9h18M9 21V9"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Map category IDs to icons
const getCategoryIcon = (categoryId: string, color: string) => {
  const iconMap: { [key: string]: React.ReactElement } = {
    'quran': <QuranIcon color={color} />,
    'prophet': <ProphetIcon color={color} />,
    'scholars': <ScholarsIcon color={color} />,
    'books': <BooksIcon color={color} />,
    'hadith': <HadithIcon color={color} />,
    'aqeedah': <AqeedahIcon color={color} />,
    'adab': <AdabIcon color={color} />,
    'audiobooks': <AudioBookIcon color={color} />,
    'misc-books': <MiscBooksIcon color={color} />,
    'designs': <DesignsIcon color={color} />,
    'queen': <QueenIcon color={color} />,
  };
  return iconMap[categoryId] || <BooksIcon color={color} />;
};

// ─── Category Card (Matching design) ───

function CategoryCard({
  category,
  onPress,
}: {
  category: Category;
  onPress: () => void;
}) {
  const theme = useColorScheme();

  const getCountText = (count: number, type?: string) => {
    if (type === 'books') return `${count} كتاب`;
    if (type === 'designs') return `${count} تصميم`;
    return `${count} حلقة`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.categoryCard,
        {
          backgroundColor: Colors[theme].surface,
          ...Shadows.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      {/* Left Arrow */}
      <Ionicons
        name="chevron-back"
        size={20}
        color={Colors[theme].textMuted}
      />

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Title */}
        <Text
          variant="md"
          weight="bold"
          color={Colors[theme].text}
          style={styles.cardTitle}
        >
          {category.name}
        </Text>

        {/* Description */}
        {category.description ? (
          <Text
            variant="sm"
            color={Colors[theme].textSecondary}
            numberOfLines={1}
            style={styles.cardDescription}
          >
            {category.description}
          </Text>
        ) : null}

        {/* Count */}
        <Text
          variant="sm"
          weight="semiBold"
          color={Colors[theme].secondary}
          style={styles.cardCount}
        >
          {getCountText(category.count || category.childrenCount || 0, category.type)}
        </Text>
      </View>

      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: Colors[theme].iconBg },
        ]}
      >
        {getCategoryIcon(category.id, Colors[theme].secondary)}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Browse Screen ───

// Design categories - the 11 categories shown in the الأقسام design
const BROWSE_CATEGORIES: Category[] = [
  {
    id: 'quran',
    name: 'القرآن حياة',
    description: 'تلاوات وتفسير وتدبر القرآن الكريم',
    parentId: null,
    count: 156,
    type: 'episodes',
    icon: 'book',
  },
  {
    id: 'prophet',
    name: 'محمد رسول الله',
    description: 'السيرة النبوية والشمائل المحمدية',
    parentId: null,
    count: 98,
    type: 'episodes',
    icon: 'star',
  },
  {
    id: 'scholars',
    name: 'العلماء والمشايخ',
    description: 'محاضرات ودروس كبار العلماء',
    parentId: null,
    count: 243,
    type: 'episodes',
    icon: 'school',
  },
  {
    id: 'books',
    name: 'الكتب العلمية',
    description: 'شروحات الكتب الإسلامية المهمة',
    parentId: null,
    count: 89,
    type: 'books',
    icon: 'library',
  },
  {
    id: 'hadith',
    name: 'الحديث والسنّة',
    description: 'كتب الحديث النبوي الشريف وشروحاته',
    parentId: null,
    count: 72,
    type: 'episodes',
    icon: 'document-text',
  },
  {
    id: 'aqeedah',
    name: 'العقيدة',
    description: 'كتب التوحيد والعقيدة الإسلامية',
    parentId: null,
    count: 45,
    type: 'episodes',
    icon: 'shield-checkmark',
  },
  {
    id: 'adab',
    name: 'أدب طالب العلم',
    description: 'كتب الآداب الشرعية والتزكية',
    parentId: null,
    count: 38,
    type: 'episodes',
    icon: 'school',
  },
  {
    id: 'audiobooks',
    name: 'كتب مسموعة',
    description: 'كتب إسلامية مقروءة بصوت عذب',
    parentId: null,
    count: 67,
    type: 'books',
    icon: 'headset',
  },
  {
    id: 'misc-books',
    name: 'كتب متنوعة',
    description: 'كتب متنوعة في مواضيع إسلامية مختلفة',
    parentId: null,
    count: 54,
    type: 'books',
    icon: 'library',
  },
  {
    id: 'designs',
    name: 'تصميمات دعوية',
    description: 'محتوى بصري ومرئي للدعوة',
    parentId: null,
    count: 45,
    type: 'designs',
    icon: 'image',
  },
  {
    id: 'queen',
    name: 'أنتِ ملكة',
    description: 'مَلِكةٌ أنتِ لا سِواكِ',
    parentId: null,
    count: 128,
    type: 'episodes',
    icon: 'diamond',
  },
];

export default function BrowseScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setError(null);
    setLoading(true);
    try {
      // Use design categories
      await new Promise(resolve => setTimeout(resolve, 300));
      setCategories(BROWSE_CATEGORIES);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في تحميل الأقسام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCategories = searchQuery
    ? categories.filter(
        (c) =>
          c.name.includes(searchQuery) ||
          (c.description && c.description.includes(searchQuery))
      )
    : categories;

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
        {/* Page Title */}
        <View style={styles.pageHeader}>
          <Text variant="xl" weight="bold" color={Colors[theme].text}>
            الأقسام
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInput,
              {
                backgroundColor: Colors[theme].inputBg,
                borderColor: Colors[theme].borderLight,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: Colors[theme].text }]}
              placeholder="بحث في الأقسام.."
              placeholderTextColor={Colors[theme].textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View
              style={[
                styles.searchIconContainer,
                { backgroundColor: Colors[theme].iconBg },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={Colors[theme].secondary}
              />
            </View>
          </View>
        </View>

        {/* Category List */}
        <View style={styles.listContainer}>
          {filteredCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onPress={() =>
                router.push({
                  pathname: '/category/[id]' as any,
                  params: { id: cat.id },
                })
              }
            />
          ))}
        </View>

        {/* Empty search state */}
        {filteredCategories.length === 0 && searchQuery.length > 0 && (
          <View style={styles.emptySearch}>
            <Ionicons
              name="search-outline"
              size={48}
              color={Colors[theme].border}
            />
            <Text
              variant="md"
              color={Colors[theme].textMuted}
              style={{ marginTop: Spacing.md, textAlign: 'center' }}
            >
              {`لا توجد نتائج لـ "${searchQuery}"`}
            </Text>
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Page Header
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: Border.radius.lg,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingRight: Spacing.sm,
  },
  searchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  // Category Card
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.lg,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardDescription: {
    marginBottom: 4,
  },
  cardCount: {
    marginTop: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty search
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
});
