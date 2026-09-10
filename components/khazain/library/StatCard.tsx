import { textStyle } from '@/constants/typography';
import { KhazainColors } from '@/constants/theme';
import { STAT_CARD } from './libraryLayout';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// The Library stats row, Figma node 2031:4659.
//
// Three 115 x 122 cards fill the content column. The icon sits in a flat
// 40 x 40 rounded square — the design gives it no stroke and the card no
// shadow, so neither is drawn here.
export function StatCard({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.iconChip}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: STAT_CARD.height,
    borderRadius: STAT_CARD.radius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    alignItems: 'center',
    paddingTop: 17,
    paddingHorizontal: 8,
  },
  iconChip: {
    width: STAT_CARD.icon.size,
    height: STAT_CARD.icon.size,
    borderRadius: STAT_CARD.icon.radius,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...textStyle('cardTitle', { color: KhazainColors.inkHeading, textAlign: 'center' }),
    marginTop: 8,
  },
  sub: {
    ...textStyle('label', { color: KhazainColors.ink500, textAlign: 'center' }),
    marginTop: 4,
  },
});
