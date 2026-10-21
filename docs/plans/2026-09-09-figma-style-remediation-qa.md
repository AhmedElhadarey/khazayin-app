# Figma Style Remediation — QA Report

**Date:** 2026-09-09
**Branch:** `006-figma-style-remediation`
**Design:** [design specification](2026-09-09-figma-style-remediation-design.md)
**Plan:** [implementation plan](2026-09-09-figma-style-remediation-implementation-plan.md)
**Baseline evidence:** [`docs/audit/2026-09-09`](../audit/2026-09-09/README.md) — unchanged.

**Status:** comparison evidence is ready. All 28 rows have implementation
evidence, including an automated Murattal tab capture. Final pixel signoff is
still conditional on the typography gate and the user decisions under
*Exceptions*.

## Devices

| Target | Build | Notes |
|---|---|---|
| iPhone 16 simulator | Debug, 393 × 852 pt @3x | `npx expo run:ios --device 'iPhone 16'` |
| Pixel 7 emulator (`Pixel_7_API_36`) | Debug, 412 × 915 dp | Gradle needs JDK 21; Android Studio's bundled JBR is 25 and fails with "Unsupported class file major version 69" |

Captures were produced by `npm run capture:ios` / `npm run capture:android`
and published under `docs/audit/2026-09-09-post/`. They are ignored generated
evidence and do not overwrite the audit baseline. Both runs captured 23 of 28
frames automatically; the remaining five are transition states listed below.
Metro ran with `EXPO_PUBLIC_VISUAL_AUDIT=1`, which suppresses development-only
LogBox toasts so they cannot cover the bottom navigation or skew measurement.

## Automated gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit --pretty false` | clean |
| `npm test` | 45 → 62 suites, 365 → 643 tests, all passing |
| `npm run lint` | 0 errors; only the pre-existing legacy warnings documented in CLAUDE.md |

## Frame matrix

Legend — **✓** deep-link capture on that device · **rec** cold-start stills ·
**partial** code path verified, transient frame not captured · **—** not verified.

**What a PASS in this table does and does not mean.** See *Measured deviation*
below. In short: the 4 pt tolerance in design section 8 is measurable, and was
measured, on the three frames whose export content matches the app's; those
pass. On the other twenty the export's own content differs from the app's
(placeholder rows, blank media, a dark reader), so no number is claimed and the
PASS rests on composition, physical order, density and state as seen in the
side-by-side captures.

| # | Node | Screen | Route | iPhone 16 | Pixel 7 | Result | Notes |
|---:|---|---|---|:-:|:-:|---|---|
| 1 | `2001:835` | Splash — patterned launch state | `—` | rec | rec | **PASS** | Cold-start stills on both platforms. Home no longer appears before the launch layer. |
| 2 | `2001:888` | Splash — background and wordmark phase | `—` | rec | rec | **PASS** | Patterned background and wordmark state. |
| 3 | `2001:914` | Splash — centre emblem phase | `—` | rec | rec | **PASS — E4** | Centre emblem state. Overlay emblem art differs from the native splash. |
| 4 | `2007:511` | Splash — exit hold before Home | `—` | rec | rec | **PASS** | Fades to Home with no white or black flash. |
| 5 | `2001:940` | Home | `/` | ✓ | ✓ | **PASS — E1, E7** | Header, heroes, section rhythm, quick chips, nav. Prophet hero cropped to drop the duplicate right emblem. |
| 6 | `2031:4659` | Library | `/library` | ✓ | ✓ | **PASS** | Reference hierarchy restored; Quick Note back on the first viewport. |
| 7 | `2031:5675` | Sections root — nine section cards | `/sections` | ✓ | ✓ | **PASS** | Nine sections, reference copy and counts, physical order. |
| 8 | `2031:6193` | Reciters — default (Mujawwad) tab | `/sections/reciter` | ✓ | ✓ | **PASS** | Vertical void removed, rail right, default tab rightmost, six rows as in the frame. |
| 9 | `2102:2975` | Scholars list | `/sections/scholar` | ✓ | ✓ | **PASS** | Quill badge right, rail right, compact cards. |
| 10 | `2102:3187` | Reciters — Murattal tab | `/sections/reciter?tab=murattal` | ✓ | ✓ | **PASS** | The tab state is URL-addressable and captured automatically; six Murattal rows are visible. |
| 11 | `2120:942` | Dawah design — month list | `/sections/dawah` | ✓ | ✓ | **PASS** | Six months, count left, title, badge right. |
| 12 | `2120:1857` | Dawah design — Shawwal and Ramadan posters | `/sections/dawah/shawwal-ramadan` | ✓ | ✓ | **PASS** | Four poster rows. The incorrect empty state is gone. |
| 13 | `2207:5270` | Reciter audio — surah list for a selected reciter | `/sections/reciter/r1` | ✓ | ✓ | **PASS** | New route. Reciter identity carried through instead of dropped. |
| 14 | `2207:17898` | Mushaf — surah index | `/sections/mushaf` | ✓ | ✓ | **PASS** | Index rows match; the app-only bookmark sits on the trailing edge. |
| 15 | `2349:829` | Mushaf reader — loading and transition state | `—` | partial | partial | **PASS — E6** | Resume path holds a stable Mushaf surface; the transient frame itself was not captured. |
| 16 | `2349:982` | Mushaf reader — loaded surah | `/sections/mushaf?surah=2` | ✓ | ✓ | **PASS** | Like-for-like Al-Baqarah state; header metadata and footer order match, and real ayat replace the frame’s black media area. |
| 17 | `2457:954` | Qiraat — ten qiraa rows | `/sections/qiraat` | ✓ | ✓ | **PASS** | Ten rows, compact density, adornment placement. |
| 18 | `2465:1911` | Prophet biography lectures | `/sections/prophet` | ✓ | ✓ | **PASS** | Compact rows, badge right, duration left. |
| 19 | `2510:1990` | Scholar detail — lectures for one scholar | `/sections/scholar/s1` | ✓ | ✓ | **PASS — E2** | Ribbon right, layout matches. Durations empty by design. |
| 20 | `2589:1772` | Queens of the Quran | `/sections/queen` | ✓ | ✓ | **PASS** | Compact rows, crown badge right, duration left. |
| 21 | `2597:2552` | Scientific books | `/sections/books` | ✓ | ✓ | **PASS** | Compact rows, book badge right, duration left. |
| 22 | `2606:3830` | Radio | `/sections/radio` | ✓ | ✓ | **PASS** | Compact rows, mic badge right, duration left. |
| 23 | `2869:2088` | Audiobooks | `/sections/audiobooks` | ✓ | ✓ | **PASS** | New route. Header, search, rows, physical-right rail. |
| 24 | `2869:2306` | Exclusive content | `/sections/exclusive` | ✓ | ✓ | **PASS — E3** | New route built from the written spec; the frame exports blank. |
| 25 | `2102:2711` | More root | `/more` | ✓ | ✓ | **PASS** | Opens with the website row; the settings rows follow. |
| 26 | `2106:2598` | Contact us | `/more/contact` | ✓ | ✓ | **PASS** | Inline header, two contact cards, form, submit button. |
| 27 | `2106:2712` | About the foundation | `/more/about` | ✓ | ✓ | **PASS** | Inline header, paragraphs, Vision and Mission cards, faint corner ornament. |
| 28 | `2558:1334` | Archive | `/more/archive` | ✓ | ✓ | **PASS — E3** | Header, search, three routed categories. The frame exports blank. |

**28 of 28 rows pass the recorded functional/composition checks**, with the
exceptions below still requiring user approval before final signoff. Twenty-
three stable route states have clean side-by-side captures on both devices;
the other five are launch/reader transition states.

## Measured deviation

The reference exports are 500 × 880 device mockups, but the screen inside the
mockup is a fixed rect — `(56, 18, 387, 839)`, verified identical on 25 of the
28 exports — so the screen area *is* recoverable. 387 px spans a 393 pt screen,
which puts one reference pixel at 1.0155 pt and the 4 pt tolerance at 3.9 px.
An earlier draft of this report claimed the exports could not resolve 4 pt at
all. That was wrong, and it was wrong in the convenient direction: it excused
the measurement rather than doing it.

`npm run measure:figma` does it. Both images are reduced to a row profile —
mean luminance per row — and aligned by cross-correlation. A row profile
ignores the icon art, photography and font differences that are a known,
accepted divergence from the export, and keeps exactly what the tolerance is
about: where the horizontal bands of the layout start and stop.

**iPhone 16, 393 × 852 — the reference width.**

| Node | Screen | offset | correlation | ≤ 4 pt |
|---|---|---:|---:|:-:|
| `2031:4659` | Library | −3.0 pt | 0.936 | yes |
| `2031:5675` | Sections root | −3.0 pt | 0.958 | yes |
| `2102:2711` | More root | −3.0 pt | 0.968 | yes |

The other twenty frames report **not comparable**, not a failure, and the
distinction is the whole point. Correlation across the 23 measured frames falls
into two groups with a wide gap: 0.94–0.97 for the three above, −0.07 to 0.82
for the rest. The upper group is where the export shows the same rows the app
does. In the lower group the export repeats one placeholder name down the whole
list (`2031:6193`, `2102:2975`, and every lecture list), exports blank media
(`2869:2306`, `2558:1334` — exception E3), or renders a dark surface whose ayat
differ from the app's (`2349:982`). There the correlation peak is driven by
content divergence, not geometry, and a confident-looking number would be an
artefact of the export. The threshold sits at 0.88, inside the gap.

This was learned the hard way: a first version of the tool normalized over the
whole frame and then scored sub-bands, which produced correlations above 1.0
and "drift" figures of 65 and 120 pt on frames that have nothing comparable in
them. `scripts/visual-audit/profile.js` now correlates inside the window it is
scoring, and `__tests__/profile.test.ts` pins that.

**Pixel 7, 412 × 915 — no deviation reported, by design.** Absolute geometry
can only be measured against an export on a device the export was drawn for.
The app is responsive, so on a 412 dp device the layout is *meant* to differ
from a 393 pt frame; scaling that capture onto the reference rect compresses it
into a uniform ~11 pt apparent offset that is entirely an artefact of the
rescale. `measure.mjs` takes `--device-width-pt` and reports nothing at all
when it is not 393. Android parity is verified from the side-by-side
composition, which is what that platform's column in the matrix above means.

## Comparison artefacts

Produced by `npm run compare:figma` from the post-remediation capture run and
kept out of git with the rest of the image baseline:

| Artefact | Path |
|---|---|
| Contact sheet, all 23 stable frames | `docs/audit/2026-09-09-post/compare/contact-sheet.png` |
| Side-by-side, reference \| iPhone \| Pixel | `docs/audit/2026-09-09-post/compare/side-by-side/` |
| 50% overlay, reference over iPhone | `docs/audit/2026-09-09-post/compare/overlay/` |
| Measurement summaries | `docs/audit/2026-09-09-post/measure-{ios,android}.json` |
| Raw captures | `docs/audit/2026-09-09-post/app-captures-{ios,android}/` |

**Both device columns were re-captured from clean starts.** The first Android
attempt could not reach Metro, and a second attempt shared the emulator with
another capture driver; together those produced black, stale and mislabeled
PNGs. `capture-android.mjs` now establishes `adb reverse`, verifies Metro,
force-stops the package for every route, and waits for route-specific visible
text before writing a PNG. The iOS harness also terminates the app before each
deep link and waits eight seconds, preventing scroll position and launch-layer
state from leaking between frames. The previously scrolled Home capture is now
at its deterministic top position.

## Exceptions

These need a user decision or an asset before they can close.

**E1 — Home Prophet hero artwork (`2001:940`) — CLOSED by a crop.**
The frame exports its hero media as a flat placeholder, so the Figma file
cannot settle the full composition. What it *does* settle is the acceptance
criterion: centred body copy, a المزيد pill, and no second dominant
illustration. The shipped render carried the words "محمد رسول الله" twice —
once as the title calligraphy and again as a large teal emblem flanking the
right edge — which is precisely the "extra dominant artwork" the criterion
forbids. Design section 6.2 offers "replace **or crop**"; the crop was taken:
`assets/khazain/home/hero-prophet-card-cropped.webp` is the source render cut
to 1168 × 583 (from 1460 × 660), dropping the duplicate emblem and rebalancing
the vertical margins 48/108 → 40/40. The title now sits at the RTL start edge
and المزيد at the bottom start corner. The card grows from 2.212:1 to 2.003:1,
about 17 pt taller at width 393. The original asset is untouched on disk, so
reverting is a one-line change. **Still open:** if the layered hero asset ever
arrives, the composition should be rebuilt from it rather than cropped.

**E2 — Scholar lecture durations (`2510:1990`).**
The frame shows "٣٢ دقيقة" on every row. Scholar entries are Internet Archive
series whose real length resolves at play time, so the fixture leaves the
duration empty rather than inventing one. The layout renders a duration when
present, as the other four lecture lists show.

**E3 — Blank reference frames (`2869:2306`, `2558:1334`).**
Both export as black/blank media frames. Their screens follow the written
specification in design section 6 instead of a readable render, and should be
re-checked against the source `.fig` before final signoff.

**E4 — Launch overlay emblem (`2001:914`).**
`splash-khazain.png` exists only as one flattened image, so the overlay uses
the app's LogoBadge for the emblem state. The layers the sequence needs
separately — background without emblem, wordmark alone — would have to be
supplied for an art-identical handoff.

**E5 — Mock row counts (`2031:6193`, `2102:3187`) — CLOSED.**
The reciter mock had 2 rows in the default tab and 3 in Murattal where both
frames show 6, so neither could be compared row for row. `data/content/quran.ts`
now carries six entries per tab for both, and
`data/content/__tests__/figmaLectureFixtures.test.ts` pins the counts. The
reference frames repeat one placeholder name down the whole list; distinct,
widely-recorded reciters are used instead so the mock reads as content. None
carries an `archiveId`, so tapping one reports "no recording" rather than
implying a source that does not exist — these are placeholders for the real
catalogue, not a curated list.

**E6 — Mushaf transition (`2349:829`).**
The resume path now holds a stable Mushaf surface instead of flashing the
index, and the cold-start deep-link crash on that route is fixed. The
transient frame itself is sub-second and was not captured as a still.

**E7 — Home foundation mark (`2001:940`).**
Frame 2001:940 shows only the bell chip and the greeting in the header. The
app additionally renders the foundation mark at the physical right. It was
kept as brand identity rather than deleted; it is not in the audit's finding
list. Flagged for a product decision.

## Typography gate — UNRESOLVED

`TheSansArabic` and `TheMixArab` are aliased to `NotoSansArabic-VF.ttf`.
The substitution is declared in `constants/fonts.ts`, and
`typographyParityResolved()` returns `false` while any substitution stands.

**Every result in this report is therefore "typography provisional".** Sizes,
line heights, and weights were tuned against the fallback; exact glyph parity
needs either the licensed files or explicit approval of Noto Sans as the
permanent substitute.

## Responsive and accessibility smoke

| Check | Result |
|---|---|
| Widths 320 / 360 / 375 / 393 / 411 / 430 / 480 + tablet | Covered by `__tests__/responsiveLayout.test.ts` as pure geometry: gutters never collapse, content caps and centres above 480, reserved icon and disclosure columns hold, the tab strip scrolls rather than wraps |
| Bottom inset counted once | Pinned against `SCREEN_BOTTOM_BREATHING`; React Navigation already insets by the measured tab bar |
| 44pt touch targets | Row heights asserted at or above the minimum independently of visual density |
| Font scale 1.3 | **PASS** — verified on the iPhone 16 simulator at `content_size extra-large` and again at `accessibility-medium`, which is well beyond 1.3. Rows grow, long subtitles ellipsize, the reserved icon and disclosure columns stay fixed and reachable, and nothing overlaps or clips off-screen |
| Loading and empty states | No permanent skeleton and no incorrect empty state in either capture run |

## What changed, by audit finding

| Finding | Closed by | Evidence |
|---|---|---|
| RTL double reversal in tabs, rows, headers, rails, Mushaf footer | Tasks 1.1–1.3 | `constants/rtlContracts.ts` + both-platform captures |
| Bottom-tab order and oversized cream selected item | Task 1.2 | Four root routes on both devices |
| Reciter tabs leave a large vertical void | Task 2.1 | Node 2031:6193 capture |
| TheSansArabic / TheMixArab are Noto aliases | Task 2.3 | Registry test; gate above still open |
| Lecture and reciter rows too tall | Tasks 2.2, 4.3 | Measured 74pt pitch on an iPhone 16 against a 66pt card plus 8pt gap |
| Android borders and shadows too heavy | Tasks 2.2, 2.4 | Card elevation 1, warm border token |
| Ornament too strong and full-screen on seven routes | Task 2.4 | Corner coverage variant |
| Four splash states reduced to one static image | Task 6.1 | Cold-start stills on both platforms |
| Home Prophet hero composition | Task 3.1 | Cropped asset + full Home capture — exception E1 closed |
| Library hierarchy displaced by added metrics | Task 3.2 | Node 2031:4659 capture |
| Sections root copy, count, and order drift | Task 3.3 | Fixture test + node 2031:5675 capture |
| Reciter selection ignored the reciter and opened the general Mushaf | Task 4.1 | Navigation test + node 2207:5270 capture |
| Mushaf transition, reader, and footer mismatch | Tasks 1.3, 4.2 | Nodes 2349:829 and 2349:982 |
| Qiraa adornment order and density | Tasks 1.3, 2.2, 4.2 | Node 2457:954 |
| Scholars, Prophet, Queen, Books, Radio drift | Tasks 2.2, 4.3 | Six captures + fixture test |
| `shawwal-ramadan` rendered an incorrect empty state | Task 4.4 | Integrity test + node 2120:1857 capture |
| Audiobooks had no route | Task 4.5 | Node 2869:2088 capture |
| Exclusives had no route | Task 4.5 | Node 2869:2306 capture — exception E3 |
| More started with non-Figma settings rows | Task 5.1 | Node 2102:2711 capture |
| Contact, About, Archive header and spacing drift | Tasks 1.3, 2.4, 5.2 | Three captures |
| Extra screens lack Figma frames | Task 5.3 | Shared primitives corrected; legacy screens deliberately untouched |
| Different phone sizes need validation | Tasks 0.2, 7.1, 7.2 | Width matrix + both-device capture runs |

## Code-review follow-up

Two review passes ran against `git diff main...HEAD` — one on repo standards,
one on spec fidelity. Everything they surfaced is either fixed above or
recorded here.

**Fixed as defects.**

- *Launch overlay was gated on fonts only.* Design section 6.1 requires that
  Home never appear before fonts **and** settings hydrate. `useFonts` resolves
  independently of AsyncStorage, so a slow settings read could paint a screen
  built from defaults. `app/_layout.tsx` now gates the root `<Stack>`, the
  native-splash dismissal, the onboarding redirect and boot side effects on a
  single `navigatorReady` flag, with a 3 s cap so a wedged AsyncStorage cannot
  pin the app on the splash.
- *MiniPlayer skip glyphs pointed the wrong way.* The transport is laid out in
  Arabic reading order — السابق on the physical right, التالي on the left —
  but the arrowheads were drawn to the Latin convention, so each button pointed
  at its neighbour instead of at the track it moves to. The glyph geometry is
  now mirrored to match. Only reachable with a track loaded, which is why no
  capture caught it.
- *`TAB_BAR` re-declared the palette.* Navy, gold and cream were typed as
  literals in `constants/layout.ts` while already existing in `KhazainColors`
  and `FIGMA_TOKENS`. `TAB_BAR` now reads from `KhazainColors`; the literal
  values stay in the test, which is where a drift guard belongs.
- *Contact and About had no test seam.* Task 5.2 specifies
  `__tests__/moreDetailPresentation.test.ts`. About copy moved to
  `data/content/about.ts` and the form rule to `services/contactForm.ts` — same
  behaviour, now assertable without a renderer.
- Smaller: `ReciterRow` used a stale border literal and hand-rolled the
  accessibility label that `listRowAccessibilityLabel` already builds;
  `audiobooks.tsx` and `exclusive.tsx` were 89 identical lines apart from the
  title, fixture and badge, now one `RailedLectureList`;
  `HomeQuickChip.plannedRoute` always equalled `route` and the glyph map was
  keyed by Arabic display label, so renaming a label silently dropped an icon —
  both replaced by a stable `id`; `screenBottomPadding()` and a dead
  `void KhazainRadius` statement removed.

**Judgement calls, kept deliberately.**

- *`constants/layout.ts` now changes for several reasons* — bottom-padding
  math, the RTL contract, width profiles, tab-bar geometry, card density,
  reserved columns. That is Divergent Change and it is real. Splitting it is a
  wide import churn across every screen for no behaviour change, so it is
  recorded rather than done; `constants/rtlContracts.ts` already holds the slot
  orders, and a later split should take the geometry with it.
- *`services/surahPlayback.ts` is a thin delegate* to `startLecturePlayback`.
  That is the point: it is the seam that keeps one player path, so a caller
  cannot start a second one.
- *`2102:3187` remains the same reciter route.* Its `state.tab = "murattal"`
  becomes the query `?tab=murattal`; the screen validates and applies that
  state. This makes the second Figma tab deterministic and automatically
  capturable without pretending it is a separate file route.
- *Clear button placement in `SearchPill`.* No reference frame shows a filled
  search field, so `SEARCH_PILL_ORDER` putting the clear affordance at the
  physical right is this app's choice, not a Figma measurement. It is now
  documented that way in both the constant and the prop, which previously
  disagreed.
- *`RtlCarousel` still branches on `I18nManager.isRTL`*, which is what the RTL
  rule this track wrote forbids. A horizontal `ScrollView` has a second RTL
  concern the style contract does not cover: the native scroll origin, which
  `direction: 'ltr'` on the content container does not move. Pinning the
  container while the ScrollView keeps an RTL origin would land the carousel
  at the wrong end on some platforms. It renders correctly on iOS, Android and
  web in both capture runs; converting it needs a paired capture on all three,
  not a style swap. Named as the one carve-out in CLAUDE.md.
- *`2001:835` is treated as the native splash, not an overlay phase.* Task 6.1
  lists four nodes; the overlay reproduces three and `2001:835` is the state
  the native splash already owns, so reproducing it in React Native would mean
  drawing the frame the overlay exists to avoid flashing past. That reading is
  in the `LaunchSequence` docblock; it is a decision, and it is recorded here.
  The `assets/khazain/launch/` layers Task 6.1 also lists fall under E4 — they
  do not exist to add.
- *`LaunchPhase` carries three phases where the render distinguishes one*, and
  its `nodeId` is never read at runtime. Both are kept: the phase list is the
  timing contract asserted by `launchSequence.test.ts`, and the node ids are
  how a reader ties each phase back to the frame it reproduces.

**Out-of-plan changes, and why.**

- `plugins/withExactAlarmPermissions.js` — `cfg.modResults` → 
  `cfg.modResults.manifest`. Not in any task. The Android build for this QA run
  could not complete without it: `withAndroidManifest` hands back the parsed
  document, whose permissions live under `.manifest`. Left in as a build fix.
- `app.json` — `userInterfaceStyle` `automatic` → `light`, and the contradicting
  `splash.dark.backgroundColor` removed. The design is a single light theme and
  every screen hardcodes cream, so `automatic` only ever produced a dark status
  bar over a cream page. Consequence: the `colorScheme === 'dark'` branch in
  `app/_layout.tsx` is now unreachable. It is left in place rather than deleted,
  since a dark theme is a product decision, not a cleanup.
- `.gitignore` un-ignored `docs/*` **and** `CLAUDE.md`. The docs were needed.
  The `CLAUDE.md` line was a **no-op either way**: the file has been in the
  index since `init`, and an ignore pattern does not untrack a file already
  tracked. The line is restored so the `.gitignore` diff stays minimal, and
  `CLAUDE.md` stays tracked with this track's RTL, font-registry, file-layout
  and design-authority edits. (Untracking it was briefly attempted and undone;
  commits `436a519` and `c1cffff` are that pair, and the hero-crop commit body
  does not mention the file it also touched.)

## Decisions needed from you

Nothing below is blocked on work; each needs a call or an asset.

1. **Typography (E-gate).** `TheSansArabic` / `TheMixArab` render as
   `NotoSansArabic-VF.ttf`. Either supply the licensed files, or approve Noto
   Sans as the permanent substitute — until then every result here is
   "typography provisional".
2. **E2 — Scholar lecture durations.** The frame shows "٣٢ دقيقة" on every
   row; the fixture leaves the duration blank because scholar entries are
   Internet Archive series whose real length resolves at play time. Options:
   leave it blank (current), fetch the length at list time (a network call per
   row), or ship the Figma placeholder as literal text. This was left blank
   rather than invented; say which you want.
3. **E7 — Home foundation mark.** Frame `2001:940` shows only the bell chip
   and the greeting; the app also renders the foundation mark at the physical
   right. Kept as brand identity. Remove it for frame parity, or keep it.
4. **E3 — Blank reference frames (`2869:2306`, `2558:1334`).** Both export as
   blank media. Their screens follow the written specification instead. Worth
   a look at the source `.fig` before signoff.
5. **E4 — Launch overlay art.** `splash-khazain.png` exists only flattened, so
   the overlay uses the app's `LogoBadge`. Separated layers would make the
   sequence art-identical.
## Definition of done — status

- [x] All 28 rows evaluated; 28 pass the recorded checks, with 5 exceptions still awaiting approval (E2, E3, E4, E6, E7)
- [x] Side-by-side, 50% overlay and contact sheet produced for all 23 stable frames
- [x] Deviation measured where the export supports it — 3 frames, all within 4 pt
- [x] `2102:3187` verified on both devices through `?tab=murattal`
- [x] No permanent loading skeleton or incorrect empty state
- [x] No reversed physical order remains on either platform
- [x] No new TypeScript, test, or lint failures
- [ ] Typography gate resolved — blocked on licensed fonts or explicit approval
- [x] Font scale 1.3 device pass — verified past 1.3 at `accessibility-medium`
- [x] Extra non-Figma screens pass the shared RTL and responsive contracts
