import { KhazainColors, KhazainRadius } from '@/constants/theme';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { textStyle } from '@/constants/typography';

// Horizontal row of curated suggestion topic chips. RTL-inverted so
// first chip lands on the visual right.
//
// Track: khazain-search_20260510  T7

const SUGGESTIONS = [
  'العقيدة',
  'الحديث',
  'التفسير',
  'السيرة',
  'ابن باز',
  'الفاتحة',
  'رياض الصالحين',
  'الدعاء',
];

type Props = {
  onPick: (q: string) => void;
};

export function SuggestionChips({ onPick }: Props) {
  return (
    <FlatList
      data={SUGGESTIONS}
      keyExtractor={(s) => s}
      horizontal
      inverted
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPick(item)}
          hitSlop={{ top: 6, bottom: 6 }}
          style={({ pressed }) => [
            styles.chip,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={item}
        >
          <Text style={styles.chipText} numberOfLines={1}>
            {item}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: KhazainRadius.pill,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: textStyle('label', { color: KhazainColors.ink900, textAlign: 'center' }),
});
