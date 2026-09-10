import {
  BODY_FAMILY,
  CALLIGRAPHY_FAMILY,
  DISPLAY_FAMILY,
  MIN_BODY_SIZE,
  TEXT_ROLES,
  textStyle,
  type TextRole,
} from '@/constants/typography';
import { REGISTERED_FONT_FAMILIES } from '@/constants/fonts';
import { execFileSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * The Home screen and the navigation are the surfaces migrated onto the scale
 * so far. A raw `fontFamily` or `fontSize` literal reappearing in one of them
 * is the drift starting again, so it fails rather than merely being untidy.
 */
function rawTypographyLiteralsIn(dirs: string[]): string[] {
  const output = execFileSync(
    'grep',
    ['-rnE', "(fontFamily:|fontSize:|fontWeight:) *['\"0-9]", ...dirs],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  ).trim();
  return output ? output.split('\n') : [];
}

/**
 * The design uses exactly two Arabic faces and only one style of each:
 * TheSansArabic Bold to label, TheMixArab Regular to read. These assertions
 * are the rule itself — a role that breaks one of them is the drift the scale
 * exists to stop.
 */
const roles = Object.keys(TEXT_ROLES) as TextRole[];

describe('type scale', () => {
  it('only names families the font registry carries', () => {
    const registered = new Set<string>(REGISTERED_FONT_FAMILIES);
    roles.forEach((role) => {
      expect([role, registered.has(TEXT_ROLES[role].fontFamily)]).toEqual([role, true]);
    });
  });

  it('pairs TheSansArabic with Bold and nothing else', () => {
    roles
      .filter((role) => TEXT_ROLES[role].fontFamily === DISPLAY_FAMILY)
      .forEach((role) => expect([role, TEXT_ROLES[role].fontWeight]).toEqual([role, '700']));
  });

  it('pairs TheMixArab with Regular and nothing else', () => {
    roles
      .filter((role) => TEXT_ROLES[role].fontFamily === BODY_FAMILY)
      .forEach((role) => expect([role, TEXT_ROLES[role].fontWeight]).toEqual([role, '400']));
  });

  it('uses both faces, roughly as evenly as the design does', () => {
    const families = roles.map((role) => TEXT_ROLES[role].fontFamily);
    expect(families).toContain(DISPLAY_FAMILY);
    expect(families).toContain(BODY_FAMILY);
  });

  it('sets every size the design actually states', () => {
    // Sizes read out of docs/KHAZAYIN.fig across 1,153 text nodes.
    const FIGMA_SANS = [10, 12, 14, 16, 20, 24, 28, 32, 48];
    const FIGMA_MIX = [5.75, 6, 8, 9, 12, 14, 16, 18, 20, 24, 28, 32, 34];
    roles.forEach((role) => {
      const { fontFamily, fontSize } = TEXT_ROLES[role];
      if (fontFamily === DISPLAY_FAMILY) expect([role, FIGMA_SANS.includes(fontSize)]).toEqual([role, true]);
      if (fontFamily === BODY_FAMILY) expect([role, FIGMA_MIX.includes(fontSize)]).toEqual([role, true]);
    });
  });

  it('never sets prose below the legibility floor', () => {
    // The design's 5.75/6/8/9pt prose is artwork, not readable text.
    roles
      .filter((role) => TEXT_ROLES[role].fontFamily === BODY_FAMILY)
      .forEach((role) =>
        expect([role, TEXT_ROLES[role].fontSize >= MIN_BODY_SIZE]).toEqual([role, true]),
      );
  });

  it('gives every role a line height that leaves room for Arabic diacritics', () => {
    roles.forEach((role) => {
      const { fontSize, lineHeight } = TEXT_ROLES[role];
      expect([role, lineHeight >= fontSize * 1.1]).toEqual([role, true]);
    });
  });

  it('keeps the calligraphic face out of the two text faces', () => {
    expect(CALLIGRAPHY_FAMILY).not.toBe(DISPLAY_FAMILY);
    expect(CALLIGRAPHY_FAMILY).not.toBe(BODY_FAMILY);
  });

  it('orders the display roles by size', () => {
    const ladder: TextRole[] = [
      'displayLarge', 'display', 'screenTitle', 'heroTitle', 'sectionTitle', 'cardTitle', 'label', 'labelSmall',
    ];
    const sizes = ladder.map((role) => TEXT_ROLES[role].fontSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });
});

describe('Home is on the scale', () => {
  it('declares no raw font literals in the Home components, screen or tab bar', () => {
    let found: string[] = [];
    try {
      found = rawTypographyLiteralsIn([
        'components/khazain/home',
        'app/(tabs)/index.tsx',
        'components/khazain/primitives/CustomTabBar.tsx',
      ]);
    } catch {
      // grep exits 1 when it matches nothing, which is the passing case.
      found = [];
    }
    expect(found).toEqual([]);
  });
});

describe('textStyle', () => {
  it('applies RTL direction to every role', () => {
    roles.forEach((role) => {
      expect(textStyle(role).writingDirection).toBe('rtl');
    });
  });

  it('carries the role family, size and weight through', () => {
    expect(textStyle('sectionTitle')).toMatchObject(TEXT_ROLES.sectionTitle);
  });

  it('lets a caller set colour and alignment without touching the pairing', () => {
    const style = textStyle('body', { color: '#123456', textAlign: 'center' });
    expect(style.color).toBe('#123456');
    expect(style.textAlign).toBe('center');
    expect(style.fontFamily).toBe(TEXT_ROLES.body.fontFamily);
    expect(style.fontSize).toBe(TEXT_ROLES.body.fontSize);
    expect(style.fontWeight).toBe(TEXT_ROLES.body.fontWeight);
  });
});
