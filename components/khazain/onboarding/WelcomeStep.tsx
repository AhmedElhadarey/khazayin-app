import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LogoBadge, Wordmark } from '@/components/khazain/primitives';
import { KhazainColors } from '@/constants/theme';

/**
 * Onboarding step 0 (track 003, US1): foundation identity + mission.
 * LogoBadge + Wordmark + a concise Arabic mission statement, all RTL.
 * Purely presentational.
 */
export function WelcomeStep(): React.ReactElement {
  return (
    <LinearGradient
      colors={[KhazainColors.cream50, KhazainColors.cream100, KhazainColors.cream200]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={styles.identity}>
        <LogoBadge size={72} />
        <View style={styles.wordmarkWrap}>
          <Wordmark size={26} color={KhazainColors.navy900} />
        </View>
      </View>

      <Text style={styles.mission}>
        منصّتك للقرآن الكريم بالقراءات والروايات، ومكتبة العلماء والكتب والدروس،
        وتصاميم الدعوة — كل ذلك في مكان واحد.
      </Text>

      <Text style={styles.hint}>لنُهيّئ التطبيق على ذوقك في خطوات قصيرة.</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 24,
  },
  identity: {
    alignItems: 'center',
    gap: 16,
  },
  wordmarkWrap: {
    alignItems: 'center',
  },
  mission: {
    fontFamily: 'Amiri',
    fontSize: 19,
    lineHeight: 34,
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
