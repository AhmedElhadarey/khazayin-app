# Home screen remediation — QA record

**Date:** 2026-09-10 · **Branch:** `008-home-screen-defects`
**Plan:** `2026-09-09-home-screen-defects.md`, as corrected by
`2026-09-09-home-geometry-findings.md`.

**Typography ruling.** The design sets book titles and scholar names as
calligraphy images, so it declares no font for them; the app's titles are data
and must choose one. Asked directly, the client chose to keep a Naskh face
where the design used calligraphy and move everything the design sets as text
onto `TheSansArabic Bold` / `TheMixArab Regular`. `constants/typography.ts`
encodes that as an explicit `calligraphy` role rather than leaving it implied.

## How this was verified

Both platforms were driven live against the Metro dev server and captured:

- **iOS** — iPhone 16 simulator, 393 × 852 pt at 3×.
- **Android** — Pixel 7 emulator, 412 × 915 dp at 3×.

Captures are in `docs/audit/2026-09-10-home-qa/` (untracked, like the other
audit directories).

Sections below the fold could not be reached on iOS: the simulator takes no
scroll injection, and neither `idb` nor `cliclick` is installed. They were
brought into the first viewport instead by temporarily reordering
`HOME_SECTION_ORDER`, capturing, and reverting — the same trick as the
temporary audit route used for the original measurements. The reorder is not
committed; `constants/homePresentation.ts` is unchanged on this branch.

## Results

| # | Item | iOS | Android | Note |
|---|---|---|---|---|
| D1 | Carousel card widths | ✅ | ✅ | Scholar card holds 216.1 at the reference width, second card runs off the edge as the design does. Book card 192. |
| D2 | Prophet hero artwork | ✅ | ✅ | Subsumed by D3 — the right-edge emblem is present, from the `.fig` layer rather than an asset swap. |
| D3 | Heroes as layers | ✅ | ✅ | Artwork, live text, and an independently tappable `المزيد`. |
| D4 | Bottom navigation | ✅ | ✅ | Vuesax glyphs, outline inactive / solid active, label `TheSansArabic Bold 12`. |
| D5 | Scholar SVG aspect | ✅ | ✅ | Each SVG sized from its own `viewBox`. |
| D6 | Quick-chip truncation | ⚠️ | ⚠️ | Does not reproduce, and **nothing was changed**. See below. |
| D7 | Book row height parity | ✅ | ✅ | Card is a fixed 192 × 81, so the row is the same height on both. See the caveat below. |
| D8 | Dawah fan | ◐ | ◐ | Poster size and step-down match; the outermost pair does not. See below. |
| D9 | Screen manifest | n/a | n/a | Not a defect — see below. |
| D10 | Decoder tracked | ✅ | — | `scripts/figma/` is in the repo. |
| T1 | Two faces, one file | ⛔ | ⛔ | Blocked on the licensed fonts. |
| T2–T5 | Type scale | ✅ | ✅ | Home and the tab bar; the rest of the app is untouched. |
| — | Scholar card interior | ✅ | ✅ | Not a numbered defect; you spotted it. See below. |
| — | Queen card dead strip | ✅ | ✅ | Not a numbered defect; you spotted it. See below. |

### D6 did not reproduce, and nothing was changed for it

The plan recorded `حصريات خزائن الرحمن` truncating to `حصريات خزائن الرح…` on
Android. On a Pixel 7 at its native 412 dp it sets in full, and so does every
other chip. No code was written for this: `QuickChip` is byte-equivalent apart
from routing its label through the type scale at the same family, size and
weight.

The likely cause of the original reading is the measurement harness rather
than the app. Those captures rendered `HomeScreen` inside a 393 pt container
*on a 411 dp device*, so the chips were laid out ~18 pt narrower than the
device actually gives them. A genuinely 393 dp-wide Android device may still
truncate. Worth re-checking on real hardware before calling it closed.

### D8's outermost posters are not where the design puts them

The design's fan is not evenly spaced: neighbours sit 116.11 from the middle
and the outermost pair 176, closer than a second even step would put them.
The carousel steps uniformly, so the outermost pair lands at 232 — **56 pt
further out than the design**.

This is deliberate. Placing them at 176 needs a per-slot shift whose direction
depends on which way the scroll axis runs, and that is precisely the thing
this screen cannot predict: the app forces RTL but also pins `direction: 'ltr'`
on layout containers. The two defects that were actually visible — the focused
poster being 56% of the window instead of 39%, and the step-down being too
shallow — are fixed. The outermost pair is mostly off-screen at that distance.

### The scholar card was drawing its interior 11% too wide

Not in the plan; spotted on device. The design composes that card from two
images — the gold `سماحة الشيخ العلامة` line (74.63 × 22.39) above the
scholar's name (178.23 × 43.69) — as a block 178.23 wide, placed 8.91 from the
card's top. The app carries one bundled SVG per scholar because the names are
data, and its viewBox is that block almost exactly; but it was being stretched
to the card's full inner width (198.28) and centred vertically. It now takes
the design's width and top offset.

### The queen card had a dead strip

Also not in the plan. Its export carried the page background as a margin —
18 px above the card and 74 below — so the card drew a band of `#F8F2ED` along
its bottom edge. The asset is cropped to the card and the aspect ratio is the
design's 361 × 96.

### D7 caveat

The row heights now match, which was the defect. The *wrapping* still differs:
`الإعجاز العلمي في السنة النبوية` sets on one line on iOS and two on Android.
That is a platform text-measurement difference in the substituted face, and it
no longer changes the layout because the card height is fixed. It should
disappear when the licensed faces land, and is worth re-checking then.

### D9 was not a defect

The plan said `figma-mobile-screen-map.json` mislabels node `2001:835` as a
splash frame. Reading the node out of the `.fig` shows it **is** a splash
frame — named "Splash", 393 × 852, holding the emblem, the tagline
`تأخـذ بيـــدك إلى الجنـة`, and the wordmark. What is wrong is the *export*:
`docs/audit/2026-09-09/figma-reference/01-2001-835.png` is a render of Home.
The manifest needs no change; the reference images do, and they are untracked.

`2026-09-09-splash-rebuild-design.md` repeats the same wrong conclusion and
has been corrected.

## Still open

- **T1.** `TheSansArabic` and `TheMixArab` both resolve to `NotoSansArabic-VF.ttf`,
  so the design's display/body contrast still does not exist. The scale is
  built so this is a one-line change in `constants/fonts.ts` when the licensed
  files arrive; no component changes.
- **The rest of the app is not on the scale.** Home is migrated and a test
  fails if a raw font literal reappears there. Roughly 50 other files still
  declare families and sizes inline, including 65 non-legacy `Amiri` uses.
  That sweep is deliberately not in this branch.
- **The design's own type sizes are below a legibility floor.** The Prophet
  hero's body is 9pt in Figma, the queen card's 8pt, the `المزيد` label 6pt.
  Live text floors at 12. That copy runs to about seven lines in the design's
  161pt column, so the Prophet hero renders roughly **205–210pt tall against
  the design's 149** — about 40% taller. It is the one deliberate visual
  divergence here and it is the item most worth the client's opinion: the
  alternative is setting that paragraph at a size the design states but which
  is hard to read on a phone.
- **Both hero tap targets currently go to the same place.** The `المزيد` pill
  is now its own `Pressable` rather than part of a flattened image, which is
  what D3 asked for, but `app/(tabs)/index.tsx` passes only `onMore`, so the
  card and the pill both route to `/sections`. Giving them different
  destinations is a product decision, not a layout one.
- **Three flattened exports are now unreferenced** —
  `hero-prophet-card.webp`, `hero-prophet-card-cropped.webp` and
  `hero-quran-card.webp`, 164 KB together. Left on disk deliberately: deleting
  is USER_ONLY per `conductor/authority-matrix.md`.
- **Web is unverified.** Both changes that touch scroll behaviour — the dawah
  fan and the carousel widths — were checked on iOS and Android only.
