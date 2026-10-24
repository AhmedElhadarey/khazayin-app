import { InlineHeader, ListRowCard } from '@/components/khazain';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { WhatsappRingGlyph } from '@/components/khazain/icons/WhatsappRingGlyph';
import { WHATSAPP_RING } from '@/components/khazain/icons/whatsappRing';
import { CARD_DENSITY } from '@/constants/layout';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { FOUNDATION_CONTACT } from '@/constants/foundationContact';
import { KhazainColors } from '@/constants/theme';
import { contactRowsFor } from '@/services/foundationLinks';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { showNotice } from '@/services/notice';

// Contact values come from constants/foundationContact.ts. There is no
// in-app form: nothing here transmits a message, so the screen only offers
// links that open the user's own WhatsApp / mail app. A value the Foundation
// has not confirmed is hidden in production and shown (inert) in __DEV__.

/** `Icon` inside `DIV-66` is 21 x 20; both chips draw at that size. */
const CONTACT_GLYPH = 20;

const ROW_COPY = {
  whatsapp: { title: 'إرسال رسالة', label: 'واتساب' },
  email: { title: 'إرسال بريد اليكتروني', label: 'البريد' },
} as const;

export default function ContactScreen() {
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();

  const open = async (url: string, label: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      await Linking.openURL(url);
    } catch {
      showNotice(label, 'تعذّر فتح التطبيق على هذا الجهاز.');
    }
  };

  const { rows, showChannelFallback } = contactRowsFor(__DEV__);

  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt corners="single" bandHeight={headerBandHeight(insets.top, 'inline', fontScale)} />
      <InlineHeader title="تواصل معنا" onBack={() => router.back()} style={columnStyle} />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 24 }, columnStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* `telegramChannels-41` and `contactUs-55` — the same 82pt More row,
            minus the disclosure column: `DIV-42` here is 335 wide where the
            More root's is 359. */}
        {rows.map((row) => {
          const copy = ROW_COPY[row.kind];
          return (
            <ListRowCard
              key={row.kind}
              variant="more"
              chevron={false}
              title={copy.title}
              subtitle={row.subtitle}
              icon={
                row.kind === 'whatsapp' ? (
                  <WhatsappRingGlyph spec={WHATSAPP_RING.contact} />
                ) : (
                  <FigmaIcon name="ContactMail" size={CONTACT_GLYPH} color={KhazainColors.navy800} />
                )
              }
              onPress={() =>
                row.unavailable ? showNotice(copy.label, 'ستُضاف قريبًا') : open(row.url, copy.label)
              }
            />
          );
        })}
        {showChannelFallback ? (
          <ListRowCard
            variant="more"
            chevron={false}
            title="تواصل معنا عبر قناتنا الرسمية"
            subtitle="قناة المؤسسة على تليجرام"
            icon={<FigmaIcon name="MoreTelegram" size={CONTACT_GLYPH} color={KhazainColors.navy800} />}
            onPress={() => open(FOUNDATION_CONTACT.telegramMain, 'تليجرام')}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
});
