import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { BookmarkButton } from '../primitives';

// Width scales with screen so the carousel always shows ~1.8 cards regardless
// of device (iPhone SE → Pro Max). 16px horizontal page padding + 12px gap.
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 16 * 2 - 12) / 1.8;

// Cream card with navy stripe top and centered Amiri navy title.
// Port of design_source/app/home.jsx BookCard.
export function BookCard({
  id,
  name,
  onPress,
}: {
  id: string;
  name: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={styles.navyStripe} />
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <View style={styles.bookmarkSlot} pointerEvents="box-none">
        <BookmarkButton
          type="book"
          entityId={id}
          snapshot={{ type: 'book', title: name }}
          variant="light"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    minHeight: 81,
    backgroundColor: KhazainColors.heroCream,
    borderRadius: KhazainRadius.sm,
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
  bookmarkSlot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
