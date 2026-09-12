import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/khazain/primitives';
import { ONBOARDING_CHANNELS } from '@/constants/settings';
import { KhazainColors } from '@/constants/theme';

/**
 * Onboarding step 3 (track 003, US4): optional community-channel promotion.
 * Telegram + YouTube CTAs open externally with an Arabic alert fallback
 * (mirrors `app/share-sheet.tsx`). Declining never blocks completion — the
 * footer "finish" control is independent of any CTA interaction.
 */
export function ChannelsStep(): React.ReactElement {
  const openExternal = async (url: string, channelName: string): Promise<void> => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      await Linking.openURL(url);
    } catch {
      Alert.alert(channelName, 'تعذّر فتح الرابط على هذا الجهاز.');
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>انضمّ إلى مجتمع المؤسسة</Text>
      <Text style={styles.subtitle}>
        تابِع قنواتنا لتصلك الإصدارات والدروس الجديدة أولاً بأول. (اختياري)
      </Text>

      <View style={styles.ctaCol}>
        <PillButton
          label="انضمّ إلى قناة تليجرام"
          variant="navy"
          onPress={() => openExternal(ONBOARDING_CHANNELS.telegramUrl, 'تليجرام')}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
        />
        <PillButton
          label="انضمّ إلى قناة واتساب"
          variant="cream"
          onPress={() => openExternal(ONBOARDING_CHANNELS.whatsappUrl, 'واتساب')}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
        />
        <PillButton
          label="اشترك في قناة يوتيوب"
          variant="cream"
          onPress={() => openExternal(ONBOARDING_CHANNELS.youtubeUrl, 'يوتيوب')}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Scrolls rather than centres-and-overflows. At a large system font scale the
  // uncapped body text makes this step taller than the screen, and a flex:1 box
  // with `justifyContent: 'center'` spills its content BOTH ways — on a Galaxy
  // A30 at font_scale 1.7 the brand mark floated up over the status bar and the
  // hint was clipped behind the footer button. `flexGrow: 1` keeps the centred
  // look whenever the content does fit.
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'center', gap: 8 },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    lineHeight: 26,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaCol: { gap: 12 },
  cta: { width: '100%' },
  ctaLabel: { fontSize: 15 },
});
