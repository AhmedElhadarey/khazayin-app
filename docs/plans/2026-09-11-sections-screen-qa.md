# Sections tab remediation — verification record

**Date:** 2026-09-11 · **Branch:** `010-sections-screen-defects` (off
`009-library-screen-defects`, which is off `008-home-screen-defects`; none are
merged).
**Spec:** `docs/KHAZAYIN.fig` only. No plan document was read — the seventeen
frames were decoded from the binary node graph and compared against the running
app on two devices.

Everything below is checkable. Where a number is claimed it was measured off a
device capture, not eyeballed.

---

## 1. What to check it with

```bash
npm start                     # Metro must be running
npm run ios                   # or open the iPhone 16 simulator yourself
npm run android               # or boot Pixel_7_API_36
```

Both devices used here:

- **iOS** — iPhone 16 simulator, 393 × 852 pt at 3 px/pt (1179 × 2556).
- **Android** — Pixel 7 emulator, 412 × 915 dp at 2.625 px/pt (1080 × 2400),
  with the 393 pt content column pinned to the left by forced RTL, so a capture
  has a **49 px** x-offset before the design origin.

Deep links are the fastest way to reach a screen. `adb` is not on `PATH`; use
the full path.

```bash
xcrun simctl openurl booted "khazayinapp://sections/prophet"
~/Library/Android/sdk/platform-tools/adb shell am start \
  -a android.intent.action.VIEW -d "khazayinapp://sections/prophet"
```

> **Android content cache.** The poster fixture is served through the persisted
> SWR cache, so a content edit can keep rendering the *old* list through a
> force-stop and reload. If a screen looks stale, `adb shell pm clear
> com.ahmed.elhadarey94.khazayinapp` — then skip onboarding again. This cost an
> hour during this pass; it is not a rendering bug.

### Reading the spec yourself

The decoder is tracked, so any number in this document can be re-derived:

```bash
node scripts/figma/extract-geometry.js docs/KHAZAYIN.fig 2465:1911 /tmp
node docs/audit/2026-09-11-sections-qa/summ.js /tmp/fig-geom-2465-1911.json
```

`summ.js` collapses repeated sibling shapes; `show.js` prints the whole subtree
in frame-local points. Both print fill, **stroke, effects and per-corner radii**
— `extract-geometry.js` was extended on this branch to emit those three, which
is how "this card casts no shadow" stops being an opinion.

Pre-decoded JSON for all eighteen frames, and every capture referenced below,
are in `docs/audit/2026-09-11-sections-qa/` (untracked, like the other audit
directories).

---

## 2. Walk the tab

Seventeen routes, plus two states that are not routes of their own. Each row
names the frame to compare against and the one thing most worth looking at.

| # | Route | Deep link suffix | Frame | Look at |
|---|---|---|---|---|
| 1 | Sections root | `sections` | 2031:5675 | 96pt cards, r20, **no border, no shadow**, 64pt disc with a gold ring, count in navy. Scroll: all nine. |
| 2 | Reciters — Mujawwad | `sections/reciter?tab=tajweed` | 2031:6193 | Tab strip 84×45 on `#EDE0D1` with a 70×4 navy bar; rows 56 · r12. |
| 3 | Reciters — Murattal | `sections/reciter?tab=murattal` | 2102:3187 | Same, different tab selected. |
| 4 | Scholars | `sections/scholar` | 2102:2975 | 64pt cards at **r20 with no stroke** — the rail supplies the edge. Disc, not a gold ribbon. |
| 5 | Scholar detail | `sections/scholar/s1` | 2510:1990 | 56 · r12 with the 12×54 gold ribbon rounded on its **outer** side only. |
| 6 | Dawah months | `sections/dawah` | 2120:942 | 56 · r16, rows **4** apart, no search field (the frame has none). |
| 7 | Dawah posters | `sections/dawah/shawwal-ramadan` | 2120:1857 | 89 · r16 with the **real client poster** at 74×73 · r8. |
| 8 | Reciter surahs | `sections/reciter/r1` | 2207:5270 | 60 · r16, 36pt numbered star badge, rows 6 apart. |
| 9 | Mushaf index | `sections/mushaf` | 2207:17898 | Same row as #8 — the two lists used to draw one node two ways. |
| 10 | Mushaf reader | `sections/mushaf?surah=2` | 2349:982 | **See §4** — the largest judgement call on the branch. |
| 11 | Qiraat sheet | `sections/qiraat` | 2457:954 | Sheet grabber 36×4, centred 16pt title, rows 6 apart (they used to touch). |
| 12 | Prophet | `sections/prophet` | 2465:1911 | The canonical lecture row: 64 · r16 · `#D9D6D3`. |
| 13 | Queen | `sections/queen` | 2589:1772 | Identical row, different badge. |
| 14 | Books | `sections/books` | 2597:2552 | Identical row. |
| 15 | Radio | `sections/radio` | 2606:3830 | Identical row — this one regressed mid-branch and was caught by the spec review. |
| 16 | Audiobooks | `sections/audiobooks` | 2869:2088 | 56 · r20 · no stroke; letter rail with the navy `م`. |
| 17 | Exclusive | `sections/exclusive` | 2869:2306 | Same as #16. |

**Regression surfaces** (shared primitives changed, so these must still be
right): `` (Home), `library`, `more`, `more/archive`.

---

## 3. What was wrong, and what it is now

Every value below is stated by the file. The app had collapsed seven row shapes
into three.

| Row | Frame | Should be | Was |
|---|---|---|---|
| Section card | 2031:5675 `DIV-43` | 361×96 · r20 · no stroke · 64 disc | 15/600 type, border **and** shadow |
| Scholar list | 2102:2975 `DIV-107` | 333×64 · r20 · no stroke · 40 disc | gold ribbon instead of a disc |
| Audiobooks / exclusive | 2869:2088 `DIV-107` | 333×56 · r20 · no stroke | 66 · r12 |
| Lecture row | 2465:1911 `DIV-139` | 361×64 · r16 · `#D9D6D3` · 40 disc | 66 · r12, Amiri titles |
| Surah row | 2207:5270 `DIV-67` | 361×60 · r16 · `#D9D6D3` · 36 disc | two different rows for one node |
| Dawah month | 2120:942 `DIV-139` | 361×56 · r16 · `#D9D6D3` | 66 · r12 |
| Reciter / qiraa | 2031:6193 `DIV-139` | 333×56 · r12 · `#D9D6D3` | 60, shadowed |
| Scholar detail | 2510:1990 `DIV-139` | 364×56 · r12 · 12×54 ribbon | 5pt ribbon |

Four things were wrong across all of them: a **shadow the file never casts**, a
`rgba(141,107,52,0.08)` border where it states either a `#D9D6D3` hairline or
none at all, **calligraphic Amiri titles** where it sets the body face, and a
**bare icon tint** where `DIV-58` carries a 1pt `#A88051` ring.

### Type

One rule, everywhere: a row title is **TheMixArab Regular 14** in `#281E13`
(`bodyCompact`), its subtitle **TheMixArab Regular 12** in `#5F5345`
(`caption`), and the meta line **TheSansArabic Bold 12** in the same warm ink
(`label`) — not the navy it had been. Two exceptions, both stated: the section
card is the file's only display-face row (16 / 14 / 12, count navy), and the
dawah rows title at TheSansArabic Bold 14.

Page titles are **TheMixArab Regular 18** in `#281E13`. They had been Amiri
Bold in navy, which is why the tab read as a different product from Home.

### Chrome

| Control | Frame value | Was |
|---|---|---|
| Search field | 361×40 · r12 · `#D9D6D3` · shadow y+4 blur 16 black 8% | 44 tall, `cardBorder` tint |
| Letter rail | 20pt column, hairline `#D7B995`@16%, 16×22 r4 chips 4 apart | 26pt column, 22×22 r6 chips with borders |
| Rail selected chip | same 16×22 r4 box, navy behind `#F1E7DD` | widened **and** recoloured — two states conflated |
| Reciter tabs | 84×45 · r7.5 on `#EDE0D1`, label display face 10 navy, 70×4 bar | 13pt labels, r12, 3pt underline |

The search field is deliberately **under** the 44pt touch minimum, because the
file says 40. The target is made up with `hitSlop`, and
`__tests__/sectionsLayout.test.ts` asserts that it stays under 44 so the
`hitSlop` never becomes dead weight.

---

## 4. Judgement calls — look at these first

### 4.1 The Mushaf reader's ground *(the big one)*

The reader painted a `#FBF3DF` parchment under a `#F3E4BE` footer with a rule
above it. Node 2349:982 contains **only** a header, a meta line and a footer,
all on the same `#F8F2ED` as every other screen. *(Superseded 2026-10-23: 2349:982 is the header-and-footer overlay shown on tap over the page of 2349:829, which is the reading page itself.)* It is *silent* on a reading
surface, not contradicting one — so this is a reading of the spec, not a
quotation of it.

I moved the page to the shared ground and kept the ornamented basmala block and
the Amiri ayat body, which have no node at all.

**To revert:** one constant, `app/(tabs)/sections/mushaf.tsx:40`.

Compare `ios-17-mushaf-reader.png` against your memory of the old screen.

### 4.2 The reciter tab bar

The file draws the 70×4 navy bar on **all four** tabs, because it only ever
models the strip in one state, and sets every label navy either way. Drawing it
on all four leaves the control with no selected state at all, so it is on the
active tab only. Deliberate.

### 4.3 The section card is 99.4, not 96

`DIV-44` is 64 tall inset 16 — but the text beside the disc (`DIV-48`) is 68 and
overflows that box **in the file too**, so the inset the frame actually renders
to its first line of type is 14, and that is what the app uses.

The remaining **3.4pt** is the 1.5× line-height floor in
`constants/typography.ts`, which exists because React Native clips a Text's
glyph box to `lineHeight` and Arabic hangs its marks above the Latin cap height.
Without it, `القرآن` renders as `القران`. Same residual the Library work
disclosed; it is a device constraint, not a porting error.

---

## 5. Measured, both platforms

Column scans normalised to design points, taken at an x clear of glyphs and of
the corner arc.

| What | Frame | Measured | Where |
|---|---|---|---|
| Section card height | 96 | **99.4 – 99.8** | §4.3 explains the 3.4 |
| Section card gap | 8 | **8.0** | ✅ exact |
| Lecture row height | 64 | **63.8** | ✅ exact |
| Lecture row gap | 6 | **6.0** | ✅ exact |
| Reciter / qiraa row | 56 | **56.0** | ✅ exact |
| Reciter / qiraa gap | 6 | **6.0** | ✅ exact |
| Reciter tab strip | 45 | **45.0** | ✅ exact |

Text colours sampled from the Android capture rather than trusted by eye:
header `#281e13`, row title `#281e13`, duration `#5f5345`. All three match the
file.

---

## 6. Two reviews were run, and both found real things

### Spec compliance, against the frames

| Finding | Status |
|---|---|
| `radio.tsx` still passed `compact`, which this branch had redefined mid-way as the *rail* row — the whole screen went short, over-rounded and borderless | **fixed** (`1249a5a`) |
| Letter rail widened the selected chip **and** filled it navy, conflating two states. The file's selected chip keeps the idle 16×22 r4 box; the 20×22 r8 chip is a separate, *unselected* state | **fixed**, and the test that encoded the error corrected |
| Rail column's own 1pt `#D7B995`@16% stroke was missing | **fixed** |
| Dawah month list's gap never reached its rows (the `AsyncContent` wrapper swallows a container `gap` — same shape of bug as the qiraat rows) | **fixed** |
| Reciter surah list stepped 8 where 2207:5270 steps 6 | **fixed** |
| Dawah poster list stepped 10 where 2120:1857 steps 4 | **fixed** |
| `SurahStar` numeral was Amiri 13 in the wrong gold | **fixed** — display face 12 in `#A88051` |

### Code quality

| Finding | Status |
|---|---|
| `SearchPill` / `SegmentTabs` / mushaf footer fixed their heights, so a larger system font scale would clip rather than grow | **fixed** — floored instead |
| `LetterIndex`'s chip shrank to 16×22 without its `hitSlop` following | **fixed** — reaches 44 horizontally, and as far vertically as the 4pt chip gap allows |
| `SECTION_CHROME` grouped by *page*, which is why its tab fields duplicated `SEGMENT_TABS` and its rail fields had no owner | **fixed** — split into `PAGE_CHROME`, `LETTER_RAIL`, and the tab metrics folded into `SEGMENT_TABS`; four dead fields deleted |
| Both surah rows declared their own `36` and `60` | **fixed** — `CARD_DENSITY.surahBadgeDisc` / `surahRowMinHeight` |
| The More card's shadow was five literals | **fixed** — `KhazainShadows.listRow` |
| `DawahPosterRow`'s two 20pt buttons sit 8 apart, so a symmetric 12pt `hitSlop` overlapped | **fixed** — asymmetric |
| The tests mostly restated the constants file back to itself | **fixed** — see §7 |
| `compact` / `compact` / `badge` are three encodings of one concept; wants explicit `variant` unions | **deferred** — a refactor across call sites, not a parity fix |

---

## 7. Automated gates

```bash
npx tsc --noEmit --pretty false     # 0 errors
npx jest                            # 68 suites, 718 tests
npm run lint                        # 0 errors, 14 warnings (all pre-existing,
                                    # all in untouched legacy files)
```

`__tests__/sectionsLayout.test.ts` is new. It pins every Figma-measured number —
that part is documentation — but the assertions that *bite* are at the bottom:
they read each row component's source and require it to reference the shared
constant, the way `__tests__/fontRegistry.test.ts` guards font families. The
point is that before this branch every row had its own hardcoded height, and
nothing failed. Re-hardcode one now and the suite goes red.

`__tests__/designTokens.test.ts` had a "Mushaf surface" case that only checked
the reader's bespoke colours stayed out of the shared palette. The reader has no
bespoke colours any more, so it now asserts the stronger fact.

---

## 8. Known-and-deliberate, so not defects

**Data and fixture gaps — fixing them would mean inventing content.**

- Scholar-detail durations are `''` in `data/content/scholars.ts` by design
  (archive series carry per-episode durations); node 2510:1990 shows
  `٣٢ دقيقة`. The slot renders correctly when a duration exists.
- Only some dawah months have posters. `sections/dawah/d1` renders the empty
  state; use `sections/dawah/shawwal-ramadan`.

**In the app, not in the frame — kept on purpose.**

- Scholar detail's `فضيلة الشيخ / <name>` block has no node in 2510:1990. Kept
  because it is the only place the screen says whose lectures these are;
  restyled onto the scale so it reads as furniture, not a second title.
- The Mushaf's ayat body and ornamented basmala block have no node in 2349:982.
- `SurahRow` has a bookmark at the physical left; in 2207:17898 that slot is
  empty (its play instance has opacity 0), so the bookmark is a pure app
  addition (savedContent G2 entry point).

**Out of this screen's scope.**

- The 392×549 overlay-blend header art (`Vector Smart Object`, hash `e2364e38`)
  is still undrawn. It is in *all* 28 frames, so it is one job, not seventeen.
- More's card is 82 tall with an `#F1E7DD` stroke and a 48×48 **rounded-square**
  chip in node 2102:2711. It is 64 here with a circular chip. More needs its own
  pass; this branch only kept it from regressing (its shadow and unstroked chip
  are preserved deliberately — `7b8cb05`).
- `/search` resolves to `app/(tabs)/search.tsx`, the legacy hidden tab, not
  `app/search.tsx`. So the reworked input-mode search pill is not reachable from
  any Sections screen. Pre-existing route collision, flagged not fixed.
  **Closed 2026-10-21:** search moved to `/content-search` and every pill opens it
  through `openSearch()`; see `docs/plans/2026-10-21-content-search-reachability-qa.md`.

---

## 9. Commits

| SHA | Subject |
|---|---|
| `2f6f08e` | draw the page chrome the way the seventeen frames do |
| `7ac3889` | draw every row the way its own frame states |
| `f9d6c81` | put the Mushaf on the same ground as the rest of the app |
| `7b8cb05` | keep the More list on its own frame's chrome |
| `ed67e8b` | close the gaps the device measurements found |
| `1249a5a` | act on the spec and quality reviews |
| `5c6e2d0` | draw the poster thumbnail the frame actually shows |

37 files, +776 / −557.

```bash
git diff 9326081..HEAD --stat        # everything this branch did
git diff 9326081..HEAD -- constants/ # the values, if you only read one thing
```

---

## 10. Standing disclosures

1. **`Co-Authored-By` trailers.** CLAUDE.md §7 says commits must not carry them.
   The session harness mandates one. I have followed the harness and disclosed
   the conflict on every report; **21 commits** across `008`/`009`/`010` now
   carry it. Say the word and I will rewrite them out.
2. **`/code-review` has not been run** on `c2571cc`, `c62e967`, `5e80450`,
   `d967b5a`, `9326081`, `2f6f08e`, `7ac3889`, `f9d6c81`, `7b8cb05`, `ed67e8b`,
   `1249a5a`, `5c6e2d0` — twelve commits. The two reviews in §6 were run as
   subagents against the `.fig` and the repo's standards, which is the same two
   axes, but it is not the tracked command.
3. **Three branches are unmerged**: `008-home-screen-defects`,
   `009-library-screen-defects`, `010-sections-screen-defects`. Merging is
   yours to call.
4. **`typographyParityResolved()` is still `false`.** `TheSansArabic` and
   `TheMixArab` both resolve to `NotoSansArabic-VF.ttf`, so the display/body
   contrast the design is built on is not visible on either device yet. Every
   pairing in this branch is correct in the source and will simply become
   visible when the licensed files land — nothing here needs revisiting then.
