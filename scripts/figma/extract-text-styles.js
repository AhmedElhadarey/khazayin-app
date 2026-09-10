// Extract every text node's typography from a .fig file.
// Usage: node extract-text-styles.js <path-to.fig> [outdir]
const fs = require('fs'), path = require('path');
const { openFig } = require(path.join(__dirname, 'kiwi.js'));

function main() {
  const figPath = process.argv[2];
  const outDir = process.argv[3] || '.';
  const { message: msg } = openFig(figPath);

  const nodes = msg.nodeChanges || [];
  const key = (g) => g && `${g.sessionID}:${g.localID}`;
  const byGuid = new Map();
  for (const n of nodes) if (n.guid) byGuid.set(key(n.guid), n);

  // Walk up parentIndex to the nearest ancestor frame, which names the screen.
  const ancestry = (n) => {
    const chain = [];
    let cur = n, hops = 0;
    while (cur && hops++ < 60) {
      chain.push({ name: cur.name, type: cur.type, guid: key(cur.guid) });
      cur = cur.parentIndex && byGuid.get(key(cur.parentIndex.guid));
    }
    return chain;
  };

  const rows = [];
  for (const n of nodes) {
    if (n.type !== 'TEXT' && n.fontName === undefined && n.fontSize === undefined) continue;
    if (n.fontName === undefined && n.fontSize === undefined) continue;
    const chain = ancestry(n);
    rows.push({
      name: n.name,
      text: (n.textData && n.textData.characters) || '',
      family: n.fontName && n.fontName.family,
      style: n.fontName && n.fontName.style,
      postscript: n.fontName && n.fontName.postscript,
      size: n.fontSize,
      lineHeight: n.lineHeight && { v: n.lineHeight.value, u: n.lineHeight.units },
      letterSpacing: n.letterSpacing && { v: n.letterSpacing.value, u: n.letterSpacing.units },
      align: n.textAlignHorizontal,
      case: n.textCase,
      frame: chain.map((c) => c.name).filter(Boolean).slice(1).join(' / '),
    });
  }
  fs.writeFileSync(path.join(outDir, 'fig-text.json'), JSON.stringify(rows, null, 1));
  console.log('nodes:', nodes.length, ' text nodes with typography:', rows.length);

  const combos = new Map();
  for (const r of rows) {
    const k = `${r.family} | ${r.style} | ${r.size}`;
    combos.set(k, (combos.get(k) || 0) + 1);
  }
  console.log('\ndistinct family | style | size  (count):');
  [...combos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
    .forEach(([k, c]) => console.log('  ' + String(c).padStart(4), k));
}
main();
