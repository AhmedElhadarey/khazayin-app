import { FigmaIcon, type FigmaIconName } from '@/components/khazain/icons/FigmaIcon';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Row glyphs for the settings screens, which have no Figma frame.
 *
 * Where the file carries a mark for the row's subject the row draws it
 * (`FigmaIcon`, navy800, `CARD_DENSITY.moreGlyphSize`) — the same family the More rows use:
 *   - about          MoreAbout        2106:2291
 *   - language       MoreWeb          2106:2219
 *   - notifications  LibraryReminders 2095:1608
 *   - wird goal      LibraryWird      2095:1620
 *   - export notes   LibraryNotes     2095:1632
 * The rest (qira'a, reciter, font size, privacy, cache, restore, prayer,
 * community, info) have no mark in the file, so they are drawn here in the
 * file family's bulk style: a solid shape plus a 40% secondary, filled, no
 * 1.5pt outline. They are 24-unit drawings scaled to `CARD_DENSITY.moreGlyphSize`.
 */
const C = KhazainColors.navy800;
const SECONDARY = 0.4;

function fileGlyph(name: FigmaIconName) {
  return <FigmaIcon name={name} size={CARD_DENSITY.moreGlyphSize} color={C} />;
}

function Drawn({ children }: { children: React.ReactNode }) {
  return (
    <Svg width={CARD_DENSITY.moreGlyphSize} height={CARD_DENSITY.moreGlyphSize} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export const AboutGlyph = () => fileGlyph('MoreAbout');
/** The file's «i» again, for rows that are not About (developer and moderation rows). */
export const InfoGlyph = () => fileGlyph('MoreAbout');
export const LanguageGlyph = () => fileGlyph('MoreWeb');
export const NotificationsGlyph = () => fileGlyph('LibraryReminders');
export const WirdGoalGlyph = () => fileGlyph('LibraryWird');
export const ExportNotesGlyph = () => fileGlyph('LibraryNotes');

export function QiraaGlyph() {
  return (
    <Drawn>
      <Path d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" fill={C} opacity={SECONDARY} />
      <Path d="M14 3l5 5h-4a1 1 0 01-1-1V3z" fill={C} />
      <Path d="M9 13h7M9 17h5" stroke={C} strokeWidth={2} strokeLinecap="round" />
    </Drawn>
  );
}

export function ReciterGlyph() {
  return (
    <Drawn>
      <Circle cx={12} cy={8} r={4} fill={C} />
      <Path d="M4 20a8 8 0 0116 0v.5H4V20z" fill={C} opacity={SECONDARY} />
    </Drawn>
  );
}

export function FontSizeGlyph() {
  return (
    <Drawn>
      <Path d="M3 6h10v2.2H9.1V19H6.9V8.2H3V6z" fill={C} />
      <Path d="M14 11h7v1.8h-2.55V19h-1.9v-6.2H14V11z" fill={C} opacity={SECONDARY} />
    </Drawn>
  );
}

export function PrivacyGlyph() {
  return (
    <Drawn>
      <Path d="M12 2.5l8 3v6c0 4.7-3.4 8.6-8 10-4.6-1.4-8-5.3-8-10v-6l8-3z" fill={C} opacity={SECONDARY} />
      <Path d="M8.5 12l2.5 2.5L15.5 10" stroke={C} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Drawn>
  );
}

export function RestoreGlyph() {
  return (
    <Drawn>
      <Path d="M12 3a9 9 0 11-8.5 6" stroke={C} strokeWidth={2} strokeLinecap="round" opacity={SECONDARY} />
      <Path d="M3 3.5l.5 5.5 5.5-.5L3 3.5z" fill={C} />
      <Circle cx={12} cy={12} r={2.5} fill={C} />
    </Drawn>
  );
}

export function CacheGlyph() {
  return (
    <Drawn>
      <Path d="M6 8h12l-1 11a2 2 0 01-2 2H9a2 2 0 01-2-2L6 8z" fill={C} opacity={SECONDARY} />
      <Path d="M4 6h16v1.8H4V6zM9 4a1 1 0 011-1h4a1 1 0 011 1v2H9V4z" fill={C} />
    </Drawn>
  );
}

export function PrayerTimesGlyph() {
  return (
    <Drawn>
      <Path d="M12 2c2 2 3 3.5 3 5a3 3 0 01-6 0c0-1.5 1-3 3-5z" fill={C} />
      <Path d="M4 21v-7a8 8 0 0116 0v7H4z" fill={C} opacity={SECONDARY} />
      <Path d="M10 21v-4a2 2 0 014 0v4h-4z" fill={C} />
    </Drawn>
  );
}

export function CommunityGlyph() {
  return (
    <Drawn>
      <Circle cx={16.5} cy={8} r={3} fill={C} opacity={SECONDARY} />
      <Circle cx={9} cy={8} r={3.5} fill={C} />
      <Path d="M2.5 20a6.5 6.5 0 0113 0v.5h-13V20z" fill={C} opacity={SECONDARY} />
      <Path d="M17.5 14.2A6.5 6.5 0 0121.5 20.5H18a8 8 0 00-2-5.2l1.5-1.1z" fill={C} opacity={SECONDARY} />
    </Drawn>
  );
}

/** A clock for the wird reminder time (no mark in the file). */
export function ClockGlyph() {
  return (
    <Drawn>
      <Circle cx={12} cy={12} r={9.5} fill={C} opacity={SECONDARY} />
      <Path d="M12 7v5l3.5 2" stroke={C} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Drawn>
  );
}
