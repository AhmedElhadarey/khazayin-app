import { DetailHeader } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

// Real phone / email values to be supplied by the foundation. Defaults match
// the Figma mock.
const CONTACT_PHONE = '01228888888';
const CONTACT_EMAIL = 'khazayin@email.com';

export default function ContactScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const open = async (url: string, label: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      await Linking.openURL(url);
    } catch {
      Alert.alert(label, 'تعذّر فتح التطبيق على هذا الجهاز.');
    }
  };

  const onWhatsApp = () => open(`https://wa.me/${CONTACT_PHONE}`, 'واتساب');
  const onEmail = () => open(`mailto:${CONTACT_EMAIL}`, 'البريد');

  const submit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('البيانات ناقصة', 'يرجى ملء جميع الحقول.');
      return;
    }
    // INTENTIONAL PLACEHOLDER (T7.8 / D3): the form does not yet transmit the
    // message anywhere — it validates and confirms only. Wire to the foundation's
    // email/Telegram/endpoint when the backend channel is provided. Until then
    // this is a known stub, not a bug.
    Alert.alert('تم الإرسال', 'سنعود إليك قريباً إن شاء الله.', [
      { text: 'حسناً', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <DetailHeader title="تواصل معنا" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ActionCard
            title="إرسال رسالة"
            value={CONTACT_PHONE}
            icon={<WhatsappGlyph />}
            onPress={onWhatsApp}
          />
          <ActionCard
            title="إرسال بريد اليكتروني"
            value={CONTACT_EMAIL}
            icon={<MailGlyph />}
            onPress={onEmail}
          />
          {/* Form is wrapped in a single large card per Figma. */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>تواصل معنا</Text>
            <Field
              label="الاسم"
              value={name}
              onChangeText={setName}
              placeholder="اكتب اسمك"
            />
            <Field
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="الرسالة"
              value={message}
              onChangeText={setMessage}
              placeholder="اكتب رسالتك هنا..."
              multi
            />
            <Pressable
              onPress={submit}
              style={({ pressed }) => [
                styles.submitBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.submitLabel}>إرسال الرسالة</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionCard({
  title,
  value,
  icon,
  onPress,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      {/* Light cream disc, anchored to the right (RTL start) so the visual
          order is deterministic across platforms regardless of flexDirection
          flipping. */}
      <View style={styles.actionTile}>{icon}</View>
      <View style={styles.actionTextCol}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionValue}>{value}</Text>
      </View>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multi,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multi?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={KhazainColors.ink400}
        textAlign="right"
        multiline={multi}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.fieldInput,
          multi && {
            minHeight: 110,
            textAlignVertical: 'top',
            paddingTop: 14,
          },
        ]}
      />
    </View>
  );
}

function WhatsappGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 2.5a7.5 7.5 0 00-6.5 11.2L2.5 17.5l3.9-1a7.5 7.5 0 103.6-14zm-2.7 4.7c.3 0 .6.3.9.7l.4 1.4-.8.8c.4 1 1.4 2 2.4 2.4l.8-.8 1.4.4c.4.3.7.6.7 1 0 .9-.9 1.7-1.8 1.7-2.7 0-5.4-2.7-5.4-5.4 0-1 .8-1.8 1.7-1.8z"
        fill={KhazainColors.navy800}
      />
    </Svg>
  );
}

function MailGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Rect
        x={2.5}
        y={4.5}
        width={15}
        height={11}
        rx={2}
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
      />
      <Path d="M3 6.5l7 4.5 7-4.5" stroke={KhazainColors.navy800} strokeWidth={1.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  body: {
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 12,
  },
  // Action cards: cream card with a cream-tinted disc on the RTL-start side
  // (right edge) and a two-line text block to its left.
  actionCard: {
    position: 'relative',
    backgroundColor: KhazainColors.cream50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.10)',
    minHeight: 70,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 70, // disc 46 + 12 inset + 12 gap
    justifyContent: 'center',
  },
  actionTile: {
    position: 'absolute',
    right: 12,
    top: '50%',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: KhazainColors.iconChipBg,
    borderWidth: 1,
    borderColor: 'rgba(26,53,87,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -23 }],
  },
  actionTextCol: {
    gap: 2,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  actionValue: {
    fontSize: 12,
    color: KhazainColors.ink500,
    marginTop: 2,
    writingDirection: 'ltr',
    textAlign: 'right',
    fontFamily: 'TheSansArabic',
  },
  // Single form card containing the title, three fields and the submit btn.
  formCard: {
    marginTop: 6,
    padding: 16,
    paddingTop: 18,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.10)',
    gap: 12,
  },
  formTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: KhazainColors.ink700,
    fontFamily: 'TheSansArabic',
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldInput: {
    backgroundColor: KhazainColors.cream100,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    fontSize: 13,
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  submitBtn: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
});
