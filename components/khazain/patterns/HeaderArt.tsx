import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type ImageStyle } from 'react-native';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

/**
 * The art every mobile frame lays over its page ground.
 *
 * It is the same placements in all 28 frames — `Vector Smart Object`, a
 * 392 x 549 geometric tile anchored at the top edge, and a `Shape 2 copy`
 * corner motif in the header band. A tab root carries two of those (96 x 94 at
 * (84, -17) and 37 x 36 at (356, 36)); a pushed sub-screen carries only the
 * first, and sits it 8 lower. The app had been drawing
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
/** The frame the art was drawn on, and the gutter its title sits inside. */
const ART_FRAME_WIDTH = 393;
const ART_GUTTER = 16;

/**
 * Tile and corner placement. Phones keep the frame's left anchors, stretched
 * across the screen. A tablet is wider than the frame and the tile is not
 * seamless, so it cannot stretch or repeat: it stays at its drawn 393pt and
 * anchors from the physical right, where the page title is anchored. `inset`
 * is the page column's distance from the window's right edge; the art's own
 * 16pt gutter is subtracted so the frame's right edge lines up with the column.
 *
 * Left anchors become right anchors as `393 - left - width`: the large corner
 * (84, 96 wide) is 213 from the frame's right edge, the small one (356, 37
 * wide) is 0.
 */
export function headerArtGeometry(
  isTablet: boolean,
  inset: number,
): { tile: ImageStyle; cornerLarge: ImageStyle; cornerSmall: ImageStyle } {
  if (!isTablet) {
    return {
      tile: { position: 'absolute', left: 0, top: 0, right: 0, height: 549 },
      cornerLarge: { position: 'absolute', left: 84, top: -17, width: 96, height: 94 },
      cornerSmall: { position: 'absolute', left: 356, top: 36, width: 37, height: 36 },
    };
  }
  const right = inset - ART_GUTTER;
  return {
    tile: { position: 'absolute', top: 0, right, width: ART_FRAME_WIDTH, height: 549 },
    cornerLarge: {
      position: 'absolute',
      right: right + (ART_FRAME_WIDTH - 84 - 96),
      top: -17,
      width: 96,
      height: 94,
    },
    cornerSmall: {
      position: 'absolute',
      right: right + (ART_FRAME_WIDTH - 356 - 37),
      top: 36,
      width: 37,
      height: 36,
    },
  };
}

export function HeaderArt({
  corners = 'pair',
  inset,
}: {
  corners?: 'pair' | 'single' | 'none';
  /** The page column's inset from the window's physical right edge. */
  inset?: number;
}) {
  const layout = useResponsiveLayout();
  const geo = headerArtGeometry(layout.isTablet, inset ?? layout.reading.inset);
  const tabletArt = layout.isTablet;
  return (
    <View style={styles.layer} pointerEvents="none" accessible={false} accessibilityElementsHidden>
      <Image
        source={require('@/assets/figma/pattern-geometric-on-page.png')}
        style={tabletArt ? geo.tile : styles.tile}
        contentFit="cover"
        contentPosition="top center"
        cachePolicy="memory-disk"
      />
      {corners === 'none' ? null : (
        <Image
          source={require('@/assets/figma/ornament-corner-on-page.png')}
          style={[
            tabletArt ? geo.cornerLarge : styles.cornerLarge,
            corners === 'single' && styles.cornerLargeSingle,
          ]}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      )}
      {corners === 'pair' ? (
        <Image
          source={require('@/assets/figma/ornament-corner-on-page.png')}
          style={tabletArt ? geo.cornerSmall : styles.cornerSmall}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    // The two corner motifs are placed by physical `left`, and the file places
    // them asymmetrically — 84 and 356 across a 393 frame. Without a pinned
    // direction, forceRTL maps `left` to `start` and mirrors both.
    ...PHYSICAL_BOX,
    ...StyleSheet.absoluteFillObject,
    backgroundColor: KhazainColors.pageBg,
    overflow: 'hidden',
  },
  // `Vector Smart Object` — 392 x 549 at the frame's top-left, on a 393 frame.
  tile: { position: 'absolute', left: 0, top: 0, right: 0, height: 549 },
  // `Shape 2 copy` — 96.42 x 93.82 at (84.2, -16.9). The negative y is why it
  // reads as a motif entering the frame rather than one sitting inside it.
  cornerLarge: { position: 'absolute', left: 84, top: -17, width: 96, height: 94 },
  // The frames that carry only one copy sit it 8 lower (2106:2683, 2106:2746).
  cornerLargeSingle: { top: -9 },
  // The second copy, 37 x 36 at (356, 36).
  cornerSmall: { position: 'absolute', left: 356, top: 36, width: 37, height: 36 },
});
