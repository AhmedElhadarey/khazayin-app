# Figma parity findings (2026-10-23)

Generated from the nine audits behind `docs/plans/2026-10-23-figma-parity-design.md`. One section per ticket. Each finding gives the Figma node and value (or, for screens no frame covers, the in-repo contract), the app's `file:line` and capture evidence, and the fix.

## T01 — Fonts: real Bold/SemiBold faces on iOS and Android

### GLOBAL-01 (high, font-weight) — Every TheSansArabic Bold role on iOS: card titles (sectionTitle 16), card subtitles (cardTitle 14), counts and tab labels (label 12), hero/section headings
- Frame: 2031:5675 Sections (also 2102:2711 More, 2001:940 Home, 2031:4659 Library — every frame)
- Figma: TheSansArabic Bold on 481 of 1,153 text nodes. On 2031:5675 the card title 2031:6079 is TheSansArabic/Bold/16 (lh 24px), the subtitle 2031:6081 is TheSansArabic/Bold/14 (lh 20px), the count 2031:6083 is TheSansArabic/Bold/12, and the tab label 2001:18542 is TheSansArabic/Bold/12 (lh 1.4). Measured on the reference export (docs/audit/2026-09-09/figma-reference/07-2031-5675.png, screen at left 56 / top 18, 0.9847 px/pt): the alef stem in 'العلماء والمشايخ' (16pt) is 2.25 px against an 11.3 px alef height. That is a stem/height ratio of 0.199 and a stem of 0.143 em. Noto Sans Arabic VF measured with hb-view gives 0.113 at wght 400, 0.163 at 600 and 0.191 at 700, so the design's weight corresponds to Noto wght 700.
- App: constants/typography.ts:134-147 sets fontWeight '700' on every display role, and constants/fonts.ts:14-22 / :55-62 register TheSansArabic, TheMixArab and NotoSansArabic all to the single variable file NotoSansArabic-VF.ttf (fvar wght 100-900, default 400, named instances with no PostScript names; one PS name, 'NotoSansArabic-Regular'). The iOS path is: expo-font FontLoaderModule.swift aliases 'TheSansArabic' to PS name NotoSansArabic-Regular, then the swizzled UIFont.fontNames(forFamilyName:) (UIFont+FontFamilyAlias.swift) returns just ['NotoSansArabic-Regular']. RN 0.81 Fabric RCTFontWithFontProperties (RCTFontUtils.mm) chooses the closest weight from that one-element list, so wght 400 is always used and fontWeight is ignored. UIKit does not synthesise bold for custom fonts. Capture evidence: on ios-before/07-2031-5675__sections.png the 'القرآن حياة' stems measure 3.65-3.87 px at 48 px/em, which is 0.077 em and equals the VF at wght 400 (0.081 em). Glyph shapes match an hb-view render at wght=400. Side-by-side: every title, subtitle, count and tab label is visibly regular.
- Fix: Generate static instances from the shipped VF so the glyph set (1711) and version (2.012) do not change. This needs no npm dependency, because fontTools is already in the uv cache. Run: `uvx --from fonttools fonttools varLib.instancer assets/fonts/NotoSansArabic-VF.ttf wght=700 wdth=100 --static --update-name-table -o assets/fonts/NotoSansArabic-Bold.ttf`, and the same with wght=600 to NotoSansArabic-SemiBold.ttf and wght=400 to NotoSansArabic-Regular.ttf. A dry run in scratch produced 194 KB files with unique PS names NotoSansArabic-Bold / -SemiBold / -Regular, usWeightClass 700/600/400 and no fvar. The unique PS names are mandatory, because expo-font iOS (FontUtils.swift:55-63) silently ignores a font whose name duplicates one already registered. That rules out hb-subset --variations, which keeps the name table. Then (a) in constants/fonts.ts point TheSansArabic at NotoSansArabic-Bold.ttf (the design only ever pairs it with Bold) and TheMixArab/NotoSansArabic at NotoSansArabic-Regular.ttf, and add 'NotoSansArabic-SemiBold'/'NotoSansArabic-Bold' families for ad-hoc weights. (b) In constants/typography.ts set every role's fontWeight to '400'/'normal', because the weight now lives in the face. Keeping '700' would break Android (GLOBAL-02). (c) Add a `fontFace(family, weight)` resolver for the ad-hoc call sites (GLOBAL-04). (d) Update __tests__/typography.test.ts:46 ('pairs TheSansArabic with Bold') to assert the face file is Bold, and add a test that forbids fontWeight >= 600 or 'bold' together with any registered custom family.
- Files: constants/fonts.ts, constants/typography.ts, assets/fonts/NotoSansArabic-Bold.ttf (new), assets/fonts/NotoSansArabic-SemiBold.ttf (new), assets/fonts/NotoSansArabic-Regular.ttf (new), __tests__/typography.test.ts, __tests__/fontRegistry.test.ts
- Blast radius: Every screen: 98 textStyle() display-role call sites (label 40, sectionTitle 31, cardTitle 28, …) plus the tab bar. Width risk: Noto Bold sets about 5-11% wider than Regular. Measured with hb-shape at 14pt, 'تلاوات وتفسير وتدبر القرآن الكريم' goes from 181 (400) to 201 (700) against Figma's 197. The ListRowCard text column is about 221pt at 393dp but about 188pt at 360dp, so that subtitle starts to ellipsize at 360dp and narrower (it already does at 320dp). If that is unacceptable, map TheSansArabic to the 600 instance: its widths are within ±3% of Figma (193.8 vs 197, 173 vs 170, 88.7 vs 90), at the cost of a lighter stem (0.163 vs 0.199). Fonts load through useFonts, so this is OTA-safe with no native rebuild. Tablets are unaffected beyond the width change.

### GLOBAL-02 (high, font-weight) — Every fontWeight '700' role on Android renders in the SYSTEM Arabic face (Noto Naskh Arabic UI Bold), not Noto Sans Arabic
- Frame: 2031:5675 Sections (and every frame) — Android
- Figma: The same TheSansArabic Bold nodes as GLOBAL-01, e.g. 2031:6079 / 2031:6081 / 2031:6083 / 2001:18542. One sans face is used throughout.
- App: expo-font Android FontLoaderModule.kt registers the alias with ReactFontManager.setTypeface(name, Typeface.NORMAL, tf), which fills only the NORMAL slot. RN 0.81 ReactFontManager.getTypeface maps weight 700 to nearestStyle BOLD. The BOLD slot is empty, so createAssetTypeface looks for assets/fonts/TheSansArabic_bold.ttf, which is absent, and then calls Typeface.create('TheSansArabic', BOLD). That resolves to the default sans-serif BOLD family, whose Arabic fallback is Noto Naskh Arabic (UI) Bold. Capture evidence: android-before/07-2031-5675__sections.png card titles, subtitles and counts, and the tab labels, have Naskh letterforms that match an hb-view render of NotoNaskhArabic-Bold.ttf exactly ('تلاوات وتفسير'). Meanwhile the 400-weight page title 'الأقسام' is Noto Sans. So one card mixes two different faces. Stem measured at 0.107 em with Naskh contrast, which looks lighter and calligraphic beside Figma's bold sans.
- Fix: The same fix as GLOBAL-01. Once each weight is its own registered family (Bold file under 'TheSansArabic') and the roles carry fontWeight '400', Android hits the populated NORMAL slot and renders the Bold Noto face. Do NOT keep fontWeight '700' on any custom family. Alternative (not recommended): expo-font config-plugin `android.fonts[].fontDefinitions` with weight 400/600/700 XML font families, which ReactFontManager.addCustomFont would then serve per weight. That needs prebuild and a native rebuild, and on iOS it requires naming the real family 'Noto Sans Arabic', which conflicts with the CLAUDE.md rule to keep 'TheSansArabic' names.
- Files: constants/fonts.ts, constants/typography.ts
- Blast radius: Every Android screen. Also any ad-hoc `fontWeight: '700'|'bold'` (58 sites, see GLOBAL-04) and the calligraphy roles (GLOBAL-03).

### GLOBAL-03 (medium, font-weight) — calligraphyTitle / calligraphyBody roles (Amiri-Bold + fontWeight '700')
- Frame: 2001:940 Home (BookCard titles) and every Amiri-Bold call site — Android
- Figma: The design draws book titles as artwork. The app's documented stand-in is Amiri Bold (constants/typography.ts CALLIGRAPHY_FAMILY).
- App: constants/typography.ts:167-168 pairs family 'Amiri-Bold' with fontWeight '700'. On Android this takes the same path as GLOBAL-02: 'Amiri-Bold' is registered only in the NORMAL slot, weight 700 asks for BOLD, and the result is Typeface.create('Amiri-Bold', BOLD), i.e. the system sans-serif bold (Naskh UI). So the BookCard title (components/khazain/home/BookCard.tsx:109) never renders Amiri on Android. iOS is fine, because the alias resolves to PS 'Amiri-Bold' and it is the only candidate. Verified from source, not from a capture: the book rail is below the fold in android-before/05-2001-940__home.png.
- Fix: Set fontWeight '400' (or omit it) on calligraphyTitle and calligraphyBody. The file is already Bold. Apply the same rule to every `fontFamily: 'Amiri-Bold'` site that also sets a bold weight.
- Files: constants/typography.ts, components/khazain/home/BookCard.tsx
- Blast radius: Home book rail. Also any ad-hoc Amiri-Bold + bold weight sites (mushaf.tsx:663-693, SheetShell.tsx:74, settings-*.tsx): check each for a fontWeight.

### GLOBAL-16 (low, line-height) — Line heights of the most common prose and label roles
- Frame: all frames (fig-text.json, Mobile frames)
- Figma: The most frequent styles: TheMixArab/Regular/12 at lh 24px (140 nodes) and lh 20px (64); TheMixArab/Regular/14 at lh 24px (88) and lh 20px (40); TheSansArabic/Bold/14 at lh 24px (73) and lh 20px (55); TheSansArabic/Bold/12 at lh 16px (88).
- App: constants/typography.ts:143-163: caption 12/18, bodyCompact 14/21, cardTitle 14/21, label 12/18. Each role carries a single line height, so the file's 24px variant, the majority for 12pt prose, is set 6pt tighter per line. The 1.5x floor itself is a documented deliberate deviation and is not reported here.
- Fix: Add loose variants (e.g. `captionLoose` 12/24, `bodyCompactLoose` 14/24, `cardTitleLoose` 14/24) for multi-line prose blocks whose Figma nodes state 24px. Do not change the existing roles, which match the 20px nodes after the floor.
- Files: constants/typography.ts
- Blast radius: Only where adopted. Multi-line descriptions (hero bodies, about text, lecture descriptions).

### LIBRARY-03 (high, font-weight) — Bold weight does not render on iOS (every TheSansArabic Bold role: stat titles, «ورد القرآن اليومي», buttons, chips, section titles)
- Frame: 2031:4659 Library
- Figma: TheSansArabic/Bold on every label in the frame (e.g. 2095:1613 «تذكيراتي» Bold 14, 2095:1653 Bold 16); fig-text.json.
- App: The code requests fontWeight '700' (constants/typography.ts:140-144), but the iPhone 16 capture renders Regular (audit/tmp/ios-top.png: «تذكيراتي», «ورد القرآن», «ملاحظاتي» are visibly thin). The Pixel 7 capture of the same screen renders Bold (audit/tmp/and-top.png). Cause: TheSansArabic is an alias for NotoSansArabic-VF.ttf (constants/fonts.ts:20,60). On iOS a custom-named font resolves to one exact face, here the variable font's default Regular instance, and fontWeight is ignored. Android synthesizes the weight.
- Fix: Register a static Bold face and route weight 700 to it. Add e.g. assets/fonts/NotoSansArabic-Bold.ttf (an asset from the same Noto family, not a new dependency, but confirm with the user per the authority matrix) as 'TheSansArabic-Bold' in ARABIC_FONT_ASSETS/FONT_ASSET_MODULES and FONT_SUBSTITUTIONS. In textStyle(), map {DISPLAY_FAMILY, '700'} to fontFamily 'TheSansArabic-Bold' (keep fontWeight '700' so Android does not double-embolden: test it). Components keep naming TheSansArabic, as CLAUDE.md requires.
- Files: constants/fonts.ts, constants/typography.ts, app/_layout.tsx, assets/fonts/
- Blast radius: Global, every screen on iOS. Line heights and widths will change slightly where text gets bolder (watch the stat-card titles at 320dp and the RibbonCard titles). Report once in the final summary; other groups will hit the same issue.

### MEDIA-02 (high, font-weight) — Bold display text (month titles, counts, poster titles, durations) renders Regular on iOS
- Frame: 2120:942, 2120:1857, 2606:3830 (and every frame using TheSansArabic Bold)
- Figma: Month titles 2365:2131 etc. TheSansArabic Bold 14 #281E13; counts 2365:2127 TheSansArabic Bold 12 #5F5345; poster titles 2548:1365 Bold 14; radio durations 2606:3835 Bold 12. Reference exports 11/12/22 render them visibly bold.
- App: Roles cardTitle/label set fontWeight '700' (constants/typography.ts:141,143) on family 'TheSansArabic', which constants/fonts.ts:20,60 maps to the single variable file NotoSansArabic-VF.ttf. On iOS an expo-font alias to one face ignores fontWeight (no bold face and no wght axis applied), so the iPhone 16 captures (11, 12, 22) show titles/counts at the same stroke weight as the Regular 18 header. The Pixel 7 captures of the same screens DO render bold (Android applies the weight), so this is an iOS-only regression of weight, independent of the known family substitution.
- Fix: Ship a static Bold instance (e.g. `fonttools varLib.instancer NotoSansArabic-VF.ttf wght=700 -o NotoSansArabic-Bold.ttf`, OFL) and register it under aliases 'TheSansArabic-Bold' (and 'TheMixArab-Bold' if ever needed) in constants/fonts.ts ARABIC_FONT_ASSETS + FONT_ASSET_MODULES; in constants/typography.ts make roles with fontWeight '700' resolve to `${family}-Bold` with fontWeight '400' (do it on both platforms so Android stops relying on synthetic/axis weight). Update __tests__/fontRegistry.test.ts. Adding a font asset may need user sign-off per authority-matrix.
- Files: constants/fonts.ts, constants/typography.ts, assets/fonts/, __tests__/fontRegistry.test.ts
- Blast radius: App-wide: every displayLarge/display/screenTitle/heroTitle/sectionTitle/cardTitle/label/labelSmall text on iOS (≈481 bold nodes in the file). Bold glyphs are wider: re-check one-line titles that are close to truncation at 320dp (dawah titles, rail rows, tab labels).

### MORE-05 (high, font-weight) — Bold display roles render Regular on iOS
- Frame: 2558:1334 Archive (and every TheSansArabic Bold role app-wide)
- Figma: Archive card text is TheSansArabic Bold: title 2558:1373 16/24, subtitle 2558:1375 14/20, count 2558:1377 12/16. The tab-bar labels in the reference export are bold too.
- App: constants/typography.ts:146-153 gives these roles fontWeight '700' on family 'TheSansArabic', which constants/fonts.ts maps to the single NotoSansArabic-VF.ttf (no bold face registered). Android draws them bold (captures/android-before/28-2558-1334: ink density 0.193). iOS draws them at Regular weight: the Bold 16 archive title has ink density 0.169, lower than the Regular 14 More-row title at 0.185 on the same device. iOS crop: titles, subtitles and counts look identical in weight to the regular body text. The iOS tab labels are not bold either.
- Fix: Register a real bold face for the display family. Instance NotoSansArabic-VF at wght=700 into a static TTF (fonttools varLib.instancer; an asset, not a new npm dependency, but confirm with the user per authority-matrix) and map `TheSansArabic` to it in ARABIC_FONT_ASSETS/FONT_ASSET_MODULES/FONT_SUBSTITUTIONS. The design only pairs TheSansArabic with Bold, so the family itself can be the bold face. Then check Android does not double-embolden (fontWeight '700' on an already-bold face). If it does, drop fontWeight for the display roles on Android, or keep '700' and verify visually.
- Files: constants/fonts.ts, assets/fonts/ (new static bold TTF), constants/typography.ts, __tests__/fontRegistry.test.ts
- Blast radius: App-wide on iOS: every displayLarge/display/screenTitle/heroTitle/sectionTitle/cardTitle/label/labelSmall use (section cards, archive, tab bar labels, chips, Home section headers). Outside the More group; flag it to the orchestrator once.

### SCHOLARS-02 (high, font-weight) — Duration label '٣٢ دقيقة' weight on iOS (and every TheSansArabic Bold role on iOS)
- Frame: 2465:1911 Prophet; 2589:1772 Queen; 2597:2552 Books (and 2510:1990 when a duration exists)
- Figma: TEXT '45 دقيقة-143' (2473:2577, 2589:1777, 2597:2736, 2510:1995) = TheSansArabic Bold 12, lh 16px, #5F5345. Reference export shows a clearly bold numeral+word, ink 48pt wide.
- App: LectureCard.tsx:162 / RibbonCard.tsx:143 use textStyle('label') = TheSansArabic, fontWeight '700'. constants/fonts.ts:20,60 maps the TheSansArabic alias to the single NotoSansArabic-VF.ttf file. Android renders it bold (crop of android-before/18 row 1); iOS renders it at the REGULAR weight (ios-before/18 row 1: stroke weight identical to the Regular title; ink only 40pt wide vs Figma 48). Same on iOS Sections root (ios-before/07): sectionTitle/cardTitle/label all render regular. iOS cannot pick a weight out of a variable font registered under an alias; it resolves the alias to the VF default (Regular) instance.
- Fix: Generate a static Bold instance from the VF already in the repo: `fonttools varLib.instancer assets/fonts/NotoSansArabic-VF.ttf wght=700 -o assets/fonts/NotoSansArabic-Bold.ttf` (OFL, same face; asset add needs user OK per authority-matrix). Point the TheSansArabic alias at it in constants/fonts.ts (ARABIC_FONT_ASSETS.TheSansArabic, FONT_ASSET_MODULES.TheSansArabic, FONT_SUBSTITUTIONS.TheSansArabic) - the design only ever pairs TheSansArabic with Bold, so every role using it (TEXT_ROLES displayLarge..labelSmall) already asks for 700. If Android double-emboldens a static bold with fontWeight 700, scope the swap with Platform.select (iOS -> Bold static, Android -> VF). Update __tests__/fontRegistry.test.ts.
- Files: constants/fonts.ts, assets/fonts/NotoSansArabic-Bold.ttf (new), __tests__/fontRegistry.test.ts
- Blast radius: App-wide on iOS: every TheSansArabic Bold text (section card titles/subtitles/counts, Home section headings, tab labels, chips, durations). Visible improvement everywhere; verify no hand-assembled `TheSansArabic` + weight 400 call sites remain (they would turn bold). Widths grow slightly (Figma 48 vs app 40 for the duration) - check 320dp rows for truncation of durations/counts.

### SECTIONS-01 (high, font-weight) — Every TheSansArabic Bold role on iOS: section card title (16), subtitle (14), count (12); segment tab labels (10); SurahStar numeral
- Frame: 2031:5675 Sections root (also 2031:6193 / 2102:3187 tab labels, 2207:5270 surah numeral)
- Figma: TheSansArabic Bold on all three card lines: 2031:6079 (16/24 #281E13), 2031:6081 (14/20 #5F5345), 2031:6083 (12/16 #184B76); tab labels 2457:943/950/953/947 Bold 10; numeral 2345:2014 Bold 14. Read from fig-geom JSON (family/style per TEXT node).
- App: constants/typography.ts:140-144 asks for fontWeight '700' on family 'TheSansArabic', which constants/fonts.ts:20,60 aliases to NotoSansArabic-VF.ttf (a variable font: wght 100-900, default 400, 9 named instances, read from its fvar table). iOS capture ios-before/07-2031-5675__sections.png: the card title 'القرآن حياة' (700) has the same stroke weight as the page title 'الأقسام' (400). Side-by-side crop: audit/tmp/sec-ios-weight.png. Android (android-before/07...) renders it bold. iOS resolves a weight on a custom family by picking among the family's registered faces, and the VF registers only its default Regular instance, so 700 falls back to Regular. Android synthesises or applies the weight. Every 'bold' string in the app is therefore Regular on iOS.
- Fix: Ship static instances cut from the same OFL variable font, for example NotoSansArabic-Bold.ttf made with `fonttools varLib.instancer NotoSansArabic-VF.ttf wght=700`. Register them as their own families ('TheSansArabic-Bold', plus 'TheMixArab-Bold' if needed) in ARABIC_FONT_ASSETS / FONT_ASSET_MODULES / FONT_SUBSTITUTIONS. In TEXT_ROLES, have the 700 roles name the -Bold family with fontWeight 'normal', so Android does not embolden a face that is already bold. Update __tests__/fontRegistry.test.ts. Adding a font asset needs the user's sign-off (authority-matrix).
- Files: constants/fonts.ts, constants/typography.ts, app/_layout.tsx, assets/fonts/, __tests__/fontRegistry.test.ts
- Blast radius: App-wide. Every role that uses DISPLAY_FAMILY: displayLarge, display, screenTitle, heroTitle, sectionTitle, cardTitle, label, labelSmall, on every screen. Android output should not change if fontWeight becomes 'normal' on the bold family. Check that line heights hold, because the static instance has the same vertical metrics.


## T02 — Fonts: route every ad-hoc fontWeight through the type roles

### GLOBAL-04 (medium, font-weight) — Raw fontWeight declarations: '600' x33, '700' x56, 'bold' x2, '500' x2
- Frame: all frames — ad-hoc weights outside the role scale
- Figma: The design has no SemiBold or Medium Arabic text. It uses only TheSansArabic Bold and TheMixArab Regular (fig-text.json; derivedTextData.fontMetaData reports TheSansArabic 'Bold' at fontWeight 530 and TheMixArab at 400).
- App: '600' and '500' fall below Android's BOLD threshold (nearestStyle NORMAL) and are ignored on iOS (single-face alias), so these sites render Regular on both platforms. '700' and 'bold' render Regular on iOS and system Naskh Bold on Android. Sites include components/khazain/primitives/{SectionHeader,DetailHeader,MiniPlayer,PillButton,ToastOverlay}.tsx, components/khazain/library/{WirdHistory,AudioProgressCard,CircularProgress,InsightRow,WirdSuggestionBanner}.tsx, components/khazain/sheets/{SheetShell,SheetRow}.tsx, app/(tabs)/library.tsx, app/(tabs)/sections/mushaf.tsx and app/settings-*.tsx (grep `fontWeight: '(500|600|700|bold)'`).
- Fix: Replace each with a textStyle role where one fits. Otherwise use a `fontFace(family, weight)` helper that returns { fontFamily: <weight-specific family>, fontWeight: 'normal' }, mapping 600/700 to 'TheSansArabic' (Bold file) or 'NotoSansArabic-SemiBold'. Add a jest guard that scans source and fails on fontWeight >= 500 or 'bold' next to a registered custom family.
- Files: constants/typography.ts, the files listed in app
- Blast radius: Library, Mushaf, settings modals, sheets, toasts, the MiniPlayer title. Every change is visible, so each needs an on-device check.

### MORE-15 (low, font-weight) — Email placeholder face
- Frame: 2106:2598 Contact us
- Figma: 2106:1967 'example@email.com' is Inter Medium 14/20, #5F5345.
- App: contact.tsx:256 fieldInput uses bodyCompact (TheMixArab, which resolves to Noto Sans Arabic and has no Latin glyphs), so Latin falls back to the system face at 400. iOS/Android captures show a light regular Latin.
- Fix: Optional: for the email field set fontWeight '500' with a system Latin face via a per-field style. Low value, so it can be accepted as a deviation.
- Files: app/(tabs)/more/contact.tsx
- Blast radius: Contact only.

### NOFRAME-09 (medium, font-weight) — Group heading «سور (3)»
- Frame: contract (no Figma frame) components/khazain/search/SearchGroupHeader.tsx
- Figma: constants/typography.ts: TheMixArab is only ever Regular; headings use TheSansArabic Bold (sectionTitle). Digits are Arabic-Indic app-wide.
- App: title (31-38): TheMixArab 16 fontWeight 700 (inverts the face rule), no lineHeight; count interpolated raw -> Latin digits «(3)» (line 19).
- Fix: title: textStyle('sectionTitle',{color: ink900}); render `${title} (${toArabicDigits(count)})`. Rule colour gold200@0.5 -> KhazainColors.hairlineWarm.
- Files: components/khazain/search/SearchGroupHeader.tsx
- Blast radius: Search results and Library MySavedSection group headers.

### NOFRAME-12 (low, font-weight) — Recent query text
- Frame: contract (no Figma frame) components/khazain/search/RecentSearchRow.tsx
- Figma: Prose/data text is TheMixArab Regular (bodyCompact).
- App: text TheSansArabic 14 regular, no lineHeight (53-59); divider literal rgba(141,107,52,0.08).
- Fix: text: textStyle('bodyCompact',{color: ink900}); borderBottomColor KhazainColors.hairlineFaint.
- Files: components/khazain/search/RecentSearchRow.tsx
- Blast radius: Search only.

### NOFRAME-16 (medium, font-weight) — Sheet title style
- Frame: contract (no Figma frame) SheetShell + all modal sheets
- Figma: Every page/sheet title in the app is textStyle('bodyLarge') inkTitle (InlineHeader.tsx:101 from the Figma page titles; settings-*.tsx title, note-editor sheetTitle, notes-viewer sheetTitle).
- App: SheetShell title is Amiri-Bold 17/700 navy800 with no lineHeight (SheetShell.tsx:73-81) — used by telegram-sheet, youtube-sheet, share-sheet (and community report sheet if it uses the shell).
- Fix: title: textStyle('bodyLarge',{color: KhazainColors.inkTitle, textAlign: 'center'}).
- Files: components/khazain/sheets/SheetShell.tsx
- Blast radius: Telegram, YouTube, Share sheets.

### NOFRAME-20 (low, font-weight) — «و ٦٠ قناة أخرى...» footnote
- Frame: contract (no Figma frame) app/youtube-sheet.tsx
- Figma: Prose = caption role.
- App: more style (66-74): TheSansArabic 12 regular, no lineHeight, gold500 (3.6:1).
- Fix: textStyle('caption',{color: KhazainColors.goldAccent, textAlign: 'center'}).
- Files: app/youtube-sheet.tsx
- Blast radius: YouTube sheet.

### NOFRAME-23 (medium, font-weight) — Selectable list rows (qira'a, reciter, level, preset)
- Frame: contract (no Figma frame) settings-qiraa / settings-reciter / settings-font-size / settings-wird-goal + onboarding SelectableRow
- Figma: The same qira'a/reciter names are drawn by ReciterRow from Figma 2031:6193 / 2457:954: bodyCompact 14 inkTitle title, caption 12 subtitle, 56 min, radius 12, hairlineWarm, gold 1.5 border when chosen (ReciterRow.tsx:77-106). typography.ts reserves Amiri for places the design shows calligraphy as an image.
- App: rowTitle Amiri-Bold 17/700 with no lineHeight (settings-qiraa.tsx:131-139, settings-reciter.tsx:141-148, SelectableRow.tsx:168-175), Amiri-Bold 16 in settings-wird-goal.tsx:203-211; rows radius 16 + cardBorder + KhazainShadows.card (qiraa 113-126 etc.). Subtitle drift between the two copies that claim to match: settings-reciter bodyCompact 14 (149) vs SelectableRow TheSansArabic 13 (176-182). Selected tick is hand-drawn (no Figma tick exists — acceptable).
- Fix: Titles textStyle('bodyCompact',{color: inkTitle}) (or cardTitle if a heavier label is wanted), subtitles textStyle('caption',{color: ink500}); rows CARD_DENSITY.reciterRowMinHeight/reciterRowRadius + hairlineWarm, no shadow. Ideally extract one SelectableRow used by all five.
- Files: app/settings-qiraa.tsx, app/settings-reciter.tsx, app/settings-font-size.tsx, app/settings-wird-goal.tsx, components/khazain/onboarding/SelectableRow.tsx
- Blast radius: Five settings modals + onboarding steps 1-2. Font-size LevelRow keeps its per-level preview size (deliberate).

### NOFRAME-24 (medium, font-weight) — Onboarding typography
- Frame: contract (no Figma frame) onboarding (WelcomeStep, QiraaStep, ReciterStep, ChannelsStep, OnboardingFooter)
- Figma: Roles: titles TheSansArabic Bold, prose TheMixArab Regular, sizes from the scale. The identical headings «اختر القراءة الافتراضية» / «اختر القارئ المفضّل» are bodyLarge 18 in the Settings sheets.
- App: Step titles Amiri-Bold 22 (QiraaStep.tsx:63-70, ReciterStep.tsx:103-110, ChannelsStep.tsx:74-81); mission Amiri 19/34 (WelcomeStep.tsx:94-101); highlights TheSansArabic 15/24 regular (111-118); hint/subtitles TheSansArabic 14-15 regular (WelcomeStep 125-131, QiraaStep 71-79, ReciterStep 111-119, ChannelsStep 82-90); CTA labels forced to 15 (ChannelsStep 93); footer links TheSansArabic 14/600 (OnboardingFooter.tsx:86-93).
- Fix: Titles textStyle('screenTitle') (24) or bodyLarge to match Settings; mission textStyle('bodyLarge',{textAlign:'center'}); highlights textStyle('body'); hints/subtitles textStyle('bodyCompact'); footer links textStyle('cardTitle',{color: inkSubtle}); drop the ctaLabel 15 override.
- Files: components/khazain/onboarding/WelcomeStep.tsx, components/khazain/onboarding/QiraaStep.tsx, components/khazain/onboarding/ReciterStep.tsx, components/khazain/onboarding/ChannelsStep.tsx, components/khazain/onboarding/OnboardingFooter.tsx
- Blast radius: Onboarding only. Check WelcomeStep at font_scale 1.7 (comment at 73-78) still scrolls.

### NOFRAME-33 (low, font-weight) — Selected method label weight, time numerals, empty state
- Frame: contract (no Figma frame) app/settings-prayer.tsx (مواقيت الصلاة)
- Figma: TheMixArab is Regular-only; no-shrink-wrap rule for Arabic titles (CLAUDE.md).
- App: selectLabelActive sets fontWeight 700 on the body role (358-361) -> bold TheMixArab; timeValue Amiri-Bold 18 (316-322, off-role); emptyState alignItems:'flex-end' (295-300) shrink-wraps the title (pinned, so it is on the right, but subject to the Android 15 clipping).
- Fix: Active label textStyle('cardTitle',{color: navy800}); timeValue textStyle('sectionTitle',{color: navy800}); emptyState alignItems:'stretch'.
- Files: app/settings-prayer.tsx
- Blast radius: Prayer modal.

### NOFRAME-34 (low, font-weight) — Crash fallback screen type and palette
- Frame: contract (no Figma frame) app/_layout.tsx RootErrorFallback
- Figma: Every text must name a registered family (fontRegistry test) via a role.
- App: body and buttonLabel set no fontFamily (596-617) -> platform default Arabic font; title Amiri-Bold 20; legacy Colors.light.* palette; #fff label; buttonLabel 15/600.
- Fix: title textStyle('bodyLarge',{textAlign:'center'}), body textStyle('bodyCompact',{textAlign:'center'}), button PillButton navy; KhazainColors.pageBg / inkTitle.
- Files: app/_layout.tsx
- Blast radius: Only seen after a render crash.

### NOFRAME-36 (low, font-weight) — fontWeight / fontFamily literals outside typography roles
- Frame: repo-wide (Figma-backed primitives, for the owning groups)
- Figma: constants/typography.ts: roles carry only 400/700; callers must not assemble type.
- App: Remaining non-NOFRAME hits: PillButton.tsx:70-72 (TheSansArabic 13/14 weight 600 — used by onboarding, ErrorState, community); DetailHeader.tsx:82-85 (18/700); MiniPlayer.tsx:215,223; app/(tabs)/library.tsx:743 (600) and 876-882 (recentEmpty TheSansArabic 12); app/(tabs)/sections/mushaf.tsx:665,681; library CircularProgress.tsx:69, AudioProgressCard.tsx:108, TrendSparkline.tsx:106-107 (11pt). primitives/SectionHeader.tsx (600/500, lineHeight 21) is only used by legacy screens. components/ui/* (MaterialIcons/Ionicons) is only imported by legacy routes — no live hit.
- Fix: PillButton label -> textStyle(size === 'sm' ? 'label' : 'cardTitle'); others to the nearest role (owning groups to confirm against their frames).
- Files: components/khazain/primitives/PillButton.tsx, components/khazain/primitives/DetailHeader.tsx, components/khazain/primitives/MiniPlayer.tsx, app/(tabs)/library.tsx, app/(tabs)/sections/mushaf.tsx, components/khazain/library/CircularProgress.tsx, components/khazain/library/AudioProgressCard.tsx, components/khazain/library/TrendSparkline.tsx
- Blast radius: PillButton is shared by onboarding, error states and community.


## T03 — InlineHeader: back-arrow colour, alignment and title gap

### MEDIA-03 (high, colour) — Header back arrow colour
- Frame: 2120:942, 2120:1857, 2606:3830, 2869:2088, 2869:2306
- Figma: `vuesax/bulk/arrow-right` instances 2120:1005, 2120:1915, 2606:3915, 2869:2199, 2869:2417 all carry symbolOverrides on both vectors (2001:15040, 2001:15041) to SOLID r0.158 g0.119 b0.074 = #281E13 (inkTitle). Reference exports show a dark brown arrow.
- App: components/khazain/primitives/InlineHeader.tsx:51 `<FigmaIcon name="Back" ... color={KhazainColors.navy800} />` = #184B76. iOS and Android captures of all five screens show a navy/blue arrow.
- Fix: InlineHeader.tsx:51 change `color={KhazainColors.navy800}` to `color={KhazainColors.inkTitle}` and update the comment.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: Every screen using InlineHeader (all Sections sub-screens, More sub-screens, etc.). Verify no other frame overrides the arrow to navy before changing globally (the five MEDIA frames all use #281E13).

### MORE-06 (high, colour) — Header back arrow colour
- Frame: 2106:2598 Contact, 2106:2712 About, 2558:1334 Archive
- Figma: Header instances 2106:2679, 2106:2745 and 2558:1624 (vuesax/bulk/arrow-right, upright) override both parts (2001:15040, 2001:15041) to #281E13. All 23 upright header instances in the file are #281E13, and none is navy. Reference 27-2106-2712.png pixels at the arrow: #281e13 solid, #a59d96 for the 40% part.
- App: components/khazain/primitives/InlineHeader.tsx:52 renders <FigmaIcon name='Back' color={KhazainColors.navy800}/>, so it is #184B76. Measured in iOS capture 27-2106-2712__more-about.png at x 1092px: #184b76.
- Fix: InlineHeader.tsx:52 color={KhazainColors.inkTitle}.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: All InlineHeader screens (about 15: every Sections sub-screen, Archive, Contact, About, settings screens). Matches the file everywhere, because no header instance is navy. Check whether DetailHeader also draws Back in navy (not in this group).

### SCHOLARS-03 (high, colour) — Header back arrow colour
- Frame: all five (2102:2975, 2510:1990, 2465:1911, 2589:1772, 2597:2552)
- Figma: INSTANCE 'vuesax/bulk/arrow-right' 20x20 (2102:3061, 2510:2098, 2465:2075, 2589:1857, 2597:2670): symbolOverrides set fillPaints SOLID #281E13 on BOTH vectors (master 2001:15037 is #A0AEBA; the 40%-opacity layer is on the vector). Reference export arrow ink averages a warm dark grey (#807870 at 1x).
- App: components/khazain/primitives/InlineHeader.tsx:51 `<FigmaIcon name="Back" size={20} color={KhazainColors.navy800} />` (#184B76). iOS capture glyph averages #7A93A9 (blue); Android #92A5B6 - visibly navy against the brown title.
- Fix: InlineHeader.tsx:51: color={KhazainColors.inkTitle} (#281E13). Keep size 20 and no `mirrored` (orientation is correct).
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: Every screen using InlineHeader (all Sections sub-screens, More sub-screens, settings etc.). All 23 upright header instances in the file override to #281E13 per the manifest note, so this is a correction everywhere, not a regression. Dark-mode/inverse headers (if any use InlineHeader on navy) should be checked.

### SCHOLARS-04 (medium, spacing) — Header back arrow vertical alignment vs title
- Frame: all five
- Figma: Header frame (e.g. 2465:2073) AL HORIZONTAL: title TEXT 19 tall @y0.5 and arrow 20x20 @y0 share one 20pt row at y=8 under the 45pt status bar -> arrow glyph centre (glyph spans y 5..18.98 of the 24 master, x0.833) = title centre = 18pt into the header. Ref export: title ink y72-89, arrow ink y74-85 (centred on the title).
- App: InlineHeader.tsx:92-99 centres a 28pt-leading title and the 20pt icon in a 44pt row. iOS (ios-before/18, top inset 59): title ink 68.7-85.7pt (centre 77.2), arrow ink 75.0-86.7pt (centre 80.8) -> arrow sits 3.6pt below the title's optical centre; visible in every side-by-side.
- Fix: Lift the icon to the title's glyph box: wrap the FigmaIcon in `<View style={{ marginBottom: 8 }}>` (icon box becomes 8..28 inside the centred 8..36 title line), or set touchArea alignItems:'flex-start' and give the icon marginTop 8. Do not change the 44pt row height.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: All InlineHeader screens. Pure vertical nudge of a 20pt glyph inside a 44pt row; no layout change. At large font scale the title line grows; anchoring the icon to the first line (flex-start + marginTop) is the more robust variant.

### SCHOLARS-05 (medium, spacing) — Gap between header title and back arrow
- Frame: all five
- Figma: Title group frame (2102:3059, 2510:2096, 2465:2073, 2589:1855, 2597:2668) AL HORIZONTAL gap=4: text 97 wide @0, arrow @101. Ref export: title ink right edge 402px, arrow ink left 414px (~12pt incl. the arrow glyph's 6.8pt inset in its 20 box).
- App: InlineHeader.tsx:96 touchArea gap: 8. iOS prophet: title ink right 347.7pt, arrow ink left 363.7pt (16pt). The arrow lands exactly where Figma puts it (363.7 vs 363.8), so the whole title sits ~4pt too far left.
- Fix: InlineHeader.tsx:96 gap: 4.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: All InlineHeader screens; title gains 4pt of room, no truncation risk at 320dp.

### SECTIONS-02 (high, colour) — Header back glyph (vuesax/bulk/arrow-right, upright) colour
- Frame: 2031:6193 / 2102:3187 / 2207:5270 inline header
- Figma: Instances 2031:6268, 2102:3250 and 2207:5424 override both vectors (2001:15040 and 2001:15041) to #281E13. Across the whole file, all 65 instances of symbol 2001:15037 override to #281E13: 23 upright, 42 mirrored. Read from symbolOverrides via kiwi.
- App: components/khazain/primitives/InlineHeader.tsx:51 sets color={KhazainColors.navy800} (#184B76). iOS capture 08-...tajweed.png: the glyph next to 'القرآن حياة' is blue-grey (navy, plus navy at 40%). Same on Android.
- Fix: InlineHeader.tsx:51: color={KhazainColors.inkTitle}.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: All 27 InlineHeader screens (Sections sub-screens, More sub-screens, community, content-search). This is a fix everywhere: every header instance in the file is #281E13.

### SECTIONS-09 (medium, spacing) — Gap between the header title and the back arrow
- Frame: 2031:6193 / 2102:3187 / 2207:5270 inline header
- Figma: Header row frames 2031:6266, 2102:3248, 2207:5422: HORIZONTAL auto-layout, itemSpacing 4. Title box ends at x=353, arrow at 357-377.
- App: InlineHeader.tsx:96 touchArea gap: 8. iOS: arrow glyph at 363.7-370.0 (correct), title glyph right edge at 347.7. It should sit about 4pt further right.
- Fix: InlineHeader.tsx touchArea: gap: 4.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: All 27 InlineHeader screens. Check other groups' frames: every header row in the file appears to share the same component.

### MUSHAF-18 (medium, spacing) — InlineHeader title ↔ back arrow gap
- Frame: 2207:17898 + 2349:982
- Figma: 'العلماء والمشايخ' wrapper (2207:20474 / 2349:913) is a horizontal auto-layout with itemSpacing 4. Title box right edge x 353, arrow box 357–377.
- App: InlineHeader touchArea `gap: 8` (InlineHeader.tsx:96). iOS: arrow ink 363.7–370.3 (centred in a 357–377 box, correct), title ink right edge 348.3 against 353, so the title is 4pt too far left on both Mushaf screens.
- Fix: gap 8 → 4 in InlineHeader.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: All ~15 InlineHeader screens (Sections and More sub-screens). Verify each has itemSpacing 4 in its frame first (2031:6193, 2102:2975, 2465:1911 named in the component header).

### MEDIA-17 (low, spacing) — Header title ↔ back-arrow spacing
- Frame: all five MEDIA frames
- Figma: Header group 2120:1003 (and 2606:3913, 2869:2197, 2869:2415, 2120:1913): HORIZONTAL itemSpacing 4 (title 116 + 4 + arrow 20 = 140).
- App: InlineHeader.tsx:96 touchArea gap 8. iOS capture 23: title ink ends ≈347, arrow box starts 357 (text box right ≈349) → ~8 vs 4.
- Fix: InlineHeader.tsx touchArea `gap: 4`.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: Every InlineHeader screen; long titles gain 4pt before truncation at 320dp.

### MORE-13 (low, spacing) — InlineHeader title to back-arrow gap
- Frame: 2106:2598 / 2106:2712 / 2558:1334
- Figma: Header group frames 2106:2677, 2106:2743 and 2558:1622 have itemSpacing 4: the title box ends at 353 and the arrow starts at 357. Reference ink: title right at 350.3, arrow ink from 363.5.
- App: InlineHeader.tsx touchArea gap: 8. The title box ends at 349. iOS ink: title right at 348.3, arrow ink from 363.7, so the title sits about 2pt (ink) to 4pt (box) further left.
- Fix: InlineHeader.tsx touchArea gap: 4.
- Files: components/khazain/primitives/InlineHeader.tsx
- Blast radius: All InlineHeader screens (Sections sub-screens too, every one with itemSpacing 4, e.g. 2102:3059).


## T04 — HeaderArt: ornament rotation, tile scale, header band

### GLOBAL-10 (medium, decoration) — HeaderArt large corner ornament: rotation and position
- Frame: 2031:5675 / 2102:2711 / 2558:1334 (and every frame carrying 'Shape 2 copy' 96x94)
- Figma: The 'Shape 2 copy' nodes 2031:5777, 2102:2817, 2558:1505, 2031:4862 and 2031:2162 (Home), plus the single-corner variants at y -8.87, all carry transform m00=-0.4277 m01=-0.9039 m10=0.9039 m11=-0.4277 at (84.16, -16.87). That is the 96.4x93.8 image ROTATED about 115° around its origin. Its corners land at (84,-17), (43,70), (-1,-57) and (-42,30), so the visible part fills the top-left corner of the frame, x 0..84, y 0..70. Reference exports show the motif at the top-left, behind the status-bar time.
- App: components/khazain/patterns/HeaderArt.tsx:15-21 and :122-130 draw ornament-corner-on-page.png upright at left 84, top -17, 96x94. That puts it at x 84..180, under and left of the Dynamic Island. iOS and Android captures (07, 25) show the geometric motif at about x 135-170pt instead of in the corner, and it is a different silhouette because it is not rotated.
- Fix: Reproduce the node transform. Wrap the Image in a 96.4x93.8 View with `position:'absolute', left:84.16, top:-16.87, transformOrigin:'0 0'` (RN 0.81 supports transformOrigin) and `transform:[{rotate:'115.32deg'}]`. That is atan2(0.9039, -0.4277), and the scale is 1. Alternatively pre-rotate the asset in scripts/figma/extract-images.js and place its axis-aligned bbox at left -41.8, top -57, size 126x127. The single-corner variant keeps top -8.87.
- Files: components/khazain/patterns/HeaderArt.tsx, scripts/figma/extract-images.js (if pre-rotating)
- Blast radius: Every screen using HeaderArt (sections/index, dawah, discussion/*, more/*). Tablets use right-anchored geometry (headerArtGeometry): convert the rotated bbox the same way (right = inset-16 + 393-84.16). PHYSICAL_BOX already pins the direction.

### GLOBAL-12 (low, decoration) — HeaderArt small corner geometry differs per frame
- Frame: 2031:4659 Library, 2001:940 Home
- Figma: Library 2031:4861 is 37x36 at (356, 43), not 36. Home 2031:2160 is 25.8x25.1 at (370.94, 38.0) rotated about 21° (m00 0.93, m01 -0.36). Sections and More are 37x36 at (356, 36).
- App: HeaderArt.tsx:22-28 hard-codes 37x36 at (356, 36) for every 'pair'.
- Fix: Add an optional `smallCorner` geometry prop (or a 'library'/'home' variant) carrying top 43 for Library, and 25.8x25.1 at (370.94, 38) with rotate ~-21.2deg and transformOrigin '0 0' for Home.
- Files: components/khazain/patterns/HeaderArt.tsx
- Blast radius: Only once GLOBAL-11 lands.

### MEDIA-04 (medium, decoration) — Header corner ornament `Shape 2 copy` position/rotation
- Frame: 2120:942 (also 2120:1857, 2606:3830, 2869:2088, 2869:2306)
- Figma: 2120:1009 (same transform on 2120:1916, 2606:3919, 2869:2203, 2869:2421): 96.42x93.82, transform m00=-0.4277 m01=-0.9039 m10=0.9039 m11=-0.4277 (pure rotation ≈115.3°, det=1, no mirror) about origin (84.16, -8.87). Its rotated bbox is x -41.9..84.2, y -49..78.3, so the visible motif sits in the TOP-LEFT corner (x≈0..84, y≈0..78). Confirmed in figma-reference/11-2120-942.png: the motif is drawn behind the '9:41' at the top-left, not at x=84..180.
- App: components/khazain/patterns/HeaderArt.tsx:15-21,157 draws ornament-corner-on-page.png UNROTATED at left 84, top -9 (single), 96x94; the asset (183x183) is unrotated. iOS capture 11 shows the motif at x≈90..170pt beside the Dynamic Island; Android the same (≈136..173dp scaled). The 2026-10-22 sections audit (docs/plans/2026-10-22-sections-figma-audit-design.md:19) took the transform translation as the position and missed the rotation.
- Fix: Rotate the image about its centre: centre in frame coords = origin + R·(w/2,h/2) = (21.14, 14.64). Phone geometry: `{ position:'absolute', left: 21.14-48.21 (= -27.07), top: 14.64-46.91 (= -32.27), width: 96.42, height: 93.82, transform:[{ rotate: '115.33deg' }] }` (single and pair share this, since the single frames' m12 is -8.87; recheck the pair frames' own transform). Tablet: derive `right` from the same centre (393 - 21.14 - 48.21 from the frame right). Alternatively pre-rotate the asset in scripts/figma/extract-images.js and place it at its bbox.
- Files: components/khazain/patterns/HeaderArt.tsx, scripts/figma/extract-images.js
- Blast radius: All HeaderArt users (Sections root, Dawah, all More screens, community, discussion). Check the tab-root 'pair' small corner (37x36 @ 356,36) for the same rotation before reusing the constant. Layer has overflow:hidden so the negative offset is clipped correctly on all widths.

### MEDIA-08 (medium, decoration) — Background geometric tile scale and extent
- Frame: 2120:942 (all HeaderArt frames)
- Figma: 2120:943 (=2120:1858, 2606:3831, 2869:2089, 2869:2307): rect 392x549 at x=1, IMAGE paint STRETCH with paint transform m00=1, m11=1.4005, m12=0.1084 on a square 1934px image. v = 1.4005·y/549 + 0.108, so the square image is shown at 392x392 (aspect preserved), shifted up ~42pt, and is visible only for y ≲ 350pt. Reference 11 shows the faint pattern band ending well above the 5th row.
- App: HeaderArt.tsx:14,114-120: the square asset (pattern-geometric-on-page.png, 1176²) fills left0/right0/height549 with contentFit 'cover' + 'top center' → drawn at 549x549 (1.4x too large), centre-cropped ~78pt each side, and visible down to y=549. Contrast-stretched iOS capture 11 shows the pattern continuing to ≈545pt.
- Fix: Phone tile geometry: `{ position:'absolute', left:0, right:0, top: -0.1084/1.4005*549 (≈ -42), aspectRatio: 1 }` with contentFit 'fill' (width = screen width, height = width). Tablet: `{ right, width: 392, height: 392, top: -42 }`. Or bake the crop into the asset in scripts/figma/extract-images.js.
- Files: components/khazain/patterns/HeaderArt.tsx, scripts/figma/extract-images.js
- Blast radius: All HeaderArt screens (Sections root, Dawah, More + community + discussion). At 480dp the square tile grows to 480x480; still ends above content-heavy area. Pair with MEDIA-04.

### MORE-01 (high, decoration) — HeaderArt large corner motif (Shape 2 copy)
- Frame: 2102:2711 More root (also 2106:2598, 2106:2712, 2558:1334)
- Figma: Node 2102:2817 (and 2558:1505, 2106:2683, 2106:2746) is a ROTATED rectangle: transform m00=-0.4277 m01=-0.9039 m10=0.9039 m11=-0.4277, origin (84.16,-16.87), size 96.42x93.82, which is a rotation of 115.32 deg. Rotated bbox is x -42..84, y -57..70, so on screen the motif sits in the top-LEFT corner (x 0..84, y 0..70). Verified in reference export 25-2102-2711.png: the motif sits at frame x 0..~65, y 0..~55, left of the status-bar clock. Contact/About copies use origin y -8.87 (8 lower).
- App: components/khazain/patterns/HeaderArt.tsx:16-22 places it unrotated at left 84, top -17, 96x94 (the node's ORIGIN, not its bbox). iOS capture 25-2102-2711__more.png shows the motif at x ~88..160pt, y 0..76, straddling the Dynamic Island, the wrong way round. Android is the same.
- Fix: Keep the 96.42x93.82 size, centre it at the rotated rect's centre (21.14, 6.65) [single: (21.14, 14.65)], and add transform:[{rotate:'115.32deg'}]. On phone: cornerLarge = {left:-27.07, top:-40.26, width:96.42, height:93.82, transform:[{rotate:'115.32deg'}]}. cornerLargeSingle top becomes -32.26. Tablet branch: right = right + (393 - (-27.07) - 96.42) = right + 323.65. RN rotates about the view centre, so the centre-based numbers above are exact. Add a unit test pinning the angle and centre against the node transform.
- Files: components/khazain/patterns/HeaderArt.tsx, __tests__/ (HeaderArt geometry test)
- Blast radius: Every screen that renders <HeaderArt/>: More root, Archive, Contact, About, Sections root and sub-screens, Library, Home (Home's own header 2031:2160/2162 has the same rotated large motif, and its small one is rotated too: m00 0.935 m01 -0.355). Overflow is hidden by the layer, so the negative left/top are safe. On tablets the art is anchored by the right offsets, so recompute those.

### MORE-02 (medium, decoration) — HeaderArt geometric tile (Vector Smart Object) scale and offset
- Frame: 2102:2711 More root (same tile in 2106:2598, 2106:2712, 2558:1334)
- Figma: Node 2102:2712 (also 2106:2599, 2106:2713, 2558:1335): 392x549 at x=1, IMAGE paint scaleMode STRETCH with paint transform m00=1, m11=1.4005, m12=0.1084, which maps node to image. The square source image (hash e2364e38...) therefore draws 392x392 (549/1.4005 = 392) from y = -0.1084/1.4005*549 = -42 to y = 350, and the bottom 199pt of the node is empty. Reference export: the first visible tile row is a band of small X shapes at y ~83-99.
- App: HeaderArt.tsx:15 tile {left 0, right 0, top 0, height 549} with contentFit='cover' and contentPosition 'top center' (lines 82-88). A square image covering 393x549 scales to 549x549, cropping 78pt off each side, so the pattern is 1.40x too large and starts at y=0 instead of -42. Visible in the iOS and Android captures: the star lattice is visibly coarser than the reference.
- Fix: Draw the tile at its stated geometry: {position:'absolute', left:1, top:-42, width:392, height:392} with contentFit='fill' (or 'contain'), not cover. Tablet branch: same 392x392 box, offset by `right` as now.
- Files: components/khazain/patterns/HeaderArt.tsx
- Blast radius: All HeaderArt screens (every frame uses the same paint transform 1, 1.401, 0.108: 2001:941, 2031:4660, 2031:5676, and the four More frames). Wider phones (412-480dp) get the 392 tile unstretched at left, which is what the file does at 393. If full-width coverage is wanted on wide phones, scale width/height together, never with cover on a 549-tall box.

### MORE-03 (medium, decoration) — Opaque header band over the tile
- Frame: 2102:2711 / 2106:2598 / 2106:2712 / 2558:1334
- Figma: Frame 4header children StatusBar (2102:2807, 2106:2675, 2106:2741, 2558:1495) and Header (2102:2808 h35, 2106:2676 h36, 2106:2742 h36, 2558:1496 h92) carry a VISIBLE #F8F2ED fill and paint above the tile (sibling order: tile first, header last). So the tile is hidden for y < 80 (More), 81 (Contact, About) and 137 (Archive, where the band also contains the search field). Only the two OVERLAY corner motifs paint over the band. Verified in reference 25-2102-2711.png: no tile lines above y ~80, only the corner motifs.
- App: HeaderArt.tsx:79-104 paints the tile from y=0 with nothing above it, so the lattice shows through the status bar and the title row (iOS capture 25-2102-2711__more.png y 0..100pt; also 26-, 27-, 28- captures). The InlineHeader and More headerBlock are transparent.
- Fix: Add a `bandHeight` prop to HeaderArt that paints an opaque KhazainColors.pageBg View from y=0 to bandHeight, drawn after the tile and before the corner motifs so the motifs stay on top. Screens pass insets.top + their header height: More root insets.top + 35 (title band), InlineHeader screens insets.top + 44, Archive insets.top + 44 + search block (40 + 19 bottom pad, ending where the first card's band ends in the file, i.e. the 137pt band minus 45 status bar = 92 below the status bar).
- Files: components/khazain/patterns/HeaderArt.tsx, app/(tabs)/more/index.tsx, app/(tabs)/more/archive.tsx, app/(tabs)/more/contact.tsx, app/(tabs)/more/about.tsx
- Blast radius: All HeaderArt screens. The band height depends on each screen's header, so pass it from the screen (or measure it with onLayout). Tablets: the band is full width.


## T05 — HeaderArt on every screen whose frame has it

### GLOBAL-11 (medium, decoration) — Header art (geometric tile + corner ornament) missing
- Frame: 2001:940 Home, 2031:4659 Library, plus Sections sub-frames 2031:6193, 2102:2975, 2102:3187, 2120:1857, 2207:5270, 2207:17898, 2465:1911, 2510:1990, 2589:1772, 2597:2552, 2606:3830, 2869:2088, 2869:2306
- Figma: Each of these frames carries the 392x549 'Vector Smart Object' tile at OVERLAY (e.g. 2031:4660, 2001:941) and a 'Shape 2 copy' corner (2031:4862 + 2031:4861 on Library; 2031:2162 + 2031:2160 on Home; one 96x94 corner at y -8.87 on the sub-screens). Contrast-normalised crops of the reference exports show the corner motif top-left (and the tile on Library).
- App: HeaderArt is rendered only by app/(tabs)/sections/{index,dawah,discussion/*}.tsx and app/(tabs)/more/*.tsx (grep). app/(tabs)/index.tsx, app/(tabs)/library.tsx and the Sections sub-screens (reciter, scholar, mushaf, qiraat, prophet, queen, books, radio, audiobooks, exclusive) render a flat pageBg. The contrast-normalised iOS crops show nothing there.
- Fix: Render `<HeaderArt />` (tab roots: corners 'pair'; pushed sub-screens: corners 'single') as the first child of those screens' SafeAreaView, as sections/index.tsx does. Home and Library need per-frame corner geometry (GLOBAL-12).
- Files: app/(tabs)/index.tsx, app/(tabs)/library.tsx, app/(tabs)/sections/*.tsx (sub-screens), components/khazain/patterns/HeaderArt.tsx
- Blast radius: These screens' backgrounds. The art is pointerEvents none and absolute, so layout is unaffected. Tablets use the right-anchored geometry. The Mushaf frame 2207:17898 carries it, but check the Mushaf reader's own background before adding it there.

### HOME-20 (low, decoration) — Page background decorations (pattern overlay + header ornaments)
- Frame: 2001:940 Home
- Figma: 2001:941 pattern image e2364e38… 392x549 at (1,0), OVERLAY, image painted at 392pt per tile; 2031:2160 (25.8x25.1 at 370.9,38) and 2031:2162 (96.4x93.8 at 84.2,-16.9) ornament images 9f0e23be…, OVERLAY. The export shows a faint ornament in the top-left corner; the pattern is near-invisible on #F8F2ED.
- App: app/(tabs)/index.tsx:358-362 plain pageBg; no decoration layer.
- Fix: Optional: an absolutely positioned, non-interactive layer behind the ScrollView content with the two ornaments (pre-blended, since RN has no OVERLAY blend) at the stated rects.
- Files: app/(tabs)/index.tsx
- Blast radius: Home only; must sit under the status bar inset correctly on 320–480dp and tablets.

### LIBRARY-14 (medium, decoration) — Missing page backdrop (Vector Smart Object pattern and the Shape 2 copy corner ornaments)
- Frame: 2031:4659 Library
- Figma: ROUNDED_RECTANGLE 2031:4660 'Vector Smart Object' 392x549 at (1,0), image e2364e38, OVERLAY. Two 'Shape 2 copy' motifs: 2031:4862 96.4x93.8 at (84,-17) rotated, and 2031:4861 37x36 at (356,43), both image 9f0e23be, OVERLAY. Visible in the reference export as the faint star lattice behind the header and stat cards, and the corner ornament top-left.
- App: library.tsx:660-669 mounts no <HeaderArt/>. The ground is plain #F8F2ED in both captures. HeaderArt (components/khazain/patterns/HeaderArt.tsx) draws exactly this art and is already mounted on More, Sections, Dawah and others.
- Fix: Mount <HeaderArt /> (corners 'pair', since this is a tab root) as the first child of the SafeAreaView in library.tsx, the same way app/(tabs)/more/index.tsx does. Note that this frame's small corner sits at y=43, while HeaderArt uses 36 (a 7pt difference, low).
- Files: app/(tabs)/library.tsx
- Blast radius: Library only. HeaderArt already handles tablets and insets.

### MEDIA-05 (medium, decoration) — Background tile + corner ornament (HeaderArt) missing
- Frame: 2120:1857 Dawah Shawwal & Ramadan posters
- Figma: 2120:1858 `Vector Smart Object` 392x549 OVERLAY, visible, image e2364e38…; 2120:1916 `Shape 2 copy` OVERLAY, visible. Reference 12-2120-1857.png shows the top-left motif and the faint geometric band.
- App: app/(tabs)/sections/dawah/[month].tsx:43-44 renders no <HeaderArt/>; iOS/Android captures 12 show a flat #F8F2ED ground.
- Fix: Import HeaderArt from '@/components/khazain/patterns' and render `<HeaderArt corners="single" />` as the first child of the SafeAreaView, as dawah.tsx:33 does.
- Files: app/(tabs)/sections/dawah/[month].tsx
- Blast radius: This screen only. HeaderArt is absolute-fill behind content; no layout risk at 320-480dp or tablet.

### MEDIA-06 (medium, decoration) — Background tile + corner ornament (HeaderArt) missing
- Frame: 2606:3830 Radio
- Figma: 2606:3831 `Vector Smart Object` 392x549 OVERLAY; 2606:3919 `Shape 2 copy` OVERLAY, both visible. Reference 22-2606-3830.png shows the top-left motif.
- App: app/(tabs)/sections/radio.tsx:41-42 has no <HeaderArt/>; captures 22 (iOS/Android) show a flat ground.
- Fix: Add `<HeaderArt corners="single" />` as first child of the SafeAreaView in radio.tsx.
- Files: app/(tabs)/sections/radio.tsx
- Blast radius: Radio only. Same pattern likely applies to prophet/queen/books/scholar sub-screens (other groups) which also lack HeaderArt.

### MEDIA-07 (medium, decoration) — Background tile + corner ornament (HeaderArt) missing
- Frame: 2869:2088 Audiobooks, 2869:2306 Exclusive
- Figma: 2869:2089 / 2869:2307 `Vector Smart Object` OVERLAY and 2869:2203 / 2869:2421 `Shape 2 copy` OVERLAY, all visible. Reference 23-2869-2088.png shows the top-left motif (24 exports blank, node graph is identical).
- App: components/khazain/sections/RailedLectureList.tsx:50-51 renders no <HeaderArt/>; captures 23/24 show a flat ground.
- Fix: Render `<HeaderArt corners="single" />` as the first child of the SafeAreaView in RailedLectureList (one change covers both screens).
- Files: components/khazain/sections/RailedLectureList.tsx
- Blast radius: Audiobooks + Exclusive. On tablets HeaderArt anchors to reading inset; RailedLectureList uses the same reading column so default inset is correct.

### MUSHAF-17 (medium, decoration) — Header art (geometric tile + corner motif) missing
- Frame: 2207:17898 + 2349:982 + 2349:829
- Figma: 2207:17898: 'Vector Smart Object' 2207:17899 (overlay tile, 392x549 at 1,0) and 'Shape 2 copy' 2207:20480 (96.42x93.82 at 84.16,-8.87), both blendMode OVERLAY and visible. 2349:982: only 'Shape 2 copy' 2349:919 at 84.16,-8.87 (no tile). 2349:829: tile 2349:830 only.
- App: Neither ListView, ReadingView nor the resume placeholder renders `HeaderArt` (mushaf.tsx:150, 173-201, 434-442). The component exists (components/khazain/patterns/HeaderArt.tsx) and dawah/about/contact use `corners="single"`, the exact single-corner variant at top -9. The captures show a flat #F8F2ED band where the frame and reference export show the tile and the corner star.
- Fix: Index: add `<HeaderArt corners="single" />` as the first child of the ListView SafeAreaView (absolute layer). Reader: add a `tile?: boolean` prop to HeaderArt (default true) and render `<HeaderArt corners="single" tile={false} />` behind the header band. Resume placeholder: `<HeaderArt corners="none" />`. The layer is absoluteFill with pageBg, so the screens need a transparent background above it, as in dawah.tsx.
- Files: app/(tabs)/sections/mushaf.tsx, components/khazain/patterns/HeaderArt.tsx
- Blast radius: HeaderArt is shared; a new optional prop does not change existing callers. Tablet: headerArtGeometry already anchors right. reciter.tsx/qiraat.tsx/scholar.tsx also lack HeaderArt (other groups).

### SCHOLARS-01 (high, decoration) — Header art: geometric tile (Vector Smart Object) + single corner motif (Shape 2 copy)
- Frame: 2102:2975 Scholars list; 2510:1990 Scholar detail; 2465:1911 Prophet; 2589:1772 Queen; 2597:2552 Books
- Figma: Every one of the five frames carries ROUNDED_RECTANGLE 'Vector Smart Object' 392x549 @1,0, IMAGE e2364e38, blend OVERLAY (2102:2976, 2510:1991, 2465:1912, 2589:1773, 2597:2553) and ONE 'Shape 2 copy' 96.42x93.82 @84.2,-8.9, IMAGE 9f0e23be, OVERLAY (2102:3065, 2510:2102, 2465:2079, 2589:1861, 2597:2674). Both visible (no visible:false, opacity 1). The corner motif is visible top-left in every reference export (docs/audit/2026-09-09/figma-reference/09,18,19,20,21-*.png).
- App: None of the five route files mounts <HeaderArt>: app/(tabs)/sections/scholar.tsx:37-38, scholar/[id].tsx:96-98, prophet.tsx:39-40, queen.tsx:39-40, books.tsx:39-40 go straight from SafeAreaView to InlineHeader. iOS + Android captures (09/18/19/20/21) show a bare #F8F2ED ground with no corner ornament. The component already exists and is mounted with corners="single" on app/(tabs)/sections/dawah.tsx:33 (same pushed-sub-screen placement, top -9).
- Fix: In each of the five screens add `import { HeaderArt } from '@/components/khazain/patterns';` and render `<HeaderArt corners="single" />` as the FIRST child of the SafeAreaView (exactly as dawah.tsx:33) so it sits under the header/search/list. Extend the HeaderArt screen list in __tests__/figmaIcons.test.ts (~line 220-235) with the five paths.
- Files: app/(tabs)/sections/scholar.tsx, app/(tabs)/sections/scholar/[id].tsx, app/(tabs)/sections/prophet.tsx, app/(tabs)/sections/queen.tsx, app/(tabs)/sections/books.tsx, __tests__/figmaIcons.test.ts
- Blast radius: Only these five screens. HeaderArt already handles tablets (right-anchored 393pt tile via headerArtGeometry); scholar/[id] split pane uses the default inset, which is correct for its 16pt gutter. 320-480dp phones: tile stretches left:0/right:0 as on Dawah, no layout effect (absolute, pointerEvents none). Same omission likely on reciter/radio/audiobooks/exclusive (other groups).

### SECTIONS-06 (medium, decoration) — Header art: geometric tile plus one corner motif
- Frame: 2031:6193 / 2102:3187 reciter, 2207:5270 reciter surah list
- Figma: Visible OVERLAY 'Vector Smart Object' 392x549 at the top (2031:6194, 2102:3188, 2207:5271) and one 'Shape 2 copy' 96x94 at (84.16, -8.87): 2031:6272, 2102:3254, 2207:5428. All visible:true, opacity 1. The Qiraat frame 2457:954 has neither.
- App: app/(tabs)/sections/reciter.tsx and reciter/[id].tsx never mount HeaderArt. The 2026-10-22 audit added it only to sections/index.tsx. iOS captures 08/10/13 show a flat #F8F2ED ground with no tile and no corner (normalised crop audit/tmp/rec-top.png, against the Sections root, which has both).
- Fix: Mount <HeaderArt corners="single" /> as the first child of the SafeAreaView in reciter.tsx and reciter/[id].tsx, as the More sub-screens do. Extend the HeaderArt screen list in __tests__/figmaIcons.test.ts.
- Files: app/(tabs)/sections/reciter.tsx, app/(tabs)/sections/reciter/[id].tsx, __tests__/figmaIcons.test.ts
- Blast radius: Those two screens. HeaderArt already handles tablet anchoring. Other pushed Sections sub-screens (scholar, prophet, books, radio, queen, audiobooks, exclusive, mushaf index) probably have the same gap; they belong to other groups, so check them.


## T06 — Tab bar: active icon gold, spacing, radius, indicator

### GLOBAL-05 (high, colour) — Tab bar: active (bulk) icon colour
- Frame: 2031:5675 Sections / 2102:2711 More / 2001:940 Home / 2031:4659 Library
- Figma: The Active?=Yes variants 2001:18540 (Sections), 2001:17461 (Home), 2001:18356 (Library) and 2001:18575 (More) override every path of the bulk icon (e.g. 2001:10766-10769) to #C1A584 gold. The bulk masters keep their 0.4 opacity on the secondary paths. Reference export pixel: the active circle is #C1A584 and the 40% square is #6E7A7F over the pill.
- App: components/khazain/primitives/CustomTabBar.tsx:129-133 tints the active icon with TAB_BAR.activeInk, which is KhazainColors.navLabel #F1E7DD (constants/layout.ts:233). The iOS capture shows a cream active glyph with bluish 40% squares and no gold anywhere in the icon (pixel rows at y=2400/3 show only #375D7B pill and cream).
- Fix: Add `activeIcon: KhazainColors.navPill /* #C1A584 */` to TAB_BAR and pass it as the icon colour when active. The label stays #F1E7DD (2001:18542 fill #F1E7DD).
- Files: components/khazain/primitives/CustomTabBar.tsx, constants/layout.ts
- Blast radius: Tab bar on all four tab roots, phones and tablets. No layout change.

### GLOBAL-06 (medium, colour) — Tab bar: inactive icon and label colour
- Frame: 2031:5675 Sections (all tab frames)
- Figma: The Active?=No variants (2001:18572, 2001:18537, 2001:18353, 2001:17458) override the outline icon strokes and fills to #F1E7DD at full opacity. The labels (2001:18574 etc.) are #F1E7DD with no layer opacity. Reference export pixel on the inactive icon is #F1E7DD.
- App: constants/layout.ts:234 sets `inactiveInk: withAlpha(navLabel, 0.85)`, used for both icon and label (CustomTabBar.tsx:131, :203). The iOS capture's inactive icon peaks at #D1D0CE where Figma has #F1E7DD.
- Fix: Set inactiveInk to KhazainColors.navLabel (1.0). The active state is carried by the pill, the indicator and the gold icon, not by dimming.
- Files: constants/layout.ts
- Blast radius: Tab bar only.

### GLOBAL-07 (medium, spacing) — Tab bar: horizontal item positions
- Frame: 2031:5675 / 2001:940 / 2031:4659 / 2102:2711
- Figma: Row instance 2001:17496 is HORIZONTAL auto-layout with padding 16, inactive items 42 wide (2001:18572 etc.) and the active item 66/67 wide (padding 12/4/12/4). The items are spread by space-between, so the positions shift with whichever tab is active. Measured label centres on the reference exports (pt): Sections active 35.5 / 146.8 / 257.4 / 355.9; Home active 35.5 / 135.1 / 234.1 / 343.8; Library active 35.5 / 135.1 / 245.8 / 355.9; More active 47.7 / 158.4 / 257.4 / 355.9.
- App: CustomTabBar.tsx:159-187 uses bar paddingHorizontal 10 and four fixed `flex:1, maxWidth:67` slots with space-between, so the items sit at 43.5 / 145.5 / 247.5 / 349.5 on every tab (iOS capture: 43.3 / 145.0 / 247.3 / 349.2). Deltas reach 7.8pt on More, 9.9pt on Sections and 13.2pt on Library in the Home frame, and 10pt on Library in the Sections frame.
- Fix: Mirror the auto-layout. Set bar/row paddingHorizontal 16 and justifyContent 'space-between'. Drop flex:1/maxWidth on tabWrap and size items to content: inactive item `minWidth: 42, paddingHorizontal: 0`, active item `paddingHorizontal: 12` (giving about 66-67). Keep tabItemStyle/tabRowColumn for tablets.
- Files: components/khazain/primitives/CustomTabBar.tsx, constants/layout.ts, constants/responsive.ts
- Blast radius: Tab bar on phones. At 320dp the free space is 320-32-(67+3x~44)=~89, so gaps of about 30 are fine. Bold labels (GLOBAL-01) are up to 44.4pt ('الرئيسية'), so use minWidth rather than a fixed 42. Tablets go through tabRowColumn/tabItemStyle; re-check that the active pill does not jump the row on tablet widths.

### GLOBAL-08 (low, radius) — Tab bar: top corner radius
- Frame: 2031:5675 (navigation instance 2031:5778, all tab frames)
- Figma: The outer SYMBOL 2001:17494 has radii 32/32, but the controls row instance 2001:17496 at y=0 paints the same #184B76 with radii 24/24. frameMaskDisabled=true on both, so nothing is clipped and the visible corner is the 24 one. Measured on the reference export, the left edge inset from the bar top is 11.2 / 8.1 / 6.1 / 4.1 / 3.0 / 2.0 / 1.0 / 0 pt at dy ≈ 2 / 4 / 6 / 9 / 11 / 13 / 15 / 17, which fits r≈22-24.
- App: CustomTabBar.tsx:161-162 sets borderTopLeft/RightRadius 32. The iOS capture's insets of 18.3 / 9.7 / 5.0 / 2.0 / 0.3 at dy 3 / 9 / 15 / 21 / 27 fit r=32.
- Fix: Set borderTopLeftRadius/borderTopRightRadius to 24, ideally as a TAB_BAR.cornerRadius token.
- Files: components/khazain/primitives/CustomTabBar.tsx, constants/layout.ts
- Blast radius: Tab bar only, on phones and tablets.

### GLOBAL-09 (low, spacing) — Tab bar: gold active indicator position
- Frame: 2031:5675 (Active?=Yes 2001:18540)
- Figma: VECTOR 2007:588 'Rectangle 3 copy 4' is 40x4, r8, #C1A584 at y=-2 relative to the pill, so it straddles the bar's top edge with 2pt above and 2pt inside. Reference export: the indicator spans 777-781 px against the bar top at 778.5 px.
- App: CustomTabBar.tsx:192-199 uses `top: 0` inside the item, so the indicator sits fully inside the bar. iOS capture: indicator 2307-2319 px, starting at the bar top (2307).
- Fix: Set `top: -2` on the indicator. The item and bar must not clip: overflow stays visible, which is the RN default.
- Files: components/khazain/primitives/CustomTabBar.tsx
- Blast radius: Tab bar only. Check the MiniPlayer wrap above it (8pt margin) for overlap; 2pt is clear.


## T07 — Icons: regenerate and use the file's glyphs

### HOME-02 (high, icon) — Quick chip badge — «حصريات خزائن الرحمن»
- Frame: 2001:940 Home
- Figma: Badge frame 2093:1760 (24.94x24): navy disc 2093:1761 (#184B75) + raster seal 2093:1762 «حصرى» (image 9c4325bb…, a white circular «خزائن الرحمن» stamp, 21.6x24.6) + raster 2093:1763 (image 9beec0fa…, navy word «حصري», 10.8x5.4) + navy hairline ring 2093:1764. Images extracted from docs/KHAZAYIN.fig and viewed.
- App: app/(tabs)/index.tsx:315,320-329 StarGlyph — a gold (#D7B995) five-point star. Visible in ios-home-2-end.png (right chip).
- Fix: Replace StarGlyph with the seal: render 9c4325bb at 21.6x24.6 over the navy disc and 9beec0fa (حصري) at 10.8x5.4 offset (7.8,9.65) inside the 25x24 badge. The repo already carries a seal overlay for SectionExclusive (assets/figma/seal-khazain.png, see icons.manifest SectionExclusive) — reuse or extract from the .fig.
- Files: app/(tabs)/index.tsx, components/khazain/home/QuickChip.tsx
- Blast radius: Home quick chips only.

### HOME-03 (high, icon) — Quick chip badge — «كتب صوتية» glyph
- Frame: 2001:940 Home
- Figma: Vector 2093:1770 (12.38x13.2, white #FFFFFF at (6.36,5.4) in the badge): a closed book with a speaker and sound waves on its cover. Path decoded with scripts/figma/vector.js and rendered.
- App: app/(tabs)/index.tsx:313,345-356 HeadphonesGlyph — a stroked headphones outline (14x14).
- Fix: Add 2093:1770 (and 2093:1777) to scripts/figma/icons.manifest.json, regenerate figmaIcons.ts, and render via FigmaIcon at the design size (12.38x13.2) inside the disc.
- Files: app/(tabs)/index.tsx, scripts/figma/icons.manifest.json, components/khazain/icons/generated/figmaIcons.ts
- Blast radius: Home quick chips only (adding generated icons is additive; figmaIcons test may need the new names).

### HOME-04 (low, icon) — Quick chip badge — «برامج إذاعية» glyph
- Frame: 2001:940 Home
- Figma: Vector 2093:1777 (9.16x14.4, white): studio microphone — capsule, U-shaped holder, stem AND a horizontal base foot. Decoded and rendered.
- App: app/(tabs)/index.tsx:314,331-343 MicGlyph (10x14): capsule + arc + short stem, no base; stroke-built rather than the design's filled outline.
- Fix: Use the generated 2093:1777 path (same manifest change as HOME-03).
- Files: app/(tabs)/index.tsx, scripts/figma/icons.manifest.json
- Blast radius: Home quick chips only.

### HOME-13 (medium, icon) — «المزيد» pill glyph (both heroes)
- Frame: 2001:940 Home
- Figma: 2093:1660 / 2031:707 / 2812:1403 are instances of vuesax/outline/arrow-left-stick (8x8, #FDF9F2): a stemmed arrow «←». Export 05 shows «المزيد ←».
- App: components/khazain/home/SmallMoreButton.tsx:20-28 draws a bare chevron «<» path. iOS/Android captures show «المزيد <».
- Fix: Replace the inline Svg with <FigmaIcon name="ArrowLeftStick" size={8} color="#FDF9F2" /> (already generated, node 49:131). Update the stale header comment (design_source port).
- Files: components/khazain/home/SmallMoreButton.tsx
- Blast radius: HeroQuran, HeroProphet (and the rebuilt QueenCard). No other users.

### HOME-18 (medium, icon) — Header bell glyph
- Frame: 2001:940 Home
- Figma: Frame 3 2001:16819 (32x32, r16, #ECDED0, padding 4) holds instance 2001:16791 vuesax/bulk/notification-bing at 24x24: bell body #184B76 @40%, a short vertical navy stroke inside the bell, and a navy clapper. Rendered via vector.js collectPaths.
- App: components/khazain/home/HomeHeader.tsx:60-80 hand-drawn BellGlyph at 20x20: body @40% + a navy dot above the bell + stroked clapper arc. Chip size and fill match.
- Fix: Add the notification-bing master to icons.manifest.json, regenerate, and render <FigmaIcon name="Notification" size={24} color={KhazainColors.navy} />.
- Files: components/khazain/home/HomeHeader.tsx, scripts/figma/icons.manifest.json, components/khazain/icons/generated/figmaIcons.ts
- Blast radius: Home header only.

### MEDIA-01 (high, icon) — Month row badge glyph (DIV-58 / `im`)
- Frame: 2120:942 Dawah month list
- Figma: DIV-58 2606:3777 (40x40 disc #D7B995@16%) holding `im` 2606:3778 (25x20): a rounded picture-frame with mountains and a crescent moon inside it, #A88051 filled vectors 2606:3779/2606:3780. Ported correctly as FIGMA_ICONS.BadgeMoonMountain (node 2606:3777) in components/khazain/icons/generated/figmaIcons.ts:503. Visible in figma-reference/11-2120-942.png (framed-image glyph).
- App: app/(tabs)/sections/dawah.tsx:1,67 imports `MoonMountainBadge` from '@/components/khazain', which resolves to the LEGACY hand-drawn components/khazain/primitives/MoonMountainBadge.tsx (re-exported at primitives/index.ts:19): an unframed monoline mountain outline + stroked circle in gold500 #A67C3F. The Figma-generated `MoonMountainBadge` in primitives/LectureBadges.tsx:31 is shadowed and never rendered. iOS + Android captures 11-2120-942 show open mountains with a sun, no frame, outline-only.
- Fix: In components/khazain/primitives/index.ts replace line 19 `export { MoonMountainBadge } from './MoonMountainBadge';` with `MoonMountainBadge` added to the `./LectureBadges` export block (lines 23-31). Leave or delete the legacy MoonMountainBadge.tsx (no other importer). dawah.tsx needs no change (size 40 already).
- Files: components/khazain/primitives/index.ts, components/khazain/primitives/MoonMountainBadge.tsx
- Blast radius: Only app/(tabs)/sections/dawah.tsx uses MoonMountainBadge (grep). No width risk: fixed 40pt disc.

### MEDIA-10 (medium, icon) — حصريات badge seal: band lettering hidden, seal undersized
- Frame: 2869:2306 Exclusive
- Figma: DIV-58 2869:2374 → Frame 5 2869:2449 (30x30 @5,5): paint order = Vector 2869:2450 (#A88051 disc 29.1x28.55), then raster `حصرى` 2869:2451 (27.39x30 @0,0, STRETCH, paint m00=1.0416 → image ≈26.3x30), then ON TOP the letterform group 2869:2452 (8.77x5.69 @11.3,12.3, #A88051 vectors) which writes the word on the white band.
- App: components/khazain/primitives/LectureBadges.tsx:41-55 SparkleBadge draws FigmaIcon 'BadgeExclusive' (disc + letterform paths) FIRST and the seal PNG AFTER, so the white band of the raster covers the letterforms; zoomed iOS capture 24 shows a blank white band. Seal box is size*0.75*(42/46)=27.4 square with contentFit 'contain' → ≈23.2x27.4 centred at (20,20) vs Figma ≈26.3x30 with left edge at x=5 (centre ≈18.2,20).
- Fix: Split the generated icon: keep disc+ring as 'BadgeExclusive' and generate the 2869:2452 letterforms as a separate 'BadgeExclusiveLetters' entry (scripts/figma/icons.manifest.json), render it absolutely after the <Image>. Size the image as an absolute box `{ left: size*5/40, top: size*5/40, width: size*26.3/40, height: size*30/40 }` with contentFit 'fill'.
- Files: components/khazain/primitives/LectureBadges.tsx, scripts/figma/icons.manifest.json, components/khazain/icons/generated/figmaIcons.ts
- Blast radius: SparkleBadge is used only by exclusive.tsx. If Home's حصريات carousel badge is built the same way, check it too.

### MORE-04 (high, icon) — Archive row glyph (الأرشيف)
- Frame: 2102:2711 More root
- Figma: INSTANCE 2558:1325 vuesax/archive-book (symbol 2001:4364, outline set) at 20x20. Override on 2001:4367 (the outline ring vector) sets fillPaints:[] and a navy stroke, and 4368/4369/4370 keep a navy fill. The reference export (25-2102-2711.png, row 6) renders a THIN outline book with an outlined bookmark tab and two thin lines at the bottom right.
- App: components/khazain/icons/generated/figmaIcons.ts:365-378 (MoreArchive) draws the ring from strokeGeometry, roughly 2 units wide on the 20 grid, so the glyph renders as a solid navy rounded block with the bookmark knocked out. The long bottom line (path 6) is swallowed by the thick border. iOS capture row 6 chip (x 312-360pt, y 588-636pt) and the Android capture show the heavy block. Rendered side by side with the reference: a different-looking icon.
- Fix: In scripts/figma/extract-icons.js, for an override that clears the fill of a pre-outlined vuesax 'outline' vector and sets a stroke, emit the master vector's fillGeometry (the 1.5/24 ring, 1.25 on 20) in the stroke colour, not its strokeGeometry. Equivalently, special-case MoreArchive to use 2001:4367 fillGeometry. Regenerate, then compare with the reference crop. A scan of every manifest node found this pattern ONLY on MoreArchive.
- Files: scripts/figma/extract-icons.js, components/khazain/icons/generated/figmaIcons.ts, __tests__/figmaIcons.test.ts
- Blast radius: Only MoreArchive carries this override (manifest-wide scan). The figmaIcons --check test changes only for that entry.

### MORE-07 (medium, icon) — WhatsApp row glyph (قنوات الواتساب)
- Frame: 2102:2711 More root
- Figma: DIV-52 (48 chip) holds INSTANCE 2548:1411 'Yu' at 16x16: a 1pt #184B76 ring (fill #9F9178 hidden) around the glyph 2548:1405, scaled 16/40 = 0.4 from the 40pt master, so the glyph is about 7.2pt. Reference row 4 shows a small ring with a tiny glyph.
- App: app/(tabs)/more/index.tsx:147 renders MoreWhatsapp at MORE_GLYPH=20 with no ring. The glyph is about 2.8x the file's size and the ring is missing (iOS and Android captures, row 4). The 2026-09-12 QA §9 calls dropping the ring deliberate ('the app's squircle chip replaces it'), but that reasoning is wrong: the file has BOTH the 48pt squircle (DIV-52) and the 16pt ring inside it.
- Fix: In RowGlyph, for 'whatsapp' render a 16x16 View with borderRadius 8, borderWidth 1, borderColor navy800, centred, containing <FigmaIcon name='MoreWhatsapp' size={7.2}/>. Alternatively extract the whole Yu instance (ring and glyph) as one icon at 16.
- Files: app/(tabs)/more/index.tsx, docs/plans/2026-09-12-more-screen-qa.md (§9 note)
- Blast radius: More root only. Contact has the same instance at 28pt (MORE-08).

### MORE-08 (high, icon) — إرسال رسالة (WhatsApp) row chip glyph
- Frame: 2106:2598 Contact us
- Figma: DIV-52 2548:1633 (48 chip) holds INSTANCE 2548:1634 'Yu' at 28x28: a 1.75pt #184B76 ring and glyph 2548:1405 scaled 0.7, so about 12.6pt. Reference 26-2106-2598.png shows the ringed WhatsApp mark.
- App: app/(tabs)/more/contact.tsx:194-210 WhatsappGlyph is a HAND-DRAWN 20pt path with no ring. Its comment repeats the claim that 'Yu ... has nothing inside it ... unfinished placeholder', which docs/plans/2026-09-12-more-screen-qa.md §5.1 withdrew: the glyph exists and is extracted as MoreWhatsapp. Visible in both captures as a filled navy blob with no ring.
- Fix: Replace WhatsappGlyph with a 28x28 View (borderRadius 14, borderWidth 1.75, borderColor navy800, centred) holding <FigmaIcon name='MoreWhatsapp' size={12.6} color={navy800}/>. Delete the stale comment and the react-native-svg import if it is no longer used.
- Files: app/(tabs)/more/contact.tsx
- Blast radius: Contact only.

### MORE-12 (medium, icon) — كتب صوتية card glyph: missing side ticks
- Frame: 2558:1334 Archive
- Figma: DIV-58 2558:1429 holds quran-03 (2558:1430, 38x38 at 13,13) PLUS two sibling vectors 2558:1435 and 2558:1436: 1x5 strokes, #A88051 1.29pt, ROUND caps, at disc-local x=50 and x=12, y=30..35 (the headphone ear marks that tell the audiobook mark from a plain book). The Sections card (2365:1611 and 2365:1612) has the same pair.
- App: app/(tabs)/more/archive.tsx:30 uses HeadphonesSectionIcon = figmaIcon('SectionAudiobooks'), generated from node 2365:1606 only (figmaIcons.ts:264-267, 38x38). The two sibling ticks are not part of that node, so the iOS/Android capture shows a plain book outline.
- Fix: Extract SectionAudiobooks from the whole DIV-58 disc contents (quran-03 plus the two tick vectors) on a 64x64 artboard and draw it at 64. Or wrap the existing 38pt mark and add the two ticks: 1.29pt round-capped vertical strokes, 5 long, at disc-local x 12.5 and 50.5, y 30 to 35, in #A88051.
- Files: scripts/figma/icons.manifest.json, scripts/figma/extract-icons.js, components/khazain/icons/generated/figmaIcons.ts, components/khazain/icons/sections.tsx
- Blast radius: Sections root كتب صوتية card (2031:5675) uses the same icon and has the same omission. Check the Home audiobook card if it reuses SectionAudiobooks.

### SECTIONS-04 (medium, icon) — Audiobooks section mark: the two sound-tick strokes either side of the book
- Frame: 2031:5675 Sections root, card 6 'كتب صوتية'
- Figma: DIV-58 2365:1605 contains quran-03 (2365:1606, 38x38 at disc offset 13,13) plus two sibling VECTORs: 2365:1612 (1x5 at disc x=12, y=30) and 2365:1611 (1x5 at x=50, y=30, mirrored m00 -1). Both are visible, stroked #A88051 at 1.29 with round caps. The reference export (07-2031-5675.png, card 6) shows the tick marks either side of the book. Crop: audit/tmp/sec-audio-icon.png.
- App: icons.manifest.json maps SectionAudiobooks to node 2365:1606 (quran-03 only), so the generator never reaches the two siblings. The generated icon is 38x38 with 3 paths. components/khazain/icons/sections.tsx:32. Scrolled iOS capture cap/scrolled/ios-sections-end.png: a bare book with no ticks.
- Fix: Read the tick paths from the file. Either (a) make the manifest entry able to take a parent node while skipping the parent's own fill: root 2365:1605, skip DIV-58's disc fill, crop to the union of children (about 40x38); or (b) add a second manifest entry for the two VECTORs and render it absolutely positioned by HeadphonesSectionIcon in a 40-wide box. Regenerate figmaIcons.ts and confirm --check passes.
- Files: scripts/figma/icons.manifest.json, scripts/figma/extract-icons.js, components/khazain/icons/generated/figmaIcons.ts, components/khazain/icons/sections.tsx
- Blast radius: SECTION_ICONS.headphones only: the Sections root card and the tablet SectionTile.

### SECTIONS-20 (low, image) — حصرى seal raster fit
- Frame: 2031:5675 Sections root, card 7 'حصريات خزائن الرحمن'
- Figma: ROUNDED_RECTANGLE 2355:1480, 42x47, IMAGE paint 9c4325bb… with imageScaleMode STRETCH (paint transform m00 1.04). The raster fills the 42x47 box.
- App: components/khazain/icons/sections.tsx:58 uses contentFit="contain". The 139x164 source then fits to 39.8x47 and is centred, about 2pt narrower than the file and offset 1.1pt. The asset itself is byte-identical to the file's image (sha1 9c4325bb…).
- Fix: contentFit="fill".
- Files: components/khazain/icons/sections.tsx
- Blast radius: SparkleSectionIcon only (Sections root card and tablet tile).


## T08 — Search pill and first-content offsets on every screen

### GLOBAL-14 (medium, spacing) — Gap between the SearchPill and the first card
- Frame: 2031:5675 Sections
- Figma: Inputs 2031:5773 ends at y=128 inside the 136pt header 2031:5766, and the list 2031:5677 starts at y=148, a 20pt gap. Reference export: pill bottom ≈129.0, first card top 149.3.
- App: app/(tabs)/sections/index.tsx:134-137 sets `searchBlock.paddingBottom: 12`. iOS capture: pill 101.7-141.7, first card 153.7, a 12pt gap. Android: about 9.5dp.
- Fix: Set searchBlock paddingBottom to 20. Check whether Library/Home/sub-screens use the same 20 (frame header 136 = 45 + 8 + 19 + 16 + 40 + 8, then the content starts 12 lower).
- Files: app/(tabs)/sections/index.tsx
- Blast radius: Sections root (phone list). May duplicate a SECTIONS-group finding.

### SECTIONS-05 (medium, spacing) — Gap between the search pill and the first card
- Frame: 2031:5675 Sections root
- Figma: Inputs 2031:5773 spans y=88-128 in the frame. The list frame 2031:5677 starts at 148, a 20pt gap made of the Header's 8 bottom padding plus 12 to the list. The reference export agrees: about 21pt at 0.99 px/pt.
- App: app/(tabs)/sections/index.tsx:134-137: searchBlock paddingBottom 12. Measured iOS: search 100.3-141.5, card 153.7, gap 12.2. Android: card at 148.2, search ends at about 136, gap 12.
- Fix: index.tsx searchBlock: paddingBottom: 20.
- Files: app/(tabs)/sections/index.tsx
- Blast radius: Sections root only, including the tablet grid branch (same container). It pushes every card 8pt lower. At 320-480 widths the content is a ScrollView, so nothing clips.

### SECTIONS-10 (medium, spacing) — Search pill vertical position under the inline header
- Frame: 2031:6193 / 2207:5270
- Figma: Header 2031:6265 has padding 8 above and itemSpacing 16, with a 20pt title row: the search pill sits 44 below the status bar (y=89 in the frame).
- App: InlineHeader is a 44pt row (the 44pt minimum touch target, documented in InlineHeader.tsx:78-84), and reciter.tsx:135 / reciter/[id].tsx:113 then add searchBlock paddingTop 4. The search pill lands 48 below the safe-area top, 4pt low. iOS: safe top 59, search top 107. The title glyph sits about 5pt further down than in the file for the same reason.
- Fix: searchBlock paddingTop: 0 in both screens. The 44pt row then reproduces the file's 8+20+16.
- Files: app/(tabs)/sections/reciter.tsx, app/(tabs)/sections/reciter/[id].tsx
- Blast radius: Those two screens. Other InlineHeader screens may carry the same 4pt; they belong to other groups.

### SECTIONS-16 (low, spacing) — Spacing around the tab strip: search to tabs, and tabs to list
- Frame: 2031:6193 reciter
- Figma: Search 89-129, tabs 145-190, list 206: 16 and 16. The reference export agrees, at about 16 and 15-16.
- App: searchBlock paddingBottom 8 + SEGMENT_TABS.stripPaddingVertical 6 = 14; strip padding 6 + body paddingTop 8 = 14. iOS: search ends 147, tabs 161-206, list 220.
- Fix: reciter.tsx searchBlock paddingBottom 10 and body paddingTop 10, or stripPaddingVertical 8 if no other SegmentTabs caller relies on 6.
- Files: app/(tabs)/sections/reciter.tsx, constants/layout.ts
- Blast radius: Reciter screen. SEGMENT_TABS is also used wherever SegmentTabs is used, so grep before changing the constant.

### SECTIONS-17 (low, spacing) — Gap between the search pill and the first surah row
- Frame: 2207:5270 reciter surah list
- Figma: Search 89-129, first DIV-67 at 139: 10.
- App: reciter/[id].tsx:113-117: searchBlock paddingBottom 8 + list paddingTop 4 = 12. iOS: search ends 147, row at 159.
- Fix: list paddingTop: 2 (and stateBlock paddingTop 2).
- Files: app/(tabs)/sections/reciter/[id].tsx
- Blast radius: That screen only.

### SCHOLARS-06 (medium, spacing) — Search field (and everything below it) 4pt too low
- Frame: 2102:2975, 2465:1911, 2589:1772, 2597:2552 (and 2510:1990 relative to its name block)
- Figma: 'Header' (e.g. 2465:2072) pad top 8, title row 20, gap 16 -> 'Inputs' at y=44 below the status bar (89 abs), 40 tall; first lecture row at 96 below status bar (141 abs).
- App: InlineHeader row is 44 (MIN_TOUCH_TARGET), then searchBlock paddingTop 4 (prophet.tsx:81, queen.tsx:81, books.tsx:81, scholar.tsx:83, scholar/[id].tsx:205). iOS measured (top inset 59): search 48.0-88.0 below inset (Figma 44-84); prophet first row at 100 (Figma 96). Android same offset. The 44pt header row already ends exactly where Figma's search begins.
- Fix: Set searchBlock paddingTop: 0 in the five screens (keep paddingBottom 8; list paddingTop 4 then lands rows at 96 on prophet/queen/books). Better: hoist a shared `PAGE_CHROME.searchGapAboveTop = 0` so every InlineHeader+SearchPill screen agrees.
- Files: app/(tabs)/sections/prophet.tsx, app/(tabs)/sections/queen.tsx, app/(tabs)/sections/books.tsx, app/(tabs)/sections/scholar.tsx, app/(tabs)/sections/scholar/[id].tsx
- Blast radius: Local to each screen. Same +4 pattern likely on reciter/radio/audiobooks/exclusive/dawah (other groups). No touch-target impact (search keeps hitSlop 2 -> 44).

### SCHOLARS-07 (medium, spacing) — Scholar list + letter rail start 10pt / 8pt too low
- Frame: 2102:2975 Scholars list
- Figma: List frame 2869:2087 @y139 (94 below status bar), rail 2207:4858 @y141 (96). Search ends at 84 -> 10pt to the first card, 12pt to the rail.
- App: scholar.tsx:83 searchBlock paddingBottom 8 + scholar.tsx:89 body paddingTop 8 (+ the 4 of SCHOLARS-06). iOS: search bottom 147.0, card 1 top 163.0 (16pt gap; 104 below inset vs 94), first rail chip top ~163.3 (104 vs 96). Android identical (search bottom 141.3dp, card 155.8dp).
- Fix: With SCHOLARS-06 applied: scholar.tsx body paddingTop 8 -> 2 (cards at 84+8+2 = 94) and styles.rail top 8 -> 4 (rail at 96).
- Files: app/(tabs)/sections/scholar.tsx
- Blast radius: Scholar list only (RailedLectureList for audiobooks/exclusive has its own constants - check 2869:2088 separately).

### MEDIA-12 (medium, spacing) — Gap between search field and first row / rail
- Frame: 2869:2088 Audiobooks, 2869:2306 Exclusive
- Figma: Search `Inputs` 2869:2200 bottom at y=129 (45+8+20+16+40); first DIV-107 at y=139 (+10); rail frame 2869:2090 at y=141 (+12). Same in 2869:2306 (search bottom 3801-3672=129, rows 139, rail 141).
- App: RailedLectureList.tsx:85 searchBlock paddingBottom 8 + :91 body paddingTop 8 → rows 16 below the search; :100 rail top 8 (absolute, from body top) → rail also +16. iOS capture 23: search 107..147, first row top 163, first rail chip top 163.
- Fix: RailedLectureList.tsx: body `paddingTop: 2` (rows at +10) and rail `top: 4` (rail at +12).
- Files: components/khazain/sections/RailedLectureList.tsx
- Blast radius: Audiobooks + Exclusive only. No width dependence.

### MEDIA-13 (low, spacing) — Search field vertical position under the header
- Frame: 2606:3830 Radio, 2869:2088, 2869:2306
- Figma: Header 2606:3912: padding-top 8, title row 20, itemSpacing 16 → `Inputs` top = 44 below the status bar.
- App: InlineHeader is 44 (MIN_TOUCH_TARGET, documented) and radio.tsx:83 / RailedLectureList.tsx:85 add searchBlock paddingTop 4 → search top 48 below the safe area (iOS capture: 107 = 59+48). 4pt lower than the file, and everything below inherits it.
- Fix: searchBlock `paddingTop: 0` in radio.tsx and RailedLectureList.tsx (the 44pt header already ends exactly where the file's search begins).
- Files: app/(tabs)/sections/radio.tsx, components/khazain/sections/RailedLectureList.tsx
- Blast radius: Same searchBlock pattern likely exists on other InlineHeader+SearchPill screens (prophet, queen, books, scholars) — align them together.

### MUSHAF-13 (medium, spacing) — Gap search field → first row
- Frame: 2207:17898 Mushaf surah index
- Figma: Inputs 2207:20477 ends at y 129 (frame-relative). Header 2207:20473 has bottom padding 8 (ends 137). List 2207:20548 starts at y 139, a 10pt gap.
- App: searchBlock paddingBottom 8 plus surahList paddingTop 8 gives 16pt. Measured iOS: search 107–147, row 1 163; Android: 100.2–140.2, row 155.8 (mushaf.tsx:622, 625).
- Fix: Set surahList paddingTop to 2 (keep searchBlock paddingBottom 8). The AsyncContent skeleton inherits the same spacing.
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Mushaf index only.

### MUSHAF-14 (low, spacing) — Header title → search field offset
- Frame: 2207:17898 Mushaf surah index
- Figma: Header 2207:20473: padding top 8, title row 20, itemSpacing 16. The search top is 44pt below the status bar (y 89 with a 45 status bar).
- App: InlineHeader is 44 tall (deliberate, documented) plus searchBlock paddingTop 4, so the search top is 48pt below the safe-area top (iOS 107 with a 59 inset; mushaf.tsx:622). The documented rule is that each screen absorbs the extra 8 of the 44pt header. Here it adds 4.
- Fix: searchBlock paddingTop 4 → 0.
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Mushaf index only.

### LIBRARY-13 (medium, spacing) — Gap between the search field and the stat cards
- Frame: 2031:4659 Library
- Figma: Search Inputs 2031:4858 ends at y=128. The header bottom pad is 8, and the first margin-wrap 2095:1602 adds 24 above DIV-44, so the stat cards start at y=160: a 32pt gap.
- App: searchBlock paddingBottom 8 (library.tsx:715), and statsRow has no top margin (748-753). Measured on the iPhone 16 capture: search bottom border 148.7pt, card top border 157.7pt, a 9pt gap. That is 23pt too tight, and visible in the side-by-side.
- Fix: styles.searchBlock paddingBottom: 32 (8 + 24). Do not add marginTop to statsRow, because statsRow is reused by the progressStats row.
- Files: app/(tabs)/library.tsx
- Blast radius: Library only, and only when the dbError banner is absent (with the banner, keep its own margin).

### LIBRARY-25 (low, spacing) — Page title → search spacing
- Frame: 2031:4659 Library
- Figma: Header 2031:4837: pad top 8, title 2031:4843 TheMixArab Regular 18 in a 19pt box, gap 16, then the search (title top 53 → search top 88 = 35).
- App: headerBlock paddingTop 8 / paddingBottom 16 with h1 bodyLarge lineHeight 28 (library.tsx:704-714): title box top → search top = 44 (+9). Glyph-to-field measured on iOS is ~4pt more air than Figma. The 28 line height is the deliberate MIN_LINE_HEIGHT_RATIO floor.
- Fix: Keep lineHeight 28 (anti-clipping), but reduce headerBlock paddingBottom to 12 so the glyph-to-field distance matches.
- Files: app/(tabs)/library.tsx
- Blast radius: Library only. The More/Sections roots use the same header pattern, so check them for consistency.

### SECTIONS-21 (low, line-height) — Page title 'الأقسام' line box
- Frame: 2031:5675 Sections root
- Figma: 2031:5772 TheMixArab Regular 18, lineHeight 100% (box 19 tall at y=53), Header padding 8, then 16 to the search pill.
- App: index.tsx:124-133: headerBlock paddingTop 8, h1 bodyLarge lineHeight 28, paddingBottom 8. The title box is 28 tall, so the glyph centre sits about 4.5pt lower than in the file. The search pill lands 1pt lower (44 against 43).
- Fix: Optional: paddingTop 4 and paddingBottom 7, which keeps the 28 line box (diacritic clearance) and centres the glyph where the file has it. Or leave it, since MIN_LINE_HEIGHT_RATIO is a documented floor.
- Files: app/(tabs)/sections/index.tsx
- Blast radius: Sections root only.


## T09 — List rows: ReciterRow, LectureCard, RibbonCard metrics

### SECTIONS-03 (high, colour) — Row disclosure wedge (mirrored arrow-right) colour
- Frame: 2031:6193 / 2102:3187 reciter rows, 2457:954 qiraat rows
- Figma: 2430:1010 (reciter row 1) and 2457:1586 (qiraa row 1) override both vectors to #281E13 and are mirrored (m00 -1). Size 20. Position: 8 from the row's left edge.
- App: components/khazain/primitives/ReciterRow.tsx:41 sets color={KhazainColors.navy800}. iOS row scan, reciter row 1: the glyph's light half is #A1B4C4 (navy at 40%) at x=32-37.7pt. Figma, by geometry, puts it at 30.8-37.2. Position and size are right; only the colour is wrong. Android shows the same navy glyph. ListRowCard's section-card wedge is correct (inkTitle, mirrored, 34.7-41.0pt against the file's 34.8-41.2).
- Fix: ReciterRow.tsx:41: color={KhazainColors.inkTitle}.
- Files: components/khazain/primitives/ReciterRow.tsx
- Blast radius: Reciter tabs (all four) and the Qiraat screen. Nothing else uses ReciterRow.

### SECTIONS-11 (medium, line-height) — Spacing between the reciter row's title and subtitle
- Frame: 2031:6193 / 2102:3187 reciter rows
- Figma: DIV-144 2430:1011: margin-wrap 28 (H3 24, TheMixArab 14/24) then P-148 20 (TheMixArab 12/20), inside 48 under 4pt padding. Reference export 08: title baseline 16.3pt and subtitle baseline 42.8pt into the row, 26.5 apart.
- App: ReciterRow.tsx:98-106: textCol gap 2, bodyCompact lineHeight 21, caption lineHeight 18. iOS row 1 (220-276): title baseline 18.5, subtitle 39.0, 20.5 apart. The two lines sit about 6pt closer than the file sets them.
- Fix: ReciterRow: textCol gap 0; title: {...textStyle('bodyCompact',...), lineHeight: 24, marginBottom: 4}; subtitle: {...textStyle('caption',...), lineHeight: 20}. Both are above MIN_LINE_HEIGHT_RATIO, so the marks still clear. The content height becomes 48, filling the 56pt row exactly.
- Files: components/khazain/primitives/ReciterRow.tsx
- Blast radius: Reciter tabs. Qiraat rows (no subtitle) stay vertically centred. A default row with the 'الافتراضي' badge grows by about 3pt.

### MEDIA-11 (medium, spacing) — Lecture row text block: title/scholar vertical spacing
- Frame: 2606:3830 Radio
- Figma: DIV-144 2606:3836 240x48: title margin-wrap 2606:3837 28 tall (H3 24, lh24) at row y 8..36, scholar P-148 2606:3840 20 tall at row y 36..56. Title box centre y=20, scholar centre y=46 (26 apart); block is 48, filling the 64 row's content box.
- App: LectureCard.tsx:142-147 textBlock gap 2 with title lh 21 (bodyCompact) + caption lh 18 → 41pt block centred in 48. iOS capture 22 row 1 (top 159.3): title baseline ≈181 (row +22), scholar baseline ≈202 (row +43) → 21 apart; Figma ≈26 → scholar line sits ~5pt high, title ~2pt high.
- Fix: In LectureCard non-compact text block use `gap: 6` (block 21+6+18=45 → title centre 19.5, scholar centre 45.5). Keep compact unchanged.
- Files: components/khazain/primitives/LectureCard.tsx
- Blast radius: All non-compact LectureCard rows (prophet 2465:1911, queen 2589:1772, books 2597:2552, radio): they share the same DIV-139/DIV-144 node, so the change should move them all toward the file; row stays 64 (59 < 64 minHeight).

### SCHOLARS-08 (medium, font-size) — Scholar name size in card
- Frame: 2102:2975 Scholars list
- Figma: Single TEXT per card (2869:2039, 2869:2057, ...) 'فضيلة الشيخ  عبد المحسن العباد', base TheMixArab Regular 14 lh 24px #281E13 with styleOverrideTable {id1: size 12, id2: size 16}; characterStyleIDs put 'فضيلة الشيخ' in id1 (12) and the name in id2 (16).
- App: RibbonCard.tsx:141 title = textStyle('bodyCompact') = 14. iOS/Android captures: name visibly smaller than Figma's.
- Fix: In RibbonCard, when `badge` is set (scholar list only), style the title with textStyle('body', { color: inkTitle }) (TheMixArab 16, lh 24). Keep bodyCompact for the ribbon variant.
- Files: components/khazain/primitives/RibbonCard.tsx
- Blast radius: Badge variant is used only by app/(tabs)/sections/scholar.tsx. Longer names (e.g. 'عبد الرزاق بن عبد المحسن البدر') still fit in 2 lines at 320dp (text width ~ 333-44-8-40-16 at 320 = ~200pt).

### SCHOLARS-09 (medium, colour) — 'فضيلة الشيخ' pretitle colour
- Frame: 2102:2975 Scholars list
- Figma: Same TEXT node as SCHOLARS-08 (e.g. 2869:2039): one fill #281E13 for the whole node; the style overrides change size only, not fill.
- App: RibbonCard.tsx:140 pretitle = caption in KhazainColors.ink500 (#5F5345). iOS ink averages #685D50 vs the name #3C3228 - visibly lighter than Figma, where both lines are the same dark brown.
- Fix: Badge variant: pretitle color KhazainColors.inkTitle. Leave ink500 for recommendation rows (RecommendationRow passes a `reason` pretitle with no badge, which has no Figma frame).
- Files: components/khazain/primitives/RibbonCard.tsx
- Blast radius: Scholar list only if gated on `badge`; do not change the no-badge pretitle used by RecommendationRow.

### SCHOLARS-10 (medium, line-height) — Scholar card text line metrics (pretitle/name vertical placement)
- Frame: 2102:2975 Scholars list
- Figma: The 118x48 text box holds two 24px lines (lh=24PIXELS) with no gap, top-aligned at the card's 8pt inset: pretitle line 8..32, name line 32..56. Ref export: pretitle ink 15.4-27.7pt, name ink 37-53pt below the card top.
- App: RibbonCard titleBlock: caption lh 18 + gap 2 + bodyCompact lh 21 = 41, centred. iOS card 1 (top 163.0): pretitle ink 13.3-24.0, name ink 23.7-45.0 -> the name sits ~11pt higher than Figma and the two lines are cramped.
- Fix: Badge variant: pretitle `{...textStyle('caption', {color: inkTitle}), lineHeight: 24}`, title textStyle('body') (lh 24), titleBlock gap 0. 8 + 48 + 8 = 64 = scholarRowMinHeight, so the card height is unchanged. Both line heights are above MIN_LINE_HEIGHT_RATIO (2.0 and 1.5).
- Files: components/khazain/primitives/RibbonCard.tsx
- Blast radius: Scholar list only (gate on badge). Two-line names grow the card past 64 as today.

### SCHOLARS-11 (medium, spacing) — Scholar card right inset (disc + text 8pt too far left)
- Frame: 2102:2975 Scholars list
- Figma: DIV-107 (2869:2000) pad 8/8/8 with DIV-108 @x16 w309 in a 333 card -> right inset 8; disc DIV-58 at card x 285..325, i.e. 8 from the card's right edge; text right edge 8 left of the disc. Ref export: disc 353-392px, card right edge ~400px.
- App: RibbonCard.tsx:110 cardWithBadge paddingHorizontal: 16. iOS: disc at 293.0-333.0pt in a card ending 349 (16pt inset; Figma disc 301-341), text right edge 284.3 (Figma 293).
- Fix: cardWithBadge: replace paddingHorizontal 16 with paddingRight: 8, paddingLeft: 16 (the card is a PHYSICAL_ROW, so right/left are physical).
- Files: components/khazain/primitives/RibbonCard.tsx
- Blast radius: Scholar list only. Gives the name 8pt more width - helps at 320dp.

### SCHOLARS-12 (medium, line-height) — Lecture row title/subtitle line spacing (subtitle ~5pt too high)
- Frame: 2465:1911 Prophet; 2589:1772 Queen; 2597:2552 Books
- Figma: DIV-139 (e.g. 2473:2575) pad 8: 'margin-wrap' 28 tall (H3-145 TheMixArab 14 lh 24px + 4 bottom pad) then P-148 TheMixArab 12 lh 20px at y28 -> title box 8..32, subtitle box 36..56 inside the 64 card. Ref export (card top 157px): title ink 13.3-26.7pt, subtitle ink 41-53pt.
- App: LectureCard.tsx:142-153: bodyCompact lh 21 + gap 2 + caption lh 18 = 41, centred. iOS (ios-before/18 row 1, top 159.0): title ink 13.3-26.0 (matches), subtitle ink 35.3-47.7 -> ~5.5pt higher than Figma. Android same.
- Fix: Non-compact branch only: title `{...textStyle('bodyCompact',{color: inkTitle}), lineHeight: 24}`, a 4pt bottom margin (or textBlock gap 4), scholar `{...textStyle('caption',{color: ink500}), lineHeight: 20}`; and because RN borders take layout space (Figma's INSIDE stroke does not), change cardBase paddingVertical 8 -> 7 for the bordered `card` variant so 1+7+48+7+1 = 64 stays exact. Optional: paddingHorizontal 7 for the same reason (disc is 9 from the outer edge today, Figma 8).
- Files: components/khazain/primitives/LectureCard.tsx
- Blast radius: prophet/queen/books/radio (radio is the same DIV-139 node, so it benefits). Must NOT apply to `compact` (RailedLectureList: audiobooks/exclusive, 56pt rows) - 48pt of text would grow those rows to 64. Rows whose title wraps to 2 lines grow by 24 instead of 21.

### SCHOLARS-13 (medium, line-height) — Ribbon-row title/subtitle line spacing
- Frame: 2510:1990 Scholar detail
- Figma: DIV-139 (2510:1993) pad 4/8/4: margin-wrap 28 (H3-145 TheMixArab 14 lh 24 + 4) then P-148 TheMixArab 12 lh 20 -> title box 4..28, subtitle box 32..52 inside the 56 row. Ref export: subtitle ink ~37-49pt below the row top.
- App: RibbonCard.tsx:138-142: gap 2, bodyCompact lh 21, caption lh 18 = 41 centred in a 1+4 inset. iOS (ios-before/19 row 1, top 224.7): title ink 9.6-24.3, subtitle ink 31.3-43.6 -> subtitle ~5.5pt high, title ~2pt low.
- Fix: Ribbon variant (no badge): title lineHeight 24 with 4pt bottom margin, meta lineHeight 20, paddingVertical 4 -> 3 (border eats 1) so 1+3+48+3+1 = 56. Update constants/recommendations.ts RECOMMENDATION_SLOT_HEIGHT derivation (it hard-codes SLOT_CHROME 2*(4+1) and TEXT_ROLES line heights) and __tests__/recommendationSlotHeight.test.ts.
- Files: components/khazain/primitives/RibbonCard.tsx, constants/recommendations.ts, __tests__/recommendationSlotHeight.test.ts
- Blast radius: RibbonCard's no-badge variant is also used by components/khazain/recommendations/RecommendationRow.tsx (Home, with a 3-line pretitle+title+meta) and SurahEndSuggestions.tsx (Mushaf end). Either gate the Figma metrics behind an explicit variant for scholar detail, or accept the change there and re-derive the Home slot height (commit b5059a1 sized it to the current metrics).

### SCHOLARS-14 (high, size) — Gold ribbon height
- Frame: 2510:1990 Scholar detail
- Figma: DIV-58 (2510:2512, 2548:1196, 2548:1186) 12x54 @x352,y1 in a 56 row (stroke on it hidden): runs from just inside the top hairline to just inside the bottom one. Ref export: ribbon 158-208px in a card 155-211px.
- App: RibbonCard.tsx:120-130 ribbon alignSelf stretch + marginVertical 1, but it stretches inside the card's paddingVertical 4 (RibbonCard.tsx:117) and 1pt border, so it is 56-2-8-2 = 44 tall. iOS ios-before/19 row 1 (224.7-280.7): ribbon #A88051 ~232-276pt, i.e. ~6pt short at each end; plainly shorter than the card in the side-by-side.
- Fix: ribbon: marginVertical: -4 (cancel the 4pt padding, so it runs from the border's inner edge: 1..55 = Figma's 54). If SCHOLARS-13 changes paddingVertical to 3, use marginVertical: -3. Alternatively position:'absolute', top:0, bottom:0, right:0, width:12 and reserve 12+8 on the right.
- Files: components/khazain/primitives/RibbonCard.tsx
- Blast radius: Also lengthens the ribbon on Home recommendation rows and the Mushaf end-of-surah suggestions (same RibbonCard variant) - consistent with the file, no height change.

### GLOBAL-15 (low, size) — Section list card height
- Frame: 2031:5675 Sections — Android
- Figma: DIV-43 2031:6073 is 361x96, cards 104 apart.
- App: android-before/07: cards 148.2-247.6dp (99.4) and the next at 256.0. Text ink sits about 2.5-5dp lower than on iOS, where the cards are exactly 96 (153.7-249.7). ListRowCard.tsx:121-126 uses minHeight 96 with paddingVertical 14, so the content (24 + 6 + 21 + 2 + 18 = 71) can overflow 68 whenever the face's line boxes do. The likely cause is the system Naskh fallback (GLOBAL-02), which has larger metrics.
- Fix: Re-measure after GLOBAL-01/02. If the card is still taller than 96, tighten the subtitle marginTop (6 to 4) so the text column totals 68, as Figma's DIV-48 does (title 24 + 4 + gap 2, subtitle 20, gap 2, count 16).
- Files: components/khazain/primitives/ListRowCard.tsx
- Blast radius: Sections, Qiraat and Archive lists on Android.


## T10 — Surah rows and badges: numerals, separators, sizes, copy

### MUSHAF-06 (high, copy) — Surah number badge numeral
- Frame: 2207:17898 Mushaf surah index
- Figma: TEXT 2365:1689 '1-82' = '١' (single digit, no leading zero), TheSansArabic Bold 12, lh 20, #A88051. The rows read ١ … ٩.
- App: Shows '٠١', '٠٢' … (data/content/quran.ts:24-33: `displayNumber: '٠١'`, rendered by SurahStar via SurahRow.tsx:65). iOS/Android crops (audit/tmp/m_ios_star.png, m_and_star.png) show '٠١'. On iOS the numeral also sits about 3pt above the star centre (lineHeight 18 with Noto Arabic ascent; SurahStar.tsx:33-37).
- Fix: Render `toArabicDigits(surah.number)` in SurahRow/ReciterSurahRow (or strip the leading zero in data). Prefer the render-side change: saved-item snapshots already persisted '٠١' (savedStore) and keep rendering otherwise. For the iOS offset, give the label `lineHeight: 20` (Figma) with `height: size`, `textAlignVertical: 'center'`, and verify on iOS, or nudge it with a platform-specific `marginTop`.
- Files: components/khazain/sections/SurahRow.tsx, components/khazain/sections/ReciterSurahRow.tsx, components/khazain/primitives/SurahStar.tsx, data/content/quran.ts
- Blast radius: Reciter surah list (2207:5270, same badge), search result SurahNumberBadge (services/search/rowProps.tsx:27), saved items, searchAll matching on displayNumber (services/search/searchAll.ts:58). Keep search matching '١' and '1'.

### MUSHAF-07 (high, copy) — Row meta separator
- Frame: 2207:17898 Mushaf surah index
- Figma: TEXT 2207:20557 'مكية • ٧ آيات'. The separator is U+2022 BULLET (fig-text.json codepoint check).
- App: data/content/quran.ts:25+ meta strings use U+00B7 MIDDLE DOT ('مكية · ٧ آيات'). Between Arabic-Indic numerals it reads as '٠'. The reader meta line was already fixed for exactly this reason (services/mushafNavigation.ts:74-76), but the index data was not. Visible in the capture: 'مكية · ٧ آيات' looks like 'مكية ٠ ٧ آيات'.
- Fix: Replace ' · ' with ' • ' in every SURAHS[].meta (114 rows), or build meta from revelationType + ayahCount with the shared helper (see MUSHAF-08) instead of storing it.
- Files: data/content/quran.ts
- Blast radius: Reciter surah rows, search results, saved snapshots (existing saved snapshots keep the old string), http adapter mapping test fixture.

### MUSHAF-15 (medium, spacing) — Row: badge → text gap
- Frame: 2207:17898 Mushaf surah index
- Figma: DIV-68 (2207:20550) horizontal itemSpacing 8, padding [8,12]. Text column DIV-72 right edge is x 305 inside the row. The title box right edge is at frame x 321.
- App: SurahRow `gap: 12` (SurahRow.tsx:81). The title ink right edge is at 315.3pt on iOS, about 4–5pt further left than Figma.
- Fix: gap 12 → 8. Check that the bookmark slot still clears the text at 320dp; the text column is flex:1 and truncates.
- Files: components/khazain/sections/SurahRow.tsx
- Blast radius: Mushaf index only (ReciterSurahRow has its own styles; verify it against 2207:5270 separately).

### MUSHAF-16 (low, line-height) — Row title/meta line heights
- Frame: 2207:17898 Mushaf surah index
- Figma: Title 2207:20555 TheMixArab Regular 14, lineHeight 24 PIXELS. Meta 2207:20557 Regular 12, lineHeight 20.
- App: Title textStyle('bodyCompact') = 14/21. Meta textStyle('caption') = 12/18 (SurahRow.tsx:88-89). The text block is 39 against 44, so title and meta sit about 2–3pt closer together. Row height is unchanged (minHeight 60).
- Fix: Pass explicit `lineHeight: 24` / `20` for these two Texts. textStyle cannot override lineHeight, so add a style after it, or add 14/24 and 12/20 role variants.
- Files: components/khazain/sections/SurahRow.tsx, constants/typography.ts
- Blast radius: Mushaf index rows; the same pattern applies to ReciterSurahRow if 2207:5270 states the same.

### SECTIONS-08 (medium, copy) — Tab label copy (diacritics)
- Frame: 2031:6193 reciter tab strip
- Figma: 2457:943 'المصحف المجوَّد' (shadda plus fatha), 2457:950 'المصحف المرتَّل' (shadda plus fatha), 2457:953 'المصحف المعلِّم' (shadda plus kasra), 2457:947 'قراءات'.
- App: data/content/quran.ts:139-142: 'المصحف المجوّد' (shadda only), 'المصحف المرتل' (no marks), 'المصحف المعلّم' (shadda only). The iOS capture shows the undecorated forms.
- Fix: RECITER_TABS labels → 'المصحف المجوَّد', 'المصحف المرتَّل', 'المصحف المعلِّم'. Check that the 10pt label is not clipped at its leading (labelSmall lineHeight 15). Keep the reciters' styleLabel strings consistent, or leave them if the subtitle stays app copy.
- Files: data/content/quran.ts
- Blast radius: Reciter tab strip, and any test that asserts the tab labels (grep RECITER_TABS in __tests__).

### SECTIONS-12 (medium, size) — Play glyph size
- Frame: 2207:5270 reciter surah list
- Figma: vuesax/bulk/play 2207:5699: a 20x20 instance, mirrored, both vectors overridden to #184B76.
- App: components/khazain/sections/ReciterSurahRow.tsx:48: <FigmaIcon name="Play" size={16} ...>. iOS row scan: glyph about 6pt wide at x=38-44, against roughly 7.5 at 20pt. Crop audit/tmp/surah-row.png shows a visibly smaller triangle. Colour and mirroring are correct.
- Fix: size={20}. The wrapper is already 20 wide.
- Files: components/khazain/sections/ReciterSurahRow.tsx
- Blast radius: Reciter surah list only.

### SECTIONS-13 (medium, font-size) — Surah badge numeral size
- Frame: 2207:5270 reciter surah list
- Figma: 2345:2014 TheSansArabic Bold 14/20 #A88051. The Mushaf index (2207:17898) states Bold 12 for the same badge, so the two frames differ.
- App: components/khazain/primitives/SurahStar.tsx:34 uses the 'label' role (12) for every caller. The 2026-09-11 QA set 12 from the Mushaf frame.
- Fix: Add `labelRole?: 'label' | 'cardTitle'` (12 or 14 Bold) to SurahStar. ReciterSurahRow passes cardTitle; SurahRow keeps label. Check a 3-digit ١١٤ still fits the 36pt star at 14 (about 21pt wide).
- Files: components/khazain/primitives/SurahStar.tsx, components/khazain/sections/ReciterSurahRow.tsx
- Blast radius: SurahStar callers: ReciterSurahRow and SurahRow (Mushaf index). Only the reciter list changes.

### SECTIONS-14 (medium, copy) — Surah badge numeral copy: leading zero
- Frame: 2207:5270 reciter surah list (also 2207:17898 Mushaf index)
- Figma: The SPAN-80 text is '١', '٢', '٤', '٥' (2345:2014 ...) on 2207:5270, and '١', '٢', '٣' on 2207:17898. Single digits, no zero padding.
- App: Badges render Surah.displayNumber, which is '٠١', '٠٢' ... (data/content/quran.ts:25+, types/content.ts:40 'two-digit'). The iOS capture shows '٠١' in the star.
- Fix: In ReciterSurahRow and SurahRow, pass the numeral derived from surah.number (Arabic-Indic, unpadded, for example via toLocaleString('ar-EG') or a small mapper) to SurahStar. Keep displayNumber as it is: search matches on it (services/search/searchAll.ts:58) and the HTTP adapter test fixes it.
- Files: components/khazain/sections/ReciterSurahRow.tsx, components/khazain/sections/SurahRow.tsx
- Blast radius: Reciter surah list and Mushaf index badges. The search-result SurahNumberBadge is separate and unchanged.

### SECTIONS-18 (low, copy) — Separator in the surah meta line
- Frame: 2207:5270 reciter surah list
- Figma: 2207:5705 'مكية • ٧ آيات' uses U+2022 BULLET. All rows match.
- App: data/content/quran.ts:25+ meta 'مكية · ٧ آيات' uses U+00B7 MIDDLE DOT, which renders smaller (crop audit/tmp/surah-row.png). The file's counts are kept where the file is wrong: it gives النساء 177; the app's 176 is correct and should stay.
- Fix: Replace ' · ' with ' • ' in SURAHS meta strings, or build meta from revelationType/ayahCount with '•'.
- Files: data/content/quran.ts
- Blast radius: Every surah meta line (Mushaf index 2207:17898 too, which also states '•'), plus search rows that show meta.

### SECTIONS-22 (low, copy) — Reciter row subtitle copy
- Frame: 2031:6193 / 2102:3187 reciter rows
- Figma: P-148 2430:1016 'التلاوة المجودة' (TheMixArab 12 #5F5345) on every row of both frames, including the Murattal frame. It looks like placeholder copy.
- App: reciter.tsx:96 subtitle={r.styleLabel}, which is 'المصحف المجوّد' / 'المصحف المرتل' (data/content/quran.ts:115+).
- Fix: Probably no change: the app's per-style label is more truthful than the file's repeated placeholder. If the client wants the file's wording, map style → 'التلاوة المجودة' / 'التلاوة المرتلة' / 'التلاوة المعلمة'.
- Files: data/content/quran.ts
- Blast radius: Reciter rows.

### MUSHAF-19 (low, other) — Left-slot rationale for the app-only bookmark (documentation)
- Frame: 2207:17898 Mushaf surah index
- Figma: The 'vuesax/bulk/play' INSTANCE in every row (2207:20551, 2365:1693, …) has opacity 0. The frame shows nothing at the physical left; the reference export confirms this.
- App: The SurahRow bookmark is an accepted app addition (2026-09-09 QA row 14). Its stated rationale is wrong: SurahRow.tsx:20-22, 2026-09-11-sections-screen-qa.md:270 and 2026-09-12-demo-readiness-qa.md:168 say 'the frame puts a play triangle at the physical left'. The frame has an invisible play instance.
- Fix: Correct the comment and docs: the left slot is empty in 2207:17898 (play instance opacity 0) and the bookmark is a pure app addition. No visual change unless product wants parity, in which case remove the bookmark from SurahRow (saving stays available elsewhere).
- Files: components/khazain/sections/SurahRow.tsx
- Blast radius: None visually. savedContent design G2 relies on this row being the surah save entry point.


## T11 — Letter rail: last letter and chip placement

### MEDIA-18 (low, copy) — Letter rail last letter
- Frame: 2869:2088, 2869:2306
- Figma: Last rail chip text 2869:2147 / 2869:2365 = 'ى' (alef maqsura, U+0649).
- App: components/khazain/primitives/LetterIndex.tsx:19 LETTERS ends with 'ي' (U+064A); visible on Android capture 23/24 (bottom of rail).
- Fix: Only if exact parity is wanted: change the last entry to 'ى'. 'ي' is arguably the correct index letter; confirm with product.
- Files: components/khazain/primitives/LetterIndex.tsx
- Blast radius: LetterIndex is shared with scholars/reciters rails (2031:6193, 2102:2975); check those frames' last letter first.

### SCHOLARS-15 (low, copy) — Last letter of the alphabet rail
- Frame: 2102:2975 Scholars list
- Figma: Rail chip 28 (TEXT under DIV-139 @y3451 abs) = 'ى ' - U+0649 ALEF MAQSURA (+ trailing space). Same glyph in 2031:6193, 2869:2088, 2869:2306 rails.
- App: components/khazain/primitives/LetterIndex.tsx:19 LETTERS ends with 'ي' (U+064A YEH, dotted). Android capture shows the dotted ي at the rail's foot.
- Fix: LetterIndex.tsx:19: replace 'ي' with 'ى' (if letter filtering is ever wired, map ى to ي-initial names). Update any test pinning LETTERS.
- Files: components/khazain/primitives/LetterIndex.tsx
- Blast radius: Every LetterIndex rail (scholars, audiobooks, exclusive). Pure glyph change.

### SCHOLARS-16 (low, spacing) — Rail chips horizontal placement inside the 20pt column
- Frame: 2102:2975 Scholars list
- Figma: Rail 2207:4858 is x357..377; its chip column DIV-97 (2207:4859) sits @x4 w16 -> chips 361..377, flush with the rail's right edge (4pt clear of the left hairline).
- App: LetterIndex.tsx:71-75 railContent alignItems 'center' -> chips centred. iOS row scan: chip #FCFAF8 359.7-375.7pt (1.3pt left of Figma); letter glyph centre 367 vs Figma 369.
- Fix: railContent: alignItems 'flex-end' (rail sits in scholar.tsx's PHYSICAL_BOX, so flex-end is the physical right) or paddingLeft 4 + alignItems 'flex-start'.
- Files: components/khazain/primitives/LetterIndex.tsx
- Blast radius: All LetterIndex rails (audiobooks/exclusive via RailedLectureList - check they also sit in a PHYSICAL_BOX).

### SECTIONS-19 (low, copy) — Last rail letter
- Frame: 2031:6193 / 2102:3187 letter rail
- Figma: The rail's 28th chip (DIV-97 child at y=1253 in 2031:6193) is 'ى ' (alef maqsura). The rest run أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و.
- App: components/khazain/primitives/LetterIndex.tsx:19 ends with 'ي'.
- Fix: Replace the final 'ي' with 'ى', unless the rail filters real data by that letter. In that case keep 'ي' and record the deviation.
- Files: components/khazain/primitives/LetterIndex.tsx
- Blast radius: Every LetterIndex rail (reciters, scholars, audiobooks, exclusive).


## T12 — Home heroes: colours, title bars, copy and vertical rhythm

### HOME-07 (high, colour) — Quran hero — subtitle colour
- Frame: 2001:940 Home
- Figma: Text 2093:1658 «اقْتَرَبَ فَثَمَّ حَيَاة مع القرآن لَمْ تَحْيَهَا بُعْد !» fill #A88051 (gold), TheMixArab Regular 9, align CENTER. Confirmed in the rendered export 05-2001-940.png (gold line under the title).
- App: components/khazain/home/HeroQuran.tsx:93-95 textStyle('caption', { color: KhazainColors.navy }) — navy. iOS 05-2001-940__home.png and Android capture both show navy.
- Fix: subtitle: textStyle('caption', { color: KhazainColors.goldAccent, textAlign: 'center' }) (goldAccent is #A88051). The 9→12pt floor stays (documented).
- Files: components/khazain/home/HeroQuran.tsx
- Blast radius: Quran hero only (phone + tablet pair).

### HOME-08 (low, other) — Quran hero — subtitle alignment
- Frame: 2001:940 Home
- Figma: 2093:1658 align CENTER in its 142pt box.
- App: HeroQuran.tsx:93-95 caption role → textAlign 'right'; at the floored 12pt it wraps to two right-aligned lines (iOS/Android captures).
- Fix: textAlign: 'center' (same edit as HOME-07).
- Files: components/khazain/home/HeroQuran.tsx
- Blast radius: Quran hero only.

### HOME-09 (high, decoration) — Quran hero — vertical navy bar beside the title
- Frame: 2001:940 Home
- Figma: Frame 2093:1655 (HORIZONTAL, itemSpacing 3.83): title 2093:1656 then «item» 2093:1657 — 2x26, fill #184B75, radius 0.96, visible; card x 242..244 (the column's trailing edge). Visible as «|» right of «القرآن حياة» in the rendered export 05-2001-940.png.
- App: HeroQuran.tsx:68-73 renders only the title with marginRight TRAILING_INSET (5.8) — the bar's space is reserved but the bar is not drawn. iOS capture: no bar.
- Fix: Wrap the title in a PHYSICAL_ROW (alignSelf flex-end, gap 3.83*scale) with a trailing View { width: 2*scale, height: 26*scale, borderRadius: 0.96*scale, backgroundColor: KhazainColors.navy } and drop the marginRight.
- Files: components/khazain/home/HeroQuran.tsx
- Blast radius: Quran hero only.

### HOME-10 (high, decoration) — Prophet hero — vertical navy bar beside the title calligraphy
- Frame: 2001:940 Home
- Figma: Frame 2007:479 (HORIZONTAL, spacing 3.83): title image 2007:480 (95x26) then «item» 2007:481 — 2x25 #184B75 r0.96 at card x 279.5..281.5. Visible in export 05-2001-940.png at the top of the Prophet card.
- App: HeroProphet.tsx:69-80 draws the title image with marginRight trailingInset 5.8; no bar. iOS capture: absent.
- Fix: Same row treatment as HOME-09 with a 2x25 bar.
- Files: components/khazain/home/HeroProphet.tsx
- Blast radius: Prophet hero only.

### HOME-11 (high, colour) — Prophet hero — body copy colour
- Frame: 2001:940 Home
- Figma: Text 2007:482 fill #5F482D (brown), TheMixArab Regular 9, lineHeight 1.5, align RIGHT.
- App: HeroProphet.tsx:104-107 textStyle('caption', { color: KhazainColors.navy }) — navy (iOS + Android captures).
- Fix: color '#5F482D' (exists as legacy Colors.textSecondary; add a Khazain token, e.g. KhazainColors.inkBrown).
- Files: components/khazain/home/HeroProphet.tsx, constants/theme.ts
- Blast radius: Prophet hero only.

### HOME-12 (low, copy) — Prophet hero — body copy line break
- Frame: 2001:940 Home
- Figma: 2007:482 text contains a hard break after «النبيِّ ﷺ » («…مِن سِيرة: النبيِّ ﷺ \nوأصحابِه العِظام…»).
- App: HeroProphet.tsx:42-43 BODY is one run with a space at that point.
- Fix: Optional: insert '\n' after «ﷺ». At the floored 12pt the line breaks differ anyway, so only do it if the client wants the design's break kept.
- Files: components/khazain/home/HeroProphet.tsx
- Blast radius: Prophet hero only; check 320dp wrapping.

### HOME-14 (medium, spacing) — Vertical rhythm — search pill → Quran hero, Quran → Prophet hero, (books/recommended) → queen card
- Frame: 2001:940 Home
- Figma: Search 2031:2140 bottom y=147 → Quran hero 2093:1651 top y=163: 16. Quran bottom 337 → Prophet 2007:475 top 361: 24. Book cards bottom 801.4 → queen 2812:1392 top 825: 24 (frame-relative y from the node graph).
- App: app/(tabs)/index.tsx:366-372 + constants/homePresentation.ts:50-53: every section gets HOME_SECTION_GAP 24 and heroPad adds HOME_HERO_TOP_GAP 8 on top for quranHero, prophetHero and queen → 32, 32, 32. Measured iOS: search bottom 160.4pt → hero top 193.3pt (33); Quran bottom 367 → Prophet top 400 (33). Android: 153 → 186dp (33). HomeHeader.tsx:85-86 comment still claims the pill→hero gap is 8.
- Fix: Set heroPad.marginTop to 0 and make the gap per section: quranHero 16, everything else 24 (e.g. a HOME_SECTION_GAP_BEFORE map in homePresentation.ts). Update the HomeHeader comment and homePresentation.test.ts; keep pairRow's top gap consistent on tablet.
- Files: app/(tabs)/index.tsx, constants/homePresentation.ts, components/khazain/home/HomeHeader.tsx, __tests__/homePresentation.test.ts
- Blast radius: Home only; tablet pair rows use HOME_HERO_TOP_GAP (index.tsx:379) — keep them in step.

### HOME-19 (low, copy) — Hijri date line format
- Frame: 2001:940 Home
- Figma: 2001:1043 «4 جمادى الآخرة 1447 هـ» — day, month, year, era; no comma.
- App: lib/hijriDate.ts:25-35 ICU output «١٢ جمادى الأولى، ١٤٤٨ هـ» — an Arabic comma after the month on both iOS and Android captures. (Arabic-Indic digits are the documented app-wide convention, 2026-09-12-more-screen-qa.md:398 — not a finding; the date value itself is live data.)
- Fix: After format(), strip the separator: formatted.replace(/[،,]\s*/g, ' ').replace(/\s+/g, ' ').trim(). Add a unit case.
- Files: lib/hijriDate.ts
- Blast radius: Every caller of todayHijriArabic (Home header; grep for others).


## T13 — Home quick chips order and dawah poster carousel

### HOME-01 (high, order) — Quick chips row — physical order of the three chips
- Frame: 2001:940 Home
- Figma: Frame 2092:1613 (HORIZONTAL, no mirroring transform). Children by stored transform m02: 2093:1757 «حصريات خزائن الرحمن» x=16 (physical LEFT), 2093:1772 «برامج إذاعية» x=141, 2093:1765 «كتب صوتية» x=265 (physical RIGHT). Read from raw node transforms via kiwi.js.
- App: constants/homePresentation.ts:63-67 authors left→right «كتب صوتية», «برامج إذاعية», «حصريات خزائن الرحمن» (rendered by app/(tabs)/index.tsx:155-159 in a PHYSICAL_ROW). iOS scrolled capture ios-home-2-end.png: كتب صوتية is on the left, حصريات on the right — exactly mirrored. __tests__/homePresentation.test.ts:46-52 pins the wrong order.
- Fix: Reverse HOME_QUICK_CHIPS to [exclusive, radio, audiobooks] (physical left→right) and update the two expectations in __tests__/homePresentation.test.ts (labels and [id, route] pairs). QUICK_CHIP_GLYPH is keyed by id so glyphs follow automatically.
- Files: constants/homePresentation.ts, __tests__/homePresentation.test.ts
- Blast radius: Home phone layout and the tablet pair cell (index.tsx:259 reuses the same array). No other screen.

### HOME-15 (high, colour) — Dawah posters — coloured frame, radius, bevel and sheen around each poster
- Frame: 2001:940 Home
- Figma: Posters 2132:2189–2132:2193 are bare image rectangles: no fill, cornerRadius 0, opacity 1. The poster PNGs (35e869b9…, c139006c…, b780d024…) carry their own rounded cream border with transparent corners (alpha 0 at (5,5)), so the page ground shows through.
- App: components/khazain/home/DawahPoster.tsx:31 backgroundColor quote.tone (#1A3F62 navy / #3F2A1B brown from data/content/dawah.ts) shows through the transparent margins; plus borderRadius 12 (line 75), white sheen (44-50) and 1px white bevel (53, 96-105). iOS ios-home-2-end.png: the centre poster sits in a navy frame, the left one in a brown frame.
- Fix: On the Home carousel: backgroundColor 'transparent', no sheen/bevel, borderRadius 0 (the art supplies its own corners). Keep a neutral placeholder only while the image decodes (e.g. KhazainColors.pageBg).
- Files: components/khazain/home/DawahPoster.tsx
- Blast radius: DawahPoster is only used by DawahCarousel (Home). The month screen uses DawahPosterRow — unaffected.

### HOME-16 (medium, shadow) — Dawah posters — shadow and neighbour dimming
- Frame: 2001:940 Home
- Figma: Only the centre poster 2132:2193 has an effect: DROP_SHADOW offset (0,1.22) blur 1.22 #000 25%. Neighbours/outermost have no effect and opacity 1.
- App: DawahPoster.tsx:78-83 shadow (3,8) radius 14 opacity 0.32 + elevation 10 on every poster; DawahCarousel.tsx:264 fades neighbours to 0.7 and the outer pair to 0.45. iOS capture: neighbours visibly washed out, heavy shadow under all.
- Fix: Shadow { offset 0/1.22, radius 1.22, opacity 0.25 } on the focused poster only (or all, it is barely visible); set the interpolated opacity to 1 at every step. Carousel paddingBottom (DawahCarousel.tsx:192) can then drop from 24.
- Files: components/khazain/home/DawahPoster.tsx, components/khazain/home/DawahCarousel.tsx
- Blast radius: Home dawah carousel only.

### HOME-17 (medium, order) — Dawah fan — which poster sits left/right of the centre
- Frame: 2001:940 Home
- Figma: Centre 2132:2193 «ليلة القدر»; left neighbour 2132:2192 «33 هدايات» (x 19.8) and right neighbour 2132:2191 «49 موعظة الصباح» (x 252); outermost left «موعظة» 2132:2190, outermost right «هدايات» 2132:2189.
- App: data/content/dawah.ts:40-63 home order [laylat, mawiza, helal]; the next item lays out to the left, so the capture shows «موعظة الصباح» left and «هدايات» right — mirrored.
- Fix: Order the three home posters [home-laylat, home-helal, home-mawiza].
- Files: data/content/dawah.ts
- Blast radius: Featured-dawah store order; check any test that snapshots DAWAH_POSTERS order and the month screen filter (it filters by month, so unaffected).

### HOME-21 (low, radius) — Card stripes and chip radius (scholar, book, chip stripes)
- Frame: 2001:940 Home
- Figma: Stripes are VECTOR rounded bars: 2007:559 (149.59x5.07, end radius ≈1.9), 2001:17222 (113.77x3.86, ≈1.45), 2093:1766 (80x4, ≈1.0). Chip radius 7.48 (2093:1757).
- App: ScholarCard.tsx:94-97, BookCard.tsx:95-98, QuickChip.tsx:68-74 draw square-ended bars; QuickChip.tsx:44 radius 8.
- Fix: borderRadius: height/2 * 0.75 (≈1.9 / 1.45 / 1.0) on the stripes; chip radius 7.5.
- Files: components/khazain/home/ScholarCard.tsx, components/khazain/home/BookCard.tsx, components/khazain/home/QuickChip.tsx
- Blast radius: Home cards; BookCard/ScholarCard may be reused in rails elsewhere (check) — change is visually tiny.

### HOME-22 (low, spacing) — Quick chips → «تصميمات دعوية» header gap; dawah → end of page
- Frame: 2001:940 Home
- Figma: Chip bottom 1004 (stripe to 1006) → dawah header 1028: 24. Dawah frame bottom 1214.4 → nav top 1238: ≈24.
- App: index.tsx:402-403 quickChipsRow paddingBottom 4 + section gap 24 = 28 (iOS: chip bottom 413.9pt → header row 442). DawahCarousel.tsx:192 paddingBottom 24 + SCREEN_BOTTOM_BREATHING 24 (index.tsx:271) = 48 below the posters (iOS: poster bottom 631 → MiniPlayer 680).
- Fix: quickChipsRow paddingBottom 2 (the stripe's overhang); carousel paddingBottom ~2 once the HOME-16 shadow is in.
- Files: app/(tabs)/index.tsx, components/khazain/home/DawahCarousel.tsx
- Blast radius: Home only.


## T14 — Home: rebuild the «أنتِ ملكة» card from the file

### HOME-05 (high, image) — «أنتِ ملكة» card — composition (calligraphy emblem, watermark, text column, crown scale)
- Frame: 2001:940 Home
- Figma: Frame 2812:1392 361x96 r16, clips. Right edge carries the vectorised calligraphy «أنتِ ملكة» 2815:1402 (54.57x82.47 at card (294,6); 180 vectors, black + gradient fills — rendered from fillGeometry: teal/navy calligraphy with gold accents) plus a watermark 2812:1393 (image d8a8d3c9…, pink «أنتِ ملكة» calligraphy, opacity 0.08, LUMINOSITY, at (276,-73) 123x186, clipped). Text column 2812:1397 at card x 157..277 (120 wide, top 6). Crown art 2812:1396 (image b151c4f5…, 1965x814) painted at ~315.7x131.5pt from (-16.9,-7) — a crown spanning roughly x 25..135.
- App: components/khazain/home/QueenCard.tsx:6,28 renders one flattened raster hero-queen-card.webp (from an old 'page-05' render). It has no calligraphy emblem and no watermark; its title/body/pill sit against the card's RIGHT edge (text right edge ≈ card x 343) where the design puts the emblem; its crown is ~25% smaller. Composite of the .fig layers vs the asset: audit/tmp/queen-both.png. iOS ios-home-2-end.png shows the same.
- Fix: Rebuild QueenCard on HeroShell (designWidth 361, designHeight 96): gradient ground (#EDE0D1 → #F1E8DD @0.553 → #EDE0D1, horizontal), crown layer from image b151 at left -16.9 top -7 size 315.7x131.5 (clipped), the 2815:1402 calligraphy as an SVG generated with vector.js at left 294 top 6 (54.57x82.47), the watermark at 8% opacity, and a live text column {left:157,width:120,top:6}: title row (see HOME-06) + body + SmallMoreButton aligned to the column's trailing edge.
- Files: components/khazain/home/QueenCard.tsx, components/khazain/home/HeroShell.tsx, assets/khazain/home/
- Blast radius: Home phone and tablet pair (index.tsx:153,258). Body copy floored to 12pt (MIN_BODY_SIZE) will need the card to grow past 96 like the Prophet hero does; check 320dp width (column ≈ 106pt wide) for wrapping.

### HOME-06 (medium, font-size) — «أنتِ ملكة» card — text is baked into a raster (title size, colours, pill)
- Frame: 2001:940 Home
- Figma: Title 2812:1399 TheSansArabic Bold 12 #184B75 with a 2x15 gold bar 2812:1400 (#D7B995, r4) 4pt to its right; body 2812:1401 TheMixArab Regular 8 / 1.5, #B07F4B, right-aligned, 3 lines; pill 2812:1402 57x12 r3.83 navy, padding 2/16, arrow-left-stick 8 + «المزيد» 6pt #FDF9F2.
- App: QueenCard.tsx:28 — all of it is pixels in hero-queen-card.webp: the title reads ≈16-17pt, body ≈12pt in a dark brown, pill ≈60x16; none of it is live text, the pill is not separately pressable (whole card is one Pressable, QueenCard.tsx:18-27), and copy cannot follow the type scale.
- Fix: Part of the HOME-05 rebuild: title textStyle('label', navy) + bar View 2x15 #D7B995 r4 gap 4 (= KhazainColors.goldCalligraphy); body textStyle('caption', {color:'#B07F4B'}) (needs a token); SmallMoreButton for the pill so it is its own target, as the heroes already are.
- Files: components/khazain/home/QueenCard.tsx, constants/theme.ts
- Blast radius: Home only.

### HOME-27 (low, shadow) — «أنتِ ملكة» card shadow
- Frame: 2001:940 Home
- Figma: 2812:1392 DROP_SHADOW offset (0,4) blur 4 #000 25%.
- App: QueenCard.tsx:24 uses KhazainShadows.hero (#103350 24%, radius 17, offset 5,1) — the heroes' shadow.
- Fix: shadowColor #000, opacity 0.25, radius 4, offset {0,4}; elevation ~4.
- Files: components/khazain/home/QueenCard.tsx
- Blast radius: Queen card only.


## T15 — Splash: pattern scale and gradients

### HOME-23 (medium, size) — Splash pattern scale and origin
- Frame: 2001:888 / 2001:914 / 2001:835 / 2007:511 Splash
- Figma: Pattern node 2001:889 (and the same node in every frame) is 690x853 at (-149,-1), OVERLAY, image e2364e38… (1934²) STRETCH with paint transform m00 0.6633, m11 0.8206, m12 0.089 → the image is drawn at 690/0.6633 = 1040pt × 853/0.8206 = 1039.5pt (uniform), its top-left at (-149, -93.6). Confirmed against the export: in 03-2001-914.png the 8-point stars are ~1.4× the app's (audit/tmp/pattern-cmp2.png).
- App: components/khazain/launch/launchTiming.ts:96 PATTERN_TILE = 735 and assets/khazain/splash/pattern(@2x).webp hold the whole 1934px source at 735pt (fitted by correlation in 2026-09-09), tiled from (0,0) — the strapwork is 0.707× the design's. iOS recording f_14.png.
- Fix: PATTERN_TILE = 1040 and lay the first tile at left -149, top -93.6 (cover the screen from there); regenerate pattern.webp at 1040/2080px (or ship the 1934 source at @2x). Update the patternTiles test and the 2026-09-09 doc's 735 note.
- Files: components/khazain/launch/launchTiming.ts, components/khazain/launch/LaunchSequence.tsx, assets/khazain/splash/pattern.webp, components/khazain/launch/__tests__/
- Blast radius: Launch overlay only. Bigger tile = fewer tiles; on tablets (1024+ tall) still ≥2 rows. Asset size grows (~1.5–2×).

### HOME-24 (medium, colour) — Background gradient of the last splash step
- Frame: 2007:511 Splash (step 4)
- Figma: 2007:511 fill GRADIENT_LINEAR #E5D5C1 → #F8EDE1 @0.553 → #E5D5C1 — lighter at both ends than steps 1–3 (#D9C0A1 … #D8BE9D). The 3→4 SMART_ANIMATE (0.8s OUT_CUBIC) therefore lightens the ground; export 04-2007-511.png is visibly paler than 02/03.
- App: LaunchSequence.tsx:52-53,294-298 one constant gradient for all steps; recording f_20.png is as dark as step 2.
- Fix: Add a second LinearGradient (step-4 stops) above the first and animate its opacity 0→1 from STEP_STARTS.exit over STEP_MS.exit with the Figma ease.
- Files: components/khazain/launch/LaunchSequence.tsx
- Blast radius: Launch overlay only; reduced/brief paths can show step-2 ground unchanged.

### HOME-25 (low, colour) — Background gradient stops
- Frame: 2001:888 / 2001:914 / 2001:835 Splash
- Figma: Stated stops #D9C0A1 @0, #F8EDE1 @0.553, #D8BE9D @1 (vertical; transform m01 1, m10 -1).
- App: LaunchSequence.tsx:52-53 #D8BFA1, #F4E7DA @0.52, #D8BE9D — measured off the export in 2026-09-09 (the export includes the OVERLAY pattern). Mid stop is ~4-7/255 darker and 3% higher.
- Fix: Use the stated stops; if the composite then reads lighter than the export, keep the measured values and record why. Note SPLASH_GROUND (#F4E7DA) is a native-handover constant and need not change.
- Files: components/khazain/launch/LaunchSequence.tsx
- Blast radius: Launch overlay only.

### HOME-26 (low, colour) — Bottom wordmark colour
- Frame: 2001:888 / 2001:914 / 2001:835 / 2007:511 Splash
- Figma: «png_1 1» (2183:4304 etc.) is 72 vectors, all SOLID #7F613D, 220x35.06 at (86.5,793).
- App: assets/khazain/splash/wordmark*.webp is a recoloured raster with shading: opaque-pixel mean #8B6D49, range #6B4C27…#C9A982 (lighter and uneven vs the flat fill).
- Fix: Generate the wordmark as an SVG from the frame's vectors (scripts/figma/vector.js) with fill #7F613D, or re-render the raster flat #7F613D.
- Files: components/khazain/launch/LaunchSequence.tsx, assets/khazain/splash/wordmark.webp
- Blast radius: Launch overlay only (overlay must stay font-free; SVG is fine).


## T16 — Library: RTL alignment, digits and spacing

### LIBRARY-01 (high, order) — Text alignment of every block title and body text that is not inside a PHYSICAL_ROW/PHYSICAL_BOX: «ملاحظة سريعة», the textarea placeholder «اكتب ملاحظتك هنا...», «آخر الملاحظات», «لا توجد ملاحظات بعد», «تقدم الكتب المسموعة», «التذكيرات الذكية», «آخر ٢٨ يومًا», audiobook title/author/percent, the EmptyInProgressCard texts, the saved-group headers «علماء (1)» / «كتب (1)», and the ReminderList empty text
- Frame: 2031:4659 Library
- Figma: All right-aligned at the 377pt column edge. H3-104 2095:1672 «ملاحظة سريعة» at x 269–369 (card right inner edge 369). TEXTAREA-107 2095:1674 placeholder at x 123.5–356.5 (right pad 12). H4-123 2095:1700 «آخر الملاحظات» at x 288–369. H3-199 2095:1753 «تقدم الكتب المسموعة» at x 224–377. H3-263 2102:2651 «التذكيرات الذكية» at x 272.5–376.5. H4-205 2095:1760 audiobook title ends at 305, next to the thumb at 317. Verified in the node graph and in the reference export, where every heading sits at the right.
- App: Each of these renders at the physical LEFT on both iOS and Android. Evidence: cap/scrolled/ios-library-1.png («ملاحظة سريعة», placeholder, «آخر الملاحظات», empty line all on the left); ios-library-2/3.png (section titles, audiobook title/author/«٢١٪ مكتمل», «علماء (1)» on the left); android-library-2.png (same, plus the EmptyInProgressCard text block left-aligned). Root cause: textStyle() sets textAlign:'right', and under forceRTL React Native swaps 'right' to the physical left unless an ancestor pins direction:'ltr'. These containers inherit RTL: the ScrollView content (app/(tabs)/library.tsx:661-667), quickNoteCard (library.tsx:818), recentBlock (854), sectionTitle (905-909), AudioProgressCard card/topRow (AudioProgressCard.tsx:83-95), EmptyInProgressCard (EmptyInProgressCard.tsx:49-58), SearchGroupHeader (components/khazain/search/SearchGroupHeader.tsx:27-38), ReminderList 'empty' (ReminderCard.tsx:117 — the list is PHYSICAL_BOX, so this one is right; the empty text is fine). Texts inside PHYSICAL_ROW (wirdTitle, wirdMeta, recent rows, stat cards) are correct.
- Fix: Follow the CLAUDE.md contract: spread PHYSICAL_BOX on the parent of every right-aligned text. Minimal, safe set: (1) library.tsx — add ...PHYSICAL_BOX to styles.quickNoteCard, styles.recentBlock and styles.card (wirdTrend), and wrap each sectionTitle in a <View style={PHYSICAL_BOX}> (or add PHYSICAL_BOX to the sectionTitle style itself; direction on a Text is honoured). Set noteBody to PHYSICAL_BOX too, so the placeholder goes right. (2) AudioProgressCard — make card PHYSICAL_BOX and topRow/actions PHYSICAL_ROW, authoring the children in physical left→right order (text block, then cover; see LIBRARY-08 for actions). (3) EmptyInProgressCard — card becomes PHYSICAL_ROW with children ordered cta, text, cover. (4) SearchGroupHeader — wrap in PHYSICAL_BOX (it is shared with Search; check the Search screen too). Do NOT put PHYSICAL_BOX on the whole ScrollView content: every bare flexDirection:'row' below it (MySavedSection headerRow, AudioProgressCard rows, EmptyInProgressCard) would reverse.
- Files: app/(tabs)/library.tsx, components/khazain/library/AudioProgressCard.tsx, components/khazain/library/EmptyInProgressCard.tsx, components/khazain/search/SearchGroupHeader.tsx
- Blast radius: SearchGroupHeader is shared with the Search screen (the same left-alignment probably shows there). AudioProgressCard/EmptyInProgressCard are Library-only. __tests__/rtlPhysicalContract.test.ts should get a case for these containers. Safe at 320–480dp and on tablets, because direction does not change widths.

### LIBRARY-18 (medium, spacing) — Quick-note recent block: top rule, inner padding, card bottom
- Frame: 2031:4659 Library
- Figma: DIV-122 2095:1697 has a 1pt TOP-only rule #F3F4F6 (borderTopWeight 1, independent weights) and 13pt top padding before «آخر الملاحظات». The rows are DIV-127/134, with an 8 gap. Last row bottom (846) to card bottom (870) is 24.
- App: library.tsx:853-857 has no rule (the comment says 'DIV-122 carries no rule', which the node graph contradicts) and paddingTop 0, so the header sits 13pt higher. Below the last row: marginBottom 8 (869), recentBlock paddingBottom 16 (856) and card paddingBottom 24 (libraryLayout QUICK_NOTE_CARD), i.e. 48pt instead of 24. The empty state shows the same excess (ios-library-1.png).
- Fix: recentBlock: { marginTop: 12, paddingTop: 13, borderTopWidth: 1, borderTopColor: KhazainColors.hairlineFaint } and drop paddingBottom 16. Skip marginBottom on the last row. Fix the comment.
- Files: app/(tabs)/library.tsx
- Blast radius: Library only.

### LIBRARY-20 (medium, spacing) — Section-title to card spacing (تقدم الكتب المسموعة / التذكيرات الذكية)
- Frame: 2031:4659 Library
- Figma: Books: H3 2095:1752 is 24 tall, then an 8pt margin to the card (1018→1026). Reminders: H3 2102:2650 is 24 tall, then a 12pt margin (1402→1414). Sections are separated by 16 (books end 1362 → reminders title 1378).
- App: sectionTitle paddingBottom 8 for both (library.tsx:905-909). The block marginBottom LIBRARY_SECTION_GAP is 40, so the gap above «التذكيرات الذكية» is 40 instead of 16 (ios-library-3.png: the audiobook card ends ~815 and the title starts ~905 display px, ≈38pt).
- Fix: Give smartReminders' title paddingBottom 12, and between audiobookProgress and smartReminders use a 16pt gap (e.g. a smaller marginBottom on the audiobook block).
- Files: app/(tabs)/library.tsx
- Blast radius: Library only.

### LIBRARY-22 (medium, colour) — Saved section: count badge and group headers
- Frame: 2031:4659 Library (app-only: محفوظاتي)
- Figma: No frame. The design language for counts is the chip style: 12 Bold #5F5345 with Arabic-Indic digits on a #D7B995@0.16 fill (2095:1742).
- App: MySavedSection.tsx:37 renders items.length in LATIN digits («2») in gold200 #E8C78A on cream100 with a gold200 border (102-110). Contrast is about 1.5:1 (WCAG fail), and it is the only Latin numeral on the screen (ios-library-1/2.png). SearchGroupHeader prints «علماء (1)» / «كتب (1)» with Latin digits, in TheMixArab weight 700 (the design pairs TheMixArab only with Regular), and left-aligned (LIBRARY-01).
- Fix: totalCountText: toArabicDigits(items.length), textStyle('label', { color: KhazainColors.ink500 }) on a KhazainColors.iconChipBg pill with no border (matching the filter chips). SearchGroupHeader: toArabicDigits(count), and textStyle('sectionTitle') or bodyLarge Regular instead of TheMixArab Bold.
- Files: components/khazain/library/MySavedSection.tsx, components/khazain/search/SearchGroupHeader.tsx
- Blast radius: SearchGroupHeader is shared with the Search results screen.

### LIBRARY-23 (low, size) — Bottom stat cards (محاضرات مسموعة / الأجزاء المكتملة / صفحات مقروءة): title wraps
- Frame: 2031:4659 Library (app-only progress row)
- Figma: No frame. Contract: StatCard 115x122, title is one line of 14 Bold (as with the frame's تذكيراتي/ورد القرآن/ملاحظاتي).
- App: On the iPhone 16 (393pt) «محاضرات مسموعة» wraps to two lines (ios-library-4-end.png), making that card taller than the frame's 122 and the row uneven. On the Pixel 7 (412dp) it fits. At 320–360dp all three titles are likely to wrap (115pt card - 16 padding = 99pt of text).
- Fix: Shorter titles that fit the 99pt column, e.g. «المحاضرات», «الأجزاء», «الصفحات» (the subtitle already carries the qualifier), or numberOfLines={1} plus adjustsFontSizeToFit with minimumFontScale 0.85 on StatCard's title.
- Files: app/(tabs)/library.tsx, components/khazain/library/StatCard.tsx
- Blast radius: Library only. Verify at 320dp and with CHROME_MAX_FONT_SCALE 1.2.


## T17 — Library: stat cards, wird card, toggle and ring

### LIBRARY-02 (high, colour) — Stat-card glyph colour (تذكيراتي / ورد القرآن / ملاحظاتي)
- Frame: 2031:4659 Library
- Figma: Glyph fill #A88051 (gold) on all three. Nodes 2095:1608/1620/1632 (manifest LibraryReminders/LibraryWird/LibraryNotes); the generated paths in components/khazain/icons/generated/figmaIcons.ts carry fill #A88051. The reference export samples (168,128,81) = #A88051 at the bell, book and pen.
- App: Navy #184B76. library.tsx:282, 295 and 302 pass color={KhazainColors.navy800}, which overrides the monochrome glyph. iOS and Android captures both show navy glyphs. The app-only progress row (library.tsx:314-328, HeadphonesGlyph at 694) copies the same navy.
- Fix: Pass color={KhazainColors.goldAccent} (or a #A88051 token) at library.tsx:282/295/302, or omit color so the generated fill applies. Do the same for the progress-stat row (lines 314-328 and the HeadphonesGlyph stroke at 694) so the app-only cards keep the frame's language.
- Files: app/(tabs)/library.tsx
- Blast radius: Library only. StatCard itself does not set the colour.

### LIBRARY-04 (high, other) — Daily-reminder toggle (inside the wird card): state direction, size, colours
- Frame: 2031:4659 Library
- Figma: DIV-98 2095:1664: 44x24, r12, fill #184B76 (ON), with knob DIV-99 2095:1665 20x20 #F8F2ED at x=30, the PHYSICAL LEFT of the track (28–72). Shadow 0/2 r4 #000@0.20. The OFF example DIV-302 2102:2694 is #E5E7EB with the knob at x=50.5 (physical right). In this RTL design, ON = knob left and OFF = knob right.
- App: Toggle.tsx: 51x31 track, knob 27 #FFFFFF, OFF track #E9E4DA (lines 28, 55-77). The knob translates +20 to the right when ON (line 32). Inside the wird card's PHYSICAL_ROW (direction ltr), OFF draws the knob at the left (iOS capture ios-wird.png) and ON would draw it at the right: the inverse of Figma's state mapping. A user reading the Figma convention sees ON as OFF.
- Fix: In Toggle: track 44x24 radius 12, padding 2, knob 20 #F8F2ED (KhazainColors.pageBg), OFF track #E5E7EB (KhazainColors.hairline). Pin the track to PHYSICAL_BOX so the geometry is deterministic: knob at the physical right when off (alignSelf flex-end) and translateX -20 when on. Keep the 44pt touch target with hitSlop (track 24 tall → hitSlop 10).
- Files: components/khazain/primitives/Toggle.tsx
- Blast radius: Toggle is shared by settings-notifications, settings rows (SettingsToggleRow) and the More settings screen. Those have no Figma frame but would inherit the corrected size and state direction. Verify that the settings screens keep a PHYSICAL_ROW parent and that the knob does not escape the track when a parent is RTL (it can today, because translateX is physical while the start edge flips).

### LIBRARY-05 (high, font-size) — Wird progress ring: label
- Frame: 2031:4659 Library
- Figma: TEXT 2095:1651 «70%»: TheSansArabic Bold 12, lh 16, fill #A88051, Latin digits with a Latin % (export shows a small gold «70%»).
- App: CircularProgress.tsx:53 renders `{clamped}٪` (a Latin digit with the ARABIC percent sign, so «0٪» mixes scripts; seen on iOS and Android) in Amiri-Bold 16, weight 700, navy #184B76 (lines 66-71). It is visibly larger, a different face and a different colour.
- Fix: CircularProgress label: ...textStyle('label', { color: KhazainColors.goldAccent /* #A88051 */, textAlign: 'center' }), text `${clamped}%` as Figma states. If the product prefers Arabic-Indic digits app-wide, use `${toArabicDigits(clamped)}٪`, but never mix the two scripts.
- Files: components/khazain/library/CircularProgress.tsx
- Blast radius: CircularProgress is exported from components/khazain. Grep shows its only use is library.tsx:429.

### LIBRARY-06 (medium, colour) — Wird progress ring: stroke weight, colours, caps
- Frame: 2031:4659 Library
- Figma: svg-78 2095:1646: track VECTOR 2095:1647 stroke #D9D6D3 3pt; arc 2095:1648 stroke #A88051 3pt, CENTER aligned, no round cap (strokeCap unset → butt); diameter 42.44 inside 48.
- App: CircularProgress.tsx:11, 36, 44, 48: stroke 5, track rgba(141,107,52,0.15), arc gold400 #B8864A, strokeLinecap round. The ring reads heavier and warmer than the design.
- Fix: Defaults: stroke 3, track KhazainColors.hairlineWarm (#D9D6D3), arc #A88051, strokeLinecap 'butt'. Compute r so the stroke centre sits at 21.22 (r = 21.22 for size 48, i.e. (size - 5.56)/2).
- Files: components/khazain/library/CircularProgress.tsx
- Blast radius: Library only.

### LIBRARY-15 (medium, copy) — Stat-card subtitle copy (number agreement)
- Frame: 2031:4659 Library
- Figma: «٣ تذكيرات نشطة» (2095:1615), «٧ أيام متتالية» (2095:1627), «٢٤ ملاحظة» (2095:1639).
- App: library.tsx:277-301: streak → `${n} يوم متتالي` (so 7 renders «٧ يوم متتالي», not «٧ أيام متتالية»). Reminders → `${n} تذكيرات نشطة` for every n (1 renders «١ تذكيرات نشطة», seen in the iOS and Android captures). Notes → «٠ ملاحظة».
- Fix: Use the same Arabic number-agreement helper as the progress row (services/libraryStats.ts). Streak: 1 «يوم واحد متتالٍ», 2 «يومان متتاليان», 3–10 «n أيام متتالية», 11+ «n يومًا متتاليًا». Reminders: 1 «تذكير واحد نشط», 2 «تذكيران نشطان», 3–10 «n تذكيرات نشطة», 11+ «n تذكيرًا نشطًا». Notes: 0 «لا ملاحظات», 1 «ملاحظة واحدة», 2 «ملاحظتان», 3–10 «n ملاحظات», 11+ «n ملاحظة».
- Files: app/(tabs)/library.tsx, services/libraryStats.ts
- Blast radius: Library only.

### LIBRARY-16 (medium, copy) — Wird card reading summary: copy and empty-state contradiction
- Frame: 2031:4659 Library
- Figma: «آخر قراءة: اليوم» (2095:1660, 14 Bold #281E13) over «سورة البقرة - الآية 142» (2095:1662, 12 Bold #5F5345, hyphen, ayah number).
- App: library.tsx:452-457: second line is `سورة ${name} — صفحة ${page}` (em dash, page number). With no reading history the first line says «لم تبدأ القراءة بعد», but the second line still says «سورة الفاتحة — صفحة ١», because lastReadPage defaults to 1 (iOS and Android captures). If lastSurah is null the same sentence is printed twice.
- Fix: Separator: use ' - ' as in Figma. Keep page if the data model has no ayah (record it as a deliberate deviation), or switch to the ayah when progressRepo exposes it. Hide the second line whenever lastReadingLabel() returns «لم تبدأ القراءة بعد».
- Files: app/(tabs)/library.tsx
- Blast radius: Library only.

### LIBRARY-19 (low, colour) — Quick-note placeholder colour and format-glyph colour
- Frame: 2031:4659 Library
- Figma: Placeholder TEXTAREA-107 2095:1674: #9CA3AF (cool grey), 14. The format glyphs NoteListFormat/NoteItalic/NoteBold (2095:1683/1688/1693) have fill #5F5345.
- App: noteBodyPlaceholder uses ink400 #988671 (library.tsx:836). The format glyphs use ink700 #3D2E1D (library.tsx:499-505).
- Fix: Placeholder color '#9CA3AF' (add a token, e.g. KhazainColors.placeholder). FigmaIcon color KhazainColors.ink500 for the three glyphs.
- Files: app/(tabs)/library.tsx, constants/theme.ts
- Blast radius: Library only.


## T18 — Library: audiobook, reminder cards and filter chips

### LIBRARY-07 (high, image) — Audiobook progress card thumbnail
- Frame: 2031:4659 Library
- Figma: DIV-58 2207:17286: 48x48 CIRCLE (r=100), clips content, NO fill. Its #A88051 stroke is visible:false. Inside, Background2 2207:17287 at opacity 0.60 holds 376 vectors of a gold #A88051 eight-point-star lattice (fill #FFFFFF hidden). In short: a 48pt circle of 60% gold geometric pattern on the card colour.
- App: AudioProgressCard.tsx:32-34, 96-109: a 44x44 NAVY rounded square (r10) holding the ﷽ glyph in Amiri gold300 (ios-library-3.png). EmptyInProgressCard.tsx:59-68 uses a 44 r12 cream square with a gold outline and a headphones glyph.
- Fix: Replace the cover with a 48x48 borderRadius 24 overflow:'hidden' View with no fill, containing the existing geometric pattern asset (assets/figma/pattern-geometric.png is the same eight-point-star tile; or port the lattice as an SVG) at opacity 0.6, tinted #A88051. Keep it in the physical-right slot. Use the same 48 circle for EmptyInProgressCard, without the gold border.
- Files: components/khazain/library/AudioProgressCard.tsx, components/khazain/library/EmptyInProgressCard.tsx
- Blast radius: Library only.

### LIBRARY-08 (high, order) — Audiobook card action buttons: size, packing and order
- Frame: 2031:4659 Library
- Figma: DIV-221 2095:1773 packs both buttons to the physical RIGHT with gap 8. Left→right: BUTTON-222 «متابعة» 67.6x36 navy, pad 8/16, at x=181; BUTTON-225 «إضافة ملاحظة» 108x36, fill #D7B995@0.16, pad 8/12, text #5F5345, at x=257–365. Both hug their content.
- App: AudioProgressCard.tsx:56-75, 129-153: each button is flex:1, so they stretch to full width as two equal halves. In the inherited RTL row the first child (متابعة) lands on the RIGHT and «إضافة ملاحظة» on the LEFT, the reverse of Figma (ios-library-3.png).
- Fix: actions: { ...PHYSICAL_ROW, justifyContent: 'flex-end', gap: 8 }, children in physical order [primary «متابعة», secondary «إضافة ملاحظة»]. Remove flex:1, keep paddingHorizontal 16 (primary) / 12 (secondary), height 36.
- Files: components/khazain/library/AudioProgressCard.tsx
- Blast radius: Library only. Content-sized buttons fit at 320dp: 68+8+108 = 184 < 288 available.

### LIBRARY-09 (medium, size) — Audiobook card progress track width and the meta line under it
- Frame: 2031:4659 Library
- Figma: The track DIV-211 2095:1765 is 276x6 (r3, #E5E7EB) and spans only the text column (x 29–305); the 48 thumb plus a 12 gap occupy 317–365 beside the whole text stack. Fill DIV-212 #184B76 is right-anchored. Under it, DIV-213 2095:1767: «الحلقة ١٣ من ٢٠» at the left, «٦٥% مكتمل» at the right, both 12 Bold #5F5345.
- App: AudioProgressCard.tsx:31-55: the track is a sibling of topRow, so it spans the full inner width (~327pt). Only one meta text («٢١٪ مكتمل») is shown, and it is on the LEFT (ios-library-3.png). There is no episode count. The fill anchors right correctly.
- Fix: Restructure as PHYSICAL_ROW [textColumn(flex 1), cover 48] with gap 12, and put the track and the meta row inside textColumn. Meta row: PHYSICAL_ROW with justifyContent 'space-between': left = episode text when the lecture has a series (e.g. `الحلقة ${n} من ${m}`), right = percent.
- Files: components/khazain/library/AudioProgressCard.tsx, app/(tabs)/library.tsx
- Blast radius: Library only. The episode index needs data from progressStore.inProgressLecture; omit the left span when unknown.

### LIBRARY-10 (medium, other) — Audiobook list: completed-lecture card variant missing
- Frame: 2031:4659 Library
- Figma: The books-progress list 2095:1751 shows TWO cards: in-progress (DIV-202) and completed (DIV-228 2095:1779). The completed card has a full track (2098:2285 width 276), the meta «مكتمل», a GOLD primary button «مراجعة» BUTTON-256 #A88051 and the secondary «عرض الملاحظات».
- App: library.tsx:333-372 renders only progressStore.inProgressLecture, or the EmptyInProgressCard. Completed lectures (completedLectureCount exists) never get a card. The `gold` prop on AudioProgressCard (line 16) is unused.
- Fix: Render a short list: the in-progress lecture plus the most recent completed lecture(s) from lectureRepo, the latter with gold, primaryLabel «مراجعة», secondaryLabel «عرض الملاحظات», subtitle «مكتمل». Gold must be #A88051 (gold400 #B8864A is close but not the stated value).
- Files: app/(tabs)/library.tsx, components/khazain/library/AudioProgressCard.tsx, store/progressStore.ts
- Blast radius: Library only. Needs a repo query (lectureRepo), so it is a data change, not just styling.

### LIBRARY-11 (high, decoration) — Smart-reminder cards: per-card toggle, next-time line, icon disc, highlight state
- Frame: 2031:4659 Library
- Figma: Three 360x114 cards (2102:2653/2672/2691), r20, pad 17/12. Top row: a toggle (44x24 navy ON / #E5E7EB OFF) at the physical LEFT, and the title 14 Bold #111827 plus a 32pt NAVY disc (DIV-274 #184B76) holding a CREAM #F8F2ED glyph (LibraryWirdReminder, a book) at the RIGHT. Then a description 12 Bold #5F5345, then «التذكير التالي: …» 12 Bold in navy #184B76 (green #15803D on the third). The active card DIV-266 has a linear gradient #EEE8E1→#D8C9B7 and a 1pt NAVY stroke; the others are #FCFAF8 with a #E5E7EB stroke.
- App: ReminderCard.tsx:21-37, 87-117: a row with text plus a cream iconChipBg disc (CARD_DENSITY.lectureBadgeDisc) holding a NAVY bell (LibraryReminders, line 77). There is no toggle, no next-reminder line and no highlighted card. The generated icon LibraryWirdReminder (figmaIcons.ts:612) is unused. ios-library-3.png and android-library-2.png show a single plain row.
- Fix: Extend ReminderSummary with nextAt (from describeWirdReminder / notificationScheduler) and enabled. Card: PHYSICAL_BOX column, pad 17/12. Header PHYSICAL_ROW with justifyContent space-between: [Toggle → setCategoryEnabled] … [title, 32 navy disc + FigmaIcon LibraryWirdReminder size 16 color #F8F2ED]. Below: description (label, ink500) and a next-time line (label, navy800). For the armed wird reminder, use the gradient (expo-linear-gradient, already a dependency) with a navy border. Keep the «إدارة التذكيرات» link.
- Files: components/khazain/library/ReminderCard.tsx, app/(tabs)/library.tsx, services/notificationRegistry.ts
- Blast radius: Library only. A toggle here must use the same permission path as settings-notifications (setWirdReminderEnabled), or it will show armed reminders that cannot fire.

### LIBRARY-12 (medium, copy) — Smart-reminder copy
- Frame: 2031:4659 Library
- Figma: Title «تذكير ورد القرآن» (2102:2660). Contextual description «لم تقرأ الورد منذ ٣ أيام. تذكر أن قراءة القرآن نور وشفاء للقلوب» (2102:2668). «التذكير التالي: غداً الساعة ٨:٠٠ ص» (2102:2670).
- App: Registry copy: «تذكير الورد» / «تذكير يومي بقراءة الورد» (services/notificationRegistry.ts labelAr/descriptionAr, rendered by ReminderCard.tsx:25-30). There is no next-time line.
- Fix: Use labelAr «تذكير ورد القرآن» for the wird category in the Library context, and derive the description from days since the last read (progressStore.trendLast28), falling back to the static description. Add the next-time line as in LIBRARY-11.
- Files: services/notificationRegistry.ts, components/khazain/library/ReminderCard.tsx
- Blast radius: labelAr is also shown in settings-notifications. Changing it there is acceptable, or add a separate libraryLabelAr.

### LIBRARY-17 (medium, copy) — Filter chip set and counts
- Frame: 2031:4659 Library
- Figma: Seven chips, right→left: الكل ٤٢ (active, navy), المحفوظات ١٨, قوائم التشغيل ٥, المكتمل ٧, ملاحظاتي ٢٤, المفضلة ١٢, تذكيراتي ٣ (2095:1714 children). Every chip has a count.
- App: data/content/sections.ts:196-201: الكل, المحفوظات, قوائم التشغيل (mock count ٥ and no behaviour: 'playlist' is not a LibraryFilter), السجل (no count, so the 12pt gap leaves the chip asymmetric). المكتمل, ملاحظاتي, المفضلة and تذكيراتي are missing, although library.tsx:251 already computes a 'notes' count. The app-only السجل chip was added for the history feature.
- Fix: Add {id:'notes', label:'ملاحظاتي'} (it already has a count and section gating) and {id:'completed', label:'المكتمل'} (completedLectureCount). Either wire قوائم التشغيل or drop its fake count. Keep السجل at the end of the rail. Render the count Text only when count !== '' so the empty chip is symmetric. المفضلة/تذكيراتي need a product decision.
- Files: data/content/sections.ts, constants/libraryPresentation.ts, app/(tabs)/library.tsx
- Blast radius: LibraryFilter type, visibleLibrarySections, and the mock/HTTP adapter for library filters (services/contentService).

### LIBRARY-21 (low, spacing) — Card inner padding (audiobook and reminder cards)
- Frame: 2031:4659 Library
- Figma: DIV-202/DIV-228: pad 17 vertical / 12 horizontal. Reminder cards 2102:2653 etc.: pad 17/12.
- App: AudioProgressCard padding 16 all round (AudioProgressCard.tsx:84). ReminderCard paddingVertical 10 / paddingHorizontal 14 (ReminderCard.tsx:92-93).
- Fix: paddingVertical 17, paddingHorizontal 12 on both.
- Files: components/khazain/library/AudioProgressCard.tsx, components/khazain/library/ReminderCard.tsx
- Blast radius: Library only.

### LIBRARY-24 (medium, other) — Styling consistency of post-design additions
- Frame: 2031:4659 Library (app-only: history, trend, insights, suggestion, db error)
- Figma: Frame language: card radius 20, button/chip radius 8, sizes 12/14/16 TheSansArabic Bold via textStyle, hairlines #E5E7EB/#D9D6D3/#F3F4F6, accent #A88051, no shadows.
- App: These components bypass textStyle and the tokens. WirdHistory.tsx:209-391: radii 16/6/4/10, sizes 9/10/11/13/16, weight '600', Amiri-Bold numbers, rgba(141,107,52,0.1/0.35) borders. InsightRow.tsx:59-88: radius 14, size 11, Amiri-Bold 14, bare flexDirection 'row' (RTL auto-flip, which the contract bans). TrendSparkline.tsx:103-110: radius 8, size 11. WirdSuggestionBanner.tsx:51-94: radius 14/10, sizes 12/13, weight '600', '#fff'. dbError banner (library.tsx:716-747): radius 14, size 13, '#fff'. «جارٍ تحميل السجل…» (910-917): size 13.
- Fix: Move all text to textStyle roles (label 12 / cardTitle 14 / sectionTitle 16; raise 9–11pt to label or labelSmall). Card radius LIBRARY_CARD_RADIUS (20), buttons 8, borders KhazainColors.hairline, accent goldAccent, white → KhazainColors.pageBg. Replace bare 'row' with PHYSICAL_ROW.
- Files: components/khazain/library/WirdHistory.tsx, components/khazain/library/InsightRow.tsx, components/khazain/library/TrendSparkline.tsx, components/khazain/library/WirdSuggestionBanner.tsx, app/(tabs)/library.tsx
- Blast radius: Library History filter only. NEEDS A CAPTURE with the «السجل» chip selected (none of the current captures shows these sections).

### LIBRARY-26 (low, other) — libraryPresentation declares savedList a 'reference' section
- Frame: 2031:4659 Library
- Figma: The frame has no saved-items list. After the chips (2095:1714) it goes straight to «تقدم الكتب المسموعة» (2095:1751).
- App: constants/libraryPresentation.ts:14-24 lists 'savedList' in LIBRARY_REFERENCE_SECTIONS, and it renders between the chips and the audiobooks (library.tsx:574). The «محفوظاتي» block is an app addition (track khazain-saved_20260511), not a Figma section.
- Fix: Move 'savedList' to LIBRARY_EXTENSION_SECTIONS (documentation and tests). Optionally render it only under the المحفوظات chip, so the default «الكل» view matches the frame's running order.
- Files: constants/libraryPresentation.ts, __tests__/
- Blast radius: Tests that pin the section order.


## T19 — Mushaf: ayah markers, meta line, footer, MiniPlayer

### MUSHAF-02 (high, copy) — Ayah number markers
- Frame: 2349:829 Mushaf page (image 3)
- Figma: 2349:980 page image: every ayah ends with an ornate end-of-ayah medallion holding Arabic-Indic digits (١٩٥, ١٩٦ …) in the line flow. Visual check of the extracted image (hash 02f06fab).
- App: `AyahNum` renders `'  ' + String(a.number) + '  '`, which gives Western digits ('1', '2', '3') in bare Amiri-Bold 14 #8E6630 with no medallion (mushaf.tsx:520, 591-599, styles.ayahNum :690-694). Visible in both captures: iOS 16-…png shows '1','2','3','4','5' at line starts. Every other number in the app goes through toArabicDigits.
- Fix: Render `\u06DD${toArabicDigits(a.number)}` (END OF AYAH U+06DD followed by the digits). Amiri encloses up to 3 digits in the ayah ornament. Drop the padding spaces and use one space each side. Colour: use the page text colour or the gold the image uses (sample from the page art). Keep `suppressHighlighting`.
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Reader only. ayahCharOffset/segmentCharLength (services/mushafNavigation.ts) count characters, so check that they are computed from the same string the Text renders. Deep-link scroll precision depends on it.

### MUSHAF-05 (high, other) — MiniPlayer shown on the Mushaf after a cold start
- Frame: 2349:982 Mushaf reader
- Figma: 2349:982 and 2349:829 carry no MiniPlayer. CLAUDE.md requires the MiniPlayer to be hidden while the Mushaf is focused.
- App: The iOS captures 14-… and 16-… show the MiniPlayer dock ('شرح سنن أبي داود') under the Mushaf footer, which pushes the footer up about 90pt. Root cause: app/_layout.tsx:319-325 runs `restoreLastLecture()` after progress/wird hydration. That is asynchronous and lands after the screen mounted. It calls `usePlayerStore.getState().setVisible(true)` unconditionally (services/audioEngine.ts:522). This overrides the Mushaf's focus-time `setVisible(false)` (mushaf.tsx:81-94), and nothing hides it again because focus does not change. The iOS sim has an in-progress lecture and Android does not, which is why only iOS shows it. Every cold start into the Mushaf shows the player: a deep link, a notification, or FR-009 auto-resume.
- Fix: In restoreLastLecture, drop `setVisible(true)`: isVisible already defaults to true and only the Mushaf ever sets it false. Alternatively, make visibility a suppression flag (`suppressedBy: Set<string>`) that the Mushaf adds/removes on focus/blur, so later writers cannot un-hide it. Add a test: mount the Mushaf, then call restoreLastLecture(), then expect isVisible false.
- Files: services/audioEngine.ts, store/playerStore.ts, app/(tabs)/sections/mushaf.tsx
- Blast radius: MiniPlayer visibility app-wide. The Library (library.tsx:349) and audioEngine play paths also call setVisible(true). Those are user-initiated playback, which is acceptable. Check the mushafPlayerVisibility tests.

### MUSHAF-08 (high, copy) — Meta line ayah count wording/value
- Frame: 2349:982 Mushaf reader
- Figma: TEXT 2349:1000 '٧ آيات' (plural for 3–10). The 2207:17898 rows use the same rule ('٧ آيات', '٢٨٦ آية').
- App: surahMetaLine always appends `${n} آية` (services/mushafNavigation.ts:68-70), so Al-Fatiha reads '٧ آية'. For Al-Baqarah the app shows '٥ آية': mushaf.tsx:428 prefers `ayat.length` (the 5-ayah fixture, data/content/quran.ts:63-66) over the catalogue's ayahCount 286. The ornament line (mushaf.tsx:431, 467-469) has the same issue. iOS/Android capture: 'مدنية • ٥ آية • صفحة ٢ من ٦٠٤'.
- Fix: Add `ayahCountLabel(n)`: 'آيات' when n%100 is 3–10, otherwise 'آية' (and 'آيتان' for 2, if ever needed). Use it in surahMetaLine and the ornament. Prefer `surahRecord.ayahCount` (the authoritative count) over `ayat.length`, and fall back to ayat.length only when the catalogue is missing.
- Files: services/mushafNavigation.ts, app/(tabs)/sections/mushaf.tsx
- Blast radius: Reader meta line, ornament label, and any test pinning surahMetaLine output (reading-progress tests).

### MUSHAF-09 (medium, spacing) — Meta line item spacing
- Frame: 2349:982 Mushaf reader
- Figma: DIV-47 (2349:994) is a horizontal auto-layout with itemSpacing 16, giving 231.5pt wide, centred (x 80.8–312.2). The items are مكية / • / ٧ آيات / • / صفحة ١ من ٦٠٤, each TheMixArab Regular 14/20 #5F5345.
- App: One Text string joined with ' • ' (single spaces, about 4pt gaps; mushafNavigation.ts:76 and mushaf.tsx:440, 634-638). iOS ink width is 165pt for a longer string, against 231.5 in the frame. The bullets crowd the words.
- Fix: Render the parts as separate Text children in a centred row with `gap: 16` (PHYSICAL_ROW or a row with direction pinned so the parts keep RTL reading order). Alternatively, join with U+2003 EM SPACE padding ('\u2003•\u2003') to approximate 16pt at 14pt type. Keep `numberOfLines={1}` + `adjustsFontSizeToFit` for 320dp.
- Files: app/(tabs)/sections/mushaf.tsx, services/mushafNavigation.ts
- Blast radius: Reader only. At 320dp: 231pt still fits in 288. Tablet sheet column is unaffected.

### MUSHAF-10 (medium, spacing) — Footer button internal layout (icon box)
- Frame: 2349:982 Mushaf reader
- Figma: Each button (2349:1228/1236/1244) is a vertical auto-layout: padding [8,12], itemSpacing 4, radii 8. Children: DIV-116/DIV-130 32x32 icon box (glyph 22.2x21.33 centred), then a 16-line label (TheMixArab 12/16 #5F5345). Index glyph bottom to label ink top is about 15pt.
- App: The glyph is rendered bare at 22 with gap 4 and no 32 box, in a fixed height 68 with content centred (mushaf.tsx:601-617, 703-710). Glyph bottom to label ink top: iOS 7.7pt, Android 11.4pt. Glyph top to label bottom: iOS 33.3 vs Figma 40.5. Glyph sizes match (15.7x15.0 index, 14.0x18.0 bookmark against vectors 15.99x15.02 / 14.21x18.35) and colours match (#184B76 / #5F5345).
- Fix: Wrap FigmaIcon in a 32x32 centred View. Use paddingVertical 8, paddingHorizontal 12 and gap 4, and replace `height: 68` with `minHeight: 68` so content drives it (8+32+4+18+8 = 70 with the 1.5 lh floor).
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Reader footer only.

### MUSHAF-11 (medium, spacing) — Footer vertical position (distance above home indicator)
- Frame: 2349:982 Mushaf reader
- Figma: Footer band 'Header' 2349:1010 spans y 742–810, directly on top of 'navigation' 2349:1006 (810–844, the 34pt home-indicator inset). Label box bottom is 8pt above the inset.
- App: footer has `paddingBottom: 8` (mushaf.tsx:700) on top of the SafeAreaView bottom inset, and the 44pt content block is centred in a fixed 68, adding about 12pt below the label. Label box bottom is about 20pt above the inset (Android: label ink ends 47.3dp above the screen bottom, against Figma 45 from frame bottom with a 34 inset). The whole footer sits about 12pt high.
- Fix: Remove footer paddingBottom (the SafeAreaView bottom edge already supplies the inset), and apply MUSHAF-10 so the label sits 8pt above the button bottom.
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Reader only. On Android with 3-button nav the inset is larger, which is fine. On devices with no bottom inset, keep a minimum of 8 via `Math.max(insets.bottom, 8)`.

### MUSHAF-12 (medium, other) — Footer buttons are inert
- Frame: 2349:982 Mushaf reader
- Figma: index-btn-115, goto-bookmark-btn-122, bookmark-btn-129: Index / Go to bookmark / Save bookmark controls.
- App: MushafBtn renders a Pressable with accessibilityRole='button' but no onPress (mushaf.tsx:541-549, 601-612). None of the three buttons does anything, so the bookmark pair is visual only.
- Fix: Wire index → `onBack()` / router.replace('/sections/mushaf'). Wire save bookmark → progressRepo/savedStore bookmark of the current page/ayah (the current reading page is in MushafPageTrackingController / ReadingPlaceController). Wire go to bookmark → read it back and scroll via jumpToAyah. Until wired, set `accessibilityState={{disabled:true}}` so screen readers do not announce dead buttons.
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Reader only. A bookmark persistence store may be needed (new feature; needs design).

### MUSHAF-20 (low, spacing) — Meta line vertical position
- Frame: 2349:982 Mushaf reader
- Figma: Meta band 2349:985 at y 81 with padding 8, so the text box is 89–109 (centre 54 below the status bar) and the header block ends at 117.
- App: subtitle paddingTop 6 below the 44pt InlineHeader, lh 21 (mushaf.tsx:634-638). iOS ink centre is 56.3pt below the safe top against about 54, which is 2pt low.
- Fix: subtitle paddingTop 6 → 4 (or 3 after MUSHAF-01 makes the chrome an overlay with its own band heights 36+36).
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Reader only.


## T20 — Mushaf: reading surface, cartouche and tap-to-show chrome

### MUSHAF-01 (high, other) — Reader interaction model: full-bleed page with chrome shown as a tap overlay
- Frame: 2349:829 + 2349:982 Mushaf reader
- Figma: 2349:829 is the prototype start ('Flow 1'), not a loading state. It holds frame fill #F8F2ED, the tile 2349:830, and two IMAGE fills that the reference export dropped. 'image 3' (2349:980, 391x791 at 0,0, hash 02f06fab, STRETCH with a crop transform of m11 .9096 and m12 .0358) is a full Madani Mushaf page. 'image 4' (2349:1264, 393x53 at 0,791, hash 8a566266) is a basmala strip. 2349:829 has prototypeInteractions ON_CLICK -> transitionNodeID 2349:982, navigationType OVERLAY, DISSOLVE 0.3s OUT_CUBIC. 2349:982 has overlayBackgroundInteraction CLOSE_ON_CLICK_OUTSIDE and overlayBackgroundAppearance SOLID_COLOR rgba(0,0,0,0.24). Its own #F8F2ED fill is visible:false, which is why its middle is transparent: it is drawn over the page. The intended design: the reader shows the Mushaf page full-screen with no chrome. A tap dissolves in the header (title + meta) and the footer, with a 24% black scrim over the page. A tap outside them dismisses the chrome. Verified with kiwi raw nodes (scripts raw.js) and by recompositing the image fills (audit/tmp/mimg/829_composed.png).
- App: Header, meta line and footer are always on screen, in normal flow around a ScrollView (mushaf.tsx:433-551). There is no tap-to-toggle, no scrim and no dissolve. 2349:829 is read as a 'loading/transition state', and the resume path renders an empty pageBg SafeAreaView for it (mushaf.tsx:147-151, comment at :99-102). Prior docs (2026-09-11-sections-screen-qa.md §4.1 and 2026-09-09-figma-style-remediation-qa.md E6) describe 2349:982 as 'silent on a reading surface'. They missed that the 2349:829 export dropped its images and that 2349:982 is an overlay of 2349:829.
- Fix: Make the reading ScrollView fill the screen, with paddingTop/paddingBottom equal to the chrome heights so text is not hidden while chrome is up. Render the header (current headerBg block) and footer as absolutely positioned overlays, with a Pressable/TapGestureHandler on the page that toggles `chromeVisible` (Animated opacity 0→1 over 300ms, ease-out cubic). Behind the chrome, render a full-screen rgba(0,0,0,0.24) scrim that closes the chrome on tap. Keep long-press on an ayah = NOTE: use a tap gesture that does not cancel Text onLongPress. Start with chrome visible on first open so the footer controls are discoverable, then auto-hide on scroll. This is a product decision to confirm with the user.
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Mushaf reader only. It affects page-tracking viewport height (tracking.setViewportHeight), ayah scroll headroom (AYAH_SCROLL_HEADROOM), the SurahEndSuggestions/notes footer, and tablet sheetColumn insets. VoiceOver/TalkBack need an always-reachable way to bring the chrome back (an accessibilityAction or keeping the chrome focusable). Test on 320dp width and on tablets.

### MUSHAF-03 (medium, colour) — Reading surface: page ground, text colour/face, red lafz al-jalala
- Frame: 2349:829 Mushaf page (image 3 / image 4)
- Figma: Page image 2349:980. Ivory page ground (dominant colour ≈ #FAF9EA, histogram of the extracted PNG). Text is pure black in a Madani Uthmani hand, 15 justified lines per page. Lafz al-jalalah and 'ربهم/ربكم' are set in red. There is no outer border on the page body. The frame behind it is #F8F2ED.
- App: Text is Amiri-Bold, fontWeight 700, in #281E13 (ink900), justified, on #F8F2ED (MUSHAF_BG = pageBg, mushaf.tsx:64, 620, 676-684). There is no colour differentiation for the Name. The size comes from the user font scale (default level 3 = 32/56, constants/settings.ts:113-119).
- Fix: Short term: set ayatBody colour to #000 (or a token near it) and weight 400 if a Uthmani face is licensed. Amiri Quran (`Amiri Quran` / KFGQPC Uthmanic Hafs) is the honest stand-in for the page art. Adding a font needs user approval per authority-matrix. Optional: an ivory sheet (#FBFAEE) behind the text column. Red Name highlighting needs tajweed/annotation data and is out of scope without it. Note that the page images in the file are screenshots from a third-party Mushaf app (an Android nav bar is visible in the source PNGs), not client art. Do not ship them.
- Files: app/(tabs)/sections/mushaf.tsx, constants/fonts.ts
- Blast radius: Reader only. A font change requires an update to the font registry test (__tests__/fontRegistry.test.ts).

### MUSHAF-04 (medium, decoration) — Surah title cartouche and basmala
- Frame: 2349:829 Mushaf page (image 3 bottom, image 4)
- Figma: Image 3 ends with the classic surah banner: an ornate brown/gold framed cartouche, 'سورة النساء' in calligraphy in the centre, 'آياتها ١٧٦' on one side and 'ترتيبها ٤' on the other. Image 4 (2349:1264) is the basmala as a plain black calligraphic line with no box. Visual check of the extracted PNGs.
- App: The app draws a gold-gradient box (#F3E0B6→#EAD19A), with a 2pt gold500 border and an inner 1pt gold600 frame at 60% opacity. Inside it: the ﷽ ligature in navy900 Amiri-Bold 20, and 'سورة البقرة · ٥ آية' in Amiri 12 gold600 (mushaf.tsx:457-471, styles :640-675). The box is a prototype-era invention (documented as 'no node' in 2026-09-11-sections-screen-qa.md:269). The navy basmala and the gradient do not appear in the page art. The separator is U+00B7, the same '٠'-lookalike the meta line already moved off (mushafNavigation.ts:74-76).
- Fix: Replace the gradient box with a cartouche component: a framed band in the page-art brown/gold with the surah name centred and آياتها <n> / ترتيبها <n> on its two ends, in Arabic-Indic digits. Then show the basmala as a plain centred line in the text colour (﷽ or the spelled basmala in the Quran face), omitting it for At-Tawbah (9). If the cartouche art is wanted pixel-true, extract it as an asset once client art exists. Until then an SVG frame is acceptable. Use ' • ' not ' · ' in any interim copy.
- Files: app/(tabs)/sections/mushaf.tsx
- Blast radius: Reader only. bodyYRef / place.setBodyY are measured below this block, so its height change is absorbed automatically.


## T21 — More, Contact, About: form colours, spacing, shadows

### MORE-09 (high, colour) — Form placeholder colour (all three fields)
- Frame: 2106:2598 Contact us
- Figma: INPUT-132 2106:1959 'اكتب اسمك', INPUT-137 2106:1967 'example@email.com' and TEXTAREA-142 2106:1975 all fill #5F5345 (visible paint). Reference: the placeholders read dark, the same tone as the row subtitles.
- App: contact.tsx:175 placeholderTextColor={KhazainColors.ink400} = #988671 (theme.ts:223), visibly lighter in both captures.
- Fix: placeholderTextColor={KhazainColors.inkSubtle} (#5F5345).
- Files: app/(tabs)/more/contact.tsx
- Blast radius: Contact form only. The search pill placeholder correctly stays #988671 (2558:1503).

### MORE-10 (medium, spacing) — Form title to first field spacing
- Frame: 2106:2598 Contact us
- Figma: DIV-126 top 293, title 2548:1650 box 309..330 (20/21), FORM-127 starts at 342 (12 below), INPUT at 370. Reference measured: input 1 top at 371.5.
- App: contact.tsx:242-246 formTitle uses textStyle('bodyTitle'), whose line box is 30 (the leading floor raises 21 to 30), plus marginBottom -4. The comment assumes a 21 box. Measured relative to row 1's top (Figma +277): iOS input 1 at +285.0, Android at +288.4. Every field and the button sit 8pt (iOS) to 11pt (Android) low, and the card grows accordingly.
- Fix: Take the extra 9pt of line box out symmetrically so the glyph stays centred where the 21 box would put it: formTitle marginTop -4.5 and marginBottom -4 - 4.5 = -8.5. Keep the 30 line box so marks are not clipped.
- Files: app/(tabs)/more/contact.tsx
- Blast radius: Contact only.

### MORE-11 (medium, spacing) — Textarea to submit button gap
- Frame: 2106:2598 Contact us
- Figma: TEXTAREA 2106:1974 ends at 656, DIV-138 at 662, BUTTON-143 2106:1978 starts at 678, so the gap is 22. Reference measured: textarea ends at 657.8, button at 679.1 (21.3).
- App: contact.tsx:238 formCard gap: 16 applies between the message Field and the button. Android capture: textarea ends at 677.7dp, button at 693.3dp (15.6).
- Fix: Give the submit Pressable marginTop: 6 (16 + 6 = 22).
- Files: app/(tabs)/more/contact.tsx
- Blast radius: Contact only.

### MORE-14 (low, shadow) — More-row card shadow
- Frame: 2102:2711 More root / 2106:2598 Contact rows
- Figma: websiteLink-13 2106:2205: DROP_SHADOW offset (0,1), radius 2 (Figma blur), color #000 alpha 0.05, spread 0.
- App: constants/theme.ts:279-285 KhazainShadows.listRow: shadowOpacity 0.06, shadowRadius 2, elevation 1. iOS shadowRadius corresponds to about half a CSS/Figma blur, so the app shadow is about 2x as wide and slightly darker.
- Fix: shadowOpacity 0.05, shadowRadius 1 (iOS). Leave Android elevation 1.
- Files: constants/theme.ts
- Blast radius: Every user of KhazainShadows.listRow (More root, Contact rows, Settings rows).
- Superseded: GLOBAL-13's `boxShadow` approach replaces the iOS shadowRadius fix above (85d429b).

### MORE-16 (low, spacing) — Paragraph block height and card position
- Frame: 2106:2712 About
- Figma: P-135/P-138/P-141 boxes are 60/40/60 tall (3/2/3 lines at 14/20), and the cards start at 332. In the reference the text is laid out in those boxes (lines vertically centred), so the first card sits at 332.9.
- App: about.tsx:32-36: with the Noto stand-in every paragraph wraps to 2 lines and the gaps are 16, so the first card lands at 305pt on iOS (frame-equivalent about 28pt higher than the file). The paragraph tops and gaps themselves match (box at safeTop+79, gaps 16).
- Fix: No code change recommended. This follows from the font substitution (TheMixArab is wider). Re-measure once the licensed font lands. Only if parity is wanted before then, give the three paragraphs minHeight 60/40/60 with justifyContent center.
- Files: app/(tabs)/more/about.tsx
- Blast radius: About only.

### GLOBAL-13 (low, shadow) — SearchPill and More list-row shadows
- Frame: 2031:5675 (Inputs 2031:5773), 2102:2711 (websiteLink-13 2106:2205)
- Figma: Inputs: DROP_SHADOW #000 at 8%, offset (0,4), blur 16, spread 0. websiteLink-13: DROP_SHADOW #000 at 5%, offset (0,1), blur 2. Figma blur uses CSS semantics.
- App: constants/theme.ts:267-273 sets input `shadowRadius: 16` (iOS shadowRadius is about blur/2, so this is twice as diffuse) and `elevation: 1` on Android, which draws a short, hard 1dp shadow. The Android crop shows a crisp grey lower edge, where Figma has about a 15px soft falloff. theme.ts:279-285 listRow uses opacity 0.06 (Figma 0.05) and shadowRadius 2 (should be about 1).
- Fix: Use the New-Arch `boxShadow` style, which has CSS semantics and the same result on iOS and Android API 28+: input `boxShadow: '0px 4px 16px rgba(0,0,0,0.08)'`, listRow `boxShadow: '0px 1px 2px rgba(0,0,0,0.05)'`. Remove shadow*/elevation from those tokens. newArchEnabled is true in app.json.
- Files: constants/theme.ts
- Blast radius: Every SearchPill (13 hosts) and the More/Settings list rows. Android below API 28 shows no outset shadow, which is acceptable.


## T22 — Dawah, radio and railed lists: row sizes, tints, row content

### MEDIA-09 (medium, other) — Rail-list row content (subtitle + duration not in design)
- Frame: 2869:2088 Audiobooks, 2869:2306 Exclusive
- Figma: DIV-107 2869:2158 / 2869:2367: 333x56 r20 #FCFAF8, children = DIV-58 badge + DIV-140 2869:2160 containing ONE visible text, H3 TheMixArab Regular 14 lh24 #281E13 ('كتاب صوتي' / 'حصريات خزائن الرحمن'), vertically centred. No P-148 subtitle node and no `45 دقيقة` duration node exist (checked raw children incl. hidden).
- App: RailedLectureList.tsx:62-71 passes scholar and duration to LectureCard compact; LectureCard.tsx:64-77,88-92 render a 12pt author line and a bold duration ('٦ س ٢٠ د'). Captures 23/24 show two-line rows with a duration at the physical left; titles sit high instead of centred.
- Fix: If parity is the goal: in RailedLectureList stop passing `scholar`/`duration` (or add a `variant='rail'` to LectureCard that renders title only, numberOfLines 1). If the author/duration line is a deliberate product enrichment, record it as a documented deviation in docs/plans so it stops surfacing.
- Files: components/khazain/sections/RailedLectureList.tsx, components/khazain/primitives/LectureCard.tsx
- Blast radius: Audiobooks + Exclusive only (compact LectureCard is used only here). Title-only rows make narrow 320dp layouts easier, not harder.

### MEDIA-14 (low, size) — Month row height / step
- Frame: 2120:942 Dawah month list
- Figma: DIV-139 2365:2124: 361x56, stroke 1 INSIDE (#D9D6D3), padding 8 → content 40; rows step 60 (gap 4).
- App: dawah.tsx:89-100: minHeight 56 but borderWidth 1 + paddingVertical 8 + 40pt badge = 58 (RN border is outside the padding). iOS capture 11: row borders 115.0→173.0 (58), step 62. Over 6 rows the list is 12pt taller.
- Fix: dawah.tsx row: `paddingVertical: 7` (compensates the 1pt border), keep minHeight 56.
- Files: app/(tabs)/sections/dawah.tsx
- Blast radius: Dawah list only. With font scaling the row still grows from content.

### MEDIA-15 (low, size) — Poster row height / step
- Frame: 2120:1857 Dawah posters
- Figma: DIV-139 2548:1357: 361x89, stroke INSIDE, padding 8, poster 74x73 → step 93 (gap 4).
- App: DawahPosterRow.tsx:96-107: paddingVertical 8 + borderWidth 1 + 73 thumb = 91. iOS capture 12: 115.0→206.0 (91), step 95.
- Fix: DawahPosterRow.tsx row: `paddingVertical: 7` (or `minHeight: POSTER_H + 16` with padding 7).
- Files: components/khazain/primitives/DawahPosterRow.tsx
- Blast radius: DawahPosterRow is only used on the month detail screen.

### MEDIA-16 (low, colour) — Share / download icon tint
- Frame: 2120:1857 Dawah posters
- Figma: Share symbol 2548:1111 vectors 2548:1108 (opacity 1) and 2548:1109 (opacity 0.4) fill #281E13; download instance 2548:1361 overrides 2001:11255/11256/11257 to #281E13.
- App: DawahPosterRow.tsx:54,62 tint both with KhazainColors.ink700 #3D2E1D.
- Fix: Use `KhazainColors.inkTitle` (#281E13) for both FigmaIcon colours.
- Files: components/khazain/primitives/DawahPosterRow.tsx
- Blast radius: Poster rows only.


## T23 — Qiraat as a bottom sheet; reciter screen structure

### SECTIONS-15 (medium, other) — Presentation: a bottom sheet in the file, a full pushed screen in the app
- Frame: 2457:954 Qiraat
- Figma: 2457:954 is 393x712 (not 844), with top corner radii 16, a 1pt #D7B995@16% stroke, a 36x4 grabber 2457:956 at y=8 and a centred title at y=28. It has no status bar and no header art. It is a bottom sheet.
- App: app/(tabs)/sections/_layout.tsx:12 pushes 'qiraat' as a normal stack screen with slide_from_left. qiraat.tsx draws a grabber and title at the top of a full-height SafeAreaView, with no rounded top, no stroke and no backdrop (capture 17-...qiraat.png). The grabber suggests a sheet the screen isn't.
- Fix: Present it the way the repo presents sheets: a root-level route with presentation 'transparentModal' + fade, built on components/khazain/sheets/SheetShell, with the top radius 16 and #D7B995@16% stroke on the sheet and a height near 712/844 of the window. Point reciterNavigation.ts:24 at the new route. Alternatively, drop the decorative grabber if it stays a pushed page.
- Files: app/(tabs)/sections/qiraat.tsx, app/(tabs)/sections/_layout.tsx, app/_layout.tsx, services/reciterNavigation.ts, components/khazain/sheets/SheetShell.tsx
- Blast radius: Qiraat entry from the reciter tab and settings-qiraa (if it routes here). Changes the back gesture and the MiniPlayer overlay behaviour. The capture harness route stays the same if the path is kept.

### SECTIONS-23 (low, spacing) — Sheet title and first-row offsets
- Frame: 2457:954 Qiraat
- Figma: Grabber y=8, title box 28-48 (centre 38), TheMixArab Regular 16/20, first row at 56. The file's copy is 'آختر القراءة' (with آ), an evident typo. The app's 'اختر القراءة' is correct and should stay.
- App: qiraat.tsx:78-95: handle 8 + 4 + paddingBottom 4, title paddingTop 6 with lineHeight 24 (box 22-46, centre 34), paddingBottom 12, rows at 58.
- Fix: Title paddingTop 8 and paddingBottom 8: box 24-48, centre 36, rows at 56. Fold this into SECTIONS-15 if the screen becomes a SheetShell.
- Files: app/(tabs)/sections/qiraat.tsx
- Blast radius: Qiraat only.

### SECTIONS-07 (medium, other) — Screen structure: the frame has no segment tab strip
- Frame: 2102:3187 Murattal
- Figma: 2102:3187 contains Header (title 'المصحف المرتل' 2102:3249 plus a back arrow), Inputs, then the list at y=139, 10 below the search pill. There is no '١' tab-strip frame (2031:6193 has it as 2102:2974). So the frame is a pushed Murattal list, not the reciter screen with a second tab selected.
- App: Rendered as /sections/reciter?tab=murattal: header 'القرآن حياة', a 45pt tab strip, list at about 220pt (capture 10-...tab-murattal.png). The title is a documented deviation (2026-09-12-demo-readiness-qa.md §7: 'a title that changes with the tab is worse UX'). The missing strip and the 10pt list offset are not covered by that note.
- Fix: Product decision. Either keep the tab model and mark 2102:3187 in figma-mobile-screen-map.json as 'deviation: modelled as tab state', or route each tab to its own list screen (/sections/reciter/style/[style]) with an InlineHeader titled by the tab label and no strip, as the frame shows. Do not change the code until the user picks.
- Files: app/(tabs)/sections/reciter.tsx, docs/visual-regression/figma-mobile-screen-map.json
- Blast radius: Reciter navigation, reciterNavigation.ts, and the deep links used by the capture harness.


## T24 — RTL alignment on screens without a frame (settings, toast, library additions)

### NOFRAME-01 (high, other) — Delivery-disclosure note card and permission-denied banner text
- Frame: contract (no Figma frame) app/settings-notifications.tsx (الإشعارات modal)
- Figma: constants/layout.ts PHYSICAL_BOX/PHYSICAL_ROW contract + CLAUDE.md "Verification hygiene": in a container whose direction is left to forceRTL, textAlign:'right' / alignItems:'flex-end' / left:N resolve to the physical LEFT and an unpinned flexDirection:'row' auto-flips (banned). __tests__/rtlPhysicalContract.test.ts documents the same failure on the More page. The screen is NOT in PINNED_SCREENS (rtlPhysicalContract.test.ts:40-83) although all its siblings (settings-qiraa/reciter/font-size/about/prayer/wird-*) are — it was missed by the sweep.
- App: styles.body (app/settings-notifications.tsx:267) has no PHYSICAL_BOX; noteCard (269-276) and banner (278-287) are unpinned. noteText (277, textStyle caption -> textAlign right) and bannerTitle/bannerBody (288-289) therefore render against the physical LEFT; the banner also sets alignItems:'flex-end' (285), which shrink-wraps both texts to the physical left. Static finding (no capture exists for this modal).
- Fix: Spread PHYSICAL_BOX into styles.body (and the banner), replace the banner's alignItems:'flex-end' with alignItems:'stretch' (titles must not shrink-wrap on Android 15), and add app/settings-notifications.tsx to PINNED_SCREENS in __tests__/rtlPhysicalContract.test.ts.
- Files: app/settings-notifications.tsx, __tests__/rtlPhysicalContract.test.ts
- Blast radius: This screen only. SettingsToggleRow/SettingsValueRow rows inside it already pin themselves.

### NOFRAME-02 (high, order) — Weekday completion bars, calendar grid, legend, section labels
- Frame: contract (no Figma frame) components/khazain/library/WirdHistory.tsx (Library › السجل)
- Figma: constants/layout.ts PHYSICAL_BOX/PHYSICAL_ROW contract + CLAUDE.md "Verification hygiene": in a container whose direction is left to forceRTL, textAlign:'right' / alignItems:'flex-end' / left:N resolve to the physical LEFT and an unpinned flexDirection:'row' auto-flips (banned). __tests__/rtlPhysicalContract.test.ts documents the same failure on the More page. Library ScrollView (app/(tabs)/library.tsx:661-668) is unpinned, so WirdHistory inherits RTL.
- App: WirdHistory imports no PHYSICAL_* at all. weekdayRow (260), gridRow (298), legendRow (348) are bare flexDirection:'row' and the JSX is authored as if LTR ("first child = leftmost", line 117; COLUMN_ORDER Friday->Saturday, line 58, citing a CustomTabBar precedent that itself now uses PHYSICAL_ROW). Under forceRTL this mirrors: % lands at the physical right and the day name at the left, the calendar puts السبت on the LEFT, barFill right:0 (284) is swapped to the left so bars grow from the wrong edge, weekdayPct textAlign:'left' (272) and sectionLabel textAlign:'right' (249) swap too. Also off-role type: TheSansArabic 9/10/11 (309, 342, 370, 376) below MIN_BODY_SIZE 12, Amiri-Bold 16 empty title, TheSansArabic 14/700 section labels.
- Fix: Spread PHYSICAL_BOX on the root View and the cards, PHYSICAL_ROW on weekdayRow/gridRow/legendRow (keeping the authored left->right order), so barFill right:0 and textAlign mean what they say. Map text to roles: sectionLabel -> textStyle('cardTitle'), weekday/legend labels -> textStyle('label'), cell day digits -> textStyle('labelSmall'), empty title -> textStyle('sectionTitle'), empty body -> textStyle('caption'). Add the file to PINNED_SCREENS.
- Files: components/khazain/library/WirdHistory.tsx, __tests__/rtlPhysicalContract.test.ts
- Blast radius: Library history filter only. Verify on iOS+Android after reload (auto-flip behaviour is what CLAUDE.md says differs between cold start / Fast Refresh / web). May overlap the LIBRARY group.

### NOFRAME-03 (high, other) — Banner message + لاحقًا / قبول actions
- Frame: contract (no Figma frame) components/khazain/library/WirdSuggestionBanner.tsx (Library adaptive wird suggestion)
- Figma: constants/layout.ts PHYSICAL_BOX/PHYSICAL_ROW contract + CLAUDE.md "Verification hygiene": in a container whose direction is left to forceRTL, textAlign:'right' / alignItems:'flex-end' / left:N resolve to the physical LEFT and an unpinned flexDirection:'row' auto-flips (banned). __tests__/rtlPhysicalContract.test.ts documents the same failure on the More page.
- App: banner (47-56) unpinned inside the unpinned Library ScrollView; message (57-65) textAlign right -> physical LEFT; actions (66-70) bare flexDirection row relying on auto-flip. Type off-role: TheSansArabic 13/600 lineHeight 22 message, TheSansArabic 12/700 buttons, '#fff' literal, radius 14/10, border 1.5 gold500.
- Fix: PHYSICAL_BOX on banner, PHYSICAL_ROW on actions with children authored physical left->right (قبول, لاحقًا or as product decides) and justifyContent:'flex-end'; message -> textStyle('bodyCompact',{color: navy800}); button labels -> textStyle('cardTitle'); colour KhazainColors.pageBg instead of #fff; radius KhazainRadius.md.
- Files: components/khazain/library/WirdSuggestionBanner.tsx
- Blast radius: Library only. May overlap LIBRARY group.

### NOFRAME-04 (high, other) — Empty in-progress card text column
- Frame: contract (no Figma frame) components/khazain/library/EmptyInProgressCard.tsx (Library, nothing in progress)
- Figma: constants/layout.ts PHYSICAL_BOX/PHYSICAL_ROW contract + CLAUDE.md "Verification hygiene": in a container whose direction is left to forceRTL, textAlign:'right' / alignItems:'flex-end' / left:N resolve to the physical LEFT and an unpinned flexDirection:'row' auto-flips (banned). __tests__/rtlPhysicalContract.test.ts documents the same failure on the More page.
- App: card (48-58) is a bare flexDirection:'row' (55) with no pin; the title/subtitle sit in a plain flex:1 View (30) so textStyle(...) textAlign right renders at the physical LEFT; icon/CTA order relies on auto-flip.
- Fix: card: ...PHYSICAL_ROW with children re-authored physical left->right (CTA, text, cover) — matching AudioProgressCard, the Figma-backed sibling; text column gets PHYSICAL_BOX (inherited from the row).
- Files: components/khazain/library/EmptyInProgressCard.tsx
- Blast radius: Library «قيد الاستماع» slot when empty. May overlap LIBRARY group.

### NOFRAME-05 (high, other) — Saved row bookmark button, header count chip, group counts
- Frame: contract (no Figma frame) components/khazain/library/MySavedSection.tsx (Library › المحفوظات)
- Figma: constants/layout.ts PHYSICAL_BOX/PHYSICAL_ROW contract + CLAUDE.md "Verification hygiene": in a container whose direction is left to forceRTL, textAlign:'right' / alignItems:'flex-end' / left:N resolve to the physical LEFT and an unpinned flexDirection:'row' auto-flips (banned). __tests__/rtlPhysicalContract.test.ts documents the same failure on the More page. Arabic-Indic digits are used for every other count in the app (toArabicDigits, constants/progress.ts:164).
- App: rowBookmarkSlot (114-119) is absolutely positioned left:16 inside an unpinned rowContainer, so forceRTL swaps it to right:16 — over the 40pt icon badge that SearchResultRow (pinned) draws at the physical right, instead of over the meta slot at the left. headerRow (95) is an unpinned row. Total chip prints {items.length} (37) and SearchGroupHeader prints ({count}) in LATIN digits; totalCountText is gold200 on cream100 = 1.46:1 contrast.
- Fix: Pin rowContainer with PHYSICAL_BOX (so left:16 is the physical left) and headerRow with PHYSICAL_ROW (children authored chip, title); toArabicDigits(items.length); chip text KhazainColors.goldAccent or navy800.
- Files: components/khazain/library/MySavedSection.tsx
- Blast radius: Library saved filter. Shares SearchGroupHeader/SearchResultRow with search (see NOFRAME-09/10). May overlap LIBRARY group.

### NOFRAME-06 (high, other) — Toast message alignment and type
- Frame: contract (no Figma frame) components/khazain/primitives/ToastOverlay.tsx (app-wide toast)
- Figma: constants/layout.ts PHYSICAL_BOX/PHYSICAL_ROW contract + CLAUDE.md "Verification hygiene": in a container whose direction is left to forceRTL, textAlign:'right' / alignItems:'flex-end' / left:N resolve to the physical LEFT and an unpinned flexDirection:'row' auto-flips (banned). __tests__/rtlPhysicalContract.test.ts documents the same failure on the More page.
- App: Mounted at the root (app/_layout.tsx:549), outside any pin. card (138-146) is a bare flexDirection:'row'; message (166-173) has flex:1 + textAlign:'right' -> the text renders against the physical LEFT of the toast. Type: TheSansArabic 14/500 and 14/700, both off-role. Every settings action toast (e.g. «تم تفريغ الذاكرة المؤقتة», settings.tsx:117) shows this.
- Fix: card: ...PHYSICAL_ROW with children authored physical left->right (action, message, badge); message -> textStyle('bodyCompact',{color: cream50}); achievement -> textStyle('cardTitle'); action label -> textStyle('cardTitle',{color: gold200}).
- Files: components/khazain/primitives/ToastOverlay.tsx
- Blast radius: Every toast in the app (settings, save gesture, achievements). Re-check on Android small width.

### NOFRAME-35 (medium, font-size) — Insight chips row
- Frame: contract (no Figma frame) components/khazain/library/InsightRow.tsx (Library insights)
- Figma: constants/layout.ts PHYSICAL_BOX/PHYSICAL_ROW contract + CLAUDE.md "Verification hygiene": in a container whose direction is left to forceRTL, textAlign:'right' / alignItems:'flex-end' / left:N resolve to the physical LEFT and an unpinned flexDirection:'row' auto-flips (banned). __tests__/rtlPhysicalContract.test.ts documents the same failure on the More page. MIN_BODY_SIZE 12.
- App: row is a bare flexDirection:'row' (58-63) — «أطول سلسلة» only lands at the right because of the banned auto-flip; chipTitle TheSansArabic 11 (75-81) below the 12 floor; chipValue Amiri-Bold 14 (82-89, Amiri on data); radius 14, literal border.
- Fix: row ...PHYSICAL_ROW with chips authored physical left->right (هذا الشهر, أعلى يوم, أطول سلسلة); chipTitle textStyle('caption'); chipValue textStyle('cardTitle',{color: navy800}); radius KhazainRadius.md, border cardBorder.
- Files: components/khazain/library/InsightRow.tsx
- Blast radius: Library history filter. May overlap LIBRARY group.


## T25 — Figma glyphs on screens without a frame (search, notes, sheets, settings, onboarding)

### NOFRAME-08 (high, icon) — Surah and scholar result badges
- Frame: contract (no Figma frame) services/search/rowProps.tsx (search results + Library saved rows)
- Figma: Figma glyphs exist for both: SurahStar (node 2207:5706, the 36pt surah row badge used by SurahRow/ReciterSurahRow) and BadgeQuill (node 2869:2011, the scholars list badge on 2102:2975). Lecture rows already use the Figma badges (OpenBookBadge/MicBadge/TulipBadge).
- App: SurahNumberBadge (rowProps.tsx:27-35, 47-56) is a hand-built 40pt circle with a gold200 numeral on cream100 (1.46:1). ScholarMedallion (37-44, 57-65) is a gold200 disc holding the letter «ع» in TheMixArab 18/700 — a placeholder, not a mark. Both appear in search and in the Library saved list.
- Fix: Surah: <SurahStar index={displayNumber} size={CARD_DENSITY.surahBadgeDisc}/> as in components/khazain/sections/SurahRow.tsx:65. Scholar: <FigmaIcon name="BadgeQuill" size={40}/> (or the scholars-list badge component). Delete the two inline badges.
- Files: services/search/rowProps.tsx
- Blast radius: Search results and MySavedSection rows.

### NOFRAME-13 (high, icon) — Format toolbar B / I / list buttons
- Frame: contract (no Figma frame) app/note-editor.tsx (note sheet)
- Figma: Figma draws the same toolbar on the Library quick-note card (2031:4659 BUTTON-113/116/119, 32pt at radius 16 on #FCFAF8) with real glyphs NoteListFormat (2095:1683), NoteItalic (2095:1688), NoteBold (2095:1693); app/(tabs)/library.tsx:498-506 already uses them (comment at 676-680: "including the bold and italic ones the app had been setting as styled letters").
- App: FormatBtn renders the Latin letters «B» and «I» in fontFamily 'System' (note-editor.tsx:183-184, 378-382) and a hand-drawn three-line ListGlyph (258-269); buttons are 36x36 with no hitSlop (368-377) and no onPress.
- Fix: Render <FigmaIcon name="NoteBold|NoteItalic|NoteListFormat" size={16} color={ink700}/>, share the Library FormatBtn (32 r16 cardBg) and give it hitSlop 6 to reach 44.
- Files: app/note-editor.tsx, app/(tabs)/library.tsx
- Blast radius: Note editor only; extracting FormatBtn touches Library.

### NOFRAME-18 (high, icon) — Telegram / YouTube glyphs in the navy disc
- Frame: contract (no Figma frame) app/telegram-sheet.tsx, app/youtube-sheet.tsx, app/share-sheet.tsx
- Figma: MoreTelegram (node 2106:2255) and MoreYoutube (node 2106:2237) are in components/khazain/icons/generated/figmaIcons.ts and are what the More rows (2102:2711 rows 2-3) that OPEN these sheets draw.
- App: telegram-sheet.tsx:55-68 hand-draws a 14pt paper plane in #2AABEE; youtube-sheet.tsx:50-58 a 14pt red #FF3B30 rect; share-sheet.tsx:131-143 draws the same plane again in gold200 — three renderings of one brand, none from the file. Other share platforms (Facebook/Threads/Snapchat/X/Instagram) have no Figma glyph and are approximations ("approximated with monoline strokes", 154).
- Fix: <FigmaIcon name="MoreTelegram" size={18} color={KhazainColors.cream50}/> and <FigmaIcon name="MoreYoutube" .../> in the 32pt navy disc for both sheets and the share sheet's Telegram row; keep the drawn marks only for platforms the file lacks, all in one tint (cream50).
- Files: app/telegram-sheet.tsx, app/youtube-sheet.tsx, app/share-sheet.tsx
- Blast radius: The three sheets.

### NOFRAME-21 (high, icon) — Row glyphs (14 hand-drawn icons)
- Frame: contract (no Figma frame) app/(tabs)/more/settings.tsx (الإعدادات)
- Figma: The More row (2102:2711) carries a 20pt Figma glyph in the 48pt squircle (app/(tabs)/more/index.tsx:19, 133-148). Glyphs with the same meaning exist in the file: MoreAbout (2106:2291, info) for «حول التطبيق»; MoreWeb (2106:2219, globe) for «اللغة»; LibraryReminders (2095:1608, bell) for «الإشعارات»; LibraryWird (2095:1620) for «هدف الورد اليومي»; DawahShare (2548:1111) or LibraryNotes (2095:1632) for «تصدير الملاحظات».
- App: Every row uses a hand-drawn 1.5pt outline SVG at 28pt (settings.tsx:446-645: QiraaIcon, ReciterIcon, WirdGoalIcon, FontSizeIcon, GlobeIcon, AboutIcon, PrivacyIcon, RestoreIcon, TrashIcon, BellIcon, PrayerTimesIcon, ExportIcon, CommunityIcon) — a different family (outline vs the file's filled/bulk glyphs) and 8pt larger than the More list's 20pt glyphs in the same chip. AboutIcon is also reused for the two dev rows and muted members. settings-notifications.tsx:209-251 repeats BellIcon/ClockIcon at 28.
- Fix: Use FigmaIcon for the five rows with a file glyph (sizes 20, color navy800); keep drawn glyphs only for rows the file has no mark for (qira'a, reciter, font size, privacy, cache, restore, prayer, community), redrawn at 20pt in a filled style, and share one SETTINGS_GLYPH = MORE_GLYPH constant.
- Files: app/(tabs)/more/settings.tsx, app/settings-notifications.tsx, app/(tabs)/more/index.tsx
- Blast radius: Settings list and notifications modal.

### NOFRAME-27 (high, icon) — Reciter preview play / stop glyph
- Frame: contract (no Figma frame) components/khazain/onboarding/PreviewButton.tsx
- Figma: Play (vuesax/bulk/play, node 2001:15652) is MIRRORED on 16/16 instances in the file ("playback runs right to left", FigmaIcon.tsx doc); Pause is node 2001:15578. ReciterSurahRow.tsx:48 and MiniPlayer.tsx:166-170 use FigmaIcon Play mirrored / Pause.
- App: Uses the hand-drawn PlayIcon/PauseIcon from components/khazain/icons/index.tsx (PreviewButton.tsx:4, 40-42) and explicitly does not mirror (comment 18, 50-51) — the only play triangle in the app pointing right.
- Fix: <FigmaIcon name="Play" size={18} color={navy800} mirrored/> and <FigmaIcon name="Pause" size={18} color={cardBg}/>.
- Files: components/khazain/onboarding/PreviewButton.tsx
- Blast radius: Onboarding reciter step.


## T26 — Search, notes, sheets, settings, onboarding: tokens, sizes, colours

### NOFRAME-07 (high, colour) — «مسح» clear-recents link and «الأقسام» no-results button
- Frame: contract (no Figma frame) app/content-search.tsx (search)
- Figma: No frame. Contract: text must be readable; the Figma link colour for an inline action is goldAccent #A88051 (HomeSectionHeader «عرض الكل», node 2001:940) and primary CTAs are navy800 (PillButton navy).
- App: clearAllText textStyle(cardTitle,{color: gold200}) (content-search.tsx:365) — #E8C78A on pageBg #F8F2ED = 1.46:1. sectionsButton gold200 fill with cream50 label (389-396) = 1.56:1. Both effectively unreadable.
- Fix: clearAllText color KhazainColors.goldAccent (matching عرض الكل); replace the Sections button with <PillButton variant="navy" label="الأقسام"/>.
- Files: app/content-search.tsx
- Blast radius: Search only.

### NOFRAME-10 (medium, font-size) — Result row typography, box and title shrink-wrap
- Frame: contract (no Figma frame) components/khazain/search/SearchResultRow.tsx
- Figma: Row geometry is borrowed from CARD_DENSITY.reciterRowMinHeight (Figma 2031:6193 reciter row: 56 tall, radius 12, #D9D6D3 hairlineWarm, title bodyCompact 14, subtitle caption 12). CLAUDE.md: do not shrink-wrap Arabic titles on Android.
- App: title TheSansArabic 15/600 (79-86), subtitle TheSansArabic 13 regular (87-94), meta TheSansArabic 12/600 (102-109) — none is a role, 600 is not a role weight. Box radius 16 + cardBorder (59-65) vs the reciter row's 12 + hairlineWarm. body alignItems:'flex-end' (77) shrink-wraps the title (Android 15 last-word loss).
- Fix: title textStyle('cardTitle'), subtitle textStyle('caption',{color: inkSubtle}), meta textStyle('label'); body alignItems:'stretch'; borderRadius CARD_DENSITY.reciterRowRadius, borderColor KhazainColors.hairlineWarm.
- Files: components/khazain/search/SearchResultRow.tsx
- Blast radius: Search + Library saved rows.

### NOFRAME-11 (medium, size) — Suggestion chips
- Frame: contract (no Figma frame) components/khazain/search/SuggestionChips.tsx
- Figma: MIN_TOUCH_TARGET 44 (constants/layout.ts); chip labels elsewhere use textStyle('label') (QuickChip, Figma 2001:940).
- App: chip height 32 (60) with no hitSlop — 32pt target; chipText TheSansArabic 13/600 (69-74) with no RTL_TEXT; border literal rgba(141,107,52,0.12).
- Fix: hitSlop={{top: 6, bottom: 6}} on each chip (keeps the 32 visual); chipText textStyle('label',{color: ink900, textAlign: 'center'}); borderColor KhazainColors.cardBorder.
- Files: components/khazain/search/SuggestionChips.tsx
- Blast radius: Search idle and no-results states.

### NOFRAME-14 (medium, radius) — حفظ button, note field and «آخر الملاحظات» rows vs the Library quick-note card
- Frame: contract (no Figma frame) app/note-editor.tsx (note sheet)
- Figma: Library quick-note (2031:4659): save 36 tall, radius 8, padH 16 (library.tsx:844-852); field radius 16 + hairlineWarm (NOTE_FIELD, libraryLayout.ts:67); recent note = 36pt card radius 8, cardBg, no stroke (RECENT_NOTE_ROW 64), title cardTitle ink500, time label ink500.
- App: saveBtn radius 10, padding 11x28 (329-336); bodyCard border cardBorder (311-319); recentRow radius 12 + cardBorder + KhazainShadows.card + padding 14x12 (351-361, 204); recentTitle ink900 (364), recentTime caption ink400 (362); saveLabel/deleteLabel literal #fff / #B43838.
- Fix: Reuse the Library values: saveBtn {height 36, paddingHorizontal 16, borderRadius 8}; bodyCard borderColor hairlineWarm; recentRow {height 36 (minHeight when a ref label shows), borderRadius RECENT_NOTE_ROW.radius, no border/shadow}; recentTitle ink500, recentTime textStyle('label',{color: ink500}); saveLabel color pageBg.
- Files: app/note-editor.tsx, components/khazain/library/libraryLayout.ts
- Blast radius: Note editor only.

### NOFRAME-15 (medium, font-size) — Note row title size across the three note surfaces
- Frame: contract (no Figma frame) app/notes-viewer.tsx, app/note-editor.tsx, components/khazain/notes/LinkedNotesSection.tsx
- Figma: Library frame 2031:4659 sets a note title at cardTitle 14 (library.tsx:874).
- App: notes-viewer rowTitle textStyle('sectionTitle') 16 (notes-viewer.tsx:167) while note-editor recentTitle (note-editor.tsx:364) and LinkedNotesSection noteTitle (LinkedNotesSection.tsx:81) are cardTitle 14 — the same note row at two sizes one tap apart.
- Fix: notes-viewer rowTitle -> textStyle('cardTitle',{color: ink900}).
- Files: app/notes-viewer.tsx
- Blast radius: Notes viewer only.

### NOFRAME-17 (low, decoration) — Drag handle, top radius, backdrop, side padding
- Frame: contract (no Figma frame) sheet chrome (settings-*.tsx, note-editor, notes-viewer, SheetShell)
- Figma: No frame; contract is one visual language. Four implementations disagree.
- App: Handle: 44x4 rgba(40,30,19,0.18) in all eight settings-* modals; 48x4 rgba(120,100,80,0.25) in note-editor.tsx:295-300 and notes-viewer.tsx:139-144; 38x4 rgba(141,107,52,0.25) in SheetShell.tsx:65-72. Top radius 24 (note sheets) vs 22 (SheetShell). Backdrop rgba(20,30,30,0.35) (note sheets) vs rgba(20,15,8,0.45) (SheetShell). Side padding 18 (SheetShell, note sheets) vs 16 elsewhere (off the 4/8/12/16/20 scale).
- Fix: Add SHEET_CHROME to constants/layout.ts {handleWidth 44, handleHeight 4, handleColor: rgba of inkTitle at 0.18 via withAlpha, topRadius 24, backdrop, paddingHorizontal 16} and spread it in all four places (or extract a SheetHandle primitive).
- Files: components/khazain/sheets/SheetShell.tsx, app/note-editor.tsx, app/notes-viewer.tsx, app/settings-qiraa.tsx, app/settings-reciter.tsx, app/settings-font-size.tsx, app/settings-about.tsx, app/settings-notifications.tsx, app/settings-prayer.tsx, app/settings-wird-goal.tsx, app/settings-wird-reminder.tsx, constants/layout.ts
- Blast radius: All modal sheets; purely visual.

### NOFRAME-19 (medium, font-size) — Sheet row typography and box
- Frame: contract (no Figma frame) components/khazain/sheets/SheetRow.tsx + app/share-sheet.tsx ShareRow
- Figma: Roles: titles TheSansArabic Bold at scale sizes (14 cardTitle / 16 sectionTitle), prose TheMixArab Regular (caption 12). Radii 4/8/12/16/999.
- App: SheetRow title TheSansArabic 15/700 and sub TheSansArabic 12 regular, no lineHeight (SheetRow.tsx:95-110); share-sheet re-implements the same row (ShareRow, share-sheet.tsx:105-129, 209-246) with label textStyle('sectionTitle') 16 — sibling sheets at 15 vs 16. Both radius 14, literal border rgba(141,107,52,0.10) and literal shadow.
- Fix: SheetRow title textStyle('cardTitle'), sub textStyle('caption',{color: ink500}); borderRadius KhazainRadius.lg (16, matching the More card), borderColor KhazainColors.cardBorder, shadow KhazainShadows.listRow. Make share-sheet render <SheetRow/> instead of ShareRow.
- Files: components/khazain/sheets/SheetRow.tsx, app/share-sheet.tsx
- Blast radius: Telegram/YouTube/Share sheets.

### NOFRAME-22 (medium, radius) — Toggle row card drawn differently from the rows beside it
- Frame: contract (no Figma frame) components/khazain/settings/SettingsToggleRow.tsx (+ StatusRow in settings.tsx)
- Figma: The rows it sits beside (ListRowCard variant="more" / SettingsValueRow) are node 2102:2711: 82 min, radius 16, 1pt #F1E7DD hairlineCream, listRow shadow (0.06, r2, y+1), inset 16, 48pt squircle r16, title+subtitle bodyCompact 14.
- App: SettingsToggleRow card radius 20, padding 14/12, cardBorder, KhazainShadows.card (28-57); chip 48 r24 = circle (61-69); title TheSansArabic 16 lineHeight 22 weight 600 (75-83: off-role weight, and 22 < the 24 leading floor so marks can clip); description TheSansArabic 13 regular (84-91: prose in the display face, 13 off-scale). StatusRow (settings.tsx:649-671) repeats r16/cardBorder/card shadow/circle chip with a bodyCompact title. Visible in Settings › المجتمع and every row of settings-notifications.
- Fix: Card: CARD_DENSITY.moreCardHeight/moreCardRadius/moreCardPaddingHorizontal, hairlineCream, KhazainShadows.listRow, gap 16; chip moreChipSize/moreChipRadius; title textStyle('bodyCompact',{color: inkTitle}); description textStyle('bodyCompact',{color: inkSubtle}). Same for StatusRow.
- Files: components/khazain/settings/SettingsToggleRow.tsx, app/(tabs)/more/settings.tsx
- Blast radius: Settings community section, settings-notifications.

### NOFRAME-25 (medium, size) — تخطّي / رجوع tap targets
- Frame: contract (no Figma frame) components/khazain/onboarding/OnboardingFooter.tsx
- Figma: MIN_TOUCH_TARGET 44 (constants/layout.ts).
- App: Bare Text links (14pt, natural line ~21) with hitSlop 8 (48-64) => ~37pt tall target; secondaryRow minHeight 28 (84).
- Fix: Give each Pressable minHeight: MIN_TOUCH_TARGET, minWidth 44, justifyContent center (keep hitSlop horizontal), secondaryRow minHeight 44.
- Files: components/khazain/onboarding/OnboardingFooter.tsx
- Blast radius: Onboarding footer.

### NOFRAME-26 (medium, colour) — Inactive step dots
- Frame: contract (no Figma frame) components/khazain/onboarding/OnboardingProgress.tsx
- Figma: Non-text UI needs visible contrast; cardBorder is a 10% hairline token, not a fill.
- App: dot backgroundColor KhazainColors.cardBorder = rgba(141,107,52,0.10) (58-63) on pageBg #F8F2ED — about 1.1:1, the upcoming steps are effectively invisible.
- Fix: Inactive dots KhazainColors.cream400 (#D9C6A3) or goldBar at 0.4.
- Files: components/khazain/onboarding/OnboardingProgress.tsx
- Blast radius: Onboarding.

### NOFRAME-28 (medium, font-size) — Wird target input digits, type scale, colours
- Frame: contract (no Figma frame) app/(tabs)/more/settings-progress.tsx (إعدادات التقدّم)
- Figma: MIN_BODY_SIZE 12 (typography.ts:39); Arabic-Indic digits app-wide; settings-wird-goal.tsx:100-101 shows the same value via toArNum/fromArabicDigits.
- App: TextInput value={draft} raw (draft = String(currentTarget), line 44/117) -> the field shows Latin «10» while the placeholder and hint are Arabic-Indic; hint and error at 11pt (238-251) below the 12 floor; cardTitle Amiri-Bold 16, cardBody TheSansArabic 12/20 regular prose, input TheSansArabic 18, buttons TheSansArabic 13/700 (192-278); card radius 18 (183, off-scale); literal #C04A3A, #fff, rgba(176,52,40,0.18).
- Fix: value={toArabicDigits(draft)} with onChangeText={(t)=>setDraft(fromArabicDigits(t).replace(/[^0-9]/g,''))}; hint/error textStyle('caption'); cardTitle textStyle('sectionTitle',{color: navy800}); cardBody textStyle('caption'); buttons textStyle('cardTitle',{color: pageBg}); radius KhazainRadius.lg; reds from a new KhazainColors.danger (NOFRAME-29).
- Files: app/(tabs)/more/settings-progress.tsx
- Blast radius: This screen; note it duplicates settings-wird-goal with a different look (product decision).

### NOFRAME-29 (medium, colour) — Danger / error red
- Frame: contract (no Figma frame) theme tokens
- Figma: KhazainColors has no error token (community/index.tsx:256 says so).
- App: Three reds: #B43838 (note-editor.tsx:343 delete), #C04A3A (settings-progress.tsx:228/246/270), Colors.light.error #D94040 (legacy palette, community create/join/index/group, Composer.tsx:117, community-report-sheet.tsx:260).
- Fix: Add KhazainColors.danger (one value, e.g. #B43838) + dangerBorder via withAlpha; replace all three.
- Files: constants/theme.ts, app/note-editor.tsx, app/(tabs)/more/settings-progress.tsx, app/(tabs)/more/community/index.tsx, app/(tabs)/more/community/create.tsx, app/(tabs)/more/community/join.tsx, app/(tabs)/more/community/group/[id].tsx, components/khazain/community/Composer.tsx, app/community-report-sheet.tsx
- Blast radius: Error copy and destructive buttons only.

### NOFRAME-30 (low, copy) — Version / build numerals, app name, insets
- Frame: contract (no Figma frame) app/settings-about.tsx (حول التطبيق)
- Figma: Arabic-Indic digits app-wide; the app name is a brand mark with a Wordmark primitive (components/khazain/primitives/Wordmark.tsx).
- App: version «1.0.0» and build rendered in Latin digits (61, 65); appName Amiri-Bold 22 (127-134, off-scale) instead of <Wordmark/>; card paddingHorizontal 18 (120, 157 off-scale); licence link is a 20pt text with hitSlop 8 = 36pt; data credit mixes «Quran Metadata 1.0» Latin with ٢٠٠٨ (constants/quranPages.ts:42 — attribution, may stay).
- Fix: toArabicDigits(version) / toArabicDigits(build) wrapped in LRI…PDI as formatClockTime does; <Wordmark size={22} color={navy900}/>; paddingHorizontal 16; licence Pressable minHeight 44.
- Files: app/settings-about.tsx
- Blast radius: About modal.

### NOFRAME-31 (low, other) — Primary «تطبيق» / locate buttons
- Frame: contract (no Figma frame) settings-font-size / wird-goal / wird-reminder / prayer
- Figma: Primary buttons elsewhere are PillButton variant navy (onboarding footer, community, ErrorState).
- App: Each modal hand-builds the pill: navy, r999, padV 14, label textStyle(sectionTitle,{color:'#fff'}) (settings-font-size.tsx:170-177, settings-wird-goal.tsx, settings-wird-reminder.tsx, settings-prayer.tsx locateBtn) — while PillButton labels are TheSansArabic 14/600 in cream100. Two primary-button looks; #fff literal; footer rule literal rgba(141,107,52,0.12).
- Fix: Use <PillButton variant="navy" label="تطبيق" style={{width:'100%'}}/> and fix PillButton's label to textStyle('cardTitle') (NOFRAME-36); footer rule KhazainColors.cardBorder.
- Files: app/settings-font-size.tsx, app/settings-wird-goal.tsx, app/settings-wird-reminder.tsx, app/settings-prayer.tsx, components/khazain/primitives/PillButton.tsx
- Blast radius: Settings modals.

### NOFRAME-32 (low, colour) — Untokenised fills
- Frame: contract (no Figma frame) FontSizePreview + settings-notifications banner
- Figma: CLAUDE.md Theme conventions: colours are named once in KhazainColors.
- App: FontSizePreview frame backgroundColor '#FBF3DF' (FontSizePreview.tsx:29); permission banner '#FCE9D6' (settings-notifications.tsx:279); settings-notifications noteCard radius 14 + border rgba(141,107,52,0.18) (269-276).
- Fix: Use KhazainColors.cream200 / heroCream (or add a named token); noteCard radius KhazainRadius.md, border cardBorder.
- Files: components/khazain/settings/FontSizePreview.tsx, app/settings-notifications.tsx
- Blast radius: None beyond the two screens.

### NOFRAME-37 (low, copy) — Dev-only section copy
- Frame: contract (no Figma frame) app/(tabs)/more/settings.tsx
- Figma: No English copy in the UI (CLAUDE.md RTL section).
- App: Section title «مطوّر (Dev)» and row «إرسال حدث تجريبي إلى Sentry» (280, 290) carry Latin words; the two ListRowCards there are mis-indented (281-282, 288-289). __DEV__ only.
- Fix: Title «للمطوّرين»; row «إرسال حدث تجريبي لتسجيل الأعطال». Cosmetic; not visible in production.
- Files: app/(tabs)/more/settings.tsx
- Blast radius: Dev builds only.


