import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoundationMark } from '@/components/khazain/home/FoundationMark';
import { Wordmark } from '@/components/khazain/primitives';
import { KhazainColors } from '@/constants/theme';

/**
 * Onboarding step 0 (track 003, US1): foundation identity + mission.
 * The real emblem + Wordmark + a concise Arabic mission statement, all RTL.
 * Purely presentational.
 *
 * This drew `LogoBadge` — a generic octagon with a "خر" monogram in Amiri,
 * not the foundation's mark. The home header has always rendered the real
 * asset via `FoundationMark`, so the first screen of the app was the one place
 * showing a placeholder logo. Sized on the shield's natural ~0.72:1 aspect
 * rather than forced square.
 */
export function WelcomeStep(): React.ReactElement {
  return (
    <LinearGradient
      colors={[KhazainColors.cream50, KhazainColors.cream100, KhazainColors.cream200]}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.identity}>
        <FoundationMark width={52} height={72} />
        <View style={styles.wordmarkWrap}>
          <Wordmark size={26} color={KhazainColors.navy900} />
        </View>
      </View>

      <Text style={styles.mission}>
        منصّتك للقرآن الكريم بالقراءات والروايات، ومكتبة العلماء والكتب والدروس،
        وتصاميم الدعوة — كل ذلك في مكان واحد.
      </Text>

        <Text style={styles.hint}>لنُهيّئ التطبيق على ذوقك في خطوات قصيرة.</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  // Scrolls rather than centres-and-overflows. At a large system font scale the
  // uncapped body text makes this step taller than the screen, and a flex:1 box
  // with `justifyContent: 'center'` spills its content BOTH ways — on a Galaxy
  // A30 at font_scale 1.7 the brand mark floated up over the status bar and the
  // hint was clipped behind the footer button. `flexGrow: 1` keeps the centred
  // look whenever the content does fit.
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
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
