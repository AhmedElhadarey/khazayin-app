import React from 'react';
import { figmaIcon } from './FigmaIcon';
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

export const NavHomeIcon = figmaIcon('NavHome', 'NavHomeActive');
export const NavLibraryIcon = figmaIcon('NavLibrary', 'NavLibraryActive');
export const NavSectionsIcon = figmaIcon('NavSections', 'NavSectionsActive');
export const NavMoreIcon = figmaIcon('NavMore', 'NavMoreActive');
