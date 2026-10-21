# Saved Content & Bookmarks — audit-gap closure design

**Date:** 2026-10-21
**Branch:** `fix/saved-lecture-bookmarks`
**Ticket:** "Saved Content & Bookmarks System" — https://trello.com/c/5bF5jpXi
**Status:** v2. CTO review returned APPROVE WITH CHANGES, and the user approved long-press-to-save. Section 12 records a default for every open question, so work can start without a reply.

**v2 changes after the CTO review:**
- **Accessibility:** the hint now depends on saved state, the row carries an `accessibilityValue` of `محفوظة` when saved, and the custom-action path announces the result.
- **Testable gesture props:** the props builder is now the pure `saveGestureProps(saved, onToggle)` in `services/savedToggle.ts`, unit-tested there. The haptic stays in the hook.
- **Device-state hygiene:** QA uses the existing pre-change baseline, ends with a teardown step, and `scripts/visual-audit/README.md` gains an empty-library precondition.
- **Corrected icon position:** on the compact rows of frames 23–24, the saved icon sits between the duration and the title.
- **Recorded Library shift:** the empty-state hint is a one-line shift on frame 06.
- **Accepted optional changes:**
  - `RibbonCard` memoises its target on `save?.entityId`
  - telemetry logs `restore` as its own action
  - §6 tie reasoning is reworded

---

## 1. Problem

The ticket is marked Done but did not pass its acceptance-criteria audit. The saved
system is mostly there. `store/savedStore.ts` is a persisted Zustand store,
`components/khazain/primitives/BookmarkButton.tsx` is the single bookmark control,
`components/khazain/library/MySavedSection.tsx` is the Library block, and
`ToastOverlay` handles undo. The audit found these gaps:

| # | Gap | Evidence |
|---|-----|----------|
| G1 | **No lecture can be saved anywhere.** | `LectureCard.tsx:33` defaults `showBookmark = false` and no caller sets it (`prophet.tsx:46`, `queen.tsx:46`, `books.tsx:46`, `radio.tsx:48`, `RailedLectureList.tsx:58`). Scholar-detail lectures use `RibbonCard` (`scholar/[id].tsx:56`), which has no save path at all. |
| G2 | The reciter surah list has no bookmark. | `ReciterSurahRow.tsx:10-16` says this is deliberate. The Mushaf list's `SurahRow.tsx:42` has one. |
| G3 | Undo after unsave re-saves the item with a **new** `savedAt`, so the item jumps to the top instead of going back to its old place. | `BookmarkButton.tsx:58-61` calls `save()`, which stamps `Date.now()` and prepends (`savedStore.ts:132-144`). |
| G4 | Items are newest-first only *within* a group. The groups themselves come out in a fixed order. | `MySavedSection.tsx:21` `GROUP_ORDER` |
| G5 | No test covers save, unsave, undo, grouping, or the bookmark control. | The only saved-store test is `__tests__/savedStoreFlush.test.ts`, which covers the debounce flush. |

### 1.1 Why the lecture bookmark was turned off (G1 root cause)

- `fbefc24` added the bookmark to `LectureCard` and always showed it.
- `1b57407` (2026-09-09) made it opt-in with `showBookmark = false`. That commit is
  the **baseline capture** for the Figma style-remediation track ("Bundles the
  uncommitted responsive/RTL work-in-progress"). Its message gives no reason for the
  bookmark change.
- The reason shows up in the frames that track was measured against. Every
  lecture-list frame puts the **section badge on the right and the duration on the
  left. None of them draws a bookmark:**
  - 18 Prophet `2465:1911`
  - 19 Scholar detail `2510:1990` (gold ribbon, duration)
  - 20 Queens `2589:1772`
  - 21 Books `2597:2552`
  - 22 Radio `2606:3830`
  - 23 Audiobooks `2869:2088` (the frame draws no duration; the app fixtures have one, `data/content/audiobooks.ts:19-54`)
  - 24 Exclusive `2869:2306`

  I checked the reference PNGs in
  `docs/audit/2026-09-09/figma-reference/18…24-*.png`. The remediation design
  (`docs/plans/2026-09-09-figma-style-remediation-design.md:215-219`) and its QA
  rows 18–24 (`…-qa.md`) describe and sign off exactly that composition:
  "Compact rows, badge right, duration left".
- So the opt-in was added to match the frames, and no screen ever opted back in. The
  scholar and book cards on Home kept their bookmark as a "deliberate product
  feature" (`docs/plans/2026-09-09-home-screen-defects.md:247`). The lecture card
  just lost its bookmark along the way.

**Conclusion:** Figma has **no** bookmark slot on any lecture row. If we re-enabled
the always-visible icon, seven signed-off frames would stop matching. Per the
planning rules, Figma wins on the visual layout of a covered screen. The lecture save
control therefore has to work **without changing the default render** of those frames.

---

## 2. Acceptance criteria (verbatim)

- Bookmark icon appears on ScholarCard, BookCard, surah list items, lecture items, and DawahPoster
- Tapping bookmark saves the item to savedStore with timestamp
- Library tab shows saved items grouped by type with counts
- Saved items persist across app restarts (AsyncStorage)
- Users can unsave items with undo toast (Arabic)
- Saved items display in reverse chronological order (most recent first)
- Empty library state shows encouraging Arabic message

| Criterion | Today | After this work |
|---|---|---|
| Icon on ScholarCard / BookCard / DawahPoster | ✅ (`ScholarCard.tsx:70`, `BookCard.tsx:66`, `DawahPoster.tsx:56`) | unchanged |
| Icon on surah list items | ✅ Mushaf list (`SurahRow.tsx:42`) | unchanged; decision recorded in §5 |
| Icon on lecture items | ❌ | long-press saves the lecture; a bookmark icon appears on the row once it is saved (§4) |
| Tap saves with timestamp | ✅ | unchanged, now covered by tests |
| Grouped with counts | ✅ | groups ordered by most recent save (§6) |
| Persist across restarts | ✅ (`@khazain/saved`) | covered by a rehydrate test |
| Unsave + Arabic undo | ⚠️ undo restamps | undo restores the original entry and position (§7) |
| Reverse chronological | ⚠️ within groups only | within groups **and** across groups |
| Encouraging empty state | ✅ | adds a line explaining how to save a lecture |

---

## 3. Approach chosen

**Long-press to save on lecture rows, plus a bookmark icon that appears only once the
lecture is saved. All toggle and undo logic moves into one service that every save
control calls.**

1. **`services/savedToggle.ts`** (new) holds `toggleSaved(target)`, the toast copy and
   timings, the accessibility-action builder, and `lectureSaveTarget(lecture)`.
   `BookmarkButton.onPress` becomes a one-line call to it, so tapping the icon and
   long-pressing a row behave identically, including both undo toasts.
2. **`saveGestureProps(saved, onToggle)`** (pure, in `services/savedToggle.ts`)
   builds the row's Pressable props:
   - `onLongPress`, which calls `onToggle`
   - `accessibilityActions` / `onAccessibilityAction`: one VoiceOver/TalkBack custom
     action, `toggleSave`, labelled `حفظ في المكتبة` or `إزالة من المحفوظات`
     depending on state. Only that action calls `onToggle`. `activate` and
     `longpress` actions are ignored, so a double-tap still plays.
   - a **state-dependent** `accessibilityHint`: `اضغط مطوّلاً للحفظ في المكتبة` /
     `اضغط مطوّلاً للإزالة من المحفوظات`
   - `accessibilityValue={{ text: saved ? 'محفوظة' : undefined }}`

   On the custom-action path it also calls
   `AccessibilityInfo.announceForAccessibility(...)` with the toast text. The toast
   has no live region, so a screen-reader user would otherwise get no confirmation.
3. **`components/khazain/primitives/useSaveGesture.ts`** (new) is a thin hook. It
   subscribes to the saved state for one target, wraps `toggleSaved` with a light
   haptic (`expo-haptics`, already declared in `package.json:35`), and returns
   `saveGestureProps(saved, toggle)`. All the logic it adds is the haptic, so
   everything else is tested through the pure builder.
4. **`LectureCard`** always wires the gesture. Its `meta` slot shows a
   `BookmarkButton` **only while the lecture is saved**, and tapping that icon unsaves.
   The unused `showBookmark` prop is removed.
5. **`RibbonCard`** gets an optional `save?: SaveTarget` prop. Only scholar detail
   (`scholar/[id].tsx:56`) passes it. The scholar *list* (`scholar.tsx:45`) does not,
   so that screen is untouched. `RibbonCard` memoises the target on `save?.entityId`.
   The caller builds a fresh object every render, and memoising keeps the hook's
   `useMemo` effective.
6. **Discoverability:** the empty-state copy gains a line telling the user to
   long-press a lecture to save it. That screen has no Figma frame (§8). The row's
   accessibility hint carries the same message.

Why this satisfies the criterion without breaking the frames:

- In the frames' state (nothing saved), every lecture row renders exactly as today.
- The icon *appears on lecture items* once a lecture is saved. That gives the user
  visible confirmation and a one-tap way to unsave.
- Every lecture is saveable, including the 32 section lectures in
  `data/content/lectures.ts`, none of which has an `archiveId` and so none of which
  can play.

### 3.1 Alternatives rejected

| Alternative | Why rejected |
|---|---|
| **A. Re-enable the always-visible bookmark** (`showBookmark` on every caller) | Breaks seven signed-off frames (18–24): it adds a 32 pt control in the meta slot and squeezes the title column at 320 pt. Figma wins for covered screens. This stays open question Q1 if the product owner prefers to deviate, as was done for the Home cards. |
| **B. Bookmark in the MiniPlayer** (save the now-playing lecture) | The MiniPlayer has no frame, so visually it is safe. Functionally it misses most lectures. `playLecture` throws `NoAudioError` without `archiveId` (`services/audioEngine.ts:134`), and **0 of 32** section lectures have one, so prophet, queen, books and radio could never be saved. `PlayerTrack.id` is also the *episode* id (`audioEngine.ts:170-177`), not the lecture id, so it would need a new identity field on the player boundary. Recorded as possible follow-up Q3. |
| **C. Swipe-to-reveal action** | Needs a gesture-handler swipeable row, which is new surface area. It also fights the FlatList scroll and the right-edge letter rail on the audiobooks and exclusive lists. Long-press uses the `Pressable` the rows already have. |

---

## 4. Data, route and store changes

### 4.1 `store/savedStore.ts`

- **Add** `restore(item: SavedItem): void` to `SavedState` (interface at `:104-125`,
  implementation after `unsave` at `:146-153`).
  - It reinserts `item` **unchanged**: same `savedAt`, same `snapshot`.
  - It goes in front of the first entry whose `savedAt` is older. The list is always
    newest-first, so that is the item's original position.
  - It does nothing if the id is already present.
  - It respects `MAX_ITEMS` (`:24`).
  - It emits `[khazayin] saved-toggle` telemetry with its own `action: 'restore'`.
    To allow this, `logSavedToggle`'s union widens to `'save' | 'unsave' | 'restore'` (`:95`).
- No schema change. The persist `version: 1` (`:167`) stays, so no migration is
  needed.

### 4.2 `services/savedToggle.ts` (new)

```ts
export interface SaveTarget { type: SavedType; entityId: string; snapshot: SavedSnapshot }
export const SAVED_COPY: Readonly<{ saved; removed; undo; saveLabel; unsaveLabel;
                                     saveHint; unsaveHint; savedValue }>;
export const SAVE_TOAST_MS = 3000;   // Board condition #3 (existing)
export const UNSAVE_TOAST_MS = 5000; // Board condition #6 (existing)
export const SAVE_ACTION_NAME = 'toggleSave';
export type SaveGestureProps = Pick<PressableProps, 'onLongPress' | 'accessibilityActions'
  | 'onAccessibilityAction' | 'accessibilityHint' | 'accessibilityValue'>;
export function toggleSaved(target: SaveTarget): boolean;            // returns the new saved state
export function saveGestureProps(saved: boolean, onToggle: () => boolean): SaveGestureProps; // pure
export function lectureSaveTarget(l: Pick<Lecture, 'id'|'title'|'scholar'|'duration'|'category'>): SaveTarget;
```

- Undo after an unsave calls `restore(removed)` (fixes G3).
- Undo after a save calls `unsave`, as today.
- The module imports the stores directly (`@/store/savedStore`, `@/store/toastStore`),
  not through the `@/store` barrel, so tests don't pull in SQLite-backed stores.

### 4.3 `constants/savedPresentation.ts` (new)

This mirrors the shape of `constants/libraryPresentation.ts`.

- `SAVED_GROUP_TITLES` moves out of `MySavedSection.tsx:22-28`. The text is unchanged.
- `groupSavedItems(items)` returns `{ type, title, count, entries }[]`. Entries are
  sorted newest-first. Groups are ordered by their newest entry (§6).
- `SAVED_EMPTY_COPY`: `{ title, body, lectureHint }`. The title and body are the
  current strings from `MySavedSection.tsx:92-95`. `lectureHint` is
  `لحفظ محاضرة، اضغط عليها مطوّلاً.`

### 4.4 Components

| File | Change |
|---|---|
| `components/khazain/primitives/BookmarkButton.tsx:51-81` | `onPress` becomes `onChange?.(toggleSaved({ type, entityId, snapshot }))`. The visual contract is unchanged. |
| `components/khazain/primitives/useSaveGesture.ts` (new) | Hook described in §3 item 3: a store selector, a haptic, and `saveGestureProps`. |
| `components/khazain/primitives/LectureCard.tsx:33,44,52-67,90-101` | Remove `showBookmark`. Build `lectureSaveTarget` with `useMemo`, spread the gesture props on the `Pressable`, and render the `BookmarkButton` in `meta` when `saved`. |
| `components/khazain/primitives/RibbonCard.tsx:21-51` | Add an optional `save` prop, memoised on `save?.entityId`. When saved, the physical left becomes a `PHYSICAL_ROW` cluster `[duration, bookmark]`. When not saved, the existing bare duration `Text` is rendered exactly as today. |
| `app/(tabs)/sections/scholar/[id].tsx:56-61` | Pass `save={lectureSaveTarget(l)}`. |
| `components/khazain/library/MySavedSection.tsx:21-28,37-39,86-98` | Use `groupSavedItems`, and render `SAVED_EMPTY_COPY` including `lectureHint`. |
| `components/khazain/primitives/index.ts` | Export `useSaveGesture`. |
| `scripts/visual-audit/README.md` (Safety rules) | Precondition: the saved library must be empty. Saved lectures add a bookmark to frames 18–24 (and fill the Home bookmarks on 05). **Added in this v2 commit.** |

**Routes:** none added or changed.

---

## 5. Decision: "surah list items" (G2)

**The criterion is met by the Mushaf surah list (`SurahRow`). The reciter surah list
stays as it is.**

- Frame 13 (`2207:5270`, reciter audio list) draws a **play** glyph on the physical
  left of every row. `ReciterSurahRow` reproduces it (`ReciterSurahRow.tsx:41-48`)
  because tapping the row starts audio.
- Replacing the play glyph with a bookmark would make the row lie about what tapping
  it does. That is the same reasoning the Mushaf deviation records in reverse
  (`docs/plans/2026-09-11-sections-screen-qa.md:270`).
- Frame 14 (`2207:17898`, Mushaf index) does not draw a bookmark either. The app
  bookmark there is an accepted deviation (`…figma-style-remediation-qa.md:64`, row 14
  "the app-only bookmark sits on the trailing edge").
- The saved type is `'surah'` keyed by surah id. A surah saved from the Mushaf list
  is the same entity a reciter row would save, so the reciter row adds no new
  saveable content.
- The decision is pinned by a source-contract test (Task 6) so it isn't undone by
  accident.

Adding long-press to `ReciterSurahRow` would be cheap with the new hook. It is
recorded as Q2, default **no**.

---

## 6. Decision: group ordering (G4)

- Frame 06 Library (`2031:4659`) has **no node for the saved list**. Reading the frame
  with `scripts/figma/extract-geometry.js` gives this sequence:
  - summary cards
  - daily wird `DIV-75`
  - quick note `DIV-103`
  - filter chips `DIV-141` (y 1101; the `المحفوظات ١٨` chip is `BUTTON-182`)
  - straight on to `books-progress-198` (y 1185)

  Nothing between the filters and books-progress draws saved items.
- The section's internal layout is therefore governed by the in-repo contracts:
  - `constants/libraryPresentation.ts` (`savedList` sits between `filters` and
    `audiobookProgress`)
  - `constants/typography.ts`
  - the new `constants/savedPresentation.ts`
- **Decision:** order groups by their most recent save, newest group first. Entries
  stay newest-first inside each group. The criterion "most recent first" then holds
  for the whole section: the first row under the header is always the last thing
  saved. With the fixed order, a just-saved design would have sat at the bottom.
- **Ties:** a group's position is set by its newest entry. Two groups tie only when
  their newest entries share a millisecond `savedAt`. In that case the stable sort keeps
  store order, which is itself newest-insertion-first. Entries within a group use the
  same stable sort.

---

## 7. Undo semantics (G3)

| Action | Toast (Arabic, unchanged copy) | Undo does |
|---|---|---|
| Save (tap icon or long-press) | `تمت الإضافة إلى المحفوظات` · 3 s · `تراجع` | `unsave(type, entityId)` |
| Unsave (tap icon, or long-press a saved lecture) | `تم الحذف من المحفوظات` · 5 s · `تراجع` | `restore(removedItem)`: original `savedAt`, original index |

`toastStore` keeps its replacement semantics (`store/toastStore.ts:38-42`). A newer
toast replaces an older one, so a stale undo can't be tapped. `restore` is still
idempotent as a guard.

---

## 8. Figma frames affected

The default state, with no lecture saved, must stay **pixel-identical** to the
pre-change capture on every frame below. The orchestrator already captured every
framed route before any change, at
`/private/tmp/claude-501/-Users-ahmedelhadarey-samer-khazayin-app/ad126e66-b973-46e5-9731-c506a3e034d8/scratchpad/qa/baseline/`
(`NN-<node>__<route>.png` plus `capture-summary.json`). That is the comparison
target. The Figma exports are the secondary reference. Only the saved state, which no frame draws, may
differ.

| # | Node | Route | Must remain identical (unsaved) | Saved-state change |
|---:|---|---|---|---|
| 18 | `2465:1911` | `/sections/prophet` | all rows | bookmark icon left of title, right of duration, in the `meta` slot |
| 19 | `2510:1990` | `/sections/scholar/s1` | all rows, gold ribbon | bookmark icon beside duration |
| 20 | `2589:1772` | `/sections/queen` | all rows | as 18 |
| 21 | `2597:2552` | `/sections/books` | all rows | as 18 |
| 22 | `2606:3830` | `/sections/radio` | all rows | as 18 |
| 23 | `2869:2088` | `/sections/audiobooks` | rows, rail | bookmark icon **between the duration and the title**. The meta cluster is `[duration, bookmark]` left to right (`LectureCard.tsx:56-65`), and every audiobook fixture has a duration. |
| 24 | `2869:2306` | `/sections/exclusive` | rows, rail (the export is blank, so compare against the written spec) | as 23 |
| 09 | `2102:2975` | `/sections/scholar` | **fully unchanged** (no `save` prop) | n/a |
| 13 | `2207:5270` | `/sections/reciter/r1` | **fully unchanged** | n/a |
| 14 | `2207:17898` | `/sections/mushaf` | unchanged (bookmark already present) | n/a |
| 05 | `2001:940` | `/` | unchanged | n/a |
| 06 | `2031:4659` | `/library` | everything the frame draws **above the saved block**; the saved list has **no frame** (§6) | Group order follows recency. **Expected shift:** under the `all` filter with an empty library, the new hint line pushes everything below the saved block (audiobook progress, smart reminders, and the rest) down by one caption line. QA compares this route against the **pre-change capture**, not the raw Figma export, and accepts exactly that one-line shift. |

The toast overlay has no frame. It is an existing component and is unchanged.

---

## 9. RTL considerations

- The lecture-row indicator lives in the existing `meta` slot. That slot's physical
  position comes from `LECTURE_CARD_ORDER = ['meta','text','badge']`
  (`constants/rtlContracts.ts:23`) inside `PHYSICAL_ROW`, so `forceRTL` can't flip
  it. Inside `endCluster` (already `PHYSICAL_ROW`), the order is duration then
  bookmark, left to right. That is what `LectureCard.tsx:57-65` already authors.
- The `RibbonCard` saved cluster is a new `PHYSICAL_ROW` view with
  `[duration, bookmark]`, matching `LectureCard`. It does not reverse the row and
  uses no absolute positioning.
- All new Arabic copy renders through `textStyle(...)`, which already spreads
  `RTL_TEXT`. No `I18nManager` reads are added.
- `MySavedSection`'s existing `headerRow` uses `flexDirection: 'row'` (`:107`) and an
  absolute `left: 16` bookmark slot (`:125-130`). That predates this ticket and
  drifts from the RTL contract. It is flagged in §11 and **not** fixed here.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Long-press is a hidden gesture. | Empty-state hint, a state-dependent a11y hint, `accessibilityValue` `محفوظة`, and a VoiceOver/TalkBack custom action that announces its result. Once one lecture is saved, the visible icon teaches the pattern. Q1 lets the product owner pick a visible icon instead. |
| The visual-audit harness never clears app storage (`scripts/visual-audit/capture-android.mjs:6` "never runs `pm clear`"). A saved lecture on the capture device would show an icon and fail frames 18–24, and saved Home items would fill bookmarks on 05. | Three mitigations: (1) a precondition in `scripts/visual-audit/README.md`; (2) the QA checklist starts with an empty library and **ends with a teardown step** (unsave everything, confirm the Library empty state); (3) the saved state is captured separately from the default-state comparison. |
| Long-press could fire `onPress` and start playback too. | RN `Pressable` does not call `onPress` after `onLongPress` fires. This is checked in QA on both platforms. |
| Long-press inside a scrolling FlatList could misfire. | `Pressable` cancels the long-press timer when the responder is taken by the scroll. This is checked in QA on the rail lists (23/24). |
| `expo-haptics` on web throws or no-ops. | The call is wrapped in `.catch(() => undefined)`, and `Platform.OS !== 'web'` guards it. |
| `restore` at the 500-item cap could drop the restored item if it is the oldest. | Accepted. This only happens at 500 items, and the behaviour is the same as the existing cap. It is documented in the store JSDoc. |
| Source-contract tests are brittle against reformatting. | This repo already uses them (`__tests__/miniPlayerReach.test.ts`). They are limited to the wiring decisions, and behaviour is tested through pure modules. Component render tests are impossible without adding `react-test-renderer`, which is a new dependency (see out of scope). |

---

## 11. Out of scope

- Saving from the MiniPlayer (alternative B), search-result rows, or ayat (`SavedType`
  comment: ayah deferred to v2).
- Long-press on `ReciterSurahRow` (Q2).
- Where a saved lecture navigates to. `lectureRouteFor` sends `general` and `scholar`
  lectures to the sections root (`services/search/rowProps.tsx:177-183`); making them
  land on the right list or start playback is a separate change.
- Undoing a save that evicted the oldest item at the 500 cap.
- The RTL-contract drift in `MySavedSection` (`flexDirection: 'row'` header, absolute
  `left` slot).
- Any change to `BookmarkButton`'s visuals, the toast visuals, Home cards,
  `SurahRow`, or `DawahPoster`.
- Component render tests. They would need `react-test-renderer` or
  `@testing-library/react-native`, which are not in `package.json`.
- Legacy `app/(tabs)/saved.tsx`. Not touched.

---

## 12. Open questions (with defaults the plan uses)

| # | Question | Default used by the plan |
|---|---|---|
| Q1 | Should lecture rows show an **always-visible** bookmark and accept a deliberate deviation from frames 18–24, as Home's scholar and book cards do? | **No.** Long-press plus an icon that appears once saved; the frames stay identical. Switching later is a one-line change: render the indicator unconditionally. |
| Q2 | Long-press to save on the reciter surah list (`ReciterSurahRow`)? | **No.** The Mushaf list covers "surah list items" (§5). |
| Q3 | Add a bookmark to the MiniPlayer for the now-playing lecture? | **No, follow-up.** It needs lecture identity on `PlayerTrack`. |
| Q4 | Haptic tick on long-press via the already-declared `expo-haptics`? | **Yes**, light impact, skipped on web. |

**Resolved by the user (v2):** long-press-to-save is approved, which settles the approach behind Q1.
| Q5 | Empty-state hint wording: `لحفظ محاضرة، اضغط عليها مطوّلاً.` | **Superseded (user, 2026-10-21, at PR review): drop the visible hint** so frame 06 stays pixel-identical. Long-press is taught by the state-dependent a11y hint, the custom action, and the bookmark that appears once a lecture is saved. `SAVED_EMPTY_COPY` keeps the base title and body only. |
