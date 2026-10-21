# Onboarding Flow Gaps — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: execute task-by-task per CLAUDE.md §"Development Workflow" step 4 (fresh implementer → spec review → quality review per task).

**Goal:** Close the audit gaps on the "First-Time Onboarding Flow" ticket (https://trello.com/c/QTQYqLBB): bring the flow to 4 screens with a safe resume migration, and add per-row reciter audio previews through the existing audio engine without disturbing the MiniPlayer or progress data.

**Architecture:** An ordered `ONBOARDING_STEPS` id list replaces the magic count. A legacy step mapping in `coerceSettings` handles the shrink. Previews are a new engine capability in `services/audioEngine.ts` (still the only RNTP-importing module, plus its in-boundary `syncBridge`). UI state lives in a tiny `previewStore`. A UI facade `services/reciterPreview.ts` adds Arabic toasts. The selectable row gains a sibling preview button in a contract-defined physical slot order.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, Zustand 5, react-native-track-player 4.1.2 (already installed), jest-expo (no @testing-library — tests are pure-logic, service-with-mock, or source-contract regex, matching `__tests__/rtlPhysicalContract.test.ts`).

**Design:** `docs/plans/2026-10-21-onboarding-flow-gaps-design.md` (read §4 before Task 1).

**Base facts the implementer must not rediscover:**
- RNTP is mocked in jest via `jest.config.js` → `__mocks__/react-native-track-player.ts`.
- Engine tests mock `@/store/playerStore`, `@/store/progressStore`, `../../archive/archiveClient`, `@/store/toastStore`, `@sentry/react-native` (see `services/audioEngine/__tests__/audioEngine.test.ts:1-24`). Copy that header into new engine/bridge test files.
- No reciter in `data/content/quran.ts` has `archiveId`. Do NOT add one there (design §4.3 "Preview source resolution").
- The Expo Go guard (`services/audioEngine/rntp.ts`, `isInert()`) is NOT on this branch — Task 12 is conditional.
- No new dependencies. Never `--no-verify`. No `Co-Authored-By` or any AI attribution in commits.

---

### Task 1: Ordered onboarding step ids (4 steps)

**Files:**
- Modify: `constants/settings.ts:54-60`
- Test: `__tests__/onboardingSteps.test.ts` (create)

**Step 1: Write the failing test**

```ts
// __tests__/onboardingSteps.test.ts
import {
  LEGACY_ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEPS,
} from '@/constants/settings';

describe('onboarding step list (ticket QTQYqLBB: 3-4 screens)', () => {
  it('is exactly welcome → qiraa → reciter → channels', () => {
    expect(ONBOARDING_STEPS).toEqual(['welcome', 'qiraa', 'reciter', 'channels']);
  });
  it('derives the count from the list (no lockstep constant)', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(ONBOARDING_STEPS.length);
    expect(ONBOARDING_STEP_COUNT).toBeGreaterThanOrEqual(3);
    expect(ONBOARDING_STEP_COUNT).toBeLessThanOrEqual(4);
  });
  it('remembers the 8-step layout older installs persisted against', () => {
    expect(LEGACY_ONBOARDING_STEP_COUNT).toBe(8);
  });
  it('is frozen', () => {
    expect(Object.isFrozen(ONBOARDING_STEPS)).toBe(true);
  });
});
```

**Step 2: Run, expect FAIL**: `npx jest __tests__/onboardingSteps.test.ts` → FAIL (`ONBOARDING_STEPS` is undefined).

**Step 3: Implement** (replace `constants/settings.ts:54-60`)

```ts
/**
 * First-run onboarding steps, in flow order (ticket QTQYqLBB: 3-4 screens).
 * `app/onboarding.tsx` renders by id, so adding an id without a case fails tsc.
 * The four feature-showcase screens (d74bfc1) were folded into Welcome.
 */
export const ONBOARDING_STEPS = Object.freeze(['welcome', 'qiraa', 'reciter', 'channels'] as const);
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];
export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

/**
 * Step count of the 8-step layout (welcome, qiraa, reciter, 4 features, channels)
 * that installs before 2026-10 persisted `onboardingStep` against. Used only by
 * `coerceSettings` to map an in-flight resume onto the shorter flow.
 */
export const LEGACY_ONBOARDING_STEP_COUNT = 8;
```

**Step 4: Run, expect PASS**: `npx jest __tests__/onboardingSteps.test.ts __tests__/settingsStore.test.ts` (T-SS-13 still passes — it is written against the constant). Then `npx tsc --noEmit --pretty false`. Expect tsc errors only in `app/onboarding.tsx` if any. There should be none, because it still indexes by number. Task 3 rewrites it.

**Step 5: Commit**: `git add constants/settings.ts __tests__/onboardingSteps.test.ts && git commit -m "feat(onboarding): define the flow as four ordered step ids"`

---

### Task 2: Migrate a persisted mid-onboarding step onto the 4-step flow

**Files:**
- Modify: `store/settingsStore.ts:9-15` (import), `:266-274` (onboardingStep coercion)
- Test: `__tests__/settingsStore.test.ts` (append a `describe`)

**Step 1: Write the failing tests** (reuse the file's existing `seedStorage` / `rehydrateStore` helpers and the v3 record shape used at `:60-75`)

```ts
describe('onboardingStep resume across the 8 → 4 step change', () => {
  const v3 = (onboardingStep: unknown) => ({
    schemaVersion: 3, defaultQiraaId: 'hafs-asim', preferredReciterId: 'r3', fontSizeLevel: 3,
    notifications: {}, onboardingComplete: false, onboardingStep,
  });
  it.each([
    [0, 0], [1, 1], [2, 2],      // welcome/qiraa/reciter mean the same in both layouts
    [3, 3], [4, 3], [5, 3], [6, 3], // old feature screens → channels (next unseen)
    [7, 3],                      // old channels → channels
  ])('T-SS-OB-1: stored step %i resumes at %i', async (stored, expected) => {
    await seedStorage({ state: v3(stored), version: 0 });
    await rehydrateStore();
    const s = useSettingsStore.getState();
    expect(s.onboardingStep).toBe(expected);
    expect(s.onboardingComplete).toBe(false);
    expect(s.preferredReciterId).toBe('r3'); // nothing else disturbed
  });
  it.each([8, 99, -1, 2.5, '3', null])('T-SS-OB-2: %p was never a step → resets to 0', async (stored) => {
    await seedStorage({ state: v3(stored), version: 0 });
    await rehydrateStore();
    expect(useSettingsStore.getState().onboardingStep).toBe(0);
  });
  it('T-SS-OB-3: a migrated step is always renderable', async () => {
    for (let i = 0; i < 8; i++) {
      await seedStorage({ state: v3(i), version: 0 });
      await rehydrateStore();
      const step = useSettingsStore.getState().onboardingStep;
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(ONBOARDING_STEP_COUNT);
    }
  });
});
```

**Step 2: Run, expect FAIL**: `npx jest __tests__/settingsStore.test.ts -t "T-SS-OB"` → T-SS-OB-1 fails for stored 4..7 (they reset to 0 today).

**Step 3: Implement** (replace the `onboardingStep` block at `store/settingsStore.ts:266-274`; import `LEGACY_ONBOARDING_STEP_COUNT`)

```ts
  // A stored step must be an integer from a layout we have shipped. In-range
  // values are kept. Values in [COUNT, LEGACY_COUNT) were written by the 8-step
  // flow (features + channels, all past the setup screens) and resume at the
  // last step (channels) — never at Welcome. Anything else is corrupt → 0.
  // Clamping arbitrary input is reserved for the setter.
  const rawStep = input.onboardingStep;
  const onboardingStep: number =
    typeof rawStep === 'number' && Number.isInteger(rawStep) && rawStep >= 0
      ? rawStep < ONBOARDING_STEP_COUNT
        ? rawStep
        : rawStep < LEGACY_ONBOARDING_STEP_COUNT
          ? ((coerced = isCurrent || coerced), ONBOARDING_STEP_COUNT - 1)
          : ((coerced = isCurrent || coerced), DEFAULT_SETTINGS.onboardingStep)
      : ((coerced = isCurrent || coerced), DEFAULT_SETTINGS.onboardingStep);
```

**Step 4: Run, expect PASS**: `npx jest __tests__/settingsStore.test.ts` (all, including T-SS-10/11 which still expect 99 → 0). Then `npx tsc --noEmit --pretty false`.

**Step 5: Commit**: `git commit -am "fix(settings): resume a mid-onboarding step on the shorter flow instead of restarting"` (stage only the two files).

---

### Task 3: Four-screen flow: highlights on Welcome, FeatureStep removed, render by id

**Files:**
- Modify: `components/khazain/onboarding/WelcomeStep.tsx` (add `WELCOME_HIGHLIGHTS` + list under the mission, `:38-43`)
- Modify: `app/onboarding.tsx:12-21` (imports), `:170-196` (`renderStep`), and the comment at `:85` ("280ms on eight steps" → "four steps")
- Modify: `components/khazain/onboarding/index.ts:14` (drop the FeatureStep export; add `WELCOME_HIGHLIGHTS` export)
- Delete: `components/khazain/onboarding/FeatureStep.tsx` (design Q3 default; revert this one line if the user vetoes)
- Modify: `__tests__/rtlPhysicalContract.test.ts:57-63` (add `'components/khazain/onboarding/WelcomeStep.tsx'`)
- Test: `__tests__/onboardingSteps.test.ts` (append)

**Step 1: Write the failing tests** (append; use the same `code()` comment-stripping helper as `rtlPhysicalContract.test.ts:66-71`, copied locally)

```ts
import fs from 'fs';
import path from 'path';
const ROOT = path.resolve(__dirname, '..');
const code = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('four-screen flow', () => {
  it('renders by step id, with a case for every id and no index fallback', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/ONBOARDING_STEPS\[step\]/);
    for (const id of ['welcome', 'qiraa', 'reciter', 'channels']) {
      expect(src).toMatch(new RegExp(`case '${id}':`));
    }
    expect(src).not.toMatch(/FEATURE_STEPS|FeatureStep/);
  });
  it('keeps the JS-driven, reduce-motion-aware 280ms transition', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/SLIDE_DURATION = 280/);
    expect(src).toMatch(/isReduceMotionEnabled/);
  });
  it('the feature screens are gone from the barrel', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/khazain/onboarding/FeatureStep.tsx'))).toBe(false);
    expect(code('components/khazain/onboarding/index.ts')).not.toMatch(/FeatureStep/);
  });
  it('Welcome carries the four highlights as RTL physical rows', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WELCOME_HIGHLIGHTS } = require('@/components/khazain/onboarding/WelcomeStep');
    expect(WELCOME_HIGHLIGHTS).toHaveLength(4);
    const src = code('components/khazain/onboarding/WelcomeStep.tsx');
    expect(src).toMatch(/\.\.\.PHYSICAL_ROW/);
    expect(src).toMatch(/\.\.\.RTL_TEXT/);
    expect(src).toMatch(/FoundationMark/); // G3 accepted deviation stays
  });
});
```

Note: if `require` of the TSX component fails under jest-expo (it pulls in `expo-linear-gradient` and svg), replace that assertion with `expect(src.match(/key: '/g)).toHaveLength(4)` on the source.

**Step 2: Run, expect FAIL**: `npx jest __tests__/onboardingSteps.test.ts` → the "four-screen flow" tests fail.

**Step 3: Implement**

`WelcomeStep.tsx`: add the constant and the list. The copy is taken from the old `FEATURE_STEPS` titles.

```tsx
import { PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';

/** The four "how the app works" highlights, folded in from the old feature screens. */
export const WELCOME_HIGHLIGHTS: readonly { key: string; text: string }[] = Object.freeze([
  { key: 'quran', text: 'القرآن الكريم بالقراءات والروايات وبصوت قارئك المفضّل' },
  { key: 'wird', text: 'وِردك اليومي مع التذكير ومتابعة إنجازك' },
  { key: 'library', text: 'مكتبتك الشخصية وملاحظاتك على ما تقرأ' },
  { key: 'scholars', text: 'العلماء والكتب وتصاميم الدعوة الجاهزة للمشاركة' },
]);

// …inside the ScrollView, between <Text style={styles.mission}> and the hint:
<View style={styles.highlights} accessibilityRole="list">
  {WELCOME_HIGHLIGHTS.map((h) => (
    <View key={h.key} style={styles.highlightRow}>
      {/* Physical left → right: text, bullet — the bullet leads at the right edge. */}
      <Text style={styles.highlightText}>{h.text}</Text>
      <View style={styles.bullet} />
    </View>
  ))}
</View>

// styles:
highlights: { alignSelf: 'stretch', gap: 10 },
highlightRow: { ...PHYSICAL_ROW, alignItems: 'center', gap: 10 },
highlightText: {
  ...RTL_TEXT, flex: 1, fontFamily: 'TheSansArabic', fontSize: 15, lineHeight: 24,
  color: KhazainColors.ink700,
},
bullet: {
  width: 7, height: 7, backgroundColor: KhazainColors.goldAccent, transform: [{ rotate: '45deg' }],
},
```

`app/onboarding.tsx`: drop `FEATURE_STEPS` and `FeatureStep` from the imports, import `ONBOARDING_STEPS`, and replace `renderStep`:

```tsx
/** Step content: welcome → qira'a → reciter → channels (ONBOARDING_STEPS). */
function renderStep(step: number): React.ReactElement {
  const id = ONBOARDING_STEPS[step] ?? ONBOARDING_STEPS[0];
  switch (id) {
    case 'welcome':
      return <WelcomeStep />;
    case 'qiraa':
      return <QiraaStep />;
    case 'reciter':
      return <ReciterStep />;
    case 'channels':
      return <ChannelsStep />;
  }
}
```

(The `switch` is exhaustive over `OnboardingStepId`, so tsc flags a missing case. Keep the function's return type annotation.)

Delete `FeatureStep.tsx`. Update the barrel. Add WelcomeStep to `PINNED_SCREENS`.

**Step 4: Run, expect PASS**: `npx jest __tests__/onboardingSteps.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/fontScaleChrome.test.ts`, then `npx tsc --noEmit --pretty false`. Then `grep -rn "FeatureStep\|FEATURE_STEPS" app components services __tests__ constants`, which should return nothing.

**Step 5: Commit**: `git commit -m "feat(onboarding): four screens, with the feature highlights folded into Welcome"` (stage the files listed above, including the deletion).

---

### Task 4: Curated "popular reciters" selection

**Files:**
- Modify: `constants/settings.ts` (append `ONBOARDING_POPULAR_RECITER_IDS`)
- Create: `services/onboardingReciters.ts`
- Test: `services/__tests__/onboardingReciters.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { ONBOARDING_POPULAR_RECITER_IDS, DEFAULT_SETTINGS } from '@/constants/settings';
import { RECITERS } from '@/data/content/quran';
import { selectOnboardingReciters } from '@/services/onboardingReciters';
import type { Reciter } from '@/types/content';

const r = (id: string): Reciter => ({ id, name: id, style: 'murattal', styleLabel: 'x' });

describe('selectOnboardingReciters', () => {
  it('returns the curated ids in curated order', () => {
    const out = selectOnboardingReciters([r('a'), r('b'), r('c')], ['c', 'a'], 'c');
    expect(out.map((x) => x.id)).toEqual(['c', 'a']);
  });
  it('skips curated ids the data source lacks', () => {
    expect(selectOnboardingReciters([r('a')], ['z', 'a'], 'a').map((x) => x.id)).toEqual(['a']);
  });
  it('appends the current selection when it is not curated', () => {
    expect(selectOnboardingReciters([r('a'), r('b')], ['a'], 'b').map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('falls back to the first 6 when no curated id exists', () => {
    const all = ['1', '2', '3', '4', '5', '6', '7'].map(r);
    expect(selectOnboardingReciters(all, ['x'], 'none').map((x) => x.id)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
  it('returns [] for no data (AsyncContent shows its empty state)', () => {
    expect(selectOnboardingReciters([], ['a'], 'a')).toEqual([]);
  });
  it('the shipped curated list resolves fully against the mock catalogue and includes the default', () => {
    const ids = RECITERS.map((x) => x.id);
    for (const id of ONBOARDING_POPULAR_RECITER_IDS) expect(ids).toContain(id);
    expect(ONBOARDING_POPULAR_RECITER_IDS).toContain(DEFAULT_SETTINGS.preferredReciterId);
    expect(ONBOARDING_POPULAR_RECITER_IDS.length).toBeLessThanOrEqual(6);
  });
});
```

**Step 2: Run, expect FAIL**: `npx jest services/__tests__/onboardingReciters.test.ts` (module not found).

**Step 3: Implement**

```ts
// constants/settings.ts
/** Reciters shown on the onboarding reciter step, in display order (design §4.3, Q4). */
export const ONBOARDING_POPULAR_RECITER_IDS: readonly string[] = Object.freeze([
  'r1', 'r2', 'r3', 'r12', 'r4', 'r7',
]);
```

```ts
// services/onboardingReciters.ts
/**
 * The onboarding reciter step lists "popular reciters" (ticket QTQYqLBB), not
 * the whole catalogue — Settings → القارئ keeps the full list. Pure.
 */
import type { Reciter } from '@/types/content';

const FALLBACK_COUNT = 6;

export function selectOnboardingReciters(
  all: readonly Reciter[],
  popularIds: readonly string[],
  selectedId: string,
): Reciter[] {
  const byId = new Map(all.map((r) => [r.id, r]));
  const picked = popularIds.map((id) => byId.get(id)).filter((r): r is Reciter => !!r);
  const base = picked.length > 0 ? picked : all.slice(0, FALLBACK_COUNT);
  const selected = byId.get(selectedId);
  return selected && !base.includes(selected) ? [...base, selected] : base;
}
```

**Step 4: Run, expect PASS**, then tsc.

**Step 5: Commit**: `git commit -m "feat(onboarding): curate the popular reciters shown during onboarding"`

---

### Task 5: `pickPreviewEpisode`: choose Al-Fatiha from a reciter series

**Files:**
- Modify: `services/archive/episodeResolver.ts` (append an export)
- Test: `services/archive/__tests__/episodeResolver.test.ts` (append)

**Step 1: Write the failing test**

```ts
import { pickPreviewEpisode, type ArchiveEpisode } from '../episodeResolver';
const ep = (name: string, trackNumber: number): ArchiveEpisode => ({
  id: `x/${name}`, archiveId: 'x', name, title: name, trackNumber, url: `u/${name}`, durationSec: 60,
});
describe('pickPreviewEpisode', () => {
  it('prefers track 1', () => {
    expect(pickPreviewEpisode([ep('002.mp3', 2), ep('001.mp3', 1)])?.name).toBe('001.mp3');
  });
  it('falls back to a 001-prefixed file name when track numbers are synthetic', () => {
    expect(pickPreviewEpisode([ep('114.mp3', 5), ep('001.mp3', 9)])?.name).toBe('001.mp3');
  });
  it('does not mistake 010/100 for 1', () => {
    expect(pickPreviewEpisode([ep('010.mp3', 3), ep('1-fatiha.mp3', 4)])?.name).toBe('1-fatiha.mp3');
  });
  it('falls back to the first episode', () => {
    expect(pickPreviewEpisode([ep('a.mp3', 7)])?.name).toBe('a.mp3');
  });
  it('returns undefined for an empty series', () => {
    expect(pickPreviewEpisode([])).toBeUndefined();
  });
});
```

**Step 2: Run, expect FAIL**: `npx jest services/archive/__tests__/episodeResolver.test.ts -t pickPreviewEpisode`

**Step 3: Implement**

```ts
/** Al-Fatiha for a reciter preview: track 1, else a "001"/"1"-prefixed file, else the first. */
export function pickPreviewEpisode(episodes: readonly ArchiveEpisode[]): ArchiveEpisode | undefined {
  return (
    episodes.find((e) => e.trackNumber === 1) ??
    episodes.find((e) => /^0*1(?!\d)/.test(e.name)) ??
    episodes[0]
  );
}
```

**Step 4: PASS**, then tsc. **Step 5: Commit**: `git commit -m "feat(archive): pick the Al-Fatiha episode for a reciter preview"`

---

### Task 6: `previewStore`: preview UI state

**Files:**
- Create: `store/previewStore.ts`; Modify: `store/index.ts` (re-export)
- Test: `store/__tests__/previewStore.test.ts` (create)

**Step 1: Failing test**

```ts
import { usePreviewStore } from '@/store/previewStore';
beforeEach(() => usePreviewStore.getState().clear());
it('starts idle', () => {
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});
it('begin → loading for one reciter; markPlaying only for that reciter', () => {
  usePreviewStore.getState().begin('r1');
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'r1', status: 'loading' });
  usePreviewStore.getState().markPlaying('r2'); // stale
  expect(usePreviewStore.getState().status).toBe('loading');
  usePreviewStore.getState().markPlaying('r1');
  expect(usePreviewStore.getState().status).toBe('playing');
});
it('clear returns to idle', () => {
  usePreviewStore.getState().begin('r1');
  usePreviewStore.getState().clear();
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});
```

**Step 2: FAIL** → **Step 3: Implement**

```ts
/**
 * Reciter-preview UI state (onboarding). Driven ONLY by the audio engine
 * (services/audioEngine.ts), one-directionally, like playerStore. Not persisted.
 * A preview NEVER writes playerStore — see the engine's preview section.
 */
import { create } from 'zustand';

export type PreviewStatus = 'idle' | 'loading' | 'playing';
type PreviewState = {
  reciterId: string | null;
  status: PreviewStatus;
  begin: (reciterId: string) => void;
  markPlaying: (reciterId: string) => void;
  clear: () => void;
};

export const usePreviewStore = create<PreviewState>((set, get) => ({
  reciterId: null,
  status: 'idle',
  begin: (reciterId) => set({ reciterId, status: 'loading' }),
  markPlaying: (reciterId) => {
    if (get().reciterId === reciterId) set({ status: 'playing' });
  },
  clear: () => set({ reciterId: null, status: 'idle' }),
}));
```

**Step 4: PASS** (+ tsc). **Step 5: Commit**: `git commit -m "feat(audio): add preview UI state store"`

---

### Task 7: Engine: `startReciterPreview` / `stopReciterPreview` / `canPreviewAudio`

**Files:**
- Modify: `services/audioEngine.ts`. Add imports (`usePreviewStore`, `pickPreviewEpisode`, `PREVIEW_MAX_SEC`), a "RECITER PREVIEW" section after `stop()` (`:114-117`), and a preview clear at the top of `playLecture` (`:132-134`)
- Modify: `constants/settings.ts` (append `PREVIEW_MAX_SEC = 30`)
- Test: `services/audioEngine/__tests__/preview.test.ts` (create; copy the mock header of `audioEngine.test.ts:1-24`, do NOT mock previewStore — use the real one)

**Step 1: Failing tests**. Use `jest.useFakeTimers()` where noted.

```ts
const reciter = { id: 'r3', name: 'المنشاوي', style: 'murattal', styleLabel: 'x' } as any;
const META = { files: [{ name: '001.mp3', track: '1', length: '50' }, { name: '002.mp3', track: '2', length: '9000' }] };

beforeEach(() => {
  (Platform as any).OS = 'ios';
  jest.clearAllMocks();
  engine.__resetForTests();
  usePreviewStore.getState().clear();
  (fetchItemMetadata as jest.Mock).mockResolvedValue(META);
});

it('P1: canPreviewAudio is false on web, true on native', () => {
  expect(engine.canPreviewAudio()).toBe(true);
  (Platform as any).OS = 'web';
  expect(engine.canPreviewAudio()).toBe(false);
});
it('P2: plays only Al-Fatiha as a single preview track and never touches playerStore', async () => {
  await engine.startReciterPreview(reciter, 'arch-id');
  expect(TrackPlayer.reset).toHaveBeenCalled();
  const added = (TrackPlayer.add as jest.Mock).mock.calls[0][0];
  expect(added).toMatchObject({ id: 'preview:r3', url: expect.stringContaining('001.mp3') });
  expect(TrackPlayer.play).toHaveBeenCalled();
  expect(mockSetTrack).not.toHaveBeenCalled();
  expect(mockSetVisible).not.toHaveBeenCalled();
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'r3', status: 'loading' });
});
it('P3: pauses a playing real queue and persists its position via setIsPlaying(false) first', async () => {
  (TrackPlayer.getPlaybackState as jest.Mock).mockResolvedValueOnce({ state: State.Playing });
  await engine.startReciterPreview(reciter, 'arch-id');
  expect(TrackPlayer.pause).toHaveBeenCalled();
  expect(mockSetIsPlaying).toHaveBeenCalledWith(false);
  const pauseOrder = (TrackPlayer.pause as jest.Mock).mock.invocationCallOrder[0];
  const resetOrder = (TrackPlayer.reset as jest.Mock).mock.invocationCallOrder[0];
  expect(pauseOrder).toBeLessThan(resetOrder);
});
it('P4: stop is a no-op when no preview is active (never resets a real queue)', async () => {
  await engine.stopReciterPreview();
  expect(TrackPlayer.reset).not.toHaveBeenCalled();
});
it('P5: stop resets the queue and clears state', async () => {
  await engine.startReciterPreview(reciter, 'arch-id');
  (TrackPlayer.reset as jest.Mock).mockClear();
  await engine.stopReciterPreview();
  expect(TrackPlayer.reset).toHaveBeenCalledTimes(1);
  expect(usePreviewStore.getState().reciterId).toBeNull();
  expect(engine.isPreviewSuppressing()).toBe(true); // drain window
});
it('P6: a stale start (superseded while fetching) never touches the player', async () => {
  let resolveA!: (m: any) => void;
  (fetchItemMetadata as jest.Mock)
    .mockImplementationOnce(() => new Promise((r) => { resolveA = r; }))
    .mockResolvedValueOnce(META);
  const a = engine.startReciterPreview({ ...reciter, id: 'rA' }, 'A');
  await engine.startReciterPreview({ ...reciter, id: 'rB' }, 'B');
  resolveA(META);
  await a;
  const ids = (TrackPlayer.add as jest.Mock).mock.calls.map((c) => c[0].id);
  expect(ids).toEqual(['preview:rB']);
  expect(usePreviewStore.getState().reciterId).toBe('rB');
});
it('P7: a stale start that fails does not throw', async () => {
  (fetchItemMetadata as jest.Mock)
    .mockRejectedValueOnce(new Error('net'))
    .mockResolvedValueOnce(META);
  const a = engine.startReciterPreview({ ...reciter, id: 'rA' }, 'A');
  await engine.startReciterPreview({ ...reciter, id: 'rB' }, 'B');
  await expect(a).resolves.toBeUndefined();
});
it('P8: a current start that fails clears state and rethrows', async () => {
  (fetchItemMetadata as jest.Mock).mockRejectedValueOnce(new Error('net'));
  await expect(engine.startReciterPreview(reciter, 'arch-id')).rejects.toThrow('net');
  expect(usePreviewStore.getState().reciterId).toBeNull();
});
it('P9: a series with no mp3 throws NoAudioError and clears state', async () => {
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce({ files: [] });
  await expect(engine.startReciterPreview(reciter, 'arch-id')).rejects.toBeInstanceOf(engine.NoAudioError);
  expect(usePreviewStore.getState().reciterId).toBeNull();
});
it('P10: auto-stops after PREVIEW_MAX_SEC', async () => {
  jest.useFakeTimers();
  await engine.startReciterPreview(reciter, 'arch-id');
  (TrackPlayer.reset as jest.Mock).mockClear();
  jest.advanceTimersByTime(PREVIEW_MAX_SEC * 1000);
  await Promise.resolve();
  expect(TrackPlayer.reset).toHaveBeenCalled();
  expect(usePreviewStore.getState().reciterId).toBeNull();
  jest.useRealTimers();
});
it('P11: playLecture clears an active preview so real playback is not suppressed', async () => {
  await engine.startReciterPreview(reciter, 'arch-id');
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce(META);
  await engine.playLecture({ id: 'l1', title: 't', scholar: 's', duration: '', category: 'scholar', archiveId: 'L' } as any);
  expect(usePreviewStore.getState().reciterId).toBeNull();
});
it('P12: web is a silent no-op', async () => {
  (Platform as any).OS = 'web';
  await engine.startReciterPreview(reciter, 'arch-id');
  expect(TrackPlayer.add).not.toHaveBeenCalled();
});
```

**Step 2: FAIL**: `npx jest services/audioEngine/__tests__/preview.test.ts`

**Step 3: Implement** (in `services/audioEngine.ts`; `__resetForTests` also resets the preview module state)

```ts
// ---------------------------------------------------------------------------
// RECITER PREVIEW (onboarding). A short Al-Fatiha sample through the same RNTP
// instance. Invariants:
//   - never writes playerStore.track / visibility (MiniPlayer keeps the user's track)
//   - a playing real queue is paused AND its position persisted before reset
//   - stop is a no-op when idle (must never reset a real lecture queue)
//   - while active (or draining), syncBridge suppresses playerStore writes
// ---------------------------------------------------------------------------
const PREVIEW_ID_PREFIX = 'preview:';
const PREVIEW_DRAIN_MS = 750;
let _previewToken = 0;
let _previewTimer: ReturnType<typeof setTimeout> | null = null;
let _drainUntil = 0;

export function canPreviewAudio(): boolean {
  return !isWeb();
}

/** True while a preview owns the player, or just after one stopped (drain). */
export function isPreviewSuppressing(): boolean {
  return usePreviewStore.getState().reciterId !== null || Date.now() < _drainUntil;
}

function clearPreviewTimer(): void {
  if (_previewTimer) clearTimeout(_previewTimer);
  _previewTimer = null;
}

export async function stopReciterPreview(): Promise<void> {
  if (isWeb()) return;
  if (usePreviewStore.getState().reciterId === null) return;
  _previewToken += 1;
  clearPreviewTimer();
  usePreviewStore.getState().clear();
  _drainUntil = Date.now() + PREVIEW_DRAIN_MS;
  await TrackPlayer.reset();
}

export async function startReciterPreview(reciter: Reciter, archiveId: string): Promise<void> {
  if (isWeb()) return;
  await stopReciterPreview();
  const token = ++_previewToken;
  const isCurrent = () => token === _previewToken;
  usePreviewStore.getState().begin(reciter.id);
  try {
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
      usePlayerStore.getState().setIsPlaying(false); // persists the lecture position now
    }
    await setupPlayer();
    const meta = await fetchItemMetadata(archiveId);
    if (!isCurrent()) return;
    const episode = pickPreviewEpisode(resolveEpisodes(archiveId, meta));
    if (!episode) throw new NoAudioError('لا تتوفر عيّنة صوتية لهذا القارئ');
    await TrackPlayer.reset();
    if (!isCurrent()) return;
    await TrackPlayer.add({
      id: `${PREVIEW_ID_PREFIX}${reciter.id}`,
      url: episode.url,
      title: 'سورة الفاتحة — عيّنة',
      artist: reciter.name,
    });
    await TrackPlayer.play();
    _previewTimer = setTimeout(() => {
      if (isCurrent()) void stopReciterPreview().catch(() => undefined);
    }, PREVIEW_MAX_SEC * 1000);
  } catch (err) {
    if (!isCurrent()) return; // superseded — the newer preview owns the UI
    clearPreviewTimer();
    usePreviewStore.getState().clear();
    throw err;
  }
}
```

In `playLecture`, after the web guard: `clearPreviewTimer(); _previewToken += 1; usePreviewStore.getState().clear();` (no reset needed, because `playLecture` resets the queue itself).

Import `Reciter` from `@/types/content`, `pickPreviewEpisode` from `./archive/episodeResolver`, `usePreviewStore` from `@/store/previewStore`, `PREVIEW_MAX_SEC` from `@/constants/settings`. Extend `__resetForTests` to set `_previewToken = 0; _drainUntil = 0; clearPreviewTimer();`.

**Step 4: PASS**: `npx jest services/audioEngine` (all three existing suites plus the new one) and tsc.

**Step 5: Commit**: `git commit -m "feat(audio): reciter preview through the engine without touching the MiniPlayer"`

---

### Task 8: Sync bridge: suppress and route events while a preview is active

**Files:**
- Modify: `services/audioEngine/syncBridge.ts:30-67`
- Test: `services/audioEngine/__tests__/syncBridge.test.ts`. Add mocks for `@/store/progressStore` and `../../archive/archiveClient` (the bridge now imports the engine), and append cases.

**Step 1: Failing tests** (`handlerFor` exists at `:20-24`; drive state through the real `usePreviewStore`; `jest.mock('../../audioEngine', …)` partially so `stopReciterPreview` is a spy and `isPreviewSuppressing` reads the store):

```ts
const mockStopPreview = jest.fn().mockResolvedValue(undefined);
let mockDraining = false;
jest.mock('../../audioEngine', () => ({
  stopReciterPreview: () => mockStopPreview(),
  isPreviewSuppressing: () =>
    require('@/store/previewStore').usePreviewStore.getState().reciterId !== null || mockDraining,
  PREVIEW_ERROR_MESSAGE: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
}));
import { usePreviewStore } from '@/store/previewStore';

describe('while a reciter preview is active', () => {
  beforeEach(() => { usePreviewStore.getState().begin('r3'); mockDraining = false; });
  afterEach(() => usePreviewStore.getState().clear());

  it('B1: ignores active-track changes (MiniPlayer keeps the user track)', () => {
    handlerFor(Event.PlaybackActiveTrackChanged)({ track: { id: 'preview:r3', url: 'u' } });
    expect(mockSetTrack).not.toHaveBeenCalled();
  });
  it('B2: ignores progress (no lecture tick into SQLite)', () => {
    handlerFor(Event.PlaybackProgressUpdated)({ position: 5, duration: 50 });
    expect(mockSetProgress).not.toHaveBeenCalled();
  });
  it('B3: Playing marks the preview playing and leaves isPlaying alone', () => {
    handlerFor(Event.PlaybackState)({ state: State.Playing });
    expect(usePreviewStore.getState().status).toBe('playing');
    expect(mockSetIsPlaying).not.toHaveBeenCalled();
  });
  it('B4: None while loading (our own reset) does not end the preview', () => {
    handlerFor(Event.PlaybackState)({ state: State.None });
    expect(mockStopPreview).not.toHaveBeenCalled();
  });
  it.each([State.Paused, State.Stopped, State.Ended, State.None])('B5: %s while playing ends the preview', (s) => {
    usePreviewStore.getState().markPlaying('r3');
    handlerFor(Event.PlaybackState)({ state: s });
    expect(mockStopPreview).toHaveBeenCalled();
    expect(mockSetIsPlaying).not.toHaveBeenCalled();
  });
  it('B6: queue end stops the preview and NEVER clears the MiniPlayer track', () => {
    handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
    expect(mockStopPreview).toHaveBeenCalled();
    expect(mockSetTrack).not.toHaveBeenCalled();
  });
  it('B7: an error stops the preview and shows the preview toast once', () => {
    handlerFor(Event.PlaybackError)({ code: 'x', message: 'net' });
    expect(mockStopPreview).toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith({ message: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.' });
  });
  it('B8: during the drain window after stop, a late queue-end is ignored entirely', () => {
    usePreviewStore.getState().clear();
    mockDraining = true;
    handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
    expect(mockSetTrack).not.toHaveBeenCalled();
    expect(mockStopPreview).not.toHaveBeenCalled();
  });
});
```

The existing (non-preview) bridge tests must still pass unchanged. They run with the preview store idle and `mockDraining = false`.

**Step 2: FAIL**: `npx jest services/audioEngine/__tests__/syncBridge.test.ts`

**Step 3: Implement**. Export `PREVIEW_ERROR_MESSAGE` from `services/audioEngine.ts`. In `syncBridge.ts` import `{ isPreviewSuppressing, stopReciterPreview, PREVIEW_ERROR_MESSAGE } from '../audioEngine'` and `usePreviewStore`, then add a preview guard at the top of each handler:

```ts
const preview = () => usePreviewStore.getState();
const endPreview = () => { stopReciterPreview().catch(() => undefined); };

// PlaybackState:
if (isPreviewSuppressing()) {
  const p = preview();
  if (p.reciterId === null) return; // draining
  if (e.state === State.Playing) p.markPlaying(p.reciterId);
  else if (p.status === 'playing' && (e.state === State.Paused || e.state === State.Stopped || e.state === State.Ended || e.state === State.None)) endPreview();
  return;
}
// ProgressUpdated / ActiveTrackChanged:
if (isPreviewSuppressing()) return;
// QueueEnded:
if (isPreviewSuppressing()) { if (preview().reciterId !== null) endPreview(); return; }
// PlaybackError:
if (isPreviewSuppressing()) {
  Sentry.captureException(e instanceof Error ? e : new Error(`Preview error: ${JSON.stringify(e)}`));
  if (preview().reciterId !== null) { endPreview(); useToastStore.getState().show({ message: PREVIEW_ERROR_MESSAGE }); }
  return;
}
```

Update the file header to state that preview events are suppressed.

**Step 4: PASS**: `npx jest services/audioEngine` and tsc. **Step 5: Commit**: `git commit -m "fix(audio): keep reciter previews out of the MiniPlayer and progress log"`

---

### Task 9: UI facade `services/reciterPreview.ts`

**Files:**
- Create: `services/reciterPreview.ts`
- Modify: `constants/settings.ts` (append `ONBOARDING_RECITER_PREVIEW_SOURCES: Readonly<Record<string, string>> = Object.freeze({})`, with a comment pointing at design Q1)
- Test: `services/__tests__/reciterPreview.test.ts` (create; `jest.mock('@/services/audioEngine', …)` with spies, real previewStore, mock toastStore and Sentry)

**Step 1: Failing tests**

```ts
// Header. jest only lets a mock factory close over names prefixed `mock`.
class MockNoAudioError extends Error {}
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockCanPreviewAudio = jest.fn().mockReturnValue(true);
jest.mock('@/services/audioEngine', () => ({
  NoAudioError: MockNoAudioError,
  PREVIEW_ERROR_MESSAGE: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
  canPreviewAudio: () => mockCanPreviewAudio(),
  startReciterPreview: (...a: unknown[]) => mockStart(...a),
  stopReciterPreview: () => mockStop(),
}));
const mockToastShow = jest.fn();
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({ show: mockToastShow }) } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
import { usePreviewStore } from '@/store/previewStore';
import { canPreview, previewArchiveIdFor, stopPreview, toggleReciterPreview } from '@/services/reciterPreview';
const r = { id: 'r3', name: 'المنشاوي', style: 'murattal', styleLabel: 'x' } as const;
beforeEach(() => { jest.clearAllMocks(); usePreviewStore.getState().clear(); });

it('F1: previewArchiveIdFor prefers reciter.archiveId, then the onboarding map, else null', () => {
  expect(previewArchiveIdFor({ ...r, archiveId: 'own' }, { r3: 'map' })).toBe('own');
  expect(previewArchiveIdFor(r, { r3: 'map' })).toBe('map');
  expect(previewArchiveIdFor(r, {})).toBeNull();
});
it('F2: canPreview is false without a source or when the engine cannot preview', () => {
  mockCanPreviewAudio.mockReturnValue(true);
  expect(canPreview(r, {})).toBe(false);
  expect(canPreview(r, { r3: 'x' })).toBe(true);
  mockCanPreviewAudio.mockReturnValue(false);
  expect(canPreview(r, { r3: 'x' })).toBe(false);
});
it('F3: toggling the active reciter stops it', async () => {
  usePreviewStore.getState().begin('r3');
  await toggleReciterPreview(r, { r3: 'x' });
  expect(mockStop).toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
});
it('F4: toggling another reciter starts it with the resolved source', async () => {
  await toggleReciterPreview(r, { r3: 'x' });
  expect(mockStart).toHaveBeenCalledWith(r, 'x');
});
it('F5: network failure → Arabic toast, never throws', async () => {
  mockStart.mockRejectedValueOnce(new Error('net'));
  await expect(toggleReciterPreview(r, { r3: 'x' })).resolves.toBeUndefined();
  expect(mockToastShow).toHaveBeenCalledWith({ message: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.' });
});
it('F6: no-audio → its own Arabic toast', async () => {
  mockStart.mockRejectedValueOnce(new MockNoAudioError());
  await toggleReciterPreview(r, { r3: 'x' });
  expect(mockToastShow).toHaveBeenCalledWith({ message: 'لا تتوفر عيّنة صوتية لهذا القارئ' });
});
it('F7: stopPreview swallows engine errors', async () => {
  mockStop.mockRejectedValueOnce(new Error('bridge down'));
  await expect(stopPreview()).resolves.toBeUndefined();
});
```

**Step 2: FAIL** → **Step 3: Implement**

```ts
/**
 * services/reciterPreview.ts — UI-facing entry for reciter audio previews
 * (onboarding). Mirrors services/lecturePlayback.ts: screens call it straight
 * from onPress; it never throws and reports failures as Arabic toasts.
 */
import * as Sentry from '@sentry/react-native';
import { ONBOARDING_RECITER_PREVIEW_SOURCES } from '@/constants/settings';
import {
  NoAudioError, PREVIEW_ERROR_MESSAGE, canPreviewAudio, startReciterPreview, stopReciterPreview,
} from '@/services/audioEngine';
import { usePreviewStore } from '@/store/previewStore';
import { useToastStore } from '@/store/toastStore';
import type { Reciter } from '@/types/content';

const NO_SAMPLE_MESSAGE = 'لا تتوفر عيّنة صوتية لهذا القارئ';
type Sources = Readonly<Record<string, string>>;

export function previewArchiveIdFor(reciter: Reciter, sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES): string | null {
  return reciter.archiveId ?? sources[reciter.id] ?? null;
}

export function canPreview(reciter: Reciter, sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES): boolean {
  return canPreviewAudio() && previewArchiveIdFor(reciter, sources) !== null;
}

export async function stopPreview(): Promise<void> {
  try { await stopReciterPreview(); } catch { /* best effort — the step is going away */ }
}

export async function toggleReciterPreview(reciter: Reciter, sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES): Promise<void> {
  if (usePreviewStore.getState().reciterId === reciter.id) return stopPreview();
  const archiveId = previewArchiveIdFor(reciter, sources);
  if (!archiveId) return;
  try {
    await startReciterPreview(reciter, archiveId);
  } catch (err) {
    if (err instanceof NoAudioError) {
      useToastStore.getState().show({ message: NO_SAMPLE_MESSAGE });
    } else {
      Sentry.captureException(err);
      useToastStore.getState().show({ message: PREVIEW_ERROR_MESSAGE });
    }
  }
}
```

**Step 4: PASS** (+ tsc). **Step 5: Commit**: `git commit -m "feat(onboarding): reciter preview facade with Arabic failure messages"`

---

### Task 10: Selectable row slot contract + `PreviewButton`

**Files:**
- Modify: `constants/rtlContracts.ts` (add after `RECITER_ROW_ORDER`, `:27-28`)
- Modify: `components/khazain/onboarding/SelectableRow.tsx` (whole component, `:8-101`)
- Create: `components/khazain/onboarding/PreviewButton.tsx`
- Modify: `__tests__/rtlPhysicalContract.test.ts:57-63` (add `PreviewButton.tsx`)
- Test: `__tests__/rtlVisualContracts.test.ts` (append) and `__tests__/onboardingSteps.test.ts` (append source contracts)

**Step 1: Failing tests**

```ts
// rtlVisualContracts.test.ts
import { SELECTABLE_ROW_ORDER } from '@/constants/rtlContracts';
it('onboarding selectable row: preview on the physical left, select (tick → text) leading at the right', () => {
  expect(SELECTABLE_ROW_ORDER).toEqual(['preview', 'select']);
  expect(Object.isFrozen(SELECTABLE_ROW_ORDER)).toBe(true);
});

// onboardingSteps.test.ts
describe('selectable row with a preview control', () => {
  const row = () => code('components/khazain/onboarding/SelectableRow.tsx');
  it('renders slots from SELECTABLE_ROW_ORDER inside a PHYSICAL_ROW', () => {
    expect(row()).toMatch(/SELECTABLE_ROW_ORDER\.map/);
    expect(row()).toMatch(/\.\.\.PHYSICAL_ROW/);
  });
  it('keeps the preview button a SIBLING of the radio Pressable (VoiceOver can reach it)', () => {
    // exactly one Pressable in the row file — the preview control lives in PreviewButton
    expect(row().match(/<Pressable/g)).toHaveLength(1);
    expect(row()).toMatch(/accessibilityRole="radio"/);
  });
  it('PreviewButton is a labelled 44pt button with busy state', () => {
    const src = code('components/khazain/onboarding/PreviewButton.tsx');
    expect(src).toMatch(/accessibilityRole="button"/);
    expect(src).toMatch(/MIN_TOUCH_TARGET/);
    expect(src).toMatch(/busy/);
    expect(src).toMatch(/إيقاف العيّنة/);
    expect(src).toMatch(/استماع إلى عيّنة من تلاوة/);
  });
});
```

**Step 2: FAIL** → **Step 3: Implement**

```ts
// constants/rtlContracts.ts
/**
 * Onboarding selectable row (qira'a / reciter). No Figma frame — contract-only.
 * `select` is the radio Pressable; inside it the order stays tick → text.
 * The optional preview control is a sibling so screen readers reach it.
 */
export const SELECTABLE_ROW_ORDER = Object.freeze(['preview', 'select'] as const);
export type SelectableRowSlot = (typeof SELECTABLE_ROW_ORDER)[number];
```

`PreviewButton.tsx`:

```tsx
type Props = { reciterName: string; status: 'idle' | 'loading' | 'playing'; onPress: () => void };
export function PreviewButton({ reciterName, status, onPress }: Props): React.ReactElement {
  const active = status !== 'idle';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? 'إيقاف العيّنة' : `استماع إلى عيّنة من تلاوة ${reciterName}`}
      accessibilityState={{ busy: status === 'loading' }}
      hitSlop={4}
      style={({ pressed }) => [styles.button, active && styles.active, pressed && styles.pressed]}
    >
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={KhazainColors.navy800} />
      ) : status === 'playing' ? (
        <PauseIcon size={18} color={KhazainColors.cardBg} />
      ) : (
        <PlayIcon size={18} color={KhazainColors.navy800} />
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: KhazainColors.iconChipBg,
  },
  active: { backgroundColor: KhazainColors.navy800 },
  pressed: { opacity: 0.8 },
});
```

`SelectableRow.tsx`: add `preview?: React.ReactNode` to `Props`. Move the card chrome (`row`, `KhazainShadows.card`, `rowSelected`) to an outer `View` (`...PHYSICAL_ROW`, `alignItems: 'center'`, `gap: 12`, `minHeight: 64`, `paddingVertical: 12`, `paddingHorizontal: 16`). The existing `Pressable` becomes the `select` slot: `{ ...PHYSICAL_ROW, flex: 1, alignItems: 'center', gap: 12 }`, with the pressed-scale transform, the `radio` role, state and label, and children tick → text, unchanged. Render `SELECTABLE_ROW_ORDER.map((slot) => <React.Fragment key={slot}>{slots[slot]}</React.Fragment>)` with `slots = { preview: preview ?? null, select: <Pressable…/> }`. `QiraaStep` passes no `preview`, so its rows render as before. Keep the doc comment and explain the sibling structure.

**Step 4: PASS**: `npx jest __tests__/rtlVisualContracts.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/onboardingSteps.test.ts` and tsc.

**Step 5: Commit**: `git commit -m "feat(onboarding): selectable row gains a sibling preview control in a pinned slot order"`

---

### Task 11: Wire previews into the reciter step and stop them on every exit

**Files:**
- Modify: `components/khazain/onboarding/ReciterStep.tsx`. Replace the doc comment at `:11-16`, list `selectOnboardingReciters(...)` instead of `data` (`:42`), pass `preview`, and add the cleanup effects.
- Modify: `app/onboarding.tsx`. Call `stopPreview()` in `goTo` (`:110-115`) and `finish` (`:117-120`), which `onSkip` reaches.
- Test: `__tests__/onboardingSteps.test.ts` (append source contracts)

**Step 1: Failing tests**

```ts
describe('reciter step previews (ticket QTQYqLBB: popular reciters with audio previews)', () => {
  const step = () => code('components/khazain/onboarding/ReciterStep.tsx');
  it('lists the curated popular reciters, not the whole catalogue', () => {
    expect(step()).toMatch(/selectOnboardingReciters\(/);
    expect(step()).toMatch(/ONBOARDING_POPULAR_RECITER_IDS/);
  });
  it('only renders a preview control when the reciter can be previewed', () => {
    expect(step()).toMatch(/canPreview\(/);
    expect(step()).toMatch(/toggleReciterPreview\(/);
  });
  it('stops the preview on unmount and when the app leaves the foreground', () => {
    expect(step()).toMatch(/return \(\) => \{[\s\S]*stopPreview\(\)/);
    expect(step()).toMatch(/AppState\.addEventListener\('change'/);
  });
  it('no longer claims previews are deferred', () => {
    expect(fs.readFileSync(path.join(ROOT, 'components/khazain/onboarding/ReciterStep.tsx'), 'utf8')).not.toMatch(/deferred \(FR-006\)/);
  });
  it('the screen stops any preview on step change, skip and finish', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/const goTo[\s\S]*?stopPreview\(\)/);
    expect(src).toMatch(/const finish[\s\S]*?stopPreview\(\)/);
  });
});
```

**Step 2: FAIL** → **Step 3: Implement**

```tsx
// ReciterStep.tsx (additions)
const previewId = usePreviewStore((s) => s.reciterId);
const previewStatus = usePreviewStore((s) => s.status);
const reciters = useMemo(
  () => selectOnboardingReciters(data, ONBOARDING_POPULAR_RECITER_IDS, selectedId),
  [data, selectedId],
);

// Stop on unmount (step change, skip, finish all unmount this step).
useEffect(() => () => { void stopPreview(); }, []);
// Stop when backgrounded — a 30 s sample must not keep playing behind the lock screen.
useEffect(() => {
  const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') void stopPreview(); });
  return () => sub.remove();
}, []);

// row:
<SelectableRow
  key={r.id}
  title={r.name}
  subtitle={r.styleLabel}
  selected={r.id === selectedId}
  onPress={() => setPreferredReciter(r.id)}
  preview={canPreview(r) ? (
    <PreviewButton
      reciterName={r.name}
      status={previewId === r.id ? previewStatus : 'idle'}
      onPress={() => { void toggleReciterPreview(r); }}
    />
  ) : undefined}
/>
```

Note: `selectedId` changes when the user taps a row, and that re-runs the memo but not the unmount cleanup. The cleanup effect has `[]` deps, so selecting a reciter never stops its preview. This is intended.

Replace the doc comment with: "Onboarding reciter step: the curated popular reciters (`ONBOARDING_POPULAR_RECITER_IDS`), each with an optional Al-Fatiha preview (design 2026-10-21 §4.3). Selecting and previewing are separate controls; previewing never changes `preferredReciterId`."

In `app/onboarding.tsx`, import `stopPreview` from `@/services/reciterPreview` and add `void stopPreview();` as the first line of both `goTo` and `finish`.

**Step 4: PASS**: `npx jest __tests__/onboardingSteps.test.ts __tests__/rtlPhysicalContract.test.ts` and tsc.

**Step 5: Commit**: `git commit -m "feat(onboarding): audio previews on the reciter step, stopped on every exit"`

---

### Task 12 (CONDITIONAL): Reconcile with the Expo Go guard

**Run only if** `git merge-base --is-ancestor 6e9d60d HEAD` succeeds, i.e. `fix/rntp-expo-go-guard` is in the base by the time this executes. Otherwise skip it and record in the PR: "after the Expo Go guard merges, switch `canPreviewAudio`/`startReciterPreview`/`stopReciterPreview` from `isWeb()` to `isInert()`".

**Files:** `services/audioEngine.ts` (preview section), `services/audioEngine/__tests__/inert.test.ts`

**Step 1: Failing test** (in `inert.test.ts`, where `nativeAudioAvailable` is mocked false): `expect(engine.canPreviewAudio()).toBe(false)`, and `await engine.startReciterPreview(r, 'x')` resolves without calling `TrackPlayer.add` and without a toast. The button is hidden instead (design §4.3 Expo Go).
**Step 2:** FAIL. **Step 3:** In the preview section, replace `isWeb()` with `isInert()`, and make `canPreviewAudio = () => !isInert()`. **Step 4:** `npx jest services/audioEngine` PASS + tsc.
**Step 5: Commit**: `git commit -m "fix(audio): hide reciter previews when the native audio module is absent"`

---

### Task 13 (GATED on design Q1 approval): Preview sources for the curated reciters

**Do not start without the user's written approval of specific ids.**

**Files:** `constants/settings.ts` (`ONBOARDING_RECITER_PREVIEW_SOURCES`), `services/__tests__/reciterPreview.test.ts`

**Step 1: Failing test**

```ts
it('F8: every configured preview source belongs to a curated reciter', () => {
  for (const id of Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES)) {
    expect(ONBOARDING_POPULAR_RECITER_IDS).toContain(id);
    expect(ONBOARDING_RECITER_PREVIEW_SOURCES[id]).toMatch(/^[A-Za-z0-9._-]+$/);
  }
  expect(Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES).length).toBeGreaterThan(0);
});
```

**Step 2:** FAIL (the map is empty).

**Step 3:** For each approved id, verify it before adding:

```bash
curl -s "https://archive.org/metadata/<id>" | jq -r '.files[] | select(.name|test("\\.mp3$";"i")) | "\(.track // "-")\t\(.name)\t\(.length // "-")"' | head -5
```

Track `1` (or a `001…` file) must be Al-Fatiha by that reciter. Listen once to confirm. Record id, reciter and verification date in a comment above the map. **Do not** set `Reciter.archiveId` in `data/content/quran.ts` (design §7, the surah-list episode-0 bug).

**Step 4:** `npx jest services/__tests__/reciterPreview.test.ts` PASS. **Step 5: Commit**: `git commit -m "feat(onboarding): approved Al-Fatiha preview sources for the curated reciters"`

If Q1 is not approved, skip this task. The PR and the Trello card must then state that "audio previews" stays **PARTIAL**: the mechanism ships, but no row shows a button.

---

### Task 14: Full verification and visual QA

**Step 1: Automated**

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "app/onboarding|components/khazain/onboarding|services/(audioEngine|reciterPreview|onboardingReciters|archive/episodeResolver)|store/(previewStore|settingsStore)|constants/(settings|rtlContracts)" -A 2
grep -rn "FeatureStep\|FEATURE_STEPS\|deferred (FR-006)" app components services constants __tests__
```

Expected: every jest suite passes, tsc reports 0 errors, the lint grep is empty (the known `app/(tabs)/browse.tsx:603` errors are out of scope), and the last grep prints nothing.

**Step 2: Visual QA on the iOS simulator.** Use argent: `list-devices`, then `argent-ios-simulator-setup`, then `argent-react-native-app-workflow`. Use `describe` / `debugger-component-tree` for tap targets, never screenshot pixels. Fresh state: More → الإعدادات → "إعادة الإعداد الأولي" (`app/(tabs)/more/settings.tsx:261-264`), or a fresh install.

**No Figma frame covers onboarding.** Each screen is checked against the named contract, not a reference PNG. Do not write "matches Figma".

| # | Route / state | Compare against | Must hold |
|---|---|---|---|
| A1 | `/onboarding` step 1/4 Welcome | no frame: `constants/layout.ts` (`PHYSICAL_ROW`, `RTL_TEXT`), Khazain tokens | FoundationMark + Wordmark + mission + 4 highlight rows with the gold bullet at the **physical right**; progress shows **4** dots; skip reachable |
| A2 | Welcome at 320 pt width × font scale 1.7 (`scripts/visual-audit/screen-matrix.mjs`) | same | content scrolls, nothing clipped behind the footer or over the status bar |
| A3 | step 2/4 Qira'a | no frame: `SELECTABLE_ROW_ORDER` | rows unchanged from before (tick → text, title at right edge), no preview button |
| A4 | step 3/4 Reciter | no frame: `SELECTABLE_ROW_ORDER`, `MIN_TOUCH_TARGET` | exactly the curated 6 (plus the selected reciter if it is not curated); preview button at the **physical left** only on rows with a source; title still at the right edge |
| A5 | step 4/4 Channels | no frame: unchanged `ChannelsStep` | Telegram / YouTube / WhatsApp CTAs open; "ابدأ" finishes |
| A6 | Transitions | `app/onboarding.tsx:53-108` | 280 ms slide+fade on next/back; instant with Reduce Motion on |
| A7 | VoiceOver on step 3 | a11y | the radio row and the preview button are separate focus stops with the Arabic labels |

**Preview behaviour (only if Task 13 shipped at least one source; otherwise record "no source, button hidden as designed"):**

| # | Action | Expect |
|---|---|---|
| B1 | Tap play on row A | spinner, then audio, then pause glyph; A is **not** selected by the tap |
| B2 | Tap play on row B while A plays | A stops, B plays; only one sound |
| B3 | Wait 30 s | the preview stops by itself and the button returns to play |
| B4 | Play, then back / next / skip / finish | audio stops immediately in every case |
| B5 | Play, then background the app | audio stops |
| B6 | Airplane mode, then tap play | Arabic toast `تعذّر تشغيل العيّنة…`; button back to play; no crash |
| B7 | With a lecture in progress (play one in the tabs, pause), More → الإعدادات → "إعادة الإعداد الأولي", preview a reciter, finish onboarding | MiniPlayer still shows the **same lecture**; play resumes it at the saved position; Library → in-progress lecture is **not** marked complete and no preview session appears |
| B8 | Kill the app on step 3, relaunch | resumes on step 3/4 |

**Step 3: Migration spot-check on device.** With the simulator app container, write `{"state":{"onboardingComplete":false,"onboardingStep":6,"schemaVersion":3},"version":0}` using the same mechanism as `scripts/visual-audit/skip-onboarding-ios.sh:19`. Launch, and the app should open on step 4/4 (Channels) without crashing.

**Step 4: Record** the results in `docs/plans/2026-10-21-onboarding-flow-gaps-qa.md`, with screenshots under `docs/audit/2026-10-21/onboarding/` (untracked). Commit the QA doc: `git commit -m "docs(qa): onboarding flow gaps verification"`

**Step 5: Session hygiene.** Call `stop-all-simulator-servers` with `devices: [<the udid used>]`.
