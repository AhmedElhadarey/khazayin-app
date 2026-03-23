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
import { apiService } from '@/services/api';
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

function ExclusivesIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.5} />
      <Path
        d="M12 7v5l3 3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RadioIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={8}
        width={18}
        height={12}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
      />
      <Circle cx={8} cy={14} r={2} stroke={color} strokeWidth={1.5} />
      <Path
        d="M14 11h4M14 14h4M14 17h4M3 8l6-4"
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
  const iconMap: { [key: string]: JSX.Element } = {
    'quran': <QuranIcon color={color} />,
    'prophet': <ProphetIcon color={color} />,
    'scholars': <ScholarsIcon color={color} />,
    'books': <BooksIcon color={color} />,
    'queen': <QueenIcon color={color} />,
    'audiobooks': <AudioBookIcon color={color} />,
    'exclusives': <ExclusivesIcon color={color} />,
    'radio': <RadioIcon color={color} />,
    'designs': <DesignsIcon color={color} />,
  };
  return iconMap[categoryId] || <BooksIcon color={color} />;
};

// ─── Category Card (Matching Figma design) ───

function CategoryCard({
  category,
  onPress,
}: {
  category: Category;
  onPress: () => void;
}) {
  const theme = useColorScheme();
  
  // Get episode count text
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
        {category.description && (
          <Text
            variant="sm"
            color={Colors[theme].textSecondary}
            numberOfLines={1}
            style={styles.cardDescription}
          >
            {category.description}
          </Text>
        )}
        
        {/* Count */}
        <Text
          variant="sm"
          weight="semiBold"
          color={Colors[theme].secondary}
          style={styles.cardCount}
        >
          {getCountText(category.count || Math.floor(Math.random() * 200) + 50, category.type)}
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

export default function BrowseScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extended categories matching the design
  const designCategories: Category[] = [
    {
      id: 'quran',
      name: 'القرآن حياة',
      description: 'تلاوات وتفسير وتدبر القرآن الكريم',
      icon: 'book',
      count: 156,
      type: 'episodes',
    },
    {
      id: 'prophet',
      name: 'رسول الله ﷺ',
      description: 'محاضرات ودروس كبار العلماء',
      icon: 'person',
      count: 243,
      type: 'episodes',
    },
    {
      id: 'scholars',
      name: 'العلماء والمشايخ',
      description: 'محاضرات ودروس كبار العلماء',
      icon: 'school',
      count: 243,
      type: 'episodes',
    },
    {
      id: 'books',
      name: 'الكتب العلمية',
      description: 'شروحات الكتب الإسلامية المهمة',
      icon: 'library',
      count: 89,
      type: 'episodes',
    },
    {
      id: 'queen',
      name: 'أنتِ ملكة',
      description: 'فلكة أنتِ لا سواكِ',
      icon: 'star',
      count: 128,
      type: 'episodes',
    },
    {
      id: 'audiobooks',
      name: 'كتب صوتية',
      description: 'كتب إسلامية مقروءة بصوت عذب',
      icon: 'headset',
      count: 67,
      type: 'books',
    },
    {
      id: 'exclusives',
      name: 'حصريات خزائن الرحمن',
      description: 'محتوى حصري ومميز',
      icon: 'diamond',
      count: 34,
      type: 'episodes',
    },
    {
      id: 'radio',
      name: 'برامج إذاعية',
      description: 'برامج إذاعية إسلامية متنوعة',
      icon: 'radio',
      count: 128,
      type: 'episodes',
    },
    {
      id: 'designs',
      name: 'تصميمات دعوية',
      description: 'محتوى بصري ومرئي للدعوة',
      icon: 'image',
      count: 45,
      type: 'designs',
    },
  ];

  const loadData = async () => {
    setError(null);
    setLoading(true);
    try {
      // Use design categories instead of API for now
      await new Promise(resolve => setTimeout(resolve, 500));
      setCategories(designCategories);
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
              placeholder="بحث.."
              placeholderTextColor={Colors[theme].textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.searchIconContainer}>
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
              onPress={() => {}}
            />
          ))}
        </View>

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
});
