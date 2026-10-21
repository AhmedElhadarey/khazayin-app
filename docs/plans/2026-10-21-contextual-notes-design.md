# Contextual Notes Linked to Content: Design (v2)

- **Ticket:** "Contextual Notes Linked to Content" (https://trello.com/c/g42hsH45). It is marked Done on the board but failed the acceptance-criteria audit.
- **Branch:** `feat/contextual-notes`. **It is built last**, on top of `fix/search-route-and-navigation` (book detail) **and** `feat/progress-page-tracking` (the Mushaf reader split into per-page segments).
- **Date:** 2026-10-21
- **Status:** v2. The CTO review returned APPROVE WITH CHANGES, and the user's decisions are recorded in §11. §12 lists what changed from v1.

**Sibling plans this design builds on (read before implementing):**
- `khazayin-worktrees/progress/docs/plans/2026-10-21-reading-progress-tracking-{design,implementation-plan}.md`. Task 6 gives the segmented reader; Task 1 gives `pageForAyah`.
- `khazayin-worktrees/search/docs/plans/2026-10-21-content-search-reachability-{design,implementation-plan}.md` (v2). §4.4 is book detail (`BOOK_DETAIL_SECTIONS = ['cover','meta','primaryAction']`, `bookDetailHref`), §4.3 is `dismissTo`, and R7 is book identity.
- `khazayin-worktrees/saved/docs/plans/2026-10-21-saved-content-bookmarks-{design,implementation-plan}.md` (v2). It adds long-press **to save** on `LectureCard`/`RibbonCard` (`saveGestureProps`, `useSaveGesture`) and a `save` prop on the scholar-detail `RibbonCard`.
- `khazayin-worktrees/onboarding/docs/plans/2026-10-21-onboarding-flow-gaps-{design,implementation-plan}.md`. It adds the reciter preview in `audioEngine.ts`, a preview clear at the top of `playLecture`, and `syncBridge` suppression.

**Authorities used:**
- **Figma frames, for what must not move:** 16 (`2349:982`), 15 (`2349:829`), 14 (`2207:17898`), 6 (`2031:4659`), 19 (`2510:1990`) and 5 (`2001:940`).
- **Contracts, for every new surface:** none of the surfaces this ticket adds has a frame among the 28. They follow `constants/layout.ts` (`RTL_TEXT`, `PHYSICAL_ROW`, `PHYSICAL_BOX`), `constants/typography.ts` (`textStyle`) and the `theme.ts` `Khazain*` tokens. Each section says which applies.

---

## 1. Problem: what the audit found

Line numbers are from the current base, `0635ea1`. Task 0 re-confirms them after the rebase.

| Gap | Evidence |
|---|---|
| A note cannot point at content | `store/notesStore.ts:6-12`: `Note = { id, title, body, createdAt, updatedAt }`. `addNote(title, body)` at `:16`. |
| The persisted shape cannot grow safely | `store/notesStore.ts:48-52`: `persist` with no `merge`/coercion. Any added field is trusted blindly on hydrate. |
| The editor cannot receive a reference | `app/note-editor.tsx:21`: `Params = { id?, title? }`. |
| The viewer shows no source | `app/notes-viewer.tsx:60-78`: the row is time and title only. |
| Mushaf has no note action | The reader has no handlers, and the footer is the three Figma slots (`mushaf.tsx:245-253`). |
| Lecture playback has no note action | `MiniPlayer.tsx:15-66` is transport controls only. There is no full-screen player. |
| The Library "إضافة ملاحظة" only seeds a title | `library.tsx:331-334` calls `openNewNote(lecture.title)`. The title lands in the *body* (`note-editor.tsx:43-45`), and there is no link or position. |
| No content screen lists its notes | Notes are read only by Library, the editor, the viewer and the Settings export. |
| No way back to a source | There is no `ayah` param on the Mushaf route. `playLecture` cannot start at a chosen episode or second (`audioEngine.ts:142-152` only resumes the saved session). |
| No book detail screen today | Search v2 §4.4 creates it, and it has **no** notes slot. |

## 2. Acceptance criteria (verbatim)

1. A 'Take Note' action is available on Mushaf screen (linked to current ayah/page)
2. A 'Take Note' action is available on lecture playback (linked to current timestamp)
3. A 'Take Note' action is available on book detail screens
4. Created notes store the content reference (type, id, position) in addition to note text
5. Notes viewer shows the linked content reference with a tappable link back to source
6. Content detail screens show existing notes linked to that content
7. Linked notes display the source reference (e.g., 'البقرة: ٢٥٥' or 'محاضرة الشيخ — ١٢:٣٤')

## 3. App-wide long-press rule (user decision, 2026-10-21)

| Long-press on… | Means | Owner |
|---|---|---|
| `LectureCard`, `RibbonCard` (lecture rows) | **SAVE** to المحفوظات | saved v2 plan (`saveGestureProps`) |
| An ayah in the Mushaf reader | **NOTE** on that ayah | this ticket |
| The MiniPlayer | **NOTE** at the current second | this ticket |

The two gestures never share a surface. No note gesture goes on a lecture row, and no save gesture goes on an ayah or the MiniPlayer. A source-scan invariant test pins this rule (plan Task 19), and `CLAUDE.md` records it.

## 4. Approach chosen

### 4.1 Data model (AC 4)

`services/noteRefs.ts` is new and pure. It owns the types, labels, validation, builders and route params.

```ts
export const NOTE_REF_TYPES = Object.freeze(['ayah', 'lecture', 'book'] as const);
export type NoteRefType = (typeof NOTE_REF_TYPES)[number];

/** Stored shape. `type` and `context` are open strings so a newer build's refs survive here. */
export type NoteRef = {
  type: string;            // NoteRefType for refs this build creates
  id: string;              // ayah: padded surah id '002'; lecture: episode id 'ABC/002.mp3'; book: Book.id 'bk2'
  position?: number;       // ayah: ayah number; lecture: whole seconds; book: page (unused today)
  label: string;           // Arabic label frozen at creation, shown verbatim
  context?: string;        // creation context: 'mushaf' | 'mini-player' | 'library-progress' | 'book-detail'
  page?: number;           // ayah refs: Madani page from pageForAyah (progress Task 1)
  title?: string;          // lecture/book title (needed to rebuild playback)
  speaker?: string;        // lecture scholar (RNTP `artist`)
  [extra: string]: unknown; // unknown keys from a newer build are preserved, not stripped
};
export type Note = { id; title; body; createdAt; updatedAt; ref?: NoteRef };
```

**Identity**
- **Ayah:** `id` is the padded surah id (`normalizeSurahParam`, `services/mushafNavigation.ts:17`). `position` is the ayah. `page` is `pageForAyah(surah, ayah)` from the progress branch (`constants/quranPages.ts`). That closes "ayah/page" in AC 1 without a page-swipe reader.
- **Lecture:** `id` is the **episode id** `${archiveId}/${file}` (`services/archive/episodeResolver.ts:85`). It is the same id `playerStore.track.id` and `LectureSession.lectureId` already carry.
  - Lecture refs are built **only** for ids shaped `archiveId/file` (`/^[^/]+\/.+$/`). Any other track id gives an unlinked note rather than a link that cannot resolve.
  - The series is recovered with `id.split('/')[0]`, the same derivation as `audioEngine.ts:197`.
- **Book:** `id` is the **`Book.id` (`bk*`)**. This settles search R7 ("pick one canonical book id"), because book detail only ever receives `Book` ids (search §4.4). The sharh lecture (`b*`) played from that screen is a *lecture*, so a note taken while it plays (from the MiniPlayer) is a lecture ref. That split is intentional and is recorded in §8.
- **The label is stored, not derived on render.** The display stays stable if the catalogue changes. Structured fields drive navigation; the label is display only.

**Persistence: no version bump** (CTO change 1). This mirrors `store/settingsStore.ts:377-395`, which uses `merge` plus coercion and no zustand `version`/`migrate`.
- `persist` gains `merge: (persisted, current) => ({ ...current, notes: coerceNotes(persisted) })`. The storage key `@khazain/notes` and the implicit version `0` are unchanged.
- **Why no version bump:** a build that bumps `version` writes `version: 1`. An older build (no `migrate`) that later reads that record logs a version mismatch, and zustand discards the persisted state, so **notes are lost on downgrade**. With merge-only, the older build reads `{ notes }` and ignores `ref`. Its `updateNote` spreads `{ ...n, ...patch }` (`notesStore.ts:37-41`), so the ref survives an edit in the old build and is intact after re-upgrade. QA row 18 checks this.
- **Coercion is lenient, and it never throws.**
  - A note is kept when `id` is a non-empty string. `title` and `body` default to `''`, and the timestamps default to `0`.
  - A ref is **dropped only when it is structurally malformed**: not an object, `type`/`id`/`label` not a non-empty string, or `position`/`page` present but not a finite integer ≥ 0.
  - **Unknown `type`/`context` values and unknown keys are kept**, so a newer build's refs survive a round trip through this build. The UI shows their label but offers no link (`noteSourceTarget` returns `null` for an unknown type).
  - Junk such as `null`, a string, `{ notes: 'x' }` or non-object entries never throws. It degrades to the valid subset, or to `[]` only when `notes` is not an array.
- As `settingsStore.ts:379-387` explains, `merge` does not write back at hydrate. The coerced state reaches disk on the next note change, which is harmless because coercion is idempotent.
- `addNote(title, body, ref?)` is backward compatible. `updateNote` keeps `ref`.

**Selectors** are exported pure from `store/notesStore.ts`:
- `notesFor(notes, type, id)` returns store order (newest first).
- `notesForLectureSeries(notes, archiveIds)`
- `archiveIdOfEpisode(id)`
- `useLinkedNotes(type, id)` subscribes to `notes` and `useMemo`s the filter. It never returns a fresh array from the zustand selector, which would loop under zustand 5.

### 4.2 Arabic reference labels (AC 7)

These are pure functions in `services/noteRefs.ts`. Digits are Arabic-Indic via `toArabicDigits` (`constants/progress.ts:141`). Lecture labels lead with the **title, with the speaker as fallback** (user decision Q2).

| Input | Output |
|---|---|
| `ayahRefLabel(2, 255)` | `البقرة: ٢٥٥` |
| `ayahRefLabel(2)` (surah-level, a11y path) | `سورة البقرة` |
| `formatPlaybackTime(754)` / `(3723)` / `(-1)` | `١٢:٣٤` / `١:٠٢:٠٣` / `٠:٠٠` |
| `lectureRefLabel('آداب الدعاء', 'الشيخ عبد المحسن العباد', 754)` | `محاضرة آداب الدعاء — ١٢:٣٤` |
| `lectureRefLabel('', 'الشيخ ابن عثيمين', 754)` | `محاضرة الشيخ ابن عثيمين — ١٢:٣٤` |
| `lectureRefLabel(title, speaker)` (no duration) | `محاضرة آداب الدعاء` |
| `bookRefLabel('الأصول الثلاثة')` / `(…, 12)` | `كتاب الأصول الثلاثة` / `كتاب الأصول الثلاثة — صفحة ١٢` |

**Bidi:** each time is an Arabic-Number run joined by single common separators. UAX #9 rule W4 makes `:` part of the run, so the time renders as one left-to-right numeral group inside the RTL label. The em dash is neutral. Every Text that shows a label spreads `RTL_TEXT` (`constants/layout.ts:112`).

### 4.3 Mushaf reader: Take Note (AC 1), the linked notes (AC 6) and navigating back

The reader here is the **progress branch's segmented reader** (progress Task 6):
- one `<Text>` per Madani page segment from `groupAyatByPage(surahNumber, ayat)`
- segment layouts kept in `layoutsRef` (relative to the body wrapper, whose `y` is `bodyYRef`)
- a `ScrollView` with `onScroll`/`onLayout`
- `ReadingView` still keyed `key={surahId}`

All anchors below are in that version.

**Take Note: long-press an ayah.**
- Inside each segment `<Text>`, each ayah's text becomes a nested `<Text onLongPress suppressHighlighting>`. Nested press handlers are supported on iOS and Android and keep the justified paragraph flow.
- Long-press gives a light haptic (`expo-haptics`, `package.json:35`, guarded with `Platform.OS !== 'web'`, matching the saved plan's Q4), then `router.push('/note-editor', takeAyahNoteParams(surahId, n))`. The ref carries `position = n` and `page = pageForAyah(surah, n)`.
- **Accessibility:** nested spans are not focusable, so each segment `<Text>` declares `accessibilityActions=[{ name: 'addSurahNote', label: 'إضافة ملاحظة على السورة' }]`. That creates a surah-level ref (no position, label `سورة البقرة`).

**Visible cue (user decision Q1).**
- At the end of the reading surface, after the body wrapper and inside the `ScrollView`, a caption hint `اضغط مطولًا على آية لإضافة ملاحظة` appears **when the surah has no linked notes**.
- When the surah has notes, the hint is replaced by the **"ملاحظاتك على هذه السورة"** section. Rows are sorted by ayah, a row tap opens the editor, and a label tap scrolls to that ayah.
- Both sit outside the segment wrapper, so the progress branch's segment offsets and page-in-view detection are unaffected.
- **Dropped from v1:** the ayah-number tint (an optional change the CTO accepted). The hint and the section carry the cue.

**Navigating back to an ayah: `/sections/mushaf?surah=2&ayah=255`** (CTO change 2).
- `normalizeAyahParam(raw, ayahCount)` validates the param.
- **Line lookup instead of a whole-surah character fraction:**
  1. `segmentForAyah(segments, n)` finds the page segment holding ayah *n*.
  2. Each segment `<Text>` adds `onTextLayout={(e) => linesRef.current.set(page, e.nativeEvent.lines)}`.
  3. `ayahCharOffset(segment.ayat, n)` counts the characters before ayah *n* **exactly as rendered**. For each earlier ayah that is `text.length` plus the `AyahNum` marker `'  ' + String(number) + '  '` (4 + digits, `mushaf.tsx:268-276`), plus the `' '` separator between ayat (`mushaf.tsx:237`).
  4. `lineYForOffset(lines, offset)` walks the cumulative `line.text.length` and returns the first line whose span contains the offset. The lookup counts characters; it does not match strings. That answers the fragility progress §4.2 raised against string matching.
  5. `ayahScrollY({ bodyY, segmentY, lines, offset, segmentHeight, fraction })` gives `bodyY + segmentY + lineY`. **Fallback:** when there are no lines yet, or when the summed line lengths differ from the expected segment length by more than 5% (some platforms trim trailing whitespace), it uses `bodyY + segmentY + fraction × segmentHeight` with the character fraction *within the segment*. The error is then bounded by one Madani page, not the whole surah.
  6. The view scrolls to `max(0, y − 80)`.
- **Remember the last ayah scrolled to, not a boolean.** `ReadingView` is keyed by surah, so `?surah=2&ayah=255` → `?ayah=286` does **not** remount. `scrolledAyahRef = useRef<number | null>(null)` scrolls when `targetAyah !== scrolledAyahRef.current` and the measurements are ready, then stores it. A null target resets the ref, so the same ayah can be revisited.
- The target ayah's span gets `backgroundColor: KhazainColors.cream200` (cream200 is `#EFE4D0`; `cream100` equals `pageBg`).

**Alternatives rejected**
- *A fourth footer button or a header icon.* Breaks frame 16's three fixed slots and CLAUDE.md's footer contract.
- *Long-press opens a menu.* `Alert` is capped at three buttons on Android, and a sheet route for one action is too much. The notes are inline.
- *v1's whole-surah character fraction.* Superseded by per-segment line lookup now that segments are measured.

### 4.4 Lecture playback: Take Note (AC 2)

**MiniPlayer: a visible note button plus long-press (user decision Q1).**
- **Visible button.** A 32×32 icon button uses `FigmaIcon name="LibraryNotes"` (the same glyph as the Library "ملاحظاتي" card, `library.tsx:302`), size 18, `navy800`, `accessibilityLabel="إضافة ملاحظة عند هذه اللحظة"`.
  - Physical left → right, the row is **transport cluster, note button, title block, cover**. That is the existing order (`MiniPlayer.tsx:29`) with the button between transport and title.
  - The title block keeps `flex: 1` with `numberOfLines={1}`, so long titles truncate rather than wrap.
  - **No frame draws the MiniPlayer** (`MiniPlayer.tsx:122`), so this changes a shipped component but no frame. `miniPlayerReach.test.ts` invariants still hold.
- **Long-press.** On the title-and-cover group it does the same thing as the button (for discoverability) and adds a `longpress` accessibility action.
- **Position.** `takeLectureNoteParams(track, progress)` reads `usePlayerStore.getState()` **at press time**. It does not subscribe, which preserves the ~1 Hz render isolation at `MiniPlayer.tsx:16-19`.
  - `position = round(progress × durationSec)`, and is omitted when there is no duration.
  - It returns plain-note params when the track id is not episode-shaped.

**Library in-progress card.** "إضافة ملاحظة" (`library.tsx:331-334`) now opens the editor with `lectureNoteParamsFromSession(inProgressLecture)`, where `id = lectureId` and `position = positionSec`. The label and position are unchanged (frame 6).

**Back to a lecture** (CTO change 4).
- `playLecture(lecture, start?)` gains `start = { episodeId, positionSec }`. Two pure helpers decide the start point:
  - `resolveStartPoint(episodes, inProgress, start)` prefers `start` when its episode exists in the series, and otherwise falls back to the existing resume logic.
  - `clampStartPosition(pos, durationSec)` returns `min(max(0, pos), durationSec − 1)` when the duration is known.
- **Start via `TrackPlayer.skip(index, initialPosition)`**, including index 0 when the position is > 0. This replaces `skip(index)` followed by a separate `seekTo`, so the first audible frame is already at the right second.
  - When `index === 0 && pos === 0`, neither skip nor seek runs (unchanged).
  - **This changes the resume expectation at `audioEngine.test.ts:148-149` deliberately.** It becomes `skip(1, 120)`, with `seekTo` not called.
- **One-time seek correction.** After `play()`, a one-shot `Event.PlaybackState` listener runs on the first `Ready`/`Playing`. It reads `getProgress()`, and if `needsSeekCorrection(actual, target)` is true (`actual < target − 2`) it calls `seekTo(target)` once, then removes itself. This covers streams where `initialPosition` is ignored before the item is ready.
- **Fast path, an accepted optional.** If the start episode is already in the active RNTP queue (`getQueue()` ids), the engine skips `fetchItemMetadata` and `reset()`. It calls `skip(idx, pos)` and `play()`, then mirrors `setTrack`. This applies to the scholar-footer and viewer links while the same series is playing.
  - **Onboarding preview:** preview tracks have different ids, so they never match. The onboarding plan's "clear preview at the top of `playLecture`" stays first.
- **Side effect, recorded on purpose.** Jumping to a lecture note **replaces that series' متابعة position**. The progress ticks after the seek move `inProgressLecture` to the note's second, so the Library card resumes from there afterwards. Accepted: the user chose to go to that moment.

**Alternatives rejected:** a new full-screen player route (much larger than the ticket and has no frame), and keeping a separate `seekTo` after `skip` (an audible jump from 0:00, plus an extra await on every resume).

### 4.5 Which "content detail" screen lists lecture notes (AC 6)

**Scholar detail** (`app/(tabs)/sections/scholar/[id].tsx`). On top of the saved v2 plan's `RibbonCard save` prop, its `FlatList` (`:52-66`) gains a `ListFooterComponent`, a `LinkedNotesSection` titled "ملاحظاتي على هذه الدروس".
- It shows `notesForLectureSeries(notes, archiveIds)` and renders `null` when empty, so frame 19 is unchanged.
- A row tap opens the editor. A label tap plays that episode at that second.
- **No note gesture on `RibbonCard`**, because long-press there means SAVE (§3).

The Library in-progress card is not changed visually (frame 6).

### 4.6 Notes viewer (AC 5, AC 7) (CTO change 3)

- `NoteRow` (`notes-viewer.tsx:60-78`) gains a second line when `note.ref` is set: a `NoteRefLink` (the label in `textStyle('caption')`, `navy800`, `RTL_TEXT`).
- A link tap **closes, then navigates**:
  1. `router.back()` closes the sheet.
  2. `runNoteSource(target, { navigate: (href) => router.navigate(href as any), play: startLecturePlayback })`.
- `openNoteSource`/`runNoteSource` **never dismiss anything themselves**. Each caller owns its own presentation: the viewer closes itself, and the scholar footer and the reader's own section just run the target.
- **Fallback** if Android back after this path lands on a duplicate Library: the search v2 pattern `router.dismissTo(href, { withAnchor: true })` (search §4.3, R1). QA row 11 states the expected back stack.
- Unknown ref types show their label with no link.
- **No frame among the 28.** The `.fig` file does hold an *unmapped* "ملاحظة سريعة" frame with an "عرض الملاحظات" list of time-plus-title rows. It is outside the 28-frame spec (CLAUDE.md), and the second line for linked notes is a recorded deviation from it (§6). Contracts: `PHYSICAL_ROW` (`constants/layout.ts:125`), `textStyle`, `KhazainColors`.

### 4.7 Note editor (CTO change 5)

- `Params` gains `refType`, `refId`, `refPos`, `refPage`, `refLabel`, `refContext`, `refTitle` and `refSpeaker` (`noteRefToParams`/`noteRefFromParams`). The `ref` prefix avoids clashing with the existing `id`/`title`.
- A linked new note shows a static chip, `مرتبطة بـ <label>`, under the sheet title. `save()` passes the ref to `addNote`.
- **The "آخر الملاحظات" rows** (`note-editor.tsx:145-163`) gain the ref label under the title for linked notes. This uses the same row-model helper as the viewer. No frame among the 28 covers it, and the same unmapped-frame deviation applies.

### 4.8 Library "آخر الملاحظات" rows: excluded (CTO change 5)

Frame 6 (`2031:4659`) draws these rows (`DIV-126` → `DIV-127`/`DIV-134`) as a **single line: `SPAN-128` time plus `SPAN-131` title**. That was read from `docs/KHAZAYIN.fig` with `scripts/figma/extract-text-styles.js`. A second label line would change the frame's row geometry, so it is a Figma conflict and **the label is not added on Library**. It is one tap away in the viewer. Recorded in §6.

### 4.9 Book detail (AC 3, AC 6)

Search v2 dropped the reserved notes slot. This ticket adds its own section:
- `constants/bookDetailPresentation.ts` becomes `BOOK_DETAIL_SECTIONS = ['cover', 'meta', 'primaryAction', 'notes']`. Search's `__tests__/bookDetail.test.ts` order assertion is updated **deliberately**.
- The `notes` section, built only when `detail` resolved, contains:
  - a `sectionTitle` "ملاحظاتي"
  - a `PillButton` (variant `cream`, label "إضافة ملاحظة") that pushes the editor with `bookNoteParams(detail)` (`makeBookRef({ id: detail.id, title: detail.title })`, no page)
  - `<LinkedNotesSection notes={useLinkedNotes('book', detail.id)} />`
- The notes section always shows its title and button. Book detail has no frame, so nothing must stay identical. The list part renders `null` when empty.
- `noteSourceTarget` for a book reuses search's **`bookDetailHref(id)`** (`services/bookDetail.ts`) rather than a second path constant.
- Contracts: search §4.4 (`PHYSICAL_BOX` content, `textStyle`), `constants/layout.ts`, `theme.ts`.

### 4.10 Shared UI

`components/khazain/notes/` is new and re-exported from `components/khazain/index.ts`.
- `NoteRefLink` is pressable only when given `onPress`.
- `LinkedNotesSection` keeps the `if (notes.length === 0) return null;` guard.
- `linkedNotesModel.ts` is a pure row model, `{ id, title, label?, time }`, plus `sortByPosition`.
- Rows are authored physical left → right in `PHYSICAL_ROW`: the time, then a title-and-label column.

## 5. Data, route and store changes

| Area | Change |
|---|---|
| `services/noteRefs.ts` (new) | Types, labels, lenient `coerceNoteRef`, builders, `noteRefToParams`/`noteRefFromParams` |
| `services/noteActions.ts` (new) | Pure param builders: `takeAyahNoteParams`, `takeLectureNoteParams`, `lectureNoteParamsFromSession`, `bookNoteParams` |
| `store/notesStore.ts` | `Note.ref?`, `addNote(title, body, ref?)`, `merge` + `coerceNotes` (no `version`), selectors, `useLinkedNotes` |
| `services/mushafNavigation.ts` | `normalizeAyahParam`, `segmentForAyah`, `ayahCharOffset`, `lineYForOffset`, `ayahScrollY` |
| `services/audioEngine.ts` | `resolveStartPoint`, `clampStartPosition`, `needsSeekCorrection`, `playLecture(lecture, start?)` with `skip(i, pos)`, the one-shot correction and the queue fast path |
| `services/lecturePlayback.ts` | `startLecturePlayback(lecture, start?)` |
| `services/noteNavigation.ts` (new) | `noteSourceTarget(ref)` (pure) and `runNoteSource(target, deps)` (never dismisses) |
| `constants/bookDetailPresentation.ts` | adds the `'notes'` section |
| `__mocks__/react-native-track-player.ts` | adds `getQueue` |
| Routes | `/sections/mushaf` accepts `?ayah=`, and `/note-editor` accepts the `ref*` params. **No new routes, and `app/_layout.tsx` is untouched.** |
| UI | `note-editor.tsx`, `notes-viewer.tsx`, `mushaf.tsx`, `MiniPlayer.tsx`, `library.tsx` (handler only), `scholar/[id].tsx`, `sections/book/[id].tsx`, the new `components/khazain/notes/*` |
| Docs | `CLAUDE.md`: the long-press rule (§3), the `notesStore` API, and `components/khazain/notes/` |

**No new dependencies.** `expo-haptics`, `zustand/middleware` and `expo-router` are already declared.

## 6. Figma frames and conflicts between the criteria and Figma

Captures are compared on a fresh install with no notes and no track loaded.

| # | Node | Route | Must stay identical | May differ |
|---|---|---|---|---|
| 16 | `2349:982` | `/sections/mushaf?surah=2` | Header, meta line, and footer (`MUSHAF_FOOTER_ORDER`, three slots) | The reading surface is not drawn by the frame (`mushaf.tsx:36-39`). The hint line, the notes section, and the `?ayah=` highlight and scroll live there. |
| 15 | `2349:829` | resume transition | everything | nothing |
| 14 | `2207:17898` | `/sections/mushaf` | everything | nothing |
| 6 | `2031:4659` | `/library` | everything, including the in-progress "إضافة ملاحظة" and the "آخر الملاحظات" rows | nothing; the handler only |
| 5 | `2001:940` | `/` | everything | nothing. No track means no MiniPlayer. |
| 19 | `2510:1990` | `/sections/scholar/s1` | everything | the footer, only when notes exist |

| Criterion | Conflict | Resolution |
|---|---|---|
| AC 1 (Mushaf Take Note) | Frame 16's footer is three fixed slots. | Long-press on the ayah, plus a hint line in the undrawn reading surface, plus an accessibility action. No chrome. |
| AC 6 (Mushaf notes) | Frame 16 has no notes area. | A section in the undrawn reading surface, replacing the hint when notes exist. |
| AC 2 (lecture note) | No frame draws a player. | A visible MiniPlayer button plus long-press (user decision). The MiniPlayer has no frame, so no frame changes. |
| AC 6 (lecture notes) | Frame 19 has no notes area. | A conditional `ListFooterComponent`. |
| AC 7 on Library | Frame 6 draws "آخر الملاحظات" rows as single-line time plus title. | **Label excluded on Library.** It shows in the viewer, the editor and the content screens. |
| AC 5/7 in the viewer and editor | The unmapped "ملاحظة سريعة" frame (not among the 28) draws time-plus-title rows. | A second line for linked notes only. It is outside the 28-frame spec, so this is a recorded deviation, not a conflict. |

## 7. RTL considerations

- New rows are authored physical left → right inside `PHYSICAL_ROW`, with no `row-reverse` and no `I18nManager`. Containers whose `textAlign: 'right'` must mean the physical right spread `PHYSICAL_BOX`.
- The MiniPlayer's new order (transport, note, title, cover) is authored inside the existing `PHYSICAL_ROW` (`MiniPlayer.tsx:151-156`).
- Nested ayah spans inherit `writingDirection: 'rtl'`. The highlight is a background colour only.
- `rtlPhysicalContract.test.ts` and `rtlVisualContracts.test.ts` must stay green.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Line lookup diverges across platforms (trailing-space trimming, justification). | The 5% length check falls back to the in-segment fraction (error ≤ one page), and the highlight marks the ayah. QA on iOS and Android with 2:255, 2:286 and 18:1. |
| `skip(index, initialPosition)` is ignored on some streams. | The one-shot correction seeks once if the position is more than 2 s short. The position is capped at duration − 1 so the track never ends instantly. |
| Close-then-navigate leaves a duplicate Library on the Android back stack. | QA row 11. Fallback `dismissTo(href, { withAnchor: true })` (search R1). |
| A newer build's refs are mangled by this build. | Lenient coercion keeps unknown types, contexts and keys (test). |
| Notes are lost on downgrade. | No persist version bump (§4.1). QA row 18. |
| Gesture overlap with save. | §3 rule plus the invariant test (Task 19). |
| Book identity split (search R7). | Notes key on `Book.id`. A note taken while the sharh (`b*`) plays from the MiniPlayer is a lecture note. Both are correct, and a book's notes never include its sharh's lecture notes. |
| Rebase conflicts across four sibling branches. | Task 0 rebases first, and every UI task cites the post-rebase symbol, not a line. Shared files: `mushaf.tsx` (progress), `scholar/[id].tsx` and `RibbonCard` (saved), `audioEngine.ts` and its tests (onboarding), `bookDetailPresentation.ts` and `book/[id].tsx` (search). |
| Source-scan tests are brittle. | Used only for invariants: the null guard, three footer slots, `PHYSICAL_ROW` with no `row-reverse`, `getState()` rather than a subscription, and the long-press rule. Behaviour is tested through the pure helpers. |

## 9. Out of scope

- The ayah-number tint (dropped in v2).
- Book page positions (no reader).
- Labels in Library rows (§4.8).
- The ref label in the Settings notes export.
- A filtered viewer mode.
- Wiring the Mushaf footer buttons.
- A full-screen player.
- Notes encryption (the accepted risk in CLAUDE.md).
- Cloud sync.

## 10. Open questions

None blocking. The v1 questions are resolved in §11. **Residual Q6:** should the MiniPlayer button also appear in the scholar-detail `MiniPlayerDock`? Default: **yes**, because it is the same component.

## 11. User decisions (2026-10-21)

| # | Decision |
|---|---|
| Q1 | Long-press **plus visible cues**: a note icon on the MiniPlayer, and the Mushaf end-of-surah hint `اضغط مطولًا على آية لإضافة ملاحظة` when the surah has no notes. |
| Q2 | Lecture label leads with the title, with the speaker as fallback. |
| Rule | Long-press on `LectureCard`/`RibbonCard` means SAVE. Long-press on an ayah or the MiniPlayer means NOTE (§3). |
| Q3 | Scholar detail is the lecture detail screen (CTO-approved default). |
| Q4 | Long-press opens the editor directly (CTO-approved default). |
| Q5 | Ayah refs store the page via `pageForAyah` (enabled by the progress branch). |

## 12. Changes from v1

1. No persist `version`/`migrate`. Merge plus lenient coercion keeps unknown types, contexts and keys, and a downgrade QA row is added.
2. Ayah scroll uses per-segment `onTextLayout` line lookup on the progress branch's segments, with an in-segment fallback. The scroll remembers the last ayah instead of a boolean.
3. `openNoteSource` no longer dismisses. The viewer closes, then navigates, and Android back stack QA is added.
4. Lectures start via `skip(index, initialPosition)` with a one-shot seek correction and a cap at duration − 1. The resume test is changed deliberately, and an active-queue fast path is added.
5. The ref label appears in the editor's "آخر الملاحظات". The Library rows are excluded because of the frame 6 conflict.
6. Behaviour is tested through pure helpers (`services/noteActions.ts`). Source scans are kept for invariants only. Every test importing `notesStore` mocks AsyncStorage.
7. User decisions: a visible MiniPlayer note button and a Mushaf hint, lecture labels lead with the title, and the long-press rule.
8. Built last on search v2 and progress: book detail gets its own `'notes'` section, and the Mushaf tasks target the segmented reader.
9. The optional changes taken: drop the ayah tint, merge v1 Tasks 1–3 and 19–20, the active-queue fast path, episode-shaped lecture refs only, and the note on the متابعة side effect. **`context` is kept** (optional and open) because the ticket names "creation context".
