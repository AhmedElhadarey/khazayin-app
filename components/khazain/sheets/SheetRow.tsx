import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

// Row used inside telegram / youtube sheets. Navy tile (34×34) icon + title + optional subtitle + chevron.
export function SheetRow({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={styles.iconTile}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <ChevronIcon size={12} color={KhazainColors.ink400} direction="start" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(141,107,52,0.08)',
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '600',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sub: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink500,
    marginTop: 2,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
