# CLAUDE.md — Khazain Al-Rahman app

Project-specific guidance for future Claude Code sessions. Read this before touching anything under `app/` or `components/khazain/`.

---

## What this is

Mobile app for **مؤسسة خزائن الرحمن العالمية** (Khazain Al-Rahman International Foundation). Arabic-only, RTL-first, Islamic content: Quran (Mushaf + reciters + qira'at), scholars, books, dawah design posters, personal library with notes.

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
- **Do not rely on `flexDirection: 'row'` auto-flip.** It works on native after a reload but fails on Expo web and stale dev reloads. Two safe patterns already established in the repo:
  1. **Absolute positioning** for left/right-pinned groups (see `components/khazain/home/HomeSectionHeader.tsx` and `primitives/SectionHeader.tsx`).
  2. **Hardcoded JSX order matching the visual RTL order** (see `primitives/CustomTabBar.tsx` where `TAB_ORDER = ['more', 'sections', 'library', 'index']` — more on the left, index/home on the right — because with forceRTL unreliable across targets, the typed order wins deterministically).
- Use `writingDirection: 'rtl'` + `textAlign: 'right'` on every Text style. There is no English copy anywhere in the UI.

## Design source is the spec

- `design_source/app/{home,sections,library,more,shared}.jsx` + `styles.css` + `mobile.html` is a faithful HTML/React prototype.
- **The mocks win over `handoff.md` whenever they disagree** (handoff copy sometimes lags the mock). Dimensions, colors, Arabic copy — port verbatim.
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
    more/                         ← stack-per-tab
      _layout.tsx
      index.tsx / contact.tsx / about.tsx / archive.tsx / settings.tsx (track 002)
    browse.tsx / saved.tsx / settings.tsx / search.tsx   ← legacy, hidden via href:null
  note-editor.tsx / notes-viewer.tsx                     ← modal presentation
  telegram-sheet.tsx / youtube-sheet.tsx / share-sheet.tsx  ← transparentModal + fade
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
  sheets/                         ← SheetShell, SheetRow
  settings/                       ← SettingsSection, SettingsValueRow, SettingsToggleRow,
                                     FontSizePreview (track 002)

services/                         ← non-store side-effect modules
  notificationRegistry.ts         ← category metadata + isCategoryEnabled snapshot read (track 002)
  notificationScheduler.ts        ← SINGLE boundary touching expo-notifications (track 002)
  cacheFacade.ts                  ← registry-based clearAppCache, user-content-safe (track 002)
  notesExporter.ts                ← pure formatNotesExport + share-sheet glue (track 002)

store/                            ← Zustand stores
  useAppStore.ts                  ← legacy store (used by legacy tabs)
  playerStore.ts                  ← MiniPlayer UI state (NOT persisted)
  notesStore.ts                   ← notes CRUD, persisted under @khazain/notes
  settingsStore.ts                ← user preferences, persisted under @khazain/settings/v1
                                     (track 002). Exports useSettingsStore + useFontScale hook

constants/theme.ts                ← two exports:
                                     - Colors/Shadows/Spacing/Border/Typography (legacy)
                                     - KhazainColors/KhazainFonts/KhazainWeights/KhazainRadius/
                                       KhazainShadows/KhazainSpacing (new design system)

assets/fonts/                     ← Amiri-Regular/Bold.ttf + NotoSansArabic-VF.ttf + NotoNaskhArabic-VF.ttf

design_source/                    ← HTML/React mocks, treat as the spec
handoff.md                        ← initial client handoff; mocks supersede where they disagree
conductor/                        ← track-based workflow history (see below)
```

## Fonts — known inconsistency

`app/_layout.tsx` registers these four families:
- `Amiri` (static, 400)
- `Amiri-Bold` (static, 700)
- `NotoSansArabic` (variable TTF)
- `NotoNaskhArabic` (variable TTF)

**But** many components now reference `'TheSansArabic'` and `'TheMixArab'` in `fontFamily`. Those names are not registered — RN will silently fall back to the system font. Two options when you touch a component:
1. Leave it (user is iterating; silent fallback is intentional while real proprietary fonts are pending).
2. If the user asks to fix: register aliases in `app/_layout.tsx` `useFonts({...})` so `TheSansArabic` resolves to the Noto Sans Arabic TTF until real licensed fonts arrive.

Do not change `TheSansArabic` → `NotoSansArabic` without asking — the user has intentionally edited files to use the proprietary names.

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
- **`notesStore`** (`store/notesStore.ts`) — persisted via `zustand/middleware` + AsyncStorage at `@khazain/notes`. API: `addNote / updateNote / deleteNote`. Also exports `formatRelativeAr(ts)` helper for Arabic relative time strings.
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

---

## Things NOT to do

- Don't add dependencies without asking (`authority-matrix.md` marks this USER_ONLY).
- Don't `git commit` / `git push` unless explicitly told to.
- Don't rename or delete anything under `design_source/` — it's the spec.
- Don't replace `TheSansArabic` / `TheMixArab` font references — the user is intentionally using proprietary names.
- Don't touch legacy files just to clean up — they're preserved intentionally.
- Don't add `--no-verify` / `--no-gpg-sign` to any git operation.
- Don't change `I18nManager.forceRTL(...)` at the root — it's load-bearing.

## Things TO do

- When porting a new screen: read the matching `design_source/app/*.jsx` first, port component-by-component into `components/khazain/`, then assemble in `app/...`.
- When adding a new route: register it in the appropriate layout's `<Stack>` / `<Tabs>`, then test navigation with `router.push(... as any)` until typed routes regenerate.
- When adding new state: prefer a new small Zustand store over extending `useAppStore`.
- When adding an external URL or share target: use `Linking.openURL` with a `canOpenURL` check + Arabic Alert fallback (pattern in `app/share-sheet.tsx`).
- When touching progress data: go through `progressRepo` / `lectureRepo` / `wirdRepo` / `achievementsRepo` / `resetFacade` (re-exports from `@/db`). Never write raw SQL outside `db/`; never persist progress fields via zustand middleware.

## Active Technologies
- TypeScript 5.9, React 19.1, React Native 0.81.5 (Expo SDK 54) (001-progress-tracking)
- SQLite via `expo-sqlite` (event log + aggregates table); AsyncStorage retained for the existing notes/saved stores and for a one-time migration flag. No cloud sync — fully offline. (001-progress-tracking)

## Recent Changes
- 001-progress-tracking: Added TypeScript 5.9, React 19.1, React Native 0.81.5 (Expo SDK 54)
