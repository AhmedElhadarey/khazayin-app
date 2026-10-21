# Contextual Notes Linked to Content: Design

- **Ticket:** "Contextual Notes Linked to Content" (https://trello.com/c/g42hsH45). It is marked Done on the board but failed the acceptance-criteria audit.
- **Branch:** `feat/contextual-notes`. Book-detail work runs after a rebase onto `fix/search-route-and-navigation`.
- **Date:** 2026-10-21
- **Authorities used:** Figma frames 16 (`2349:982`), 15 (`2349:829`), 6 (`2031:4659`), 19 (`2510:1990`) and 5 (`2001:940`), for what must not move. Every surface this ticket adds has no frame, so `constants/layout.ts` (RTL contract), `constants/typography.ts` (`textStyle` roles) and the `theme.ts` `Khazain*` tokens govern them. This doc says which applies in each place.

---

## 1. Problem: what the audit found

Almost none of the ticket exists in code:

| Gap | Evidence |
|---|---|
| A note cannot point at content | `store/notesStore.ts:6-12`: `Note = { id, title, body, createdAt, updatedAt }`. `addNote(title, body)` at `:16` takes no reference. |
| Persist has no versioning | `store/notesStore.ts:48-52`: `persist(..., { name: '@khazain/notes', storage })` has no `version` and no `migrate`, so we cannot add a field safely. |
| The editor cannot receive a reference | `app/note-editor.tsx:21`: `type Params = { id?: string; title?: string }`. |
| The viewer shows no source | `app/notes-viewer.tsx:60-78`: `NoteRow` renders relative time and title only. |
| Mushaf has no note action | `app/(tabs)/sections/mushaf.tsx:148-256`: `ReadingView` renders ayat as one `<Text>` (`:227-240`) and has no handlers. The footer (`:245-253`) has exactly the three Figma slots. |
| Lecture playback has no note action | `components/khazain/primitives/MiniPlayer.tsx:15-66` has transport controls only. No full-screen player route exists. |
| The Library "إضافة ملاحظة" only seeds a title | `app/(tabs)/library.tsx:331-334` calls `openNewNote(lecture.title)` (`:266-267`). The editor puts that title into the *body* (`note-editor.tsx:43-45`). No position or link is kept. |
| No content screen lists its notes | Nothing reads notes outside Library, the editor, the viewer and the Settings export. |
| No way back to the source | There is no `ayah` param on the Mushaf route (`mushaf.tsx:44`) and no way to start a lecture at a given episode and second (`services/audioEngine.ts:142-152` only resumes the saved session). |
| No book detail screen | `app/(tabs)/sections/book/[id].tsx` does not exist. The Content Search ticket creates it, and this branch gets rebased onto that one. |

## 2. Acceptance criteria (verbatim)

1. A 'Take Note' action is available on Mushaf screen (linked to current ayah/page)
2. A 'Take Note' action is available on lecture playback (linked to current timestamp)
3. A 'Take Note' action is available on book detail screens
4. Created notes store the content reference (type, id, position) in addition to note text
5. Notes viewer shows the linked content reference with a tappable link back to source
6. Content detail screens show existing notes linked to that content
7. Linked notes display the source reference (e.g., 'البقرة: ٢٥٥' or 'محاضرة الشيخ — ١٢:٣٤')

## 3. Approach chosen

### 3.1 Data model (AC 4)

There is one new pure module, `services/noteRefs.ts`, and it owns the reference type, the label formatters, validation and route-param encoding.

```ts
export type NoteRefType = 'ayah' | 'lecture' | 'book';
export type NoteRefContext = 'mushaf' | 'mini-player' | 'library-progress' | 'book-detail';

export type NoteRef = {
  type: NoteRefType;
  /** ayah: padded surah id ('002'); lecture: RNTP episode id ('ABC/002.mp3'); book: book id */
  id: string;
  /** ayah: ayah number; lecture: whole seconds; book: page. Omitted when unknown. */
  position?: number;
  /** Arabic label frozen at creation ('البقرة: ٢٥٥'). Shown verbatim. */
  label: string;
  /** "Creation context": which surface created the note. */
  context: NoteRefContext;
  /** lecture/book: content title (needed to rebuild playback and to relabel) */
  title?: string;
  /** lecture: scholar name (RNTP `artist`, needed to rebuild playback) */
  speaker?: string;
};

export type Note = { id; title; body; createdAt; updatedAt; ref?: NoteRef };
```

- **The lecture `id` is the episode id**, not the series id. `resolveEpisodes` builds `${archiveId}/${file}` (`services/archive/episodeResolver.ts:85`). That is the same id `playerStore.track.id` and `LectureSession.lectureId` already carry, so all three entry points agree. The series is recovered with `id.split('/')[0]`, the same derivation `togglePlayback` uses at `services/audioEngine.ts:197`.
- **The label is stored, not derived on render.** The ticket asks for the source reference to be displayed, and a stored label stays stable even after the content catalogue changes. The structured fields (`type/id/position`) drive navigation. The label is only for display.
- `addNote(title, body, ref?)` stays backward compatible. `updateNote` keeps `ref` (it only patches `title`/`body`).
- **Persist migration:** add `version: 1` and `migrate: migrateNotesState`. Existing installs are stored at zustand's implicit version `0`, so `migrate` runs once. It keeps every note and passes each `ref` through `coerceNoteRef`, which drops a malformed ref without losing the note. zustand writes the migrated state back because `migrate` ran. The storage key `@khazain/notes` **does not change**. `services/cache/keys.ts:7` and `cacheFacade` protect it as user content.
- **Selectors** are pure functions exported from `store/notesStore.ts`:
  - `notesFor(notes, type, id)` returns the notes whose `ref` matches, in store order (newest first).
  - `notedAyahNumbers(notes, surahId)` returns a `Set<number>` for the ayah-number tint.
  - `notesForLectureSeries(notes, archiveIds)` returns lecture notes whose episode belongs to any of the given series. The scholar screen uses it.
  - `useLinkedNotes(type, id)` subscribes to `notes` and memoises `notesFor`. It never returns a fresh array from the zustand selector itself, which would loop under zustand 5's `useSyncExternalStore`.

### 3.2 Arabic reference labels (AC 7)

These are pure functions in `services/noteRefs.ts`. All digits are Arabic-Indic, via `toArabicDigits` (`constants/progress.ts:141`).

| Input | Output |
|---|---|
| `ayahRefLabel(2, 255)` | `البقرة: ٢٥٥` |
| `ayahRefLabel(2)` (surah-level note, a11y path) | `سورة البقرة` |
| `formatPlaybackTime(754)` | `١٢:٣٤` (m:ss, minutes unpadded) |
| `formatPlaybackTime(3723)` | `١:٠٢:٠٣` (h:mm:ss at ≥ 1 h) |
| `formatPlaybackTime(-1 / NaN)` | `٠:٠٠` |
| `lectureRefLabel('آداب الدعاء', 'الشيخ عبد المحسن العباد', 754)` | `محاضرة آداب الدعاء — ١٢:٣٤` |
| `lectureRefLabel('', 'الشيخ ابن عثيمين', 754)` | `محاضرة الشيخ ابن عثيمين — ١٢:٣٤` (speaker is the fallback when there is no title) |
| `lectureRefLabel(title, speaker)` (no duration known) | `محاضرة آداب الدعاء` |
| `bookRefLabel('الأصول الثلاثة')` | `كتاب الأصول الثلاثة` |
| `bookRefLabel('الأصول الثلاثة', 12)` | `كتاب الأصول الثلاثة — صفحة ١٢` |

The ticket's sample `'محاضرة الشيخ — ١٢:٣٤'` reads as "lecture <speaker/title>". We use the **title** first because a title identifies a lecture and a speaker does not. Every lecture row in frame 19 carries the same speaker. The speaker is the fallback.

**Bidi:** `١٢:٣٤` and `١:٠٢:٠٣` are Arabic-Number runs separated by single common separators. UAX #9 rule W4 folds each `:` into the AN run, so the time renders as one left-to-right numeral group inside the RTL label, which is the Arabic convention. The ` — ` em dash is a neutral and takes the paragraph's RTL direction. Every Text that shows a label spreads `RTL_TEXT` (`constants/layout.ts:112`).

### 3.3 Mushaf: Take Note (AC 1) and its linked notes (AC 6)

**Affordance: long-press on an ayah opens the note editor linked to that ayah.**

- Each ayah's text becomes a nested `<Text onLongPress>` inside the existing single justified `<Text>` (`mushaf.tsx:227-240`). React Native supports press handlers on nested Text on iOS and Android without breaking the paragraph flow, so the justified layout does not change.
- On long-press, `expo-haptics` (already in `package.json`) fires a light impact, then `router.push({ pathname: '/note-editor', params: noteRefToParams(makeAyahRef(surahId, n, 'mushaf')) })`.
- **Accessibility:** nested Text spans are not individually focusable. The ayat body `<Text>` therefore declares `accessibilityActions=[{ name: 'addSurahNote', label: 'إضافة ملاحظة على السورة' }]`. That action creates a surah-level note (`position` omitted, label `سورة البقرة`).
- **Page:** the reader has no page-swipe yet. `currentPage` is `surahStartPage` (`mushaf.tsx:159`), so a page number would always be the surah's first page and would mislead. AC 1's "ayah/page" is met by the ayah. A page field is a follow-up for when real paging lands (see Out of scope).

**Linked notes on the reader:**
- **"ملاحظاتك على هذه السورة" section** is appended inside the reading `ScrollView` after the ayat. It renders `null` when the surah has no linked notes. The rows are sorted by ayah number, and tapping a row opens the note in the editor.
- **Ayah-number tint:** ayah numbers that have notes render in `navy800` instead of `gold600` (`mushaf.tsx:362-366`). This is a colour change only, with no added glyph and no layout shift.

**Navigating back to an ayah:** `/sections/mushaf?surah=2&ayah=255`.
- `normalizeAyahParam` (in `services/mushafNavigation.ts`) validates the param against the loaded ayah count.
- The reader scrolls to an *approximate* offset: `ayahScrollFraction(ayat, n)` is the share of characters before ayah *n*, times the measured height of the ayat text block. It cannot be exact, because one justified Text cannot report per-span positions. The scroll fires once, after both layout and data settle.
- The target ayah then renders with a `cream200` background, so the reader can find it even if the scroll is a line or two off.

**Alternatives rejected:**
- *A fourth footer button or a header icon.* This breaks frame 16's three fixed slots (Index, Go to bookmark, Save bookmark) and CLAUDE.md's footer contract.
- *Long-press opens an action menu* ("إضافة ملاحظة" / "عرض الملاحظات"). `Alert` is capped at three buttons on Android and looks off-brand. A new sheet route adds a whole screen for what would be one action, because the linked notes are already listed inline on the reader. The direct long-press keeps one gesture to one outcome.
- *Splitting ayat into one `<Text>` per ayah* so each can be measured exactly. This changes how the justified paragraph flows and risks the reading surface for a scroll-precision gain the highlight already covers.

### 3.4 Lecture playback: Take Note (AC 2)

There is no full-screen player. Playback is the MiniPlayer plus the Library in-progress card.

- **MiniPlayer:** a **long-press on the title block or the cover** (`MiniPlayer.tsx:46-57`) opens the editor with `lectureRefFromTrack(track, progress, 'mini-player')`. The position is `round(progress × durationSec)`, frozen at the moment of the long-press while playback continues. When the track has no `durationSec`, `position` is omitted and the label has no time.
  - Screen-reader users get the same action through `accessibilityActions=[{ name: 'longpress', label: 'إضافة ملاحظة' }]` plus `accessibilityHint="اضغط مطولًا لإضافة ملاحظة"`.
  - **No pixels change.** `MiniPlayer.tsx:122` records that no frame among the 28 draws a MiniPlayer, and nothing visible is added.
- **Library in-progress card:** the existing "إضافة ملاحظة" button (`library.tsx:331-334`) now opens the editor with `lectureRefFromSession(inProgressLecture, 'library-progress')` (`id = lectureId`, `position = positionSec`). It no longer seeds the body with the title. The label and the position of the button stay the same.

**Navigating back to a lecture:**
1. `openNoteSource` dismisses the viewer.
2. It calls `startLecturePlayback(lecture, { episodeId: ref.id, positionSec: ref.position ?? 0 })`.
3. `playLecture` (`services/audioEngine.ts:132`) gains an optional `start` argument. A new pure `resolveStartPoint(episodes, inProgress, start)` prefers the explicit start over the saved session and falls back to the old resume logic when the episode is no longer in the series.

The MiniPlayer shows the track as usual. This is the single existing playback path (`services/lecturePlayback.ts:12`), and no second player is introduced.

**Alternatives rejected:**
- *A visible "note" icon in the MiniPlayer.* No frame governs the MiniPlayer, but it changes a shipped component's look for every user, and the ticket doesn't require a visible control. This is open question Q1 for the user.
- *A new full-screen player route.* It is far larger than the ticket and has no frame.

### 3.5 Lectures: which "content detail" screen lists their notes (AC 6)

**Decision: the scholar detail screen** (`app/(tabs)/sections/scholar/[id].tsx`). It is the only screen that is the detail page for a set of lectures.
- It gets a `ListFooterComponent` on its `FlatList` (`:52-66`), titled "ملاحظاتي على هذه الدروس". The section lists `notesForLectureSeries(notes, archiveIdsOf(lectures))` and renders `null` when there are none.
- Each row shows the label (for example `محاضرة آداب الدعاء — ١٢:٣٤`) and opens the note.
- The **Library in-progress card is not changed visually** (frame 6). It keeps its existing "إضافة ملاحظة" entry point.

### 3.6 Notes viewer (AC 5, AC 7)

- `NoteRow` (`notes-viewer.tsx:60-78`) gains a second line when `note.ref` is set: a `NoteRefLink` showing the label as a plain text link (`caption` role, `navy800`, no underline and no glyph).
  - Tapping the link calls `openNoteSource(note.ref, router)`.
  - Tapping elsewhere on the row still opens the editor.
  - The inner `Pressable` claims the touch, so the link and the row never both fire.
- `openNoteSource` behaves per type:
  - *ayah* and *book*: `router.replace(href)`. This is the same pattern `app/search.tsx:101` uses to leave a root route for a tab route.
  - *lecture*: `router.back()`, then playback.
- **No frame.** The note screens are outside the 28 frames (CLAUDE.md, "Design source is the spec"). The governing contracts are:
  - `PHYSICAL_ROW` for the time/title row (`constants/layout.ts:125`) and `RTL_TEXT` for the label.
  - `textStyle('caption')` from `constants/typography.ts:160`.
  - `KhazainColors.navy800` for the link colour.

### 3.7 Note editor

- `Params` (`note-editor.tsx:21`) gains the ref params produced by `noteRefToParams`: `refType`, `refId`, `refPos`, `refLabel`, `refContext`, `refTitle`, `refSpeaker`. The `ref` prefix avoids colliding with the existing `id`/`title` params.
- `noteRefFromParams` validates them, and garbage yields `undefined`, which is a plain note.
- A linked new note shows a read-only `NoteRefLink` chip under the sheet title ("مرتبطة بـ البقرة: ٢٥٥"). `save()` (`:59-77`) passes the ref to `addNote`.
- Editing an existing linked note shows its stored ref chip.
- The "آخر الملاحظات" block (`:145-163`) is unchanged.
- **No frame.** The contracts are as in 3.6.

### 3.8 Book detail (AC 3, AC 6). Runs after the rebase

The search branch creates `app/(tabs)/sections/book/[id].tsx` with `DetailHeader`, cover, title, author, description, a primary action, and a slot reserved for notes.

On top of that we add:
- **A "إضافة ملاحظة" secondary action** next to the primary action. It opens the editor with `makeBookRef({ id, title }, 'book-detail')`. The page is omitted because no book reader exists, so there is no "current page".
- **A `LinkedNotesSection`** in the reserved slot, fed by `useLinkedNotes('book', id)`. It renders `null` when empty.
- **`noteSourceTarget`** for a book resolves to `BOOK_DETAIL_PATH + '/' + encodeURIComponent(id)`. The constant is confirmed against the rebased route.

**No frame** covers book detail, which is new in the search ticket. The contracts are `constants/layout.ts` and `constants/typography.ts`, plus whatever the search ticket records for that screen.

### 3.9 Shared UI

These live in a new folder `components/khazain/notes/`, re-exported from `components/khazain/index.ts`.

- **`NoteRefLink`:** the label as a pressable (or static, when `onPress` is absent) caption in `navy800`, with `RTL_TEXT`. It is used by the viewer, the editor and the section rows.
- **`LinkedNotesSection`:** `{ title, notes, onOpenNote }`.
  - It returns `null` when `notes.length === 0`. This is a guard so frame captures (a fresh install has no notes) stay pixel-identical.
  - Rows are cream cards modelled on the viewer row: `cream50`, a `cardBorder` hairline, radius `KhazainRadius.lg`, and a `PHYSICAL_ROW` of time then a title-plus-label column.
- **`linkedNotesModel.ts`:** a pure row model `{ id, title, label, time }`, so the formatting is testable without a renderer. The repo has no `@testing-library`, and `react-test-renderer` sits in `node_modules` without being in `package.json`, which makes it a new dependency we must not use.

## 4. Data, route and store changes (summary)

| Area | Change |
|---|---|
| `services/noteRefs.ts` | **New.** `NoteRef` types, label formatters, `coerceNoteRef`, `noteRefToParams` / `noteRefFromParams`, and the `make*Ref`, `lectureRefFromTrack` and `lectureRefFromSession` builders. |
| `store/notesStore.ts` | `Note.ref?`, `addNote(title, body, ref?)`, persist `version: 1` plus `migrate`, selectors, `useLinkedNotes`. |
| `services/mushafNavigation.ts` | `normalizeAyahParam` and `ayahScrollFraction`. |
| `services/audioEngine.ts` | `resolveStartPoint`, and `playLecture(lecture, start?)`. |
| `services/lecturePlayback.ts` | `startLecturePlayback(lecture, start?)` passes `start` through. |
| `services/noteNavigation.ts` | **New.** `noteSourceTarget(ref)` (pure) and `openNoteSource(ref, router)`. |
| Routes | `/sections/mushaf` accepts `?ayah=`. `/note-editor` accepts the `ref*` params. **No new routes**, and `app/_layout.tsx` is untouched. |
| UI | `note-editor.tsx`, `notes-viewer.tsx`, `mushaf.tsx`, `MiniPlayer.tsx`, `library.tsx` (handler only), `scholar/[id].tsx`, book detail (post-rebase), and the new `components/khazain/notes/*`. |

No new dependencies: `expo-haptics`, `zustand/middleware` and `expo-router` are already in `package.json`.

## 5. Figma frames affected and what must stay pixel-identical

These are compared on a **fresh install with no notes and no track loaded**. That is the state `scripts/visual-audit/capture-ios.mjs` captures in.

| # | Node | Route | Must stay identical | What may differ (only when notes or ref params exist) |
|---|---|---|---|---|
| 16 | `2349:982` | `/sections/mushaf?surah=2` | Header, meta line, and footer order and labels (`MUSHAF_FOOTER_ORDER`). | The reading surface is **not drawn by the frame** (`mushaf.tsx:36-39`). With notes, the ayah-number tint and the end-of-surah section appear. With `?ayah=`, the highlight and the scroll position change. |
| 15 | `2349:829` | resume transition | Everything | Nothing |
| 14 | `2207:17898` | `/sections/mushaf` | Everything | Nothing (untouched) |
| 6 | `2031:4659` | `/library` | Everything, including the in-progress card's "إضافة ملاحظة" label and position. | Nothing. Only the button's handler changes. |
| 5 | `2001:940` | `/` | Everything | Nothing. The MiniPlayer is not drawn by any frame, and long-press adds no pixels. |
| 19 | `2510:1990` | `/sections/scholar/s1` | Everything | The footer section appears only when this scholar's lectures have notes. |

## 6. Conflicts between the criteria and Figma, and how they are resolved

| Criterion | Conflict | Resolution |
|---|---|---|
| AC 1 (Mushaf Take Note) | Frame 16's footer is exactly three fixed slots, and the header has no spare action. | Long-press on the ayah text adds zero chrome. Screen-reader users get an accessibility action. |
| AC 6 (Mushaf shows its notes) | Frame 16 has no notes area. | A section inside the reading surface, which the frame does not draw. It renders only when notes exist, so an empty-state capture is identical. |
| AC 2 (lecture Take Note) | No frame draws a full player, and adding a control to the MiniPlayer would change a shipped component. | Long-press plus an accessibility action on the MiniPlayer, and the existing Library card button. Zero pixel change. A visible button is Q1. |
| AC 6 (lecture notes) | Frame 19 has no notes area. | A conditional `ListFooterComponent`. Identical when empty. |

## 7. RTL considerations

- Every new row is authored in **physical left → right order** inside `PHYSICAL_ROW`: time on the left, then the title/label column. This matches the existing viewer row (`notes-viewer.tsx:68-76`). No `row-reverse` and no `I18nManager` reads.
- Section titles and labels spread `RTL_TEXT`. Containers whose `textAlign: 'right'` must mean the physical right spread `PHYSICAL_BOX` (CLAUDE.md, "Verification hygiene").
- The nested ayah `<Text>` spans inherit the body's `writingDirection: 'rtl'` (`mushaf.tsx:360`). The highlight is a `backgroundColor` on the span, so it does not affect direction.
- `rtlPhysicalContract.test.ts` and `rtlVisualContracts.test.ts` must stay green.

## 8. Risks

| Risk | Mitigation |
|---|---|
| The scroll-to-ayah offset is approximate (justified lines vary in width). | The highlight marks the ayah. The scroll stops 80 pt above the estimate. Visual QA with Al-Baqara 255 and 286. |
| `router.replace` from a root `transparentModal` into a tab route. | Same pattern as `app/search.tsx:101`. Verified in visual QA. Fallback if it misbehaves: `router.back()` and then `router.navigate(href)`. |
| `onLongPress` on nested Text on web. | Web is not a release target. It is noted, not handled. |
| The persist `migrate` could wipe notes if it is written defensively wrong. | `migrateNotesState` never returns `notes: []` for an array input. Each entry is coerced individually. Tests cover a v0 record, malformed refs, and non-array garbage. |
| Rebase conflicts with `fix/search-route-and-navigation`. | The book tasks are last. The tasks before them do not touch `app/search.tsx`, `app/_layout.tsx` or the book route. |
| Merge conflicts with `fix/saved-lecture-bookmarks` in `scholar/[id].tsx` and `audioEngine.ts`. | Changes are additive (one `ListFooterComponent` and one optional argument). Flagged for whoever merges second. |
| A source-scan test is brittle. | Used only where the repo already uses it (`miniPlayerReach.test.ts`) for wiring invariants. Logic is tested through pure functions. |

## 9. Out of scope

- A page field for Mushaf notes and page-accurate navigation. This waits for real page-swipe reading, because `currentPage` is the surah's start page today.
- A full-screen lecture player, and a visible MiniPlayer note button (Q1).
- Book page positions (there is no book reader).
- Showing ref labels in the Library's "آخر الملاحظات" rows or quick-note card (frame 6).
- Adding the ref label to the Settings notes export (`services/notesExporter.ts`).
- A filtered "notes for this content" viewer mode. The inline sections cover AC 6.
- Wiring the Mushaf footer buttons. They are unwired today and that is not this ticket.
- Encryption of notes at rest. This is the accepted risk recorded in CLAUDE.md.
- Cloud sync and the API data layer.

## 10. Open questions (each has a default so work can proceed)

| # | Question | Default used by the plan |
|---|---|---|
| Q1 | Should the MiniPlayer get a *visible* "note" button, in addition to long-press? | **No.** Long-press plus an accessibility action. It can be revisited after on-device testing. |
| Q2 | Should a lecture label lead with the lecture title or the speaker? | **Title**, with the speaker as the fallback (`محاضرة آداب الدعاء — ١٢:٣٤`). |
| Q3 | Which screen counts as the lecture "content detail"? | **Scholar detail** (conditional footer). The Library card is not changed visually. |
| Q4 | Should long-press open the editor directly, or a menu first? | **Directly.** The linked notes are visible inline on the reader. |
| Q5 | Should a Mushaf note record the page? | **No**, until real paging exists. |
