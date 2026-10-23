import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import type { DawahPoster as DawahPosterModel } from '@/types/content';
import { BookmarkButton } from '../primitives';

// Dawah poster — on the Home carousel a poster is a bare image (no fill, radius
// 0, opacity 1): the PNGs carry their own rounded border with transparent
// corners, so any fill, clip, sheen or bevel of ours would show as a box around
// them. The file gives the centre poster (2132:2193) a DROP_SHADOW of (0, 1.22),
// blur 1.22, #000 at 25%, which is all the depth there is.
// Width/height are configurable so the focused carousel can render larger
// poster art while other surfaces (e.g. a row primitive) keep the default.
export function DawahPoster({
  quote,
  onPress,
  width = 178,
  height = 188,
}: {
  quote: DawahPosterModel;
  onPress?: () => void;
  width?: number;
  height?: number;
}) {
  const hasArt = !!quote.imageSource;
  // A neutral page-colour placeholder while the art decodes; afterwards nothing
  // is painted behind it. A poster with no art keeps its tone.
  const [decoded, setDecoded] = useState(false);
  const fill = !hasArt ? quote.tone ?? '#1A3F62' : decoded ? 'transparent' : KhazainColors.pageBg;
  return (
    // The bookmark is the Pressable's sibling, not its child: a Pressable is one
    // accessibility element on iOS, so a nested save could not be reached and
    // the poster borrowed its label («حفظ في المكتبة»).
    <View style={[styles.frame, { width, height }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={quote.title}
        // The shadowed poster is rasterized once so the carousel's per-frame scale
        // moves a cached bitmap instead of redrawing it, wrap clones included.
        shouldRasterizeIOS
        style={({ pressed }) => [
          styles.card,
          {
            width,
            height,
            backgroundColor: fill,
            borderRadius: hasArt ? 0 : KhazainRadius.md,
            transform: [
              { perspective: 1200 },
              { scale: pressed ? 0.96 : 1 },
            ],
          },
        ]}
      >
        {quote.imageSource ? (
          <Image source={quote.imageSource} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={0} onLoad={() => setDecoded(true)} />
        ) : null}
      </Pressable>

      <View style={styles.bookmarkSlot} pointerEvents="box-none">
        <BookmarkButton
          type="dawah"
          entityId={quote.id}
          snapshot={{
            type: 'dawah',
            title: quote.title,
            body: quote.body,
            tone: quote.tone,
            imageSource: quote.imageSource,
          }}
          variant="floating"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
  },
  card: {
    position: 'relative',
    // The file's DROP_SHADOW on the centre poster. Not clipped, so the bare
    // art's own edge is what shows. No `elevation`: Android draws a grey band
    // for an elevation shadow over a transparent card (see HeroShell), so the
    // faint shadow is iOS-only.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.22 },
    shadowOpacity: 0.25,
    shadowRadius: 1.22,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bookmarkSlot: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
