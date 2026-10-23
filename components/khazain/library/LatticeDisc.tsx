import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** The audiobook thumbnail disc, node 2207:17287: 48pt, clipped to a circle. */
export const LATTICE_DISC = Object.freeze({ size: 48 });

/**
 * 302 curved, interlaced vectors in #A88051 at 0.6, pre-rendered from the file
 * by `scripts/figma/extract-library-disc.js` (the opacity is baked into the
 * PNG). A raster rather than ~170 KB of path data; `--check` guards drift.
 */
const SOURCE = require('@/assets/khazain/library/lattice-disc.png');

export function LatticeDisc() {
  return (
    <View style={styles.disc} accessible={false} importantForAccessibility="no-hide-descendants">
      <Image source={SOURCE} style={styles.image} resizeMode="cover" />
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
  image: { width: LATTICE_DISC.size, height: LATTICE_DISC.size },
});
