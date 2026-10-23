import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';
import { LatticeDisc } from './LatticeDisc';
import { LIST_CARD } from './libraryLayout';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type AudioCardVariant = 'progress' | 'completed';

/**
 * The audiobook card (node 2031:4659), one layout for both states:
 *
 *   physical left → right: [ text column | lattice disc ]
 *   text column: title, author, 6pt track, then a meta row — the episode
 *   position at the left (only when known), the percent at the right.
 *   actions, at the right edge: [ primary | secondary ].
 *
 * `completed` fills the track and turns the primary action gold; the track
 * itself stays navy.
 */
export function AudioProgressCard({
  title,
  author,
  pct,
  subtitle,
  episodeLabel,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  variant = 'progress',
}: {
  title: string;
  author: string;
  pct: number;
  /** The right-hand meta, e.g. «٦٥٪ مكتمل» or «مكتمل». */
  subtitle: string;
  /** The left-hand meta, e.g. «الحلقة ٣ من ١٢». Omitted when not known. */
  episodeLabel?: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  variant?: AudioCardVariant;
}) {
  const completed = variant === 'completed';
  const oneLine = useLineClamp(1);
  const clamped = completed ? 100 : Math.max(0, Math.min(100, pct));
  const accent = completed ? KhazainColors.goldAccent : KhazainColors.navy800;
  return (
    <View style={styles.card}>
      {/* Physical left → right: text column, then the disc at the right. */}
      <View style={styles.topRow}>
        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={oneLine}>
            {title}
          </Text>
          <Text style={styles.author} numberOfLines={oneLine}>
            {author}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${clamped}%` }]} />
          </View>
          {/* Physical left → right: episode position, then the percent. */}
          <View style={styles.meta}>
            {episodeLabel ? <Text style={styles.metaText}>{episodeLabel}</Text> : <View />}
            <Text style={styles.metaText}>{subtitle}</Text>
          </View>
        </View>
        <LatticeDisc />
      </View>
      {/* Physical left → right: primary, then secondary at the right edge. */}
      <View style={styles.actions}>
        <Pressable
          onPress={onPrimary}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        </Pressable>
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma node 2031:4659: radius 20, a flat fill with a faint hairline, no
  // shadow; 17 above and below, 12 either side.
  card: {
    ...PHYSICAL_BOX,
    paddingVertical: 17,
    paddingHorizontal: 12,
    borderRadius: LIST_CARD.radius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineFaint,
  },
  topRow: {
    ...PHYSICAL_ROW,
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: textStyle('cardTitle', { color: KhazainColors.inkHeading }),
  author: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    marginTop: 4,
  },
  // The fill is anchored at the physical right: the track is pinned ltr and
  // the fill takes the end of the cross axis.
  track: {
    ...PHYSICAL_BOX,
    height: 6,
    marginTop: 8,
    backgroundColor: KhazainColors.hairline,
    borderRadius: 3,
    overflow: 'hidden',
  },
  // Navy in both variants (node 2098:2285): only the completed primary is gold.
  fill: {
    alignSelf: 'flex-end',
    backgroundColor: KhazainColors.navy800,
    height: '100%',
  },
  meta: {
    ...PHYSICAL_ROW,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: textStyle('label', { color: KhazainColors.ink500 }),
  // Content-sized, packed at the physical right; fits 320dp.
  actions: {
    ...PHYSICAL_ROW,
    justifyContent: 'flex-end',
    gap: 8,
  },
  primaryBtn: {
    height: 36,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: textStyle('cardTitle', { color: KhazainColors.pageBg }),
  // The design fills the secondary action with a gold tint rather than
  // outlining it.
  secondaryBtn: {
    height: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: textStyle('cardTitle', { color: KhazainColors.ink500 }),
});
