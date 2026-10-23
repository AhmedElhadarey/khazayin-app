/**
 * HeaderArt geometry, pinned against the node graph of docs/KHAZAYIN.fig.
 *
 * Large corner `Shape 2 copy` (96.42 x 93.82): rotation matrix
 * [-0.4277 -0.9039; 0.9039 -0.4277] (115.32deg, det 1) at origin (84.16, -16.87)
 * for a tab root, (84.16, -8.87) for a pushed screen. Figma rotates about the
 * node origin; RN about the view centre, so the box is placed by its centre.
 * Tile `Vector Smart Object`: 392 x 549 node, IMAGE STRETCH paint with
 * m11 1.4005 / m12 0.1084 on a square image -> a 392 square starting at y -42.5.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { HeaderArt, headerArtGeometry, headerBandHeight } from '@/components/khazain/patterns/HeaderArt';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => {
    root: { findAll: (p: (n: any) => boolean) => any[] };
    toJSON: () => any;
    unmount: () => void;
  };
};

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const rot = (s: any) => parseFloat(s.transform[0].rotate);
const centre = (s: any) => ({ x: s.left + s.width / 2, y: s.top + s.height / 2 });

describe('large corner', () => {
  it('rotates 115.32deg about the centre the file implies (tab root)', () => {
    const s: any = headerArtGeometry(false, 16).cornerLarge;
    expect(s.width).toBeCloseTo(96.42, 1);
    expect(s.height).toBeCloseTo(93.82, 1);
    expect(rot(s)).toBeCloseTo(115.32, 1);
    expect(centre(s).x).toBeCloseTo(21.14, 1);
    expect(centre(s).y).toBeCloseTo(6.65, 1);
    expect(s.left).toBeCloseTo(-27.07, 1);
    expect(s.top).toBeCloseTo(-40.26, 1);
  });

  it('sits 8pt lower on pushed screens', () => {
    const s: any = headerArtGeometry(false, 16, { corners: 'single' }).cornerLarge;
    expect(centre(s).y).toBeCloseTo(14.65, 1);
    expect(centre(s).x).toBeCloseTo(21.14, 1);
    expect(rot(s)).toBeCloseTo(115.32, 1);
  });

  it('lands the rotated corners where the file puts them', () => {
    const s: any = headerArtGeometry(false, 16).cornerLarge;
    const c = centre(s);
    const a = (rot(s) * Math.PI) / 180;
    // RN rotates clockwise on screen (y down): x' = x cos - y sin, y' = x sin + y cos
    const pt = (dx: number, dy: number) => ({
      x: c.x + dx * Math.cos(a) - dy * Math.sin(a),
      y: c.y + dx * Math.sin(a) + dy * Math.cos(a),
    });
    const hw = s.width / 2;
    const hh = s.height / 2;
    const origin = pt(-hw, -hh);
    expect(origin.x).toBeCloseTo(84.16, 0);
    expect(origin.y).toBeCloseTo(-16.87, 0);
    const right = pt(hw, -hh);
    expect(right.x).toBeCloseTo(43, 0);
    expect(right.y).toBeCloseTo(70, 0);
  });

  it('keeps the centre when anchored from the right on tablets', () => {
    const g: any = headerArtGeometry(true, 156).cornerLarge;
    expect(g).not.toHaveProperty('left');
    // right = (156 - 16) + (393 - (-27.07) - 96.42)
    expect(g.right).toBeCloseTo(140 + 393 + 27.07 - 96.42, 1);
    expect(g.top).toBeCloseTo(-40.26, 1);
    expect(rot(g)).toBeCloseTo(115.32, 1);
  });
});

describe('small corner', () => {
  it('default is the Sections / More 37x36 at (356, 36), unrotated', () => {
    const s: any = headerArtGeometry(false, 16).cornerSmall;
    expect(s).toMatchObject({ right: 0, top: 36, width: 37, height: 36 });
    expect(s).not.toHaveProperty('left');
    expect(s.transform).toBeUndefined();
  });

  it('library is 37x36 at (356, 43)', () => {
    const s: any = headerArtGeometry(false, 16, { smallCorner: 'library' }).cornerSmall;
    expect(s).toMatchObject({ right: 0, top: 43, width: 37, height: 36 });
  });

  it('home is 25.84x25.14, rotated 20.8deg about its origin (370.94, 38)', () => {
    const s: any = headerArtGeometry(false, 16, { smallCorner: 'home' }).cornerSmall;
    expect(s.width).toBeCloseTo(25.84, 1);
    expect(s.height).toBeCloseTo(25.14, 1);
    expect(rot(s)).toBeCloseTo(20.8, 1);
    // centre = origin + R (w/2, h/2)
    const cx = 370.94 + 0.9347 * 12.92 - 0.3554 * 12.57;
    // right-anchored: centre x = 393 - right - width / 2
    expect(393 - s.right - s.width / 2).toBeCloseTo(cx, 1);
    expect(s.top + s.height / 2).toBeCloseTo(38 + 0.3554 * 12.92 + 0.9347 * 12.57, 1);
  });

  it.each([320, 360, 393, 480])('is flush with the right edge of a %i window', (w) => {
    for (const v of ['default', 'library'] as const) {
      const s: any = headerArtGeometry(false, 16, { width: w, smallCorner: v }).cornerSmall;
      expect(s).not.toHaveProperty('left');
      expect(s.right).toBe(0); // box right edge == window width
    }
    const h: any = headerArtGeometry(false, 16, { width: w, smallCorner: 'home' }).cornerSmall;
    expect(h.right).toBeCloseTo(393 - (370.94 + 0.9347 * 12.92 - 0.3554 * 12.57) - h.width / 2, 1);
    expect(h.right).toBeGreaterThanOrEqual(0);
  });

  it('keeps the large corner on the physical left at every width', () => {
    for (const w of [320, 393, 480]) {
      const s: any = headerArtGeometry(false, 16, { width: w }).cornerLarge;
      expect(s.left).toBeCloseTo(-27.07, 1);
      expect(s).not.toHaveProperty('right');
    }
  });

  it('tablet right anchor preserves the default box', () => {
    const s: any = headerArtGeometry(true, 156).cornerSmall;
    expect(s).toMatchObject({ right: 140, top: 36, width: 37, height: 36 });
  });
});

describe('tile', () => {
  it('draws the 392 square at -42 at the frame width', () => {
    const t: any = headerArtGeometry(false, 16, { width: 393 }).tile;
    expect(Math.abs(t.width - 392)).toBeLessThanOrEqual(1);
    expect(Math.abs(t.height - 392)).toBeLessThanOrEqual(1);
    expect(Math.abs(t.top + 42)).toBeLessThanOrEqual(1);
    expect(t.left).toBe(0);
  });

  it('scales with the window on phones', () => {
    const lo: any = headerArtGeometry(false, 16, { width: 320 }).tile;
    const hi: any = headerArtGeometry(false, 16, { width: 480 }).tile;
    expect(lo.width).toBe(320);
    expect(lo.height).toBe(320);
    expect(lo.top).toBeCloseTo((-42.5 * 320) / 392, 0);
    expect(hi.width).toBe(480);
    expect(hi.top).toBeCloseTo((-42.5 * 480) / 392, 0);
  });

  it('stays 392 square and right-anchored on tablets', () => {
    const t: any = headerArtGeometry(true, 156, { width: 834 }).tile;
    expect(t).toMatchObject({ top: -42.5, right: 140, width: 392, height: 392 });
    expect(t).not.toHaveProperty('left');
  });
});

describe('HeaderArt render order', () => {
  const render = (props: React.ComponentProps<typeof HeaderArt>) => {
    let r: ReturnType<typeof create>;
    act(() => {
      r = create(<HeaderArt {...props} />);
    });
    return r!;
  };
  const layer = (r: ReturnType<typeof create>) => r.toJSON();

  it('paints no band by default', () => {
    const r = render({});
    expect(layer(r).children).toHaveLength(3); // tile, large, small
    act(() => r.unmount());
  });

  it('paints the band after the tile and before the corners', () => {
    const r = render({ bandHeight: 80 });
    const kids = layer(r).children;
    expect(kids).toHaveLength(4);
    const flat = StyleSheet.flatten(kids[1].props.style);
    expect(kids[0].props.source).toBeDefined();
    expect(kids[1].props.source).toBeUndefined();
    expect(flat).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, height: 80 });
    expect(kids[2].props.source).toBeDefined();
    expect(kids[3].props.source).toBeDefined();
    act(() => r.unmount());
  });
});

describe('header band heights follow the app header, not the frame literal', () => {
  it.each([
    ['root', 136],
    ['home', 155],
  ] as const)('%s = %i at the frame inset', (kind, total) => {
    expect(headerBandHeight(45, kind)).toBe(total);
  });

  it('inline covers the 44pt InlineHeader row at scale 1, growing to the 1.2 cap', () => {
    expect(headerBandHeight(45, 'inline', 1)).toBe(45 + 44);
    expect(headerBandHeight(45, 'inline', 1.7)).toBeCloseTo(45 + 16 + 28 * 1.2, 5);
    expect(headerBandHeight(45, 'inline', 1.7)).toBe(headerBandHeight(45, 'inline', 1.2));
  });

  it('search is the inline header plus the 56pt the frame stacks under it', () => {
    expect(headerBandHeight(45, 'search', 1)).toBe(headerBandHeight(45, 'inline', 1) + 56);
  });

  it('more tracks the uncapped title line', () => {
    expect(headerBandHeight(45, 'more', 1)).toBe(45 + 8 + 28);
    expect(headerBandHeight(45, 'more', 1.7)).toBeCloseTo(45 + 8 + 28 * 1.7, 5);
  });
});
