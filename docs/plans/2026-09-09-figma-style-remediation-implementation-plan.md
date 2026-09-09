# Figma Style Remediation — Implementation Plan

**Date:** 2026-09-09  
**Status:** Proposed — do not implement or commit until user approves  
**Goal:** Satisfy every requirement in `docs/plans/2026-09-09-figma-style-remediation-design.md` and close all 28 audited Figma findings on iOS and Android.

## Audit evidence used by this plan

The permanent visual baseline is catalogued in [`docs/audit/2026-09-09`](../audit/2026-09-09/README.md):

- [key comparison sheet](../audit/2026-09-09/key-comparisons.png);
- [28 Figma reference frames](../audit/2026-09-09/figma-reference/);
- [22 app captures](../audit/2026-09-09/app-captures/);
- [20 side-by-side comparisons](../audit/2026-09-09/comparisons/);
- [device captures](../audit/2026-09-09/device-captures/);
- [Figma](../audit/2026-09-09/figma-contact-sheet.png) and [app](../audit/2026-09-09/app-contact-sheet.png) contact sheets.

Every task with a visual check must use the relevant numbered Figma PNG as its reference and inspect the existing comparison pair when available. The saved audit files are immutable starting-state evidence; corrected screenshots belong in the new visual-regression output introduced by Task 0.2.

## Execution rules

- Work on a user-approved feature branch, not `main`/`master`.
- Tasks are dependency ordered and sized for roughly 30 minutes to 2 hours.
- Each task follows: failing test/check → verify failure → minimum implementation → targeted pass → broader pass → visual capture where applicable.
- After each task, run specification review before code-quality review.
- The commit messages below are proposals only. This repository treats commits as user-authorized actions.
- Preserve unrelated dirty-worktree changes. Never revert a file wholesale.
- Do not add a visual-testing dependency without user approval. Use existing Jest, TypeScript, `sharp`, `adb`, and `simctl` capabilities first.
- Do not replace or edit files under `docs/audit/2026-09-09`; they document the audited baseline.

## Standard verification commands

Run the smallest targeted command listed by each task, then:

```bash
npm test -- --runInBand
npx tsc --noEmit --pretty false
npx eslint <touched-files>
```

Full `npm run lint` may still report the documented legacy `browse.tsx` issues; no touched file may add a new violation.

Native visual checks:

```bash
EXPO_HOME=/tmp/khazayin-expo EXPO_NO_TELEMETRY=1 \
  SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios --device 'iPhone 16'

ANDROID_HOME="$HOME/Library/Android/sdk" \
ANDROID_SDK_ROOT="$HOME/Library/Android/sdk" \
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
EXPO_HOME=/tmp/khazayin-expo EXPO_NO_TELEMETRY=1 \
SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:android --device Pixel_7_API_36 --no-bundler
```

The execution agent must adapt the Android `JAVA_HOME` to the verified local installation and must not add machine-specific paths to committed source.

---

## Phase 0 — Freeze the audit contract

### Task 0.1: Add the 28-frame screen manifest

**Files:**

- Create: `docs/visual-regression/figma-mobile-screen-map.json`
- Create: `__tests__/figmaScreenCoverage.test.ts`
- Reference: `docs/plans/2026-09-09-figma-style-remediation-design.md`

**Specification:**

The manifest contains one record for every Figma node with:

```ts
type FigmaScreenRecord = {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  appRoute: string | null;
  state?: Record<string, string>;
  status: 'implemented' | 'missing-route' | 'transition';
};
```

Include exactly the 28 nodes listed in the design specification. Represent tab states and Mushaf query state explicitly; do not pretend they are separate file routes.

**Test first:**

- Assert exactly 28 unique node IDs.
- Assert every non-transition frame has an app route or is marked `missing-route`.
- Assert the expected four splash nodes, Home, Library, 18 Section frames, and four More frames are present.

**Expected targeted command:**

```bash
npm test -- figmaScreenCoverage --runInBand
```

**Proposed commit:** `test(ui): freeze 28-frame Figma parity manifest`

### Task 0.2: Add repeatable native capture helpers

**Files:**

- Create: `scripts/visual-audit/capture-android.mjs`
- Create: `scripts/visual-audit/capture-ios.mjs`
- Create: `scripts/visual-audit/README.md`
- Modify: `package.json` with non-destructive capture scripts only
- Test: `scripts/visual-audit/__tests__/routeManifest.test.ts`

**Specification:**

- Read the manifest from Task 0.1.
- Navigate to deep-linkable routes, wait for an explicit settle timeout, and capture PNGs.
- Never clear app user data automatically.
- Skip interaction-only states with a clear message; document the manual tap sequence for them.
- Store output in a user-selected or `/tmp` directory, not committed binaries.
- Add optional masking metadata for time, signal, battery, and Android navigation areas.
- Exit non-zero when a required emulator/simulator is unavailable or a capture is missing.

**Test first:** route-to-filename normalization, query preservation, and transition-state skipping.

**Proposed commit:** `test(ui): add repeatable iOS and Android capture harness`

---

## Phase 1 — Correct the shared RTL shell

### Task 1.1: Define and test the physical RTL layout convention

**Files:**

- Modify: `constants/layout.ts`
- Modify: `__tests__/responsiveLayout.test.ts`
- Modify selectively: `app/_layout.tsx`
- Document: `CLAUDE.md` RTL section

**Specification:**

- Keep `allowRTL(true)` and `forceRTL(true)`.
- Do not change global left/right swapping.
- Export minimal constants/helpers that distinguish:
  - RTL text direction;
  - physically authored left-to-right rows;
  - logical leading/trailing placement.
- Document that manually ordered physical rows must set explicit `direction: 'ltr'`.
- Do not build a large layout abstraction; the helper must only prevent repeated contradictory direction logic.

**Test first:** validate bottom-tab physical order and supported width profile boundaries (320, 375, 393, 430, 480).

**Acceptance:** the convention is unambiguous enough that all later primitives can use it without reading `I18nManager.isRTL` during module initialization.

**Proposed commit:** `fix(ui): establish deterministic physical RTL layout contract`

### Task 1.2: Match the Figma bottom navigation

**Files:**

- Modify: `components/khazain/primitives/CustomTabBar.tsx`
- Modify: `constants/layout.ts`
- Modify: `__tests__/responsiveLayout.test.ts`

**Specification:**

- Physical order left → right: More, Sections, Library, Home on both platforms.
- At width 393:
  - bar total reference height 83;
  - controls row 49;
  - active item 67 × 49, radius 8;
  - active fill `rgba(215,185,149,0.16)`;
  - gold indicator 40 × 4;
  - icon 24;
  - active label remains cream, not dark text on a large cream panel.
- Add safe-area bottom exactly once.
- Preserve MiniPlayer placement and tab accessibility state.
- All four root routes show the bar; secondary routes remain governed by `shouldShowMainTabBar`.

**Test first:** tab order, root-route visibility, active geometry constants, and safe-area arithmetic.

**Visual check:** Home, Library, Sections, and More at 393 and 411 widths.

**Proposed commit:** `fix(nav): match Figma RTL tab order and active-state geometry`

### Task 1.3: Correct shared row, header, rail, and footer placement

**Files:**

- Modify: `components/khazain/primitives/ListRowCard.tsx`
- Modify: `components/khazain/primitives/LectureCard.tsx`
- Modify: `components/khazain/primitives/ReciterRow.tsx`
- Modify: `components/khazain/primitives/InlineHeader.tsx`
- Modify: `components/khazain/primitives/DetailHeader.tsx`
- Modify: `components/khazain/primitives/LetterIndex.tsx`
- Modify: `app/(tabs)/sections/mushaf.tsx`
- Test: `__tests__/rtlVisualContracts.test.ts`

**Specification:**

- ListRowCard: disclosure physical left, text middle/right-aligned, icon disc physical right.
- LectureCard: duration/actions physical left, text middle/right-aligned, section badge physical right.
- ReciterRow: disclosure physical left, text then Quran badge physical right.
- Inline/Detail headers: title group anchored physical right; back chevron points right and does not jump sides under RTL swapping.
- LetterIndex: fixed to physical right with its own reserved content inset.
- Mushaf footer: Index left, Go to bookmark center, Save bookmark right.
- Apply physical placement through explicit container direction/logical edges, not platform branches.

**Test first:** pure physical-order arrays and footer/button semantic order. Add accessibility-label assertions at the data/contract layer.

**Visual check:** Sections, Scholars, Qiraa, and Mushaf reader on both platforms.

**Proposed commit:** `fix(rtl): correct shared physical placement across list and reader primitives`

---

## Phase 2 — Shared geometry and visual tokens

### Task 2.1: Fix SegmentTabs vertical expansion

**Files:**

- Modify: `components/khazain/primitives/SegmentTabs.tsx`
- Modify: `app/(tabs)/sections/reciter.tsx` only if the parent also needs correction
- Test: `__tests__/responsiveLayout.test.ts`

**Specification:**

- Horizontal scroller has `flexGrow: 0` or an equivalent content-bounded height.
- Tabs sit immediately below Search with the Figma 6–8 pt spacing.
- The list begins immediately below tabs.
- Tab content is scrollable horizontally at width 320 and does not wrap.
- Initial selected tab is physically rightmost; order does not reverse between iOS and Android.
- Letter rail begins at the first list row, not at the top of the screen.

**Test first:** exported tab-strip height/spacing constraints and order.

**Visual check:** nodes `2031:6193` and `2102:3187` at 320, 393, and 411 widths.

**Proposed commit:** `fix(reciters): constrain segmented tab strip and remove vertical void`

### Task 2.2: Match shared card density

**Files:**

- Modify: `components/khazain/primitives/LectureCard.tsx`
- Modify: `components/khazain/primitives/ReciterRow.tsx`
- Modify: `components/khazain/primitives/ListRowCard.tsx`
- Modify: `components/khazain/primitives/RibbonCard.tsx` if used by mapped frames
- Modify: `components/khazain/primitives/DawahPosterRow.tsx`
- Modify: relevant skeleton components under `components/khazain/state/`
- Modify: `constants/theme.ts` and `constants/layout.ts`
- Test: `__tests__/responsiveLayout.test.ts`

**Specification:**

- Section cards remain approximately 96 pt high at 393 width with a 64 pt icon disc.
- Standard lecture cards target 64–68 pt visual height for one-line mock content; no 84 pt minimum unless the Figma state requires two lines.
- Reciter and Qiraa rows target 56–64 pt.
- Vertical list gap is 8 pt unless the frame demonstrates 10.
- Android elevation/shadow must be visually as subtle as iOS/Figma.
- Skeleton rows use the same final heights and gaps.
- Maintain 44 pt minimum touch targets independently from visual padding.

**Test first:** width-profile geometry functions and minimum touch-size invariants.

**Visual check:** Prophet, Queen, Radio, Scholars, Qiraa, and Sections.

**Proposed commit:** `fix(ui): align shared card density and skeleton geometry with Figma`

### Task 2.3: Resolve typography parity

**Files:**

- Modify: `app/_layout.tsx`
- Modify: `constants/theme.ts`
- Modify: mapped components that use ad hoc font families/sizes
- Optional user-supplied assets: `assets/fonts/TheSansArabic*.ttf`, `assets/fonts/TheMixArab*.ttf`
- Test: `__tests__/fontRegistry.test.ts`

**Specification:**

- Centralize registered family names and verify every mapped style references a registered alias.
- Keep Amiri for display headers where Figma uses it.
- Until licensed files exist, retain explicit Noto aliases and label screenshot results “typography provisional.”
- When licensed files are supplied, replace alias targets without changing component family names.
- Tune line height and weight per shared component, avoiding Android synthetic-bold clipping.

**Test first:** font registry contains every family used by mapped components and every required asset resolves.

**External gate:** final pixel typography cannot be marked complete without licensed fonts or explicit user approval of the substitute.

**Proposed commit:** `fix(type): centralize Arabic font registration and reference metrics`

### Task 2.4: Normalize colors, shadows, and ornament coverage

**Files:**

- Modify: `constants/theme.ts`
- Modify: `components/khazain/patterns/*`
- Modify: mapped screen wrappers using full-screen `OrnamentPattern`
- Test: `__tests__/designTokens.test.ts`

**Specification:**

- Lock the Figma navigation, page, card, ink, gold, and active-tab colors.
- Reduce heavy Android borders/elevation.
- Add pattern variants for corner/header/full-frame treatments instead of one full-screen tile everywhere.
- More, Contact, About, Dawah, and Archive must use the Figma-specific pattern opacity and coverage.
- Specialized Mushaf colors remain local tokens.

**Test first:** exact color values and allowed pattern variants.

**Proposed commit:** `fix(theme): align Figma colors shadows and ornament treatments`

---

## Phase 3 — Root tab screens

### Task 3.1: Finish Home parity (`2001:940`)

**Files:**

- Modify: `app/(tabs)/index.tsx`
- Modify: `components/khazain/home/HomeHeader.tsx`
- Modify: `components/khazain/home/HeroQuran.tsx`
- Modify: `components/khazain/home/HeroProphet.tsx`
- Modify: `components/khazain/home/HomeSectionHeader.tsx`
- Modify: `components/khazain/home/{ScholarCard,BookCard,QuickChip,QueenCard,DawahCarousel}.tsx`
- Add/re-export Figma art under `assets/khazain/home/` only when existing assets cannot reproduce the frame
- Test: existing responsive tests plus Home content-order test

**Specification:**

- Preserve dynamic date and notification behavior.
- Match reference order, gutters, vertical rhythm, hero heights, art crop, heading/divider placement, and carousel card widths.
- Quran hero must remain readable at 320 width without distorting art.
- Prophet hero composition must match Figma rather than displaying the current extra-dominant right illustration.
- Quick chips route to Radio, Audiobooks, and Exclusives once those routes exist.
- Home bottom bar passes Task 1.2 contract.

**Test first:** ordered section model and responsive carousel width at all width profiles.

**Visual check:** full initial viewport and full scroll frame at iPhone 16 and Pixel 7.

**Proposed commit:** `fix(home): match Figma hero composition and section rhythm`

### Task 3.2: Recompose Library parity (`2031:4659`)

**Files:**

- Modify: `app/(tabs)/library.tsx`
- Modify: `components/khazain/library/*`
- Test: `__tests__/libraryPresentation.test.ts`

**Specification:**

Reference order:

1. title and Search;
2. Reminders, Quran Wird, Notes summary cards in Figma RTL order;
3. daily Wird card;
4. Quick Note and recent notes;
5. reference count/filter group;
6. audiobook progress cards;
7. smart-reminder cards.

Move the newer `InsightRow`, trend/history, and adaptive suggestions so they do not displace the reference hierarchy. They may appear below the reference sections or inside the History filter. Preserve all real progress, note, reminder, and player behavior.

**Test first:** a pure presentation-order model and visibility rules for `all`, `saved`, `notes`, and `history` filters.

**Visual check:** initial viewport plus full 1891-point scroll reference.

**Proposed commit:** `fix(library): restore Figma hierarchy without dropping live progress features`

### Task 3.3: Finish Sections root parity (`2031:5675`)

**Files:**

- Modify: `app/(tabs)/sections/index.tsx`
- Modify: `data/content/sections.ts`
- Modify: section icon mapping under `components/khazain/icons/`
- Test: `data/content/__tests__/sectionPresentation.test.ts`

**Specification:**

- Nine Figma sections in exact order and copy for the mock adapter.
- Add real routes for Audiobooks and Exclusives in later tasks; fail the coverage test until they exist.
- Header is physical right, Search below, cards follow with 8 pt gap.
- Use the exact Figma count strings in mock mode; API counts may differ.

**Test first:** mock order, unique IDs, Figma copy/counts, and non-null route requirement.

**Proposed commit:** `fix(sections): match Figma section order copy and RTL cards`

---

## Phase 4 — Section routes and missing states

### Task 4.1: Complete reciter tabs and reciter-audio Surah flow

**Files:**

- Modify: `app/(tabs)/sections/reciter.tsx`
- Create: `app/(tabs)/sections/reciter/[id].tsx` or a typed equivalent route
- Create: `components/khazain/sections/ReciterSurahRow.tsx`
- Modify: `data/content/quran.ts`
- Modify: reciter/content stores only as needed
- Test: `__tests__/reciterNavigation.test.ts`, content integrity tests

**Specification:**

- Default and Murattal states match nodes `2031:6193` and `2102:3187`.
- `onPickReciter` passes the selected reciter ID; it must not ignore the item.
- Non-Qiraa reciters open node `2207:5270` equivalent: a Surah list for listening with reciter identity preserved.
- Qiraa tab may continue to open `/sections/qiraat`.
- Provide deterministic mock reciters/Surahs and a no-audio state that stays on the same route.
- Wire playback through the existing audio boundary; do not duplicate player state.

**Test first:** reciter → correct route with ID; Qiraa → Qiraa route; missing audio → non-crashing empty state.

**Proposed commit:** `feat(reciters): add Figma reciter-specific Surah listening flow`

### Task 4.2: Finish Mushaf index, transition, reader, and Qiraa parity

**Files:**

- Modify: `app/(tabs)/sections/mushaf.tsx`
- Modify: `app/(tabs)/sections/qiraat.tsx`
- Modify: `components/khazain/sections/SurahRow.tsx`
- Modify: relevant Quran content/store fixtures
- Test: `__tests__/mushafPresentation.test.ts`, existing progress tests

**Specification:**

- Mushaf index matches node `2207:17898`.
- Reader has a stable loading/transition state matching `2349:829` intent.
- Loaded reader matches `2349:982` header/footer geometry while rendering real ayat.
- Preserve resume, progress recording, font scaling, and MiniPlayer visibility behavior.
- Qiraa screen matches `2457:954`, including compact rows and default state.
- Fix all footer and row RTL physical order.

**Test first:** route query normalization, footer semantic order, loading → success/empty/error transitions, and progress side effects unchanged.

**Proposed commit:** `fix(quran): align Mushaf and Qiraa states with Figma`

### Task 4.3: Align scholar and lecture-list screens

**Files:**

- Modify: `app/(tabs)/sections/scholar.tsx`
- Modify: `app/(tabs)/sections/scholar/[id].tsx`
- Modify: `app/(tabs)/sections/{prophet,queen,books,radio}.tsx`
- Modify: `data/content/{scholars,lectures,books}.ts` mock presentation data
- Modify: shared lecture icons only where Figma differs
- Test: `data/content/__tests__/figmaLectureFixtures.test.ts`

**Specification:**

- Match nodes `2102:2975`, `2465:1911`, `2510:1990`, `2589:1772`, `2597:2552`, and `2606:3830`.
- Reuse the compact shared LectureCard contract.
- Scholar detail includes Figma identity header and Search before its lecture list.
- Mock mode uses Figma titles/authors/durations; API mode remains data-driven.
- Tapping an audio-capable lecture retains current playback behavior.

**Test first:** fixture content/order and presentation variants by category.

**Proposed commit:** `fix(content-ui): align scholar prophet queen books and radio lists`

### Task 4.4: Repair Dawah list and month data

**Files:**

- Modify: `app/(tabs)/sections/dawah.tsx`
- Modify: `app/(tabs)/sections/dawah/[month].tsx`
- Modify: `data/content/dawah.ts`
- Modify: mock content adapter only if normalization belongs there
- Modify: `components/khazain/primitives/DawahPosterRow.tsx`
- Test: `data/content/__tests__/dawahIntegrity.test.ts`

**Specification:**

- Match nodes `2120:942` and `2120:1857`.
- Every listed month with a non-zero count has at least one mock poster.
- `shawwal-ramadan` resolves to four reference poster rows; remove the title/data-key mismatch.
- Month list and poster rows use the physical RTL contract.
- Skeleton geometry matches loaded geometry; mock load settles deterministically.

**Test first:** every month slug resolves, declared counts are internally consistent, and `shawwal-ramadan` is non-empty.

**Proposed commit:** `fix(dawah): populate reference month and align poster-list presentation`

### Task 4.5: Add Audiobooks and Exclusives routes

**Files:**

- Create: `app/(tabs)/sections/audiobooks.tsx`
- Create: `app/(tabs)/sections/exclusive.tsx`
- Create/reuse shared rows under `components/khazain/sections/`
- Modify: `data/content/sections.ts`
- Create: `data/content/audiobooks.ts`
- Create: `data/content/exclusive.ts`
- Modify: stores/content service interfaces only if the new domains need them
- Test: route coverage and fixture integrity tests

**Specification:**

- Audiobooks matches node `2869:2088`.
- Exclusives matches node `2869:2306`, including Search and physical-right letter rail.
- Both are reachable from Sections.
- Home quick chips route to them.
- Archive Audiobooks row routes to Audiobooks.
- Use deterministic mock content until backend endpoints exist; do not invent API endpoints.

**Test first:** no `route: null`, route manifest reports implemented, content arrays non-empty, Home/Archive destinations correct.

**Proposed commit:** `feat(sections): implement audiobook and exclusive Figma routes`

---

## Phase 5 — More routes

### Task 5.1: Reorder and restyle More root (`2102:2711`)

**Files:**

- Modify: `app/(tabs)/more/index.tsx`
- Modify: `data/content/sections.ts`
- Test: `data/content/__tests__/morePresentation.test.ts`

**Specification:**

Reference group order:

1. Website
2. YouTube
3. Telegram
4. WhatsApp
5. SoundCloud
6. Archive
7. Contact
8. About

Settings and Progress Settings remain available after this group. The initial viewport must begin with Website, not Settings. Apply the shared card, pattern, and tab contracts.

**Test first:** exact reference order, extension rows after reference group, and route/external-link integrity.

**Proposed commit:** `fix(more): restore Figma row hierarchy while preserving settings`

### Task 5.2: Align Contact, About, and Archive

**Files:**

- Modify: `app/(tabs)/more/contact.tsx`
- Modify: `app/(tabs)/more/about.tsx`
- Modify: `app/(tabs)/more/archive.tsx`
- Modify: shared contact/archive row primitives only if reuse is justified
- Test: `__tests__/moreDetailPresentation.test.ts`

**Specification:**

- Match nodes `2106:2598`, `2106:2712`, and `2558:1334`.
- Contact keeps keyboard avoidance and validation behavior.
- About uses the Figma paragraph/card hierarchy and compact spacing.
- Archive contains the three Figma categories and routes Audiobooks correctly.
- All headers, icons, disclosures, and text use the physical RTL contract.

**Test first:** section order, Archive destinations, and contact validation behavior unchanged.

**Proposed commit:** `fix(more): align contact about and archive detail screens`

### Task 5.3: Apply global fixes to non-Figma screens

**Files:**

- Review/modify: `app/onboarding.tsx`
- Review/modify: `app/search.tsx`
- Review/modify: `app/settings-*.tsx`
- Review/modify: `app/{note-editor,notes-viewer,telegram-sheet,youtube-sheet,share-sheet}.tsx`
- Review/modify: `app/(tabs)/more/{settings,settings-progress}.tsx`
- Modify shared settings/sheet primitives as needed
- Test: existing settings, note, notification, and onboarding tests

**Specification:**

- Do not redesign or delete these screens.
- Correct any shared RTL reversal introduced by the previous implementation.
- Apply safe-area, registered-font, color, and width-profile rules.
- Verify 320 and 480 widths plus 1.3 font scale.
- Preserve all functional behavior.

**Proposed commit:** `fix(ui): propagate RTL and responsive contracts to extension screens`

---

## Phase 6 — Launch experience

### Task 6.1: Implement the four-state splash sequence

**Files:**

- Modify: `app.json`
- Modify: `app/_layout.tsx`
- Create: `components/khazain/launch/LaunchSequence.tsx`
- Create: `components/khazain/launch/index.ts`
- Add/export optimized launch assets under `assets/khazain/launch/`
- Test: `components/khazain/launch/__tests__/launchSequence.test.ts`

**Specification:**

- Native splash uses an optimized static frame at 393:852 aspect ratio with `cover` behavior verified on tall Android phones.
- React Native overlay reproduces nodes `2001:835`, `2001:888`, `2001:914`, `2007:511`.
- It appears only on cold start and disappears after the navigator/fonts are ready.
- No Home flash occurs between native and React layers.
- Reduce Motion uses a single-state fade.
- Accessibility does not focus hidden splash elements.

**Test first:** state timing reducer, cold-start-only guard, reduce-motion path, and completion callback exactly once.

**Visual check:** screen recording on iPhone 16 and Pixel 7, including a slow cold start.

**Proposed commit:** `feat(launch): reproduce Figma splash sequence without startup flash`

---

## Phase 7 — Responsive and final parity gates

### Task 7.1: Complete responsive profile coverage

**Files:**

- Modify: `constants/layout.ts`
- Modify: `__tests__/responsiveLayout.test.ts`
- Modify only mapped components still failing narrow/wide checks

**Specification:**

Test widths 320, 360, 375, 393, 411, 430, 480, and a tablet width. Assert:

- gutters never collapse below the compact minimum;
- content width caps/centers above the phone maximum;
- carousel cards remain usable;
- icon/disclosure columns retain their reserved width;
- tabs remain horizontally scrollable;
- no bottom space is counted twice;
- card touch targets remain at least 44 pt/dp.

Use pure geometry helpers for automated tests and native screenshots for reflow behavior.

**Proposed commit:** `test(responsive): cover compact reference and wide phone profiles`

### Task 7.2: Run full 28-frame visual acceptance

**Files:**

- Update: `docs/visual-regression/figma-mobile-screen-map.json` statuses
- Create: `docs/plans/2026-09-09-figma-style-remediation-qa.md`
- No product changes unless a failed comparison opens a focused fix task

**Specification:**

For every Figma node:

1. capture the reference frame;
2. capture iPhone 16 app state;
3. capture Pixel 7 app state;
4. normalize/crop only device chrome;
5. compare side-by-side and with a 50% overlay;
6. record PASS/FAIL and the measured deviation.

Mask dynamic time/date/status indicators only. Do not mask app content, loading failures, RTL placement, or missing controls.

Also smoke-test 320 and 480 widths and 1.3 font scale for overflow.

**Acceptance:**

- all 28 rows pass or have a user-approved exception;
- no permanent loading skeleton or incorrect empty state;
- no RTL side mismatch;
- no new TypeScript/test/lint failures;
- typography gate explicitly resolved or documented;
- final contact sheets attached to the QA report.

**Proposed commit:** `docs(qa): record final iOS Android Figma parity results`

---

## Dependency and risk register

| Risk/dependency | Impact | Mitigation/gate |
|---|---|---|
| Licensed TheSansArabic/TheMixArab files unavailable | Exact typography parity impossible | Continue with aliases; require user acceptance or assets before final PASS |
| Global forced RTL plus native auto-flipping | Broad layout regression | Shared physical-direction contract; verify every primitive on both platforms |
| Existing dirty worktree | Accidental overwrite | Inspect per-file diff before edits; patch narrowly; never restore whole files |
| Figma prototype auto-advances splash | Unstable screenshot | Use local `.fig` node inventory and cold-start recording |
| Some Figma media frames render black/blank in public prototype | False visual failure | Use local frame structure/text and treat real reader content as valid substitution |
| Backend data differs from Figma mock copy | Screenshot nondeterminism | Reference fixtures live in mock adapter; API mode validates geometry only |
| New Audiobooks/Exclusives data source absent | Missing real content | Implement routes with deterministic mocks; do not invent backend endpoints |
| Splash overlay delays startup | Poor UX | Bound duration, gate on readiness, Reduce Motion path, cold-start only |
| Card compaction harms accessibility | Small targets | Separate visual density from a 44 pt press target/hitSlop |

## Milestones

1. **M1 — Shell correct:** Tasks 0.1–2.4. RTL, tabs, headers, density, fonts, and patterns corrected.
2. **M2 — Root parity:** Tasks 3.1–3.3. Home, Library, Sections match initial reference views.
3. **M3 — Route coverage:** Tasks 4.1–5.2. All content and More Figma states routable and populated.
4. **M4 — Complete app consistency:** Task 5.3 and splash Task 6.1.
5. **M5 — Signoff:** Tasks 7.1–7.2. Cross-size tests and 28-frame iOS/Android QA complete.

## Audit-finding traceability

| Finding | Closing task(s) | Final evidence |
|---|---|---|
| RTL double reversal in tabs, rows, headers, rails, and Mushaf footer | 1.1–1.3 | Both-platform screenshots; RTL contract tests |
| Bottom-tab order and oversized cream selected item | 1.2 | Four root-route captures at 393/411 |
| Reciter tabs leave a large vertical void | 2.1 | Nodes `2031:6193`, `2102:3187` comparisons |
| TheSansArabic/TheMixArab are Noto aliases | 2.3 | Font registry test and recorded asset/approval status |
| Lecture/reciter rows are too tall | 2.2, 4.3 | Content-list overlays and touch-target test |
| Android borders/shadows are too heavy | 2.2, 2.4 | iOS/Android paired captures |
| Ornament pattern is too strong/full-screen on several routes | 2.4, 4.4, 5.1–5.2 | Dawah/More/Contact/About/Archive comparisons |
| Four Figma splash states reduced to one static image | 6.1 | Cold-start recordings and Reduce Motion test |
| Home Prophet hero composition differs | 3.1 | Full Home overlay at width 393 |
| Library initial hierarchy is displaced by added metrics | 3.2 | Full 1891-point Library comparison |
| Sections root copy/count/order drift | 3.3 | Mock fixture test and node `2031:5675` capture |
| Reciter selection ignores reciter ID and opens general Mushaf | 4.1 | Navigation test and node `2207:5270` capture |
| Mushaf transition/reader/footer mismatch | 1.3, 4.2 | Nodes `2349:829`, `2349:982` comparisons |
| Qiraa adornment order/density mismatch | 1.3, 2.2, 4.2 | Node `2457:954` comparison |
| Scholars, Prophet, Queen, Books, Radio content/presentation drift | 2.2, 4.3 | Six node comparisons and fixture tests |
| `shawwal-ramadan` route renders an incorrect empty state | 4.4 | Dawah integrity test and node `2120:1857` capture |
| Audiobooks has no route | 4.5 | Coverage test and node `2869:2088` capture |
| Exclusives has no route | 4.5 | Coverage test and node `2869:2306` capture |
| More starts with non-Figma Settings rows | 5.1 | Reference-order test and node `2102:2711` capture |
| Contact/About/Archive headers, spacing, and row placement drift | 1.3, 2.4, 5.2 | Three detail comparisons |
| Extra screens lack Figma frames | 5.3 | Global RTL/responsive checklist; explicitly excluded from pixel signoff |
| Different phone sizes need validation | 0.2, 7.1–7.2 | Width matrix plus iPhone 16/Pixel 7 contact sheets |

## Estimated implementation shape

- 20 focused tasks across 8 phases.
- Highest-risk work: RTL shell, Library recomposition, reciter-audio routing, and splash handoff.
- Recommended first implementation batch: Tasks 0.1, 1.1, 1.2, 1.3, and 2.1. This removes the systemic failures before any screen-specific tuning.
