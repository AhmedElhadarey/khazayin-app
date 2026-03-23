import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { apiService } from '@/services/api';
import { Resource } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ---- Result Card (Figma: book/resource card with accent bar) ----

function ResultCard({
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
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.resultCard,
        {
          backgroundColor: isAudio
            ? Colors[theme].surface
            : Colors[theme].bookCardBg,
        },
        Shadows.sm,
      ]}
      accessibilityRole="button"
      accessibilityLabel={resource.title}
    >
      {/* Accent bar on top */}
      <View
        style={[
          styles.resultCardBar,
          {
            backgroundColor: isAudio
              ? Colors[theme].goldBar
              : Colors[theme].blueBar,
          },
        ]}
      />

      <View style={styles.resultCardContent}>
        {/* Icon */}
        <View
          style={[
            styles.resultIcon,
            {
              backgroundColor: isAudio
                ? Colors[theme].secondary + '1A'
                : Colors[theme].primary + '12',
            },
          ]}
        >
          <Ionicons
            name={isAudio ? 'headset' : 'book'}
            size={22}
            color={isAudio ? Colors[theme].secondary : Colors[theme].primary}
          />
        </View>

        {/* Text content */}
        <View style={styles.resultTextArea}>
          <Text
            variant="md"
            weight="bold"
            color={Colors[theme].primary}
            numberOfLines={2}
          >
            {resource.title}
          </Text>
          <Text
            variant="xs"
            color={Colors[theme].textSecondary}
            style={{ marginTop: 2 }}
          >
            {resource.author}
          </Text>
        </View>

        {/* Meta */}
        <View style={styles.resultMeta}>
          {resource.fileType === 'audio' && resource.durationMinutes ? (
            <View style={[styles.metaBadge, { backgroundColor: Colors[theme].secondary + '15' }]}>
              <Text variant="xxs" color={Colors[theme].secondary} weight="semiBold">
                {resource.durationMinutes} {'\u062F\u0642\u064A\u0642\u0629'}
              </Text>
            </View>
          ) : resource.sizeBytes ? (
            <View style={[styles.metaBadge, { backgroundColor: Colors[theme].primary + '10' }]}>
              <Text variant="xxs" color={Colors[theme].primary} weight="semiBold">
                {(resource.sizeBytes / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-back" size={16} color={Colors[theme].textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---- Main Search Screen ----

export default function SearchScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiService.getResources(undefined, query);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: Colors[theme].surface }]}
          accessibilityRole="button"
          accessibilityLabel={'\u0631\u062C\u0648\u0639'}
        >
          <Ionicons name="arrow-forward" size={22} color={Colors[theme].primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text variant="xl" weight="bold" color={Colors[theme].primary}>
            {'\u0627\u0644\u0628\u062D\u062B'}
          </Text>
          <View style={[styles.headerBar, { backgroundColor: Colors[theme].goldBar }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search input */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].borderLight,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={Colors[theme].primary} />
          <TextInput
            style={[styles.input, { color: Colors[theme].text }]}
            placeholder={'\u0627\u0628\u062D\u062B \u0639\u0646 \u0643\u062A\u0627\u0628\u060C \u0645\u0624\u0644\u0641\u060C \u0645\u0648\u0636\u0648\u0639...'}
            placeholderTextColor={Colors[theme].textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearched(false); setResults([]); }}>
              <Ionicons name="close-circle" size={20} color={Colors[theme].textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors[theme].primary} />
            <Text
              variant="sm"
              color={Colors[theme].textSecondary}
              style={{ marginTop: Spacing.md }}
            >
              {'\u062C\u0627\u0631\u064A \u0627\u0644\u0628\u062D\u062B...'}
            </Text>
          </View>
        ) : searched && results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: Colors[theme].surfaceAlt },
              ]}
            >
              <Ionicons name="search-outline" size={48} color={Colors[theme].border} />
            </View>
            <Text
              variant="lg"
              weight="bold"
              color={Colors[theme].primary}
              style={{ marginTop: Spacing.xl }}
            >
              {'\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u0645\u0637\u0627\u0628\u0642\u0629'}
            </Text>
            <Text
              variant="sm"
              color={Colors[theme].textSecondary}
              align="center"
              style={{ marginTop: Spacing.sm }}
            >
              {'\u062C\u0631\u0651\u0628 \u0643\u0644\u0645\u0627\u062A \u0628\u062D\u062B \u0645\u062E\u062A\u0644\u0641\u0629 \u0623\u0648\n\u062A\u0635\u0641\u062D \u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0644\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0627 \u062A\u0628\u062D\u062B \u0639\u0646\u0647'}
            </Text>
          </View>
        ) : searched ? (
          <>
            {/* Result count badge */}
            <View style={styles.resultCountRow}>
              <View
                style={[
                  styles.resultCountBadge,
                  { backgroundColor: Colors[theme].primary + '10' },
                ]}
              >
                <Text variant="sm" weight="semiBold" color={Colors[theme].primary}>
                  {results.length} {'\u0646\u062A\u064A\u062C\u0629'}
                </Text>
              </View>
            </View>

            {/* Result cards */}
            {results.map((item) => (
              <ResultCard
                key={item.id}
                resource={item}
                onPress={() => router.push(`/resource/${item.id}`)}
              />
            ))}
          </>
        ) : (
          /* Initial state */
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: Colors[theme].surfaceAlt },
              ]}
            >
              <Ionicons name="search" size={48} color={Colors[theme].secondary} />
            </View>
            <Text
              variant="lg"
              weight="bold"
              color={Colors[theme].primary}
              style={{ marginTop: Spacing.xl }}
            >
              {'\u0627\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0645\u0643\u062A\u0628\u0629'}
            </Text>
            <Text
              variant="sm"
              color={Colors[theme].textSecondary}
              align="center"
              style={{ marginTop: Spacing.sm, lineHeight: 22 }}
            >
              {'\u0627\u0628\u062D\u062B \u0639\u0646 \u0643\u062A\u0628\u060C \u0645\u0624\u0644\u0641\u064A\u0646\u060C \u0645\u0648\u0627\u0636\u064A\u0639\n\u0623\u0648 \u0643\u062A\u0628 \u0635\u0648\u062A\u064A\u0629 \u0648\u0645\u062D\u0627\u0636\u0631\u0627\u062A'}
            </Text>

            {/* Quick search suggestions */}
            <View style={styles.suggestionsRow}>
              {['\u0627\u0644\u0639\u0642\u064A\u062F\u0629', '\u0627\u0644\u062D\u062F\u064A\u062B', '\u0627\u0644\u062A\u0641\u0633\u064A\u0631', '\u0627\u0644\u0633\u064A\u0631\u0629'].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={[
                    styles.suggestionPill,
                    {
                      backgroundColor: Colors[theme].surface,
                      borderColor: Colors[theme].borderLight,
                    },
                  ]}
                  onPress={() => {
                    setQuery(suggestion);
                    setTimeout(async () => {
                      setLoading(true);
                      setSearched(true);
                      try {
                        const data = await apiService.getResources(undefined, suggestion);
                        setResults(data);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setLoading(false);
                      }
                    }, 100);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={suggestion}
                >
                  <Text variant="xs" weight="semiBold" color={Colors[theme].primary}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBar: {
    width: 5,
    height: 24,
    borderRadius: 2.5,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Border.radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },

  // Result count
  resultCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.md,
  },
  resultCountBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Border.radius.sm,
  },

  // Result Card
  resultCard: {
    borderRadius: Border.radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  resultCardBar: {
    height: 4,
    width: 100,
    alignSelf: 'center',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  resultCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextArea: {
    flex: 1,
  },
  resultMeta: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  metaBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Border.radius.xs,
  },

  // Empty / Initial state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Suggestions
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  suggestionPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Border.radius.xl,
    borderWidth: 1,
  },
});
