import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { FIGMA_ICONS } from '@/components/khazain/icons/generated/figmaIcons';

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

  it('flags multi-colour art so a caller cannot flatten it with a tint', () => {
    for (const icon of Object.values(FIGMA_ICONS)) {
      const distinct = new Set(icon.paths.map((p) => p.fill));
      expect(icon.monochrome).toBe(distinct.size === 1);
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
