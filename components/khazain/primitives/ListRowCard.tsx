import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

// Cream list-row card used in SectionsScreen and Dawah group list.
// Visual spec: bg cardBg, r=20, padding 16/12, 64×64 circular icon chip, title/subtitle/count stack, trailing chevron.
// Port of design_source/app/shared.jsx ListRowCard.
export function ListRowCard({
  icon,
  title,
  subtitle,
  count,
  chevron = true,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: string | null;
  chevron?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.iconChip}>{icon}</View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {count ? <Text style={styles.count}>{count}</Text> : null}
      </View>
      {chevron ? <ChevronIcon size={20} color={KhazainColors.inkTitle} direction="start" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  iconChip: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: KhazainColors.inkTitle,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    lineHeight: 20,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  count: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: KhazainColors.inkCount,
    marginTop: 2,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});

// Silence unused-radius lint noise if any build tool checks that we reference a token.
void KhazainRadius;
