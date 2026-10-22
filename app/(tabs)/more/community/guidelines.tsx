import { InlineHeader } from '@/components/khazain';
import { PreviewBanner } from '@/components/khazain/community/PreviewBanner';
import { HeaderArt } from '@/components/khazain/patterns';
import { COMMUNITY_GUIDELINES, GUIDELINES_TITLE } from '@/constants/communityGuidelines';
import { PHYSICAL_BOX, RTL_TEXT } from '@/constants/layout';
import { toArabicDigits } from '@/constants/progress';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useCommunityGuard } from '@/hooks/useCommunityGuard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** The community guidelines (design §7.4). Reachable from the hub intro and from Settings. */
export default function CommunityGuidelinesScreen() {
  const allowed = useCommunityGuard('intro');
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  if (!allowed) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <InlineHeader title={GUIDELINES_TITLE} onBack={() => router.back()} style={columnStyle} />
      <ScrollView contentContainerStyle={[styles.content, columnStyle]} showsVerticalScrollIndicator={false}>
        <PreviewBanner />
        <View style={styles.card}>
          {COMMUNITY_GUIDELINES.map((line, i) => (
            <Text key={line} style={styles.line}>
              {`${toArabicDigits(i + 1)}. ${line}`}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 60, gap: 12 },
  card: {
    ...PHYSICAL_BOX,
    padding: 16,
    gap: 12,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  line: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.ink900 }) },
});
