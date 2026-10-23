import { MIN_TOUCH_TARGET, PAGE_CHROME, PHYSICAL_BOX } from '@/constants/layout';
import { inlineHeaderHeight, scaledTitleLine } from '@/components/khazain/primitives/InlineHeader';
import { KhazainColors } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, useWindowDimensions, type ImageStyle } from 'react-native';
import { RAIL_EDGE_GUTTER } from '@/constants/responsive';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

/** The frame the art was drawn on, and the gutter its title sits inside. */
const ART_FRAME_WIDTH = 393;
const ART_GUTTER = 16;

/** A Figma node transform: [[m00 m01 m02], [m10 m11 m12]], parent coordinates. */
interface FigmaTransform {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A Figma node's transform places the node's ORIGIN (top-left) and rotates about
 * it; RN rotates a view about its CENTRE. So the box is placed by where the
 * rotated centre lands: `origin + R * (w/2, h/2)`, then pulled back by half its
 * size. The rotation is `atan2(m10, m00)`: Figma's y-down matrix with positive
 * angle turning clockwise on screen, which is the direction of RN's `rotate`
 * (checked against the corners in `__tests__/headerArtGeometry.test.tsx`).
 */
function fromFigma(t: FigmaTransform, w: number, h: number) {
  const cx = t.m02 + t.m00 * (w / 2) + t.m01 * (h / 2);
  const cy = t.m12 + t.m10 * (w / 2) + t.m11 * (h / 2);
  const deg = (Math.atan2(t.m10, t.m00) * 180) / Math.PI;
  return {
    left: round2(cx - w / 2),
    top: round2(cy - h / 2),
    width: round2(w),
    height: round2(h),
    deg: round2(deg),
  };
}

/** `Shape 2 copy` 96.42 x 93.82, rotated 115.32deg; y -16.87 on a tab root, -8.87 pushed. */
const LARGE_SIZE = { w: 96.4218978881836, h: 93.81590270996094 };
const LARGE_ROTATION = {
  m00: -0.42773738503456116,
  m01: -0.903903067111969,
  m02: 84.162109375,
  m10: 0.903903067111969,
  m11: -0.42773738503456116,
};
const LARGE_PAIR = fromFigma({ ...LARGE_ROTATION, m12: -16.87109375 }, LARGE_SIZE.w, LARGE_SIZE.h);
const LARGE_SINGLE = fromFigma({ ...LARGE_ROTATION, m12: -8.87109375 }, LARGE_SIZE.w, LARGE_SIZE.h);

const UPRIGHT = { m00: 1, m01: 0, m10: 0, m11: 1 };
/** The small corner per frame family: Sections / More (default), Library, Home (rotated 20.8deg). */
const SMALL_CORNERS = {
  default: fromFigma({ ...UPRIGHT, m02: 356, m12: 36 }, 37, 36),
  library: fromFigma({ ...UPRIGHT, m02: 356, m12: 43 }, 37, 36),
  home: fromFigma(
    {
      m00: 0.9347060322761536,
      m01: -0.3554218113422394,
      m02: 370.9365539550781,
      m10: 0.3554218113422394,
      m11: 0.9347060322761536,
      m12: 38,
    },
    25.84192657470703,
    25.143495559692383,
  ),
};

export type HeaderArtSmallCorner = keyof typeof SMALL_CORNERS;

/**
 * `Vector Smart Object` is 392 x 549 with a STRETCH paint of m11 1.4005 and
 * m12 0.1084 over a square image: it draws a 392 square from y = -0.1084 / 1.4005
 * * 549 = -42.5, and the rest of the node is empty. The art is therefore a square
 * of the window's width, not the 549pt box the node is. At the 393 frame that is
 * a 393 square against the file's 392 (within 1pt).
 */
const TILE_SIDE = 392;
const TILE_TOP = -42.5;

/**
 * Height of each frame family's opaque Header below the 45pt StatusBar (node
 * `Frame 4header`: 80 / 81 / 136 / 137 / 155 in total). Add the safe-area top inset.
 */
export const HEADER_BAND = Object.freeze({
  /** Frame reference only (More root 2102:2711, 80): `headerBandHeight` derives the app's own. */
  more: 35,
  /** Frame reference only (Contact, About, Dawah, 81): the app's row comes from `inlineHeaderHeight`. */
  inline: 36,
  /** Library and Sections roots, 2031:4659 / 2031:5675 (136). Frame literal: those titles are not font-scale driven here. */
  root: 91,
  /** Sub-screens with a search or tab row: lists, scholars, Archive 2558:1334 (137). */
  search: 92,
  /** Home 2001:940 (155). */
  home: 110,
});

export type HeaderBandKind = keyof typeof HEADER_BAND;

/**
 * The band covers the app's header, not the frame literal, where they differ:
 * - `inline`: `inlineHeaderHeight(fontScale)` (a 44pt row, the frame's is 36,
 *   growing with the title line up to CHROME_MAX_FONT_SCALE).
 * - `search`: the inline header plus what sits under it down to the frame's band
 *   end. The app's 44 row already absorbs the frame's 8pt above the search pill
 *   (pill at 44..84 in both), so only `HEADER_BAND.search - MIN_TOUCH_TARGET` = 48
 *   is added: 92 at scale 1, matching frame 2558:1334.
 * - `more`: PAGE_CHROME.headerPaddingTop plus the title line. `app/_layout.tsx`
 *   caps every Text at CHROME_MAX_FONT_SCALE and the More title does not
 *   override it, so the line is capped (8 + 28 = 36 at scale 1; the frame says 35).
 * `root` and `home` use the frame's literal height.
 */
export function headerBandHeight(insetTop: number, kind: HeaderBandKind, fontScale = 1): number {
  if (kind === 'inline') return insetTop + inlineHeaderHeight(fontScale);
  if (kind === 'search') {
    return insetTop + inlineHeaderHeight(fontScale) + (HEADER_BAND.search - MIN_TOUCH_TARGET);
  }
  if (kind === 'more') return insetTop + PAGE_CHROME.headerPaddingTop + scaledTitleLine(fontScale);
  return insetTop + HEADER_BAND[kind];
}

type Geometry = { tile: ImageStyle; cornerLarge: ImageStyle; cornerSmall: ImageStyle };
type Placed = ReturnType<typeof fromFigma>;

const rotated = (deg: number): ImageStyle =>
  deg === 0 ? {} : { transform: [{ rotate: `${deg}deg` }] };

/**
 * A phone anchors the box to one physical edge; `left` is already the
 * centre-corrected box. The large corner is left-anchored: the file places it
 * 84 from the frame's left edge, which is a fixed offset from that edge at any
 * width. The small corner is right-anchored: in every frame it is flush with the
 * right edge (356 + 37 = 393), so it hugs the physical right at every width.
 */
const phoneBox = (p: Placed, edge: 'left' | 'right' = 'left'): ImageStyle => ({
  position: 'absolute',
  ...(edge === 'left'
    ? { left: p.left }
    : { right: round2(ART_FRAME_WIDTH - p.left - p.width) }),
  top: p.top,
  width: p.width,
  height: p.height,
  ...rotated(p.deg),
});

/** Left anchors become right anchors as `393 - left - width`; the centre is unchanged. */
const tabletBox = (p: Placed, right: number): ImageStyle => ({
  position: 'absolute',
  right: round2(right + (ART_FRAME_WIDTH - p.left - p.width)),
  top: p.top,
  width: p.width,
  height: p.height,
  ...rotated(p.deg),
});

/** Content (title) edge from the physical right: the column's outer edge plus the screens' gutter. */
export function headerArtInset(readingInset: number, inset?: number): number {
  return inset ?? readingInset + RAIL_EDGE_GUTTER;
}

/**
 * Tile and corner placement.
 *
 * Phones: the tile is a square of the window width and the only part that
 * scales; the large corner is left-anchored (84 from the frame's left edge) and
 * the small corner right-anchored (flush with the right edge), both at their
 * drawn size. A tablet is wider than the frame and the tile is not seamless, so
 * nothing stretches: the tile stays at its drawn 392pt and everything anchors
 * from the physical right, where the page title is anchored. `inset` is the page
 * column's distance from the window's right edge; the art's own 16pt gutter is
 * subtracted so the frame's right edge lines up with the column.
 */
export function headerArtGeometry(
  isTablet: boolean,
  inset: number,
  opts: {
    /** Window width (phones: the tile is a square of this side). */
    width?: number;
    corners?: 'pair' | 'single' | 'none';
    smallCorner?: HeaderArtSmallCorner;
  } = {},
): Geometry {
  const large = opts.corners === 'single' ? LARGE_SINGLE : LARGE_PAIR;
  const small = SMALL_CORNERS[opts.smallCorner ?? 'default'];
  if (!isTablet) {
    const side = opts.width ?? ART_FRAME_WIDTH;
    return {
      tile: {
        position: 'absolute',
        left: 0,
        top: round2((TILE_TOP * side) / TILE_SIDE),
        width: side,
        height: side,
      },
      cornerLarge: phoneBox(large),
      cornerSmall: phoneBox(small, 'right'),
    };
  }
  const right = inset - ART_GUTTER;
  return {
    tile: { position: 'absolute', top: TILE_TOP, right, width: TILE_SIDE, height: TILE_SIDE },
    cornerLarge: tabletBox(large, right),
    cornerSmall: tabletBox(small, right),
  };
}

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
 * correct answer. `scripts/figma/extract-images.js` computes it once. The tile
 * is written opaque (it is the bottom layer); the corner keeps colour + alpha so
 * its ground stays transparent over the tile, and renders identically to the
 * blend on the page. Nothing here guesses an opacity.
 */
export function HeaderArt({
  corners = 'pair',
  tile = true,
  inset,
  smallCorner,
  bandHeight,
}: {
  corners?: 'pair' | 'single' | 'none';
  /**
   * Draw the geometric tile (default). The Mushaf reader splits one frame's art
   * over two layers: the page carries the tile (2349:829), the header overlay
   * only the corner (2349:982).
   */
  tile?: boolean;
  /**
   * Where the page's content (its title) starts, measured from the window's
   * physical right edge (tablets only; phones ignore it). Defaults to the
   * reading column's outer edge plus the screens' own gutter, which suits every
   * screen that pads by it; a full-width grid screen passes its own.
   */
  inset?: number;
  /** Geometry of the small corner for the frame family (default: Sections / More). */
  smallCorner?: HeaderArtSmallCorner;
  /**
   * Every frame fills its StatusBar and Header with an opaque `#F8F2ED`, painted
   * above the tile, so the tile is hidden for y < band; only the corner motifs
   * (blended OVERLAY) paint over it. Height from the screen top, i.e. the safe-area
   * inset plus the header's own height.
   */
  bandHeight?: number;
}) {
  const layout = useResponsiveLayout();
  const { width } = useWindowDimensions();
  const geo = headerArtGeometry(layout.isTablet, headerArtInset(layout.reading.inset, inset), {
    width,
    corners,
    smallCorner,
  });
  return (
    <View style={styles.layer} pointerEvents="none" accessible={false} accessibilityElementsHidden>
      {tile ? (
        <Image
          source={require('@/assets/figma/pattern-geometric-on-page.png')}
          style={geo.tile}
          contentFit="fill"
          cachePolicy="memory-disk"
        />
      ) : null}
      {bandHeight ? <View style={[styles.band, { height: bandHeight }]} /> : null}
      {corners === 'none' ? null : (
        <Image
          source={require('@/assets/figma/ornament-corner-overlay.png')}
          style={geo.cornerLarge}
          contentFit="fill"
          cachePolicy="memory-disk"
        />
      )}
      {corners === 'pair' ? (
        <Image
          source={require('@/assets/figma/ornament-corner-overlay.png')}
          style={geo.cornerSmall}
          contentFit="fill"
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    // The corner motifs are placed by physical offsets (`left` on phones,
    // `right` on tablets), and the file places them asymmetrically — 84 and
    // 356 across a 393 frame. Without a pinned direction, forceRTL maps
    // `left`/`right` to `start`/`end` and mirrors both.
    ...PHYSICAL_BOX,
    ...StyleSheet.absoluteFillObject,
    backgroundColor: KhazainColors.pageBg,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: KhazainColors.pageBg,
  },
});
