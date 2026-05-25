import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { toArabicDigits as toAr } from '@/constants/progress';

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
    <View style={styles.row}>
      <Chip title="أطول سلسلة" value={`${toAr(longestStreak)} يوم`} />
      <Chip title="أعلى يوم" value={`${toAr(bestDayPages)} صفحة`} />
      <Chip
        title="هذا الشهر"
        value={formatDeltaPct(monthDeltaPct)}
        accent={monthDeltaPct >= 0}
      />
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
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  chipTitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  chipValue: {
    fontFamily: 'Amiri-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  chipNegative: {
    color: KhazainColors.ink500,
  },
});
