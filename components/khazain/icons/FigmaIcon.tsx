import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { FIGMA_ICONS, type FigmaIcon as FigmaIconData, type FigmaIconName } from './generated/figmaIcons';

export type FigmaIconProps = {
  name: FigmaIconName;
  /**
   * Rendered size. The icon keeps the file's own aspect ratio, so `size` sets
   * the longer edge and the shorter one follows — a 20x44 mark stays 20x44.
   */
  size?: number;
  /**
   * Retint a single-colour glyph. Ignored for multi-colour art, where one
   * flat colour would destroy the drawing rather than recolour it; read
   * `FIGMA_ICONS[name].monochrome` if a caller needs to branch on that.
   */
  color?: string;
  opacity?: number;
};

/**
 * Draw an icon from `docs/KHAZAYIN.fig`.
 *
 * The geometry is the outline Figma itself renders, generated into
 * `./generated/figmaIcons.ts` by `scripts/figma/extract-icons.js`. Nothing
 * here approximates the design — the only decisions this component makes are
 * how large to draw it and, for a single-colour glyph, in what colour.
 */
export function FigmaIcon({ name, size = 24, color, opacity }: FigmaIconProps) {
  // `as const` in the generated file narrows each path to its own literal
  // shape; widening here is what makes the optional `fillOpacity` readable.
  const icon: FigmaIconData = FIGMA_ICONS[name];
  const scale = size / Math.max(icon.width, icon.height);
  const width = icon.width * scale;
  const height = icon.height * scale;
  const tint = icon.monochrome ? color : undefined;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      opacity={opacity}
    >
      {icon.paths.map((p, i) => (
        <Path
          key={i}
          d={p.d}
          fill={tint ?? p.fill}
          fillRule={p.fillRule}
          fillOpacity={p.fillOpacity}
        />
      ))}
    </Svg>
  );
}

/**
 * A named wrapper with the `({ size, color })` signature the rest of the icon
 * set uses, so a screen can swap a hand-drawn glyph for the file's own without
 * changing its call site.
 */
export const figmaIcon = (name: FigmaIconName) =>
  function FigmaIconNamed({ size, color }: { size?: number; color?: string }) {
    return <FigmaIcon name={name} size={size} color={color} />;
  };

export { FIGMA_ICONS };
export type { FigmaIconName };
