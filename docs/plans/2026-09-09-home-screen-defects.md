# Home screen — defect audit and remediation plan

**Date:** 2026-09-09 · **Status:** implemented on `008-home-screen-defects`.

> Read `2026-09-09-home-geometry-findings.md` alongside this. This plan was written
> against rendered exports; reading the `.fig` directly corrected four of its entries —
> D2's remedy, D8's premise, D3's font-scale justification and D1's single card width —
> and `2026-09-09-home-screen-qa.md` records what shipped and what is still open.
**Spec:** `docs/KHAZAYIN.fig` node `2001:835` (Home, fully rendered) and `2001:940`
(Home, 393 × 1321 — the full-height frame).

## How this was measured

The visible viewport is not the screen, so the whole Home content was captured in one
frame on each platform. A temporary route rendered the real `HomeScreen` inside a
393 × 1500 pt container and scaled the result to fit one screenshot. Laying out at 393 pt
rather than at the scaled size is the point: the responsive rules still see a
reference-width screen, so what was captured is what a 393 pt device renders. The route
has been deleted.

Captures were then resampled to a common 2 px per layout point and compared against the
Figma frame, whose screen sits at rect (56, 18, 387, 839) inside its 500 × 880 device
mockup — 387 px spanning 393 pt, so 1 reference px ≈ 1.0155 pt.

- iOS: iPhone 16 simulator, 393 × 852 pt at 3×.
- Android: Pixel 7 emulator, 411 × 914 dp at 2.625× (420 dpi).

## Reference status

The frame first used as the reference (`2001:835` as exported into
`docs/audit/2026-09-09/figma-reference/`) was **wrong**, and a corrected Home frame has
since been supplied. Findings are split below by whether they depend on it.

Still outstanding: the corrected frame is one screenful (852 pt). The real frame is
393 x 1321, so everything below `الكتب العلمية` — the `أنتِ ملكة` card, the quick chips and
the `تصميمات دعوية` carousel — still has no reference. **A full-height export, no device
mockup, 2x, with images** would close that.

## Confirmed defects

Ranked by how visible each is, with the evidence that establishes it.

### D1 — Carousel cards are ~10% narrower than the design *(this is the one you spotted)*

Measured card width in the `العلماء والمشايخ` row:

| | card width | right gutter |
|---|---|---|
| Figma | **217 pt** | 15 pt |
| iOS, 393 pt window | **194 pt** | 16 pt |
| Android, 411 dp window | **204 pt** | 16 pt |

`responsiveCarouselCardWidth` (`constants/layout.ts:49`) computes `(width − 44) / 1.8` and
clamps to a 216.1 pt maximum. That formula only reaches the maximum at a window of
**430 pt or wider**, so no shipping phone ever renders the card at its designed size — the
reference device is 22 pt short. Figma holds the card at a fixed 216.1 pt and lets the
second card run off the screen edge; the app shrinks the card to make two-and-a-bit fit.

The same function drives `الكتب العلمية`, so both rows are wrong by the same amount.

**Fix:** hold 216.1 pt at and above the reference width; scale down only below it.
**Verifies:** card measures 216 ± 2 pt on a 393 pt device.

### D2 — The Prophet hero crop removed artwork the design has *(regression)*

**This reverses an earlier finding.** Against the old reference the app looked like it had
*too much* art. Against the corrected frame the opposite is true.

Commit `436a519` cropped `hero-prophet-card.webp` to `hero-prophet-card-cropped.webp`,
removing what its comment called a duplicate: "the words محمد رسول الله twice — once as the
title calligraphy and again as a large teal emblem flanking the right edge". The corrected
Figma frame carries **both**. The uncropped asset matches it; the cropped one is missing the
right-edge emblem, and the crop also rebalanced the vertical margins (48/108 to 40/40),
changing the card's aspect ratio from 1168:659 to 1168:583.

**Fix:** point `HeroProphet` back at `hero-prophet-card.webp` and restore the original
aspect ratio. Both assets are still on disk.
**Verifies:** the right-edge emblem is present and the card's proportions match the frame.

### D3 — Both heroes are flattened images with the text baked in

`HeroQuran` and `HeroProphet` are each a single `expo-image` with a locked `aspectRatio`.
Everything — Arabic title, body copy, the `المزيد` pill — is pixels. This is the
"optimized for all screens" problem, and it has four separate consequences:

1. The body text ignores the app's own font-size setting. `settings-font-size.tsx` and
   `useFontScale` exist and work everywhere else; the heroes cannot respond to them.
2. `المزيد` is not pressable. The whole card is one tap target — the code comment in
   `HeroProphet.tsx` says so outright.
3. On a wide screen the card is ~712 pt across and the baked text is soft and oversized;
   on a 320 pt device the same text is unreadably small. Text that is really text would
   hold its size and reflow instead.
4. The copy cannot be corrected without re-exporting artwork.

**Fix:** separate the layers — artwork as an image, text as `<Text>` honouring
`useFontScale`, the pill as its own `<Pressable>`. The `.fig` carries the pieces
separately, which is what makes this practical.

**Note:** `hero-quran-rehl.png`, `hero-quran-title.png`, `hero-prophet-scroll.png` and
`hero-prophet-title.png` were just deleted as unreferenced in `ad2f167`. They are
recoverable from `docs/KHAZAYIN.fig`; the deletion was correct at the time and is cheap to
undo, but it is worth knowing before starting.

### D4 — Bottom navigation does not match *(also spotted by eye)*

Comparing the bar directly:

- **`المزيد`** — the app draws a hamburger (three horizontal lines); Figma is three small
  scattered circles.
- **`مكتبتي`** — the app draws a bookmark; Figma is an open book.
- **`الأقسام`** — Figma's four squares are outlined; the app's are heavier and filled.
- **Sizing** — the app's icons and labels are both noticeably larger than Figma's.
- **Shape** — Figma's bar is a floating pill with page background visible below it and full
  rounding at both ends; the app's bar is taller and sits closer to the bottom edge.

The active-tab treatment (lighter navy panel with a gold bar above it) does match.

### D5 — One scholar card is vertically squashed

`ScholarCard` applies a single `SVG_RATIO = 71/179 = 0.3966` to all three bundled SVGs.
Measured `viewBox` values: SVG 2 and 3 are `179 × 71` (0.3966, correct), but SVG 1 —
`عبد العزيز بن باز` — is `152 × 62` (0.4079). That card's calligraphy is compressed
**2.8%** vertically. The existing comment acknowledges the mismatch as "within ~3%".

**Fix:** size each SVG from its own `viewBox`.

### D6 — Quick-chip label truncates on Android

`حصريات خزائن الرحمن` renders in full on iOS and as `حصريات خزائن الرح…` on Android at the
same 393 pt layout width. A platform text-measurement difference the chip's width rule does
not absorb.

### D7 — Book card titles wrap differently across platforms

`الإعجاز العلمي في السنة النبوية` sets on one line on iOS and wraps to two on Android,
which makes the card — and therefore the row — a different height on each platform.

### D8 — Dawah posters overlap *(no reference yet)*

In `تصميمات دعوية` the posters overlap each other instead of sitting side by side with a
gap, on both platforms, and differently on each. Something is wrong, but the correct layout
cannot be stated until the full-height reference exists.

### D9 — The screen manifest mislabels the Home node

`docs/visual-regression/figma-mobile-screen-map.json` lists `2001:835` as
"Splash — patterned launch state" with `appRoute: null`. Its export is Home, fully
rendered — it is the best Home reference in the repo, and the splash rebuild already
recorded this. `__tests__/figmaScreenCoverage.test.ts:37` asserts it as a splash node, so
both change together. The corrected frame you supplied supersedes this export as the
reference; it should land in the repo alongside the manifest fix.

### D10 — The Figma decoder is not tracked

`.gitignore` ignores `scripts/*` with a single carve-out, `!scripts/visual-audit/`. The new
`scripts/figma/` needs the same one-line carve-out or it stays local, and every future
typography or geometry question goes back to eyeballing screenshots.

## Typography — measured from the `.fig`, not from a screenshot

A rendered export can only be measured; the file *states* the values. `canvas.fig` inside
`docs/KHAZAYIN.fig` is a Kiwi binary (deflate schema + zstd document), which decodes with
no dependency — `zlib.zstdDecompressSync` ships with Node 22+. Tooling is in
`scripts/figma/` (see D10 for the one-line `.gitignore` change it needs). Across **24,709
nodes / 1,153 text nodes**, the design uses exactly two Arabic faces:

| Face | Style used | Count | Sizes |
|---|---|---|---|
| `TheSansArabic` | **Bold only** | 481 | 10, 12, 14, 16, 20, 24, 28, 32, 48 |
| `TheMixArab` | **Regular only** | 484 | 5.75, 6, 8, 9, 12, 14, 16, 18, 20, 24, 28, 32, 34 |

No other style of either face appears anywhere in the file. Everything else found
(Product Sans, SF Pro, Roboto, Inter, Intercom, Georgia) is device-mockup chrome.

### T1 — The two faces render as one

`constants/fonts.ts` maps **both** `TheSansArabic` and `TheMixArab` to
`NotoSansArabic-VF.ttf`. The design is built on a near 50/50 contrast between a bold
display face and a regular body face; in the app that contrast does not exist at all. This
is known — `typographyParityResolved()` returns `false` — but its cost has not been stated:
it is not "slightly different glyphs", it is that the type hierarchy is gone.

### T2 — Amiri is used 65 times; the design never uses it

`Amiri-Bold` appears 62 times and `Amiri` 3 times across `app/`, `components/` and
`constants/`. Amiri appears **zero** times in the Figma file. Every one is the wrong family.

### T3 — The body face is barely used

Figma splits roughly evenly (484 `TheMixArab` vs 481 `TheSansArabic`). The app declares
`TheSansArabic` **157** times and `TheMixArab` **8**. Body copy that should be
`TheMixArab Regular` is being set in the display face.

### T4 — Weights contradict the design's own rule

The design only ever pairs `TheSansArabic` with Bold and `TheMixArab` with Regular. The app:

| Declared | Count | Against the rule |
|---|---|---|
| `TheSansArabic` + no weight | 74 | yes — inherits 400 |
| `TheSansArabic` + 700 | 36 | correct |
| `TheSansArabic` + 600 | 35 | yes |
| `TheSansArabic` + 500 | 9 | yes |
| `TheSansArabic` + 400 | 3 | yes |
| `TheMixArab` + 700 | 4 | yes — inverted |
| `TheMixArab` + 600 | 1 | yes — inverted |

121 of 157 `TheSansArabic` declarations are not bold; 5 of 8 `TheMixArab` declarations are.

### T5 — A third of font sizes are off-scale

**113 of 305** `fontSize` declarations use a value that appears nowhere in the Figma file:
11, 12.5, 13, 15, 17, 19, 22, 36, 40 pt.

**Fix:** put the rule in one place — a typography scale keyed by role that pins family,
style and size together, so a caller picks `body`/`title` rather than assembling a family
and a weight. Then migrate call sites. This is the largest single item here and touches
every screen, not just Home, so it is worth doing before the other screens are audited.

## Proposed order

Each step is one commit, TDD where there is a seam, verified by re-running the same
capture-and-measure pass.

| # | Work | Depends on |
|---|---|---|
| 1 | D9 manifest + test correction | — |
| 2 | D1 carousel card width | — |
| 3 | D5 per-SVG aspect ratio | — |
| 4 | D4 navigation icons and geometry | — |
| 5 | D6 + D7 cross-platform text metrics | — |
| 6 | D3 hero layer separation (both heroes) | art from `.fig` |
| 7 | D2 revert the Prophet crop | — |
| 8 | T1–T5 typography scale and migration | licensed fonts for T1 |
| 9 | D8 dawah carousel | full-height export |

Steps 1–5 and 7 are self-contained and can start immediately; 7 is a two-line revert and
the cheapest win here. Step 6 is the largest layout item and the one that actually answers
"optimized for all screens". Step 8 is the largest overall and affects every screen, so it
is worth taking before auditing further screens — though T1 cannot fully land until the
licensed `TheSansArabic` / `TheMixArab` files exist; T2–T5 can.

## Explicitly not in scope

- The Hijri date differs between the frame and the app (`4 جمادى الآخرة 1447` vs
  `٢٧ ربيع الأول ١٤٤٨`). That is live data, not a defect.
- Bookmark buttons appear on the scholar and book cards but not in the Figma frame. They
  are a deliberate product feature from an earlier track, not a regression — flagging only
  so it is a decision rather than an oversight.
- The iOS capture shows the header partly behind the Dynamic Island. That is the screenshot
  overlay, not layout.
