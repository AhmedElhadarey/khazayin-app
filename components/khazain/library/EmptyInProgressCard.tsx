import { READING_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { LatticeDisc } from './LatticeDisc';
import { LIST_CARD } from './libraryLayout';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Empty-state variant of AudioProgressCard. Surfaces when the user has no
 * in-progress lecture (`findInProgress()` returned null).
 */
export function EmptyInProgressCard({
  onBrowse,
}: {
  onBrowse?: () => void;
}) {
  return (
    <View style={styles.card}>
      {/* Reading order (first child at the physical right, and first announced):
          disc, text, then the action at the left. */}
      <LatticeDisc />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>لا توجد محاضرة قيد الاستماع</Text>
        <Text style={styles.subtitle}>
          ابدأ بمحاضرة من قسم العلماء وستظهر هنا للمتابعة لاحقًا.
        </Text>
      </View>
      {onBrowse ? (
        <Pressable
          onPress={onBrowse}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.ctaLabel} numberOfLines={1}>
            تصفّح المحاضرات
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 17,
    paddingHorizontal: 12,
    borderRadius: LIST_CARD.radius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineFaint,
    ...READING_ROW,
    alignItems: 'center',
    gap: 12,
  },
  title: textStyle('cardTitle', { color: KhazainColors.inkHeading }),
  subtitle: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    marginTop: 4,
  },
  cta: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: textStyle('cardTitle', { color: KhazainColors.pageBg }),
});
