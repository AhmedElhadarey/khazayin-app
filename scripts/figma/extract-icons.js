#!/usr/bin/env node
// Generate the app's icon set from `docs/KHAZAYIN.fig`.
//
// The app used to redraw each icon by hand in react-native-svg, which meant
// every glyph was an approximation of the spec rather than the spec. The file
// states the outlines, so this reads them and writes a data module the icon
// components render.
//
// Usage:  node scripts/figma/extract-icons.js [--check]
//   --check  exit non-zero if the generated file is out of date, without
//            writing. This is what the test uses, so a manifest edit that was
//            never regenerated fails CI instead of drifting.
const fs = require('fs');
const path = require('path');
const { openFig } = require(path.join(__dirname, 'kiwi.js'));
const { collectPaths, indexNodes } = require(path.join(__dirname, 'vector.js'));

const ROOT = path.join(__dirname, '..', '..');
const FIG = path.join(ROOT, 'docs', 'KHAZAYIN.fig');
const MANIFEST = path.join(__dirname, 'icons.manifest.json');
const OUT = path.join(ROOT, 'components', 'khazain', 'icons', 'generated', 'figmaIcons.ts');

function build() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const { message } = openFig(FIG);
  const ix = indexNodes(message);

  const entries = manifest.icons.map((icon) => {
    const node = ix.byGuid.get(icon.node);
    if (!node) throw new Error(`${icon.name}: no node ${icon.node} in the file`);
    const paths = collectPaths(node, ix, { bare: icon.bare, crop: icon.crop, exclude: icon.exclude });
    if (!paths.length) throw new Error(`${icon.name}: node ${icon.node} paints nothing`);
    const size = icon.crop ? { x: icon.crop.width, y: icon.crop.height } : node.size || { x: 24, y: 24 };
    const colours = [...new Set(paths.map((p) => p.fill))];
    return {
      ...icon,
      width: Math.round(size.x * 100) / 100,
      height: Math.round(size.y * 100) / 100,
      // A glyph drawn in one colour can be tinted by the caller; multi-colour
      // art cannot, and saying so here stops a caller silently flattening it.
      monochrome: colours.length === 1,
      paths,
    };
  });

  const lines = [];
  lines.push('// GENERATED — do not edit by hand.');
  lines.push('//');
  lines.push('// Source: docs/KHAZAYIN.fig, via scripts/figma/extract-icons.js.');
  lines.push('// Each `d` is the flattened outline Figma itself renders, read out of the');
  lines.push("// node's `fillGeometry`/`strokeGeometry` rather than traced from an export, so");
  lines.push('// these are the design rather than an approximation of it.');
  lines.push('//');
  lines.push('// Regenerate:  node scripts/figma/extract-icons.js');
  lines.push('// The set it may contain is scripts/figma/icons.manifest.json, which also');
  lines.push('// records the two marks the file does not state as vector and why.');
  lines.push('');
  lines.push('export type FigmaIconPath = {');
  lines.push('  d: string;');
  lines.push("  fill: string;");
  lines.push("  fillRule: 'nonzero' | 'evenodd';");
  lines.push('  fillOpacity?: number;');
  lines.push('};');
  lines.push('');
  lines.push('export type FigmaIcon = {');
  lines.push('  /** The node in KHAZAYIN.fig this was read from. */');
  lines.push('  node: string;');
  lines.push('  /** Where the design draws it, for anyone re-deriving the geometry. */');
  lines.push('  from: string;');
  lines.push("  /** The node's own box, and so the viewBox the paths are in. */");
  lines.push('  width: number;');
  lines.push('  height: number;');
  lines.push('  /** True when every path shares one fill, so a caller may retint it. */');
  lines.push('  monochrome: boolean;');
  lines.push('  paths: readonly FigmaIconPath[];');
  lines.push('};');
  lines.push('');
  lines.push('export const FIGMA_ICONS = {');
  for (const e of entries) {
    lines.push(`  ${e.name}: {`);
    lines.push(`    node: ${JSON.stringify(e.node)},`);
    lines.push(`    from: ${JSON.stringify(e.from)},`);
    lines.push(`    width: ${e.width},`);
    lines.push(`    height: ${e.height},`);
    lines.push(`    monochrome: ${e.monochrome},`);
    lines.push('    paths: [');
    for (const p of e.paths) {
      const extra = p.fillOpacity !== undefined ? `, fillOpacity: ${p.fillOpacity}` : '';
      lines.push(`      { d: ${JSON.stringify(p.d)}, fill: ${JSON.stringify(p.fill)}, fillRule: ${JSON.stringify(p.fillRule)}${extra} },`);
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push('} as const satisfies Record<string, FigmaIcon>;');
  lines.push('');
  lines.push('export type FigmaIconName = keyof typeof FIGMA_ICONS;');
  lines.push('');
  return { text: lines.join('\n'), entries };
}

function main() {
  const check = process.argv.includes('--check');
  const { text, entries } = build();
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (check) {
    if (current === text) {
      console.log(`up to date — ${entries.length} icons`);
      return;
    }
    console.error('components/khazain/icons/generated/figmaIcons.ts is out of date.');
    console.error('Run: node scripts/figma/extract-icons.js');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  const total = entries.reduce((n, e) => n + e.paths.length, 0);
  console.log(`wrote ${path.relative(ROOT, OUT)} — ${entries.length} icons, ${total} paths`);
  for (const e of entries) {
    console.log(`  ${e.name.padEnd(22)} ${e.node.padEnd(12)} ${String(e.width).padStart(6)}x${String(e.height).padEnd(6)} ${e.paths.length} path(s)${e.monochrome ? '' : '  multi-colour'}`);
  }
}

if (require.main === module) main();
module.exports = { build };
