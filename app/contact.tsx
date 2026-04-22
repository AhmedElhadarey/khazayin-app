import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Border, Shadows } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── TypeScript Interfaces ───

interface FormField {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
}

// ─── Form Field Component ───

function FormFieldInput({
  field,
  value,
  onChangeText,
}: {
  field: FormField;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const theme = useColorScheme();

  return (
    <View style={styles.fieldContainer}>
      <Text
        variant="sm"
        weight="semiBold"
        color={Colors[theme].text}
        style={styles.fieldLabel}
      >
        {field.label}
      </Text>
      <TextInput
        style={[
          styles.input,
          field.multiline && styles.inputMultiline,
          {
            backgroundColor: Colors[theme].inputBg,
            borderColor: Colors[theme].borderLight,
            color: Colors[theme].text,
          },
        ]}
        placeholder={field.placeholder}
        placeholderTextColor={Colors[theme].textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={field.multiline}
        numberOfLines={field.multiline ? 5 : 1}
        textAlignVertical={field.multiline ? 'top' : 'center'}
        textAlign="right"
        keyboardType={field.keyboardType || 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

// ─── Contact Form Fields ───

const FORM_FIELDS: FormField[] = [
  {
    id: 'name',
    label: 'الاسم',
    placeholder: 'أدخل اسمك الكامل',
  },
  {
    id: 'email',
    label: 'البريد الإلكتروني',
    placeholder: 'أدخل بريدك الإلكتروني',
    keyboardType: 'email-address',
  },
  {
    id: 'message',
    label: 'الرسالة',
    placeholder: 'اكتب رسالتك أو استفسارك هنا...',
    multiline: true,
  },
];

// ─── Main Contact Screen ───

export default function ContactScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال الاسم');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!formData.message.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة الرسالة');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);

    Alert.alert(
      'تم الإرسال',
      'شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن.',
      [{ text: 'حسناً', onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            تواصل معنا
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info text */}
          <View style={[styles.infoCard, { backgroundColor: Colors[theme].surface }, Shadows.sm]}>
            <View style={[styles.infoIconCircle, { backgroundColor: Colors[theme].iconBg }]}>
              <Ionicons name="mail-outline" size={24} color={Colors[theme].secondary} />
            </View>
            <Text
              variant="sm"
              color={Colors[theme].textSecondary}
              align="right"
              style={{ marginTop: Spacing.md, lineHeight: 22 }}
            >
              يسعدنا تواصلكم معنا. يرجى ملء النموذج أدناه وسنقوم
              بالرد عليكم في أقرب وقت ممكن إن شاء الله.
            </Text>
          </View>

          {/* Form fields */}
          <View style={[styles.formCard, { backgroundColor: Colors[theme].surface }, Shadows.sm]}>
            {FORM_FIELDS.map((field) => (
              <FormFieldInput
                key={field.id}
                field={field}
                value={formData[field.id] || ''}
                onChangeText={(text) => updateField(field.id, text)}
              />
            ))}
          </View>

          {/* Submit button */}
          <View style={styles.submitContainer}>
            <Button
              title="إرسال الرسالة"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              size="lg"
              style={styles.submitButton}
            />
          </View>

          {/* Alternative contact info */}
          <View style={[styles.altContactCard, { backgroundColor: Colors[theme].surface }, Shadows.sm]}>
            <Text
              variant="sm"
              weight="semiBold"
              color={Colors[theme].text}
              align="right"
              style={{ marginBottom: Spacing.md }}
            >
              أو تواصل معنا عبر
            </Text>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: Colors[theme].iconBg }]}
                accessibilityRole="button"
                accessibilityLabel="تويتر"
                onPress={() => Alert.alert('قريباً', 'سيتم إضافة الرابط قريباً')}
              >
                <Ionicons name="logo-twitter" size={22} color={Colors[theme].primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: Colors[theme].iconBg }]}
                accessibilityRole="button"
                accessibilityLabel="انستجرام"
                onPress={() => Alert.alert('قريباً', 'سيتم إضافة الرابط قريباً')}
              >
                <Ionicons name="logo-instagram" size={22} color={Colors[theme].primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: Colors[theme].iconBg }]}
                accessibilityRole="button"
                accessibilityLabel="البريد الإلكتروني"
                onPress={() => Alert.alert('قريباً', 'سيتم إضافة الرابط قريباً')}
              >
                <Ionicons name="mail" size={22} color={Colors[theme].primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
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

  // Info card
  infoCard: {
    borderRadius: Border.radius.lg,
    padding: Spacing.lg,
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form card
  formCard: {
    borderRadius: Border.radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // Form field
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Border.radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    writingDirection: 'rtl',
  },
  inputMultiline: {
    height: 120,
    paddingTop: Spacing.md,
  },

  // Submit
  submitContainer: {
    marginBottom: Spacing.xl,
  },
  submitButton: {
    width: '100%',
  },

  // Alt contact
  altContactCard: {
    borderRadius: Border.radius.lg,
    padding: Spacing.lg,
    alignItems: 'flex-end',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
