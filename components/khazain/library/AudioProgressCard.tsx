import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function AudioProgressCard({
  title,
  author,
  pct,
  subtitle,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  gold,
}: {
  title: string;
  author: string;
  pct: number;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  gold?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={[styles.card, KhazainShadows.card]}>
      <View style={styles.topRow}>
        <View style={styles.cover}>
          <Text style={styles.coverText}>﷽</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
        </View>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: gold ? KhazainColors.gold400 : KhazainColors.navy800,
            },
          ]}
        />
      </View>
      <Text style={styles.sub}>{subtitle}</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={onPrimary}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: gold ? KhazainColors.gold400 : KhazainColors.navy800,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        </Pressable>
        <Pressable
          onPress={onSecondary}
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.1)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    color: KhazainColors.gold300,
    fontWeight: '700',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  author: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginTop: 2,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(141,107,52,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  sub: {
    fontSize: 12,
    color: KhazainColors.ink500,
    marginTop: 6,
    marginBottom: 10,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '600',
    color: KhazainColors.navy800,
  },
});
