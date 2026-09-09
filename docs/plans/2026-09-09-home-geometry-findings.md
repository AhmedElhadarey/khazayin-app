# Home screen — what the `.fig` actually states

**Date:** 2026-09-09 · Source: `docs/KHAZAYIN.fig` node `2001:940` ("Home Page", 393 × 1321)
and component `2001:17457` (nav tab item), read with `scripts/figma/extract-geometry.js`.

The defect plan was written against rendered exports. The exports of this node dropped
their image fills, which is why it was mistaken for a wrong frame. The node graph itself
is current and complete, and reading it directly **corrects four entries in that plan**.

## Stated geometry

All coordinates are relative to the 393-wide frame origin.

| Element | Figma |
|---|---|
| Page padding | 16 each side (content 361 wide) |
| Section header row | 361 × 21; title `TheSansArabic Bold 16`; `عرض الكل` `TheSansArabic Bold 12`; arrow 20 × 20 |
| Quran hero | 361 × 174 @ (16, 163) |
| Prophet hero | **361 × 149** @ (16, 361) |
| Scholar card | **216.1 × 88.37**, gap 12, first card right edge at 377 |
| Book card | **192 × 81**, gap 12 |
| `أنتِ ملكة` card | 361 × 96 @ (16, 825) |
| Quick chips | 3 × ~112.3 × 48, gap 12, filling 361 |
| Dawah posters | centre **154 × 154.31**, neighbours **122.22**, outermost **95.94** |
| Nav tab item | 42 × 49 inactive, 66 × 49 active; icon 24 × 24; indicator 40 × 4; label `TheSansArabic Bold 12` |

## Corrections to `2026-09-09-home-screen-defects.md`

### D1 is real, but the plan states one card width where the design has two

`responsiveCarouselCardWidth` drives both carousels. The design does not:
**scholars are 216.1 wide, books are 192.** Holding a single width for both is itself a
defect the plan missed. Both rows share the 12 gap and the 16 page padding.

### D2 is wrong in its remedy — neither asset matches

The design's card is 361 × 149, an aspect of **2.423**. `hero-prophet-card.webp` is
1168 × 659 (**1.772**) and `hero-prophet-card-cropped.webp` is 1168 × 583 (**2.003**).
Reverting to the uncropped asset moves *away* from the design, not toward it. The
right-edge emblem the crop removed is real and the design has it (`Frame 2`, 64.62 × 79.37
@ (306, 396)), but it cannot be restored by swapping a flattened raster. **D2 is subsumed
by D3** and should not be done as a separate step.

### D3's first justification does not hold

The plan says the baked-in hero text "ignores the app's own font-size setting" and that
`useFontScale` "exists and works everywhere else". It does not: `useFontScale` returns a
Quran-ayat `{fontSize, lineHeight}` pair from `FONT_SIZE_SCALE` and is consumed in exactly
one file, `app/(tabs)/sections/mushaf.tsx`. There is no app-wide text scale for the heroes
to honour. The other three justifications (unpressable `المزيد`, degradation across screen
widths, uneditable copy) stand, and the geometry above makes the relayout specifiable.

### D8 is not a defect in premise

The plan calls the overlapping dawah posters "wrong". The design overlaps them too — it is
a fanned coverflow, and `DawahCarousel` already implements one. What differs is the
proportions:

| | centre | neighbour | outermost |
|---|---|---|---|
| Figma | 154 (39% of frame width) | 0.794 × | 0.623 × |
| App | 220 (56% of frame width) | 0.84 × | 0.72 × |

So the real defect is that the posters are too large and the step-down too shallow.

## Corrections to the typography findings

### T2 overstates the Amiri case

Amiri appears zero times in the `.fig`, which is true but not the whole picture: the
design sets book titles and scholar names as **calligraphy images**, not text
(`ROUNDED_RECTANGLE "إضاءات copy 4"`, 153–160 × 36–37). The app cannot do that for
arbitrary titles, so it must choose a face where the design chose a picture. That is a
substitution decision, not a defect. Of the 65 non-legacy `fontFamily: 'Amiri…'`
declarations, the ones standing in for design *text* are wrong; the ones standing in for
design *calligraphy* are a judgement call and need the user's ruling.

### D4 gains a defect the plan missed

The design ships **two variants of every nav icon** — `vuesax/<name>` outline when
inactive and `vuesax/bulk/<name>` filled when active:

| Tab | Figma icon | App icon |
|---|---|---|
| `الرئيسية` | `home-2` / `bulk/home-2` | `HouseIcon` (one variant) |
| `مكتبتي` | `book` / `bulk/book` — an open book | `BookmarkIcon` — a bookmark |
| `الأقسام` | `category-2` / `bulk/category-2` | `GridIcon` (one variant) |
| `المزيد` | `more-2` / `bulk/more-2` — circles | `MenuLinesIcon` — hamburger |

`CustomTabBar` renders a single icon per tab and never switches on `active`. The label is
also `fontSize: 11, fontWeight: '500'` against the design's `TheSansArabic Bold 12`.
