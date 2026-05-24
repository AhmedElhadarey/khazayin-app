import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Cream card with a thin gold vertical ribbon on the RIGHT edge (start-side in RTL).
// Used on العلماء والمشايخ (page 26), كل الشرح (page 28).
//
// Layout uses absolute-positioning of inner content so it survives `forceRTL`
// inconsistencies on web (per CLAUDE.md). Title and subtitle are right-aligned
// with the ribbon flush to the right edge.
export function RibbonCard({
  pretitle,
  title,
  meta,
  duration,
  onPress,
}: {
  pretitle?: string;
  title: string;
  meta?: string;
  duration?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Right-edge gold ribbon */}
      <View style={styles.ribbon} />
      {/* Title block — pinned to the right (visual leading edge in RTL) */}
      <View style={styles.titleBlock}>
        {pretitle ? <Text style={styles.pretitle}>{pretitle}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {/* Duration / count chip — pinned to the left */}
      {duration ? (
        <View style={styles.durationBlock}>
          <Text style={styles.duration}>{duration}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    paddingVertical: 14,
    paddingRight: 22, // extra space for ribbon
    paddingLeft: 16,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  ribbon: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 5,
    borderRadius: 3,
    backgroundColor: KhazainColors.goldBar,
  },
  titleBlock: {
    paddingRight: 0,
    alignItems: 'flex-end',
    gap: 4,
  },
  pretitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    fontWeight: '500',
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  meta: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    marginTop: 2,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  durationBlock: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  duration: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '600',
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
  },
});
