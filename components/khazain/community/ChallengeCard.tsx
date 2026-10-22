/**
 * The group's active challenge (design §6, §8.2): title, what it asks for, and
 * the group bar. The bar shows only when `groupView` says the totals are
 * visible; below the threshold the card shows the community copy instead and
 * no figure at all.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { PHYSICAL_BOX, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import type { GroupView } from '@/services/community/progressMath';
import { ProgressBar } from './ProgressBar';

export function ChallengeCard({
  title,
  summary,
  view,
  totalsLabel,
}: {
  title: string;
  /** What the challenge asks for, e.g. the wird summary. */
  summary: string;
  view: GroupView;
  /** The label for the visible bar. Unused while the totals are hidden. */
  totalsLabel: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{summary}</Text>
      <Text style={styles.note}>{COMMUNITY_COPY.challengeStarts}</Text>
      {view.totalsVisible ? (
        <>
          <ProgressBar fraction={view.fraction} label={totalsLabel} />
          <Text style={styles.note}>{COMMUNITY_COPY.totalsNote}</Text>
        </>
      ) : (
        <Text style={styles.body}>{view.copy}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...PHYSICAL_BOX,
    padding: 16,
    gap: 10,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  title: { ...RTL_TEXT, ...textStyle('sectionTitle', { color: KhazainColors.navy900 }) },
  body: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.ink900 }) },
  note: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.inkSubtle }) },
});
