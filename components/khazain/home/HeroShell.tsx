import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Image, ImageSource, ImageStyle } from 'expo-image';
import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainRadius, KhazainShadows } from '@/constants/theme';

/**
 * The frame both Home heroes share.
 *
 * Each hero used to be one flattened raster with its copy baked in, so the
 * copy could not be scaled or corrected and the `المزيد` pill could not be
 * tapped on its own — the whole card was a single target. The artwork is
 * still pictures, because it is genuine client illustration, but it is now
 * the .fig's own separate layers rather than one flattened export, and the
 * text on top of it is text.
 *
 * Keeping the layers apart is what lets the card be any height. Live text at
 * a readable size needs more room than the design's 9pt artwork-text did, and
 * a card that grows past a single baked image shows a flat band where the
 * image stops. Here the background fills whatever height the card takes while
 * each illustration stays anchored to the edge the design anchors it to.
 *
 * Every measurement is in the design's units against a 361pt-wide card, scaled
 * by the width this actually gets, so the composition holds from a 320pt phone
 * up to the capped content column.
 */

/** One piece of artwork, positioned in design units against its anchor edges. */
export type HeroLayer = {
  source: ImageSource;
  width: number;
  height: number;
  left?: number;
  top?: number;
  bottom?: number;
};

export type HeroShellProps = {
  /** Fills the card at any height, so it must be the patterned ground alone. */
  background: ImageSource;
  /**
   * Flat colour behind the background image, sampled from the artwork. It
   * covers the frame before the image decodes, and on Android an
   * elevation shadow over a transparent card renders as a grey band.
   */
  backgroundColor: string;
  layers: HeroLayer[];
  designWidth: number;
  /** The card's minimum height; text is free to push it past this. */
  designHeight: number;
  /** Text column, in design units, from the card's physical left edge. */
  column: { left: number; width: number; top: number; bottom: number };
  accessibilityLabel: string;
  onPress?: () => void;
  children: (scale: number) => React.ReactNode;
};

export function HeroShell({
  background,
  backgroundColor,
  layers,
  designWidth,
  designHeight,
  column,
  accessibilityLabel,
  onPress,
  children,
}: HeroShellProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next > 0 && next !== width) setWidth(next);
  };

  // Design units → device points.
  const scale = width > 0 ? width / designWidth : 0;

  const columnStyle: ViewStyle = {
    marginLeft: column.left * scale,
    width: column.width * scale,
    marginTop: column.top * scale,
    marginBottom: column.bottom * scale,
  };

  const place = (layer: HeroLayer): ImageStyle => ({
    position: 'absolute',
    width: layer.width * scale,
    height: layer.height * scale,
    ...(layer.left !== undefined ? { left: layer.left * scale } : null),
    ...(layer.top !== undefined ? { top: layer.top * scale } : null),
    ...(layer.bottom !== undefined ? { bottom: layer.bottom * scale } : null),
  });

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        PHYSICAL_BOX,
        KhazainShadows.hero,
        {
          backgroundColor,
          // Before the first layout there is no width to scale by, so the card
          // holds the design's proportion instead of collapsing to nothing and
          // jumping once it measures.
          ...(scale > 0
            ? { minHeight: designHeight * scale }
            : { aspectRatio: designWidth / designHeight }),
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Image
        source={background}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        cachePolicy="memory-disk"
        transition={0}
      />
      {/* Nothing is placed until the first layout gives a width to scale by. */}
      {scale > 0
        ? layers.map((layer, i) => (
            <Image
              key={i}
              source={layer.source}
              style={place(layer)}
              contentFit="fill"
              cachePolicy="memory-disk"
              transition={0}
            />
          ))
        : null}
      {scale > 0 ? <View style={columnStyle}>{children(scale)}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
  },
});
