import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';

// 192×81 cream card with navy stripe top and centered Amiri navy title.
// Port of design_source/app/home.jsx BookCard.
export function BookCard({ name, onPress }: { name: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={styles.navyStripe} />
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 192,
    height: 81,
    backgroundColor: KhazainColors.heroCream,
    borderRadius: 8,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: 'rgba(20,64,100,0.24)',
    shadowOffset: { width: 2.67, height: 0.67 },
    shadowOpacity: 1,
    shadowRadius: 10.66,
    elevation: 3,
  },
  navyStripe: {
    position: 'absolute',
    top: -2,
    left: 40,
    right: 40,
    height: 4,
    backgroundColor: KhazainColors.navy,
  },
  name: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    color: KhazainColors.navy,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18.5,
    writingDirection: 'rtl',
  },
});
