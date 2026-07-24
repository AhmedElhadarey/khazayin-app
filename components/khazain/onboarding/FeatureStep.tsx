import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CrownBookArt, RehlArt, ScrollArt } from '@/components/khazain/art';
import { BellIcon } from '@/components/khazain/icons';
import { KhazainColors } from '@/constants/theme';

export type FeatureStepContent = {
  key: string;
  illustration: React.ReactNode;
  title: string;
  description: string;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  art: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KhazainColors.iconChipBg,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  description: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    lineHeight: 28,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});

/**
 * Generic feature-education step for onboarding (track 003): a centered
 * illustration, an Arabic title, and a short description. Purely presentational;
 * content is supplied via `FEATURE_STEPS`. RTL throughout.
 */
export function FeatureStep({
  illustration,
  title,
  description,
}: Omit<FeatureStepContent, 'key'>): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.art}>{illustration}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

/**
 * The four feature-showcase screens, in flow order. Illustrations reuse the
 * existing Khazain art pieces / icons so no new assets are introduced.
 */
export const FEATURE_STEPS: readonly FeatureStepContent[] = [
  {
    key: 'quran',
    illustration: <RehlArt width={94} height={104} />,
    title: 'القرآن الكريم بين يديك',
    description:
      'اقرأ المصحف الشريف، وبدّل بين القراءات والروايات، واستمع بصوت قارئك المفضّل.',
  },
  {
    key: 'wird',
    illustration: (
      <View style={styles.glyphCircle}>
        <BellIcon size={56} color={KhazainColors.navy800} />
      </View>
    ),
    title: 'وِردك اليومي',
    description:
      'حدّد وِردك اليومي وفعّل التذكير، لتحافظ على قراءتك وتتابع إنجازك وسلسلتك يوماً بعد يوم.',
  },
  {
    key: 'library',
    illustration: <ScrollArt width={90} height={108} />,
    title: 'مكتبتك وملاحظاتك',
    description:
      'احفظ ما تحب في مكتبتك الشخصية، ودوّن ملاحظاتك على ما تقرأ لتعود إليها متى شئت.',
  },
  {
    key: 'scholars',
    illustration: <CrownBookArt width={132} height={82} />,
    title: 'العلماء والكتب والتصاميم',
    description:
      'تصفّح العلماء وكتبهم، واستكشف تصاميم الدعوة الجاهزة لمشاركتها مع غيرك.',
  },
];
