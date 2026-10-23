import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Recent-searches row: tap fills query; X icon removes the entry.
// Track: khazain-search_20260510  T7

/** The row's 44pt line: a floor, so an enlarged query wraps and the row grows. */
const ROW_MIN_HEIGHT = 44;

type Props = {
  query: string;
  onPress: () => void;
  onRemove: () => void;
};

export function RecentSearchRow({ query, onPress, onRemove }: Props) {
  const oneLine = useLineClamp(1);
  return (
    <View style={styles.row}>
      {/* Physical left → right: remove button, then the query text. */}
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={styles.removeBtn}
        accessibilityRole="button"
        // Named by its query: a list of bare «إزالة» cannot be told apart.
        accessibilityLabel={`إزالة: ${query}`}
      >
        <View style={styles.xGlyph}>
          <View style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.xLine, { transform: [{ rotate: '-45deg' }] }]} />
        </View>
      </Pressable>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={query} style={styles.tap}>
        <Text style={styles.text} numberOfLines={oneLine}>
          {query}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: ROW_MIN_HEIGHT,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: KhazainColors.hairlineFaint,
  },
  tap: {
    flex: 1,
    // Fills the row rather than repeating its floor: minHeight counts the
    // row's hairline, so a 44 here made the row 45.
    alignSelf: 'stretch',
    // Inside the 43 at the default scale; only a wrapped query uses it.
    paddingVertical: 8,
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
