import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { toArabicDigits as toAr } from '@/constants/progress';
import type { HistoryCell, WeekdayCompletion, WirdCellState } from '@/services/wirdHistory';

/**
 * Wird completion-history view (US5). Presentational only — the screen owns the
 * DB read (`progressRepo.dayCompletionsInRange`) and the `services/wirdHistory`
 * derivation, then passes the two views down.
 *
 *  - PRIMARY: `byWeekday` — completion rate per day of the week, so the "I
 *    always miss Thursdays" pattern is legible without hunting a calendar.
 *  - SECONDARY: `weeks` — a Saturday-first calendar grid.
 *
 * Colour is never the sole signal (WCAG 1.4.1): completed = filled + ✓ glyph,
 * missed = neutral outline, no-data = faint hollow. Missed uses a calm neutral,
 * never alarm-red — a wall of red on worship reads as shaming.
 */

// Saturday-first weekday labels: index 0 = السبت … 6 = الجمعة.
const WEEKDAYS_AR: readonly string[] = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
];

// Gregorian month names (local_day is Gregorian). Index = month number 1..12.
const MONTHS_AR: readonly string[] = [
  '',
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const STATE_LABEL: Record<WirdCellState, string> = {
  completed: 'مكتمل',
  missed: 'غير مكتمل',
  'no-data': 'لا توجد بيانات',
};

// Columns render left→right. Following the CustomTabBar precedent (the first
// JSX child lands on the left), we emit Friday→Saturday so السبت is RIGHTMOST —
// never relying on flexDirection RTL auto-flip. Column indices are the same
// Saturday-first indices used by `services/wirdHistory` (0=Sat..6=Fri).
const COLUMN_ORDER: readonly number[] = [6, 5, 4, 3, 2, 1, 0];

function pctLabel(rate: number): string {
  return `${toAr(Math.round(rate * 100))}٪`;
}

/** Build the Arabic accessibility label for a real cell from date parts (no Intl). */
function cellAccessibilityLabel(cell: HistoryCell): string {
  if (cell.localDay === null) return '';
  const [, m, d] = cell.localDay.split('-').map(Number);
  const day = toAr(d);
  const month = MONTHS_AR[m] ?? '';
  const weekday = WEEKDAYS_AR[cell.weekday] ?? '';
  return `${weekday} ${day} ${month}، ${STATE_LABEL[cell.state]}`;
}

export function WirdHistory({
  byWeekday,
  weeks,
  hasHistory,
  onShowMore,
  showMoreLabel = 'عرض المزيد',
}: {
  byWeekday: WeekdayCompletion[];
  weeks: HistoryCell[][];
  hasHistory: boolean;
  onShowMore?: () => void;
  showMoreLabel?: string;
}) {
  if (!hasHistory) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>لا يوجد سجل قراءة بعد</Text>
        <Text style={styles.emptyBody}>
          ابدأ وردك اليومي وسيظهر هنا سجل التزامك يومًا بيوم.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* PRIMARY — completion rate by weekday (vertical list; RTL-safe). */}
      <Text style={styles.sectionLabel}>نسبة الإكمال حسب اليوم</Text>
      <View style={styles.card}>
        {byWeekday.map((bucket, idx) => {
          const label = WEEKDAYS_AR[idx];
          const hasData = bucket.total > 0;
          const a11y = hasData
            ? `${label}: ${pctLabel(bucket.rate)} اكتمال، ${toAr(bucket.completed)} من ${toAr(bucket.total)}`
            : `${label}: لا توجد بيانات`;
          return (
            <View
              key={label}
              style={styles.weekdayRow}
              accessible
              accessibilityLabel={a11y}
            >
              {/* first child = leftmost: percentage. Then bar. Then label (rightmost). */}
              <Text style={styles.weekdayPct}>{hasData ? pctLabel(bucket.rate) : '—'}</Text>
              <View style={styles.barTrack}>
                {hasData ? (
                  <View style={[styles.barFill, { width: `${Math.round(bucket.rate * 100)}%` }]} />
                ) : null}
              </View>
              <Text style={styles.weekdayLabel}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* SECONDARY — Saturday-first calendar grid. */}
      <Text style={styles.sectionLabel}>التقويم</Text>
      <View style={styles.card}>
        {/* Header: Friday→Saturday left→right, so السبت is rightmost. */}
        <View style={styles.gridRow}>
          {COLUMN_ORDER.map((wd) => (
            <View key={wd} style={styles.headerCellWrap}>
              <Text style={styles.headerCell}>{WEEKDAYS_AR[wd]}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={week[0]?.localDay ?? `w${wi}`} style={styles.gridRow}>
            {COLUMN_ORDER.map((wd) => {
              const cell = week[wd];
              return <GridCell key={wd} cell={cell} />;
            })}
          </View>
        ))}
        {/* Legend — the greyscale key. */}
        <View style={styles.legendRow}>
          <LegendItem state="completed" label="مكتمل" />
          <LegendItem state="missed" label="غير مكتمل" />
          <LegendItem state="no-data" label="لا بيانات" />
        </View>
      </View>

      {onShowMore ? (
        <Pressable
          onPress={onShowMore}
          accessibilityRole="button"
          accessibilityLabel={showMoreLabel}
          style={({ pressed }) => [styles.showMoreBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.showMoreLabel}>{showMoreLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function GridCell({ cell }: { cell: HistoryCell | undefined }) {
  // Pad cell (partial week) — an empty spacer, hidden from assistive tech.
  if (!cell || cell.localDay === null) {
    return <View style={styles.cellWrap} importantForAccessibility="no" accessibilityElementsHidden />;
  }
  const [, , d] = cell.localDay.split('-').map(Number);
  return (
    <View style={styles.cellWrap} accessible accessibilityLabel={cellAccessibilityLabel(cell)}>
      <View style={[styles.cell, cellStyleFor(cell.state)]}>
        {cell.state === 'completed' ? (
          <Text style={styles.cellCheck}>✓</Text>
        ) : (
          <Text style={[styles.cellDay, cell.state === 'no-data' && styles.cellDayFaint]}>
            {toAr(d)}
          </Text>
        )}
      </View>
    </View>
  );
}

function cellStyleFor(state: WirdCellState) {
  if (state === 'completed') return styles.cellCompleted;
  if (state === 'missed') return styles.cellMissed;
  return styles.cellNoData;
}

function LegendItem({ state, label }: { state: WirdCellState; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, cellStyleFor(state)]}>
        {state === 'completed' ? <Text style={styles.legendCheck}>✓</Text> : null}
      </View>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const CARD_BORDER = 'rgba(141,107,52,0.1)';
const OUTLINE = 'rgba(141,107,52,0.35)';

const styles = StyleSheet.create({
  emptyCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 20,
    borderRadius: 16,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionLabel: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    marginTop: 4,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  weekdayPct: {
    width: 44,
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '700',
    color: KhazainColors.navy800,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: KhazainColors.cream100,
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    right: 0, // fills from the right (RTL)
    top: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: KhazainColors.gold500,
  },
  weekdayLabel: {
    width: 56,
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink700,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  headerCellWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerCell: {
    fontFamily: 'TheSansArabic',
    fontSize: 10,
    color: KhazainColors.ink400,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cellWrap: {
    flex: 1,
    aspectRatio: 1,
  },
  cell: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCompleted: {
    backgroundColor: KhazainColors.gold500,
  },
  cellMissed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: OUTLINE,
  },
  cellNoData: {
    backgroundColor: 'rgba(141,107,52,0.05)',
  },
  cellCheck: {
    fontSize: 13,
    fontWeight: '700',
    color: KhazainColors.cream50,
   writingDirection: 'rtl',},
  cellDay: {
    fontFamily: 'TheSansArabic',
    fontSize: 10,
    color: KhazainColors.ink500,
   writingDirection: 'rtl',},
  cellDayFaint: {
    color: 'rgba(152,134,113,0.5)',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCheck: {
    fontSize: 9,
    fontWeight: '700',
    color: KhazainColors.cream50,
   writingDirection: 'rtl',},
  legendLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
  },
  showMoreBtn: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: KhazainColors.cream100,
  },
  showMoreLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '600',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
});
