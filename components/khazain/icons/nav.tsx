import React from 'react';
import { FigmaIcon, type FigmaIconName } from './FigmaIcon';
import type { IconProps } from './index';

/**
 * The four bottom-navigation icons, as the `navigation` component (2001:17485)
 * ships them.
 *
 * The design carries **two variants of every tab** — `vuesax/<name>` outline
 * for the inactive state and `vuesax/bulk/<name>` solid for the selected one —
 * and both now come out of the file rather than being redrawn. The app used to
 * draw a single glyph per tab, and three of the four were the wrong shape: a
 * bookmark where the design has an open book, a hamburger where it has three
 * circles, and a four-square grid where it has two squares and two circles on
 * the diagonal.
 *
 * These live apart from `icons/index.tsx` on purpose: `BookmarkIcon` there is
 * the save affordance and still means "saved", so it must not be redrawn to
 * satisfy the navigation.
 */
export type NavIconProps = IconProps & {
  /** Draw the solid `bulk` variant the design uses for the active tab. */
  active?: boolean;
};

const tab = (idle: FigmaIconName, selected: FigmaIconName) =>
  function NavIcon({ size = 24, color, active }: NavIconProps) {
    return <FigmaIcon name={active ? selected : idle} size={size} color={color} />;
  };

export const NavHomeIcon = tab('NavHome', 'NavHomeActive');
export const NavLibraryIcon = tab('NavLibrary', 'NavLibraryActive');
export const NavSectionsIcon = tab('NavSections', 'NavSectionsActive');
export const NavMoreIcon = tab('NavMore', 'NavMoreActive');
