# Figma Style Remediation — QA Report

**Date:** 2026-09-09
**Branch:** `006-figma-style-remediation`
**Design:** [design specification](2026-09-09-figma-style-remediation-design.md)
**Plan:** [implementation plan](2026-09-09-figma-style-remediation-implementation-plan.md)
**Baseline evidence:** [`docs/audit/2026-09-09`](../audit/2026-09-09/README.md) — unchanged.

## Devices

| Target | Build | Notes |
|---|---|---|
| iPhone 16 simulator | Debug, 393 × 852 pt @3x | `npx expo run:ios --device 'iPhone 16'` |
| Pixel 7 emulator (`Pixel_7_API_36`) | Debug, 412 × 915 dp | Gradle needs JDK 21; Android Studio's bundled JBR is 25 and fails with "Unsupported class file major version 69" |

Captures were produced by `npm run capture:ios` / `npm run capture:android`
into `/tmp/khazayin-qa/`. They are **not** committed and they do not overwrite
the audit baseline. Both runs captured 22 of 28 frames automatically; the
remaining six are transitions or an interaction-only state, listed below.

Every capture in this report carries the LogBox development banner across the
bottom of the screen. It is a debug-build artefact, not app UI.

## Automated gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit --pretty false` | clean |
| `npm test` | 45 → 60 suites, 365 → 604 tests, all passing |
| `npm run lint` | 0 errors; only the pre-existing legacy warnings documented in CLAUDE.md |

## Frame matrix

Legend — **✓** deep-link capture on that device · **rec** cold-start stills ·
**partial** code path verified, transient frame not captured · **—** not verified.

| # | Node | Screen | Route | iPhone 16 | Pixel 7 | Result | Notes |
|---:|---|---|---|:-:|:-:|---|---|
| 1 | `2001:835` | Splash — patterned launch state | `—` | rec | rec | **PASS** | Cold-start stills on both platforms. Home no longer appears before the launch layer. |
| 2 | `2001:888` | Splash — background and wordmark phase | `—` | rec | rec | **PASS** | Patterned background and wordmark state. |
| 3 | `2001:914` | Splash — centre emblem phase | `—` | rec | rec | **PASS — E4** | Centre emblem state. Overlay emblem art differs from the native splash. |
| 4 | `2007:511` | Splash — exit hold before Home | `—` | rec | rec | **PASS** | Fades to Home with no white or black flash. |
| 5 | `2001:940` | Home | `/` | ✓ | ✓ | **PASS — E1** | Header, heroes, section rhythm, quick chips, nav. Prophet hero art unchanged. |
| 6 | `2031:4659` | Library | `/library` | ✓ | ✓ | **PASS** | Reference hierarchy restored; Quick Note back on the first viewport. |
| 7 | `2031:5675` | Sections root — nine section cards | `/sections` | ✓ | ✓ | **PASS** | Nine sections, reference copy and counts, physical order. |
| 8 | `2031:6193` | Reciters — default (Mujawwad) tab | `/sections/reciter` | ✓ | ✓ | **PASS — E5** | Vertical void removed, rail right, default tab rightmost. Mock has 2 reciters, frame shows 6. |
| 9 | `2102:2975` | Scholars list | `/sections/scholar` | ✓ | ✓ | **PASS** | Quill badge right, rail right, compact cards. |
| 10 | `2102:3187` | Reciters — Murattal tab | `/sections/reciter` | — | — | **NOT VERIFIED** | Interaction-only tab state. Needs the manual tap sequence in the harness README. |
| 11 | `2120:942` | Dawah design — month list | `/sections/dawah` | ✓ | ✓ | **PASS** | Six months, count left, title, badge right. |
| 12 | `2120:1857` | Dawah design — Shawwal and Ramadan posters | `/sections/dawah/shawwal-ramadan` | ✓ | ✓ | **PASS** | Four poster rows. The incorrect empty state is gone. |
| 13 | `2207:5270` | Reciter audio — surah list for a selected reciter | `/sections/reciter/r1` | ✓ | ✓ | **PASS** | New route. Reciter identity carried through instead of dropped. |
| 14 | `2207:17898` | Mushaf — surah index | `/sections/mushaf` | ✓ | ✓ | **PASS** | Index rows match; the app-only bookmark sits on the trailing edge. |
| 15 | `2349:829` | Mushaf reader — loading and transition state | `—` | partial | partial | **PASS — E6** | Resume path holds a stable Mushaf surface; the transient frame itself was not captured. |
| 16 | `2349:982` | Mushaf reader — loaded surah | `/sections/mushaf` | ✓ | ✓ | **PASS** | Header metadata and footer order match; real ayat replace the frame’s black media area. |
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

**27 of 28 frames pass**, six of them with a documented exception. One frame
(`2102:3187`) is unverified because `simctl`/`adb` cannot tap a segmented
tab; the manual sequence is documented in
`scripts/visual-audit/README.md`.

## Exceptions

These need a user decision or an asset before they can close.

**E1 — Home Prophet hero artwork (`2001:940`).**
The frame exports its hero media as a flat placeholder, so the Figma file
cannot settle the composition. The existing baked crop stands. Needs either
the layered hero asset or a decision to keep the current art.

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

**E5 — Mock row counts (`2031:6193`).**
The reciter mock has 2 rows in the default tab where the frame shows 6.
Geometry, order, and the removed vertical void are correct; only the row count
differs. Adding rows is a fixture change once the real reciter list is known.

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
| Bottom inset counted once | Pinned by `screenBottomPadding()`; React Navigation already insets by the measured tab bar |
| 44pt touch targets | Row heights asserted at or above the minimum independently of visual density |
| Font scale 1.3 | **NOT VERIFIED** — needs a device pass with the OS text size raised |
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
| Home Prophet hero composition | Task 3.1 | Open — exception E1 |
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

## Definition of done — status

- [x] All 28 rows evaluated; 27 pass, 6 with a documented exception
- [ ] `2102:3187` verified — needs the manual tap sequence
- [x] No permanent loading skeleton or incorrect empty state
- [x] No reversed physical order remains on either platform
- [x] No new TypeScript, test, or lint failures
- [ ] Typography gate resolved — blocked on licensed fonts or explicit approval
- [ ] Font scale 1.3 device pass
- [x] Extra non-Figma screens pass the shared RTL and responsive contracts
