# Contextual Notes Linked to Content: Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: use superpowers:executing-plans (or the CLAUDE.md subagent-driven loop) to implement this plan task by task. Each task needs a spec review, then a code-quality review, before it is marked done.

**Goal:** Notes can be linked to an ayah (and its page), a lecture second or a book. You create them from the Mushaf reader, the MiniPlayer, the Library in-progress card and book detail. You see them on those screens and in the notes viewer and editor, and you can jump from a note back to its source.

**Architecture:**
- Pure modules hold the logic:
  - `services/noteRefs.ts`: types, labels, lenient validation and route params
  - `services/noteActions.ts`: the params each "take note" action pushes
  - `services/noteNavigation.ts`: ref → route or playback target, plus a runner that never dismisses
  - additions to `services/mushafNavigation.ts` (ayah scroll math) and `services/audioEngine.ts` (explicit start point)
- `notesStore` gains `ref` through `merge` plus coercion, with **no persist version bump**.
- The UI is wired onto the post-rebase screens: the progress branch's segmented Mushaf reader and the search branch's book detail.

The rationale is in `docs/plans/2026-10-21-contextual-notes-design.md` (v2).

**Tech stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, zustand 5, expo-router 6, react-native-track-player 4 (behind `services/audioEngine.ts`), and jest-expo.

**Testing rules (CTO change 6):**
- **Behaviour** is tested through pure helpers.
- **Source scans** (the `__tests__/miniPlayerReach.test.ts` technique) are used *only* for invariants:
  - the `LinkedNotesSection` null guard
  - the three Mushaf footer slots
  - `PHYSICAL_ROW` with no `row-reverse`
  - `getState()`, not a subscription, in the MiniPlayer
  - the long-press rule
- **Every test file that imports `@/store/notesStore` at runtime** (directly or through `linkedNotesModel`, `noteActions`, or anything else) starts with:

```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

- Do not use component-render tests. The repo has no testing library, and `react-test-renderer` is not in `package.json`.

**Standing rules:**
- No new dependencies. No `--no-verify`. No `Co-Authored-By` or any AI attribution.
- Spread `RTL_TEXT` on new Text, and author rows in physical left → right order in `PHYSICAL_ROW`.
- Use `router.push(... as any)` for routes that typed-routes has not regenerated.
- Run `npx tsc --noEmit --pretty false` after every task.

**Line anchors:** `file:line` refers to the base `0635ea1` unless it says "post-rebase". After Task 0, the post-rebase anchors are named by **symbol** and by the sibling plan task that introduced them. Re-confirm each anchor at the start of its task.

**Long-press rule (design §3, user decision):** long-press on `LectureCard`/`RibbonCard` means **SAVE** (saved branch). Long-press on an ayah or the MiniPlayer means **NOTE** (this branch). Never put a note gesture on a lecture row.

---

### Task 0: Rebase onto the sibling branches and confirm anchors (no code)

**Steps:**
1. **Prerequisite:** `fix/search-route-and-navigation` (search v2) and `feat/progress-page-tracking` are implemented. Note which of `fix/saved-lecture-bookmarks` and `feat/onboarding-audio-previews` have landed on the integration base.
2. Rebase this branch onto the integration branch the coordinator names (which contains search and progress), for example `git rebase <integration-branch>`. Resolve conflicts with the `resolving-merge-conflicts` skill. This branch has only the two plan docs at this point, so conflicts should not happen.
3. Run `npx jest && npx tsc --noEmit --pretty false`. Both must be green before any task starts.
4. Record in a scratch note (not committed) the post-rebase location of each of these:
   - `ReadingView`, `segments`, `layoutsRef`, `bodyYRef`, the segment `<Text>` map and the `ScrollView` in `app/(tabs)/sections/mushaf.tsx` (progress Task 6)
   - `pageForAyah` in `constants/quranPages.ts` (progress Task 1)
   - `BOOK_DETAIL_SECTIONS` (`constants/bookDetailPresentation.ts`), `bookDetailHref` and `resolveBookDetail` (`services/bookDetail.ts`), the `sections` record in `app/(tabs)/sections/book/[id].tsx`, and the order assertion in `__tests__/bookDetail.test.ts` (search Task 7 and the book-detail screen task)
   - the `RibbonCard save=` prop in `scholar/[id].tsx` and `saveGestureProps` in `services/savedToggle.ts` (saved v2), if landed
   - the preview clear at the top of `playLecture` and `__resetForTests` (onboarding), if landed
5. Leave the commit history alone.

---

### Task 1: The `services/noteRefs.ts` module (labels, `NoteRef`, lenient validation, route params)

**Files:**
- Create: `services/noteRefs.ts`
- Test: `__tests__/noteRefs.test.ts` (no store import, so no AsyncStorage mock is needed)

**Step 1: Failing tests**

`describe('labels')`:

| Test | Assertion |
|---|---|
| `formatPlaybackTime renders m:ss in Arabic-Indic digits` | `754` → `'١٢:٣٤'`; `65` → `'١:٠٥'`; `5` → `'٠:٠٥'` |
| `formatPlaybackTime switches to h:mm:ss at one hour` | `3600` → `'١:٠٠:٠٠'`; `3723` → `'١:٠٢:٠٣'` |
| `formatPlaybackTime floors and clamps junk` | `754.9` → `'١٢:٣٤'`; `-3`, `NaN` and `Infinity` → `'٠:٠٠'` |
| `ayahRefLabel` | `(2,255)` → `'البقرة: ٢٥٥'`; `(1,7)` → `'الفاتحة: ٧'`; `(2)` → `'سورة البقرة'` |
| `lectureRefLabel leads with the title` | `('آداب الدعاء','الشيخ عبد المحسن العباد',754)` → `'محاضرة آداب الدعاء — ١٢:٣٤'` |
| `lectureRefLabel falls back to the speaker` | `('  ','الشيخ ابن عثيمين',754)` → `'محاضرة الشيخ ابن عثيمين — ١٢:٣٤'` |
| `lectureRefLabel without a position` | `('آداب الدعاء','x')` → `'محاضرة آداب الدعاء'` |
| `bookRefLabel` | `('الأصول الثلاثة')` → `'كتاب الأصول الثلاثة'`; `(…,12)` → `'كتاب الأصول الثلاثة — صفحة ١٢'` |

`describe('builders')`:

| Test | Assertion |
|---|---|
| `makeAyahRef pads the id and records ayah and page` | `makeAyahRef('2', 255)` → `{ type:'ayah', id:'002', position:255, page: pageForAyah(2,255), label:'البقرة: ٢٥٥', context:'mushaf' }` |
| `makeAyahRef surah-level` | `makeAyahRef('002')` has no `position` and no `page`, and the label is `'سورة البقرة'` |
| `isEpisodeId` | `'ABC/002.mp3'` and `'ABC/sub/x.mp3'` → true; `'sl5-1'`, `'/x'`, `'ABC/'` and `''` → false |
| `makeLectureRef rounds the position` | `({ id:'ABC/002.mp3', title:'ح2', speaker:'الشيخ', positionSec:754.6 }, 'mini-player')` → `position 755`, label `'محاضرة ح2 — ١٢:٣٥'`, `title` and `speaker` kept |
| `makeLectureRef refuses a non-episode id` | `({ id:'sl5-1', … })` → `undefined` |
| `makeBookRef` | `({ id:'bk2', title:'الأصول الثلاثة' })` → `{ type:'book', id:'bk2', label:'كتاب الأصول الثلاثة', context:'book-detail' }` |

`describe('coerceNoteRef (lenient)')`:

| Test | Assertion |
|---|---|
| `round-trips every builder output` | `coerceNoteRef(x)` deep-equals `x` |
| `keeps an unknown type and context (newer build)` | `{ type:'video', id:'v1', label:'فيديو', context:'tv' }` is kept as-is |
| `keeps unknown keys` | `{ ...valid, extra: { a: 1 } }` keeps `extra` |
| `drops structurally malformed refs` | `null`, `'x'`, `[]`, `{}`, `{ type:'', id:'a', label:'l' }`, `{ type:'ayah', id:5, label:'l' }`, `{ type:'ayah', id:'a' }` (no label), `{ …, position: NaN }`, `{ …, position: -1 }`, `{ …, position: '3' }` and `{ …, page: 1.5 }` → `undefined` |
| `never throws` | For each of 20 junk values (primitives, arrays, nested junk), `expect(() => coerceNoteRef(v)).not.toThrow()` |

`describe('route params')`:

| Test | Assertion |
|---|---|
| `noteRefToParams emits string values under ref* keys` | ayah → `{ refType:'ayah', refId:'002', refPos:'255', refPage:'<n>', refLabel:'البقرة: ٢٥٥', refContext:'mushaf' }` |
| `omits absent optional fields` | There is no `refPos`/`refPage`/`refTitle`/`refSpeaker` key when undefined |
| `noteRefFromParams round-trips every builder` | deep-equal |
| `reads expo-router string[] params` | `{ refType:['ayah'], … }` → the first element |
| `no ref params → undefined` | `{ id:'n1' }` → `undefined` |
| `tampered numeric params → undefined` | `refPos:'abc'` → `undefined` (numbers must match `/^\d+$/`) |

**Step 2:** `npx jest __tests__/noteRefs.test.ts` → FAIL (module not found).

**Step 3: Implement**, following design §4.1–4.2:

```ts
const SEP = ' — ';
const pad2 = (n: number) => String(n).padStart(2, '0');
export function formatPlaybackTime(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return toArabicDigits(h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`);
}
```

- Labels, `NOTE_REF_TYPES`, `NoteRef` (open `type`/`context`, with an index signature for extras), `isEpisodeId = (id) => /^[^/]+\/.+$/.test(id)`, the builders (`makeAyahRef` imports `pageForAyah` from `@/constants/quranPages` and `normalizeSurahParam`), `coerceNoteRef` (validates the required fields, then returns `{ ...raw }`, so unknown keys survive), `noteRefToParams` and `noteRefFromParams`.
- The builders' `context` defaults: `makeAyahRef` → `'mushaf'`, `makeBookRef` → `'book-detail'`, and lecture → the argument.

**Step 4:** The test passes. `npx tsc --noEmit --pretty false` is clean.

**Step 5:** `git add services/noteRefs.ts __tests__/noteRefs.test.ts && git commit -m "feat(notes): add note references, Arabic labels and route params"`

---

### Task 2: `notesStore` keeps a ref through `merge` plus coercion (no version bump)

**Files:**
- Modify: `store/notesStore.ts`: `:6-12` (`Note`), `:14-19` (`NotesState`), `:28-35` (`addNote`) and `:48-52` (persist options)
- Test: create `__tests__/notesStore.test.ts`. Add the AsyncStorage mock, and copy the `flushPersist`/`rehydrate` helpers from `__tests__/settingsStore.test.ts:17-43`.

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `T-NS-1 addNote without a ref keeps the old shape` | `'ref' in notes[0] === false` |
| `T-NS-2 addNote stores the ref` | `addNote('t','b', makeAyahRef('2',255))` → `notes[0].ref` equal to the input |
| `T-NS-3 updateNote keeps the ref` | After `updateNote(id,{ body:'x' })` the ref is unchanged and `updatedAt` is greater |
| `T-NS-4 an existing record hydrates unchanged` | Seed `@khazain/notes` with `{ state:{ notes:[n1,n2] }, version:0 }`, then rehydrate. Both notes come back field-for-field. |
| `T-NS-5 a malformed ref is dropped, the note kept` | Seed a note with `ref:{ id: 5 }`, then rehydrate. The note is present and `ref` is undefined. |
| `T-NS-6 an unknown ref type survives (forward compatible)` | Seed `ref:{ type:'video', id:'v', label:'فيديو', extra:1 }`, then rehydrate. The ref is deep-equal to the seed. |
| `T-NS-7 no persist version bump` | After `addNote` and a flush, `JSON.parse(getItem('@khazain/notes')).version === 0`. A source scan of `store/notesStore.ts` shows no `version:` key and no `migrate:` key in the persist options. |
| `T-NS-8 coerceNotes never throws on junk` | For each of `undefined`, `null`, `'x'`, `42`, `[]`, `{ notes:'x' }`, `{ notes:[null, 1, 'a', { id: 3 }, { id:'' }] }` and `{ notes:[{ id:'ok', title: 7 }] }`, `expect(() => coerceNotes(v)).not.toThrow()`. The last value gives `[{ id:'ok', title:'', body:'', createdAt:0, updatedAt:0 }]`, and every non-array `notes` gives `[]`. |
| `T-NS-9 merge keeps the actions` | After rehydrating junk, `typeof getState().addNote === 'function'` |
| `T-NS-10 the storage key is unchanged` | Source scan: `/name: '@khazain\/notes'/` |

**Step 2:** `npx jest __tests__/notesStore.test.ts` → FAIL.

**Step 3: Implement**
- `Note.ref?: NoteRef`.
- `addNote(title, body, ref?)` uses `...(ref ? { ref } : {})`.
- Export `coerceNotes(persisted: unknown): Note[]`. It only accepts an object whose `notes` is an array. Each entry is kept when `id` is a non-empty string. `title`/`body` must be strings or `''`, and the timestamps must be finite or `0`. When `'ref' in entry`, `ref` is `coerceNoteRef(entry.ref)`, omitted if undefined. Other note keys are preserved.
- Persist options add `merge: (persisted, current) => ({ ...current, notes: coerceNotes(persisted) })`, with a comment that cross-references `settingsStore.ts:377-387` (no write-back at hydrate) and design §4.1 (why there is no version bump: downgrade safety).

**Step 4:** The new test passes, and so do `npx jest __tests__/notesExporter.test.ts __tests__/cacheFacade.test.ts` and tsc.

**Step 5:** `git commit -m "feat(notes): persist an optional content reference without a schema bump"`

---

### Task 3: Linked-note selectors

**Files:**
- Modify: `store/notesStore.ts` (append the selectors), `store/index.ts:113-114` (re-export them)
- Test: `__tests__/notesStore.test.ts` (new `describe`)

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `notesFor matches type and id exactly` | Among ayah `002`, ayah `003`, a lecture, a plain note and an unknown-type note, only the `002` note is returned |
| `notesFor keeps store order` | Two `002` notes come back in input order |
| `archiveIdOfEpisode` | `'ABC/sub/x.mp3'` → `'ABC'` |
| `notesForLectureSeries matches by archive id` | `ABC/001.mp3` and `ABC/sub/002.mp3` match `new Set(['ABC'])`; `ABCD/001.mp3` does not; book and ayah refs never match |

**Step 3: Implement** `notesFor`, `archiveIdOfEpisode`, `notesForLectureSeries` and `useLinkedNotes(type, id)`:

```ts
export function useLinkedNotes(type: NoteRefType, id: string): Note[] {
  const notes = useNotesStore((s) => s.notes);
  return useMemo(() => notesFor(notes, type, id), [notes, type, id]);
}
```

Never filter inside the zustand selector, because a fresh array per call loops under zustand 5.

**Step 5:** `git commit -m "feat(notes): add linked-note selectors"`

---

### Task 4: Pure "take note" param builders

**Files:**
- Create: `services/noteActions.ts`
- Test: create `__tests__/noteActions.test.ts` (no store import: it takes `track` and `progress` as arguments and imports only types)

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `takeAyahNoteParams links the ayah` | `('002', 255)` → `noteRefToParams(makeAyahRef('002',255))` |
| `takeAyahNoteParams surah-level` | `('002', undefined)` → params without `refPos`, with label `'سورة البقرة'` |
| `takeLectureNoteParams freezes the current second` | track `{ id:'ABC/001.mp3', title:'ح1', reciter:'س', durationSec:600 }` with progress `0.5` → `refPos:'300'`, `refContext:'mini-player'` |
| `takeLectureNoteParams without a duration has no position` | → no `refPos`, and a label with no ` — ` |
| `takeLectureNoteParams for a non-episode track gives a plain note` | track id `'mock-fatiha'` → `{}` |
| `takeLectureNoteParams with no track gives a plain note` | `(null, 0)` → `{}` |
| `lectureNoteParamsFromSession` | A `LectureSession` (`db/types.ts:21-30`) with `positionSec:754.4` → `refId:lectureId`, `refPos:'754'`, `refContext:'library-progress'`, label `'محاضرة <title> — ١٢:٣٤'` |
| `bookNoteParams` | `({ id:'bk2', title:'الأصول الثلاثة' })` → `refType:'book'`, `refId:'bk2'`, `refContext:'book-detail'` |

**Step 3: Implement** the four functions, each returning `Record<string, string>`. They use type-only imports for `PlayerTrack` (`store/playerStore.ts:44`) and `LectureSession` (`db/types.ts:21`).

**Step 5:** `git commit -m "feat(notes): pure params for every take-note action"`

---

### Task 5: Shared linked-note UI

**Files:**
- Create: `components/khazain/notes/{linkedNotesModel.ts,NoteRefLink.tsx,LinkedNotesSection.tsx,index.ts}`
- Modify: `components/khazain/index.ts` (add `export * from './notes';`)
- Test: create `__tests__/linkedNotesModel.test.ts` (with the AsyncStorage mock, because it imports `formatRelativeAr` from the store); create `__tests__/contextualNotesInvariants.test.ts` (source scans; later tasks add to it)

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `linkedNoteRow carries id, title, label and relative time` | `Date.now` frozen as in `notesExporter.test.ts:30-35`; an hour-old ayah note → `{ id, title, label:'البقرة: ٢٥٥', time:'منذ ساعة' }` |
| `linkedNoteRow untitled fallback` | `'ملاحظة بلا عنوان'` (the same string as `notes-viewer.tsx:75`) |
| `linkedNoteRow plain note has no label` | `label === undefined` |
| `linkedNoteRow unknown-type ref shows its label but is not linkable` | `{ label:'فيديو', linkable:false }`, while a known type gives `linkable:true` |
| `sortByPosition` | Positions `[286, undefined, 255]` → `[undefined, 255, 286]`, stable for ties |
| (invariant) `LinkedNotesSection renders nothing when empty` | `/if \(notes\.length === 0\) return null;/` |
| (invariant) `rows are physically ordered` | `LinkedNotesSection.tsx` contains `...PHYSICAL_ROW` and no `row-reverse` |

**Step 3: Implement** as in design §4.10.
- **`NoteRefLink`:** `textStyle('caption', { color: KhazainColors.navy800 })`, `...RTL_TEXT`, `numberOfLines={1}`. When it gets `onPress`, it is a `Pressable` with `accessibilityRole="link"`, ``accessibilityLabel={`الانتقال إلى ${label}`}`` and `hitSlop={6}`.
- **`LinkedNotesSection({ title?, notes, onOpenNote, onOpenSource? })`** (the title is optional, so book detail can use its own heading):
  - The container uses `PHYSICAL_BOX`. The title, when given, uses `textStyle('sectionTitle', { color: KhazainColors.ink900 })` with `RTL_TEXT`.
  - Each row is a `Pressable` card: `cream50`, a `cardBorder` hairline, `KhazainRadius.lg`, `PHYSICAL_ROW`. Physically left → right it holds the time (`caption`, `ink400`), then a `flex: 1` column with the title (`cardTitle`) and the label link.
  - No frame governs it. The contracts are `constants/layout.ts`, `constants/typography.ts` and `theme.ts`.

**Step 4:** `npx jest __tests__/linkedNotesModel.test.ts __tests__/contextualNotesInvariants.test.ts __tests__/rtlPhysicalContract.test.ts` passes, and tsc is clean.

**Step 5:** `git commit -m "feat(notes): add shared linked-note section and reference link"`

---

### Task 6: The note editor accepts a ref, shows it, and labels "آخر الملاحظات" rows

**Files:**
- Modify: `app/note-editor.tsx`:
  - `:21` (Params)
  - `:30-38` (decode)
  - `:59-77` (`save`)
  - `:107-109` (chip under the title)
  - `:145-163` (recent rows gain a label line)
- Modify: `components/khazain/notes/linkedNotesModel.ts`. Add `editorSeed(params)` → `{ ref?: NoteRef; legacyTitle?: string }`.
- Test: `__tests__/linkedNotesModel.test.ts` (with the AsyncStorage mock)

**Step 1: Failing tests** (behaviour lives in the pure seed helper)

| Test | Assertion |
|---|---|
| `editorSeed decodes a linked note` | `editorSeed(noteRefToParams(ref))` → `{ ref }` |
| `editorSeed keeps the legacy title seed` | `{ title:'x' }` → `{ legacyTitle:'x' }` with no ref |
| `editorSeed ignores a ref when editing an existing note` | `{ id:'n1', ...refParams }` → `{}` (the stored ref wins) |
| `recent rows carry the label` | `linkedNoteRow` (Task 5) is reused, so this is already covered. Add one case with an editor-shaped note list. |

**Step 3: Implement**
- `const { ref: seedRef, legacyTitle } = editorSeed(params);` and `const shownRef = existing?.ref ?? seedRef;`
- Under the title, add ``shownRef ? <NoteRefLink label={`مرتبطة بـ ${shownRef.label}`} /> : null``. It is static, because navigating away would drop the draft.
- In `save()`, call `addNote(derivedTitle, cleanBody, seedRef)`.
- Recent rows switch to the `linkedNoteRow` model. A row with a label gets a column holding the title and a static `NoteRefLink`. The row stays `PHYSICAL_ROW` (`recentRow`, `:311-322`), with the time on the left.
- `scrollContent` already spreads `PHYSICAL_BOX` (`:261-264`).
- No frame among the 28. This is the recorded deviation from the unmapped "ملاحظة سريعة" frame (design §6).

**Step 4:** The tests pass, tsc is clean, and `npx jest __tests__/rtlPhysicalContract.test.ts __tests__/rtlVisualContracts.test.ts` passes.

**Step 5:** `git commit -m "feat(notes): create linked notes from the editor and label recent notes"`

---

### Task 7: Ayah deep-link math (param, segment and line lookup)

**Files:**
- Modify: `services/mushafNavigation.ts` (append)
- Test: `__tests__/mushafPresentation.test.ts` (new `describe('ayah deep link')`; the existing `:10-68` tests stay)

**Step 1: Failing tests** (`Ayah` fixtures as in progress Task 3: `{ surahId, number, text }`)

| Test | Assertion |
|---|---|
| `normalizeAyahParam` | `('255',286)` → 255; `('0',7)`, `('8',7)`, `('2a',7)`, `('',7)` and `(undefined,7)` → null; `('255',undefined)` → 255; `('300',undefined)` → null |
| `segmentForAyah finds the page segment` | segments `[{page:2, ayat:1–5},{page:3, ayat:6–7}]` → ayah 6 gives index 1; ayah 9 gives -1 |
| `ayahCharOffset counts text, marker and separator exactly as rendered` | ayat `[{1,'aaaa'},{2,'bb'},{3,'c'}]` → ayah 1 gives 0; ayah 2 gives `4 + '  1  '.length + 1` = 10; ayah 3 gives `10 + 2 + 5 + 1` = 18 |
| `ayahCharOffset handles multi-digit markers` | ayah 10 after ayah 9 (`'x'`) adds `'  9  '.length` (5); after ayah 100 the marker is 7 |
| `segmentCharLength matches the rendered string` | Equals the `.length` of the concatenation `text + '  n  ' + ' '` (no trailing separator) |
| `lineYForOffset picks the line containing the offset` | lines `[{text:'0123456789',y:0},{text:'0123456789',y:48},{text:'01234',y:96}]` → offset 0 gives 0; 10 gives 48; 24 gives 96; 99 gives the last line's y |
| `ayahScrollY uses the line when the lines add up` | `bodyY 120`, `segmentY 400` and a line at 48 → `568` |
| `ayahScrollY falls back to the in-segment fraction when the lines are off by >5%` | expected length 100 and lines summing to 80 → `120 + 400 + (offset/100) × segmentHeight` |
| `ayahScrollY falls back when there are no lines yet` | `lines: undefined` → the fraction path |

**Step 3: Implement** `normalizeAyahParam(raw, ayahCount?)`, `segmentForAyah`, `ayahMarker(n) = '  ' + n + '  '` (it must match `AyahNum` at `mushaf.tsx:268-276`, which a comment cross-references), `ayahCharOffset`, `segmentCharLength`, `lineYForOffset` and `ayahScrollY`.

**Step 5:** `git commit -m "feat(mushaf): locate an ayah's line inside its page segment"`

---

### Task 8: Start a lecture at an explicit episode and second

**Files:**
- Modify: `services/audioEngine.ts`, the `playLecture` resume block (base `:142-152`; post-rebase it sits after the onboarding preview clear, if that landed), queue start `:163-166`, and setTrack `:168-178`
- Modify: `services/lecturePlayback.ts:12`
- Test: `services/audioEngine/__tests__/audioEngine.test.ts` (the `playLecture` describe at `:108`)

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| **(changed deliberately)** `resumes: starts the saved episode at its position in one skip` | Replace `:148-149` with `expect(TrackPlayer.skip).toHaveBeenCalledWith(1, 120)` and `expect(TrackPlayer.seekTo).not.toHaveBeenCalled()`. The commit message names this change. |
| `resumes on episode 0 via skip(0, pos)` | `mockInProgress` on `ABC/001.mp3@90` → `skip(0, 90)` |
| `plays from the top without skip or seek` | The existing `:127-143` test is unchanged (`skip` is not called) |
| `explicit start beats the saved session` | `playLecture(LECTURE, { episodeId:'ABC/003.mp3', positionSec:45 })` with `mockInProgress` on `002@120` → `skip(2, 45)`, and the `setTrack` initial progress ≈ `45/800` |
| `explicit start falls back to resume when the episode is not in the series` | `'ABC/999.mp3'` → `skip(1, 120)` |
| `start is capped at duration − 1` | `{ episodeId:'ABC/001.mp3', positionSec:5000 }` → `skip(0, 599)` |
| `one-shot correction seeks once when playback starts short` | Capture the `addEventListener(Event.PlaybackState, cb)` callback, mock `getProgress` → `{ position: 0 }`, then fire `cb({ state: State.Ready })` → `seekTo(45)` once and the listener's `remove` called. A second fire does not seek again. |
| `no correction within 2 s` | `getProgress` → `{ position: 44 }` → no `seekTo` |
| `pure helpers` | `resolveStartPoint(eps, null, undefined)` → `{ index:0, positionSec:0 }`; `clampStartPosition(-5, 600)` → 0; `clampStartPosition(700, 0)` → 700 (unknown duration is not capped); `needsSeekCorrection(0, 45)` → true; `(43.5, 45)` → false |
| `startLecturePlayback passes start through` | In a new `__tests__/lecturePlayback.test.ts` that mocks `@/services/audioEngine`: `playLecture` is called with `(lecture, start)` |

**Step 3: Implement**
- Export `LectureStart`, `resolveStartPoint`, `clampStartPosition` and `needsSeekCorrection`.
- In `playLecture`:
  1. After `setQueue`, when `startPos > 0 || startIndex > 0`, call `await TrackPlayer.skip(startIndex, startPos > 0 ? startPos : undefined)`.
  2. `await TrackPlayer.play()`.
  3. If `startPos > 0`, arm the one-shot listener. On `State.Ready`/`State.Playing` it removes itself, reads `getProgress()`, and if `needsSeekCorrection(position, startPos)` it calls `seekTo(startPos)`. Errors are caught and reported to Sentry, as at `:208`.
- The onboarding preview clear (if present) stays the first statement.
- `startLecturePlayback(lecture, start?)` passes `start` through.

**Step 4:** `npx jest services/audioEngine __tests__/lecturePlayback.test.ts` passes, and so do the onboarding `preview.test.ts` and `syncBridge.test.ts` if landed. tsc is clean.

**Step 5:** `git commit -m "feat(audio): start a lecture at an explicit second via skip(index, position)"`. The body says: "Resume now uses skip(index, initialPosition); the resume expectation in audioEngine.test.ts changed on purpose."

---

### Task 9: Jump within the active queue without refetching (accepted optional)

**Files:**
- Modify: `services/audioEngine.ts` (`playLecture`, before `fetchItemMetadata`)
- Modify: `__mocks__/react-native-track-player.ts` (add `getQueue: jest.fn().mockResolvedValue([])`)
- Test: `services/audioEngine/__tests__/audioEngine.test.ts`

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `an explicit start already in the active queue skips there without reset or fetch` | `getQueue` → three tracks `ABC/00{1,2,3}.mp3`; `playLecture(LECTURE, { episodeId:'ABC/002.mp3', positionSec:30 })` → `fetchItemMetadata` not called, `reset` not called, `skip(1, 30)` and `play` called, and `setTrack` mirrored with `id:'ABC/002.mp3'` |
| `without an explicit start the fast path is never taken` | `getQueue` holds `ABC/002.mp3`, `playLecture(LECTURE)` → `fetchItemMetadata` called |
| `an episode not in the queue takes the normal path` | → `fetchItemMetadata` and `reset` called |

**Step 3: Implement** a guarded early branch: `if (start) { const q = await TrackPlayer.getQueue(); const i = q.findIndex((t) => t.id === start.episodeId); if (i >= 0) { … ; return; } }`. Then mirror `setTrack`, `setVisible(true)` and `setIsPlaying(true)` as at `:168-180`, using the queue track's `title`/`duration`.

**Step 5:** `git commit -m "perf(audio): jump within the active queue when a note targets it"`

---

### Task 10: Resolve a note reference to its source (no dismissal)

**Files:**
- Create: `services/noteNavigation.ts`
- Test: create `__tests__/noteNavigation.test.ts` (no store import)

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `ayah ref targets the reader at that ayah` | `noteSourceTarget(makeAyahRef('2',255))` → `{ kind:'route', href:'/sections/mushaf?surah=2&ayah=255' }` |
| `surah-level ayah ref` | → `'/sections/mushaf?surah=2'` |
| `corrupt surah id → null` | `{ ...ref, id:'999' }` → `null` |
| `lecture ref targets playback at that second` | → `{ kind:'lecture', lecture:{ id:'ABC', archiveId:'ABC', title:'ح2', scholar:'الشيخ', duration:'', category:'scholar' }, start:{ episodeId:'ABC/002.mp3', positionSec:754 } }` |
| `lecture ref without a position starts at 0` | `start.positionSec === 0` |
| `lecture ref with a non-episode id → null` | `id:'sl5-1'` → `null` |
| `book ref targets book detail via search's helper` | `noteSourceTarget(makeBookRef({ id:'bk2', title:'t' }))` → `{ kind:'route', href: bookDetailHref('bk2') }` |
| `unknown type → null` | `{ type:'video', … }` → `null` |
| `runNoteSource navigates a route and never dismisses` | `deps = { navigate: jest.fn(), play: jest.fn() }` → `navigate(href)` only. `deps` has no dismiss member, so the type itself forbids it. |
| `runNoteSource plays a lecture target` | `play(lecture, start)` called and `navigate` not called |
| `runNoteSource(null) is a no-op` | Neither dep is called |

**Step 3: Implement** `noteSourceTarget(ref)` and `runNoteSource(target, deps: { navigate(href: string): void; play(l: Lecture, s: LectureStart): Promise<void> | void })`.
- The lecture object mirrors `audioEngine.ts:197-204`.
- The book href comes from `bookDetailHref` (search, `services/bookDetail.ts`).

**Step 5:** `git commit -m "feat(notes): resolve a note back to its source"`

---

### Task 11: The notes viewer shows the reference and closes, then navigates

**Files:**
- Modify: `app/notes-viewer.tsx`: `:17-24` (handlers), `:45-50` (`renderItem`), `:60-78` (`NoteRow`) and `:117-131` (styles)
- Test: `__tests__/contextualNotesInvariants.test.ts`, plus the pure `viewerSourceAction` in `services/noteNavigation.ts` with its tests in `__tests__/noteNavigation.test.ts`

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `viewerSourceAction closes first, then runs the target` | With fake `{ back, navigate, play }`, calling `viewerSourceAction(ayahRef, fake)` records the order `['back', 'navigate:/sections/mushaf?surah=2&ayah=255']` |
| `viewerSourceAction for a lecture closes, then plays` | Order `['back', 'play']` |
| `viewerSourceAction for an unlinkable ref does nothing` | No calls at all; the sheet stays open |
| (invariant) `viewer row stays physically ordered` | `notes-viewer.tsx` `row` still spreads `PHYSICAL_ROW`, with no `row-reverse` |

**Step 3: Implement**
- `NoteRow` becomes the `PHYSICAL_ROW` `[time] [column: title + (row.label ? <NoteRefLink onPress={row.linkable ? onOpenSource : undefined} /> : null)]`, using `linkedNoteRow` (Task 5).
- Wire `onOpenSource = () => viewerSourceAction(note.ref, { back: router.back, navigate: (h) => router.navigate(h as any), play: startLecturePlayback })`.
- The inner `Pressable` claims the touch, so the row's `onPress` (open the editor) does not fire.
- No frame among the 28 (design §4.6).

**Step 4:** tsc is clean, and `npx jest __tests__/noteNavigation.test.ts __tests__/contextualNotesInvariants.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/rtlVisualContracts.test.ts` passes.

**Step 5:** `git commit -m "feat(notes): show a note's source in the viewer and follow it"`

---

### Task 12: Mushaf long-press on an ayah takes a linked note (segmented reader)

**Files:**
- Modify (post-rebase): `app/(tabs)/sections/mushaf.tsx`:
  - in `ReadingView`, add `const router = useRouter()` and `takeAyahNote`
  - in the segment `<Text>` map (progress Task 6, Step 3.5), wrap each `{a.text}` and add the segment accessibility action
- Test: `__tests__/contextualNotesInvariants.test.ts` (the behaviour is `takeAyahNoteParams`, tested in Task 4)

**Step 1: Failing tests** (invariants only)

| Test | Assertion |
|---|---|
| `the footer is still the three Figma slots` | `/MUSHAF_FOOTER_ORDER\.map/` and exactly one `<MushafBtn` occurrence (frame 16) |
| `no save gesture on the reader` | `mushaf.tsx` does not match `/saveGestureProps\|useSaveGesture/` (long-press rule) |
| `ayah long-press uses the pure params` | `/takeAyahNoteParams\(surahId, /` (a wiring smoke check that stops a re-implemented ref sneaking in) |
| `progress wiring untouched` | The progress branch's `__tests__/mushafPageTrackingWiring.test.ts` still passes (run it; do not edit it) |

**Step 3: Implement**

```tsx
const takeAyahNote = useCallback((n?: number) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  router.push({ pathname: '/note-editor' as any, params: takeAyahNoteParams(surahId, n) });
}, [router, surahId]);
```

- Inside each segment `<Text>`, render `<Text onLongPress={() => takeAyahNote(a.number)} suppressHighlighting>{a.text}</Text>`, followed by `<AyahNum …/>` and the separator, unchanged.
- The segment `<Text>` gets `accessibilityActions={[{ name: 'addSurahNote', label: 'إضافة ملاحظة على السورة' }]}` and `onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'addSurahNote') takeAyahNote(undefined); }}`.
- Do not touch `onLayout`, `layoutsRef` or the tracker.

**Step 4:** tsc is clean, and `npx jest __tests__/contextualNotesInvariants.test.ts __tests__/mushafPresentation.test.ts __tests__/mushafPageTrackingWiring.test.ts` passes.

**Step 5:** `git commit -m "feat(mushaf): long-press an ayah to take a linked note"`

---

### Task 13: Mushaf `?ayah=` scrolls to the ayah's line and highlights it

**Files:**
- Modify (post-rebase): `app/(tabs)/sections/mushaf.tsx`:
  - `MushafScreen` params (base `:44`) gain `ayah?: string`, passed raw into `ReadingView` (base `:95`, `key={surahId}` unchanged)
  - in `ReadingView`: a `scrollRef` on the `ScrollView`, `linesRef`, `onTextLayout` on each segment `<Text>`, `scrolledAyahRef` and the highlight style
- Test: `__tests__/contextualNotesInvariants.test.ts` (the math is in Task 7)

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| (invariant) `remembers the last ayah, not a boolean` | `/scrolledAyahRef = useRef<number \| null>\(null\)/`, and no `/didScroll/` |
| (invariant) `ReadingView stays keyed by surah` | `/<ReadingView key=\{surahId\}/` |
| (invariant) `segment layouts still come from progress's layoutsRef` | `/layoutsRef\.current\.get\(/` is used by the scroll effect, and there is no second `onLayout` map |

**Step 3: Implement**
- `const targetAyah = normalizeAyahParam(rawAyah, ayat.length || undefined);`
- `onTextLayout={(e) => { linesRef.current.set(segment.page, e.nativeEvent.lines); tryScroll(); }}` on each segment `<Text>`. Also call `tryScroll()` from the existing segment `onLayout` and from an effect on `[targetAyah, segments]`.
- `tryScroll()`:
  1. If `targetAyah == null`, set `scrolledAyahRef.current = null` and return.
  2. If `targetAyah === scrolledAyahRef.current`, return.
  3. `i = segmentForAyah(segments, targetAyah)`. Get the layout from `layoutsRef.current.get(segments[i].page)`. If either is missing, return (a later layout callback retries).
  4. `y = ayahScrollY({ bodyY: bodyYRef.current, segmentY, segmentHeight, lines: linesRef.current.get(page), offset: ayahCharOffset(...), expectedLength: segmentCharLength(...) })`.
  5. `scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: false })`, then `scrolledAyahRef.current = targetAyah`.
- The span gets `style={a.number === targetAyah ? styles.ayahHighlight : undefined}` with `ayahHighlight: { backgroundColor: KhazainColors.cream200 }`.
- With no `ayah` param, nothing changes (frame 16's state).

**Step 5:** `git commit -m "feat(mushaf): open the reader at a linked ayah's line"`

---

### Task 14: The Mushaf reader shows its linked notes, or a hint line

**Files:**
- Modify (post-rebase): `app/(tabs)/sections/mushaf.tsx`, inside the `ScrollView` **after** the body wrapper `View` (outside progress's measured wrapper), plus the `styles`
- Modify: `components/khazain/notes/linkedNotesModel.ts`. Add `surahNotesBlock(notes)` → `{ kind:'hint' } | { kind:'notes', notes: Note[] }` (sorted by position).
- Test: `__tests__/linkedNotesModel.test.ts`, `__tests__/contextualNotesInvariants.test.ts`

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `surahNotesBlock with no notes is the hint` | `([])` → `{ kind:'hint' }` |
| `surahNotesBlock sorts by ayah` | `[286, 255, surah-level]` → `notes` ordered `[surah-level, 255, 286]` |
| (invariant) `the hint copy is exact` | `mushaf.tsx` contains `'اضغط مطولًا على آية لإضافة ملاحظة'` |
| (invariant) `notes block sits outside the measured segment wrapper` | In source order, the `surahNotesBlock(` usage appears after the closing of the `bodyYRef` wrapper. Assert that `indexOf('surahNotesBlock(') > indexOf('bodyYRef.current = ')`. |

**Step 3: Implement**
- `const block = surahNotesBlock(useLinkedNotes('ayah', surahId));`
- `hint` → `<Text style={styles.noteHint}>…</Text>` with `noteHint: textStyle('caption', { color: KhazainColors.ink400, textAlign: 'center' })` (centred, like the meta line at `:311-315`).
- `notes` → `<LinkedNotesSection title="ملاحظاتك على هذه السورة" notes={block.notes} onOpenNote={(id) => router.push({ pathname: '/note-editor' as any, params: { id } })} onOpenSource={(n) => router.setParams({ ayah: String(n.ref?.position ?? '') } as any)} />`. Tapping a label re-targets the scroll through Task 13's `scrolledAyahRef`.

**Step 5:** `git commit -m "feat(mushaf): show a surah's linked notes, or how to add one"`

---

### Task 15: MiniPlayer visible note button plus long-press

**Files:**
- Modify: `components/khazain/primitives/MiniPlayer.tsx`:
  - `:29-58` (row children; the order comment becomes "transport, note, title, cover")
  - `:136-219` (styles: `noteBtn`)
- Test: `__tests__/contextualNotesInvariants.test.ts` (behaviour: `takeLectureNoteParams`, Task 4)

**Step 1: Failing tests** (invariants)

| Test | Assertion |
|---|---|
| `reads the position at press time` | `/usePlayerStore\.getState\(\)/` inside `takeLectureNote`, and the parent component still has exactly the three atomic subscriptions (`track`, `isPlaying`, `isVisible`): count `usePlayerStore((s) =>` occurrences outside `ProgressFill` === 3 (T3.3 isolation, `:16-22`) |
| `uses the pure params` | `/takeLectureNoteParams\(/` |
| `no save gesture on the MiniPlayer` | No `/saveGestureProps\|useSaveGesture/` (long-press rule) |
| `the dock still collapses when idle` | The existing `__tests__/miniPlayerReach.test.ts` is green, and `/if \(!isVisible \|\| !track\) return null;/` is still present |

**Step 3: Implement**
- `takeLectureNote`:

```ts
const { track, progress } = usePlayerStore.getState();
router.push({ pathname: '/note-editor' as any, params: takeLectureNoteParams(track, progress) });
```

- The note button is a `Pressable` 32×32 (`hitSlop={6}`, `accessibilityRole="button"`, `accessibilityLabel="إضافة ملاحظة عند هذه اللحظة"`) holding `<FigmaIcon name="LibraryNotes" size={18} color={KhazainColors.navy800} />`. It is placed in physical order after `transport` and before `info` inside the existing `PHYSICAL_ROW` `row`.
- `info` and `cover` are wrapped in a `Pressable` with `style={{ flex: 1, ...PHYSICAL_ROW, alignItems: 'center', gap: 10 }}`, `onLongPress={takeLectureNote}`, `delayLongPress={350}`, `accessibilityHint="اضغط مطولًا لإضافة ملاحظة"`, `accessibilityActions={[{ name: 'longpress', label: 'إضافة ملاحظة' }]}`, and an `onAccessibilityAction` that calls `takeLectureNote`. It has no `onPress`.
- No frame draws the MiniPlayer (`:122`). The contracts are `PHYSICAL_ROW` and `theme.ts`.

**Step 4:** tsc is clean, and `npx jest __tests__/miniPlayerReach.test.ts __tests__/contextualNotesInvariants.test.ts __tests__/rtlVisualContracts.test.ts` passes.

**Step 5:** `git commit -m "feat(player): note the current moment from the mini player"`

---

### Task 16: The Library in-progress card creates a linked lecture note

**Files:**
- Modify: `app/(tabs)/library.tsx:331-334` (`onSecondary`). Keep `openNewNote` (`:266-267`) for the quick-note card.
- Test: `__tests__/contextualNotesInvariants.test.ts` (behaviour: `lectureNoteParamsFromSession`, Task 4)

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| (invariant) `frame 6 copy unchanged` | `/secondaryLabel="إضافة ملاحظة"/` |
| (invariant) `"آخر الملاحظات" rows unchanged (frame 6 conflict, design §4.8)` | The Library recent-note row block does not reference `NoteRefLink` or `linkedNoteRow` |
| (invariant) `uses the pure params` | `/lectureNoteParamsFromSession\(lecture\)/` |

**Step 3: Implement** `onSecondary={() => router.push({ pathname: '/note-editor' as any, params: lectureNoteParamsFromSession(lecture) })}`.

**Step 4:** tsc is clean, and `npx jest __tests__/libraryLayout.test.ts __tests__/libraryPresentation.test.ts __tests__/contextualNotesInvariants.test.ts` passes.

**Step 5:** `git commit -m "feat(library): link in-progress lecture notes to their position"`

---

### Task 17: Scholar detail lists notes for its lectures

**Files:**
- Modify (post-rebase): `app/(tabs)/sections/scholar/[id].tsx`. The `FlatList` (base `:52-66`, now carrying saved v2's `save=` prop on `RibbonCard`) gains a `ListFooterComponent`.
- Modify: `components/khazain/notes/linkedNotesModel.ts`. Add `seriesIdsOf(lectures)` → `Set<string>` (skipping missing `archiveId`).
- Test: `__tests__/linkedNotesModel.test.ts`, `__tests__/contextualNotesInvariants.test.ts`

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `seriesIdsOf collects archive ids` | `[{archiveId:'A'},{},{archiveId:'B'}]` → `Set {'A','B'}` |
| (invariant) `no note gesture on RibbonCard` | `scholar/[id].tsx` passes no `onLongPress` to `RibbonCard` (long-press rule: RibbonCard = SAVE) |
| (invariant) `footer uses the guarded section` | `/ListFooterComponent=\{\s*<LinkedNotesSection/` |

**Step 3: Implement**
- `const notes = useNotesStore((s) => s.notes);`
- `const linked = useMemo(() => notesForLectureSeries(notes, seriesIdsOf(lectures)), [notes, lectures]);`
- The footer is ``<LinkedNotesSection title="ملاحظاتي على هذه الدروس" notes={linked} onOpenNote={…editor…} onOpenSource={(n) => runNoteSource(noteSourceTarget(n.ref!), { navigate: (h) => router.navigate(h as any), play: startLecturePlayback })} />``. There is nothing to dismiss here.

**Step 4:** tsc is clean, and `npx jest __tests__/contextualNotesInvariants.test.ts __tests__/scholarCardLayout.test.ts __tests__/sectionsLayout.test.ts` passes, along with the saved branch's tests if they landed.

**Step 5:** `git commit -m "feat(scholar): show notes linked to a scholar's lectures"`

---

### Task 18: Book detail notes section (take-note action plus linked notes)

**Files:**
- Modify (post-rebase): `constants/bookDetailPresentation.ts`, making `BOOK_DETAIL_SECTIONS` `['cover','meta','primaryAction','notes']`
- Modify (post-rebase): `__tests__/bookDetail.test.ts`, the order assertion (**changed deliberately**)
- Modify (post-rebase): `app/(tabs)/sections/book/[id].tsx`, adding a `notes` entry to the `sections` record
- Test: `__tests__/noteActions.test.ts` (`bookNoteParams` already exists), `__tests__/noteNavigation.test.ts` and `__tests__/contextualNotesInvariants.test.ts`

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| **(changed deliberately)** `book detail section order` | `BOOK_DETAIL_SECTIONS` equals `['cover','meta','primaryAction','notes']` |
| `book note round-trips to this screen` | `noteSourceTarget(makeBookRef({ id:'bk2', title:'t' })).href === bookDetailHref('bk2')`, and `resolveBookDetail('bk2', MOCK_BOOKS, MOCK_LECTURES)` is non-null, so the id is a real `Book.id` (search R7) |
| (invariant) `the screen renders every section from the order constant` | `/BOOK_DETAIL_SECTIONS\.map\(/` is still present (search's own test) |
| (invariant) `notes list is the guarded section` | `book/[id].tsx` contains `<LinkedNotesSection` and `useLinkedNotes('book', ` |

**Step 3: Implement**
- `notes` is a `View` with `gap: 8` holding:
  - a `Text` "ملاحظاتي" (`textStyle('sectionTitle', { color: KhazainColors.ink900 })`, `RTL_TEXT`)
  - `<PillButton variant="cream" label="إضافة ملاحظة" onPress={() => router.push({ pathname: '/note-editor' as any, params: bookNoteParams(detail) })} />`
  - `<LinkedNotesSection notes={bookNotes} onOpenNote={…editor…} />`, with no `title` (the section's own heading is the "ملاحظاتي" text above it).
- `useLinkedNotes` must be called unconditionally at the top of the screen (Rules of Hooks), keyed by `id ?? ''`.
- No frame covers this screen. The contracts are search §4.4 (`PHYSICAL_BOX` content), `constants/typography.ts` and `theme.ts`.

**Step 4:** tsc is clean, and `npx jest __tests__/bookDetail.test.ts __tests__/bookDetailScreen.test.ts __tests__/noteNavigation.test.ts __tests__/contextualNotesInvariants.test.ts __tests__/rtlPhysicalContract.test.ts` passes.

**Step 5:** `git commit -m "feat(books): take and list notes on the book detail screen"`

---

### Task 19: Long-press rule invariant and docs

**Files:**
- Test: `__tests__/contextualNotesInvariants.test.ts` (`describe('long-press rule')`)
- Modify: `CLAUDE.md`:
  - **State** → the `notesStore` bullet: `addNote(title, body, ref?)`, `merge` + `coerceNotes` with no version bump and the reason, `notesFor`/`useLinkedNotes`, and pointers to `services/noteRefs.ts`, `services/noteActions.ts` and `services/noteNavigation.ts`
  - **File layout** → add `components/khazain/notes/`
  - a new **"Long-press means…"** rule under "Things TO do"

**Step 1: Failing tests**

| Test | Assertion |
|---|---|
| `lecture rows never take a note gesture` | `components/khazain/**/LectureCard.tsx` and `RibbonCard.tsx` do not import from `noteActions`/`noteRefs` |
| `note surfaces never take a save gesture` | `mushaf.tsx` and `MiniPlayer.tsx` do not reference `saveGestureProps`/`useSaveGesture` (shared with Tasks 12/15; keep one copy here) |
| `CLAUDE.md records the rule` | `CLAUDE.md` matches `/Long-press.*SAVE/` and `/Long-press.*NOTE/` |

**Step 5:** `git commit -m "docs: record the long-press rule and the contextual notes contracts"`

---

### Task 20: Full verification and visual QA

**Step 1: Automated gates** (all must be green)

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "notesStore|noteRefs|noteActions|noteNavigation|mushafNavigation|note-editor|notes-viewer|sections/mushaf|MiniPlayer|\(tabs\)/library|scholar/\[id\]|sections/book|bookDetailPresentation|audioEngine|lecturePlayback|khazain/notes" -A 2
```

The lint grep must print nothing new. The `browse.tsx:603` errors are known and out of scope.

**Step 2: Visual QA on the iOS simulator.** Load `argent-device-interact` and `argent-test-ui-flow` first, run `list-devices`, and prefer a booted simulator. Reference PNGs live under `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/`.

| # | State | Route / action | Compare against |
|---|---|---|---|
| 1 | Fresh install, no notes | `/sections/mushaf?surah=2` | `16-2349-982.png`. Header, meta and footer must be pixel-identical. The reading surface ends with the hint `اضغط مطولًا على آية لإضافة ملاحظة` (no frame there). |
| 2 | Resume transition | cold start, last page > 1 | `15-2349-829.png` (unchanged) |
| 3 | Surah index | `/sections/mushaf` | `14-2207-17898.png` (unchanged) |
| 4 | Library, no notes, no lecture | `/library` | `06-2031-4659.png` (unchanged) |
| 5 | Home, no track | `/` | `05-2001-940.png` (unchanged) |
| 6 | Scholar detail, no notes | `/sections/scholar/s1` | `19-2510-1990.png` (unchanged) |
| 7 | Long-press 2:255 | reader | No frame. The editor chip reads `مرتبطة بـ البقرة: ٢٥٥`. Contracts: `RTL_TEXT`, `textStyle('caption')`. |
| 8 | Reader with notes on 2:255 and 2:286 | `/sections/mushaf?surah=2` | Header, meta and footer still identical to `16-2349-982.png`. The hint is replaced by "ملاحظاتك على هذه السورة", ordered 255 then 286, with time on the left and text on the physical right. Page tracking still credits pages (progress QA). |
| 9 | VoiceOver on a segment | Rotor → "إضافة ملاحظة على السورة" | The chip reads `مرتبطة بـ سورة البقرة` |
| 10 | Viewer with linked, plain and unknown-type notes | Library → ملاحظاتي → viewer | No frame (`PHYSICAL_ROW`). The label sits under the title for linked notes. A plain note has no second line. An unknown type shows its label and is not tappable. |
| 11 | Tap `البقرة: ٢٥٥` in the viewer, then Android back | iOS and Android | The sheet closes and the reader opens at 2:255's line with the highlight. **Back lands on the previous distinct screen, never on a second copy of Library.** If it does, switch to the `dismissTo(href, { withAnchor: true })` fallback (design §4.6). |
| 12 | Same reader, follow a 2:286 note from its own section | reader | Scrolls to 286 without a remount (it remembers the last ayah) |
| 13 | Play a scholar lecture, then tap the MiniPlayer note button at about 12:34 | `s1` → play | The MiniPlayer shows transport, note, title, cover, left to right. The chip reads `مرتبطة بـ محاضرة <title> — ١٢:٣٤` (one LTR numeral group). Long-press on the title does the same. |
| 14 | Viewer link on that lecture note | — | The sheet closes, and the same episode plays from about 12:34 (no audible start at 0:00). With the same series already playing, there is no network fetch (fast path). |
| 15 | Library in-progress "إضافة ملاحظة" | `/library` | Pixels are unchanged before the tap, and the chip shows the lecture label at the saved position. "آخر الملاحظات" rows show **no** label (frame 6 exclusion). |
| 16 | Scholar detail with a lecture note | `/sections/scholar/s1` | The footer sits below the list. The rows above it match `19-2510-1990.png`. Long-press on a row **saves** (saved branch), not a note. |
| 17 | Book detail | `/content-search` → a book → `/sections/book/bk2` | No frame. Order: cover, meta, primary action, then the notes section with the "إضافة ملاحظة" pill. After saving, the note appears, and the viewer link lands back here. |
| 18 | **Downgrade** | Install this build, create 2 linked notes and 1 plain note, install the `main` build, edit one note, reinstall this build | In the old build all 3 notes are present (no crash, no loss). After reinstalling, both refs are intact, including the edited one. |
| 19 | Upgrade | Install `main`, create 2 notes, install this build | Both notes are present and unlinked |
| 20 | Android spot check | Rows 1, 8, 11, 13, 14 on the emulator | Same physical order. Long-press works on nested Text, and the line-lookup scroll lands within a line or two. |

Optional evidence: `npm run capture:ios` and `npm run compare:figma` for rows 1–6.

**Step 3:** Update the design doc for any decision that changed during implementation, then run `git commit -m "docs(plans): record contextual-notes implementation outcomes"`. Do not push. Report the QA table with screenshots.

---

## Task index

| # | Title | Depends on |
|---|---|---|
| 0 | Rebase onto the sibling branches and confirm anchors | search and progress implemented |
| 1 | `services/noteRefs.ts` (labels, `NoteRef`, lenient validation, route params) | 0 |
| 2 | `notesStore` keeps a ref through merge plus coercion (no version bump) | 1 |
| 3 | Linked-note selectors | 2 |
| 4 | Pure "take note" param builders | 1 |
| 5 | Shared linked-note UI | 3 |
| 6 | Note editor: accept, show and label refs | 4, 5 |
| 7 | Ayah deep-link math (param, segment and line lookup) | 0 |
| 8 | Start a lecture at an explicit episode and second | 0 |
| 9 | Jump within the active queue (optional) | 8 |
| 10 | Resolve a note reference to its source (no dismissal) | 1, 8 |
| 11 | Notes viewer: reference link, close then navigate | 5, 10 |
| 12 | Mushaf long-press an ayah to take a note | 4 |
| 13 | Mushaf `?ayah=` line scroll and highlight | 7, 12 |
| 14 | Mushaf linked notes or hint line | 5, 13 |
| 15 | MiniPlayer visible note button plus long-press | 4 |
| 16 | Library in-progress card linked note | 4 |
| 17 | Scholar detail linked notes footer | 5, 10 |
| 18 | Book detail notes section | 4, 5, 10 |
| 19 | Long-press rule invariant and docs | 12, 15, 17 |
| 20 | Full verification and visual QA | all |

---

## Deviations (recorded during implementation)

- **Task 0:** the rebase was done by the orchestrator as two merges (50ba871, 5513fb3). `fix/saved-lecture-bookmarks` and `feat/onboarding-audio-previews` had not landed, so there is no `save=` prop on `RibbonCard`, no `saveGestureProps`, and no onboarding preview clear in `playLecture`. The Task 17 and Task 19 "no save gesture" checks are source scans that hold trivially until the saved branch lands.
- **Task 6 (Task 5 placement):** `editorSeed` was added in Task 6 as planned. `NoteRefLink` and `LinkedNotesSection` also gained a `flush` prop (Task 18 commit) so book detail, which already pads its content, does not double-indent the list.
- **Task 8:** the `startLecturePlayback` test went into the existing `services/__tests__/lecturePlayback.test.ts`, not a new `__tests__/lecturePlayback.test.ts`. `startLecturePlayback` omits the second argument entirely when there is no start, because the existing assertion is `toHaveBeenCalledWith(LECTURE)`. Resume positions are also capped at duration - 1 (the plan caps only explicit starts). **Overlap with onboarding:** `audioEngine.ts` changes are confined to a new block of exports above `playLecture`, the `playLecture` signature, the start-index block and the `skip`/`seekTo` lines; the onboarding preview clear should go as the first statement of `playLecture` as the plan says.
- **Task 10 / 11:** `viewerSourceAction` (and its tests) landed in the Task 10 commit with the rest of `services/noteNavigation.ts`, not in the Task 11 commit.
- **Task 13:** the progress branch's reader keeps its segment layouts inside `MushafPageTrackingController`, with no `layoutsRef`/`bodyYRef` in `mushaf.tsx`. This task adds its own `layoutsRef`, `bodyYRef` and `linesRef` next to the existing `tracking.setSegmentLayout`/`setBodyY` calls and leaves the tracker untouched. The scroll also refines once: a first scroll made before `onTextLayout` arrives (fraction fallback) is redone when the line data arrives.
- **Task 14:** the end-of-surah block is a small `SurahNotesFooter` component at the bottom of `mushaf.tsx`, so the `useLinkedNotes` hook is local and the `surahNotesBlock(` call sits after `bodyYRef.current = ` in source order (the plan's invariant). A label tap calls `jumpToAyah`, which resets the remembered ayah so the same ayah can be re-targeted, then sets `?ayah=`.
- **Task 16:** if the in-progress session's `lectureId` is not episode-shaped, the Library card falls back to the old title-seeded note rather than opening an unlinked empty editor.
- **Task 20 visual QA:** skipped here (simulator work is the orchestrator's).
