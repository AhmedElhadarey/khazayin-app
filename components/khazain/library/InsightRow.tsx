import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { PHYSICAL_ROW } from '@/constants/layout';
import { toArabicDigits as toAr } from '@/constants/progress';
import { textStyle } from '@/constants/typography';
import { LIBRARY_CARD_RADIUS, LIBRARY_DESIGN, LIBRARY_SECTION_GAP } from './libraryLayout';

function formatDeltaPct(delta: number): string {
  if (!Number.isFinite(delta)) return '٠٪';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${toAr(Math.abs(Math.round(delta)))}٪`;
}

/**
 * Three side-by-side insight chips below the StatCards row.
 * - أطول سلسلة — longest streak ever
 * - أعلى يوم    — best wird day
 * - هذا الشهر   — month-over-month delta percentage
 */
export function InsightRow({
  longestStreak,
  bestDayPages,
  monthDeltaPct,
}: {
  longestStreak: number;
  bestDayPages: number;
  monthDeltaPct: number;
}) {
  return (
    // Physical left → right: هذا الشهر، أعلى يوم، أطول سلسلة (first read at the right).
    <View style={styles.row}>
      <Chip
        title="هذا الشهر"
        value={formatDeltaPct(monthDeltaPct)}
        accent={monthDeltaPct >= 0}
      />
      <Chip title="أعلى يوم" value={`${toAr(bestDayPages)} صفحة`} />
      <Chip title="أطول سلسلة" value={`${toAr(longestStreak)} يوم`} />
    </View>
  );
}

function Chip({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipTitle}>{title}</Text>
      <Text style={[styles.chipValue, accent === false && styles.chipNegative]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    gap: 8,
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    marginBottom: LIBRARY_SECTION_GAP,
  },
  chip: {
    flex: 1,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
    borderRadius: LIBRARY_CARD_RADIUS,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  chipTitle: textStyle('label', { color: KhazainColors.ink500, textAlign: 'center' }),
  chipValue: textStyle('cardTitle', { color: KhazainColors.navy800, textAlign: 'center' }),
  chipNegative: {
    color: KhazainColors.ink500,
  },
});
