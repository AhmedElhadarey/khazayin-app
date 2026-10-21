import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { LIST_CARD } from './libraryLayout';
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
    <View style={styles.card}>
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
  // Figma node 2031:4659: 361 x 156 at radius 20, a flat fill with a faint
  // hairline and no shadow.
  card: {
    padding: 16,
    borderRadius: LIST_CARD.radius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineFaint,
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
  title: textStyle('cardTitle', { color: KhazainColors.inkHeading }),
  author: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    marginTop: 4,
  },
  track: {
    height: 6,
    backgroundColor: KhazainColors.hairline,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  sub: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    marginTop: 8,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: textStyle('cardTitle', { color: KhazainColors.pageBg }),
  // The design fills the secondary action with the same tint it uses for the
  // filter chips rather than outlining it.
  secondaryBtn: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: textStyle('cardTitle', { color: KhazainColors.ink500 }),
});
