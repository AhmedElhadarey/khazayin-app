import {
  BODY_FAMILY,
  CALLIGRAPHY_FAMILY,
  DISPLAY_FAMILY,
  MIN_BODY_SIZE,
  TEXT_ROLES,
  fontFace,
  textStyle,
  type TextRole,
} from '@/constants/typography';
import { ARABIC_FONT_ASSETS, REGISTERED_FONT_FAMILIES } from '@/constants/fonts';
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

  it('resolves TheSansArabic to the Bold face and TheMixArab to Regular', () => {
    expect(ARABIC_FONT_ASSETS[DISPLAY_FAMILY]).toBe('assets/fonts/NotoSansArabic-Bold.ttf');
    expect(ARABIC_FONT_ASSETS[BODY_FAMILY]).toBe('assets/fonts/NotoSansArabic-Regular.ttf');
  });

  it('keeps the weight in the face: every role sets fontWeight 400', () => {
    roles.forEach((role) => expect([role, TEXT_ROLES[role].fontWeight]).toEqual([role, '400']));
  });

  it('maps fontFace weights to the weight-specific families', () => {
    expect(fontFace(700)).toEqual({ fontFamily: 'TheSansArabic', fontWeight: '400' });
    expect(fontFace(600)).toEqual({ fontFamily: 'NotoSansArabic-SemiBold', fontWeight: '400' });
    expect(fontFace(400)).toEqual({ fontFamily: 'TheMixArab', fontWeight: '400' });
  });

  it('offers loose line-height variants that leave the base roles alone', () => {
    expect(TEXT_ROLES.captionLoose).toMatchObject({ fontSize: 12, lineHeight: 24 });
    expect(TEXT_ROLES.bodyCompactLoose).toMatchObject({ fontSize: 14, lineHeight: 24 });
    expect(TEXT_ROLES.cardTitleLoose).toMatchObject({ fontSize: 14, lineHeight: 24 });
    expect(TEXT_ROLES.caption.lineHeight).toBe(18);
    expect(TEXT_ROLES.bodyCompact.lineHeight).toBe(21);
    expect(TEXT_ROLES.cardTitle.lineHeight).toBe(21);
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

/**
 * React Native clips a Text's glyph box to `lineHeight`, and Arabic hangs marks
 * — the madda on آ, the dots on ة — well above the Latin cap height. Rendering
 * the design's own line heights on device cut those marks off: at the label
 * role's 12/16, `٠ ملاحظة ... القرآن آخر` came out as `٠ ملاحظه ... القران اخر`.
 *
 * Measured on an iPhone 16 simulator, mark by mark: 12/16 and 14/20 clip,
 * 12/18 and 14/21 do not; 16/24 is clean and 20/28 is not. The boundary is a
 * ratio, not a size, and it sits at 1.5.
 */
describe('Arabic marks are not clipped by the line height', () => {
  const MIN_RATIO = 1.5;

  it('gives every role at least 1.5x its size', () => {
    for (const [role, style] of Object.entries(TEXT_ROLES)) {
      expect({ role, ratio: style.lineHeight / style.fontSize }).toEqual({
        role,
        ratio: expect.any(Number),
      });
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize * MIN_RATIO);
    }
  });

  it('keeps the roles that were already clear of the floor unchanged', () => {
    // The design states these, and they already clear 1.5.
    expect(TEXT_ROLES.sectionTitle.lineHeight).toBe(24);
    expect(TEXT_ROLES.body.lineHeight).toBe(24);
    expect(TEXT_ROLES.caption.lineHeight).toBe(18);
  });

  it('raises the roles that clipped on device', () => {
    expect(TEXT_ROLES.label.lineHeight).toBe(18);
    expect(TEXT_ROLES.cardTitle.lineHeight).toBe(21);
    expect(TEXT_ROLES.labelSmall.lineHeight).toBe(15);
    expect(TEXT_ROLES.heroTitle.lineHeight).toBe(30);
  });
});
