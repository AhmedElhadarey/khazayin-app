import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
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
      {/* Physical left → right: remove button, then the query text. */}
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
      <Pressable onPress={onPress} style={styles.tap}>
        <Text style={styles.text} numberOfLines={1}>
          {query}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    height: 44,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: KhazainColors.hairlineFaint,
  },
  tap: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  text: textStyle('bodyCompact', { color: KhazainColors.ink900 }),
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
