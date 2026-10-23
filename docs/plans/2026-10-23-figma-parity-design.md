# Figma parity pass: every screen, icon and font (v2)

**Date:** 2026-10-23
**Branch:** `fix/figma-parity-2026-10-23` (off `origin/main` e9244a3)
**Spec:** `docs/KHAZAYIN.fig`, the 28 mobile frames in `docs/visual-regression/figma-mobile-screen-map.json`.
For the screens no frame covers, the authority is `constants/typography.ts`, `constants/layout.ts` and `constants/rtlContracts.ts`.
**Findings:** `docs/plans/2026-10-23-figma-parity-findings.md`, which holds every finding with its node IDs, measured values, `file:line` and the fix.
**Plan:** `docs/plans/2026-10-23-figma-parity-implementation-plan.md`.

---

## 1. Goal

Make the app match the Figma file screen by screen, image by image and icon by icon: titles, fonts, weights, colours, spacing, decorations and order.

The match has to hold on the phones the audience actually uses: popular iPhones and Androids from 320 to 480dp at font scale 1.0 to 1.7, low-end Android (a Realme Note 50-class 360×800dp phone stands in for about 20% of users), and tablets, without undoing the 2026-10-22 tablet layout.

## 2. How the gaps were found

1. **Captures.** Captured the 23 static frames on iPhone 16 (393pt, the frame width) and Pixel 7 from current `main`, plus scrolled states for the three tall frames and a cold-launch recording for the four splash frames.
   - The Pixel 7 had a 2026-09-12 build that never loaded Metro, so its first captures were stale. It was rebuilt before anything was compared.
2. **Nine parallel audits.** Each one checked its frames against the node graph, not only by eye: hidden paints and strokes, instance overrides, `m00:-1` mirrors and 115° rotations. Each finding traces to `file:line`.
   - Eight audits covered the frames, split into GLOBAL/HOME/LIBRARY/SECTIONS/SCHOLARS/MEDIA/MUSHAF/MORE.
   - One covered the screens with no frame.
3. **Result.** 162 frame findings (42 high, 75 medium, 45 low) and 37 no-frame findings (12 high, 15 medium, 10 low), 199 in all, grouped by root cause into the 27 tickets in §4 (Trello cards #70–#96 on the «مكتبة خزائن الرحمن» board).

## 3. Decisions

### D1. Fonts: a static face per weight, weight 700 for TheSansArabic

**What happens today.** The three family names all load the one variable `NotoSansArabic-VF.ttf`, and the platforms handle `fontWeight: '700'` differently:
- **iOS** sees one face, Regular, and ignores the weight. Every bold role renders at 400.
- **Android** fills only the NORMAL slot, so weight 700 falls back to the system bold. That is Noto Naskh, so one card mixes two typefaces.

**Fix.** Generate static Regular, SemiBold and Bold instances from the shipped VF with `fontTools varLib.instancer --update-name-table`.
- The PostScript names must be unique: expo-font on iOS silently ignores a duplicate.
- Point `TheSansArabic` at Bold, and `TheMixArab` and `NotoSansArabic` at Regular.
- Set every role's `fontWeight` to `'400'`, because the weight now lives in the face.
- Add a test that forbids a bold `fontWeight` together with any registered custom family.

**Why 700.** The Figma stem-to-height ratio is 0.199; Noto's is 0.191 at 700 and 0.163 at 600. The cost is that 700 sets 2–13% wider than the file's text. That is checked on a 360dp phone, and any title that would lose words gets full width or wraps, never shrink-wrapping (see the Android 15 rule in CLAUDE.md). SemiBold is registered too, for the few roles where width forces it.

**Scope.** These are new font files derived from a font the app already ships under the same OFL licence. No npm dependency is added, and the change is OTA-safe because fonts load through `useFonts`.

### D2. Fix shared causes once, in the shared component

Most findings repeat across screens because they come from one shared component, so each is fixed there once:
- **`InlineHeader`:** back-arrow colour `#281E13`, centred on the title, 4pt gap.
- **`HeaderArt`:** 115.32° ornament rotation, a 392pt tile and the opaque header band.
- **`CustomTabBar`:** gold active icon.
- **Row components:** `ReciterRow`, `LectureCard`, `RibbonCard` and `SurahRow`.
- **Search-offset rule:** one fix covers every screen.

### D3. Mushaf reader: follow the prototype's tap-to-show chrome

Frame 2349:829 is the page itself. 2349:982 is the header and footer overlay, shown on tap with a 24% scrim and a 0.3s fade.

**Behaviour.** The reader becomes full-bleed and a tap toggles the chrome.
- **First open:** the chrome is visible, so a first-time reader sees the exit and the index; it then hides on the first tap.
- **Screen reader:** with VoiceOver or TalkBack on, the chrome stays up, because tap-to-reveal is unreachable for a screen-reader user.
- **Long-press on an ayah stays NOTE**, pinned by `contextualNotesInvariants`.

**Text.** The page text goes black on an ivory sheet, with a framed surah cartouche and a plain basmala line.

**Face (not changed).** The Quran face stays Amiri. A Uthmani face needs a licensed font the client has not supplied, so the face is recorded as an open item. The page images inside the file are screenshots from a third-party Mushaf app and must not ship.

### D4. Qiraat becomes a bottom sheet

The file draws it as a sheet over the reciter screen, with a top radius of 16 and a gold stroke. It moves to the repo's sheet pattern: `transparentModal` plus fade, built on `SheetShell`. The `/sections/qiraat` deep link keeps working.

### D5. Reciter styles stay as tabs (documented deviation)

Frame 2102:3187 (Murattal) has no tab strip, while 2031:6193 (Mujawwad) does. Giving each style its own screen would change navigation for one frame, so the tab model stays. The map entry records the deviation, and the tab labels gain the file's diacritics («المجوَّد / المرتَّل / المعلِّم»).

### D6. Rows follow the file, app-only content is kept and recorded

**Rows follow the frame.** Where the frame shows only a title (audiobook and exclusive rails), the row shows only a title, with no author or duration line.

**App-only sections are kept.** «مقترح لك», the Library history and insights, and the community entry exist only in the app. They stay, and their styling is brought onto the same tokens so they read as part of the design.

### D7. Library features the frame shows and the app lacks

- **Built from data the app already has:**
  - The completed-lecture card (from `lectureRepo`).
  - The per-reminder toggle and next-time line (from `notificationScheduler`).
  - The «ملاحظاتي» and «المكتمل» filter chips.
- **Recorded, not built:** «المفضلة» and «تذكيراتي» have no model behind them in the app, so they are listed as open items rather than invented.

### D8. Phones must not regress

Every ticket's QA covers iPhone 16, iPhone 17e and 17 Pro Max, Pixel 7, the Realme Note 50-class AVD, and the `screens:matrix` sweep (320/360/384/411/480dp × font scale 1/1.3/1.7). Tablets keep the 2026-10-22 behaviour: the reading column, the grid and the split pane.

## 4. Tickets

| # | Ticket | Findings |
|---|---|---|
| T01 | Fonts: real Bold/SemiBold faces on iOS and Android | GLOBAL-01/02/03/16, LIBRARY-03, MEDIA-02, MORE-05, SCHOLARS-02, SECTIONS-01 |
| T02 | Route every ad-hoc `fontWeight` through the type roles | GLOBAL-04, MORE-15, NOFRAME typography items |
| T03 | InlineHeader: back-arrow colour, alignment and gap | MEDIA-03/17, MORE-06/13, SCHOLARS-03/04/05, SECTIONS-02/09, MUSHAF-18 |
| T04 | HeaderArt: ornament rotation, tile scale, header band | GLOBAL-10/12, MEDIA-04/08, MORE-01/02/03 |
| T05 | HeaderArt on every screen whose frame has it | GLOBAL-11, HOME-20, LIBRARY-14, MEDIA-05/06/07, MUSHAF-17, SCHOLARS-01, SECTIONS-06 |
| T06 | Tab bar: gold active icon, spacing, radius, indicator | GLOBAL-05..09 |
| T07 | Icons: regenerate and use the file's glyphs | HOME-02/03/04/13/18, MEDIA-01/10, MORE-04/07/08/12, SECTIONS-04/20 |
| T08 | Search pill and first-content offsets | GLOBAL-14, SECTIONS-05/10/16/17/21, SCHOLARS-06/07, MEDIA-12/13, MUSHAF-13/14, LIBRARY-13/25 |
| T09 | List rows: ReciterRow, LectureCard, RibbonCard | SECTIONS-03/11, MEDIA-11, SCHOLARS-08..14, GLOBAL-15 |
| T10 | Surah rows and badges | MUSHAF-06/07/15/16/19, SECTIONS-08/12/13/14/18/22 |
| T11 | Letter rail | MEDIA-18, SCHOLARS-15/16, SECTIONS-19 |
| T12 | Home heroes: colours, title bars, copy, rhythm | HOME-07..12, HOME-14, HOME-19 |
| T13 | Home quick chips and dawah posters | HOME-01, HOME-15/16/17/21/22 |
| T14 | Home «أنتِ ملكة» card rebuilt from the file | HOME-05/06/27 |
| T15 | Splash pattern scale and gradients | HOME-23..26 |
| T16 | Library: RTL alignment, digits, spacing | LIBRARY-01/18/20/22/23 |
| T17 | Library: stat cards, wird card, toggle, ring | LIBRARY-02/04/05/06/15/16/19 |
| T18 | Library: audiobook and reminder cards, chips | LIBRARY-07..12/17/21/24/26 |
| T19 | Mushaf: ayah markers, meta line, footer, MiniPlayer | MUSHAF-02/05/08/09/10/11/12/20 |
| T20 | Mushaf: reading surface, cartouche, tap chrome | MUSHAF-01/03/04 |
| T21 | More, Contact, About | MORE-09/10/11/14/16, GLOBAL-13 |
| T22 | Dawah, radio and railed lists | MEDIA-09/14/15/16 |
| T23 | Qiraat sheet; reciter structure | SECTIONS-07/15/23 |
| T24 | RTL alignment on screens without a frame | NOFRAME-01..06, 35 |
| T25 | Figma glyphs on screens without a frame | NOFRAME-08, 13, 18, 21, 27 |
| T26 | Search, notes, sheets, settings, onboarding tokens | NOFRAME-07, 10, 11, 14, 15, 17, 19, 22, 25, 26, 28–32, 37 |
| T27 | Device QA matrix and the final review | — |

**Order.**
- Foundations first: T01 → T02 → T03/T04/T06/T07, then T05/T08.
- Shared rows next: T09–T11.
- Then the per-screen tickets: T12–T23.
- T24–T26 can follow T02 at any point, and T27 runs last.

## 5. Out of scope

- **Licensed faces:** the TheSansArabic and TheMixArab files (the Noto alias stays) and a Uthmani Quran face.
- **Client art:** to replace the third-party Mushaf page screenshots.
- **«المفضلة» and «تذكيراتي» chips:** they have no data model in the app.
- **The Android-only line-height surplus in `MIN_LINE_HEIGHT_RATIO`:** tracked by the 10-22 audit as its own item.

---

## 6. v2: conditions from the architect and board review

The review approved the design with conditions, and every one is adopted. Each item names the ticket it binds.

1. **Font files (T01).**
   - Retire the variable file from the registry and from `FONT_ASSET_MODULES` once the static files ship. It can stay on disk until T02, unreferenced.
   - A test reads each registered TTF's PostScript name and fails on any duplicate across different files.
   - `scripts/fonts/README.md` records the instancer command, the fontTools version and each output's SHA-256.
2. **Mushaf Quran face on Android (separate step inside T20).** The Quran text and basmala are `Amiri-Bold` + `'700'`, which today draws the system Naskh bold on Android. Moving to `'400'` changes the face and the line widths. That lands as its own commit with Mushaf QA: reading-position restore, `jumpToAyah` highlight and long-press NOTE. T01 leaves `mushaf.tsx` alone.
3. **The weight guard (T01 → T02).** T01 adds the scan test with an allowlist of today's offenders; T02 must empty that allowlist.
   - The scan catches `'bold'`, `'500'`, `'600'` and `'700'`, including inside style arrays and `textStyle()` spreads.
   - Rule: a nested `<Text>` inherits its parent's `fontWeight`, so a parent must never set a bold weight on a registered family. The scan cannot see this, so review enforces it.
4. **Width gate (T01 and every text ticket).** Check 320dp at font scale 1.7 for ellipsised or clipped titles, and re-check diacritic clearance (`MIN_LINE_HEIGHT_RATIO`) with Bold. Any title the change touches that can wrap gets a full-width assertion in the style of `ribbonCardTitleWidth`.
5. **Shipping (T01).** `expo-updates` is not installed, so the change ships with the next store build; it has no native config change. Measure cold-start font loading on the Realme-class AVD. If a face fails to load, `useFonts` reports an error. Today's `_layout` behaviour on a font error is recorded in QA, so the app never hangs on the splash.
6. **Qiraat sheet (T23).**
   - Root-level route next to `telegram-sheet` (`transparentModal` + fade), with `/sections/qiraat` kept as a redirect.
   - A cold deep link must land over the reciter screen, not an empty stack.
   - Typed-route `as any` cast.
   - Update `reciterNavigation.test.ts`, `tabletReadingColumn.test.ts` and the screen map.
   - Cap the sheet width with `sheetMaxWidth` on tablets.
7. **Qiraat row tap (T23).** A row tap must set the default qiraa (`setDefaultQiraa`) before closing; today it only goes back.
8. **Mushaf gestures (T20).**
   - The chrome is an absolute overlay, so the page layout never moves.
   - A toggle is a release under 300ms that moved under 10pt, and only when the page is not scrolling.
   - Long-press (500ms) wins and never toggles.
   - `contextualNotesInvariants` gains a tap case.
9. **Mushaf accessibility (T19/T20).**
   - The chrome shows on every visit to the screen, hides only on a tap (never a timer), and skips the fade under Reduce Motion.
   - A "show controls" accessibility action sits on the page.
   - The chrome stays up with a screen reader.
   - The footer buttons are wired in T19, so T20 never hides inert controls.
10. **Order and blast radius.**
    - T20 runs before T19.
    - RibbonCard's meta line becomes a prop rather than being removed, and any padding, border or gap change updates `RECOMMENDATION_SLOT_HEIGHT` in the same commit.
    - T03/T04 carry before/after captures of a sample: an RTL list, Mushaf, community and `content-search`.
11. **Licensing (T01).** Ship the Noto `OFL.txt` next to the fonts. Noto declares no Reserved Font Name; record this in the README. A test fails if any `docs/KHAZAYIN.fig` `images/` hash appears under `assets/`, so the third-party Mushaf page screenshots can never ship.
12. **Paperwork.** The plan file exists. `FONT_SUBSTITUTIONS` stays non-empty and points at the new files, and parity captures stay labelled "typography provisional".
13. **Measurable parity (T27).** The screenshot-diff threshold is set per frame before QA. The iPhone 16 capture must match the reference within the measure tool's tolerance wherever the export is usable; Android is judged by side-by-side composition only, because its 412dp width differs from the frame, as the harness README states.
