import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.container}>
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
          label="اشترك في قناة يوتيوب"
          variant="cream"
          onPress={() => openExternal(ONBOARDING_CHANNELS.youtubeUrl, 'يوتيوب')}
          style={styles.cta}
          labelStyle={styles.ctaLabel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 8 },
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
