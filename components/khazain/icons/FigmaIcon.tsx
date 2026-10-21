import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { FIGMA_ICONS, type FigmaIcon as FigmaIconData, type FigmaIconName } from './generated/figmaIcons';

export type FigmaIconProps = {
  name: FigmaIconName;
  /**
   * Rendered size of the longer edge; the shorter one follows, so a 20x44
   * mark stays 20x44. Omit it to draw the mark at the size the file states —
   * which is what a caller should do unless it has a reason not to, since the
   * design does not draw every mark at one size (the ملكة mark is 20x44 and
   * the الكتب العلمية one 48x48, both inside the same 64pt disc).
   */
  size?: number;
  /**
   * Retint a single-colour glyph. Ignored for multi-colour art, where one
   * flat colour would destroy the drawing rather than recolour it; read
   * `FIGMA_ICONS[name].monochrome` if a caller needs to branch on that.
   */
  color?: string;
  opacity?: number;
  /**
   * Draw the mark flipped horizontally, because that is how the file's own
   * *instances* place it.
   *
   * The flip lives on the instance (`transform.m00: -1`), never on the SYMBOL
   * master, so the generated geometry stays a faithful copy of the master and
   * the orientation is a decision the call site makes — which is right, because
   * the design uses both orientations of the same component to mean two
   * different things:
   *
   *   `Back` (`vuesax/bulk/arrow-right`) — 23 upright instances, exactly one
   *   per frame: the header back control, which points right in RTL. 42
   *   mirrored instances: the list-row disclosures on Sections (9), Qiraat
   *   (10), both reciter tabs (6 each) and Archive (3), which point left
   *   because they lead deeper.
   *
   *   `Play` (`vuesax/bulk/play`) — 16 of 16 instances mirrored. Playback runs
   *   right to left here, so the triangle does too.
   *
   * Applied as an SVG transform rather than an RN `style.transform` so that
   * nothing about it can interact with `I18nManager.forceRTL`.
   */
  mirrored?: boolean;
};

/**
 * Draw an icon from `docs/KHAZAYIN.fig`.
 *
 * The geometry is the outline Figma itself renders, generated into
 * `./generated/figmaIcons.ts` by `scripts/figma/extract-icons.js`. Nothing
 * here approximates the design — the only decisions this component makes are
 * how large to draw it and, for a single-colour glyph, in what colour.
 */
export function FigmaIcon({ name, size, color, opacity, mirrored }: FigmaIconProps) {
  // `as const` in the generated file narrows each path to its own literal
  // shape; widening here is what makes the optional `fillOpacity` readable.
  const icon: FigmaIconData = FIGMA_ICONS[name];
  const natural = Math.max(icon.width, icon.height);
  const scale = (size ?? natural) / natural;
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
      <G transform={mirrored ? `translate(${icon.width},0) scale(-1,1)` : undefined}>
        {icon.paths.map((p, i) => (
          <Path
            key={i}
            d={p.d}
            fill={tint ?? p.fill}
            fillRule={p.fillRule}
            fillOpacity={p.fillOpacity}
          />
        ))}
      </G>
    </Svg>
  );
}

/**
 * A named wrapper with the `({ size, color })` signature the rest of the icon
 * set uses, so a screen can swap a hand-drawn glyph for the file's own without
 * changing its call site. Pass `selected` as well to make a two-state control
 * — the tab bar's idle and active variants are the only pair the file ships.
 */
export const figmaIcon = (
  idle: FigmaIconName,
  selected?: FigmaIconName,
  { mirrored }: { mirrored?: boolean } = {},
) =>
  function FigmaIconNamed({
    size,
    color,
    active,
  }: {
    size?: number;
    color?: string;
    active?: boolean;
  }) {
    return (
      <FigmaIcon
        name={active && selected ? selected : idle}
        size={size}
        color={color}
        mirrored={mirrored}
      />
    );
  };

export { FIGMA_ICONS };
export type { FigmaIconName };
