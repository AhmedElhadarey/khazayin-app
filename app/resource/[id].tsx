import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import { Resource } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons } from '@expo/vector-icons';

export default function ResourceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColorScheme();

  const { favorites, addFavorite, removeFavorite } = useAppStore();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFavorited = favorites.some((f) => f.id === id);

  useEffect(() => {
    async function loadResource() {
      try {
        const found = await apiService.getResourceById(id!);
        setResource(found);
      } catch (err) {
        console.error(err);
        setError('\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A');
      } finally {
        setLoading(false);
      }
    }
    loadResource();
  }, [id]);

  const toggleFavorite = () => {
    if (!resource) return;
    if (isFavorited) {
      removeFavorite(resource.id);
    } else {
      addFavorite(resource);
    }
  };

  const handleRead = () => {
    if (!resource) return;
    if (resource.fileType === 'pdf') {
      Alert.alert('\u0641\u062A\u062D \u0627\u0644\u0643\u062A\u0627\u0628', '\u0633\u064A\u062A\u0645 \u0641\u062A\u062D \u0627\u0644\u0643\u062A\u0627\u0628 \u0641\u064A \u0642\u0627\u0631\u0626 \u0627\u0644\u0640 PDF (\u0642\u064A\u062F \u0627\u0644\u062A\u0637\u0648\u064A\u0631)');
    } else if (resource.fileType === 'audio') {
      Alert.alert('\u062A\u0634\u063A\u064A\u0644', '\u0633\u064A\u062A\u0645 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0645\u0642\u0637\u0639 \u0627\u0644\u0635\u0648\u062A\u064A (\u0642\u064A\u062F \u0627\u0644\u062A\u0637\u0648\u064A\u0631)');
    } else {
      Alert.alert('\u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645', '\u0647\u0630\u0627 \u0627\u0644\u0646\u0648\u0639 \u0645\u0646 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645 \u062D\u0627\u0644\u064A\u0627\u064B.');
    }
  };

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
        <View style={[styles.errorIconCircle, { backgroundColor: Colors[theme].surfaceAlt }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors[theme].border} />
        </View>
        <Text
          variant="lg"
          weight="bold"
          color={Colors[theme].primary}
          style={{ marginTop: Spacing.xl }}
        >
          {error}
        </Text>
        <Button
          title={'\u0639\u0648\u062F\u0629'}
          onPress={() => router.back()}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    );
  }

  if (!resource) {
    return (
      <View style={[styles.center, { backgroundColor: Colors[theme].background }]}>
        <View style={[styles.errorIconCircle, { backgroundColor: Colors[theme].surfaceAlt }]}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors[theme].border} />
        </View>
        <Text
          variant="lg"
          weight="bold"
          color={Colors[theme].primary}
          style={{ marginTop: Spacing.xl }}
        >
          {'\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0648\u0631\u062F'}
        </Text>
        <Button
          title={'\u0639\u0648\u062F\u0629'}
          onPress={() => router.back()}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    );
  }

  const isAudio = resource.fileType === 'audio';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerButton, { backgroundColor: Colors[theme].surface }]}
          accessibilityRole="button"
          accessibilityLabel={'\u0631\u062C\u0648\u0639'}
        >
          <Ionicons name="arrow-forward" size={22} color={Colors[theme].primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleFavorite}
          style={[styles.headerButton, { backgroundColor: Colors[theme].surface }]}
          accessibilityRole="button"
          accessibilityLabel={isFavorited ? '\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0641\u0636\u0644\u0629' : '\u0625\u0636\u0627\u0641\u0629 \u0644\u0644\u0645\u0641\u0636\u0644\u0629'}
        >
          <Ionicons
            name={isFavorited ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isFavorited ? Colors[theme].secondary : Colors[theme].primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: Colors[theme].primary },
            Shadows.lg,
          ]}
        >
          {/* Gold accent bar on top */}
          <View style={[styles.heroTopBar, { backgroundColor: Colors[theme].goldBar }]} />

          {/* Resource icon */}
          <View style={styles.heroIconCircle}>
            <Ionicons
              name={isAudio ? 'headset' : 'book'}
              size={44}
              color={Colors[theme].goldBar}
            />
          </View>

          {/* Title and author */}
          <Text
            variant="xxl"
            weight="bold"
            align="center"
            color={Colors[theme].textOnPrimary}
            style={styles.heroTitle}
          >
            {resource.title}
          </Text>
          <Text
            variant="md"
            color={Colors[theme].textOnPrimaryFaint}
            align="center"
          >
            {resource.author}
          </Text>

          {/* File type badge */}
          <View style={styles.typeBadge}>
            <Text variant="xxs" weight="bold" color={Colors[theme].primary}>
              {resource.fileType.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Metadata badges row */}
        <View style={styles.metaRow}>
          {resource.sizeBytes && (
            <View
              style={[
                styles.metaBadge,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: Colors[theme].borderLight,
                },
                Shadows.sm,
              ]}
              accessibilityLabel={`\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 ${(resource.sizeBytes / 1024 / 1024).toFixed(1)} \u0645\u064A\u063A\u0627\u0628\u0627\u064A\u062A`}
            >
              <Ionicons name="document-outline" size={20} color={Colors[theme].primary} />
              <Text variant="sm" weight="semiBold" color={Colors[theme].primary}>
                {(resource.sizeBytes / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
          )}
          {resource.durationMinutes && (
            <View
              style={[
                styles.metaBadge,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: Colors[theme].borderLight,
                },
                Shadows.sm,
              ]}
              accessibilityLabel={`\u0627\u0644\u0645\u062F\u0629 ${resource.durationMinutes} \u062F\u0642\u064A\u0642\u0629`}
            >
              <Ionicons name="time-outline" size={20} color={Colors[theme].secondary} />
              <Text variant="sm" weight="semiBold" color={Colors[theme].secondary}>
                {resource.durationMinutes} {'\u062F\u0642\u064A\u0642\u0629'}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.metaBadge,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].borderLight,
              },
              Shadows.sm,
            ]}
          >
            <Ionicons name="folder-outline" size={20} color={Colors[theme].textMuted} />
            <Text variant="sm" weight="semiBold" color={Colors[theme].textSecondary}>
              {isAudio ? '\u0635\u0648\u062A\u064A' : '\u0643\u062A\u0627\u0628'}
            </Text>
          </View>
        </View>

        {/* Description card */}
        {resource.description && (
          <View
            style={[
              styles.descriptionCard,
              {
                backgroundColor: Colors[theme].bookCardBg,
              },
              Shadows.sm,
            ]}
          >
            {/* Navy bar on top */}
            <View
              style={[
                styles.descriptionBar,
                { backgroundColor: Colors[theme].blueBar },
              ]}
            />

            <View style={styles.descriptionContent}>
              <View style={styles.descriptionTitleRow}>
                <Text variant="lg" weight="bold" color={Colors[theme].primary}>
                  {'\u0646\u0628\u0630\u0629 \u0639\u0646 \u0627\u0644\u0643\u062A\u0627\u0628'}
                </Text>
                <View
                  style={[
                    styles.descriptionTitleBar,
                    { backgroundColor: Colors[theme].goldBar },
                  ]}
                />
              </View>
              <Text
                variant="md"
                color={Colors[theme].textSecondary}
                style={styles.descText}
              >
                {resource.description}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer action buttons */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: Colors[theme].surface,
            borderTopColor: Colors[theme].borderLight,
          },
          Shadows.md,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.downloadButton,
            {
              borderColor: Colors[theme].primary,
              backgroundColor: Colors[theme].surface,
            },
          ]}
          onPress={() => Alert.alert('\u0642\u0631\u064A\u0628\u0627\u064B', '\u0645\u064A\u0632\u0629 \u0627\u0644\u062A\u0646\u0632\u064A\u0644 \u0642\u064A\u062F \u0627\u0644\u062A\u0637\u0648\u064A\u0631')}
          accessibilityRole="button"
          accessibilityLabel={'\u062A\u0646\u0632\u064A\u0644'}
        >
          <Ionicons name="download-outline" size={22} color={Colors[theme].primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryActionButton, { backgroundColor: Colors[theme].primary }]}
          onPress={handleRead}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isAudio ? '\u0627\u0633\u062A\u0645\u0627\u0639' : '\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0622\u0646'}
        >
          <Ionicons
            name={isAudio ? 'play' : 'book-outline'}
            size={20}
            color={Colors[theme].textOnPrimary}
          />
          <Text variant="md" weight="bold" color={Colors[theme].textOnPrimary}>
            {isAudio ? '\u0627\u0633\u062A\u0645\u0627\u0639' : '\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0622\u0646'}
          </Text>
          {/* Gold arrow accent */}
          <View style={styles.actionArrow}>
            <Ionicons name="arrow-back" size={14} color={Colors[theme].primary} />
          </View>
        </TouchableOpacity>
      </View>
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
    padding: Spacing.xl,
  },
  errorIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  // Hero Card
  heroCard: {
    borderRadius: Border.radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    width: 160,
    height: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    alignSelf: 'center',
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  heroTitle: {
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Border.radius.xs,
    backgroundColor: 'rgba(193, 165, 132, 0.9)',
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Border.radius.lg,
    borderWidth: 1,
  },

  // Description
  descriptionCard: {
    borderRadius: Border.radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  descriptionBar: {
    height: 4,
    width: 120,
    alignSelf: 'center',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  descriptionContent: {
    padding: Spacing.xl,
  },
  descriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    justifyContent: 'flex-end',
  },
  descriptionTitleBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  descText: {
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  downloadButton: {
    width: 52,
    height: 52,
    borderRadius: Border.radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Border.radius.lg,
    gap: Spacing.sm,
  },
  actionArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(193, 165, 132, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
