// Dump a frame's subtree geometry from a .fig file.
//
// A rendered export can only be measured, and an export that dropped its
// images cannot even be measured. The file states size and transform per
// node, so this reads them directly and resolves each node's position in
// its root frame's coordinates.
//
// Usage: node extract-geometry.js <path-to.fig> <nodeId|nameSubstring> [outdir]
const fs = require('fs'), path = require('path');
const { openFig } = require(path.join(__dirname, 'kiwi.js'));

const key = (g) => g && `${g.sessionID}:${g.localID}`;

// Figma stores an affine transform per node, relative to its parent.
function compose(parent, t) {
  if (!t) return parent;
  const a = parent, b = {
    m00: t.m00, m01: t.m01, m02: t.m02,
    m10: t.m10, m11: t.m11, m12: t.m12,
  };
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12,
  };
}
const IDENTITY = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function main() {
  const figPath = process.argv[2];
  const target = process.argv[3];
  const outDir = process.argv[4] || '.';
  const { message: msg } = openFig(figPath);

  const nodes = msg.nodeChanges || [];
  const byGuid = new Map();
  for (const n of nodes) if (n.guid) byGuid.set(key(n.guid), n);

  // Children are ordered by parentIndex.position, a fractional index string.
  const kids = new Map();
  for (const n of nodes) {
    if (!n.parentIndex || !n.parentIndex.guid) continue;
    const p = key(n.parentIndex.guid);
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p).push(n);
  }
  for (const list of kids.values()) {
    list.sort((a, b) => String(a.parentIndex.position).localeCompare(String(b.parentIndex.position)));
  }

  const root = byGuid.get(target)
    || nodes.find((n) => n.name && n.name === target)
    || nodes.find((n) => n.name && n.name.includes(target));
  if (!root) throw new Error('no node matching ' + target);
  console.log('root:', key(root.guid), root.type, JSON.stringify(root.name),
    root.size ? `${root.size.x} x ${root.size.y}` : '(no size)');

  const rows = [];
  (function walk(n, parentAbs, depth) {
    const abs = compose(parentAbs, n.transform);
    const w = n.size ? n.size.x : null;
    const h = n.size ? n.size.y : null;
    rows.push({
      id: key(n.guid), depth, type: n.type, name: n.name,
      x: +abs.m02.toFixed(2), y: +abs.m12.toFixed(2),
      w: w === null ? null : +w.toFixed(2), h: h === null ? null : +h.toFixed(2),
      cornerRadius: n.cornerRadius,
      opacity: n.opacity,
      blendMode: n.blendMode,
      family: n.fontName && n.fontName.family,
      style: n.fontName && n.fontName.style,
      fontSize: n.fontSize,
      lineHeight: n.lineHeight && n.lineHeight.value,
      text: (n.textData && n.textData.characters) || undefined,
      fill: (n.fillPaints || []).filter((p) => p.color).map((p) =>
        '#' + [p.color.r, p.color.g, p.color.b].map((c) =>
          Math.round(c * 255).toString(16).padStart(2, '0')).join('')
          + (p.opacity !== undefined && p.opacity < 1 ? `@${p.opacity.toFixed(2)}` : '')),
      // Image paints key straight into the archive's `images/` directory by
      // content hash, which is how real client art gets out of the file
      // rather than being recovered from a flattened frame export.
      images: (n.fillPaints || [])
        .filter((p) => p.image && p.image.hash)
        .map((p) => ({
          hash: Buffer.from(p.image.hash).toString('hex'),
          opacity: p.opacity,
          visible: p.visible !== false,
        })),
      layoutMode: n.stackMode,
      itemSpacing: n.stackSpacing,
      padding: n.stackHorizontalPadding !== undefined
        ? [n.stackVerticalPadding, n.stackHorizontalPadding] : undefined,
    });
    if (depth > 40) return;
    for (const c of kids.get(key(n.guid)) || []) walk(c, abs, depth + 1);
  })(root, IDENTITY, 0);

  const safe = String(target).replace(/[^A-Za-z0-9]+/g, '-');
  const out = path.join(outDir, `fig-geom-${safe}.json`);
  fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  console.log('nodes:', rows.length, '->', out);

  for (const r of rows.slice(0, 400)) {
    const g = r.w === null ? '' : `${r.w}x${r.h} @ ${r.x},${r.y}`;
    const t = r.text ? ` "${r.text.slice(0, 28).replace(/\n/g, ' ')}"` : '';
    const f = r.fontSize ? ` [${r.family}/${r.style}/${r.fontSize}]` : '';
    console.log('  '.repeat(r.depth) + `${r.type} ${JSON.stringify(r.name)} ${g}${f}${t}`);
  }
}
main();
