import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';

// 194×78 navy card with a centered gold stripe at the top and a centered scholar name in Amiri gold.
// Port of design_source/app/home.jsx ScholarCard.
export function ScholarCard({ name, onPress }: { name: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={styles.goldStripe} />
      <Text style={styles.pretitle}>الشيخ</Text>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 194,
    height: 78,
    backgroundColor: KhazainColors.navy,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    shadowColor: 'rgba(20,64,100,0.24)',
    shadowOffset: { width: 2.85, height: 0.71 },
    shadowOpacity: 1,
    shadowRadius: 11.4,
    elevation: 3,
  },
  goldStripe: {
    position: 'absolute',
    top: -2,
    left: 32,
    right: 28,
    height: 4.5,
    backgroundColor: KhazainColors.goldBar,
  },
  pretitle: {
    fontFamily: 'Amiri',
    fontSize: 10,
    color: '#D7B995',
    fontWeight: '600',
    letterSpacing: 1,
    writingDirection: 'rtl',
  },
  name: {
    fontFamily: 'Amiri-Bold',
    fontSize: 19,
    color: '#D7B995',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 4,
    writingDirection: 'rtl',
  },
});
