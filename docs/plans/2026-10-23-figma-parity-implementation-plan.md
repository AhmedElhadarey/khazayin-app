# Figma parity pass: implementation plan

**Design:** `docs/plans/2026-10-23-figma-parity-design.md`
**Findings (full task text per ticket):** `docs/plans/2026-10-23-figma-parity-findings.md`
**Branch:** `fix/figma-parity-2026-10-23`
**Tickets:** Trello cards #70 (T01) to #96 (T27) on «مكتبة خزائن الرحمن».

## How every task runs

Each task goes through these steps, per CLAUDE.md:

1. An implementer subagent gets the ticket's full finding text inline.
2. **TDD.** It writes the failing test, sees it fail for the stated reason, then implements.
3. **Checks.** It runs `npx jest`, `npx tsc --noEmit --pretty false` and `npx eslint <touched files>`.
4. **Commit.** One conventional commit per task, with no AI attribution or `Co-Authored-By`.
5. **Spec review.** A spec-compliance reviewer checks the change against the finding: no more, no less.
6. **Quality review.** A code-quality reviewer runs only after the spec review passes.
7. **Re-review loop.** Fixes go back to the same implementer and are reviewed again.
8. **Device check.** After each ticket, the touched screens are re-captured on iPhone 16 and Pixel 7.

These rules hold for every task:

- **Phone geometry stays responsive.** Use the existing `constants/layout.ts` / `constants/responsive.ts` helpers, not new fixed widths.
- **Tablet output must not change** except where a finding names the tablet.
- **The RTL contract applies.** Spread `RTL_TEXT` on text, use `PHYSICAL_ROW`/`PHYSICAL_BOX` for physical order, and never `row-reverse` or an `I18nManager` read.
- **Width test.** Every changed title still fits at 320 and 360dp at font scale 1.3. If it does not, the title gets full width (wrap), never a shrink-wrap.

## Order and dependencies

```
T01 fonts ─┬─ T02 weight sweep ─┬─ T24 / T25 / T26 (no-frame screens)
           │                    └─ every per-screen ticket
           ├─ T03 InlineHeader      ┐
           ├─ T04 HeaderArt ── T05  │ shared primitives
           ├─ T06 tab bar           │
           └─ T07 icons             ┘
T08 offsets (after T03/T05)
T09 rows, T10 surah rows, T11 rail
T12, T13, T14, T15 Home + splash
T16, T17, T18 Library
T20 then T19 Mushaf (T20 restructures the surface first)
T21 More, T22 media, T23 qiraat sheet
T27 device QA matrix + final review
```

Tasks that touch disjoint files may run in parallel. Within one working tree they commit by explicit path (`git commit -- <paths>`).

## Review conditions

Design §6 (v2) binds each ticket to the architect review's conditions. Read the ticket's conditions before starting it.

## Tasks

The full findings and fixes for each task are the matching section of the findings file. Below is each task's scope, its tests, and its commit.

### T01 Fonts
- **Generate fonts:**
  - Instance `assets/fonts/NotoSansArabic-VF.ttf` into `NotoSansArabic-Regular.ttf`, `-SemiBold.ttf` and `-Bold.ttf`, using `fonttools varLib.instancer --static --update-name-table`.
  - Each file needs a unique PostScript name.
  - Record the command in `scripts/fonts/README.md` so it can be reproduced.
- **Register fonts:** in `constants/fonts.ts`, point `TheSansArabic` at Bold, point `TheMixArab` and `NotoSansArabic` at Regular, and add the `NotoSansArabic-SemiBold` and `NotoSansArabic-Bold` families.
- **Weights:** in `constants/typography.ts`, set every role's `fontWeight` to `'400'`, and drop weight 700 from the Amiri-Bold roles.
- **Tests:**
  - `fontRegistry`: every alias has a file, and the PostScript names are unique (read the `name` table).
  - `typography`: no role pairs a registered family with weight ≥ 600 or `'bold'`; `TheSansArabic` resolves to the Bold file.
- **Commit:** `fix(fonts): render bold from a real bold face on iOS and Android`

### T02 Weight sweep
- **Scope:** every ad-hoc `fontWeight` together with a custom family becomes a role or a weight-specific family (via `fontFace(family, weight)`). This covers GLOBAL-04 and the NOFRAME typography items.
- **Tests:** a repo scan that fails on a `fontWeight` ≥ 600 or `'bold'` in any style that also sets a registered family.
- **Commit:** `fix(fonts): route ad-hoc weights through weight-specific faces`

### T03 InlineHeader
- **Scope:** arrow `#281E13` (`inkTitle`), glyph centred on the title line, gap 4.
- **Tests:** an `InlineHeader` render test asserts the colour, the gap and the alignment.
- **Commit:** `fix(header): match the back arrow's colour, alignment and gap to the file`

### T04 HeaderArt geometry
- **Scope:**
  - Large ornament at 96.42×93.82, rotated 115.32° about its centre.
  - Tile 392×392 at y −42 (phone), keeping the tablet branch.
  - Optional opaque band; small-corner variants for Home and Library.
- **Tests:** geometry constants pinned against the node values.
- **Commit:** `fix(header-art): rotate the corner ornament and draw the tile at its stated size`

### T05 HeaderArt mounts
- **Scope:** mount on Home, Library, the Scholars five, Reciters ×2, Dawah posters, Radio, the railed lists and the Mushaf index and reader.
- **Tests:** extend the `HeaderArt` screen list in `__tests__/figmaIcons.test.ts`.
- **Commit:** `fix(screens): lay the header art on every screen whose frame has it`

### T06 Tab bar
- **Scope:** gold active icon, inactive at 100%, 16pt padding with space-between, radius 24, indicator at −2.
- **Tests:** `TAB_BAR` tokens; the physical order is unchanged.
- **Commit:** `fix(tab-bar): gold active icon, file spacing, radius and indicator`

### T07 Icons
- **Scope:** add the manifest entries and fix the generator (archive outline, audiobook ticks, seal letters), then regenerate.
- **Swap in the file's glyphs:**
  - quick-chip glyphs
  - the «المزيد» arrow
  - the bell
  - the Dawah badge
  - the WhatsApp rings
- **Tests:** `extract-icons --check`, plus a generator unit test on a synthetic outline override.
- **Commit:** one per sub-area if large, e.g. `fix(icons): ...`

### T08 Offsets
- **Scope:** search-to-content offsets per finding; a shared constant where several screens agree.
- **Tests:** layout constants pinned.
- **Commit:** `fix(layout): match search and first-row offsets to the frames`

### T09 Rows
- **Scope:** wedge colour; scholar card name 16, pretitle colour, line metrics and inset; ribbon height 54; title and subtitle line spacing.
- **Tests:** keep the recommendation slot height in sync (`__tests__/recommendationSlotHeight.test.ts`), plus row geometry tests.
- **Commit:** `fix(rows): match reciter, lecture and ribbon row metrics to the file`

### T10 Surah rows
- **Scope:**
  - Badges show unpadded Arabic-Indic numerals.
  - The meta separator is `•`.
  - Sizes: badge numeral 14, play glyph 20, badge gap 8.
  - The tab labels get their diacritics.
- **Tests:** numeral and meta formatting.
- **Commit:** `fix(surahs): unpadded numerals, bullet separator and file sizes`

### T11 Letter rail
- **Scope:** last letter `ى`, chips set flush to the physical right.
- **Commit:** `fix(rail): end on alef maqsura and align chips to the right edge`

### T12 Home heroes
- **Scope:** subtitle gold, body `#5F482D`, navy title bars, the rhythm 16/24, Hijri format.
- **Commit:** `fix(home): hero colours, title bars and vertical rhythm`

### T13 Chips and posters
- **Scope:** chip order (reverse the test expectation); posters have no frame or bevel, a light shadow, full opacity and the file's order.
- **Commit:** `fix(home): chip order and bare dawah posters`

### T14 Queen card
- **Scope:** rebuild on `HeroShell` with the emblem, watermark and crown extracted from the .fig.
- **Commit:** `feat(home): rebuild the queen card from the file's layers`

### T15 Splash
- **Scope:** pattern drawn at 1040 from (−149, −93.6), the step-4 gradient, the stated gradient stops, the wordmark colour.
- **Commit:** `fix(launch): pattern scale and gradients from the file`

### T16 Library RTL
- **Scope:** `PHYSICAL_BOX` where text must sit right, Arabic digits, spacing.
- **Tests:** extend `rtlPhysicalContract`.
- **Commit:** `fix(library): keep block text on the right and use Arabic digits`

### T17 Library cards
- **Scope:**
  - Gold glyphs.
  - `Toggle` at 44×24 with the knob on the file's side.
  - The ring's label and stroke.
  - Number agreement.
  - The summary copy.
- **Note:** `Toggle` is shared with Settings, so check those screens too.
- **Commit:** `fix(library): stat, wird card, toggle and ring match the file`

### T18 Library audiobook and reminders
- **Scope:**
  - The audiobook card: thumbnail and buttons.
  - The completed variant.
  - The reminder cards: toggle and next time.
  - The chips.
  - Tokens in the post-design additions.
- **Commit:** split by sub-area if large.

### T19 Mushaf text and footer
- **Scope:**
  - Ayah markers (U+06DD plus Arabic digits).
  - Meta plural, count and spacing.
  - Footer layout and wiring.
  - MiniPlayer suppression on the Mushaf.
- **Commit:** `fix(mushaf): ayah markers, meta line and a working footer`

### T20 Mushaf surface
- **Scope:**
  - Tap-to-show chrome with a 24% scrim (0.3s fade).
  - Chrome visible on first open, and always visible with a screen reader.
  - Black text on an ivory sheet, the surah cartouche and the basmala.
- **Tests:** `contextualNotesInvariants` stays green; a chrome-toggle unit test.
- **Commit:** `feat(mushaf): full-bleed page with tap-to-show chrome`

### T21 More
- **Scope:** placeholder colour, spacing, shadows.
- **Commit:** `fix(more): form placeholder colour and spacing`

### T22 Media lists
- **Scope:** rail rows title only, row heights, icon tint.
- **Commit:** `fix(sections): rail rows, poster rows and icon tint match the file`

### T23 Qiraat sheet
- **Scope:** `transparentModal` sheet on `SheetShell`; the deep link still works; reciter tabs recorded as a deviation in the screen map.
- **Commit:** `feat(qiraat): present the qiraat list as a bottom sheet`

### T24 to T26 Screens without a frame
- **Scope:** fixes per NOFRAME finding, each against the in-repo contract.
- **Commits:**
  - `fix(rtl): ...`
  - `fix(icons): ...`
  - `fix(ui): ...`

### T27 QA and review
- **Captures:** `capture:ios` / `capture:android` after; `compare:figma` before vs after.
- **Devices:**
  - Phones: iPhone 17e and 17 Pro Max, and the Realme Note 50 AVD.
  - The `screens:matrix` sweep.
  - Tablets: iPad Pro 13 and Pixel Tablet.
- **Write-up:** `docs/plans/2026-10-23-figma-parity-qa.md`, covering what was missing, what was fixed, the evidence and what stays open.
