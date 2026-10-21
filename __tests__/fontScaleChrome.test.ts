import fs from 'fs';
import path from 'path';

/**
 * Chrome text must cap the OS font-size multiplier.
 *
 * Android multiplies every `fontSize` by the system font scale and this app
 * had no opt-out anywhere. It was found on a real Galaxy A30 (SM-A305F,
 * Android 11) reporting `font_scale = 1.7` with Screen zoom also raised
 * (density override 450 → 384dp): the 12pt nav label became ~20pt inside a
 * fixed 49pt item, truncating الرئيسية to الرئيس… and pushing the icon out of
 * its box. The library stat captions spilled off their cards and the home
 * chips truncated the same way.
 *
 * Emulator sweeps missed it because they only ever ran at scale 1.0, and the
 * later reproductions stopped at 1.5 — below the 1.7 Samsung actually allows.
 *
 * Content text is deliberately excluded: raising the system font size SHOULD
 * grow the Quran text, prose and titles.
 */
const ROOT = path.resolve(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const CHROME_WITH_FIXED_BOXES = [
  'components/khazain/primitives/CustomTabBar.tsx',
  'components/khazain/home/QuickChip.tsx',
  'components/khazain/library/StatCard.tsx',
] as const;

describe('the app bounds the system font scale at the root', () => {
  // One ceiling, applied once to the Text/TextInput defaults, rather than a
  // prop every call site has to remember. Chosen over disabling scaling
  // outright so the accessibility setting still does something.
  it('caps Text and TextInput defaults in the root layout', () => {
    const src = read('app/_layout.tsx');
    expect(src).toMatch(/maxFontSizeMultiplier: MAX_FONT_SCALE/);
    expect(src).toMatch(/const MAX_FONT_SCALE = 1\.2/);
    expect(src).toMatch(/\[Text, TextInput\]/);
  });

  it('still honours the setting rather than switching it off', () => {
    const src = read('app/_layout.tsx');
    expect(src).not.toMatch(/allowFontScaling: false/);
  });
});

describe('chrome text bounds the system font scale', () => {
  it.each(CHROME_WITH_FIXED_BOXES)('%s caps the multiplier', (file) => {
    expect(read(file)).toMatch(/maxFontSizeMultiplier=\{CHROME_MAX_FONT_SCALE\}/);
  });

  it('the cap is a real ceiling, not a pass-through', () => {
    const src = read('constants/typography.ts');
    const m = src.match(/CHROME_MAX_FONT_SCALE = ([\d.]+)/);
    expect(m).not.toBeNull();
    const value = Number(m![1]);
    expect(value).toBeGreaterThan(1);
    expect(value).toBeLessThanOrEqual(1.3);
  });
});

describe('the tab bar can grow instead of clipping its icons', () => {
  // A fixed `height` clipped the icon out of the item once the label's line
  // box grew. The bar must be free to get taller.
  it('sizes the controls row and item with minHeight', () => {
    const src = read('components/khazain/primitives/CustomTabBar.tsx');
    expect(src).toMatch(/minHeight: TAB_BAR\.controlsHeight/);
    expect(src).toMatch(/minHeight: TAB_BAR\.itemHeight/);
    expect(src).not.toMatch(/\n\s+height: TAB_BAR\.(controlsHeight|itemHeight)/);
  });
});

describe('cards grow rather than spilling their own text', () => {
  // The library stat caption rendered outside the card, on the page
  // background, because the card was pinned to the Figma height of 122 while
  // its two-line caption scaled.
  it('StatCard uses minHeight', () => {
    const src = read('components/khazain/library/StatCard.tsx');
    expect(src).toMatch(/minHeight: STAT_CARD\.height/);
    expect(src).not.toMatch(/\n\s+height: STAT_CARD\.height/);
  });
});

describe('onboarding shows the real brand mark', () => {
  // Step 0 drew `LogoBadge` — a generic octagon with a "خر" monogram — while
  // the home header had always rendered the real asset.
  it('uses FoundationMark, not the placeholder octagon', () => {
    const src = read('components/khazain/onboarding/WelcomeStep.tsx');
    expect(src).toMatch(/FoundationMark/);
    expect(src).not.toMatch(/<LogoBadge/);
  });
});
