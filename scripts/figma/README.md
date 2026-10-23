# Reading `docs/KHAZAYIN.fig` directly

A `.fig` file is a ZIP. `images/` holds the source art; `canvas.fig` holds the node graph
in Figma's Kiwi binary format:

```
"fig-kiwi" magic, uint32 version, then length-prefixed chunks:
  chunk 1 — the Kiwi schema (deflate)
  chunk 2 — the document   (zstd on current files, deflate on older ones)
```

The schema is self-describing, so the decoder needs no per-version knowledge and no
dependency: `kiwi.js` is ~100 lines and `zlib.zstdDecompressSync` ships with Node 22+.

```bash
node scripts/figma/extract-text-styles.js docs/KHAZAYIN.fig /tmp
```

Prints every distinct `family | style | size` with a count, and writes `fig-text.json`
with one row per text node — family, style, size, line height, letter spacing, alignment,
the text itself, and the ancestor frame path.

This is how typography questions get answered from the spec rather than from a screenshot:
a rendered export can only be measured, but the file states the values.

## Icons

```bash
node scripts/figma/extract-icons.js           # regenerate components/khazain/icons/generated/figmaIcons.ts
node scripts/figma/extract-icons.js --check   # exit 1 if the generated file is stale (the test runs this)
```

`icons.manifest.json` lists each icon as `{ name, node, from }`. A node is a SYMBOL
master, an INSTANCE (its overrides apply) or an in-place container. Three optional
fields let an entry take a container and still get one mark:

- `bare: true` — skip the root's own fill/stroke (e.g. a `DIV-58` disc the app paints
  itself) and keep everything painted inside it.
- `crop: { x, y, width, height }` — in the root's own space; the output is translated so
  that rectangle is the origin and its size becomes the icon's box. Must be numeric with
  positive width/height or generation throws.
- `exclude: ["id", ...]` — node ids whose subtrees are skipped (to split one node into
  layers the app interleaves with a raster).

**Fill-cleared override rule.** When an instance override sets `fillPaints: []` on a
vector and gives it a stroke colour, the generator emits that vector's `fillGeometry`
in the stroke colour and ignores the stroke outline. Assumption: the vector is a
pre-outlined vuesax "outline" glyph, so `fillGeometry` already is the thin ring and
stroking it again would thicken it into a solid block (MoreArchive). A manifest-wide
scan found the pattern only on MoreArchive; if a new icon trips it and is a genuinely
stroked shape, this rule is the first suspect.
