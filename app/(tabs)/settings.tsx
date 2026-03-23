import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/useAppStore';

// ─── Simple Settings Row (Figma mobile: numbered row with title, subtitle, chevron) ───

function SettingsRow({
  number,
  icon,
  title,
  subtitle,
  onPress,
}: {
  number?: number;
  icon?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const theme = useColorScheme();
  return (
    <TouchableOpacity
      style={[
        styles.settingsRow,
        { borderBottomColor: Colors[theme].borderLight },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Chevron left */}
      <Ionicons name="chevron-back" size={16} color={Colors[theme].textMuted} />

      {/* Text content — right aligned */}
      <View style={styles.rowTextArea}>
        <Text variant="md" weight="semiBold" color={Colors[theme].text}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="xs" color={Colors[theme].textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Number or icon on right */}
      {number !== undefined && (
        <View style={[styles.numberBadge, { backgroundColor: Colors[theme].primary }]}>
          <Text variant="xs" weight="bold" color={Colors[theme].textOnPrimary}>
            {number}
          </Text>
        </View>
      )}
      {icon && !number && (
        <Ionicons name={icon as any} size={20} color={Colors[theme].primary} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const theme = useColorScheme();
  const { isDarkMode, toggleDarkMode } = useAppStore();
  const [showAbout, setShowAbout] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Page title — right-aligned */}
        <View style={styles.pageHeader}>
          <Text variant="xl" weight="bold" color={Colors[theme].primary}>
            المزيد
          </Text>
        </View>

        {/* Resources section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="md" weight="bold" color={Colors[theme].primary}>
              الموارد الإلكترونية
            </Text>
            <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />
          </View>

          <View style={[styles.sectionCard, { backgroundColor: Colors[theme].surface }]}>
            <SettingsRow
              number={1}
              title="المصحف الإلكتروني"
              subtitle="قراءة القرآن الكريم كاملاً"
              onPress={() => Alert.alert('قريباً', 'المصحف الإلكتروني قيد التطوير')}
            />
            <SettingsRow
              number={2}
              title="روابط مفيدة"
              subtitle="روابط لمواقع ومصادر إسلامية موثوقة"
              onPress={() => Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
            />
            <SettingsRow
              number={3}
              title="دور الإفتاء والعلماء والمشايخ"
              subtitle="روابط هيئات الإفتاء والمراجع الشرعية"
              onPress={() => Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
            />
            <SettingsRow
              number={4}
              title="قنوات الإنترنت"
              subtitle="قنوات الإنترنت الدينية المفيدة"
              onPress={() => Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
            />
            <SettingsRow
              number={5}
              title="البث الديني المباشر"
              subtitle="البث المباشر للقنوات الدينية"
              onPress={() => Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
            />
            <SettingsRow
              number={6}
              title="مسح ذاكرة التطبيق"
              subtitle="تحرير مساحة التخزين المؤقتة"
              onPress={() => Alert.alert('تم', 'تم حذف الكاشي بنجاح')}
            />
          </View>
        </View>

        {/* App Settings section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="md" weight="bold" color={Colors[theme].primary}>
              إعدادات التطبيق
            </Text>
            <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />
          </View>

          <View style={[styles.sectionCard, { backgroundColor: Colors[theme].surface }]}>
            {/* Dark mode toggle */}
            <View
              style={[
                styles.settingsRow,
                { borderBottomColor: Colors[theme].borderLight },
              ]}
            >
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{
                  false: Colors[theme].border,
                  true: Colors[theme].primary,
                }}
                thumbColor={Colors[theme].surface}
              />
              <View style={styles.rowTextArea}>
                <Text variant="md" weight="semiBold" color={Colors[theme].text}>
                  الوضع الليلي
                </Text>
              </View>
              <Ionicons name="moon-outline" size={20} color={Colors[theme].primary} />
            </View>

            <SettingsRow
              icon="information-circle-outline"
              title="عن التطبيق"
              subtitle="معلومات عن تطبيق خزائن الرحمن"
              onPress={() => setShowAbout(true)}
            />
            <SettingsRow
              icon="document-text-outline"
              title="سياسة الخصوصية والشروط"
              subtitle="الشروط والأحكام وسياسة الخصوصية"
              onPress={() => Alert.alert('قريباً', 'هذه الصفحة قيد التطوير')}
            />
            <SettingsRow
              icon="star-outline"
              title="قيّم التطبيق"
              onPress={() => Alert.alert('شكراً', 'شكراً لتقييمك!')}
            />
            <SettingsRow
              icon="share-social-outline"
              title="شارك التطبيق"
              onPress={() => Alert.alert('مشاركة', 'ميزة المشاركة قيد التطوير')}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="xs" color={Colors[theme].textMuted} align="center">
            الإصدار 1.0.0
          </Text>
          <Text
            variant="xxs"
            color={Colors[theme].textMuted}
            align="center"
            style={{ marginTop: Spacing.xs }}
          >
            صنع بإتقان
          </Text>
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* About Modal */}
      <Modal visible={showAbout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: Colors[theme].surface },
              Shadows.lg,
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowAbout(false)}
                style={[styles.modalCloseButton, { backgroundColor: Colors[theme].surfaceAlt }]}
              >
                <Ionicons name="close" size={20} color={Colors[theme].text} />
              </TouchableOpacity>
              <Text variant="xl" weight="bold" color={Colors[theme].primary}>
                عن خزائن الرحمن
              </Text>
            </View>

            <View style={styles.modalLogoRow}>
              <View style={[styles.modalLogo, { backgroundColor: Colors[theme].primary }]}>
                <Ionicons name="book" size={28} color={Colors[theme].textOnPrimary} />
              </View>
            </View>

            <Text
              variant="md"
              color={Colors[theme].textSecondary}
              style={styles.modalBody}
              align="right"
            >
              مكتبة خزائن الرحمن هي مكتبة رقمية إسلامية مجانية تهدف إلى
              تسهيل الوصول إلى الكتب والموارد الإسلامية النافعة. نسعى لتقديم
              محتوى موثوق ومتنوع يشمل العقيدة والفقه والحديث والتفسير
              والسيرة النبوية.
            </Text>

            <Button title="إغلاق" onPress={() => setShowAbout(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Page Header — right-aligned
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    alignItems: 'flex-end',
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: Border.radius.md,
    overflow: 'hidden',
  },

  // Settings Row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTextArea: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: Spacing.md,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    borderRadius: Border.radius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLogoRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    lineHeight: 26,
    marginBottom: Spacing.xl,
  },
});
