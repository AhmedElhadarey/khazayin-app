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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { apiService } from '@/services/api';
import { Category, Resource } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// ─── Category Icons (reused from browse) ───

function QuranIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

function FolderIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Subcategory Row ───

function SubcategoryRow({
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
        styles.subcategoryRow,
        {
          backgroundColor: Colors[theme].surface,
          ...Shadows.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      {/* Left: Chevron */}
      <Ionicons
        name="chevron-back"
        size={18}
        color={Colors[theme].textMuted}
      />

      {/* Content */}
      <View style={styles.rowContent}>
        <Text
          variant="md"
          weight="bold"
          color={Colors[theme].text}
          style={styles.rowTitle}
        >
          {category.name}
        </Text>
        {category.description ? (
          <Text
            variant="sm"
            color={Colors[theme].textSecondary}
            numberOfLines={1}
            style={styles.rowDescription}
          >
            {category.description}
          </Text>
        ) : null}
        <Text
          variant="xs"
          weight="semiBold"
          color={Colors[theme].secondary}
          style={styles.rowCount}
        >
          {getCountText(category.count || category.childrenCount || 0, category.type)}
        </Text>
      </View>

      {/* Right: Icon */}
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: Colors[theme].iconBg },
        ]}
      >
        <FolderIcon color={Colors[theme].secondary} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Resource Row ───

function ResourceRow({
  resource,
  onPress,
}: {
  resource: Resource;
  onPress: () => void;
}) {
  const theme = useColorScheme();
  const isAudio = resource.fileType === 'audio';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.subcategoryRow,
        {
          backgroundColor: Colors[theme].surface,
          ...Shadows.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={resource.title}
    >
      {/* Left: Chevron */}
      <Ionicons
        name="chevron-back"
        size={18}
        color={Colors[theme].textMuted}
      />

      {/* Content */}
      <View style={styles.rowContent}>
        <Text
          variant="md"
          weight="bold"
          color={Colors[theme].text}
          style={styles.rowTitle}
        >
          {resource.title}
        </Text>
        <Text
          variant="sm"
          color={Colors[theme].textSecondary}
          numberOfLines={1}
          style={styles.rowDescription}
        >
          {resource.author}
        </Text>
        <Text
          variant="xs"
          weight="semiBold"
          color={Colors[theme].secondary}
          style={styles.rowCount}
        >
          {isAudio
            ? `${resource.durationMinutes || 0} دقيقة`
            : resource.sizeBytes
              ? `${(resource.sizeBytes / 1024 / 1024).toFixed(1)} MB`
              : resource.fileType === 'pdf' ? 'PDF' : ''}
        </Text>
      </View>

      {/* Right: Icon */}
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: Colors[theme].iconBg },
        ]}
      >
        <Ionicons
          name={isAudio ? 'headset' : 'book-outline'}
          size={22}
          color={Colors[theme].secondary}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Category Detail Screen ───

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColorScheme();

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setError(null);
    setLoading(true);
    try {
      const [allCategories, allResources] = await Promise.all([
        apiService.getCategories(),
        apiService.getResources(id!),
      ]);

      // Find current category
      const current = allCategories.find((c) => c.id === id) || null;
      setCategory(current);

      // Find subcategories
      const subs = allCategories.filter((c) => c.parentId === id);
      setSubcategories(subs);

      // Find resources for this category
      setResources(allResources);
    } catch (err) {
      console.error(err);
      setError('\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A');
    } finally {
      setLoading(false);
    }
  }

  // Filter subcategories and resources by search
  const filteredSubcategories = searchQuery
    ? subcategories.filter(
        (c) =>
          c.name.includes(searchQuery) ||
          (c.description && c.description.includes(searchQuery))
      )
    : subcategories;

  const filteredResources = searchQuery
    ? resources.filter(
        (r) =>
          r.title.includes(searchQuery) ||
          r.author.includes(searchQuery) ||
          (r.description && r.description.includes(searchQuery))
      )
    : resources;

  const hasContent = filteredSubcategories.length > 0 || filteredResources.length > 0;

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
      {/* Header */}
      <View style={styles.header}>
        {/* Spacer for symmetry */}
        <View style={styles.headerSpacer} />

        {/* Centered Title */}
        <Text variant="lg" weight="bold" color={Colors[theme].text} style={styles.headerTitle}>
          {category?.name || '\u0627\u0644\u0642\u0633\u0645'}
        </Text>

        {/* Back Button (right side in RTL) */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: Colors[theme].surface }]}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <Ionicons name="arrow-forward" size={22} color={Colors[theme].primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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

        {/* Content */}
        {hasContent ? (
          <View style={styles.listContainer}>
            {/* Subcategories */}
            {filteredSubcategories.map((sub) => (
              <SubcategoryRow
                key={sub.id}
                category={sub}
                onPress={() =>
                  router.push({
                    pathname: '/category/[id]' as any,
                    params: { id: sub.id },
                  })
                }
              />
            ))}

            {/* Resources */}
            {filteredResources.map((res) => (
              <ResourceRow
                key={res.id}
                resource={res}
                onPress={() =>
                  router.push({
                    pathname: '/resource/[id]',
                    params: { id: res.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="folder-open-outline"
              size={56}
              color={Colors[theme].border}
            />
            <Text
              variant="md"
              color={Colors[theme].textMuted}
              style={{ marginTop: Spacing.lg, textAlign: 'center' }}
            >
              {searchQuery
                ? 'لا توجد نتائج للبحث'
                : 'لا يوجد محتوى في هذا القسم حالياً'}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
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

  // Subcategory / Resource Row
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Border.radius.lg,
  },
  rowContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
  rowTitle: {
    marginBottom: 4,
  },
  rowDescription: {
    marginBottom: 4,
  },
  rowCount: {
    marginTop: 2,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
});
