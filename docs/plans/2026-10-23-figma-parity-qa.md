# Figma parity QA record (2026-10-23)

The closing record for the parity pass in `2026-10-23-figma-parity-design.md`. It covers what was missing, what was fixed and in which commits, the evidence, and what stays open.

Branch: `fix/figma-parity-2026-10-23`. Spec authority: `docs/KHAZAYIN.fig` for the 28 mobile frames. Screens without a frame were judged against `constants/layout.ts`, `constants/typography.ts` and `constants/rtlContracts.ts`, and are labelled NOFRAME. Typography parity is still **provisional**: TheSansArabic and TheMixArab are aliases for Noto Sans Arabic until the licensed files arrive.

## 1. What was missing

The audit raised **199 findings** (54 high, 90 medium, 55 low), all listed in `2026-10-23-figma-parity-findings.md`.

| Area | Findings | The main gaps |
|---|---|---|
| GLOBAL | 16 | Bold never rendered on iOS. Android bold fell back to the system Naskh face, so one card mixed two typefaces. Tab bar icon colour and spacing. Header-art scale and rotation. |
| HOME | 27 | Hero colours and title bars, chip order, the dawah carousel, the «أنتِ ملكة» card, splash pattern and gradients, and the badges and bell drawn from the file. |
| LIBRARY | 26 | Text aligned to the wrong side, Latin digits, stat and wird cards, the ring and toggle, audiobook and reminder cards, filter-chip counts, and the completed-lecture card. |
| MEDIA | 18 | Dawah, radio and railed list row sizes and tints, header art, and the letter rail. |
| MORE | 16 | Form colours, spacing and shadows, the archive glyph, WhatsApp ring and header band. |
| MUSHAF | 20 | Reading surface and cartouche, tap-to-show chrome, ayah markers, the meta line, a footer whose buttons did nothing, and the Quran face falling back to Naskh on Android. |
| NOFRAME | 37 | RTL drift on settings, the toast, saved rows and library additions. Hand-drawn glyphs instead of the file's. Ad-hoc tokens and type sizes on search, notes, sheets, settings and onboarding. |
| SCHOLARS | 16 | Back-arrow colour and alignment, row metrics, the ribbon card and the letter rail. |
| SECTIONS | 23 | Row disclosure colour, row metrics, surah badges and numerals, qiraat as a sheet, and search and first-row offsets. |

## 2. What was fixed

Every ticket ran this loop: an implementer with a failing test first, a spec review, then a quality review, repeated until both passed. All 26 work tickets are closed on the board (T01 to T26). T27 is this record.

| Ticket | Findings | Commits |
|---|---|---|
| T01 Fonts: static Regular / SemiBold / Bold faces | 9 | a41efcf, 51dd654 |
| T02 Weight sweep through the type roles | 11 | 3e60a74, 5eae021, ce40819, fe11d27, 399b1be, 4ffccc2, 3c348f2, 79f7469 |
| T03 InlineHeader | 10 | 8db6a2d, 2b79d0c, b77fe09 |
| T04 HeaderArt geometry | 7 | 68fc257, 269f42c, 80fc5bf, d869dda, f41645a |
| T05 HeaderArt mounts | 9 | a22ead3, 8cde3c6, 1e65696, 10c0de5 |
| T06 Tab bar | 5 | ac43220, 1e949ee, c6440f3 |
| T07 Icons from the file | 13 | a798f7b, 0770c3e, 59ba02b, abd6bf3, 61cc12b, a8b8b3a |
| T08 Search and first-content offsets | 14 | e5b35b1, 5724a66, 25040b4, a00688c, 9764c8a, 90c7214 |
| T09 List rows | 11 | d07f9da, 0dd7e38, e62e750, 73ad9fd, 90c75b4, 635dfd6, e688c48, b7f8d3a, f5cafdb (GLOBAL-15), f626207, 27be048 |
| T10 Surah rows and badges | 11 | 4156e78, 438251a, 23d9601, 797a6f5, f7c85e2, 3440ec2 |
| T11 Letter rail | 4 | 0676308 |
| T12 Home heroes | 8 | d95565f, d47ba36, c278f4d, e66a6c8 |
| T13 Chips and dawah posters | 6 | 29fd9da, c70af3e, f0aab90, f4ad707, ac41b04 |
| T14 «أنتِ ملكة» card | 3 | 97371b2 |
| T15 Splash | 4 | 02d2c0e, 701426d |
| T16 Library RTL and digits | 5 | 198738c |
| T17 Library stat / wird / ring / toggle | 7 | 6d7d095 |
| T18 Library audiobook, reminders, chips | 10 | 3356d66, 1ec6786, 893f14c, 45d2927, 611bc19, a1e7556, 33e3e2b, 7a38cb8, 6c4934a, 5adf14b |
| T19 Mushaf markers, meta line, footer | 8 | 6fad004, 19e09e4, 82adb68, 72d840b, 1d62231, b738f58, e5f2bee, 6ece762, e4794e0 |
| T20 Mushaf surface and tap chrome | 3 | e8306fe, a5dc8f7, 2ca48ce |
| T21 More, Contact, About | 6 | 85d429b, 2b40264 |
| T22 Dawah, radio and railed lists | 4 | aae5cf7, 783ee6c |
| T23 Qiraat sheet, reciter tabs | 3 | 028381f, b5421bf, fa12660, ce0af29 |
| T24 RTL on screens without a frame | 7 | 8d33c7b, c949c9d, 51a2e78, c06b170, 4223279 |
| T25 File glyphs on screens without a frame | 5 | 3e86deb, c1be14a, 70a0975, 8b0816f, c86f3bd, 2bf5a91, 45f1d3a, dbe16bb |
| T26 Tokens and sizes on screens without a frame | 16 | 0ff92c2, 063f1bb, 12c3a14, 4817a7f, 2a9dafe, f6c6328, bc6ab19, 139f4d5 |
| T27 Found during device QA | — | d2221b3 (sheet backdrop) |

### Defects found during device QA, not in the audit

- **Sheet backdrop.** Every transparent sheet painted an opaque page (d2221b3).
- **Page-count agreement.** Counts read «١٠ صفحة» instead of «١٠ صفحات» on settings, progress and wird goal (bc6ab19). A scan test now forbids a bare `${n} صفحة`.
- **Onboarding bullets.** On a wrapped item the bullet sat beside the gap between the two lines. It now leads the first line (139f4d5).
- **Dawah posters (VoiceOver).** Posters were announced as «حفظ في المكتبة», the save could not be reached, and the wrap-around clones were read twice (f4ad707).
- **Reciter tabs (VoiceOver).** The tabs were announced as plain groups; they now sit in a tablist (ce0af29).
- **Lecture rows (VoiceOver).** Rows on Books, Radio, Prophet and Queen were read duration first as a plain group. Each row is now one button: title, scholar, duration (90c75b4).
- **Android 15 shrink-wrap.** The lecture and reciter text columns now stretch instead of shrink-wrapping (73ad9fd).

## 3. Evidence

**Gates.** Unit suite: 243 suites and 3,291 tests pass. `tsc --noEmit` is clean, and eslint is clean on every touched file. These guard tests are new or extended:
- `fontRegistry`, plus the weight guard (no bold `fontWeight` on a registered family)
- `listRowCardLargeFont` and `wirdStartRow`
- `figmaAssetLicensing` (no `.fig` source image under `assets/`)
- `rtlPhysicalContract`, `listRowMetrics` and `pageCountAgreement`
- `dawahPosterA11y`, `segmentTabsA11y` and `lectureCardA11y`
- `welcomeStepBullets` and `contextualNotesInvariants` (tap case)

**Devices, checked by hand through argent on each ticket's screens.**

| Device | Screens |
|---|---|
| iPhone 16 (393pt) | Sections, Scholars, Home, Library, Settings, saved rows, Reciters, Books, Mushaf, sheets |
| iPhone 17e | Onboarding, Home |
| iPhone 17 Pro Max | Home, Library |
| iPad Pro 13 | Splash, onboarding, Home, Mushaf. The tablet reading column, grid and split pane kept their 10-22 behaviour. |
| Pixel 7 (412dp) | Scholars, Home, plus the `screens:matrix` sweep |
| Realme Note 50-class AVD (360dp) | Cold start, Home, Sections, Library, More, Mushaf, Books (§4) |
| Pixel Tablet (1280 × 800dp, landscape) | Home, Sections, Library. Home's heroes sit side by side, Sections is a four-column grid read from the right, and Library is the centred reading column. The 2026-10-22 tablet behaviour holds with the new faces. |
| iPhone 16 + Pixel 7, frame harness | All 23 frames, before and after (see below) |

**Android matrix.** `docs/audit/screen-matrix/2026-10-23T15-15-54/` holds 60 captures plus the sheets, across 320/360/384/411/480dp × font scale 1 / 1.3 / 1.7.
- 360dp × 1.3 is clean.
- 320dp × 1.7 showed three defects; all are fixed and re-run in `2026-10-23T15-37-08/` (§4).

**Paired Figma captures.** `docs/audit/2026-10-23-parity/` (git-ignored) holds the captures and side-by-sides. The frame harness captured 23 frames on iPhone 16 and Pixel 7 before the pass and again after. The 5 transition frames are skipped by design. `compare-before/` and `compare-after/` hold Figma | iPhone | Pixel side-by-sides.

After the pass, every frame matches its reference in structure, type, icons, spacing and colour. The remaining differences are all app state or data:
- The MiniPlayer is restored on the iPhone.
- The notification permission differs between the two devices.
- A saved Mushaf bookmark enables «الانتقال للعلامة» on the iPhone.
- On the iPhone, the Mushaf index (2207:17898) opens straight into the reader, because FR-009 resumes at the last-read page once per session.
- Scholar series (2510:1990) carry no duration, so the row shows none.
- The Archive and Exclusive reference exports (2558:1334, 2869:2306) are blank, as already recorded.
- Two artefacts are not defects:
  - The iPhone Home capture (05) caught the launch sequence. A manual retake shows Home matching the frame.
  - The madda in «القرآن» is present in the Bold face but small enough to vanish at the side-by-side's half scale. The full-resolution crop shows it.

**Screen-reader spot checks (iOS ax tree).**
- Books rows: one button per row, read title → scholar → duration.
- Dawah posters: named by title, with a separate save.
- The Mushaf cartouche reads in order.

## 4. Narrow phones and the low-end device

### Realme Note 50-class AVD

Profile: Android 16 (API 36) at 720 × 1600 and 320dpi, which is 360 × 800dp. It has 2.5 GB RAM and 4 cores. Debug build, with the bundle served from Metro.

**Cold start.**
- `am start -W` reports COLD with a TotalTime of 4.86s.
- The Home tab is visible about 6s later, roughly 10.8s in total. Most of that is the debug bundle loading over Metro, so this is not a release figure.
- No font-load error appears in logcat; every face resolved, so the app does not hang on the splash (design §6.5). The app's PSS after launch is about 397 MB (debug).

**Screens at 360dp × 1.0.**

| Screen | Result |
|---|---|
| Home | Clean |
| Library | Clean |
| More | Clean (cards 82dp) |
| Books | Clean (rows 64dp, single-button labels) |
| Mushaf | Clean: Amiri text, cartouche, meta strip, 70dp footer, chrome up on first open |
| Sections | Two subtitles ellipsised: «…القرآن ال..» and «…الإسلامية الم...» (fixed, see below) |

**Mushaf scroll.** 136 frames, 2.2% janky, a p50 of 19ms and a p90 of 21ms, with no slow UI-thread frames. The emulator GPU dominates these numbers, so treat them as relative.

### 320dp × 1.7 follow-up

The first matrix (`docs/audit/screen-matrix/2026-10-23T15-15-54/`) found three defects at 320dp × 1.7. A fourth, the GLOBAL-15 card height, was confirmed on the Realme.

| Defect | Cause | Fix |
|---|---|---|
| More «الموقع الإلكتروني» lost its final ي; More and Sections titles ellipsised | One-line title. Android 15 breaks lines by ink bounds, so a title that only just did not fit lost a letter instead of ellipsising. | 635dfd6: titles wrap to two lines in a stretched, full-width column. |
| Descenders cut off (the dots of ي, the tail of ع and ر), already visible at 1.3 | Android 14+ grows `lineHeight` less than `fontSize`, so at 1.7 the line box is about 1.26× the font size and the TextView clips its last line. | 635dfd6: `descenderRoom`, 8 of padding cancelled by −8 of margin, so the layout does not move. |
| Library wird status overlapped «بدء الورد» | Absolute placement of the button. | e688c48: `WirdStartRow`, a `PHYSICAL_ROW` with a 12 gap and a `minHeight` button. |
| Sections subtitles ellipsised at 360dp × 1.0; More subtitles lost words at 320dp × 1.7 | One-line subtitle; the copy is longer than the column. | b7f8d3a for section and archive, 27be048 for More: two lines, and the card grows. |
| GLOBAL-15: Android section card 99dp, against the frame's 96 | The text column summed to 71. | f5cafdb: margins 4 and 1, so the column is 68 and the card 96. The archive card goes from 115 to 112, which matches DIV-59. |

**Re-run.** The quick matrix on the Realme AVD (`docs/audit/screen-matrix/2026-10-23T15-37-08/`, 24 captures, 320/384/480dp × 1 and 1.7) plus a manual 320dp × 1.7 pass after 27be048:
- Titles keep every letter, and no glyph loses its descenders.
- «بدء الورد» and the reading summary sit side by side.
- Section and More subtitles wrap in full. Only «زيارة الموقع الرسمي للمؤسسة» under a two-line title reaches the two-line cap.
- At the default scale on a 393dp phone, nothing moves except the 96dp section card and the 112 archive card.

**Review.** A separate review of these commits passed on spec and on quality. Its token and test-name suggestions landed in f626207.

## 5. Open items

### Waiting on the client

- **Licensed faces.** TheSansArabic, TheMixArab and a Uthmani Quran face. Until they arrive, typography parity stays provisional (`typographyParityResolved()` is false).
- **Mushaf page art.** The page images inside the `.fig` are screenshots from a third-party Mushaf app and must not ship. A test enforces this.
- **«المفضلة» and «تذكيراتي» filter chips.** There is no data model behind them (D7).

### Deliberate deviations

- **Reciter styles stay as tabs** (D5). Frame 2102:3187 has no strip. Only the active tab draws the underline; the file draws it on all four, which reads as no selection.
- **Line-height floor.** Roles floor the line height at 1.5× the size. Two consequences:
  - The Mushaf footer is 70, not 68.
  - The meta line is 21, not 20.
- **App-only sections keep their place, restyled on the shared tokens** (D6): «مقترح لك», Library history and insights, and the community entry.
- **Bold is 2–13% wider than the file's text** (D1). Titles that might lose words get full width and wrap.

### Smaller follow-ups

| Item | Detail |
|---|---|
| Gold on cream contrast | `goldAccent` is 3.22:1 on 14pt text; the gold buttons are close to the AA limit. A product call on whether to darken the token. |
| TalkBack order | The saved-row bookmark is read before its row, and «إزالة من المحفوظات» does not name the item. |
| Wrapped Mushaf meta line | About 10pt off centre when it wraps. |
| Meta text at 320dp × 2.0 | Needs `flexShrink` on the meta text. |
| Empty in-progress CTA | May wrap at 320dp. |
| Reciter tablist | iOS ax-service still reports AXGroup, so it is verified by unit test only. |
| Saved LectureCard | The bookmark sits inside the row's Pressable, so VoiceOver reaches unsave only through the row's custom action, not as its own element. |
| Home book cards | The book rail cards have no tap action (`app/(tabs)/index.tsx:221` passes no `onPress`), so VoiceOver reads them as plain groups. Where they should open is a product decision: the items are lecture ids, and `sections/book/[id]` may expect a book id. |
| `shouldRasterizeIOS` | Dawah posters can look slightly soft on iOS. |
| Notes and playback | Notes filtering, and re-render cost during playback, are worth a profiler pass. |
| Descenders at large font scales | Android 14+ grows `lineHeight` less than `fontSize`; at 1.7 a 14pt role's line box is about 1.26× the size instead of 1.5×, so a TextView clips the descenders of its last line. ListRowCard now carries a layout-neutral `descenderRoom` (635dfd6). Every other role is exposed in the same way; the general fix belongs in `constants/typography.ts`. |
| Letter rail | Since 0dd7e38 the rail announces and emits ي (alef maqsura is the last letter, per MEDIA-18). Recorded under T11. |

## 6. Before any push

- 198738c (library, T16) also carries the T15 wordmark `.webp` deletions. Move them to 02d2c0e or note it in the PR.
- 2ca48ce (mushaf) carries the T05/T08 layout hunks, and 9764c8a is empty. Fold the hunks into 9764c8a.
- The branch's upstream is `origin/main`. Set it to `origin/fix/figma-parity-2026-10-23` when pushing.
