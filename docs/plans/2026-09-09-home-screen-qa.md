# Home screen remediation — QA record

**Date:** 2026-09-10 · **Branch:** `008-home-screen-defects`
**Plan:** `2026-09-09-home-screen-defects.md`, as corrected by
`2026-09-09-home-geometry-findings.md`.

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
| D6 | Quick-chip truncation | ✅ | ✅ | `حصريات خزائن الرحمن` sets in full on both. |
| D7 | Book row height parity | ✅ | ✅ | Card is a fixed 192 × 81, so the row is the same height on both. See the caveat below. |
| D8 | Dawah fan | ✅ | ✅ | Focused poster centred and full size, neighbours stepping down and overlapping. |
| D9 | Screen manifest | n/a | n/a | Not a defect — see below. |
| D10 | Decoder tracked | ✅ | — | `scripts/figma/` is in the repo. |
| T1 | Two faces, one file | ⛔ | ⛔ | Blocked on the licensed fonts. |
| T2–T5 | Type scale | ✅ | ✅ | Home only; the rest of the app is untouched. |

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
  Live text floors at 12. This makes the Prophet hero noticeably taller than
  the design's 149pt — the one deliberate visual divergence here, and worth
  the client's opinion.
- **Web is unverified.** Both changes that touch scroll behaviour — the dawah
  fan and the carousel widths — were checked on iOS and Android only.
