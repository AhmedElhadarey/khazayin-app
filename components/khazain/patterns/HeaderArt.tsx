import { KhazainColors } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * The art every mobile frame lays over its page ground.
 *
 * It is the same three placements in all 28 frames — `Vector Smart Object`, a
 * 392 x 549 geometric tile anchored at the top edge, and one or two
 * `Shape 2 copy` corner motifs in the header band. The app had been drawing
 * `OrnamentPattern` instead: a 60pt diamond-and-circle tile ported from the
 * prototype's CSS, which is a different motif from the eight-point star the
 * design actually uses.
 *
 * **Why these are pre-composited images.** The file paints all of it at
 * `blendMode: OVERLAY`, and React Native has no blend modes. That matters more
 * than it sounds: the corner motif's source art is *opaque black*, and it is
 * only the blend that turns it into a 248 -> 241 whisper rather than ink.
 * Drawn with plain alpha at any opacity it is wrong — too dark, or too dark
 * and blurry.
 *
 * The ground under it is `#F8F2ED` in every frame, so the blend has one
 * correct answer. `scripts/figma/extract-images.js` computes it once and
 * writes an opaque asset that renders identically at full opacity on that
 * ground. Nothing here guesses an opacity.
 */
export function HeaderArt({ showCorner = true }: { showCorner?: boolean }) {
  return (
    <View style={styles.layer} pointerEvents="none" accessible={false} accessibilityElementsHidden>
      <Image
        source={require('@/assets/figma/pattern-geometric-on-page.png')}
        style={styles.tile}
        contentFit="cover"
        contentPosition="top center"
        cachePolicy="memory-disk"
      />
      {showCorner ? (
        <>
          <Image
            source={require('@/assets/figma/ornament-corner-on-page.png')}
            style={styles.cornerLarge}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
          <Image
            source={require('@/assets/figma/ornament-corner-on-page.png')}
            style={styles.cornerSmall}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: KhazainColors.pageBg,
    overflow: 'hidden',
  },
  // `Vector Smart Object` — 392 x 549 at the frame's top-left, on a 393 frame.
  tile: { position: 'absolute', left: 0, top: 0, right: 0, height: 549 },
  // `Shape 2 copy` — 96.42 x 93.82 at (84.2, -16.9). The negative y is why it
  // reads as a motif entering the frame rather than one sitting inside it.
  cornerLarge: { position: 'absolute', left: 84, top: -17, width: 96, height: 94 },
  // The second copy, 37 x 36 at (356, 36).
  cornerSmall: { position: 'absolute', left: 356, top: 36, width: 37, height: 36 },
});
