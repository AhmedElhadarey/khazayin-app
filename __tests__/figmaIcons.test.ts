import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  FIGMA_ICONS,
  type FigmaIcon,
} from '@/components/khazain/icons/generated/figmaIcons';
import { KhazainColors } from '@/constants/theme';

const ROOT = path.join(__dirname, '..');
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/figma/icons.manifest.json'), 'utf8'),
);

describe('the generated icon set', () => {
  it('carries every icon the manifest asks for, and nothing else', () => {
    const wanted = MANIFEST.icons.map((i: { name: string }) => i.name).sort();
    expect(Object.keys(FIGMA_ICONS).sort()).toEqual(wanted);
  });

  it('cites the node it was read from, so any path can be re-derived', () => {
    for (const [name, icon] of Object.entries(FIGMA_ICONS)) {
      expect(icon.node).toMatch(/^\d+:\d+$/);
      expect(icon.from.length).toBeGreaterThan(8);
      expect(icon.paths.length).toBeGreaterThan(0);
      // A path that is only a move or a close draws nothing; it would mean the
      // walk found the node but not its geometry.
      for (const p of icon.paths) {
        expect(p.d).toMatch(/^M-?[\d.]/);
        expect(p.d.length).toBeGreaterThan(12);
        expect(p.fill).toMatch(/^#[0-9A-F]{6}$/);
      }
      expect(icon.width).toBeGreaterThan(0);
      expect(icon.height).toBeGreaterThan(0);
      expect(name).toMatch(/^[A-Z][A-Za-z]+$/);
    }
  });

  it('knows which marks are art and which are glyphs', () => {
    // Re-deriving `monochrome` from the same paths the generator counted would
    // only restate the generator's own rule. What is worth asserting is the
    // answer: a row badge is a tinted disc behind a gold mark and cannot be
    // retinted, while a chrome glyph is one colour and must be, because the
    // same node is drawn navy on a card and warm-ink in a header.
    for (const name of ['BadgeQuran', 'BadgeMic', 'SurahStar'] as const) {
      expect([name, FIGMA_ICONS[name].monochrome]).toEqual([name, false]);
    }
    for (const name of ['Back', 'Search', 'NavHome', 'MoreWeb', 'DisclosureCircle'] as const) {
      expect([name, FIGMA_ICONS[name].monochrome]).toEqual([name, true]);
    }
  });

  it('paints each glyph in the order the file lists its siblings', () => {
    // Sibling order is paint order, and Figma's `position` is a fractional
    // index meant to be compared byte by byte. Sorting it with `localeCompare`
    // collated instead, and really did reverse two of these. Pinning the
    // sequence per icon catches that; deriving it from the paths would not.
    const ORDER: Record<string, readonly string[]> = {
      Back: ['@0.4', 'solid'],
      Search: ['@0.4', 'solid'],
      DisclosureCircle: ['@0.4', 'solid'],
      // The play mark is the one that goes the other way: its solid triangle
      // is listed first and the dimmed disc after it.
      Play: ['solid', '@0.4'],
      DawahDownload: ['@0.4', 'solid', 'solid'],
      NavSectionsActive: ['@0.4', '@0.4', 'solid', 'solid'],
    };
    for (const [name, want] of Object.entries(ORDER)) {
      // `as const` narrows each path to its own literal shape, so the optional
      // key is only readable through the declared type.
      const icon: FigmaIcon = FIGMA_ICONS[name as keyof typeof FIGMA_ICONS];
      const got = icon.paths.map((p) => (p.fillOpacity === undefined ? 'solid' : `@${p.fillOpacity}`));
      expect([name, got]).toEqual([name, want]);
    }
  });

  it('records why each mark the file does not state as vector is absent', () => {
    // The extractor cannot reach a raster paint, and a placeholder is not an
    // icon. Both are decisions, so both are written down rather than inferred
    // from the set being short.
    const skipped = MANIFEST.notDrawn as ReadonlyArray<{ name: string; node: string; why: string }>;
    expect(skipped.length).toBeGreaterThan(0);
    for (const s of skipped) {
      expect(s.node).toMatch(/^\d+:\d+$/);
      expect(s.why.length).toBeGreaterThan(40);
      expect(FIGMA_ICONS).not.toHaveProperty(s.name);
    }
  });

  // The generator is the only writer of `figmaIcons.ts`. If someone edits the
  // manifest and forgets to re-run it, or hand-edits the output, the file and
  // the design file disagree — and nothing else would notice.
  it('is exactly what re-running the generator produces', () => {
    const out = execFileSync('node', [path.join(ROOT, 'scripts/figma/extract-icons.js'), '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(out).toContain('up to date');
  }, 60_000);
});

describe('the screens draw the file rather than redrawing it', () => {
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

  // Each of these used to hand-roll its glyph in react-native-svg. Now that the
  // manifest supplies one, a new `<Svg` here means someone drew an icon by hand
  // beside one that came out of the design file — which is how the set drifted
  // in the first place.
  const NO_LONGER_DRAW: readonly string[] = [
    'components/khazain/icons/nav.tsx',
    'components/khazain/icons/sections.tsx',
    'components/khazain/primitives/InlineHeader.tsx',
    'components/khazain/primitives/SearchPill.tsx',
    'components/khazain/primitives/ListRowCard.tsx',
    'components/khazain/settings/SettingsValueRow.tsx',
  ];

  it.each(NO_LONGER_DRAW)('%s draws no Svg of its own', (file) => {
    expect(read(file)).not.toMatch(/<Svg[\s>]/);
  });

  it('leaves the More rows the file does supply to the file', () => {
    // The whatsapp, progress and settings rows keep a drawn glyph on purpose —
    // the first is a placeholder in the design and the other two have no frame
    // at all. Everything else must come from the manifest.
    const src = read('app/(tabs)/more/index.tsx');
    for (const name of ['MoreWeb', 'MoreYoutube', 'MoreTelegram', 'MoreSoundcloud',
      'MoreArchive', 'MoreContact', 'MoreAbout']) {
      expect(src).toContain(`'${name}'`);
    }
    expect(src).toContain('DrawnRowGlyph');
  });

  it('lets the section marks keep the sizes the file states', () => {
    // Nine marks share one 64pt disc at nine different sizes; passing one
    // number made the 48pt books mark 30% small and squashed the 20x44 ملكة
    // mark to 15x34.
    const src = read('app/(tabs)/sections/index.tsx');
    expect(src).toContain('<Icon />');
    expect(src).not.toMatch(/<Icon size=/);
  });
});

describe('the header art the frames lay over the page', () => {
  it('bakes the same ground the app paints', () => {
    // `extract-images.js` pre-composites the OVERLAY blend against the page
    // ground because React Native has no blend modes. That makes the ground a
    // build-time constant, so the two must not drift: if `pageBg` moves, the
    // assets have to be regenerated or the art will sit on a seam.
    const { PAGE_BG } = require('../scripts/figma/extract-images.js');
    const hex = '#' + PAGE_BG.map((c: number) => c.toString(16).padStart(2, '0')).join('');
    expect(hex.toUpperCase()).toBe(KhazainColors.pageBg.toUpperCase());
  });

  it('draws the file\'s art rather than the prototype\'s CSS tile', () => {
    const src = fs.readFileSync(path.join(ROOT, 'components/khazain/patterns/HeaderArt.tsx'), 'utf8');
    expect(src).toContain('pattern-geometric-on-page.png');
    expect(src).toContain('ornament-corner-on-page.png');
    // No opacity is guessed: the blend is resolved at build time.
    expect(src).not.toMatch(/opacity[:=]\s*\{?[\d.]/);
  });

  it('has no More screen still tiling the old ornament', () => {
    const screens = [
      ...['index', 'archive', 'contact', 'about', 'settings', 'settings-progress']
        .map((f) => `app/(tabs)/more/${f}.tsx`),
      // 2120:942 lays the same art, so the dawah screen is part of the same set.
      'app/(tabs)/sections/dawah.tsx',
    ];
    for (const file of screens) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect([file, src.includes('OrnamentPattern')]).toEqual([file, false]);
      expect([file, src.includes('HeaderArt')]).toEqual([file, true]);
    }
  });
});
