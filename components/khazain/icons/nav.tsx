import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { IconProps } from './index';

/**
 * The four bottom-navigation icons, as Figma component 2001:17457 ships them.
 *
 * The design uses the Vuesax set and carries **two variants of every icon** —
 * `vuesax/<name>` outline for the inactive tab and `vuesax/bulk/<name>` solid
 * for the active one. The app previously drew a single icon per tab, and three
 * of the four were the wrong glyph: a bookmark where the design has an open
 * book, a hamburger where it has three circles, and a four-square grid where
 * it has two squares and two circles on the diagonal.
 *
 * These live apart from `icons/index.tsx` on purpose: `BookmarkIcon` there is
 * the save affordance and still means "saved", so it must not be redrawn to
 * satisfy the navigation.
 */
export type NavIconProps = IconProps & {
  /** Draw the solid `bulk` variant the design uses for the active tab. */
  active?: boolean;
  /**
   * Accent for the active variant's cut-out. Only the home icon has one, but
   * it stays on the shared type because `CustomTabBar` renders the four
   * through one component slot and passes the same props to each.
   */
  accentColor?: string;
};

const VIEW_BOX = '0 0 24 24';

// Same fallback as `icons/index.tsx`, so an omitted `color` cannot render an
// invisible glyph.
const defaults = (size?: number, color?: string) => ({
  size: size ?? 24,
  color: color ?? '#281E13',
});

/** The 24x24 frame every nav icon draws into. */
function NavSvg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX} fill="none">
      {children}
    </Svg>
  );
}

/** `vuesax/home-2` — a house; solid with a door bar when active. */
export function NavHomeIcon({ size, color, strokeWidth = 1.6, active, accentColor }: NavIconProps) {
  const d = defaults(size, color);
  const house = 'M3.5 9.8 11 3.9a1.6 1.6 0 0 1 2 0l7.5 5.9a2 2 0 0 1 .8 1.6v7.4a2.2 2.2 0 0 1-2.2 2.2H4.9a2.2 2.2 0 0 1-2.2-2.2v-7.4a2 2 0 0 1 .8-1.6Z';
  return (
    <NavSvg size={d.size}>
      <Path
        d={house}
        fill={active ? d.color : 'none'}
        stroke={active ? 'none' : d.color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {active ? (
        <Rect x={11} y={13.4} width={2} height={4.6} rx={1} fill={accentColor ?? d.color} />
      ) : (
        <Path d="M12 15.5v2.5" stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
    </NavSvg>
  );
}

/** `vuesax/book` — an open book with two ruled lines on the near page. */
export function NavLibraryIcon({ size, color, strokeWidth = 1.6, active }: NavIconProps) {
  const d = defaults(size, color);
  // Two pages meeting at a central spine, outer edges vertical, top and bottom
  // curving toward the spine.
  const left = 'M12 6.7C10.2 5.5 7.9 4.9 5.2 4.9a1 1 0 0 0-1 1v11.2a1 1 0 0 0 1 1c2.7 0 5 .6 6.8 1.8Z';
  const right = 'M12 6.7c1.8-1.2 4.1-1.8 6.8-1.8a1 1 0 0 1 1 1v11.2a1 1 0 0 1-1 1c-2.7 0-5 .6-6.8 1.8Z';
  return (
    <NavSvg size={d.size}>
      <Path
        d={left}
        fill={active ? d.color : 'none'}
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d={right}
        fill={active ? d.color : 'none'}
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {active ? null : (
        <>
          <Path d="M7.1 9.2h3" stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M7.1 12h3" stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      )}
    </NavSvg>
  );
}

/**
 * `vuesax/category-2` — a 2 x 2 group whose top-left and bottom-right are
 * circles and whose other two are rounded squares.
 */
export function NavSectionsIcon({ size, color, strokeWidth = 1.6, active }: NavIconProps) {
  const d = defaults(size, color);
  const fill = active ? d.color : 'none';
  const stroke = active ? 'none' : d.color;
  const r = 4.35;
  return (
    <NavSvg size={d.size}>
      <Circle cx={7.05} cy={7.05} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <Rect
        x={12.7} y={2.7} width={8.7} height={8.7} rx={2.6}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      />
      <Rect
        x={2.7} y={12.7} width={8.7} height={8.7} rx={2.6}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      />
      <Circle cx={17.05} cy={17.05} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </NavSvg>
  );
}

/** `vuesax/more-2` — three circles in an upward triangle. */
export function NavMoreIcon({ size, color, strokeWidth = 1.6, active }: NavIconProps) {
  const d = defaults(size, color);
  const fill = active ? d.color : 'none';
  const stroke = active ? 'none' : d.color;
  const r = 3.1;
  return (
    <NavSvg size={d.size}>
      <Circle cx={12} cy={7.2} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <Circle cx={6.8} cy={16.8} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <Circle cx={17.2} cy={16.8} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </NavSvg>
  );
}
