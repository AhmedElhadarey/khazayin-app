# More tab + icon extraction — verification record

**Date:** 2026-09-12 · **Commits:** `19668eb` … `bec3c11` (8) · **Branch:** `main`

Two pieces of work, done together because the second is what the first needed:

1. The **More tab** brought onto its four Figma frames, every sub-screen walked.
2. Every **icon in the app** read out of `docs/KHAZAYIN.fig` instead of redrawn
   by hand.

The trigger was a one-line report: *"the size of the card is not the same, also
the spacing is not correct."* Both were true, and §3 explains why.

---

## 1. How to run this yourself

### Deep links

Both devices take the same URLs. Scheme `khazayinapp://`, package
`com.ahmed.elhadarey94.khazayinapp`.

```bash
SIM=$(xcrun simctl list devices booted | grep -o '[0-9A-F-]\{36\}' | head -1)
ADB=~/Library/Android/sdk/platform-tools/adb        # not on PATH

xcrun simctl openurl $SIM 'khazayinapp://more'
$ADB shell am start -a android.intent.action.VIEW \
  -d 'khazayinapp://more' com.ahmed.elhadarey94.khazayinapp
```

Routes: `more`, `more/archive`, `more/contact`, `more/about`, `more/settings`,
`more/settings-progress`. Regression surfaces: `` (home), `library`,
`sections`, `sections/reciter`, `sections/qiraat`, `sections/mushaf`,
`sections/dawah`, `sections/radio`.

### Device geometry, if you measure pixels

| | resolution | px per design pt | x-offset |
|---|---|---|---|
| iPhone 16 | 1179 × 2556 | 3.0 | 0 |
| Pixel emulator (density 420) | 1080 × 2400 | 2.625 | **49** |

The Android x-offset is real: the frame is 393pt on a 411pt-wide device, so the
content is inset. Measuring without it puts every horizontal number out by 19pt.

### The Android cache trap

The app has a persisted two-tier SWR cache (`services/cache/*`). **A fixture
edit can keep serving stale data through force-stop and reload.** If a content
change does not appear:

```bash
$ADB shell pm clear com.ahmed.elhadarey94.khazayinapp   # then skip onboarding
```

This cost an hour in the previous pass. It is not needed for a pure style
change, which is why this pass did not use it.

### Re-deriving any number here

Nothing below was measured off a screenshot. Everything is read out of the
binary node graph with the tracked decoder, from the repo root:

```bash
node scripts/figma/extract-geometry.js docs/KHAZAYIN.fig 2102:2711 /tmp
# → /tmp/fig-geom-2102-2711.json, one row per node:
#   x y w h · cornerRadius/radii · fill · fillHidden · stroke · strokeWeight
#   effects · fontName/fontSize/lineHeight · text · images
```

Coordinates are absolute; subtract `rows[0].x` / `rows[0].y` for frame-local.

> **`fillHidden` is new, and it is the reason §5.2 exists.** A paint can carry
> `visible: false` — switched off by the designer, not rendered. The old dump
> reported it as a fill, and that is exactly how the contact form card shipped
> in the wrong colour. Read `fill`; treat `fillHidden` as "considered and
> rejected".

For icons:

```bash
node scripts/figma/extract-icons.js            # regenerate the set
node scripts/figma/extract-icons.js --check    # fail if it is out of date
node scripts/figma/extract-images.js           # the three raster assets
```

---

## 2. The walkthrough

Nineteen captures per platform in `docs/audit/2026-09-12-more-qa/`
(untracked — `.gitignore:62`). Reference exports are
`docs/audit/2026-09-09/figma-reference/`.

| # | Route | Frame | What to look at |
|---|---|---|---|
| 1 | `/more` | 2102:2711 | Card **82** tall at r16, cream stroke, tight shadow; a **48pt rounded square** chip, not a 40pt circle; rows **94** apart. All eight glyphs from the file. |
| 2 | `/more/archive` | 2558:1334 | Cards **112** at r20, no stroke, 64pt gold-ringed disc; three of the nine section marks reused. |
| 3 | `/more/contact` | 2106:2598 | Two 82pt rows with **no disclosure**; the form card is a **transparent** box with a hairline, its fields cream wells inside it. Button r8. |
| 4 | `/more/about` | 2106:2712 | Body face throughout — 14/20 prose, 14 card headings, 12/16 card copy. Nothing in Amiri. First paragraph 43 below the header band. |
| 5 | `/more/settings` | *(none)* | Rows are the **same box** as `/more`. This is the defect that was reported. |
| 6 | `/more/settings-progress` | *(none)* | Header art only. |
| 7–14 | the eight regression surfaces | various | Nav bar, search pill, back control, row badges — every one of them changed. |

Two states with no route: the More list's **load skeleton** (8 rows at 82/12,
so the page does not jump) and the contact form's **validation alert**.

---

## 3. What was wrong, and why it was two bugs in one

`ListRowCard` carried a `compact` boolean. `compact` meant "the More row", but
it was implemented by borrowing the **lecture** row's height — so the More card
drew at 64 where the frame states 82. Meanwhile `/more/settings` passed nothing
at all, so it drew the 96pt **section** card. Two screens one tap apart
disagreeing about how tall a row is.

| | app before | frame |
|---|---|---|
| More card height | 64 | **82** (`websiteLink-13`) |
| More card stroke | `cardBorder` rgba | **`#F1E7DD`** @1 |
| More chip | 40 circle | **48 square, r16** |
| Row gap | 8 | **12** |
| Text → chip gap | 12 | **16** |
| Settings row | 96 (section card) | the More row |
| Page title | Amiri-Bold 22 navy | **TheMixArab 18 `#281E13`** |

`compact` is gone, replaced by `variant: 'section' | 'archive' | 'more'` — one
name per box the file actually draws.

---

## 4. The icons

### What was there before

Every icon was a hand-drawn `react-native-svg` approximation. Three of the four
**tab bar** icons were the wrong shape: a bookmark where the design has an open
book, a hamburger where it has three circles, a four-square grid where it has
two squares and two circles on the diagonal. The Library note toolbar set two
of its marks as **styled letters** — a bold `B` and an italic `I`.

### How they come out now

`scripts/figma/vector.js` decodes Figma's flattened outlines. A node's
`fillGeometry`/`strokeGeometry` points at a command blob: a byte opcode then
float32 LE coordinates.

| opcode | | args |
|---|---|---|
| `0` | close | 0 |
| `1` | move | 2 |
| `2` | line | 2 |
| `3` | quad | 4 |
| `4` | cubic | 6 |

Settled by decoding **all 13,084 geometries in the file with zero unknown
bytes**, and confirmed against a node whose outline traces its own box.

Three things make it more than a tree walk, and each one bit:

1. **An INSTANCE carries no children.** It points at a SYMBOL master and
   restates paints and geometry per node. Those restatements are addressed by
   **`overrideKey`, not `guid`** — a copied component gets fresh guids but keeps
   a key pointing at the original definition. Matching on `guid` finds nothing
   and silently falls back to the master's paint. See §5.1.
2. **A stroked icon has no fill.** Figma pre-outlines the vuesax "linear" set
   into `strokeGeometry`, so those are emitted as fills in the stroke colour.
3. **Sibling order is paint order**, and `position` is a fractional index meant
   to be compared byte by byte. See §5.3.

### Coverage

**54 icons**, each carrying the node id it came from so any path is
re-derivable: the 4 tab icons in both idle and selected variants, the 5 chrome
glyphs instanced across every screen, all 9 section marks, all 8 More row
glyphs, 10 row badges, the surah star, the Library stat and note-toolbar icons,
the Mushaf reader footer, and the dawah poster actions.

**2 recorded as not drawn**, in the manifest's `notDrawn` with the reason:

- `SectionExclusiveSeal` (2355:1480) — the word خزائن الرحمن on the حصريات
  card is a **raster** IMAGE paint. The disc and letterforms around it are
  vector and are extracted; the word comes out of the archive's `images/` at its
  source 139 × 164 with alpha intact.
- `HomeAudioBook` (2093:1760) — the same raster seal over a gold disc.

### Sizes are not uniform, and that matters

Inside the same 64pt disc the file sets الكتب العلمية at **48**, القرآن at
**44**, أنتِ ملكة at **20 × 44** and برامج إذاعية at **23 × 36**. `FigmaIcon`
therefore defaults to the size the file states. Forcing all nine to 34 made the
books mark 30% small and squashed the ملكة mark to 15 × 34.

### The header art is pre-composited, and that is not a shortcut

All 28 frames lay a 392 × 549 geometric tile and one or two corner motifs over
the page, **at `blendMode: OVERLAY`**. React Native has no blend modes.

This is not cosmetic. The corner motif's source art is **opaque black** — only
the blend turns it into a 248 → 241 whisper rather than ink. Drawn with plain
alpha at any opacity it is wrong.

The ground is `#F8F2ED` in every frame, so the blend has exactly one correct
answer. `extract-images.js` computes it once and writes an opaque asset that
renders identically at full opacity. **Nothing guesses an opacity**, and
`__tests__/figmaIcons.test.ts` fails if `pageBg` drifts from the value baked in.

---

## 5. Four defects found by measuring, not by reading

### 5.1 The WhatsApp glyph — a wrong conclusion, corrected

The first pass recorded the whatsapp row as *"a placeholder the designer never
replaced"* and kept the app's own mark. **That was wrong**, and the Figma
reference export said so: it shows a real WhatsApp logo.

The glyph is there. It sits inside an INSTANCE named `Yu` whose own paints are a
disc, and the glyph under it is addressed by `overrideKey`. The first read found
the disc and nothing else. Fixed at the decoder; the claim is withdrawn.

*The lesson: an empty render is a hypothesis, not a finding. It was only caught
because the rendered export was compared against the decode.*

### 5.2 The contact form card has no fill

`DIV-126`'s one paint is `visible: false`. The card is a **transparent** box
with a `#D9D6D3` hairline, so the page ground shows through and the `#FCFAF8`
fields read as wells inside it.

Drawing the card in `#FCFAF8` — what the paint says if you do not check whether
it is switched on — **made the fields vanish into it**, and that is how it
shipped. `extract-geometry.js` now separates `fill` from `fillHidden`;
re-checking all four More frames found no other misread.

### 5.3 Two icons painted in the wrong order

Sorting fractional indices with `localeCompare` **collates**. It had reversed
the category tab's active variant and the dawah download, so their dimmed
backing shape painted over the solid one. Now a codepoint compare, with the
sequence pinned per icon in a test.

### 5.4 The list gap never reached the rows

**Measured on device: the More rows stepped 82 where the frame states 94.** The
cards were butted, with only their 1pt strokes between them.

`AsyncContent` renders its children inside a fade wrapper, and that wrapper is a
real layout box — so a `gap` on the container *around* it spaces the wrapper
from its siblings and never reaches the rows.

This is the **third** list it has flattened (the qiraat rows and the dawah
months were the first two, each patched locally), so this time the fix is at the
cause: `AsyncContent` takes a `style` and forwards it to the view that holds the
children. A sweep of all eighteen consumers found one more screen with the same
shape — the scholar detail list. Both now pass their gap there.

**After: 94.0 on iOS, 94.1 on Android, against the file's 94.**

---

## 6. Measured on device

| what | frame | iOS | Android |
|---|---|---|---|
| More row step (card + gap) | 94 | **94.0** | **94.1** |
| More card height | 82 | 82 | 82 |
| Corner ornament position | left 84 / 356 | ✔ | ✔ *(not mirrored)* |

The ornament check is the one worth repeating by eye on Android: the two motifs
are placed by physical `left` at asymmetric offsets, so under `forceRTL` they
would mirror without a pinned direction. They do not.

---

## 7. Both reviews

Run as parallel subagents against `git diff 2958ba0...HEAD`.

### Spec (vs. the `.fig`)

| finding | status |
|---|---|
| Contact fields are `#FCFAF8`, not the page cream | **fixed** |
| A pushed sub-screen draws one corner motif, 8 lower | **fixed** |
| Text column ends 16 short of the chip, not 12 | **fixed** |
| More title sits 60 above the first card, not 44 | **fixed** |
| `contactUs-55` → `DIV-126` is 24; `Inputs` → `DIV-59` is 19 | **fixed** |
| Phone is stated in Arabic-Indic | **fixed** (Latin form kept for the `wa.me` URL) |
| `لتصل`, not `لنصل` | **fixed** |
| Disclosure should be `#A0AEBA` | **rejected — see below** |
| `MORE_EXTENSION_ROWS` is scope the frame does not state | accepted, app-owned |

**The rejected one.** The masters carry `#A0AEBA` as a vuesax default, but the
frames override it. Two independent checks agree: the frame's own instance
overrides resolve to `#184B76`, and the reference export of 2102:2711 contains
**zero `#A0AEBA` pixels against 25,039 `#184B76`**.

### Code quality

| finding | status |
|---|---|
| `HeaderArt` placed corner motifs by physical `left` with no pinned direction — would mirror under forceRTL | **fixed** (`SparkleSectionIcon` had the same bug) |
| `figmaIcon()` unused while three files re-implemented it | **fixed** |
| A stroke-only `BOOLEAN_OPERATION` would be drawn twice | **fixed** |
| `localeCompare` on fractional indices | **fixed** — see §5.3 |
| `satisfies Record<ListRowVariant, unknown>` checks nothing | **fixed** (`ViewStyle`) |
| The `monochrome` test re-derived the generator's own rule | **fixed** — asserts the answer, not the rule |
| `dawah.tsx` was the last screen still tiling `OrnamentPattern` | **fixed** |
| `HouseIcon` / `GridIcon` / `MenuLinesIcon` / `SearchIcon` now reachable only from the dev sandbox | **left** — CLAUDE.md preserves legacy deliberately |

---

## 8. Gates

```
npx tsc --noEmit     clean
npx jest             70 suites, 749 tests, all passing
npm run lint         0 errors, 14 warnings (all pre-existing, all legacy files)
```

New tests worth knowing about:

- `__tests__/figmaIcons.test.ts` re-runs the generator with `--check`, so a
  manifest edit that was never regenerated **fails** instead of drifting. It
  also fails if any rewired file grows an `<Svg` of its own.
- `__tests__/moreLayout.test.ts` guards the `AsyncContent` gap trap directly,
  because that one has now cost three lists.

---

## 9. Deliberate, not missed

- **The whatsapp chip's ring.** The file's `Yu` instance draws a thin navy ring
  around the glyph. The app's 48pt squircle chip replaces it.
- **The two Mushaf bookmark buttons share one mark.** Node 2349:982 draws
  `DIV-130` twice, identically — the distinction between "go to" and "save" is
  the Arabic label. The app's old filled-vs-outline variant was invented.
- **`InlineHeader` is 44, the file's band is 36.** The cost of a 44pt touch
  target. Each screen absorbs the 8pt below it.
- **Arabic-Indic digits.** The file writes `65`; the app writes `٦٥`
  throughout. An app-wide convention, not a miss.
- **Design typos not copied**: `خزان` → `خزائن`, `الارشيف` → `الأرشيف`,
  `تعرف` → `تعرّف`.
- **The footer wordmark** is a 299 × 47.6 vector lockup in `#7F613D`
  (2120:1668); the app renders `Wordmark` as Amiri text. Not ported.
- **Settings and progress rows** have no frame, so they keep drawn glyphs.
- **The 1.5× Arabic leading floor** (`MIN_LINE_HEIGHT_RATIO`) raises six of
  fourteen roles above the file's stated leading. A React Native constraint —
  it clips a Text's glyph box to `lineHeight` and Arabic marks hang above the
  Latin cap height — not a spec deviation.

---

## 10. Commits

| sha | |
|---|---|
| `19668eb` | the More row at the box the file states |
| `c79e124` | the extractor, the manifest, 39 icons |
| `d1090df` | nav, chrome and section marks wired |
| `008089b` | row badges and header art |
| `c05d6dc` | the three sub-screens |
| `d58b916` | Library, Mushaf reader, dawah actions |
| `5a8455d` | both reviews acted on |
| `bec3c11` | the gap that never reached the rows; the card with no fill |

---

## 11. Standing disclosures

1. **`Co-Authored-By` trailers.** CLAUDE.md §7 forbids them; this session's
   harness mandates them. They are present on all 8 commits. Say the word and
   they come out of these and the 22 earlier ones.
2. **Nothing was pushed, and no branch was merged.**
3. **`docs/audit/2026-09-12-more-qa/`** (26 captures, 8.9 MB) is untracked by
   `.gitignore:62`. This markdown is the tracked record.
4. **`assets/figma/` is tracked** and adds ~690 KB: three source images from the
   archive plus two pre-composited derivatives. `extract-images.js` regenerates
   all five and is byte-stable.
