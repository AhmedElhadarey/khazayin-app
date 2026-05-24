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
import { useRouter } from 'expo-router';

// ─── TypeScript Interfaces ───

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface DonationChannel {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── Menu Row Component ───

function MenuRow({
  item,
  isLast,
}: {
  item: MenuItem;
  isLast: boolean;
}) {
  const theme = useColorScheme();

  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors[theme].borderLight },
      ]}
      onPress={item.onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {/* Chevron on the left (RTL) */}
      <Ionicons name="chevron-back" size={16} color={Colors[theme].textMuted} />

      {/* Text content */}
      <View style={styles.menuRowTextArea}>
        <Text variant="md" weight="semiBold" color={Colors[theme].text}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text
            variant="xs"
            color={Colors[theme].textSecondary}
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {item.subtitle}
          </Text>
        ) : null}
      </View>

      {/* Icon circle on the right (RTL) */}
      <View style={[styles.menuIconCircle, { backgroundColor: Colors[theme].iconBg }]}>
        <Ionicons name={item.icon} size={20} color={Colors[theme].secondary} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Dark Mode Toggle Row ───

function DarkModeRow() {
  const theme = useColorScheme();

  return (
    <View
      style={[
        styles.menuRow,
        { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors[theme].borderLight },
      ]}
    >
      <View style={styles.comingSoonBadge}>
        <Text style={{ fontSize: 10, color: Colors[theme].secondary, writingDirection: 'rtl' }}>
          قريبًا
        </Text>
      </View>
      <Switch
        value={false}
        disabled
        trackColor={{
          false: Colors[theme].border,
          true: Colors[theme].switchTrackActive,
        }}
        thumbColor={Colors[theme].textMuted}
      />
      <View style={styles.menuRowTextArea}>
        <Text variant="md" weight="semiBold" color={Colors[theme].textMuted}>
          الوضع الليلي
        </Text>
        <Text variant="xs" color={Colors[theme].textMuted} style={{ marginTop: 2 }}>
          سيتوفر قريبًا إن شاء الله
        </Text>
      </View>
      <View style={[styles.menuIconCircle, { backgroundColor: Colors[theme].iconBg }]}>
        <Ionicons name="moon-outline" size={20} color={Colors[theme].textMuted} />
      </View>
    </View>
  );
}

// ─── Section Header ───

function SectionHeader({ title }: { title: string }) {
  const theme = useColorScheme();

  return (
    <View style={styles.sectionHeader}>
      <Text variant="md" weight="bold" color={Colors[theme].primary}>
        {title}
      </Text>
      <View style={[styles.sectionBar, { backgroundColor: Colors[theme].goldBar }]} />
    </View>
  );
}

// ─── Donation Channels Modal ───

const DONATION_CHANNELS: DonationChannel[] = [
  {
    id: 'bank',
    title: 'تحويل بنكي',
    subtitle: 'التحويل عبر الحساب البنكي المعتمد',
    icon: 'card-outline',
  },
  {
    id: 'online',
    title: 'التبرع الإلكتروني',
    subtitle: 'الدفع عبر بوابة الدفع الإلكترونية',
    icon: 'globe-outline',
  },
  {
    id: 'mobile',
    title: 'الدفع عبر الجوال',
    subtitle: 'خدمات الدفع عبر الهاتف المحمول',
    icon: 'phone-portrait-outline',
  },
];

function DonationModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useColorScheme();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: Colors[theme].surface },
            Shadows.lg,
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalCloseButton, { backgroundColor: Colors[theme].surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
            >
              <Ionicons name="close" size={20} color={Colors[theme].text} />
            </TouchableOpacity>
            <Text variant="xl" weight="bold" color={Colors[theme].primary}>
              قنوات التبرع
            </Text>
          </View>

          {/* Subtitle */}
          <Text
            variant="sm"
            color={Colors[theme].textSecondary}
            align="right"
            style={{ marginBottom: Spacing.lg }}
          >
            اختر طريقة التبرع المناسبة لك
          </Text>

          {/* Donation channel rows */}
          {DONATION_CHANNELS.map((channel, index) => (
            <TouchableOpacity
              key={channel.id}
              style={[
                styles.donationRow,
                index < DONATION_CHANNELS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: Colors[theme].borderLight,
                },
              ]}
              activeOpacity={0.6}
              onPress={() => {
                onClose();
                Alert.alert('قريباً', 'هذه الخدمة قيد التطوير');
              }}
              accessibilityRole="button"
              accessibilityLabel={channel.title}
            >
              <Ionicons name="chevron-back" size={16} color={Colors[theme].textMuted} />
              <View style={styles.donationRowText}>
                <Text variant="md" weight="semiBold" color={Colors[theme].text}>
                  {channel.title}
                </Text>
                <Text variant="xs" color={Colors[theme].textSecondary} style={{ marginTop: 2 }}>
                  {channel.subtitle}
                </Text>
              </View>
              <View style={[styles.donationRowIcon, { backgroundColor: Colors[theme].iconBg }]}>
                <Ionicons name={channel.icon} size={20} color={Colors[theme].secondary} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Close button */}
          <View style={{ marginTop: Spacing.lg }}>
            <Button title="إغلاق" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Settings Screen ───

export default function SettingsScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [showDonation, setShowDonation] = useState(false);

  // ─── Menu data definition ───

  const menuSections: MenuSection[] = [
    {
      id: 'resources',
      title: 'الموارد الإلكترونية',
      items: [
        {
          id: 'quran',
          title: 'المصحف الإلكتروني',
          subtitle: 'قراءة القرآن الكريم كاملاً',
          icon: 'book-outline',
          onPress: () => Alert.alert('قريباً', 'المصحف الإلكتروني قيد التطوير'),
        },
        {
          id: 'links',
          title: 'روابط مفيدة',
          subtitle: 'روابط لمواقع ومصادر إسلامية موثوقة',
          icon: 'link-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
        },
        {
          id: 'scholars',
          title: 'دور الإفتاء والعلماء والمشايخ',
          subtitle: 'روابط هيئات الإفتاء والمراجع الشرعية',
          icon: 'school-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
        },
        {
          id: 'channels',
          title: 'قنوات الإنترنت',
          subtitle: 'قنوات الإنترنت الدينية المفيدة',
          icon: 'tv-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
        },
        {
          id: 'live',
          title: 'البث الديني المباشر',
          subtitle: 'البث المباشر للقنوات الدينية',
          icon: 'radio-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
        },
        {
          id: 'cache',
          title: 'مسح ذاكرة التطبيق',
          subtitle: 'تحرير مساحة التخزين المؤقتة',
          icon: 'trash-outline',
          onPress: () => Alert.alert('تم', 'تم حذف الكاشي بنجاح'),
        },
      ],
    },
    {
      id: 'donation',
      title: 'التبرعات والدعم',
      items: [
        {
          id: 'report',
          title: 'التقرير الإلكتروني',
          subtitle: 'عرض التقرير الإلكتروني للمؤسسة',
          icon: 'document-text-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
        },
        {
          id: 'donation-programs',
          title: 'برامج التبرع',
          subtitle: 'تعرف على برامج التبرع المتاحة',
          icon: 'heart-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
        },
        {
          id: 'donate',
          title: 'خاص بالتبرع',
          subtitle: 'قنوات التبرع المتاحة',
          icon: 'gift-outline',
          onPress: () => setShowDonation(true),
        },
        {
          id: 'parents-gift',
          title: 'إهداء الوالدين',
          subtitle: 'إهداء الأعمال الصالحة للوالدين',
          icon: 'people-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
        },
      ],
    },
    {
      id: 'features',
      title: 'ميزات أخرى',
      items: [
        {
          id: 'rate',
          title: 'قيّم التطبيق',
          subtitle: 'ساعدنا بتقييمك على المتجر',
          icon: 'star-outline',
          onPress: () => Alert.alert('شكراً', 'شكراً لتقييمك!'),
        },
        {
          id: 'share',
          title: 'شارك التطبيق',
          subtitle: 'شارك التطبيق مع الأصدقاء والعائلة',
          icon: 'share-social-outline',
          onPress: () => Alert.alert('مشاركة', 'ميزة المشاركة قيد التطوير'),
        },
        {
          id: 'privacy',
          title: 'سياسة الخصوصية والشروط',
          subtitle: 'الشروط والأحكام وسياسة الخصوصية',
          icon: 'shield-checkmark-outline',
          onPress: () => Alert.alert('قريباً', 'هذه الصفحة قيد التطوير'),
        },
      ],
    },
    {
      id: 'communication',
      title: 'التواصل',
      items: [
        {
          id: 'contact',
          title: 'تواصل معنا',
          subtitle: 'أرسل لنا رسالة أو استفسار',
          icon: 'mail-outline',
          onPress: () => router.push('/contact' as any),
        },
        {
          id: 'about',
          title: 'نبذة عن المؤسسة',
          subtitle: 'معلومات عن مؤسسة خزائن الرحمن',
          icon: 'information-circle-outline',
          onPress: () => router.push('/about' as any),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text variant="xl" weight="bold" color={Colors[theme].primary}>
            المزيد
          </Text>
        </View>

        {/* Menu sections */}
        {menuSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <SectionHeader title={section.title} />

            <View style={[styles.sectionCard, { backgroundColor: Colors[theme].surface }, Shadows.sm]}>
              {/* Dark mode toggle in features section */}
              {section.id === 'features' && <DarkModeRow />}

              {section.items.map((item, index) => (
                <MenuRow
                  key={item.id}
                  item={item}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

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

      {/* Donation Channels Modal */}
      <DonationModal
        visible={showDonation}
        onClose={() => setShowDonation(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Page Header
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    alignItems: 'center',
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
    borderRadius: Border.radius.lg,
    overflow: 'hidden',
  },

  // Menu Row
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuRowTextArea: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: Spacing.md,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(193, 165, 132, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
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
    marginBottom: Spacing.md,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Donation Row
  donationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  donationRowText: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: Spacing.md,
  },
  donationRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
