import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CrownBookArt } from '../art';
import { SmallMoreButton } from './SmallMoreButton';

// 96-tall gradient card for the "أنتِ ملكة" feature row.
// Layout: crown+book art on the trailing (right in RTL) side, text + MoreButton on the leading side.
export function QueenCard({ onPress, onMore }: { onPress?: () => void; onMore?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <LinearGradient
        colors={['#EDE0D1', '#F1E8DD', '#EDE0D1']}
        locations={[0, 0.5529, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>أنتِ ملكة</Text>
          <View style={styles.titleBar} />
        </View>
        <Text style={styles.subline}>
          مَلِكةٌ أنتِ لا سِواكِ وفي قُربك من ربك هُداكِ، فأعدَدنا لكِ هذا المحتوى النَّدِي لتَصنعي جِيلًا على هَدي النبي ﷺ.
        </Text>
        <SmallMoreButton onPress={onMore} />
      </View>

      <View style={styles.artSlot}>
        <CrownBookArt />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 96,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  artSlot: {
    position: 'absolute',
    right: 6,
    top: '50%',
    marginTop: -40,
    width: 130,
    height: 80,
  },
  textBlock: {
    position: 'absolute',
    left: 14,
    top: '50%',
    marginTop: -34,
    width: 187,
    alignItems: 'flex-end',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    color: KhazainColors.navy,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  titleBar: {
    width: 2,
    height: 15,
    backgroundColor: '#D7B995',
    borderRadius: 1,
  },
  subline: {
    fontFamily: 'Amiri',
    fontSize: 8,
    lineHeight: 12,
    color: KhazainColors.inkSubtle,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
