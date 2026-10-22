# CLAUDE.md — Khazain Al-Rahman app

Project-specific guidance for future Claude Code sessions. Read this before touching anything under `app/` or `components/khazain/`.

---

## What this is

Mobile app for **مؤسسة خزائن الرحمن العالمية** (Khazain Al-Rahman International Foundation). Arabic-only, RTL-first, Islamic content: Quran (Mushaf + reciters + qira'at), scholars, books, dawah design posters, personal library with notes.

> **Architecture reality (2026-06-17, keep current):** the app is **not** purely offline. Beyond SQLite, there is a full HTTP data layer (`services/api/*`, Bearer-token auth in `services/api/auth.ts`/`client.ts`), a two-tier SWR cache (`services/cache/*`), and ~12 content stores built on `createAsyncStore`/`createPaginatedStore`. It is currently **inert** — `contentService` resolves to the mock adapter because `EXPO_PUBLIC_API_BASE` is unset — so today it behaves offline, but the networked surface exists and must be accounted for before a backend is wired. **Never** commit an `EXPO_PUBLIC_API_TOKEN` (it inlines into the JS bundle); real auth tokens belong in `expo-secure-store` at runtime. **Data at rest:** notes/settings live in plaintext AsyncStorage — an accepted risk for this single-user offline app (documented; revisit with `expo-secure-store`/SQLCipher only if shared-device threat model applies).

## Stack

- **Expo SDK 54** + **React Native 0.81.5** + **React 19.1**
- **expo-router 6** (file-based routing)
- **TypeScript 5.9**
- **Zustand 5** for state (+ `zustand/middleware` persist for notes, settings)
- **expo-notifications** for local wird reminder (Phase A scheduler, single boundary in `services/notificationScheduler.ts`)
- **expo-web-browser** for in-app privacy policy link
- **expo-constants** for version / build number display
- **react-native-svg** for every icon, pattern, illustration (there are no raster icons)
- **expo-linear-gradient** for cream gradient cards
- **@react-native-async-storage/async-storage** for persisted stores
- **react-native-reanimated** (Toggle + future animations)

Dev scripts: `npm start` / `android` / `ios` / `web` / `lint`. Reset project helper at `scripts/reset-project.js`.

---

# Development Workflow

### 1. Brainstorm before writing code
- Use the brainstorming skill if available, otherwise: ask questions one at a time until you understand purpose, constraints, and success criteria.
- Propose 2–3 approaches with trade-offs. Pick one with the user.
- Save the validated design to `docs/plans/YYYY-MM-DD-<feature>-design.md`.

### 2. Re-review the design before any code
- Run a CTO/architect review against the design.
- Run a multi-perspective board review (Architect, Product, Security, Ops, UX).
- Iterate the design (v2, v3) until reviewers agree. Address every "convergent" condition (raised by 2+ reviewers).

### 3. Convert design to a bite-sized implementation plan
- Save to `docs/plans/YYYY-MM-DD-<feature>-implementation-plan.md`.
- Each task is one focused unit (~30 min – 2 hours).
- Each task has explicit: files to touch, test code, expected commands/output, commit message.
- Order tasks by dependency (foundation first, integration last).

### 4. Execute one task at a time with this pattern (NON-NEGOTIABLE)
For every task in the plan:

   a. **Mark the task `in_progress`** in the task list before starting.

   b. **Dispatch a fresh implementer subagent.** Give them the FULL task text + project context. Do not let them re-read the plan; provide it inline.

   c. **TDD cycle inside the implementer:**
      1. Write the failing test
      2. Run it — verify it FAILS for the expected reason
      3. Implement the minimum to pass
      4. Run it — verify it PASSES
      5. Run the broader test suite — no new regressions
      6. Commit (conventional commit format)

   d. **Dispatch a SPEC COMPLIANCE reviewer.** Question: does the code match the spec exactly — no more, no less? Cite design-doc sections.

   e. **If spec gaps:** dispatch the same implementer to fix, then re-run spec review. Loop until ✅.

   f. **Then dispatch a CODE QUALITY reviewer.** Question: types tight? naming idiomatic? error handling sane? tests meaningful? Compare to existing codebase patterns.

   g. **If quality issues:** dispatch the same implementer to fix, then re-run quality review. Loop until ✅. Skip "nice-to-haves" that would diverge from the validated design (those need their own design refresh).

   h. **Mark the task `completed`** only when both reviews are ✅.

### 5. Workflow rules that prevent the most common failures
- **Never skip the spec review.** Implementers reliably over-build OR under-build.
- **Never run code quality review before spec compliance is ✅.** Wrong order — you'll waste time on quality of code that's solving the wrong problem.
- **Never let the implementer self-review replace the dual review.** Self-review is necessary but not sufficient.
- **Never accept "close enough."** Reviewer found issues = not done.
- **Never make the subagent read the plan file.** Provide full task text inline. Saves tokens, prevents drift.
- **Never start implementation on `main`/`master`** without explicit user consent.
- **Trust but verify implementer reports.** Briefly check `git log` after each task — confirm the commit exists with the claimed SHA.

### 6. When to deviate from this pattern (with user consent)
- **Trivial changes** (typo, single config tweak, doc update): skip brainstorm + design phases, go directly to a small TDD cycle. Still do at least one review.
- **Pure refactors with no behaviour change:** spec review can be lightweight (verify no functional drift); code quality review still required.
- **Exploratory spikes:** flag as "throwaway" up front; relax TDD; commit to a spike branch you'll discard.

### 7. Standing rules for this repo
- Commits must NOT include `Co-Authored-By` trailers.
- Each microservice has its own `npm run test` and `npm run build` — verify both before reporting a task done.
- TypeORM migrations must be EMC (expand → backfill → contract) when changing live tables; never single-shot rename on live data.
- Match existing conventions in the touched directory before introducing new ones.


## RTL is the non-negotiable

- RTL is forced at module load in `app/_layout.tsx`:
  ```ts
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  ```
- **Do not rely on `flexDirection: 'row'` auto-flip.** It works on native after a reload but fails on Expo web and stale dev reloads, and some platform views flip a second time — which is exactly what produced the reversed tab bar, list rows, headers, rails, and Mushaf footer found in the 2026-09-09 Figma audit.
- **The contract lives in `constants/layout.ts`.** Separate the two concerns:
  1. **Text direction** — spread `RTL_TEXT` (`writingDirection: 'rtl'` + `textAlign: 'right'`) on every Text style. There is no English copy anywhere in the UI.
  2. **Physical child order** — a row whose children are authored in visual left→right order spreads `PHYSICAL_ROW`, which pins `direction: 'ltr'` so the authored order is what renders. Text inside it keeps its own RTL direction.
- Prefer logical `start`/`end` for semantically leading/trailing content. Use physical `left`/`right` only inside a container whose direction you have explicitly set.
- Nothing in the layout contract reads `I18nManager` — the exports are frozen literals, so physical order cannot drift with module-initialization order or platform. Do not reintroduce `const dir = I18nManager.isRTL ? 'row' : 'row-reverse'` at module scope.
- **One deliberate exception: `primitives/RtlCarousel.tsx`.** It still branches on `I18nManager.isRTL`, because a horizontal `ScrollView` has a *second* RTL concern the style contract does not cover — the native scroll origin, which `direction: 'ltr'` on the content container does not move. Pinning the container while the ScrollView keeps an RTL origin would land the carousel scrolled to the wrong end on some platforms. It renders correctly on iOS, Android and web today; changing it needs a paired capture on all three, not a style swap.
- Required physical orders (left → right): bottom nav = More, Sections, Library, Home (`TAB_PHYSICAL_ORDER`); list cards = disclosure, text, icon badge; Mushaf footer = Index, Go to bookmark, Save bookmark. The letter index rail sits at the physical right edge.
- Absolute positioning is still fine for pinning a group to one edge, but it must not be used to *reverse* a row — use `PHYSICAL_ROW` for that.

## Design source is the spec

Authority order, highest first: **`KHAZAYIN.fig` node → the in-repo contracts.**

> **`design_source/` and `handoff.md` do not exist.** They are named throughout
> this file as the second and third authorities, but neither is in the working
> tree and neither is in git history — checked 2026-09-12. Treat every mention
> of them below as historical. For a screen the 28 frames do not cover there is
> **no external spec at all**; the authority is `constants/layout.ts` (RTL and
> geometry), `constants/typography.ts` (the type scale, itself derived from the
> file's 1,153 text nodes) and `constants/rtlContracts.ts` (physical slot
> order). Say which one you used — never write "matches Figma" for a screen
> with no frame.

- **The Figma file is on disk at `docs/KHAZAYIN.fig`** — no cloud URL is needed, and no MCP round-trip. It is a ZIP: `unzip -l docs/KHAZAYIN.fig` lists `canvas.fig` (the binary node graph), `thumbnail.png`, `meta.json`, and `images/` — 181 raw, full-resolution source images keyed by content hash, with alpha intact. When a screen needs real client art, extract it from there rather than deriving it from a flattened frame export or redrawing it as SVG. Rendered frame exports live in `docs/audit/<date>/figma-reference/` (untracked).
- The 28 top-level mobile frames in `KHAZAYIN.fig` are the current spec for every screen they cover. `docs/visual-regression/figma-mobile-screen-map.json` maps node → route, and `docs/plans/2026-09-09-figma-style-remediation-{design,implementation-plan,qa}.md` record what was measured against them and where the export is unusable.
- ~~`design_source/app/*.jsx` is the spec for anything the 28 frames do not cover.~~ **Missing — see the note above.** The 28 frames cover Home, Library, Sections and its twelve sub-screens, and More and its three. They cover none of the settings modals, the note screens, search, or the sheets.
- Where the file's *stated* values and its *rendered* export disagree, the render wins — proved twice, in opposite directions (a component override the export dropped, and a chevron inset the stored transform does not survive auto-layout for).
- Illustrations (rehl, scroll, crown+book, mosque) are ports of the inline SVGs in the mocks. When real client art arrives they'll replace the SVGs but keep the component API.

---

## File layout

```
app/                              ← expo-router file-based routing
  _layout.tsx                     ← root Stack, RTL init, font loading, onboarding redirect
  (tabs)/                         ← bottom-tab group
    _layout.tsx                   ← <Tabs> with custom tabBar
    index.tsx                     ← HOME screen (group default route)
    _legacy-home.tsx              ← archived; underscore = non-routable
    library.tsx
    sections/                     ← stack-per-tab
      _layout.tsx                 ← <Stack> for sections
      index.tsx                   ← 9-item list
      reciter.tsx / mushaf.tsx / qiraat.tsx / scholar.tsx / dawah.tsx
      reciter/[id].tsx            ← surah list for one reciter
      audiobooks.tsx / exclusive.tsx  ← both render <RailedLectureList/>
      discussion/index.tsx / [lectureId].tsx  ← community: a scholar's lecture threads (__DEV__ only)
    more/                         ← stack-per-tab
      _layout.tsx
      index.tsx / contact.tsx / about.tsx / archive.tsx / settings.tsx (track 002)
      community/                  ← community hub, guidelines, create, join, group/[id] (__DEV__ only)
    browse.tsx / saved.tsx / settings.tsx / search.tsx   ← legacy, hidden via href:null
  note-editor.tsx / notes-viewer.tsx                     ← modal presentation
  telegram-sheet.tsx / youtube-sheet.tsx / share-sheet.tsx  ← transparentModal + fade
  community-report-sheet.tsx                              ← transparentModal + fade (__DEV__ only)
  settings-qiraa.tsx / settings-reciter.tsx / settings-font-size.tsx
  settings-about.tsx / settings-notifications.tsx        ← track 002 modal screens
  about.tsx / contact.tsx                                ← LEGACY root routes (keep alongside)
  foundations-sandbox.tsx                                ← dev smoke-render, safe to delete

components/khazain/               ← all new UI lives here
  icons/                          ← 18 base icons + 9 section icons (react-native-svg)
  patterns/                       ← GeoNavy / Ornament / Hero / Star8 tileable backgrounds
  primitives/                     ← LogoBadge, Wordmark, SearchPill, IconChip, SectionHeader,
                                     PillButton, Toggle, MiniPlayer, CustomTabBar, DetailHeader,
                                     CornerOrnament, ListRowCard
  art/                            ← RehlArt / ScrollArt / CrownBookArt / MosqueSilhouette SVGs
  home/                           ← home-screen-specific composites (FoundationMark, HomeHeader,
                                     HomeSectionHeader, HeroQuran, HeroProphet, ScholarCard,
                                     BookCard, QuickChip, QueenCard, DawahPoster, SmallMoreButton)
  library/                        ← StatCard, CircularProgress, AudioProgressCard, ReminderCard
  launch/                         ← LaunchSequence + launchTiming (post-splash overlay)
  sections/                       ← ReciterSurahRow, RailedLectureList
  sheets/                         ← SheetShell, SheetRow
  settings/                       ← SettingsSection, SettingsValueRow, SettingsToggleRow,
                                     FontSizePreview (track 002)
  notes/                          ← LinkedNotesSection, NoteRefLink, linkedNotesModel (pure row
                                     model + editorSeed + surahNotesBlock): notes linked to content
  community/                      ← PreviewBanner, GroupRow, ChallengeCard, ProgressBar, MemberRow,
                                     ScholarDiscussionsEntry, DiscussionGlyph, PostRow, Composer

services/                         ← non-store side-effect modules
  contactForm.ts                  ← contact validation, extracted so it is testable
  reciterNavigation.ts            ← reciterDestination + surahAsLecture
  surahPlayback.ts                ← surah → the single startLecturePlayback path
  mushafNavigation.ts             ← page/surah param normalisation, 604-page bounds
  notificationRegistry.ts         ← category metadata + isCategoryEnabled snapshot read (track 002)
  notificationScheduler.ts        ← SINGLE boundary touching expo-notifications (track 002)
  cacheFacade.ts                  ← registry-based clearAppCache, user-content-safe (track 002)
  notesExporter.ts                ← pure formatNotesExport + share-sheet glue (track 002)
  community/                      ← community client: gate/config (mode), communityService port +
                                     __DEV__ mock adapter, adab filter, enrollment, deletion runner,
                                     progress sync, pure group/thread/post orchestration

store/                            ← Zustand stores
  useAppStore.ts                  ← legacy store (used by legacy tabs)
  playerStore.ts                  ← MiniPlayer UI state (NOT persisted)
  notesStore.ts                   ← notes CRUD, persisted under @khazain/notes
  settingsStore.ts                ← user preferences, persisted under @khazain/settings/v1
                                     (track 002). Exports useSettingsStore + useFontScale hook

constants/                        ← design + layout contracts (all imported widely)
  layout.ts                       ← RTL contract (PHYSICAL_ROW/PHYSICAL_BOX), width
                                     profiles, tab-bar + card geometry, reserved columns
  rtlContracts.ts                 ← frozen physical slot orders (left → right) per row type
  figmaTokens.ts                  ← locked Figma palette, compared against KhazainColors
  fonts.ts                        ← the single font registry (see Fonts, below)
  homePresentation.ts             ← Home section running order + quick chips
  libraryPresentation.ts          ← Library section order and filter visibility
theme.ts                          ← two exports:
                                     - Colors/Shadows/Spacing/Border/Typography (legacy)
                                     - KhazainColors/KhazainFonts/KhazainWeights/KhazainRadius/
                                       KhazainShadows/KhazainSpacing (new design system)

assets/fonts/                     ← Amiri-Regular/Bold.ttf + NotoSansArabic-VF.ttf + NotoNaskhArabic-VF.ttf

scripts/visual-audit/             ← 28-frame Figma↔app capture harness (iOS + Android)
docs/visual-regression/           ← figma-mobile-screen-map.json (node → route manifest)
docs/plans/                       ← designs, implementation plans, QA records

design_source/                    ← REFERENCED THROUGHOUT THIS FILE BUT ABSENT
handoff.md                        ← initial client handoff; mocks supersede where they disagree
conductor/                        ← track-based workflow history (see below)
```

## Fonts — aliases, pending real licences

Every family the app may reference lives in **`constants/fonts.ts`**, and
`app/_layout.tsx` has exactly one `useFonts(FONT_ASSET_MODULES)` call. Registered:
- `Amiri` / `Amiri-Bold` (static)
- `NotoSansArabic` / `NotoNaskhArabic` (variable TTF)
- `TheSansArabic` and `TheMixArab` — **aliases** mapped by `FONT_SUBSTITUTIONS`
  to `NotoSansArabic-VF.ttf` until the licensed files arrive.

This is option 2 of the old note: the proprietary names now resolve to a real
face instead of silently falling back to the platform Arabic font.
`__tests__/fontRegistry.test.ts` fails if a component names a family the
registry does not carry, so add the family there rather than in a screen.

`typographyParityResolved()` still returns **false**: the substitution is a
stand-in, not parity. Do not change `TheSansArabic` → `NotoSansArabic` in
components — the user is intentionally using the proprietary names, and the
alias is what makes them render.

---

## Theme conventions

- Use the `Khazain*` exports for everything new. The legacy `Colors/Shadows/Spacing` exports are only for the legacy screens.
- All tokens in `KhazainColors` are verbatim from `handoff.md §5`.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32 (`KhazainSpacing.x1..x8`).
- Radii: `pill: 999, lg: 16, md: 12, sm: 8, xs: 4`.

## Navigation

- Tab group at `app/(tabs)/` — 4 visible tabs + 4 hidden legacy ones (`href: null`).
- Custom tab bar is `components/khazain/primitives/CustomTabBar.tsx`. It wraps the `<MiniPlayer/>` in a floating-margin container above the navy bar. Tab order is **hardcoded** (`['more', 'sections', 'library', 'index']`) for RTL determinism — do not reorder without verifying on target platform.
- Each tab that needs sub-screens is a folder with its own `_layout.tsx` (`<Stack>`). `slide_from_left` animation matches RTL forward direction.
- Root-level modal routes: `note-editor`, `notes-viewer` (regular modals); `telegram-sheet`, `youtube-sheet`, `share-sheet` (transparentModal + fade).

### Typed routes caveat

Expo-router's typed-routes index (`.expo/types/router.d.ts`) regenerates on `expo start`. New routes added while the dev server wasn't running yield TS errors like `'/note-editor' is not assignable to type ...`. The repo uses `router.push(... as any)` at several sites as the standard workaround. Don't remove the casts unless you've confirmed `.expo/types/router.d.ts` includes the route.

## State

- **`playerStore`** (`store/playerStore.ts`) — UI state only. `{ track, isPlaying, progress, isVisible, togglePlay, setProgress, setVisible, setTrack }`. Seeded with a mock Fatiha track. The file has a JSDoc block at the top documenting the **audio integration boundary** — read it before wiring a real player (expo-av / react-native-track-player).
- **`notesStore`** (`store/notesStore.ts`) — persisted via `zustand/middleware` + AsyncStorage at `@khazain/notes`. API: `addNote / updateNote / deleteNote`. Also exports `formatRelativeAr(ts)` helper for Arabic relative time strings. **Linked notes:** `addNote(title, body, ref?)` takes an optional `NoteRef` (`type` ayah/lecture/book, `id`, `position`, frozen Arabic `label`, ...). Persist uses `merge` + `coerceNotes` and deliberately has **no `version`/`migrate`**: bumping the persist version makes an older build discard the record on downgrade, losing every note. Unknown ref types and keys are kept so a newer build's refs survive. Selectors: `notesFor`, `notesForLectureSeries`, `useLinkedNotes(type, id)` (filter in a memo, never inside the zustand selector). Pure logic lives in `services/noteRefs.ts` (types, labels, route params), `services/noteActions.ts` (params each take-note action pushes) and `services/noteNavigation.ts` (ref -> route or playback; never dismisses).
- **Community** (`store/communityLocalStore.ts`, `store/communityStores.ts`, `store/communityMutations.ts`) — the local store is persisted under `@khazain/community` with **no `version`/`migrate`** (same reason as `notesStore`) and carries a **mode tag**: a record written under another mode is discarded on hydrate. `services/community/config.ts` derives the mode (`gate.ts` holds the pure rule): dev builds run in `mock` mode against an in-memory adapter and seed, required only inside the `if (__DEV__)` block in `services/community/index.ts` so production bundles drop it; production is `off`, so **community UI exists only in `__DEV__` until design §13 (go-live checklist) is complete**. Every community screen calls `useCommunityGuard(...)` and renders `<PreviewBanner/>`; every write goes through `runMutation` (single-flight, idempotent request ids) and async catches check `communityGeneration()` so nothing lands after a reset or deletion. Release builds must not contain the seed: grep the production `expo export` for `KHZ_COMMUNITY_SEED` and the seed join codes (design §3.2). Design: `docs/plans/2026-10-22-community-design.md`.
- **`useAppStore`** (`store/useAppStore.ts`) — legacy, used by legacy tabs. Don't extend it; new features use `notesStore` / new dedicated stores.
- **`progressStore`** + **`wirdStore`** (`store/progressStore.ts`, `store/wirdStore.ts`) — SQLite-backed Quran + lecture progress. NOT persisted via zustand middleware: the DB is the source of truth. Hydrated once in `app/_layout.tsx` after fonts load. Library tab subscribes for `pagesToday`, `currentStreak`, `trendLast28`, `inProgressLecture`, etc. New code reads via `progressRepo` / `lectureRepo` / `wirdRepo` / `achievementsRepo` / `resetFacade` re-exports from `@/db` — NEVER write raw SQL outside `db/`. Web build uses an AsyncStorage-backed shim at `db/web-shim.ts` (same interface, in-memory cache + throttle-flush).

## Modal & sheet patterns

- Full-screen text editor (e.g., note editor): root-level route with `presentation: 'modal'`.
- Bottom sheet: root-level route with `presentation: 'transparentModal'` + `animation: 'fade'`. Use `components/khazain/sheets/SheetShell` for backdrop + handle + title scaffolding.

## Mushaf-specific

`app/(tabs)/sections/mushaf.tsx` hides the MiniPlayer on mount via `usePlayerStore.setVisible(false)` and restores on unmount. The TabBar stays visible. If the user asks for fully immersive mushaf, move the screen to a root-level stack entry outside `(tabs)`.

---

## Legacy code

These files are intentionally on disk but not routable / not in the tab bar. Do not delete them without explicit user approval:

- `app/(tabs)/_legacy-home.tsx` (the previous home)
- `app/(tabs)/{browse,saved,settings,search}.tsx`
- `app/about.tsx`, `app/contact.tsx` (old root routes; the new ones live under `/more/`)
- `app/modal.tsx`, `app/resource/[id].tsx`, `app/category/[id].tsx`
- `app/onboarding.tsx` + the onboarding redirect in `app/_layout.tsx`

`data/mockData.ts`, `hooks/use-color-scheme.ts`, `hooks/use-color-scheme.web.ts`, `types/index.ts` — also legacy, support the legacy screens.

Pre-existing lint errors in `app/(tabs)/browse.tsx:603` (2 unescaped quotes) are **known and out-of-scope** — do not fix them unless specifically asked.

---

## Conductor track workflow

The project uses a track-based workflow under `conductor/`. Each feature or fix lives as a track with `spec.md + plan.md + metadata.json`. See `conductor/tracks.md` for the registry. `conductor/index.md` has the project snapshot; `conductor/authority-matrix.md` encodes decision authority (dependency adds, destructive ops, commits — all USER_ONLY).

Finished tracks to date:
1. `khazain-foundations` — tokens, fonts, icons, patterns, primitives
2. `khazain-nav-shell` — 4-tab shell + CustomTabBar + MiniPlayer + playerStore
3. `khazain-home` — home screen
4. `khazain-sections` — sections list + 5 sub-screens
5. `khazain-library` — library + notes
6. `khazain-more` — more list + contact/about/archive + telegram/youtube sheets
7. `khazain-modals-player` — share sheet + wiring + audio boundary doc
8. `khazain-polish-fix` — home default, RTL section headers, removed double-counted bottom padding, floating MiniPlayer

When starting a new track, mirror this shape: write `spec.md` first, keep changes scoped to the track, update `conductor/tracks.md`, never commit without asking.

---

## Running & testing

```
npm start              # expo dev server
npm run android|ios|web
npm run lint
npx tsc --noEmit       # type-check — use this liberally, it's fast
```

### Verification hygiene (learned from prior iterations)

- Run `npx tsc --noEmit --pretty false` after any non-trivial edit.
- Lint output is noisy due to legacy files — when checking lint for *new* files use:
  ```bash
  npm run lint 2>&1 | grep -E "<path-glob>" -A 2
  ```
- On-device visual QA is the only way to verify RTL layout, font rendering, and the floating MiniPlayer. Typecheck and lint pass doesn't mean it renders correctly.
- **An icon can be the right geometry and still be wrong.** The file uses one component in two orientations and puts the flip on the *instance* (`transform.m00: -1`), never on the SYMBOL master the generator copies. `FigmaIcon`'s `mirrored` prop carries it; `__tests__/figmaIcons.test.ts` pins which call sites set it.
- **`alignItems: 'flex-end'` and `textAlign: 'right'` mean the physical LEFT** in a container whose direction is left to `forceRTL`, and `flexDirection: 'row-reverse'` on such a row renders left→right. Spread `PHYSICAL_BOX` / `PHYSICAL_ROW` from `constants/layout.ts`. Guarded by `__tests__/rtlPhysicalContract.test.ts`.

---

## Things NOT to do

- Don't add dependencies without asking (`authority-matrix.md` marks this USER_ONLY).
- Don't `git commit` / `git push` unless explicitly told to.
- Don't rename or delete anything under `design_source/` if it ever arrives — it's the spec. It is not in the repo today.
- Don't replace `TheSansArabic` / `TheMixArab` font references — the user is intentionally using proprietary names.
- Don't touch legacy files just to clean up — they're preserved intentionally.
- Don't add `--no-verify` / `--no-gpg-sign` to any git operation.
- Don't change `I18nManager.forceRTL(...)` at the root — it's load-bearing.

## Things TO do

- When porting a new screen: find its node in `docs/visual-regression/figma-mobile-screen-map.json` and read the frame out of `docs/KHAZAYIN.fig` with `scripts/figma/extract-geometry.js` / `extract-text-styles.js`. If it has no frame, build from the `constants/*` contracts and say so.
- When adding a new route: register it in the appropriate layout's `<Stack>` / `<Tabs>`, then test navigation with `router.push(... as any)` until typed routes regenerate.
- When adding new state: prefer a new small Zustand store over extending `useAppStore`.
- When adding an external URL or share target: use `Linking.openURL` with a `canOpenURL` check + Arabic Alert fallback (pattern in `app/share-sheet.tsx`).
- When touching progress data: go through `progressRepo` / `lectureRepo` / `wirdRepo` / `achievementsRepo` / `resetFacade` (re-exports from `@/db`). Never write raw SQL outside `db/`; never persist progress fields via zustand middleware.

- **Long-press means** (app-wide): long-press on a lecture row (`LectureCard`, `RibbonCard`) is **SAVE** to المحفوظات; long-press on an ayah in the Mushaf reader, or on the MiniPlayer, is **NOTE**. The two never share a surface. Community surfaces (groups, posts, the discussion entry) take **no** long-press. `__tests__/contextualNotesInvariants.test.ts` and `__tests__/communityInvariants.test.ts` pin this.

## Active Technologies
- TypeScript 5.9, React 19.1, React Native 0.81.5 (Expo SDK 54) (001-progress-tracking)
- SQLite via `expo-sqlite` (event log + aggregates table); AsyncStorage retained for the existing notes/saved stores and for a one-time migration flag. No cloud sync — fully offline. (001-progress-tracking)

## Recent Changes
- 001-progress-tracking: Added TypeScript 5.9, React 19.1, React Native 0.81.5 (Expo SDK 54)
