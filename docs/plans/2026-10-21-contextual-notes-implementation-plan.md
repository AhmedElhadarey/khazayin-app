# Contextual Notes Linked to Content: Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: use superpowers:executing-plans (or the CLAUDE.md subagent-driven loop) to implement this plan task by task. Each task needs a spec review, then a code-quality review, before it is marked done.

**Goal:** Notes can be linked to an ayah, a lecture timestamp or a book. You create them from the Mushaf reader, the MiniPlayer, the Library in-progress card and book detail. You see them on those screens and in the notes viewer, and from the viewer you can jump back to the source.

**Architecture:** A pure `services/noteRefs.ts` owns the `NoteRef` type, the Arabic labels, validation and route-param encoding. `notesStore` gains an optional `ref`, a versioned persist migration and pure selectors. A pure `services/noteNavigation.ts` resolves a ref to a route or to a playback start, and `audioEngine.playLecture` gains an explicit start point. All UI additions are zero-pixel (long-press and accessibility actions) or render `null` when there are no notes, so Figma frames 5, 6, 14, 15, 16 and 19 stay identical. The rationale is in `docs/plans/2026-10-21-contextual-notes-design.md`.

**Tech stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, zustand 5 (`persist`), expo-router 6, react-native-track-player (behind `services/audioEngine.ts`), and jest-expo. There are no component-render tests: the repo has no testing library, and `react-test-renderer` is not in `package.json`. Logic is tested through pure functions, and wiring is tested by source scans in the style of `__tests__/miniPlayerReach.test.ts`.

**Standing rules (from CLAUDE.md):**
- No new dependencies.
- No `--no-verify`.
- No `Co-Authored-By` or any AI attribution in commits.
- Spread `RTL_TEXT` on every new Text. Author every row in physical left → right order inside `PHYSICAL_ROW`.
- Use `router.push(... as any)` for routes that typed-routes has not regenerated.
- Run `npx tsc --noEmit --pretty false` after every task.

**Ordering:** Tasks 1–17 run on the current branch. **Task 18 rebases onto `fix/search-route-and-navigation`.** Tasks 19–20 need the book detail screen that branch creates. Task 21 is final verification.

---

### Task 1: Arabic time and reference-label formatters

**Files:**
- Create: `services/noteRefs.ts`
- Test: `__tests__/noteRefs.test.ts`

**Step 1: Write the failing tests** (`describe('note reference labels')`)

| Test name | Assertion |
|---|---|
| `formatPlaybackTime renders m:ss with Arabic-Indic digits` | `754` → `'١٢:٣٤'`; `65` → `'١:٠٥'`; `5` → `'٠:٠٥'` |
| `formatPlaybackTime switches to h:mm:ss at one hour` | `3600` → `'١:٠٠:٠٠'`; `3723` → `'١:٠٢:٠٣'` |
| `formatPlaybackTime floors fractions and clamps junk to zero` | `754.9` → `'١٢:٣٤'`; `-3`, `NaN` and `Infinity` → `'٠:٠٠'` |
| `ayahRefLabel names the surah and the ayah` | `(2, 255)` → `'البقرة: ٢٥٥'`; `(1, 7)` → `'الفاتحة: ٧'` |
| `ayahRefLabel without an ayah is a surah-level label` | `(2)` → `'سورة البقرة'` |
| `lectureRefLabel leads with the title and appends the time` | `('آداب الدعاء', 'الشيخ عبد المحسن العباد', 754)` → `'محاضرة آداب الدعاء — ١٢:٣٤'` |
| `lectureRefLabel falls back to the speaker when the title is blank` | `('  ', 'الشيخ ابن عثيمين', 754)` → `'محاضرة الشيخ ابن عثيمين — ١٢:٣٤'` |
| `lectureRefLabel omits the time when the position is unknown` | `('آداب الدعاء', 'x')` → `'محاضرة آداب الدعاء'` |
| `bookRefLabel with and without a page` | `('الأصول الثلاثة')` → `'كتاب الأصول الثلاثة'`; `('الأصول الثلاثة', 12)` → `'كتاب الأصول الثلاثة — صفحة ١٢'` |

**Step 2:** Run `npx jest __tests__/noteRefs.test.ts`. Expected: FAIL, "Cannot find module '@/services/noteRefs'".

**Step 3: Implement** (minimal)

```ts
// services/noteRefs.ts
import { SURAH_NAMES_AR, toArabicDigits } from '@/constants/progress';

const SEP = ' — ';
const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatPlaybackTime(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return toArabicDigits(h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`);
}
export function ayahRefLabel(surahNumber: number, ayah?: number): string {
  const name = SURAH_NAMES_AR[surahNumber] ?? '';
  return ayah && ayah > 0 ? `${name}: ${toArabicDigits(ayah)}` : `سورة ${name}`;
}
export function lectureRefLabel(title: string, speaker: string, positionSec?: number): string {
  const subject = title.trim() || speaker.trim();
  const base = `محاضرة ${subject}`;
  return typeof positionSec === 'number' ? `${base}${SEP}${formatPlaybackTime(positionSec)}` : base;
}
export function bookRefLabel(title: string, page?: number): string {
  const base = `كتاب ${title.trim()}`;
  return page && page > 0 ? `${base}${SEP}صفحة ${toArabicDigits(page)}` : base;
}
```

**Step 4:** Run `npx jest __tests__/noteRefs.test.ts`. Expected: PASS. Then run `npx tsc --noEmit --pretty false`.

**Step 5: Commit**

```bash
git add services/noteRefs.ts __tests__/noteRefs.test.ts
git commit -m "feat(notes): add Arabic reference-label formatters"
```

---

### Task 2: `NoteRef` type, validation and builders

**Files:**
- Modify: `services/noteRefs.ts`
- Test: `__tests__/noteRefs.test.ts` (new `describe('NoteRef')`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `makeAyahRef pads the surah id and labels it` | `makeAyahRef('2', 255, 'mushaf')` → `{ type:'ayah', id:'002', position:255, label:'البقرة: ٢٥٥', context:'mushaf' }` |
| `makeAyahRef without an ayah has no position` | `makeAyahRef('002', undefined, 'mushaf')` has no `position` key and the label `'سورة البقرة'` |
| `makeLectureRef keeps the episode id and rounds the position` | `({ id:'ABC/002.mp3', title:'ح2', speaker:'الشيخ', positionSec:754.6 }, 'mini-player')` → `position: 755`, label `'محاضرة ح2 — ١٢:٣٥'`, and `title` and `speaker` kept |
| `lectureRefFromTrack derives seconds from progress × duration` | track `{ id:'ABC/001.mp3', title:'ح1', reciter:'س', durationSec:600 }` with progress `0.5` → `position 300` |
| `lectureRefFromTrack omits position when the track has no duration` | Same track without `durationSec` → no `position`, and a label with no ` — ` |
| `lectureRefFromSession uses lectureId and positionSec` | A `LectureSession` (`db/types.ts:21-30`) → `id === lectureId`, `position === round(positionSec)`, `context:'library-progress'` |
| `makeBookRef labels the title` | `({ id:'b1', title:'الأصول الثلاثة' }, 'book-detail')` → label `'كتاب الأصول الثلاثة'` |
| `coerceNoteRef accepts a well-formed ref unchanged` | Round-trips each builder's output |
| `coerceNoteRef rejects junk` | `null`, `'x'`, `{}`, an unknown `type`, an empty `id`, a non-string `label`, an unknown `context`, and `position: NaN` / `-1` / `'3'` → `undefined` |
| `coerceNoteRef drops unknown keys` | `{ ...valid, evil: 1 }` → the result has no `evil` key |

**Step 3: Implement**
- Export `NoteRefType`, `NoteRefContext` and `NoteRef` exactly as in design §3.1.
- `makeAyahRef(surahId, ayah, context)` uses `normalizeSurahParam` from `services/mushafNavigation.ts:17` to pad. It throws on an invalid surah id, which is a programmer error since callers already hold a normalized id.
- `makeLectureRef({ id, title, speaker, positionSec? }, context)`: `position = Math.round(positionSec)` only when `positionSec` is finite and ≥ 0.
- `lectureRefFromTrack(track: PlayerTrack, progress: number, context)`: `import type { PlayerTrack } from '@/store/playerStore'` (type-only, so no cycle).
- `lectureRefFromSession(session: LectureSession, context)`: `import type { LectureSession } from '@/db/types'`.
- `makeBookRef({ id, title, page? }, context)`.
- `coerceNoteRef(raw: unknown): NoteRef | undefined` uses explicit whitelists: `NOTE_REF_TYPES` and `NOTE_REF_CONTEXTS`, both `Object.freeze`d arrays. A position must be a finite integer ≥ 0. The function builds a fresh object, so unknown keys are dropped.

**Step 4:** `npx jest __tests__/noteRefs.test.ts` passes, and so does `npx tsc --noEmit --pretty false`.

**Step 5:** `git commit -m "feat(notes): add NoteRef type, builders and validation"`

---

### Task 3: Note-reference route params (encode and decode)

**Files:**
- Modify: `services/noteRefs.ts`
- Test: `__tests__/noteRefs.test.ts` (new `describe('note ref route params')`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `noteRefToParams emits only string values with the ref prefix` | Every key starts with `ref`, and every value is a string. An ayah ref gives `{ refType:'ayah', refId:'002', refPos:'255', refLabel:'البقرة: ٢٥٥', refContext:'mushaf' }`. |
| `noteRefToParams omits absent optional fields` | No `refPos`, `refTitle` or `refSpeaker` key when they are undefined. |
| `noteRefFromParams round-trips every builder` | `noteRefFromParams(noteRefToParams(r))` deep-equals `r` for the ayah, lecture and book refs. |
| `noteRefFromParams tolerates expo-router string[] params` | `{ refType: ['ayah'], ... }` reads the first element. |
| `noteRefFromParams returns undefined when no ref params are present` | `{ id: 'n1' }` → `undefined` |
| `noteRefFromParams returns undefined for a tampered ref` | `refType:'video'` or `refPos:'abc'` → `undefined`. It parses, then passes the result through `coerceNoteRef`. |

**Step 3: Implement** `noteRefToParams(ref): Record<string, string>` and `noteRefFromParams(params: Record<string, string | string[] | undefined>): NoteRef | undefined`. `refPos` is parsed with `Number`, and only if `/^\d+$/` matches.

**Step 5:** `git commit -m "feat(notes): encode note references as route params"`

---

### Task 4: `notesStore` stores a ref, with a versioned persist migration

**Files:**
- Modify: `store/notesStore.ts:6-12` (the `Note` type), `:14-19` (`NotesState`), `:28-35` (`addNote`) and `:48-52` (persist options)
- Test: create `__tests__/notesStore.test.ts`

**Step 1: Failing tests.** Copy the AsyncStorage mock, the `flushPersist` helper and the `rehydrate` helper from `__tests__/settingsStore.test.ts:12-43`. `beforeEach` clears storage and resets `useNotesStore.setState({ notes: [] })`.

| Test name | Assertion |
|---|---|
| `T-NS-1 addNote without a ref keeps the old shape` | `addNote('t','b')` → the stored note has `ref === undefined`. The return value is the id. |
| `T-NS-2 addNote stores the ref verbatim` | `addNote('t','b', makeAyahRef('2',255,'mushaf'))` → `notes[0].ref` equals the input. |
| `T-NS-3 updateNote keeps the ref` | After `updateNote(id, { body:'new' })`, the ref is unchanged and `updatedAt` has advanced. |
| `T-NS-4 a v0 record keeps every note after migration` | Seed `@khazain/notes` with `{ state:{ notes:[n1,n2] }, version:0 }` (no refs). After rehydrate, both notes are present with the same ids, titles and bodies, and `ref` is undefined. |
| `T-NS-5 migration strips a malformed ref but keeps the note` | Seed a v0 note with `ref:{ type:'video' }`. After rehydrate, the note is present and `ref` is undefined. |
| `T-NS-6 migration writes the record back at version 1` | After T-NS-4's rehydrate and a flush, `JSON.parse(getItem('@khazain/notes')).version === 1`. |
| `T-NS-7 migrateNotesState never wipes an array of notes` | Direct unit test: `migrateNotesState({ notes:[{ id:'a', title:1 }] }, 0)` keeps note `a` with `title ''`. `migrateNotesState('garbage', 0)` → `{ notes: [] }`. |
| `T-NS-8 the storage key is unchanged` | Source scan of `store/notesStore.ts`: `/name: '@khazain\/notes'/`. Guards against orphaning installs, as `settingsStore.ts:368-371` warns. |

**Step 2:** `npx jest __tests__/notesStore.test.ts` → FAIL.

**Step 3: Implement**
- `Note` gains `ref?: NoteRef`.
- `addNote: (title, body, ref?) => string`. Use `...(ref ? { ref } : {})`, so plain notes have no `ref` key at all.
- Export `NOTES_PERSIST_VERSION = 1` and `migrateNotesState(persisted: unknown, _from: number): { notes: Note[] }`. It coerces each entry: `id` must be a non-empty string, or the entry is dropped. `title` and `body` fall back to `''`. `createdAt` and `updatedAt` must be finite numbers, or fall back to `0`. `ref` goes through `coerceNoteRef`.
- Add `version: NOTES_PERSIST_VERSION` and `migrate: migrateNotesState` to the persist options. Add a comment explaining that zustand only writes back when `migrate` ran, which is the reverse of the `settingsStore` note.

**Step 4:** The new test passes. `npx jest __tests__/notesExporter.test.ts` (the existing `Note` consumer) still passes. tsc passes.

**Step 5:** `git commit -m "feat(notes): persist an optional content reference on notes"`

---

### Task 5: Linked-note selectors

**Files:**
- Modify: `store/notesStore.ts` (append the selectors)
- Modify: `store/index.ts:113-114` (re-export `notesFor` and `useLinkedNotes`)
- Test: `__tests__/notesStore.test.ts` (new `describe('linked-note selectors')`)

**Step 1: Failing tests** (pure, with no store involved)

| Test name | Assertion |
|---|---|
| `notesFor matches type and id exactly` | Given ayah `002`, ayah `003`, a lecture and a plain note, `notesFor(notes,'ayah','002')` returns only the `002` note. |
| `notesFor keeps store order (newest first)` | Two `002` notes come back in input order. |
| `notesFor ignores notes without a ref` | A plain note is never returned. |
| `notedAyahNumbers collects positions for one surah` | → `Set {255, 286}`. A surah-level ref (no position) is not included. |
| `notesForLectureSeries matches by archive id prefix` | Refs `ABC/001.mp3` and `ABC/sub/002.mp3` match `new Set(['ABC'])`. `ABCD/001.mp3` does not. |

**Step 3: Implement**
- `export function notesFor(notes: readonly Note[], type: NoteRefType, id: string): Note[]`
- `export function notedAyahNumbers(notes, surahId): Set<number>`
- `export function archiveIdOfEpisode(id: string): string` (`id.split('/')[0]`, mirroring `services/audioEngine.ts:197`)
- `export function notesForLectureSeries(notes, archiveIds: ReadonlySet<string>): Note[]`
- `export function useLinkedNotes(type, id)`:

```ts
const notes = useNotesStore((s) => s.notes);
return useMemo(() => notesFor(notes, type, id), [notes, type, id]);
```

Do **not** filter inside the zustand selector. A fresh array per call loops under zustand 5.

**Step 5:** `git commit -m "feat(notes): add linked-note selectors"`

---

### Task 6: Shared linked-note UI (`NoteRefLink`, `LinkedNotesSection`)

**Files:**
- Create: `components/khazain/notes/linkedNotesModel.ts`, `components/khazain/notes/NoteRefLink.tsx`, `components/khazain/notes/LinkedNotesSection.tsx`, `components/khazain/notes/index.ts`
- Modify: `components/khazain/index.ts` (add `export * from './notes';`)
- Test: create `__tests__/linkedNotesModel.test.ts`, and create `__tests__/contextualNotesWiring.test.ts` (source scans; later tasks add to it)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `linkedNoteRow carries id, title, label and relative time` | With `Date.now` frozen (as `notesExporter.test.ts:30-35` does), a note updated one hour ago gives `{ id, title, label:'البقرة: ٢٥٥', time:'منذ ساعة' }`. |
| `linkedNoteRow falls back to the untitled placeholder` | `title ''` → `'ملاحظة بلا عنوان'`. This is the same string as `notes-viewer.tsx:75`. |
| `linkedNoteRow has no label for a plain note` | `label === undefined` |
| `sortByPosition orders ayah notes by ayah number, surah-level first` | Positions `[286, undefined, 255]` → `[undefined, 255, 286]` |
| (wiring) `LinkedNotesSection renders nothing when there are no notes` | Source scan: `/if \(notes\.length === 0\) return null;/`. This guard is what keeps frames 16 and 19 identical. |
| (wiring) `linked-note rows are authored in physical order` | Source scan of `LinkedNotesSection.tsx` for `...PHYSICAL_ROW`, and no `row-reverse` |

**Step 3: Implement**
- `linkedNoteRow(note)` and `sortByPosition(notes)` are pure. They use `formatRelativeAr` from `store/notesStore.ts:56`.
- `NoteRefLink({ label, onPress? })`:
  - `Text` with `textStyle('caption', { color: KhazainColors.navy800 })` and `...RTL_TEXT`, `numberOfLines={1}`.
  - When `onPress` is set, it is wrapped in a `Pressable` with `accessibilityRole="link"`, `accessibilityLabel={`الانتقال إلى ${label}`}` and `hitSlop={6}`.
- `LinkedNotesSection({ title, notes, onOpenNote, onOpenSource? })`:
  - Container spreads `PHYSICAL_BOX`. Title uses `textStyle('sectionTitle', { color: KhazainColors.ink900 })` and `RTL_TEXT`.
  - Each row is a `Pressable` card copied from `notes-viewer.tsx:117-127`: `cream50`, a `cardBorder` hairline, `KhazainRadius.lg`, `PHYSICAL_ROW`. Physically left → right it holds the time `Text` (caption, `ink400`), then a column with the title (`cardTitle`) and `NoteRefLink` under it.
  - No Figma frame governs it. Contracts: `constants/layout.ts`, `constants/typography.ts`, `theme.ts`.

**Step 4:** `npx jest __tests__/linkedNotesModel.test.ts __tests__/contextualNotesWiring.test.ts __tests__/rtlPhysicalContract.test.ts` passes, and so does tsc.

**Step 5:** `git commit -m "feat(notes): add shared linked-note section and reference link"`

---

### Task 7: The note editor accepts and saves a reference

**Files:**
- Modify: `app/note-editor.tsx`:
  - `:21` widens `Params` to `Record<string, string | string[] | undefined>`, keeping `id` and `title`.
  - `:30-38` derives `seedRef`.
  - `:59-77` passes the ref in `save()`.
  - `:107-109` shows the chip under the sheet title.
- Test: `__tests__/contextualNotesWiring.test.ts` (`describe('note editor')`)

**Step 1: Failing tests** (source scans; the param decoding itself is unit-tested in Task 3)

| Test name | Assertion |
|---|---|
| `decodes the ref from route params` | `note-editor.tsx` matches `/noteRefFromParams\(params\)/` |
| `passes the ref to addNote when creating` | `/addNote\(derivedTitle, cleanBody, seedRef\)/` |
| `shows the linked source on the sheet` | `/<NoteRefLink/` |
| `keeps the legacy title seed working` | `/params\.title/` still present |

**Step 3: Implement**
- `const seedRef = editingId ? undefined : noteRefFromParams(params);`
- `const shownRef = existing?.ref ?? seedRef;`
- Below `sheetTitle`, render ``shownRef ? <NoteRefLink label={`مرتبطة بـ ${shownRef.label}`} /> : null``. It is static, with no `onPress`, because navigating away from an open editor would drop the draft.
- The new `TextStyle` sits inside `scrollContent`, which already spreads `PHYSICAL_BOX` (`:233-236`), so `textAlign: 'right'` lands on the physical right.

**Step 4:** The wiring tests pass and so does tsc.

**Step 5:** `git commit -m "feat(notes): let the note editor create linked notes"`

---

### Task 8: Mushaf ayah param and scroll fraction

**Files:**
- Modify: `services/mushafNavigation.ts` (append)
- Test: `__tests__/mushafPresentation.test.ts` (new `describe('ayah deep link')`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `normalizeAyahParam accepts an ayah inside the surah` | `('255', 286)` → `255` |
| `normalizeAyahParam rejects out-of-range or malformed input` | `('0',7)`, `('8',7)`, `('2a',7)`, `(undefined,7)` and `('', 7)` → `null` |
| `normalizeAyahParam without a known count accepts any positive ayah up to 286` | `('255', undefined)` → `255`; `('300', undefined)` → `null` (286 is the longest surah) |
| `ayahScrollFraction is the share of text before the ayah` | ayat `[{n:1,'aaaa'},{n:2,'bbbbbb'},{n:3,'cc'}]` → ayah 1 `0`, ayah 2 `4/12`, ayah 3 `10/12` |
| `ayahScrollFraction returns 0 for an unknown ayah or empty text` | → `0` |

**Step 3: Implement** `normalizeAyahParam(param, ayahCount?)` and `ayahScrollFraction(ayat: readonly { number: number; text: string }[], ayahNumber: number): number`. The existing tests in that file (`:10-68`, including the footer order) must stay green.

**Step 5:** `git commit -m "feat(mushaf): validate an ayah deep-link param"`

---

### Task 9: Start a lecture at an explicit episode and second

**Files:**
- Modify: `services/audioEngine.ts:132-185` (`playLecture`)
- Modify: `services/lecturePlayback.ts:12` (`startLecturePlayback`)
- Test: `services/audioEngine/__tests__/audioEngine.test.ts` (extend `describe('playLecture')` at `:108`)

**Step 1: Failing tests** (reuse the `META` and `LECTURE` fixtures at `:99-106`)

| Test name | Assertion |
|---|---|
| `starts at an explicit episode and position, ignoring the saved session` | With `mockInProgress` on `ABC/002.mp3@120` and `playLecture(LECTURE, { episodeId:'ABC/003.mp3', positionSec:45 })`: `skip(2)`, `seekTo(45)`, and the `setTrack` initial progress ≈ `45/800` |
| `falls back to the saved session when the start episode is not in the series` | `start.episodeId:'ABC/999.mp3'` with `mockInProgress` on `002@120` → `skip(1)`, `seekTo(120)` |
| `an explicit start at 0 on the first episode neither skips nor seeks` | `{ episodeId:'ABC/001.mp3', positionSec:0 }` → `skip` and `seekTo` are not called |
| `resolveStartPoint is pure` | `resolveStartPoint(episodes, null, undefined)` → `{ index:0, positionSec:0 }`. A negative `positionSec` clamps to 0. |

**Step 3: Implement**
- Export `type LectureStart = { episodeId: string; positionSec: number }`.
- Export `resolveStartPoint(episodes, inProgress, start?)`. Move the resume block at `:142-152` into it.
- `playLecture(lecture, start?)` calls it.
- `startLecturePlayback(lecture, start?)` passes `start` through to `playLecture`.

The existing resume tests (`:145-160`) must still pass unchanged.

**Step 4:** `npx jest services/audioEngine` passes, and so does tsc.

**Step 5:** `git commit -m "feat(audio): start a lecture at an explicit episode and position"`

---

### Task 10: Resolve a note reference back to its source

**Files:**
- Create: `services/noteNavigation.ts`
- Test: create `__tests__/noteNavigation.test.ts` (mock `@/services/lecturePlayback`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `an ayah ref targets the mushaf reader at that ayah` | `noteSourceTarget(makeAyahRef('2',255,'mushaf'))` → `{ kind:'route', href:'/sections/mushaf?surah=2&ayah=255' }` |
| `a surah-level ref omits the ayah` | → `'/sections/mushaf?surah=2'` |
| `an ayah ref with a corrupt surah id has no target` | `{ ...ref, id:'999' }` → `null` |
| `a lecture ref targets playback of that episode at that second` | → `{ kind:'lecture', lecture:{ archiveId:'ABC', title:'ح2', scholar:'الشيخ', … }, start:{ episodeId:'ABC/002.mp3', positionSec:754 } }` |
| `a lecture ref without a position starts at 0` | `start.positionSec === 0` |
| `a book ref targets book detail` | → `{ kind:'route', href:'/sections/book/b%201' }` for id `'b 1'` |
| `openNoteSource replaces the route for ayah refs` | With a fake router `{ replace: jest.fn(), back: jest.fn() }`, `replace` is called with the href and `back` is not called. |
| `openNoteSource closes the sheet then starts playback for lecture refs` | `back` is called, then the mocked `startLecturePlayback` is called with the lecture and start, in that order. |

**Step 3: Implement**
- `export const BOOK_DETAIL_PATH = '/sections/book';`, with the comment "confirmed in Task 18 after the rebase".
- `noteSourceTarget(ref)` validates the surah id with `normalizeSurahParam`. The href uses `Number(id)`, because `?surah=` takes a plain number (`mushafNavigation.ts:13-16`).
- The lecture built for playback mirrors `audioEngine.ts:197-204`: `{ id: archiveId, title: ref.title ?? ref.label, scholar: ref.speaker ?? '', duration: '', category: 'scholar', archiveId }`.
- `openNoteSource(ref, router: Pick<Router, 'replace' | 'back'>)` uses `router.replace(href as any)`, the same pattern as `app/search.tsx:101`.

**Step 5:** `git commit -m "feat(notes): navigate from a note back to its source"`

---

### Task 11: The notes viewer shows the reference and links back

**Files:**
- Modify: `app/notes-viewer.tsx:45-50` (`renderItem`), `:60-78` (`NoteRow`) and `:117-131` (styles)
- Test: `__tests__/contextualNotesWiring.test.ts` (`describe('notes viewer')`)

**Step 1: Failing tests** (source scans)

| Test name | Assertion |
|---|---|
| `renders the reference link for linked notes` | `/note\.ref \? \(\s*<NoteRefLink/` |
| `the link navigates to the source` | `/openNoteSource\(note\.ref, router\)/` or `onOpenSource` wiring |
| `the row still opens the editor` | `/openExisting\(item\.id\)/` |
| `the row stays physically ordered` | `/\.\.\.PHYSICAL_ROW/` is still present in `row`, with no `row-reverse` |

**Step 3: Implement**
- `NoteRow` gains `onOpenSource`. The row stays a `PHYSICAL_ROW` of `[time] [column]`, where the column (`flex: 1`) is the title plus `note.ref ? <NoteRefLink label={note.ref.label} onPress={onOpenSource} /> : null`. The inner `Pressable` claims the touch, so the row's `onPress` does not fire.
- `rowTitle` keeps its `flex: 1` inside the column.
- No frame governs this screen. Contracts: `PHYSICAL_ROW` (`constants/layout.ts:125`), `textStyle('caption')`, `KhazainColors.navy800`.

**Step 4:** tsc passes, and so do `npx jest __tests__/contextualNotesWiring.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/rtlVisualContracts.test.ts`.

**Step 5:** `git commit -m "feat(notes): show and follow a note's source in the viewer"`

---

### Task 12: Mushaf long-press on an ayah takes a linked note

**Files:**
- Modify: `app/(tabs)/sections/mushaf.tsx:148` (`ReadingView` needs `useRouter`) and `:227-240` (the ayat `Text`)
- Test: `__tests__/contextualNotesWiring.test.ts` (`describe('mushaf reader')`)

**Step 1: Failing tests** (source scans)

| Test name | Assertion |
|---|---|
| `each ayah span takes a long-press` | `/onLongPress=\{\(\) => takeAyahNote\(a\.number\)\}/` |
| `the note is linked to the ayah` | `/makeAyahRef\(surahId, ayahNumber, 'mushaf'\)/` and `/noteRefToParams/` |
| `screen-reader users get a surah-level note action` | `/accessibilityActions=\{\[\{ name: 'addSurahNote'/` |
| `the footer is still the three Figma slots` | `/MUSHAF_FOOTER_ORDER\.map/`, and there is no fourth `MushafBtn` (count `<MushafBtn` occurrences === 1). Guards frame 16. |

**Step 3: Implement**

```tsx
const takeAyahNote = (ayahNumber?: number) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  router.push({ pathname: '/note-editor' as any,
    params: noteRefToParams(makeAyahRef(surahId, ayahNumber, 'mushaf')) });
};
```

- Wrap `{a.text}` in `<Text onLongPress={() => takeAyahNote(a.number)} suppressHighlighting>`.
- The body `<Text>` gets `accessibilityActions` and `onAccessibilityAction={(e) => e.nativeEvent.actionName === 'addSurahNote' && takeAyahNote(undefined)}`.
- Import `expo-haptics`. It is already in `package.json:35`.

**Step 4:** tsc passes, and so does `npx jest __tests__/contextualNotesWiring.test.ts __tests__/mushafPresentation.test.ts`.

**Step 5:** `git commit -m "feat(mushaf): long-press an ayah to take a linked note"`

---

### Task 13: Mushaf `?ayah=` scrolls to and highlights the ayah

**Files:**
- Modify: `app/(tabs)/sections/mushaf.tsx`:
  - `:44` adds `ayah?: string` to the params.
  - `:95` passes `targetAyah` into `ReadingView`.
  - `:204` adds a ScrollView ref.
  - `:220-241` wraps the ayat Text in a measured `View`.
  - The `styles` block adds `ayahHighlight`.
- Test: `__tests__/contextualNotesWiring.test.ts`

**Step 1: Failing tests** (the math is unit-tested in Task 8)

| Test name | Assertion |
|---|---|
| `reads and validates the ayah param` | `/normalizeAyahParam\(/` |
| `scrolls once using the character fraction` | `/ayahScrollFraction\(ayat, targetAyah\)/` and a `didScrollRef` guard |
| `highlights the target ayah` | `/a\.number === targetAyah \? styles\.ayahHighlight/` |
| `ReadingView stays keyed by surah` | `/<ReadingView key=\{surahId\}/` (`:95`) is unchanged. A remount per surah is load-bearing for the Rules of Hooks. |

**Step 3: Implement**
- Pass `params.ayah` raw into `ReadingView`. Validate it there with `normalizeAyahParam(raw, ayat.length || undefined)`.
- `onLayout` on the wrapper records `{ y, height }`.
- An effect fires once, when `targetAyah`, the layout and `ayatStatus === 'success'` are all ready: `scrollRef.current?.scrollTo({ y: Math.max(0, y + fraction * height - 80), animated: false })`.
- `ayahHighlight: { backgroundColor: KhazainColors.cream200 }`.
- With no `ayah` param, nothing changes. This is frame 16's state.

**Step 5:** `git commit -m "feat(mushaf): open the reader at a linked ayah"`

---

### Task 14: The Mushaf reader lists the surah's linked notes

**Files:**
- Modify: `app/(tabs)/sections/mushaf.tsx`:
  - After `:241`, add `<LinkedNotesSection>` inside the ScrollView.
  - `:236` (`AyahNum`) gets a `noted` prop.
  - `:362-366` adds `ayahNumNoted`.
- Test: `__tests__/contextualNotesWiring.test.ts`

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `lists notes linked to this surah` | `/useLinkedNotes\('ayah', surahId\)/` and `/<LinkedNotesSection/` with the title `ملاحظاتك على هذه السورة` |
| `orders them by ayah` | `/sortByPosition\(/` |
| `tints noted ayah numbers without adding glyphs` | `/notedAyahNumbers\(/`. `ayahNumNoted` only overrides `color` (scan the style block: `ayahNumNoted: \{ color: KhazainColors\.navy800 \}`). |
| `opening a listed note goes to the editor` | `/pathname: '\/note-editor' as any, params: \{ id \}/` |

**Step 3: Implement** as described. The section sits inside `pageContent` padding. `LinkedNotesSection` returns `null` when empty (Task 6), so frame 16's capture is unchanged.

**Step 5:** `git commit -m "feat(mushaf): show a surah's linked notes on the reader"`

---

### Task 15: MiniPlayer long-press takes a timestamped lecture note

**Files:**
- Modify: `components/khazain/primitives/MiniPlayer.tsx:46-57` (the info and cover views become one `Pressable` group, or each gets `onLongPress`)
- Test: `__tests__/contextualNotesWiring.test.ts` (`describe('mini player')`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `long-press on the track block opens a linked note` | `/onLongPress=\{takeLectureNote\}/` |
| `the position is read at press time, not subscribed` | `/usePlayerStore\.getState\(\)\.progress/`. No new `progress` subscription on the parent, which keeps the T3.3 re-render isolation at `MiniPlayer.tsx:16-19`. |
| `the ref comes from the shared builder` | `/lectureRefFromTrack\(track, progress, 'mini-player'\)/` |
| `screen readers get the same action` | `/accessibilityActions=\{\[\{ name: 'longpress', label: 'إضافة ملاحظة' \}\]\}/` |
| `no visible chrome is added` | The count of `<Pressable` in `MiniPlayer.tsx` is ≤ 4 (play plus two `SkipButton`s defined once, plus the new group). This guards against an icon button sneaking in (design Q1). |
| `the dock still collapses when idle` | The existing `miniPlayerReach.test.ts` stays green. |

**Step 3: Implement**
- Wrap the `info` and `cover` views (keeping their physical order inside the `PHYSICAL_ROW`) in a `Pressable` with `style={{ flex: 1, ...PHYSICAL_ROW, alignItems:'center', gap: 10 }}`, `onLongPress={takeLectureNote}`, `delayLongPress={350}`, `accessibilityHint="اضغط مطولًا لإضافة ملاحظة"`, the accessibility actions, and an `onAccessibilityAction` that calls `takeLectureNote`. It has no `onPress`, so a tap does nothing, as before.
- `takeLectureNote` reads `usePlayerStore.getState()` and pushes `/note-editor` with `noteRefToParams(...)`, using `useRouter()`.

**Step 4:** tsc passes, and so does `npx jest __tests__/miniPlayerReach.test.ts __tests__/contextualNotesWiring.test.ts`.

**Step 5:** `git commit -m "feat(player): long-press the mini player to note the current moment"`

---

### Task 16: The Library in-progress card creates a linked lecture note

**Files:**
- Modify: `app/(tabs)/library.tsx:266-267` (add `openLinkedNote`) and `:333` (`onSecondary`)
- Test: `__tests__/contextualNotesWiring.test.ts` (`describe('library in-progress card')`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `"إضافة ملاحظة" links the note to the lecture position` | `/onSecondary=\{\(\) => openLinkedNote\(lectureRefFromSession\(lecture, 'library-progress'\)\)\}/` |
| `the button label is unchanged (frame 6)` | `/secondaryLabel="إضافة ملاحظة"/` |
| `the quick-note card still opens a plain note` | `/onPress=\{\(\) => openNewNote\(\)\}/` is still present |

**Step 3: Implement** `const openLinkedNote = (ref: NoteRef) => router.push({ pathname: '/note-editor' as any, params: noteRefToParams(ref) });`. Leave `openNewNote` for the quick-note card.

**Step 4:** tsc passes, and so does `npx jest __tests__/libraryLayout.test.ts __tests__/libraryPresentation.test.ts __tests__/contextualNotesWiring.test.ts`.

**Step 5:** `git commit -m "feat(library): link in-progress lecture notes to their position"`

---

### Task 17: Scholar detail lists notes for its lectures

**Files:**
- Modify: `app/(tabs)/sections/scholar/[id].tsx:52-66` (`FlatList` gets a `ListFooterComponent`)
- Test: `__tests__/contextualNotesWiring.test.ts` (`describe('scholar detail')`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `collects notes for this scholar's lecture series` | `/notesForLectureSeries\(notes, archiveIds\)/`, where `archiveIds` is built from `lectures.map((l) => l.archiveId)` |
| `renders them as the list footer` | `/ListFooterComponent=\{\s*<LinkedNotesSection/` with the title `ملاحظاتي على هذه الدروس` |
| `tapping the reference resumes the lecture there` | `/onOpenSource=\{\(note\) => openNoteSource\(note\.ref!?, router\)\}/` (or equivalent) |

**Step 3: Implement**
- `useNotesStore((s) => s.notes)`.
- `useMemo` for the `archiveIds` `Set` (filter out `undefined`) and for the matched notes.
- A footer row tap opens the editor. A link tap calls `openNoteSource`, which resumes playback at the second.
- The footer renders `null` when empty, so frame 19 is unchanged.

**Step 4:** tsc passes, and so does `npx jest __tests__/contextualNotesWiring.test.ts __tests__/scholarCardLayout.test.ts __tests__/sectionsLayout.test.ts`.

**Step 5:** `git commit -m "feat(scholar): show notes linked to a scholar's lectures"`

---

### Task 18: Rebase onto the search branch and confirm the book route (checkpoint)

**Files:**
- Modify (only if needed): `services/noteNavigation.ts` (`BOOK_DETAIL_PATH`) and `__tests__/noteNavigation.test.ts`

**Steps:**
1. Run `git fetch` if needed, then `git rebase fix/search-route-and-navigation`. Resolve conflicts with the `resolving-merge-conflicts` skill. Never use `--no-verify`.
2. Open the screen with `ls "app/(tabs)/sections/book/"` and read `[id].tsx`. Record the following in the task notes, with file and line:
   - the actual route path
   - the `Book` fields now available (`types/content.ts:105-109` may have gained `author` and `coverUrl`)
   - where the reserved notes slot is
3. Add a failing test, `book detail route matches the screen on disk`. It asserts that `fs.existsSync('app/(tabs)/sections/book/[id].tsx')` holds and that `BOOK_DETAIL_PATH === '/sections/book'`. If the search branch chose a different path, update the constant and the Task 10 href test to match.
4. Run the full `npx jest` and `npx tsc --noEmit --pretty false`. Both must be green on the rebased tree before you continue.
5. Commit only if the constant changed: `git commit -m "fix(notes): point book references at the shipped book detail route"`

---

### Task 19: Book detail "إضافة ملاحظة" action (after the rebase)

**Files:**
- Modify: `app/(tabs)/sections/book/[id].tsx`, next to the primary action. Cite the actual lines recorded in Task 18.
- Test: `__tests__/contextualNotesWiring.test.ts` (`describe('book detail')`)

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `offers a take-note action` | `/accessibilityLabel="إضافة ملاحظة"/` |
| `links the note to this book` | `/makeBookRef\(\{ id: book\.id, title: book\.title \}, 'book-detail'\)/` and `/noteRefToParams/` |

**Step 3: Implement** a secondary action that reuses the screen's own secondary-button style if the search ticket defined one. Otherwise use `PillButton` (`components/khazain/primitives`) in a non-primary variant (`PillButton.tsx` `Variant`, e.g. `ghost`). Place it in physical order inside the screen's existing action row (`PHYSICAL_ROW`), never with `row-reverse`. It pushes `/note-editor` with the book ref. No frame covers this screen, so the contracts are `constants/layout.ts`, `constants/typography.ts`, `theme.ts`, and any contract the search ticket recorded for book detail.

**Step 5:** `git commit -m "feat(books): take a note linked to a book"`

---

### Task 20: Book detail lists its linked notes (after the rebase)

**Files:**
- Modify: `app/(tabs)/sections/book/[id].tsx` (the reserved notes slot)
- Test: `__tests__/contextualNotesWiring.test.ts`

**Step 1: Failing tests**

| Test name | Assertion |
|---|---|
| `renders this book's linked notes in the reserved slot` | `/useLinkedNotes\('book', /` and `/<LinkedNotesSection/` with the title `ملاحظاتك على هذا الكتاب` |
| `opening a listed note goes to the editor` | `/pathname: '\/note-editor' as any, params: \{ id \}/` |
| `book ref round-trips to this screen` | In `__tests__/noteNavigation.test.ts`: `noteSourceTarget(makeBookRef({ id: <a real mock book id from contentService>, title }, 'book-detail'))` gives an href whose last segment is that id |

**Step 3: Implement.** No `onOpenSource` is needed here, because the source is this screen. The section returns `null` when empty.

**Step 5:** `git commit -m "feat(books): show notes linked to a book on its detail screen"`

---

### Task 21: Full verification, docs touch-up and visual QA

**Files:**
- Modify: `CLAUDE.md`, the **State** section bullet for `notesStore`. Update the API to `addNote(title, body, ref?)`, mention persist `version: 1`, `notesFor` and `useLinkedNotes`, and point to `services/noteRefs.ts` and `services/noteNavigation.ts`. Add `components/khazain/notes/` to the File layout tree.
- Modify: `docs/plans/2026-10-21-contextual-notes-design.md`. Record any decision changed during implementation.

**Step 1: Automated gates** (all must be green)

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "notesStore|noteRefs|noteNavigation|mushafNavigation|note-editor|notes-viewer|sections/mushaf|MiniPlayer|\(tabs\)/library|scholar/\[id\]|sections/book|audioEngine|lecturePlayback|khazain/notes" -A 2
```

The lint grep must print nothing new. The `browse.tsx:603` errors are known and out of scope.

**Step 2: Visual QA on the iOS simulator.** Read the `argent-device-interact` and `argent-test-ui-flow` skills first, and use `list-devices` and prefer a booted simulator. Capture each state below. Compare a frame state against its reference PNG under `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/`. For a no-frame state, check against the named contract.

| # | State to capture | Route / action | Compare against |
|---|---|---|---|
| 1 | Fresh install, no notes | `/sections/mushaf?surah=2` | `16-2349-982.png`. Header, meta and footer must be pixel-identical; there is no notes section and no tinted numbers. |
| 2 | Resume transition | cold start with last page > 1 | `15-2349-829.png` (unchanged) |
| 3 | Surah index | `/sections/mushaf` | `14-2207-17898.png` (unchanged) |
| 4 | Library, no notes, no lecture | `/library` | `06-2031-4659.png` (unchanged) |
| 5 | Home, no track | `/` | `05-2001-940.png` (unchanged) |
| 6 | Scholar detail, no notes | `/sections/scholar/s1` | `19-2510-1990.png` (unchanged) |
| 7 | Long-press Al-Baqara 255 | in the reader | no frame. The editor shows the chip `مرتبطة بـ البقرة: ٢٥٥`. Contracts: `RTL_TEXT`, `textStyle('caption')`. |
| 8 | Reader after saving 2 ayah notes | `/sections/mushaf?surah=2` | No frame for the reading surface. Header, meta and footer are still identical to `16-2349-982.png`. Ayahs 255 and 286 are tinted `navy800`. The end-of-surah section is ordered 255 then 286, rows are in `PHYSICAL_ROW` order (time on the left), and the text sits on the physical right. |
| 9 | VoiceOver action on the ayat body | Rotor → "إضافة ملاحظة على السورة" | The editor chip reads `مرتبطة بـ سورة البقرة` |
| 10 | Notes viewer with linked and plain notes | Library → ملاحظاتي → viewer | No frame. Contract: `PHYSICAL_ROW` (time left, column right). The label sits under the title. A plain note has no second line. |
| 11 | Tap the `البقرة: ٢٥٥` link in the viewer | — | The reader opens at Al-Baqara, scrolled near 255 with the highlight. Back navigation does not land on the dismissed sheet. |
| 12 | Play a lecture, long-press the MiniPlayer at about 12:34 | scholar `s1` → play → long-press | The editor chip reads `مرتبطة بـ محاضرة <title> — ١٢:٣٤`, with the time rendered as one LTR numeral group. MiniPlayer pixels are unchanged when not pressed. |
| 13 | Tap the lecture link in the viewer | — | The sheet closes and the MiniPlayer shows the same episode, seeked to about 12:34. |
| 14 | Library in-progress card "إضافة ملاحظة" | `/library` | Same pixels as before the tap. The editor chip shows the lecture label at the saved position. |
| 15 | Scholar detail with a lecture note | `/sections/scholar/s1` | The footer "ملاحظاتي على هذه الدروس" sits below the list; the rows above it are unchanged against `19-2510-1990.png`. |
| 16 | Book detail (post-rebase) | `/sections/book/<id>` | No frame. The "إضافة ملاحظة" action follows the search ticket's book-detail contract. With a note saved, the linked-notes section shows in the reserved slot, and the viewer link for that note lands here. |
| 17 | Upgrade path | Install the `main` build, create 2 notes, install this build | Both notes survive with their titles and bodies, and the viewer shows no ref line for them (migration v0 → v1). |
| 18 | Android spot check | Repeat 1, 8, 10 and 12 on the emulator | Same physical order. The nested-Text long-press works. |

Optional evidence: `npm run capture:ios` and `npm run compare:figma` for states 1, 4, 5 and 6.

**Step 3: Commit**

```bash
git add CLAUDE.md docs/plans/2026-10-21-contextual-notes-design.md
git commit -m "docs: record the contextual notes contracts"
```

Do not push. Report the QA table with screenshots to the user.
