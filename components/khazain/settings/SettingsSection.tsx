import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: Props) {
  return (
    <View style={styles.container}>
      {/* Physical left → right: title, then the gold bar on the leading edge —
          the same order as HomeSectionHeader, authored inside a PHYSICAL_ROW so
          forceRTL cannot swap it. `row-reverse` on an unpinned row flipped a
          second time and put the bar on the physical left. */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.bar} />
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  headerRow: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  bar: {
    width: 5,
    height: 21,
    borderRadius: 2,
    backgroundColor: KhazainColors.goldBar,
  },
  title: textStyle('sectionTitle', { color: KhazainColors.navy900 }),
  rows: {
    gap: 8,
  },
});
