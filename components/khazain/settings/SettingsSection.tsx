import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';

type Props = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: Props) {
  return (
    <View style={styles.container}>
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
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
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '600',
    color: KhazainColors.navy900,
    lineHeight: 21,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rows: {
    gap: 8,
  },
});
