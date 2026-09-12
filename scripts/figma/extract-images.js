#!/usr/bin/env node
// Pull the design's raster art out of `docs/KHAZAYIN.fig` into `assets/figma/`.
//
// A `.fig` is a ZIP whose `images/` directory holds the full-resolution source
// art keyed by content hash, alpha intact. Three marks in the design are
// raster rather than vector, so `extract-icons.js` cannot reach them and they
// come out here instead — at source resolution, not redrawn and not recovered
// from a flattened frame export.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const FIG = path.join(ROOT, 'docs', 'KHAZAYIN.fig');
const OUT = path.join(ROOT, 'assets', 'figma');

// name → the content hash of the `images/` entry, plus where the design uses it.
const WANTED = [
  {
    name: 'seal-khazain.png',
    hash: '9c4325bb1be441cb24fc5958e5c0349a4ebebfee',
    from: 'Node 2355:1480 `حصرى` (the حصريات section card, 2031:5675) and 2093:1762 '
      + '(the Home carousel mark). A white خزائن الرحمن seal, drawn over a gold disc.',
  },
  {
    name: 'pattern-geometric.png',
    hash: 'e2364e38291c133886f77e15ddb43b487b8c2f27',
    from: 'Node 2102:2711 `Vector Smart Object`, the 392x549 header overlay on the '
      + 'More root. The same tile backs several frames.',
  },
  {
    name: 'ornament-corner.png',
    hash: '9f0e23be9bb0962a88244a04fe410c66eaac4a49',
    from: 'Node 2102:2711 `Shape 2 copy`, the corner motif in the header band.',
  },
];

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const listed = execFileSync('unzip', ['-Z1', FIG], { encoding: 'utf8' }).split('\n');
  for (const w of WANTED) {
    const entry = `images/${w.hash}`;
    if (!listed.includes(entry)) throw new Error(`${w.name}: ${entry} is not in the archive`);
    const bytes = execFileSync('unzip', ['-p', FIG, entry], { maxBuffer: 64 * 1024 * 1024 });
    const dest = path.join(OUT, w.name);
    const before = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    if (before && before.equals(bytes)) {
      console.log(`unchanged  ${w.name}  ${bytes.length} bytes`);
      continue;
    }
    fs.writeFileSync(dest, bytes);
    console.log(`wrote      ${path.relative(ROOT, dest)}  ${bytes.length} bytes`);
  }
}

if (require.main === module) main();
module.exports = { WANTED };
