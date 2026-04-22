import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── TypeScript Interfaces ───

interface AboutSection {
  id: string;
  title: string;
  content: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── About Section Card Component ───

function AboutSectionCard({ section }: { section: AboutSection }) {
  const theme = useColorScheme();

  return (
    <View style={[styles.aboutCard, { backgroundColor: Colors[theme].surface }, Shadows.sm]}>
      {/* Title row */}
      <View style={styles.aboutCardHeader}>
        <Text variant="md" weight="bold" color={Colors[theme].primary}>
          {section.title}
        </Text>
        <View style={[styles.aboutIconCircle, { backgroundColor: Colors[theme].iconBg }]}>
          <Ionicons name={section.icon} size={20} color={Colors[theme].secondary} />
        </View>
      </View>

      {/* Separator */}
      <View style={[styles.separator, { backgroundColor: Colors[theme].borderLight }]} />

      {/* Content */}
      <Text
        variant="sm"
        color={Colors[theme].textSecondary}
        align="right"
        style={styles.aboutContent}
      >
        {section.content}
      </Text>
    </View>
  );
}

// ─── About Sections Data ───

const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: 'overview',
    title: 'نبذة عامة',
    content:
      'مكتبة خزائن الرحمن هي مكتبة رقمية إسلامية مجانية تهدف إلى تسهيل الوصول إلى الكتب والموارد الإسلامية النافعة. نسعى لتقديم محتوى موثوق ومتنوع يشمل العقيدة والفقه والحديث والتفسير والسيرة النبوية.',
    icon: 'library-outline',
  },
  {
    id: 'mission',
    title: 'رسالتنا',
    content:
      'نشر العلم الشرعي النافع وتيسير الوصول إليه لكل مسلم ومسلمة في جميع أنحاء العالم، عبر توفير محتوى رقمي عالي الجودة يراعي الدقة العلمية والموثوقية.',
    icon: 'flag-outline',
  },
  {
    id: 'vision',
    title: 'رؤيتنا',
    content:
      'أن نكون المرجع الرقمي الأول للمحتوى الإسلامي الموثوق، وأن نساهم في بناء جيل واعٍ بدينه متمسك بأصوله، من خلال تقديم تجربة رقمية متميزة تجمع بين الأصالة والحداثة.',
    icon: 'eye-outline',
  },
  {
    id: 'values',
    title: 'قيمنا',
    content:
      'الإتقان في العمل والدقة في المحتوى والتيسير على المستخدمين والشمولية في التغطية والأمانة العلمية والاستمرارية في التطوير والإبداع في الطرح.',
    icon: 'diamond-outline',
  },
  {
    id: 'team',
    title: 'فريق العمل',
    content:
      'يعمل على هذا المشروع فريق متخصص من المطورين والمصممين والباحثين الشرعيين، بهدف تقديم أفضل تجربة ممكنة للمستخدم مع الحفاظ على جودة المحتوى العلمي.',
    icon: 'people-outline',
  },
];

// ─── Main About Screen ───

export default function AboutScreen() {
  const theme = useColorScheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: Colors[theme].surfaceAlt }]}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <Ionicons name="chevron-forward" size={20} color={Colors[theme].text} />
        </TouchableOpacity>
        <Text variant="xl" weight="bold" color={Colors[theme].primary}>
          نبذة عن المؤسسة
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Logo / Branding Area */}
        <View style={[styles.brandingCard, { backgroundColor: Colors[theme].surface }, Shadows.sm]}>
          <View style={[styles.logoCircle, { backgroundColor: Colors[theme].primary }]}>
            <Ionicons name="book" size={32} color={Colors[theme].textOnPrimary} />
          </View>
          <Text
            variant="lg"
            weight="bold"
            color={Colors[theme].primary}
            style={{ marginTop: Spacing.md }}
          >
            خزائن الرحمن
          </Text>
          <Text
            variant="sm"
            color={Colors[theme].textSecondary}
            style={{ marginTop: Spacing.xs }}
          >
            مكتبة رقمية إسلامية شاملة
          </Text>
        </View>

        {/* About sections */}
        {ABOUT_SECTIONS.map((section) => (
          <AboutSectionCard key={section.id} section={section} />
        ))}

        {/* App info footer */}
        <View style={[styles.appInfoCard, { backgroundColor: Colors[theme].surface }, Shadows.sm]}>
          <View style={styles.appInfoRow}>
            <Text variant="sm" color={Colors[theme].textSecondary}>
              1.0.0
            </Text>
            <Text variant="sm" weight="semiBold" color={Colors[theme].text}>
              إصدار التطبيق
            </Text>
          </View>
          <View
            style={[
              styles.appInfoSeparator,
              { backgroundColor: Colors[theme].borderLight },
            ]}
          />
          <View style={styles.appInfoRow}>
            <Text variant="sm" color={Colors[theme].textSecondary}>
              iOS / Android
            </Text>
            <Text variant="sm" weight="semiBold" color={Colors[theme].text}>
              المنصات المدعومة
            </Text>
          </View>
          <View
            style={[
              styles.appInfoSeparator,
              { backgroundColor: Colors[theme].borderLight },
            ]}
          />
          <View style={styles.appInfoRow}>
            <Text variant="sm" color={Colors[theme].textSecondary}>
              العربية
            </Text>
            <Text variant="sm" weight="semiBold" color={Colors[theme].text}>
              اللغة
            </Text>
          </View>
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───

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
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },

  // Branding
  brandingCard: {
    borderRadius: Border.radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // About card
  aboutCard: {
    borderRadius: Border.radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  aboutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  aboutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  aboutContent: {
    lineHeight: 24,
  },

  // App info
  appInfoCard: {
    borderRadius: Border.radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  appInfoSeparator: {
    height: StyleSheet.hairlineWidth,
  },
});
