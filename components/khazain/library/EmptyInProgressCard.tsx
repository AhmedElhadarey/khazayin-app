import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { LIST_CARD } from './libraryLayout';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
      {/* Physical left → right: action, text, cover. */}
      {onBrowse ? (
        <Pressable
          onPress={onBrowse}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.ctaLabel}>تصفّح المحاضرات</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>لا توجد محاضرة قيد الاستماع</Text>
        <Text style={styles.subtitle}>
          ابدأ بمحاضرة من قسم العلماء وستظهر هنا للمتابعة لاحقًا.
        </Text>
      </View>
      <View style={styles.cover}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 12V9a8 8 0 0116 0v3M4 12v4a2 2 0 002 2h2v-7H4zm16 0v4a2 2 0 01-2 2h-2v-7h4z"
            stroke={KhazainColors.gold500}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: LIST_CARD.radius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineFaint,
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: KhazainColors.gold400,
    alignItems: 'center',
    justifyContent: 'center',
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
