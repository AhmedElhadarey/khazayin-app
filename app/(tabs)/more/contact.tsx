import { InlineHeader, ListRowCard } from '@/components/khazain';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { WhatsappRingGlyph } from '@/components/khazain/icons/WhatsappRingGlyph';
import { WHATSAPP_RING } from '@/components/khazain/icons/whatsappRing';
import { CARD_DENSITY, PHYSICAL_BOX } from '@/constants/layout';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import {
  CONTACT_INCOMPLETE_ALERT,
  CONTACT_SENT_ALERT,
  isContactFormComplete,
} from '@/services/contactForm';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

// Real phone / email values to be supplied by the foundation. Defaults match
// the Figma mock.
const CONTACT_PHONE = '01228888888';
/**
 * The same number as the file states it — node 2548:1631 reads
 * `٠١٢٢٨٨٨٨٨٨٨٨٨٨`. The Latin form above is what `wa.me` needs, so the two
 * cannot be one constant.
 */
const CONTACT_PHONE_AR = '٠١٢٢٨٨٨٨٨٨٨٨٨٨';
const CONTACT_EMAIL = 'khazayin@email.com';

/** `Icon` inside `DIV-66` is 21 x 20; both chips draw at that size. */
const CONTACT_GLYPH = 20;

export default function ContactScreen() {
  const { columnStyle } = useResponsiveLayout();
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
    if (!isContactFormComplete({ name, email, message })) {
      Alert.alert(CONTACT_INCOMPLETE_ALERT.title, CONTACT_INCOMPLETE_ALERT.body);
      return;
    }
    // INTENTIONAL PLACEHOLDER (T7.8 / D3): the form does not yet transmit the
    // message anywhere — it validates and confirms only. Wire to the foundation's
    // email/Telegram/endpoint when the backend channel is provided. Until then
    // this is a known stub, not a bug.
    Alert.alert(CONTACT_SENT_ALERT.title, CONTACT_SENT_ALERT.body, [
      { text: 'حسناً', onPress: () => router.back() },
    ]);
  };

  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt corners="single" bandHeight={headerBandHeight(insets.top, 'inline')} />
      <InlineHeader title="تواصل معنا" onBack={() => router.back()} style={columnStyle} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 }, columnStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* `telegramChannels-41` and `contactUs-55` — the same 82pt More row,
              minus the disclosure column: `DIV-42` here is 335 wide where the
              More root's is 359. */}
          <ListRowCard
            variant="more"
            chevron={false}
            title="إرسال رسالة"
            subtitle={CONTACT_PHONE_AR}
            icon={<WhatsappRingGlyph spec={WHATSAPP_RING.contact} />}
            onPress={onWhatsApp}
          />
          <ListRowCard
            variant="more"
            chevron={false}
            title="إرسال بريد اليكتروني"
            subtitle={CONTACT_EMAIL}
            icon={<FigmaIcon name="ContactMail" size={CONTACT_GLYPH} color={KhazainColors.navy800} />}
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
          // `TEXTAREA` — 311 x 106 at the same radius.
          multi && {
            minHeight: 106,
            textAlignVertical: 'top',
            paddingTop: 12,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    // Each `margin-wrap` is 94 over an 82 card, as on the More root.
    gap: CARD_DENSITY.moreListGap,
  },
  // `DIV-126` — 343 x 446 at radius 16 behind a 1pt `#D9D6D3` hairline, inset
  // 16, and sitting 9 further in than the rows above it.
  //
  // It has **no fill**: its one paint is `visible: false`, so the page ground
  // shows through and the `#FCFAF8` fields read as wells inside it. Drawing the
  // card in `#FCFAF8` instead — which is what the paint says if you do not
  // check whether it is switched on — makes the fields vanish into it.
  formCard: {
    ...PHYSICAL_BOX,
    // `contactUs-55` ends at 269 and `DIV-126` starts at 293, so the gap over
    // the 12 the rows already carry is 12 more.
    marginTop: 12,
    marginHorizontal: 9,
    padding: 16,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    // `DIV-128` ends at 416 and `DIV-133` starts at 432.
    gap: 16,
  },
  // The one place the file sets the body face at 20 — every other title on a
  // More screen is 18 or 14.
  formTitle: {
    ...textStyle('bodyTitle', { color: KhazainColors.inkTitle, textAlign: 'center' }),
    // `DIV-126` starts at 293, the title at 309, and `FORM-127` at 342.
    marginBottom: -4,
  },
  fieldGroup: {
    // `LABEL-129` ends at 362 and `INPUT` starts at 370.
    gap: 8,
  },
  fieldLabel: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  // `INPUT` — 311 x 46 at radius 16. Its stroke is `#FCFAF8`, the same as its
  // fill, so the field reads as a flat well rather than an outlined box; the
  // app had been drawing a visible warm border it does not have.
  fieldInput: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
    minHeight: 46,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  // `BUTTON-143` — 311 x 45 at radius 8, `#184B76`, its label in the body
  // face at 14. Not the 14pt radius and 15pt bold label the app had.
  submitBtn: {
    minHeight: 45,
    borderRadius: 8,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: textStyle('bodyCompact', { color: KhazainColors.cardBg }),
});
