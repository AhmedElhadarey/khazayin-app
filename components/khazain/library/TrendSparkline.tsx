import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import type { TrendPoint } from '@/db/types';

const HEIGHT = 70;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 6;

/**
 * 28-day pages-per-day sparkline. Each day is a slim bar; optional dashed
 * line marks the wird target for visual reference.
 */
export function TrendSparkline({
  points,
  wirdTarget,
  width = 320,
  emptyLabel = 'لا توجد بيانات قراءة بعد',
}: {
  points: TrendPoint[];
  wirdTarget?: number;
  width?: number;
  emptyLabel?: string;
}) {
  const hasData = points.some((p) => p.pagesRead > 0);
  if (!hasData) {
    return (
      <View style={[styles.empty, { width, height: HEIGHT }]}>
        <Text style={styles.emptyLabel}>{emptyLabel}</Text>
      </View>
    );
  }

  const max = Math.max(
    1,
    wirdTarget ?? 0,
    ...points.map((p) => p.pagesRead),
  );
  const chartH = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const gap = 2;
  const barWidth = Math.max(2, (width - gap * (points.length - 1)) / points.length);
  const targetY = wirdTarget
    ? PADDING_TOP + chartH - (wirdTarget / max) * chartH
    : null;

  return (
    <View style={{ width, height: HEIGHT }}>
      <Svg width={width} height={HEIGHT}>
        {targetY !== null ? (
          <Line
            x1={0}
            x2={width}
            y1={targetY}
            y2={targetY}
            stroke={KhazainColors.gold400}
            strokeDasharray="4 3"
            strokeWidth={1}
            opacity={0.6}
          />
        ) : null}
        {points.map((p, i) => {
          const h = (p.pagesRead / max) * chartH;
          const x = i * (barWidth + gap);
          const y = PADDING_TOP + chartH - h;
          const filled = p.pagesRead > 0;
          return (
            <Rect
              key={p.localDay}
              x={x}
              y={filled ? y : PADDING_TOP + chartH - 1}
              width={barWidth}
              height={filled ? Math.max(1, h) : 1}
              rx={1.5}
              fill={
                filled
                  ? wirdTarget && p.pagesRead >= wirdTarget
                    ? KhazainColors.gold500
                    : KhazainColors.navy800
                  : KhazainColors.cream100
              }
              opacity={filled ? 0.85 : 1}
            />
          );
        })}
        <Path
          d={`M0 ${HEIGHT - PADDING_BOTTOM} L${width} ${HEIGHT - PADDING_BOTTOM}`}
          stroke={KhazainColors.cream100}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: KhazainColors.cream100,
    borderRadius: 8,
  },
  emptyLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink400,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
