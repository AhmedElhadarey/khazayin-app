import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KhazainColors } from '@/constants/theme';
import { FONT_SIZE_SCALE } from '@/constants/settings';
import type { FontSizeLevel } from '@/types/settings';

// Universally-recognized opening of every surah — used as a faithful sample
// so users see real Quran rendering (with tashkeel) at each scale level.
const PREVIEW_AYAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

export function FontSizePreview({ level }: { level: FontSizeLevel }) {
  const { fontSize, lineHeight } = FONT_SIZE_SCALE[level];
  return (
    <View style={styles.frame}>
      <Text style={[styles.ayah, { fontSize, lineHeight }]} numberOfLines={2}>
        {PREVIEW_AYAH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1.5,
    borderColor: KhazainColors.gold500,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FBF3DF',
    minHeight: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayah: {
    fontFamily: 'Amiri-Bold',
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
