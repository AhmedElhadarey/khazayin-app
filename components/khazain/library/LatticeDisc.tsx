import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

/** The audiobook thumbnail: a 48pt disc of gold lattice at 60%. */
export const LATTICE_DISC = Object.freeze({ size: 48, opacity: 0.6, tile: 16 });

/**
 * The geometric lattice drawn as an eight-point-star tile, stroked in the gold
 * accent. `assets/figma/pattern-geometric.png` is a greyscale light-fall
 * gradient with no alpha, so tinting it cannot give a gold lattice; the tile is
 * drawn as vectors instead (same device as `Star8Pattern`).
 */
export function LatticeDisc() {
  const t = LATTICE_DISC.tile;
  const h = t / 2;
  const q = t / 4;
  return (
    <View style={styles.disc} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={LATTICE_DISC.size} height={LATTICE_DISC.size} style={{ opacity: LATTICE_DISC.opacity }}>
        <Defs>
          <Pattern id="libLattice" x={0} y={0} width={t} height={t} patternUnits="userSpaceOnUse">
            <Path
              d={`M${h} 0 L${h + q} ${q} L${t} ${h} L${h + q} ${h + q} L${h} ${t} L${q} ${h + q} L0 ${h} L${q} ${q} Z`}
              fill="none"
              stroke={KhazainColors.goldAccent}
              strokeWidth={0.9}
            />
            <Path
              d={`M${h} ${q} L${h + q / 2} ${h - q / 2} L${h + q} ${h} L${h + q / 2} ${h + q / 2} L${h} ${h + q} L${h - q / 2} ${h + q / 2} L${q} ${h} L${h - q / 2} ${h - q / 2} Z`}
              fill="none"
              stroke={KhazainColors.goldAccent}
              strokeWidth={0.9}
            />
          </Pattern>
        </Defs>
        <Rect width={LATTICE_DISC.size} height={LATTICE_DISC.size} fill="url(#libLattice)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: LATTICE_DISC.size,
    height: LATTICE_DISC.size,
    borderRadius: LATTICE_DISC.size / 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
});
