// Turn a `.fig` node subtree into SVG paths.
//
// Figma stores every vector twice: as an editable network (`vectorData`, a
// blob this does not read) and as a flattened outline (`fillGeometry` /
// `strokeGeometry`). The outline is what renders, and it is what an SVG `d`
// wants, so that is what this reads.
//
// The command blob is a byte opcode followed by float32 LE coordinates. The
// opcodes were settled by decoding all 13,084 geometries in KHAZAYIN.fig
// without a single unknown byte, and confirmed against a node whose outline
// traces its own box: `1 (0,0) 2 (18.71,0) 2 (18.71,26.79) 2 (0,26.79) 0`.
const CLOSE = 0, MOVE = 1, LINE = 2, QUAD = 3, CUBIC = 4;
const ARG_FLOATS = { [CLOSE]: 0, [MOVE]: 2, [LINE]: 2, [QUAD]: 4, [CUBIC]: 6 };

const round = (n) => {
  // Two decimals is below a tenth of a device pixel at any size these icons
  // render at, and keeps the generated file readable and diffable.
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

/** One `fillGeometry`/`strokeGeometry` command blob → an SVG path `d`. */
function pathFromBlob(bytes, transform) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const pt = (x, y) => {
    const t = transform;
    return t ? [t.m00 * x + t.m01 * y + t.m02, t.m10 * x + t.m11 * y + t.m12] : [x, y];
  };
  const out = [];
  let o = 0;
  while (o < buf.length) {
    const op = buf.readUInt8(o);
    o += 1;
    const n = ARG_FLOATS[op];
    if (n === undefined) throw new Error(`unknown path opcode ${op} at byte ${o - 1}`);
    const a = [];
    for (let i = 0; i < n; i += 1) { a.push(buf.readFloatLE(o)); o += 4; }
    const p = [];
    for (let i = 0; i < a.length; i += 2) p.push(...pt(a[i], a[i + 1]).map(round));
    if (op === CLOSE) out.push('Z');
    else if (op === MOVE) out.push(`M${p[0]} ${p[1]}`);
    else if (op === LINE) out.push(`L${p[0]} ${p[1]}`);
    else if (op === QUAD) out.push(`Q${p[0]} ${p[1]} ${p[2]} ${p[3]}`);
    else out.push(`C${p[0]} ${p[1]} ${p[2]} ${p[3]} ${p[4]} ${p[5]}`);
  }
  return out.join('');
}

const IDENTITY = Object.freeze({ m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 });

function compose(a, t) {
  if (!t) return a;
  return {
    m00: a.m00 * t.m00 + a.m01 * t.m10,
    m01: a.m00 * t.m01 + a.m01 * t.m11,
    m02: a.m00 * t.m02 + a.m01 * t.m12 + a.m02,
    m10: a.m10 * t.m00 + a.m11 * t.m10,
    m11: a.m10 * t.m01 + a.m11 * t.m11,
    m12: a.m10 * t.m02 + a.m11 * t.m12 + a.m12,
  };
}

const guidKey = (g) => g && `${g.sessionID}:${g.localID}`;

/**
 * The identity `symbolOverrides` and `derivedSymbolData` address a node by.
 *
 * It is **not** the node's `guid`. When a component is copied, its nodes get
 * fresh guids but keep an `overrideKey` pointing at the original definition,
 * and the override paths are written in those. Matching on `guid` silently
 * finds nothing — the override is dropped and the master's own paint is used,
 * which is how the whatsapp row's mark came out cream-on-cream instead of navy.
 */
const overrideKeyOf = (node) => guidKey(node.overrideKey) || guidKey(node.guid);

const solidHex = (paints) => {
  const p = (paints || []).find((q) => q.visible !== false && q.color);
  if (!p) return null;
  const hex = '#' + [p.color.r, p.color.g, p.color.b]
    .map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
  // Paint opacity and the colour's own alpha both dim the stroke; fold them.
  const alpha = (p.opacity === undefined ? 1 : p.opacity) * (p.color.a === undefined ? 1 : p.color.a);
  return { hex: hex.toUpperCase(), opacity: alpha < 1 ? Math.round(alpha * 1000) / 1000 : undefined };
};

/**
 * The part of a root's own transform that belongs to the mark.
 *
 * A root's translation only places it in a parent the walk never sees, so it
 * is dropped. An axis flip is part of how the mark is drawn — 2589:2458 stores
 * the أنتِ ملكة tulip with `m11: -1`, and without it the tulip rendered upside
 * down — so it is kept, mirrored inside the node's own box. A rotation is left
 * alone: no icon in the manifest needs one, and turning a mark inside a box
 * that does not turn with it would change its size. Only the sign of `m00` and
 * `m11` is read, because Figma keeps a node's scale in `size`, not here.
 */
function ownReflection(node) {
  const t = node.transform, s = node.size;
  if (!t || !s || Math.abs(t.m01) > 1e-6 || Math.abs(t.m10) > 1e-6) return IDENTITY;
  const flipX = t.m00 < 0, flipY = t.m11 < 0;
  if (!flipX && !flipY) return IDENTITY;
  return {
    m00: flipX ? -1 : 1, m01: 0, m02: flipX ? s.x : 0,
    m10: 0, m11: flipY ? -1 : 1, m12: flipY ? s.y : 0,
  };
}

/**
 * Walk a node subtree and collect every painted outline in the root's own
 * coordinate space.
 *
 * `opts` lets a manifest entry take a container and still get one mark:
 *  - `bare`    — skip the root's own fill/stroke (a `DIV-58` disc the app draws
 *                itself), keeping everything painted inside it.
 *  - `crop`    — `{x,y,width,height}` in the root's own space; the result is
 *                translated so that rectangle is the new origin.
 *  - `exclude` — guids (`"2869:2452"`) whose subtrees are skipped.
 *
 * Three things make this more than a tree walk:
 *
 *  - **Instances carry no children.** An INSTANCE points at a SYMBOL master
 *    through `symbolData.symbolID`; the drawable nodes live under the master.
 *    Its `symbolOverrides` restate paints per master-node guid (that is how
 *    one vuesax glyph is navy here and white there), and `derivedSymbolData`
 *    restates geometry when the instance resized it.
 *  - **A stroked icon has no fill.** The vuesax "linear" set draws with
 *    strokes, and Figma pre-outlines those into `strokeGeometry` — so they are
 *    emitted as *fills* in the stroke colour, which is what the outline means.
 *  - **A BOOLEAN_OPERATION already holds its own result**, so its children
 *    must not be walked again or the union is drawn twice.
 */
function collectPaths(root, { byGuid, childrenOf }, opts = {}) {
  const exclude = new Set(opts.exclude || []);
  const paths = [];

  const walk = (node, abs, inherited, isRoot) => {
    if (node.visible === false) return;
    if (exclude.has(guidKey(node.guid))) return;
    const key = overrideKeyOf(node);
    const over = inherited.overrides.get(key);
    const derived = inherited.derived.get(key);

    const fillPaints = (over && over.fillPaints) || node.fillPaints;
    const strokePaints = (over && over.strokePaints) || node.strokePaints;
    const fillGeom = (derived && derived.fillGeometry) || node.fillGeometry;
    const strokeGeom = (derived && derived.strokeGeometry) || node.strokeGeometry;

    const nodeOpacity = node.opacity === undefined ? 1 : node.opacity;
    const emit = (geoms, paint) => {
      const colour = solidHex(paint);
      if (!colour) return;
      for (const g of geoms || []) {
        if (g.commandsBlob === undefined) continue;
        const blob = inherited.blobs[g.commandsBlob];
        if (!blob) continue;
        // A LINE node has a fill geometry of zero bytes — there is no area to
        // fill — alongside a real stroke outline. Emitting the empty one would
        // put a `d=""` path in the output that draws nothing.
        const d = pathFromBlob(blob.bytes, abs);
        if (!d) continue;
        const alpha = (colour.opacity === undefined ? 1 : colour.opacity) * nodeOpacity * inherited.opacity;
        paths.push({
          d,
          fill: colour.hex,
          fillRule: g.windingRule === 'ODD' ? 'evenodd' : 'nonzero',
          ...(alpha < 1 ? { fillOpacity: Math.round(alpha * 1000) / 1000 } : {}),
        });
      }
    };

    // An instance override that CLEARS the fill of a vuesax "outline" vector and
    // sets a stroke colour is how the file recolours a glyph that Figma has
    // already outlined: `fillGeometry` is the thin ring itself, and the stroke
    // is only the carrier of the colour. Stroking that ring again (the derived
    // `strokeGeometry`) thickens it into a solid block (MoreArchive), so the
    // ring is emitted in the stroke colour and the stroke outline is skipped.
    const fillCleared = over && Array.isArray(over.fillPaints) && over.fillPaints.length === 0;
    if (isRoot && opts.bare) {
      // The container's own paint is drawn by the app; only its contents count.
    } else if (fillCleared && solidHex(strokePaints) && (fillGeom || []).length) {
      emit(fillGeom, strokePaints);
    } else {
      emit(fillGeom, fillPaints);
      emit(strokeGeom, strokePaints);
    }

    // An INSTANCE's drawable content is the master's subtree, positioned by
    // the instance's own transform.
    if (node.type === 'INSTANCE' && node.symbolData && node.symbolData.symbolID) {
      const master = byGuid.get(guidKey(node.symbolData.symbolID));
      if (master) {
        const overrides = new Map(inherited.overrides);
        for (const o of node.symbolData.symbolOverrides || []) {
          const guids = (o.guidPath && o.guidPath.guids) || [];
          const last = guids[guids.length - 1];
          if (last) overrides.set(guidKey(last), o);
        }
        const derivedMap = new Map(inherited.derived);
        for (const d of node.derivedSymbolData || []) {
          const guids = (d.guidPath && d.guidPath.guids) || [];
          const last = guids[guids.length - 1];
          if (last) derivedMap.set(guidKey(last), d);
        }
        const next = { ...inherited, overrides, derived: derivedMap, opacity: inherited.opacity * nodeOpacity };
        // The master's own transform is replaced by the instance's, so its
        // children compose onto `abs` directly.
        for (const c of childrenOf(guidKey(master.guid))) walk(c, compose(abs, c.transform), next, false);
      }
      return;
    }

    // A boolean's own outline is the finished shape; its operands are not, so
    // walking them would draw the union twice. A stroke-only boolean has no
    // fill geometry, so both lists have to be checked.
    if (node.type === 'BOOLEAN_OPERATION' && ((fillGeom || []).length || (strokeGeom || []).length)) {
      return;
    }

    const next = { ...inherited, opacity: inherited.opacity * nodeOpacity };
    for (const c of childrenOf(guidKey(node.guid))) walk(c, compose(abs, c.transform), next, false);
  };

  const origin = opts.crop
    ? { m00: 1, m01: 0, m02: -opts.crop.x, m10: 0, m11: 1, m12: -opts.crop.y }
    : IDENTITY;
  walk(root, compose(origin, ownReflection(root)), {
    overrides: new Map(),
    derived: new Map(),
    blobs: byGuid.blobs,
    opacity: 1,
  }, true);
  return paths;
}

/** Index a decoded `.fig` message once, for repeated subtree walks. */
function indexNodes(message) {
  const nodes = message.nodeChanges || [];
  const byGuid = new Map();
  for (const n of nodes) if (n.guid) byGuid.set(guidKey(n.guid), n);
  byGuid.blobs = message.blobs || [];

  const kids = new Map();
  for (const n of nodes) {
    if (!n.parentIndex || !n.parentIndex.guid) continue;
    const p = guidKey(n.parentIndex.guid);
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p).push(n);
  }
  for (const list of kids.values()) {
    // Sibling order is paint order, and Figma's `position` is a fractional
    // index compared byte by byte. `localeCompare` collates — it would reorder
    // keys that differ only in case or punctuation, and silently repaint the
    // icon in the wrong order.
    list.sort((a, b) => {
      const x = String(a.parentIndex.position);
      const y = String(b.parentIndex.position);
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }
  return { nodes, byGuid, childrenOf: (k) => kids.get(k) || [] };
}

module.exports = { pathFromBlob, collectPaths, indexNodes, compose, guidKey, IDENTITY };
