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

// ─── Category Row (Figma mobile: simple list row with icon, name, description, chevron) ───

function CategoryRow({
  category,
  index,
  onPress,
}: {
  category: Category;
  index: number;
  onPress: () => void;
}) {
  const theme = useColorScheme();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.categoryRow,
        {
          backgroundColor: Colors[theme].surface,
          borderBottomColor: Colors[theme].borderLight,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      {/* Content: icon + text */}
      <View style={styles.categoryRowContent}>
        {/* Icon */}
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: Colors[theme].primary + '10' },
          ]}
        >
          <Ionicons
            name={(category.icon as any) || 'folder'}
            size={22}
            color={Colors[theme].primary}
          />
        </View>

        {/* Text */}
        <View style={styles.categoryTextArea}>
          <Text variant="md" weight="semiBold" color={Colors[theme].text}>
            {category.name}
          </Text>
          {category.description && (
            <Text
              variant="xs"
              color={Colors[theme].textSecondary}
              numberOfLines={1}
              style={{ marginTop: 2 }}
            >
              {category.description}
            </Text>
          )}
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-back" size={18} color={Colors[theme].textMuted} />
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

  const loadData = async () => {
    setError(null);
    setLoading(true);
    try {
      const categoriesRes = await apiService.getCategories();
      setCategories(categoriesRes);
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

  const rootCategories = categories.filter((c) => !c.parentId);

  const filteredCategories = searchQuery
    ? rootCategories.filter(
        (c) =>
          c.name.includes(searchQuery) ||
          (c.description && c.description.includes(searchQuery))
      )
    : rootCategories;

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
        {/* Page title — right-aligned like Figma mobile */}
        <View style={styles.pageHeader}>
          <Text variant="xl" weight="bold" color={Colors[theme].primary}>
            الأقسام
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInput,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].borderLight,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={Colors[theme].textMuted} />
            <TextInput
              style={[styles.input, { color: Colors[theme].text }]}
              placeholder="ابحث في الأقسام..."
              placeholderTextColor={Colors[theme].textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors[theme].textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category list */}
        <View style={styles.listContainer}>
          {filteredCategories.map((cat, index) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              index={index}
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

  // Page Header — right-aligned (Figma mobile)
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    alignItems: 'flex-end',
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    height: 44,
    borderRadius: Border.radius.md,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // List
  listContainer: {
    paddingHorizontal: Spacing.lg,
  },

  // Category Row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextArea: {
    flex: 1,
  },
});
