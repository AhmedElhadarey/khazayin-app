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
