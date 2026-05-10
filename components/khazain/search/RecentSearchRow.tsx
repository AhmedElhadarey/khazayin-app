import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Recent-searches row: tap fills query; X icon removes the entry.
// Track: khazain-search_20260510  T7

type Props = {
  query: string;
  onPress: () => void;
  onRemove: () => void;
};

export function RecentSearchRow({ query, onPress, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPress} style={styles.tap}>
        <Text style={styles.text} numberOfLines={1}>
          {query}
        </Text>
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={styles.removeBtn}
        accessibilityRole="button"
        accessibilityLabel="إزالة"
      >
        <View style={styles.xGlyph}>
          <View style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.xLine, { transform: [{ rotate: '-45deg' }] }]} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(141,107,52,0.08)',
  },
  tap: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink900,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xGlyph: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLine: {
    position: 'absolute',
    width: 12,
    height: 1.5,
    backgroundColor: KhazainColors.inkSubtle,
    borderRadius: 1,
  },
});
