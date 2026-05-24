import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// 1/3-flex cream stat card used in the Library stats row.
// Gold-bordered 36×36 circular icon chip, centered title + subtitle.
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
    <View style={[styles.card, KhazainShadows.card]}>
      <View style={styles.iconChip}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1.5,
    borderColor: KhazainColors.gold400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'TheSansArabic',
    fontSize: 10.5,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
