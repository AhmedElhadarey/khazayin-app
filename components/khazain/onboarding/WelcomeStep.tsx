import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoundationMark } from '@/components/khazain/home/FoundationMark';
import { Wordmark } from '@/components/khazain/primitives';
import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

/** The four "how the app works" highlights, folded in from the old feature screens. */
export const WELCOME_HIGHLIGHTS: readonly { key: string; text: string }[] = Object.freeze([
  { key: 'quran', text: 'القرآن الكريم بالقراءات والروايات وبصوت قارئك المفضّل' },
  { key: 'wird', text: 'وِردك اليومي مع التذكير ومتابعة إنجازك' },
  { key: 'library', text: 'مكتبتك الشخصية وملاحظاتك على ما تقرأ' },
  { key: 'scholars', text: 'العلماء والكتب وتصاميم الدعوة الجاهزة للمشاركة' },
]);

/**
 * Onboarding step 0 (track 003, US1): foundation identity + mission, then the
 * four feature highlights (`WELCOME_HIGHLIGHTS`) that used to be their own
 * screens. The real emblem + Wordmark + a concise Arabic mission statement,
 * all RTL. Purely presentational.
 *
 * This drew `LogoBadge` — a generic octagon with a "خر" monogram in Amiri,
 * not the foundation's mark. The home header has always rendered the real
 * asset via `FoundationMark`, so the first screen of the app was the one place
 * showing a placeholder logo. Sized on the shield's natural ~0.72:1 aspect
 * rather than forced square.
 */
export function WelcomeStep(): React.ReactElement {
  const { columnStyle } = useResponsiveLayout();
  return (
    <LinearGradient
      colors={[KhazainColors.cream50, KhazainColors.cream100, KhazainColors.cream200]}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[styles.container, columnStyle]}
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

        <View style={styles.highlights} accessibilityRole="list">
          {WELCOME_HIGHLIGHTS.map((h) => (
            <View key={h.key} style={styles.highlightRow}>
              {/* Physical left → right: text, bullet — the bullet leads at the right edge. */}
              <Text style={styles.highlightText}>{h.text}</Text>
              <View style={styles.bullet} />
            </View>
          ))}
        </View>

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
  mission: textStyle('bodyLarge', { color: KhazainColors.ink700, textAlign: 'center' }),
  highlights: {
    alignSelf: 'stretch',
    gap: 10,
  },
  highlightRow: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 10,
  },
  highlightText: {
    ...textStyle('body', { color: KhazainColors.ink700 }),
    flex: 1,
  },
  bullet: {
    width: 7,
    height: 7,
    backgroundColor: KhazainColors.goldAccent,
    transform: [{ rotate: '45deg' }],
  },
  hint: textStyle('bodyCompact', { color: KhazainColors.inkSubtle, textAlign: 'center' }),
});
