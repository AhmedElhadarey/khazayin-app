# Audio Playback (react-native-track-player) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or
> subagent-driven-development) to implement this plan task-by-task. Each task is
> TDD: failing test → verify fail → minimal impl → verify pass → commit.

**Goal:** Make the MiniPlayer play real streamed audio (scholarly lecture series
from Internet Archive account `@user_42102`) via `react-native-track-player`,
with background playback, lock-screen controls, queue (episode) navigation, and
resume-after-restart — while preserving the existing `playerStore`/`progressStore`
contract.

**Architecture:** A single engine boundary (`services/audioEngine.ts`) is the only
module importing `react-native-track-player`. A pure `episodeResolver` turns
archive metadata JSON into a sorted episode queue. RNTP events drive the existing
`playerStore` setters (which already forward to SQLite). Each lecture carries an
`archiveId`; episodes resolve at play time and load as the RNTP queue so
lock-screen skip = next/prev episode. Web is a no-op guard.

**Tech Stack:** Expo SDK 54, RN 0.81, TypeScript 5.9, Zustand 5, jest/jest-expo,
`react-native-track-player`, Internet Archive metadata API.

**Reference:** `docs/plans/2026-07-23-audio-playback-design.md`

**Key data facts (verified against the live archive):**
- Item metadata: `GET https://archive.org/metadata/<archiveId>` →
  `{ server, dir, files: [{ name, title, track, length, format, source, size }] }`
- Playable URL: `https://archive.org/download/<archiveId>/<name>` (302-redirects;
  ExoPlayer/AVPlayer follow it).
- `length` is seconds as a string (e.g. `"460.07"`). `track` is `"001/114"`.
  `source` is `"original"` or `"derivative"` (dedupe: prefer original per track).
- Each item is a series (114–753 mp3s). Do NOT embed episode URLs in the store —
  resolve at play time.

---

## Phase 0 — Dependency & config (partly USER action)

### Task 0.1: Declare the dependency + native config

**Files:**
- Modify: `package.json` (add `"react-native-track-player": "^4.1.1"` to deps)
- Modify: `app.json` (config plugin + background modes)
- Create: `__mocks__/react-native-track-player.js` (jest mock so tests run without native)

**Step 1:** Add to `package.json` dependencies:
```json
"react-native-track-player": "^4.1.1"
```

**Step 2:** In `app.json`, under `expo.plugins`, ensure iOS background audio +
Android foreground service. Add (merge, don't clobber existing plugins):
```json
["react-native-track-player"]
```
and under `expo.ios.infoPlist`:
```json
"UIBackgroundModes": ["audio"]
```

**Step 3:** Create `__mocks__/react-native-track-player.js`:
```js
// Jest manual mock — native module can't run under jest.
const State = { None: 'none', Playing: 'playing', Paused: 'paused', Ready: 'ready', Buffering: 'buffering', Stopped: 'stopped', Ended: 'ended' };
const Event = { PlaybackState: 'playback-state', PlaybackProgressUpdated: 'playback-progress-updated', PlaybackActiveTrackChanged: 'playback-active-track-changed', PlaybackQueueEnded: 'playback-queue-ended', PlaybackError: 'playback-error', RemotePlay: 'remote-play', RemotePause: 'remote-pause', RemoteNext: 'remote-next', RemotePrevious: 'remote-previous', RemoteSeek: 'remote-seek' };
const Capability = { Play: 0, Pause: 1, SkipToNext: 2, SkipToPrevious: 3, SeekTo: 4, Stop: 5 };
const AppKilledPlaybackBehavior = { ContinuePlayback: 'continue-playback' };
module.exports = {
  __esModule: true,
  State, Event, Capability, AppKilledPlaybackBehavior,
  default: {
    setupPlayer: jest.fn().mockResolvedValue(undefined),
    updateOptions: jest.fn().mockResolvedValue(undefined),
    registerPlaybackService: jest.fn(),
    add: jest.fn().mockResolvedValue(undefined),
    setQueue: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    skip: jest.fn().mockResolvedValue(undefined),
    getProgress: jest.fn().mockResolvedValue({ position: 0, duration: 0, buffered: 0 }),
    getActiveTrackIndex: jest.fn().mockResolvedValue(0),
    getActiveTrack: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
  useProgress: jest.fn().mockReturnValue({ position: 0, duration: 0, buffered: 0 }),
  useActiveTrack: jest.fn().mockReturnValue(undefined),
  usePlaybackState: jest.fn().mockReturnValue({ state: State.None }),
};
```

**Step 4:** Verify jest still boots: `npm test -- --listTests` (Expected: lists
tests, no module-resolution error for the mock).

**Step 5:** Commit: `chore(deps): declare react-native-track-player + audio background config + jest mock`

**USER HANDOFF NOTE (do not run for the user):** after this task, the user must
run `npx expo install react-native-track-player` and rebuild the dev client / EAS
build. Document this in the final QA note; do not `npm install` silently.

---

## Phase 1 — Pure core: episode resolver

### Task 1.1: `episodeResolver` — archive metadata → episode queue

**Files:**
- Create: `services/archive/episodeResolver.ts`
- Create: `services/archive/__tests__/episodeResolver.test.ts`
- Create: `services/archive/__fixtures__/meta-002_20210904.json` (trimmed real
  fixture: keep item `server`/`dir` + ~4 file entries incl. one `derivative`
  duplicate of track 001 to prove dedupe, plus a non-mp3 entry to prove filtering)

**Types (put in the resolver file):**
```ts
export interface ArchiveEpisode {
  id: string;         // `${archiveId}/${name}` — stable per-episode id
  archiveId: string;
  name: string;       // "001.mp3"
  title: string;      // episode title (falls back to name)
  trackNumber: number;// parsed from "001/114" → 1
  url: string;        // https://archive.org/download/<archiveId>/<name>
  durationSec: number;// parsed from length string; 0 if absent
}
```

**Step 1 — failing test** (`episodeResolver.test.ts`):
```ts
import { resolveEpisodes, buildDownloadUrl } from '../episodeResolver';
import meta from '../__fixtures__/meta-002_20210904.json';

describe('buildDownloadUrl', () => {
  it('builds a canonical archive.org download url', () => {
    expect(buildDownloadUrl('002_20210904', '001.mp3'))
      .toBe('https://archive.org/download/002_20210904/001.mp3');
  });
});

describe('resolveEpisodes', () => {
  const eps = resolveEpisodes('002_20210904', meta as any);

  it('keeps only mp3 files', () => {
    expect(eps.every((e) => e.name.endsWith('.mp3'))).toBe(true);
  });
  it('dedupes derivative duplicates, one entry per track number', () => {
    const t1 = eps.filter((e) => e.trackNumber === 1);
    expect(t1).toHaveLength(1);
  });
  it('sorts ascending by track number', () => {
    const nums = eps.map((e) => e.trackNumber);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });
  it('parses duration seconds and builds urls', () => {
    expect(eps[0].durationSec).toBeCloseTo(460.07, 1);
    expect(eps[0].url).toBe('https://archive.org/download/002_20210904/001.mp3');
    expect(eps[0].id).toBe('002_20210904/001.mp3');
  });
  it('falls back to name when title missing', () => {
    const noTitle = resolveEpisodes('x', { files: [{ name: '007.mp3', format: 'VBR MP3', source: 'original' }] } as any);
    expect(noTitle[0].title).toBe('007.mp3');
  });
});
```

**Step 2:** Run `npm test -- episodeResolver` → Expected FAIL (module not found).

**Step 3 — implement** `services/archive/episodeResolver.ts`:
```ts
import type { PlayerTrack } from '@/store/playerStore';

export interface ArchiveEpisode {
  id: string; archiveId: string; name: string; title: string;
  trackNumber: number; url: string; durationSec: number;
}

interface ArchiveFile {
  name?: string; title?: string; track?: string; length?: string;
  format?: string; source?: string;
}
interface ArchiveMetadata { files?: ArchiveFile[]; }

export function buildDownloadUrl(archiveId: string, name: string): string {
  return `https://archive.org/download/${archiveId}/${encodeURI(name)}`
    .replace(/%2F/gi, '/');
}

function parseTrack(track?: string, fallbackIndex = 0): number {
  if (track) {
    const n = parseInt(track.split('/')[0], 10);
    if (Number.isFinite(n)) return n;
  }
  return fallbackIndex + 1;
}

export function resolveEpisodes(archiveId: string, meta: ArchiveMetadata): ArchiveEpisode[] {
  const files = (meta.files ?? []).filter(
    (f) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.mp3'),
  );
  // Dedupe by track number, preferring source === 'original'.
  const byTrack = new Map<number, ArchiveFile>();
  files.forEach((f, i) => {
    const t = parseTrack(f.track, i);
    const existing = byTrack.get(t);
    if (!existing || (existing.source !== 'original' && f.source === 'original')) {
      byTrack.set(t, f);
    }
  });
  return [...byTrack.entries()]
    .sort(([a], [b]) => a - b)
    .map(([trackNumber, f]) => {
      const name = f.name as string;
      const len = f.length ? parseFloat(f.length) : 0;
      return {
        id: `${archiveId}/${name}`,
        archiveId,
        name,
        title: f.title && f.title.trim() ? f.title : name,
        trackNumber,
        url: buildDownloadUrl(archiveId, name),
        durationSec: Number.isFinite(len) ? len : 0,
      };
    });
}

/** Map a resolved episode to the PlayerTrack shape the MiniPlayer renders. */
export function episodeToPlayerTrack(ep: ArchiveEpisode, reciterOrScholar: string): PlayerTrack {
  return { id: ep.id, title: ep.title, reciter: reciterOrScholar, durationSec: ep.durationSec };
}
```

**Step 4:** Run `npm test -- episodeResolver` → Expected PASS.

**Step 5:** `npx tsc --noEmit --pretty false` → Expected: no new errors.

**Step 6:** Commit: `feat(archive): pure episode resolver (metadata → sorted queue)`

### Task 1.2: Metadata fetcher with cache

**Files:**
- Create: `services/archive/archiveClient.ts` (thin `fetchItemMetadata(archiveId)`
  using global `fetch`, 10s timeout, throws typed `ArchiveError` on non-200)
- Create: `services/archive/__tests__/archiveClient.test.ts` (mock global fetch;
  assert URL `https://archive.org/metadata/<id>`, JSON parse, error on 404,
  timeout rejects). Reuse the existing SWR cache tier if straightforward
  (`services/cache/*`); otherwise a simple in-memory `Map` memo is acceptable —
  keep it DRY with whatever `services/cache` already exposes. Check that dir first.

**TDD:** failing test (URL + error) → implement → pass → tsc → commit
`feat(archive): item-metadata fetcher with cache`.

---

## Phase 2 — Real lecture catalogue

### Task 2.1: Add `archiveId` to `Lecture` + rebuild scholar catalogue from archive

**Files:**
- Modify: `types/content.ts` (add `archiveId?: string` to `Lecture`)
- Modify: `data/content/scholars.ts` (rebuild `SCHOLARS` + `LECTURES_BY_SCHOLAR`
  from the real archive account, each lecture carrying a real `archiveId`)
- Modify: `data/content/lectures.ts` (attach `archiveId` where a sensible archive
  match exists; leave others without — audio-less is allowed)
- Create: `data/content/__tests__/catalogue-integrity.test.ts`
- Reference data: the 100 identifiers/titles are captured in the design session;
  regenerate the mapping by parsing scholar name out of each archive title and
  matching to `SCHOLARS` names (normalize: strip الشيخ/العلامة/فضيلة/سماحة/معالي/
  الدكتور/بن honourifics, compare on core name tokens).

**Step 1 — failing integrity test:**
```ts
import { SCHOLARS, LECTURES_BY_SCHOLAR } from '@/data/content/scholars';

const ARCHIVE_ID = /^[\w.\-]+$/;
describe('lecture catalogue', () => {
  it('every scholar has a lecture list', () => {
    SCHOLARS.forEach((s) => expect(LECTURES_BY_SCHOLAR[s.id]).toBeDefined());
  });
  it('every lecture with an archiveId is well-formed and scholar-scoped', () => {
    Object.values(LECTURES_BY_SCHOLAR).flat().forEach((l) => {
      if (l.archiveId) {
        expect(l.archiveId).toMatch(ARCHIVE_ID);
        expect(l.category).toBe('scholar');
      }
    });
  });
  it('at least the mapped contemporary scholars have real archive audio', () => {
    // ibn Baz(s4), Uthaymeen(s5), Fawzan(s6), Albani(s8), AbdurRazzaq(s9)
    ['s4','s5','s6','s8','s9'].forEach((id) => {
      expect(LECTURES_BY_SCHOLAR[id].some((l) => !!l.archiveId)).toBe(true);
    });
  });
});
```

**Step 2:** Run → FAIL (no `archiveId` yet).

**Step 3 — implement:** Add `archiveId?: string` to `Lecture`. Rebuild
`scholars.ts` mapping real archive series to scholars. Example rows (use the real
identifiers gathered in the design session — abbreviated here):
```ts
// s5 = محمد بن صالح العثيمين
const S5_LECTURES: Lecture[] = [
  { id: 'sl5-1', title: 'تفسير القرآن الكريم', scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '485_20210705' },
  { id: 'sl5-2', title: 'شرح رياض الصالحين',   scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '011_20210710' },
  // ...
];
// s9 = عبد الرزاق البدر
// { archiveId: '012_20230905' } محاضرات عبد الرزاق البدر  ... etc
```
Keep `duration` as-is if known, else empty string (the UI tolerates it; real
per-episode duration comes from the resolver at play time).

**Step 4:** Run integrity test → PASS. Run full suite `npm test` → no regressions.

**Step 5:** `npx tsc --noEmit --pretty false` → no new errors.

**Step 6:** Commit: `feat(content): real archive-backed lecture catalogue with archiveId`

---

## Phase 3 — Engine boundary + store sync

### Task 3.1: Engine module skeleton + web no-op guard

**Files:**
- Create: `services/audioEngine.ts` (imports RNTP; the ONLY such module)
- Create: `services/audioEngine/playbackService.ts`
- Create: `services/audioEngine/__tests__/audioEngine.test.ts`

**Behavior to TDD (against the jest mock):**
- `setupPlayer()` calls `TrackPlayer.setupPlayer` + `updateOptions` with
  capabilities `[Play, Pause, SkipToNext, SkipToPrevious, SeekTo, Stop]` and
  `android.appKilledPlaybackBehavior = ContinuePlayback`. Idempotent (guarded so a
  second call doesn't re-setup).
- On `Platform.OS === 'web'`, every export is a no-op that resolves (guard so web
  bundle never calls native). Test by mocking `Platform.OS`.

**TDD:** test setup-options + idempotency + web no-op → implement → pass → commit
`feat(audio): engine boundary skeleton with web no-op guard`.

### Task 3.2: `playLecture` — resolve → queue → play from saved position

**Files:**
- Modify: `services/audioEngine.ts`
- Modify: `services/audioEngine/__tests__/audioEngine.test.ts`

**Behavior:**
`playLecture(lecture)`:
1. If `!lecture.archiveId` → throw `NoAudioError` (caller shows Arabic alert).
2. `fetchItemMetadata(archiveId)` → `resolveEpisodes` → map to RNTP track objects
   `{ id, url, title, artist: lecture.scholar, duration }`.
3. `TrackPlayer.reset()` → `setQueue(tracks)`.
4. Look up saved position from `progressStore` for the first/last-played episode
   id; `skip(index)` + `seekTo(savedSec)` if any.
5. `TrackPlayer.play()`. Mirror onto `playerStore.setTrack(firstOrResumed)` +
   `setVisible(true)`.

**TDD:** mock `archiveClient` + `progressStore`; assert setQueue payload, resume
seek, playerStore.setTrack called. Assert `NoAudioError` path. → implement → pass
→ commit `feat(audio): playLecture resolves series into RNTP queue with resume`.

### Task 3.3: Event → store sync + engine-backed transport in playerStore

**Files:**
- Modify: `store/playerStore.ts` (engine-backed `togglePlay`; add `seekTo`,
  `skipNext`, `skipPrev`; keep the existing progress-forwarding intact)
- Create: `services/audioEngine/syncBridge.ts` (registers RNTP event listeners
  that call playerStore setters)
- Modify tests: `store/__tests__/playerStore.test.ts`,
  `services/audioEngine/__tests__/syncBridge.test.ts`

**Critical constraint (from CLAUDE.md + design):** the existing `setProgress` /
`setTrack(null)` forwarding to `progressStore.noteLectureTick` MUST be preserved
byte-for-byte in behavior. `togglePlay` must call the engine and let the resulting
state event set `isPlaying`, OR optimistically set it then reconcile — but
`isPlaying` must reflect engine truth (criterion #5). Inject the engine as a
dependency (module import is fine) so the store test can mock it.

**Behavior to TDD:**
- `togglePlay` when playing → calls engine `pause()`; the paused-position
  `noteLectureTick` flush still fires (existing behavior).
- `PlaybackProgressUpdated` event (position, duration) → `setProgress(position/
  duration)` (guard duration>0).
- `PlaybackActiveTrackChanged` → `setTrack(newEpisodeTrack)`.
- `PlaybackQueueEnded` → `setTrack(null)` (triggers the completed=1 flush).
- `seekTo(fraction)` → engine `seekTo(fraction*duration)`.

→ implement → run `npm test -- playerStore syncBridge` PASS → tsc → commit
`feat(audio): RNTP event↔playerStore sync + engine-backed transport`.

---

## Phase 4 — UI wiring

### Task 4.1: MiniPlayer transport → engine

**Files:**
- Modify: `components/khazain/primitives/MiniPlayer.tsx` (wire skip glyphs to
  `skipPrev/skipNext`; play button already calls `togglePlay` which is now
  engine-backed — verify no extra change needed)
- Modify/Create: `components/khazain/primitives/__tests__/MiniPlayer.test.tsx`
  (render, press skip-fwd → skipNext called; press play → togglePlay called)

**Note:** SkipGlyph is currently non-interactive; wrap each in a `Pressable` with
`accessibilityLabel` (`التالي` / `السابق`) and RTL-correct mapping (fwd glyph =
next episode). Keep the atomic-selector render optimization (do not subscribe the
whole store).

**TDD:** interaction test → wire → pass → commit
`feat(player): wire MiniPlayer transport to the audio engine`.

### Task 4.2: Lecture tap → playLecture across lecture screens

**Files (find exact call sites first with grep `setTrack`/lecture card onPress):**
- Modify the scholar detail + lecture list screens (e.g. `app/(tabs)/.../scholar/[id].tsx`
  and any prophet/books/queen/radio list) to call `audioEngine.playLecture(lecture)`
  inside a try/catch → on `NoAudioError` show Arabic `Alert`
  ('لا يتوفر تسجيل صوتي لهذه المادة'); on network error show `ToastOverlay`.
- Where a card has no `archiveId`, render play affordance disabled/greyed.

**TDD:** this is integration/UI; add a light test that the onPress handler calls
`playLecture` with the row's lecture and swallows `NoAudioError`. → wire → pass →
commit `feat(player): tap a lecture to stream it via the engine`.

---

## Phase 5 — Lifecycle & resume

### Task 5.1: App-start setup + restore last lecture (paused)

**Files:**
- Modify: `app/_layout.tsx` (after fonts + SQLite hydrate: `audioEngine.setupPlayer()`,
  register `syncBridge`, register the playback service; then read last lecture +
  position from `progressStore` and `playerStore.setTrack(restoredTrack)` with
  `isPlaying=false`)
- Modify: `progressStore`/`wirdRepo` re-exports only if a "last lecture" getter is
  missing — prefer reading existing in-progress lecture (`inProgressLecture`).
- Create/modify test: assert setup called once; restored track is paused.

**Constraint:** must not block first paint; run setup after the existing hydrate
gate, guard web. Do NOT auto-play on launch (criterion #6 = resume on demand).

**TDD** → wire → pass → tsc → commit
`feat(audio): initialise engine on launch and restore last lecture paused`.

### Task 5.2: `registerPlaybackService` entry

**Files:**
- Modify: `index.js` / app entry (expo-router uses `expo-router/entry`; register
  the RNTP playback service at module top-level per RNTP docs — create a small
  `service.js` and `TrackPlayer.registerPlaybackService(() => require('./service'))`
  in the app entry or `app/_layout.tsx` module scope, guarded for web).

Verify against RNTP v4 docs that registration happens at JS module load, not in a
component. → commit `chore(audio): register RNTP playback service at entry`.

---

## Phase 6 — Verification & handoff

### Task 6.1: Full typecheck, suite, and device QA checklist

**Steps:**
1. `npx tsc --noEmit --pretty false` → zero new errors.
2. `npm test` → all green (RNTP mocked).
3. `npm run lint 2>&1 | grep -E "services/audioEngine|services/archive|store/playerStore|MiniPlayer"` → clean for new files.
4. Create `docs/plans/2026-07-23-audio-playback-QA.md`: device checklist for the 7
   acceptance criteria (must be run by the user on a dev-client build) + the exact
   build commands:
   ```
   npx expo install react-native-track-player
   npx expo prebuild --clean       # or configure EAS
   npx expo run:android            # / run:ios  (dev client, NOT Expo Go)
   ```
5. Commit: `docs(audio): QA checklist + build/run instructions`.

---

## Notes for the executor
- **Never** import `react-native-track-player` outside `services/audioEngine*`.
- Preserve `playerStore`'s progress-forwarding to `progressStore` exactly.
- RTL: any new Text uses `writingDirection:'rtl'` + `textAlign:'right'`; Arabic
  copy only.
- Do NOT `npm install` or `git commit` the dependency install for the user; the
  jest mock lets the suite pass without the native module.
- Do NOT touch the reciter/mushaf/Quran side.
- Commit after every task (conventional commits, no `Co-Authored-By`).
