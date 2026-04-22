import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

type Position = 'tl' | 'tr' | 'bl' | 'br';

// 14×14 gold L-corner ornament used around navy scholar/reciter hero cards.
// Port of design_source/app/shared.jsx CornerOrnament.
export function CornerOrnament({ pos = 'tl', color = KhazainColors.gold300 }: { pos?: Position; color?: string }) {
  const style = POSITION_MAP[pos];
  return (
    <View style={[styles.base, style.position]}>
      <Svg width={14} height={14} viewBox="0 0 14 14" style={style.rotate}>
        <Path d="M1 1 L6 1 M1 1 L1 6 M1 1 L4 4" stroke={color} strokeWidth={1} />
      </Svg>
    </View>
  );
}

const POSITION_MAP: Record<Position, { position: any; rotate: any }> = {
  tl: { position: { top: 6, left: 6 }, rotate: { transform: [{ rotate: '0deg' }] } },
  tr: { position: { top: 6, right: 6 }, rotate: { transform: [{ rotate: '90deg' }] } },
  bl: { position: { bottom: 6, left: 6 }, rotate: { transform: [{ rotate: '-90deg' }] } },
  br: { position: { bottom: 6, right: 6 }, rotate: { transform: [{ rotate: '180deg' }] } },
};

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    opacity: 0.6,
  },
});
