import { READING_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { dismissRecommendation } from '@/services/recommendations/dismiss';
import type { Recommendation } from '@/services/recommendations/types';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CloseIcon } from '../icons';
import { RibbonCard } from '../primitives/RibbonCard';

// One recommendation, on Home and in the Mushaf end block (design §6.3, §6.4):
// [RibbonCard, dismiss button] as SIBLINGS, authored in reading order inside a
// READING_ROW, so the card sits at the physical right and the button at the
// physical left (RECOMMENDATION_ROW_ORDER). Screen readers reach the card's texts, then the
// button. No `save`: long-press does nothing here (S5/C3).

export function RecommendationRow({
  rec,
  onPress,
  screenReaderOn,
}: {
  rec: Recommendation;
  onPress: (rec: Recommendation) => void;
  /** Owned by the section so the rows share one listener. */
  screenReaderOn: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <RibbonCard
          pretitle={rec.reason}
          title={rec.title}
          meta={rec.meta}
          onPress={() => onPress(rec)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`إخفاء الاقتراح: ${rec.title}`}
        // Widens the target into the gap on the card's side only.
        hitSlop={{ left: 15 }}
        onPress={() => dismissRecommendation(rec, { announce: screenReaderOn })}
        style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.6 }]}
      >
        <CloseIcon size={14} color={KhazainColors.ink500} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { ...READING_ROW, alignItems: 'center' },
  card: { flex: 1, minWidth: 0 },
  // 14pt icon centred in a 44 x 44 target.
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
