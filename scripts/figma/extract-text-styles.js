// Extract every text node's typography from a .fig file.
// Usage: node fig-text.js <path-to.fig> [outdir]
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const { Reader, parseSchema, makeDecoder } = require(path.join(__dirname, 'kiwi.js'));

function readFig(file) {
  const b = fs.readFileSync(file);
  if (b.slice(0, 8).toString() !== 'fig-kiwi') throw new Error('not a fig-kiwi payload');
  let off = 12;
  const chunks = [];
  while (off + 4 <= b.length) {
    const len = b.readUInt32LE(off); off += 4;
    if (!len || off + len > b.length) break;
    const raw = b.slice(off, off + len); off += len;
    // Older files deflate the payload; newer ones use zstd.
    let out = null;
    try { out = zlib.inflateRawSync(raw); }
    catch { try { out = zlib.zstdDecompressSync(raw); } catch { out = null; } }
    chunks.push(out);
  }
  return chunks;
}

function main() {
  const figPath = process.argv[2];
  const outDir = process.argv[3] || '.';
  // A .fig is a ZIP whose canvas.fig holds the node graph.
  const tmp = fs.mkdtempSync('/tmp/figx-');
  require('child_process').execSync(`unzip -oq ${JSON.stringify(figPath)} canvas.fig -d ${tmp}`);
  const [schemaBuf, dataBuf] = readFig(path.join(tmp, 'canvas.fig'));

  const defs = parseSchema(schemaBuf);
  const dec = makeDecoder(defs);
  const msgIdx = defs.findIndex((d) => d.name === 'Message');
  const msg = dec.readDef(new Reader(dataBuf), msgIdx);

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
