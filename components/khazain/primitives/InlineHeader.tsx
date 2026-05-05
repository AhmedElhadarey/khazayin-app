import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Pages 13/14/15/21/25/26/28/29/34: an inline page header that does NOT
// use the circular back-chip from DetailHeader. Instead the title is right-
// aligned with a small navy ◀ disclosure triangle to its left (visually).
//
// Layout uses a fixed-height row with the entire title-group anchored to
// the right edge via absolute positioning — this is the safe RTL pattern
// per CLAUDE.md (flexDirection auto-flip is unreliable on web).
export function InlineHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityLabel="رجوع"
        style={({ pressed }) => [styles.touchArea, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.chevronWrap}>
          <Svg width={10} height={12} viewBox="0 0 10 12">
            <Path
              d="M7 1 L2 6 L7 11"
              stroke={KhazainColors.navy800}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 44,
    paddingTop: 10,
    paddingHorizontal: 16,
    position: 'relative',
  },
  touchArea: {
    position: 'absolute',
    right: 16,
    top: 6,
    height: 32,
    paddingLeft: 22, // space for chevron at left of title
    paddingRight: 0,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  chevronWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
