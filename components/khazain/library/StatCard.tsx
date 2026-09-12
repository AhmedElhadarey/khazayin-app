import { textStyle, CHROME_MAX_FONT_SCALE } from '@/constants/typography';
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
      <Text style={styles.title} maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}>
        {title}
      </Text>
      <Text style={styles.sub} maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    // minHeight, not height. The Figma card is 122 tall, but the caption is two
    // lines of scaled type: at a raised system font scale the subtitle rendered
    // BELOW the card, on the page background. The card has to be free to grow
    // past its design height so its own text stays inside it.
    minHeight: STAT_CARD.height,
    paddingBottom: 12,
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
