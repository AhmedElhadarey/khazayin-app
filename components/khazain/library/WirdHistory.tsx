import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { toArabicDigits as toAr } from '@/constants/progress';
import type { HistoryCell, WeekdayCompletion, WirdCellState } from '@/services/wirdHistory';
import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { CHROME_MAX_FONT_SCALE, textStyle } from '@/constants/typography';
import { LIBRARY_CARD_RADIUS, LIBRARY_DESIGN, LIBRARY_SECTION_GAP } from './libraryLayout';

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
    <View style={PHYSICAL_BOX}>
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
              {/* Physical left → right: percentage, bar, label (السبت-first weekday at the right). */}
              <Text style={styles.weekdayPct} maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}>{hasData ? pctLabel(bucket.rate) : '—'}</Text>
              <View style={styles.barTrack}>
                {hasData ? (
                  <View style={[styles.barFill, { width: `${Math.round(bucket.rate * 100)}%` }]} />
                ) : null}
              </View>
              <Text style={styles.weekdayLabel} maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}>{label}</Text>
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
              <Text style={styles.headerCell} maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}>{WEEKDAYS_AR[wd]}</Text>
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
        {/* Physical left → right: reading order runs right to left, so the
            first entry (مكتمل) is the rightmost. */}
        <View style={styles.legendRow}>
          <LegendItem state="no-data" label="لا بيانات" />
          <LegendItem state="missed" label="غير مكتمل" />
          <LegendItem state="completed" label="مكتمل" />
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
          <Text style={styles.cellDay}>
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
    // Physical left → right: label, then the swatch it names.
    <View style={styles.legendItem}>
      <Text style={styles.legendLabel}>{label}</Text>
      <View style={[styles.legendSwatch, cellStyleFor(state)]}>
        {state === 'completed' ? <Text style={styles.legendCheck}>✓</Text> : null}
      </View>
    </View>
  );
}

// No frame covers the history view; its geometry is the Library contract
// (16pt side margin, the shared card radius, 8pt buttons, palette borders).
const styles = StyleSheet.create({
  emptyCard: {
    ...PHYSICAL_BOX,
    marginHorizontal: LIBRARY_DESIGN.sideMargin,
    marginBottom: LIBRARY_SECTION_GAP,
    padding: 20,
    borderRadius: LIBRARY_CARD_RADIUS,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
    alignItems: 'stretch',
    gap: 8,
  },
  emptyTitle: textStyle('sectionTitle', { color: KhazainColors.navy800, textAlign: 'center' }),
  emptyBody: textStyle('caption', { color: KhazainColors.ink500, textAlign: 'center' }),
  sectionLabel: {
    paddingHorizontal: LIBRARY_DESIGN.sideMargin,
    paddingBottom: 8,
    marginTop: 4,
    ...textStyle('cardTitle', { color: KhazainColors.ink900 }),
  },
  card: {
    ...PHYSICAL_BOX,
    marginHorizontal: LIBRARY_DESIGN.sideMargin,
    marginBottom: LIBRARY_SECTION_GAP,
    padding: 14,
    borderRadius: LIBRARY_CARD_RADIUS,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
  },
  weekdayRow: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  weekdayPct: {
    width: 44,
    ...textStyle('label', { color: KhazainColors.navy800, textAlign: 'left' }),
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: KhazainColors.hairline,
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    right: 0, // the track inherits ltr from weekdayRow (it is not pinned itself), so this is the physical right
    top: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: KhazainColors.goldAccent,
  },
  weekdayLabel: {
    width: 56,
    ...textStyle('label', { color: KhazainColors.ink700 }),
  },
  gridRow: {
    ...PHYSICAL_ROW,
    gap: 4,
    marginBottom: 4,
  },
  headerCellWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerCell: textStyle('labelSmall', { color: KhazainColors.ink500, textAlign: 'center' }),
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
    backgroundColor: KhazainColors.goldAccent,
  },
  cellMissed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
  },
  // Hollow, fainter outline than `missed`: no fill, so the digit keeps ink500 contrast.
  cellNoData: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: KhazainColors.hairlineFaint,
  },
  cellCheck: {
    // No fontFamily: U+2713 is not in Noto Sans Arabic, so the glyph falls back to the system face, where weight applies.
    fontWeight: '700', // fontweight-ok: check glyph in the system fallback face, not a registered family
    fontSize: 13,
    color: KhazainColors.pageBg,
    writingDirection: 'rtl',
  },
  cellDay: textStyle('labelSmall', { color: KhazainColors.ink500, textAlign: 'center' }),
  legendRow: {
    ...PHYSICAL_ROW,
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: KhazainColors.hairline,
  },
  legendItem: {
    ...PHYSICAL_ROW,
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
    // No fontFamily: U+2713 is not in Noto Sans Arabic, so the glyph falls back to the system face, where weight applies.
    fontWeight: '700', // fontweight-ok: check glyph in the system fallback face, not a registered family
    fontSize: 10,
    color: KhazainColors.pageBg,
    writingDirection: 'rtl',
  },
  legendLabel: textStyle('label', { color: KhazainColors.ink500 }),
  showMoreBtn: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: KhazainColors.iconChipBg,
  },
  showMoreLabel: textStyle('cardTitle', { color: KhazainColors.navy800 }),
});
