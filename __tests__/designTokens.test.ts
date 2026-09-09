import { readFileSync } from 'fs';
import path from 'path';

import { CARD_DENSITY, TAB_BAR } from '@/constants/layout';
import { FIGMA_TOKENS, PATTERN_COVERAGES } from '@/constants/figmaTokens';
import { KhazainColors, KhazainShadows } from '@/constants/theme';

const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Locks the palette the audit measured off the Figma mobile page. A drifting
 * hex here is invisible in a screenshot until several screens have shipped
 * with it.
 */
describe('Figma colour tokens', () => {
  it('locks the navigation navy and canonical page background', () => {
    expect(FIGMA_TOKENS.navigationNavy).toBe('#184B76');
    expect(FIGMA_TOKENS.pageBackground).toBe('#F8F2ED');
  });

  it('locks the card fill and a warm, subtle border rather than a grey outline', () => {
    expect(FIGMA_TOKENS.cardFill).toBe('#FCFAF8');
    expect(FIGMA_TOKENS.cardBorder).toBe('rgba(141, 107, 52, 0.10)');
  });

  it('locks the ink and gold accents', () => {
    expect(FIGMA_TOKENS.inkTitle).toBe('#281E13');
    expect(FIGMA_TOKENS.goldBar).toBe('#C1A584');
    expect(FIGMA_TOKENS.goldAccent).toBe('#A88051');
  });

  it('locks the active tab fill and indicator', () => {
    expect(FIGMA_TOKENS.activeTabFill).toBe('rgba(215, 185, 149, 0.16)');
    expect(FIGMA_TOKENS.activeTabIndicator).toBe('#C1A584');
  });

  it('keeps the shipping theme in step with the locked tokens', () => {
    expect(KhazainColors.navy800).toBe(FIGMA_TOKENS.navigationNavy);
    expect(KhazainColors.pageBg).toBe(FIGMA_TOKENS.pageBackground);
    expect(KhazainColors.cardBg).toBe(FIGMA_TOKENS.cardFill);
    expect(KhazainColors.cardBorder).toBe(FIGMA_TOKENS.cardBorder);
    expect(KhazainColors.inkTitle).toBe(FIGMA_TOKENS.inkTitle);
    expect(KhazainColors.goldBar).toBe(FIGMA_TOKENS.goldBar);
    expect(KhazainColors.goldAccent).toBe(FIGMA_TOKENS.goldAccent);
    expect(TAB_BAR.background).toBe(FIGMA_TOKENS.navigationNavy);
    expect(TAB_BAR.activeFill).toBe(FIGMA_TOKENS.activeTabFill);
    expect(TAB_BAR.indicatorColor).toBe(FIGMA_TOKENS.activeTabIndicator);
  });
});

describe('card elevation', () => {
  it('keeps Android elevation low enough not to draw a separator', () => {
    expect(KhazainShadows.card.elevation).toBe(CARD_DENSITY.cardElevation);
    expect(KhazainShadows.input.elevation).toBeLessThanOrEqual(1);
  });
});

describe('ornament coverage', () => {
  it('offers a corner, header, and full-frame treatment', () => {
    expect([...PATTERN_COVERAGES]).toEqual(['corner', 'header', 'full']);
  });

  it('keeps the corner treatment fainter than a full-frame tile', () => {
    expect(FIGMA_TOKENS.ornamentOpacity.corner).toBeLessThan(
      FIGMA_TOKENS.ornamentOpacity.full,
    );
  });

  it('no longer tiles a full-screen ornament across the audited routes', () => {
    // More, Contact, About, Dawah, Archive, and the settings screens each
    // showed a strong full-screen tile the Figma frames do not have.
    const routes = [
      'app/(tabs)/more/index.tsx',
      'app/(tabs)/more/about.tsx',
      'app/(tabs)/more/contact.tsx',
      'app/(tabs)/more/archive.tsx',
      'app/(tabs)/more/settings.tsx',
      'app/(tabs)/more/settings-progress.tsx',
      'app/(tabs)/sections/dawah.tsx',
    ];
    routes.forEach((route) => {
      const source = readFileSync(path.join(REPO_ROOT, route), 'utf8');
      const usesOrnament = source.includes('<OrnamentPattern');
      if (!usesOrnament) return;
      expect([route, source.includes('coverage="corner"')]).toEqual([route, true]);
      expect([route, source.includes('absoluteFillObject} opacity={0.08}')]).toEqual([
        route,
        false,
      ]);
    });
  });
});

describe('Mushaf surface', () => {
  it('keeps the specialised reader colours local to the reader screen', () => {
    const source = readFileSync(path.join(REPO_ROOT, 'app/(tabs)/sections/mushaf.tsx'), 'utf8');
    expect(source).toContain('const FOOTER_BG');
    // ...and out of the shared palette.
    expect(Object.keys(KhazainColors)).not.toContain('mushafFooterBg');
  });
});
