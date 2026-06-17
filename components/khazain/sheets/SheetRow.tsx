import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Row used inside telegram / youtube / share sheets.
// Per Figma each row is its own cream rounded card, with a navy circular disc
// on the RTL-start side (right edge) holding the brand glyph, the title to the
// left of the disc, and an optional second line for subtitle.
export function SheetRow({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title}، ${sub}` : title}
      style={({ pressed }) => [
        styles.row,
        sub ? styles.rowTall : styles.rowShort,
        { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.disc}>{icon}</View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: KhazainColors.cream50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.10)',
    paddingHorizontal: 14,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowShort: {
    height: 56,
  },
  rowTall: {
    paddingVertical: 12,
    minHeight: 64,
  },
  // Anchored to the visual right (RTL start) via absolute positioning so the
  // visual order is deterministic regardless of native flexDirection flipping.
  // Vertical centering is achieved with `top: '50%'` + a transform of half the
  // disc height (RN doesn't honour `margin: auto` for absolutely positioned
  // elements).
  disc: {
    position: 'absolute',
    right: 12,
    top: '50%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -16 }],
  },
  textCol: {
    paddingRight: 56, // disc width 32 + right inset 12 + gap 12
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sub: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink500,
    marginTop: 2,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
