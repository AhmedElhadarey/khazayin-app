import { DetailHeader } from '@/components/khazain';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
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

export default function ContactScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('البيانات ناقصة', 'يرجى ملء جميع الحقول.');
      return;
    }
    Alert.alert('تم الإرسال', 'سنعود إليك قريباً إن شاء الله.', [
      { text: 'حسناً', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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
            value="+966 11 XXX XXXX"
            icon={<PhoneGlyph />}
          />
          <ActionCard
            title="إرسال بريد إلكتروني"
            value="info@khazain.org"
            icon={<MailGlyph />}
          />
          <Text style={styles.sectionLabel}>تواصل معنا</Text>
          <Field label="الاسم" value={name} onChangeText={setName} placeholder="اسمك الكامل" />
          <Field
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            placeholder="example@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="الرسالة"
            value={message}
            onChangeText={setMessage}
            placeholder="اكتب رسالتك..."
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={[styles.actionCard, KhazainShadows.card]}>
      <View style={styles.actionTile}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionValue}>{value}</Text>
      </View>
    </View>
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
    <View>
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
          multi && { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
        ]}
      />
    </View>
  );
}

function PhoneGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 4c0 8 5 13 13 13l2-3-4-2-2 2c-2-1-4-3-5-5l2-2-2-4-4 1z"
        stroke={KhazainColors.gold300}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Rect x={2} y={4} width={16} height={12} rx={2} stroke={KhazainColors.gold300} strokeWidth={1.5} />
      <Path d="M2 6l8 5 8-5" stroke={KhazainColors.gold300} strokeWidth={1.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  body: {
    paddingHorizontal: 14,
    paddingTop: 4,
    gap: 10,
  },
  actionCard: {
    padding: 14,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  actionValue: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginTop: 2,
    writingDirection: 'ltr',
    textAlign: 'right',
    fontFamily: 'TheSansArabic',
  },
  sectionLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    paddingHorizontal: 4,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldLabel: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginBottom: 6,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldInput: {
    backgroundColor: KhazainColors.cream50,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
    fontSize: 13,
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  submitBtn: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'TheSansArabic',
  },
});
