import {
  HOME_LIMIT_PHONE,
  HOME_LIMIT_TABLET,
  RECOMMENDATION_COPY,
  RECOMMENDATION_SLOT_HEIGHT,
} from '@/constants/recommendations';
import { PHYSICAL_BOX, READING_ROW, RTL_TEXT } from '@/constants/layout';
import { gridColumns } from '@/constants/responsive';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { sectionState } from '@/services/recommendations/sectionState';
import { recommendationTarget } from '@/services/recommendations/target';
import type { Recommendation } from '@/services/recommendations/types';
import { useRecommendations } from '@/services/recommendations/useRecommendations';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { HomeSectionHeader } from '../home/HomeSectionHeader';
import { SkeletonRibbonList } from '../state/SkeletonRibbon';
import { RecommendationRow } from './RecommendationRow';

const ROW_GAP = 12;

/** One shared screen-reader flag, read by a row at dismiss time. */
function useScreenReaderOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    // A change event is newer than the initial read, so it wins a race.
    let settled = false;
    void AccessibilityInfo.isScreenReaderEnabled().then((v) => {
      if (alive && !settled) setOn(v);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (v) => {
      settled = true;
      setOn(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

// Home's "مقترح لك" section (design §6.5). Always rendered; `sectionState`
// picks the body. Every with-signal state reserves the same `rows x slot +
// gaps` height so the skeleton -> content swap does not move what is below.
// Phones stack up to HOME_LIMIT_PHONE rows; tablets fill READING_ROW rows of
// `gridColumns(width, 340, 2)` columns, the first item at the physical right.
// Tapping a row routes or plays through `recommendationTarget` (§6.6).
export function RecommendedSection() {
  const router = useRouter();
  const { width, isTablet } = useResponsiveLayout();
  const limit = isTablet ? HOME_LIMIT_TABLET : HOME_LIMIT_PHONE;
  const { items, hasSignals, activityResolved, catalogueStatus } = useRecommendations(limit);

  const screenReaderOn = useScreenReaderOn();
  const columns = gridColumns(width, 340, 2);
  const rowCount = Math.ceil(limit / columns);
  const reserved = rowCount * RECOMMENDATION_SLOT_HEIGHT + (rowCount - 1) * ROW_GAP;

  const open = (rec: Recommendation) => {
    const target = recommendationTarget(rec, 'home');
    if (!target) return;
    if (target.kind === 'play') void startLecturePlayback(target.lecture);
    else router.push(target.href as any);
  };

  const lines: Recommendation[][] = [];
  for (let i = 0; i < items.length; i += columns) lines.push(items.slice(i, i + columns));

  const state = sectionState({ hasSignals, activityResolved, catalogueStatus, items });
  let body: React.ReactNode;
  switch (state) {
    case 'skeletonOne':
      body = (
        <SkeletonRibbonList count={1} gap={ROW_GAP} height={RECOMMENDATION_SLOT_HEIGHT} />
      );
      break;
    case 'hint':
      body = (
        <View style={[styles.note, { minHeight: RECOMMENDATION_SLOT_HEIGHT }]}>
          <Text style={styles.noteText}>{RECOMMENDATION_COPY.hint}</Text>
        </View>
      );
      break;
    case 'skeletonFull':
      body = (
        <View style={{ minHeight: reserved }}>
          <SkeletonRibbonList count={rowCount} gap={ROW_GAP} height={RECOMMENDATION_SLOT_HEIGHT} />
        </View>
      );
      break;
    case 'items':
      body = (
        <View style={{ minHeight: reserved, gap: ROW_GAP }}>
          {lines.map((line) => (
            <View key={line[0].key} style={styles.line}>
              {line.map((rec) => (
                <View key={rec.key} style={styles.cell}>
                  <RecommendationRow rec={rec} onPress={open} screenReaderOn={screenReaderOn} />
                </View>
              ))}
              {/* Fillers keep a short last line at column width, packed right. */}
              {Array.from({ length: columns - line.length }, (_, i) => (
                <View key={`fill-${i}`} style={styles.cell} />
              ))}
            </View>
          ))}
        </View>
      );
      break;
    case 'empty':
      body = (
        <View style={[styles.note, { minHeight: reserved }]}>
          <Text style={styles.noteText}>{RECOMMENDATION_COPY.empty}</Text>
        </View>
      );
      break;
    default: {
      // A new SectionState that is not handled above fails to compile here.
      const _exhaustive: never = state;
      body = _exhaustive;
    }
  }

  return (
    <View style={styles.section}>
      <HomeSectionHeader title={RECOMMENDATION_COPY.sectionTitle} />
      <View style={styles.body}>{body}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  line: { ...READING_ROW, gap: ROW_GAP },
  cell: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: 16 },
  note: { ...PHYSICAL_BOX, justifyContent: 'center' },
  noteText: { ...textStyle('bodyCompact', { color: KhazainColors.ink500 }), ...RTL_TEXT },
});
