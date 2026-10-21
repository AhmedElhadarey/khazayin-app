# Onboarding Flow Gaps — Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: run this task by task, following CLAUDE.md §"Development Workflow" step 4: a fresh implementer, then spec review, then quality review, for each task.

**Goal:** Close the audit gaps on the "First-Time Onboarding Flow" ticket (https://trello.com/c/QTQYqLBB):
- bring the flow to 4 screens, with a safe resume migration;
- add per-row Al-Fatiha previews for reciters that have a verified archive.org file. Previews must never disturb the MiniPlayer or progress data.

**Architecture:**
- An ordered `ONBOARDING_STEPS` id list replaces the magic step count, and a legacy mapping in `coerceSettings` handles the shrink from 8 to 4.
- Previews play a verified direct file through `services/audioEngine.ts`. That module still has a single RNTP boundary, now with a synchronous module-level `_queueOwner` (`'none' | 'lecture' | 'preview'`). The sync bridge reads it to drop MiniPlayer writes while a preview owns the queue.
- UI state lives in a tiny `previewStore`, and a facade shows the Arabic toasts.
- The selectable row gains a sibling preview button in a contract-defined physical slot order.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, Zustand 5, react-native-track-player 4.1.2 (already installed), and jest-expo. There is no @testing-library, so tests are pure-logic tests, service tests against the RNTP mock, or source-contract regex tests (the same style as `__tests__/rtlPhysicalContract.test.ts`).

**Design:** `docs/plans/2026-10-21-onboarding-flow-gaps-design.md` v2. Read §4 and §8 first.

**User decisions (2026-10-21):**
- Q1: verify each archive.org candidate. Only verified files ship. The PR lists the exact item id and file for each, for sign-off before merge.
- Q2: 4 screens.
- Q3: delete `FeatureStep.tsx`.
- Q6: keep `FoundationMark`, recorded as a user-approved deviation.

**Base facts the implementer must not rediscover:**
- RNTP is mocked through `jest.config.js` → `__mocks__/react-native-track-player.ts`. It has `add`, `reset`, `play`, `getActiveTrack` and `getActiveTrackIndex`, but no `load`.
- Engine tests mock `@/store/playerStore`, `@/store/progressStore`, `../../archive/archiveClient`, `@/store/toastStore` and `@sentry/react-native`. Copy the header at `services/audioEngine/__tests__/audioEngine.test.ts:1-24`.
- **Do not** set `Reciter.archiveId` in `data/content/quran.ts`. See design §9.
- The Expo Go guard (`rntp.ts`, `isInert()`) is NOT on this branch, which is why Task 12 is conditional.
- No new dependencies. Never use `--no-verify`. No `Co-Authored-By` or any other AI attribution in commits.

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
  it('derives the count from the list and stays within the card', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(ONBOARDING_STEPS.length);
    expect(ONBOARDING_STEP_COUNT).toBeGreaterThanOrEqual(3);
    // ALSO protects the legacy resume remap in settingsStore: it relies on old
    // indices 0-2 keeping their meaning and every old index ≥ COUNT landing on
    // the last step. Growing past 4 means revisiting coerceSettings.
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

**Step 2: Run it and expect FAIL.** `npx jest __tests__/onboardingSteps.test.ts` should fail because `ONBOARDING_STEPS` is undefined.

**Step 3: Implement.** Replace `constants/settings.ts:54-60` with:

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

**Step 4: Run and expect PASS.**
- `npx jest __tests__/onboardingSteps.test.ts __tests__/settingsStore.test.ts`. T-SS-13 still passes because it is written against the constant.
- `npx tsc --noEmit --pretty false`

**Step 5: Commit.** `git add constants/settings.ts __tests__/onboardingSteps.test.ts && git commit -m "feat(onboarding): define the flow as four ordered step ids"`

---

### Task 2: Migrate a persisted mid-onboarding step onto the 4-step flow

**Files:**
- Modify: `store/settingsStore.ts:9-15` (import), `:266-274` (the onboardingStep coercion)
- Test: `__tests__/settingsStore.test.ts` (append a `describe`; reuse `seedStorage` at `:18` and `rehydrateStore` at `:39`)

**Step 1: Write the failing tests**

```ts
describe('onboardingStep resume across the 8 → 4 step change', () => {
  const v3 = (onboardingStep: unknown) => ({
    schemaVersion: 3, defaultQiraaId: 'hafs-asim', preferredReciterId: 'r3', fontSizeLevel: 3,
    notifications: {}, onboardingComplete: false, onboardingStep,
  });
  it.each([
    [0, 0], [1, 1], [2, 2],          // same meaning in both layouts
    [3, 3], [4, 3], [5, 3], [6, 3],  // old feature screens → channels (next unseen)
    [7, 3],                          // old channels → channels
  ])('T-SS-OB-1: stored step %i resumes at %i', async (stored, expected) => {
    await seedStorage({ state: v3(stored), version: 0 });
    await rehydrateStore();
    const s = useSettingsStore.getState();
    expect(s.onboardingStep).toBe(expected);
    expect(s.onboardingComplete).toBe(false);
    expect(s.preferredReciterId).toBe('r3');
  });
  it.each([8, 99, -1, 2.5, '3', null])('T-SS-OB-2: %p was never a step → resets to 0', async (stored) => {
    await seedStorage({ state: v3(stored), version: 0 });
    await rehydrateStore();
    expect(useSettingsStore.getState().onboardingStep).toBe(0);
  });
  it('T-SS-OB-3: every legacy step migrates to a renderable step', async () => {
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

**Step 2: Run and expect FAIL.** `npx jest __tests__/settingsStore.test.ts -t "T-SS-OB"`. Stored steps 4 to 7 reset to 0 today.

**Step 3: Implement.** Import `LEGACY_ONBOARDING_STEP_COUNT`, then replace `:266-274` with:

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

**Step 4: Run and expect PASS.** `npx jest __tests__/settingsStore.test.ts`. That includes T-SS-10 and T-SS-11, which still expect 99 → 0. Then run tsc.

**Step 5: Commit** both files. `git commit -m "fix(settings): resume a mid-onboarding step on the shorter flow instead of restarting"`

---

### Task 3: Four-screen flow: highlights on Welcome, FeatureStep deleted, render by id

**Files:**
- Modify: `components/khazain/onboarding/WelcomeStep.tsx`. Add `WELCOME_HIGHLIGHTS` and the list under the mission (`:38-43`).
- Modify: `app/onboarding.tsx`:
  - `:12-21` (imports);
  - `:170-196` (`renderStep`);
  - the `:85` comment, changing "eight steps" to "four steps".
- Modify: `components/khazain/onboarding/index.ts:14`. Drop the FeatureStep export and export `WELCOME_HIGHLIGHTS`.
- **Delete:** `components/khazain/onboarding/FeatureStep.tsx` (user decision Q3). `RehlArt`, `ScrollArt`, `CrownBookArt` and `components/khazain/art/` **stay**. They are the API that future client art will replace (CLAUDE.md), even though nothing renders them after this task.
- Modify: `__tests__/rtlPhysicalContract.test.ts:57-63`. Add `'components/khazain/onboarding/WelcomeStep.tsx'`.
- Test: `__tests__/onboardingSteps.test.ts` (append)

**Step 1: Write the failing tests** (append, with a local copy of the comment-stripping helper from `rtlPhysicalContract.test.ts:66-71`):

```ts
import fs from 'fs';
import path from 'path';
const ROOT = path.resolve(__dirname, '..');
const code = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('four-screen flow', () => {
  it('renders by step id with one case per id and no feature screens', () => {
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
  it('FeatureStep is deleted and gone from the barrel', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/khazain/onboarding/FeatureStep.tsx'))).toBe(false);
    expect(code('components/khazain/onboarding/index.ts')).not.toMatch(/FeatureStep/);
  });
  it('Welcome carries four highlights as RTL physical rows and keeps FoundationMark', () => {
    const src = code('components/khazain/onboarding/WelcomeStep.tsx');
    expect(src.match(/key: '/g)).toHaveLength(4);
    expect(src).toMatch(/WELCOME_HIGHLIGHTS\.map/);
    expect(src).toMatch(/\.\.\.PHYSICAL_ROW/);
    expect(src).toMatch(/\.\.\.RTL_TEXT/);
    expect(src).toMatch(/FoundationMark/); // Q6: user-approved deviation from "LogoBadge"
  });
});
```

**Step 2: Run and expect FAIL.** `npx jest __tests__/onboardingSteps.test.ts`

**Step 3: Implement**

`WelcomeStep.tsx`:

```tsx
import { PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';

/** The four "how the app works" highlights, folded in from the old feature screens. */
export const WELCOME_HIGHLIGHTS: readonly { key: string; text: string }[] = Object.freeze([
  { key: 'quran', text: 'القرآن الكريم بالقراءات والروايات وبصوت قارئك المفضّل' },
  { key: 'wird', text: 'وِردك اليومي مع التذكير ومتابعة إنجازك' },
  { key: 'library', text: 'مكتبتك الشخصية وملاحظاتك على ما تقرأ' },
  { key: 'scholars', text: 'العلماء والكتب وتصاميم الدعوة الجاهزة للمشاركة' },
]);

// …between <Text style={styles.mission}> and the hint:
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

`app/onboarding.tsx`: drop the `FEATURE_STEPS` and `FeatureStep` imports, import `ONBOARDING_STEPS`, and replace `renderStep` with:

```tsx
/** Step content: welcome → qira'a → reciter → channels (ONBOARDING_STEPS). `step` is always clamped. */
function renderStep(step: number): React.ReactElement {
  switch (ONBOARDING_STEPS[step]) {
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

The `switch` is exhaustive over `OnboardingStepId`. If tsc reports "not all code paths return a value", the repo has `noUncheckedIndexedAccess` turned on. In that case, type the lookup as `const id: OnboardingStepId = ONBOARDING_STEPS[step] as OnboardingStepId;` and comment that `step` is clamped by `goTo` (`:111`) and by the store. **Do not** add a Welcome fallback.

Then delete `FeatureStep.tsx`, update the barrel, and add WelcomeStep to `PINNED_SCREENS`.

**Step 4: Run and expect PASS.**
- `npx jest __tests__/onboardingSteps.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/fontScaleChrome.test.ts`
- tsc
- `grep -rn "FeatureStep\|FEATURE_STEPS" app components services __tests__ constants` should print nothing.

**Step 5: Commit** the listed files, including the deletion. `git commit -m "feat(onboarding): four screens, with the feature highlights folded into Welcome"`

---

### Task 4: Verify the Al-Fatiha preview sources (EARLY, before any engine work)

User decision Q1: verify every candidate and ship only the verified ones. **The preview list is exactly the reciters with a verified file.**

**Files:**
- Modify: `constants/settings.ts`. Append `PreviewSource`, `ONBOARDING_RECITER_PREVIEW_SOURCES` and `ONBOARDING_POPULAR_RECITER_IDS`.
- Test: `__tests__/onboardingPreviewSources.test.ts` (create)

**Candidates (from the user):**

| Reciter | id in `data/content/quran.ts` | Candidate items (try in order) |
|---|---|---|
| الشيخ محمد صديق المنشاوي | `r3` | `Minshawi_Morattal_FullQuran`, `mos7af_Siddeeq_al_Minshawi` |
| الشيخ مشاري راشد العفاسي | `r12` | `mishari-rashid-al-afasy-quran-mp3`, `afasyrecitation` |
| الشيخ محمود خليل الحصري | `r2` | `QuranRecitation-Husary` (flagged unverified) |

**Step 1: Write the failing test (F8)**

```ts
import {
  ONBOARDING_POPULAR_RECITER_IDS,
  ONBOARDING_RECITER_PREVIEW_SOURCES,
} from '@/constants/settings';
import { RECITERS } from '@/data/content/quran';
import { buildDownloadUrl } from '@/services/archive/episodeResolver';

describe('onboarding preview sources (user decision Q1: verified files only)', () => {
  it('F8: at least one verified source ships', () => {
    expect(Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES).length).toBeGreaterThan(0);
  });
  it('F8: every curated reciter has a verified source, and the curated list IS the verified list', () => {
    expect([...ONBOARDING_POPULAR_RECITER_IDS]).toEqual(Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES));
    for (const id of ONBOARDING_POPULAR_RECITER_IDS) {
      expect(ONBOARDING_RECITER_PREVIEW_SOURCES[id]).toBeDefined();
    }
  });
  it('F8: every source belongs to a reciter in the catalogue', () => {
    const ids = RECITERS.map((r) => r.id);
    for (const id of Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES)) expect(ids).toContain(id);
  });
  it('F8: every source is a direct archive.org mp3', () => {
    for (const { archiveId, file } of Object.values(ONBOARDING_RECITER_PREVIEW_SOURCES)) {
      expect(archiveId).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(file).toMatch(/\.mp3$/i);
      expect(buildDownloadUrl(archiveId, file)).toMatch(/^https:\/\/archive\.org\/download\//);
    }
  });
  it('does not touch Reciter.archiveId (design §9: surah list would play episode 0)', () => {
    expect(RECITERS.every((r) => r.archiveId === undefined)).toBe(true);
  });
});
```

**Step 2: Run and expect FAIL.** `npx jest __tests__/onboardingPreviewSources.test.ts`. The exports are missing.

**Step 3: Verify each candidate, then implement.**

The sandbox may block the network. If `curl` times out, rerun with network access, or ask the coordinator. **Never guess an id or a file name.**

For each candidate `ID`, write the outputs to the scratchpad, not the repo:

```bash
ID=Minshawi_Morattal_FullQuran
curl -sL "https://archive.org/metadata/$ID" -o "$SCRATCH/$ID.json"
# 1. Item names the reciter
jq '.metadata | {identifier, title, creator}' "$SCRATCH/$ID.json"
# 2. Find surah 1 among the mp3s (name / track / title)
jq -r '.files[] | select(.name|test("\\.mp3$";"i")) | [.name, (.track//"-"), (.title//"-"), (.length//"-"), (.size//"-"), (.source//"-")] | @tsv' "$SCRATCH/$ID.json" | sort | head -5
# 3. Download resolves to audio (URL-encode the file name exactly as buildDownloadUrl does)
FILE='001.mp3'
curl -sIL "https://archive.org/download/$ID/$FILE" | grep -iE "^HTTP/|^content-type|^content-length"
```

**Accept a file only if all of these hold.**
- (a) The item's `title` or `creator` names that reciter, in Arabic or Latin script.
- (b) The file is surah 1: a file name of `001…`, `1…` or one containing Fatiha/الفاتحة, **or** `track` 1, **or** a title of Al-Fatiha.
- (c) `length` is between 25 and 240 s. Murattal Al-Fatiha is typically 40 to 80 s; mujawwad recordings run longer.
- (d) `size` is above 150 KB and consistent with the length (at least about 8 KB/s).
- (e) The final HTTP status is `200` and the `content-type` is `audio/mpeg` (or another `audio/*` type).

Prefer the `source: original` file over a derivative. Take the first candidate per reciter that passes. If none of a reciter's candidates pass, leave that reciter out. If **no reciter** passes, STOP and escalate to the coordinator. The criterion cannot be met, and shipping an empty list is not acceptable.

Then implement in `constants/settings.ts`:

```ts
/** A directly playable, verified archive.org file. URL = buildDownloadUrl(archiveId, file). */
export type PreviewSource = Readonly<{ archiveId: string; file: string }>;

/**
 * Al-Fatiha preview files for the onboarding reciter step (design 2026-10-21 §4.3,
 * user decision Q1). ONLY files verified against: reciter named in item metadata,
 * surah 1 by name/track/title, plausible length+size, download → 200 audio/*.
 * Key order is display order. Re-verify at each release.
 *
 *   r3  <ID> / <file> — creator "<…>", track <n>, length <s>s, size <bytes> B, HTTP 200 audio/mpeg, verified 2026-10-<dd>
 *   …
 */
export const ONBOARDING_RECITER_PREVIEW_SOURCES: Readonly<Record<string, PreviewSource>> = Object.freeze({
  // r3: { archiveId: '<verified id>', file: '<verified file>' },
});

/** The onboarding reciter step lists exactly the reciters with a verified preview file. */
export const ONBOARDING_POPULAR_RECITER_IDS: readonly string[] = Object.freeze(
  Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES),
);
```

Also write a verification table for the PR body in `$SCRATCH/preview-sources.md`. Its columns are reciter, item id, file, creator/title, track, length, size, HTTP/content-type, and download URL. Include the rejected candidates and the reason each failed.

**Step 4: Run and expect PASS** (plus tsc).

**Step 5: Commit.** `git commit -m "feat(onboarding): verified Al-Fatiha preview sources for the onboarding reciters"`

---

### Task 5: Onboarding reciter selection (verified list + current pick)

**Files:**
- Create: `services/onboardingReciters.ts`
- Test: `services/__tests__/onboardingReciters.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { ONBOARDING_POPULAR_RECITER_IDS } from '@/constants/settings';
import { RECITERS } from '@/data/content/quran';
import { selectOnboardingReciters } from '@/services/onboardingReciters';
import type { Reciter } from '@/types/content';

const r = (id: string): Reciter => ({ id, name: id, style: 'murattal', styleLabel: 'x' });

describe('selectOnboardingReciters', () => {
  it('returns the curated ids in curated order', () => {
    expect(selectOnboardingReciters([r('a'), r('b'), r('c')], ['c', 'a'], 'c').map((x) => x.id)).toEqual(['c', 'a']);
  });
  it('skips curated ids the data source lacks', () => {
    expect(selectOnboardingReciters([r('a')], ['z', 'a'], 'a').map((x) => x.id)).toEqual(['a']);
  });
  it('appends the current selection when it is not curated (e.g. default r7, no preview)', () => {
    expect(selectOnboardingReciters([r('a'), r('b')], ['a'], 'b').map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('falls back to the first 6 when no curated id exists', () => {
    const all = ['1', '2', '3', '4', '5', '6', '7'].map(r);
    expect(selectOnboardingReciters(all, ['x'], 'none').map((x) => x.id)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
  it('returns [] for no data (AsyncContent shows its empty state)', () => {
    expect(selectOnboardingReciters([], ['a'], 'a')).toEqual([]);
  });
  it('the shipped curated list resolves fully against the mock catalogue', () => {
    const out = selectOnboardingReciters(RECITERS, ONBOARDING_POPULAR_RECITER_IDS, 'r7');
    expect(out.slice(0, ONBOARDING_POPULAR_RECITER_IDS.length).map((x) => x.id)).toEqual([...ONBOARDING_POPULAR_RECITER_IDS]);
  });
});
```

**Step 2: FAIL. Step 3: Implement**

```ts
/**
 * The onboarding reciter step lists the reciters with a verified preview file
 * (ONBOARDING_POPULAR_RECITER_IDS) plus the user's current pick — Settings →
 * القارئ keeps the full catalogue. Pure.
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

**Step 4: PASS** plus tsc. **Step 5: Commit.** `git commit -m "feat(onboarding): list the verified reciters plus the current pick"`

---

### Task 6: `previewStore`: preview UI state

**Files:**
- Create: `store/previewStore.ts`
- Modify: `store/index.ts` (re-export)
- Test: `store/__tests__/previewStore.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { usePreviewStore } from '@/store/previewStore';
beforeEach(() => usePreviewStore.getState().clear());
it('starts idle', () => {
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});
it('begin → loading; markPlaying only for the active reciter', () => {
  usePreviewStore.getState().begin('r1');
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'r1', status: 'loading' });
  usePreviewStore.getState().markPlaying('r2');
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

**Step 2: FAIL. Step 3: Implement**

```ts
/**
 * Reciter-preview UI state (onboarding). Driven ONLY by services/audioEngine.ts,
 * one-directionally, like playerStore. Not persisted. A preview never writes
 * playerStore — queue ownership lives in the engine (`_queueOwner`).
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

**Step 4: PASS** plus tsc. **Step 5: Commit.** `git commit -m "feat(audio): add preview UI state store"`

---

### Task 7: Engine: queue owner + reciter preview

**Files:**
- Modify: `services/audioEngine.ts`:
  - imports;
  - `setupPlayer` (`:45-79`), to adopt an owner from a surviving native queue;
  - `stop` (`:114-117`);
  - a new "QUEUE OWNER + RECITER PREVIEW" section after `stop`;
  - `playLecture` (`:132-134`, first line);
  - `togglePlayback` (`:192-193`);
  - `__resetForTests` (`:31-33`).
- Modify: `constants/settings.ts`. Append `export const PREVIEW_MAX_SEC = 30;`
- Test: `services/audioEngine/__tests__/preview.test.ts` (create). Copy the mock header from `audioEngine.test.ts:1-24`, and use the **real** `previewStore`.

**Step 1: Write the failing tests**

```ts
const reciter = { id: 'r3', name: 'المنشاوي', style: 'murattal', styleLabel: 'x' } as any;
const SRC = { archiveId: 'Item_1', file: '001 Fatiha.mp3' };
const flush = () => new Promise<void>((r) => setTimeout(r, 0)); // let in-flight awaits advance
const deferred = () => { let resolve!: () => void; const p = new Promise<void>((r) => { resolve = r; }); return { p, resolve }; };

beforeEach(() => {
  (Platform as any).OS = 'ios';
  jest.clearAllMocks();
  engine.__resetForTests();
  usePreviewStore.getState().clear();
});

it('P1: canPreviewAudio — native & no lecture → true; web → false; lecture owns queue → false', async () => {
  expect(engine.canPreviewAudio()).toBe(true);
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce({ files: [{ name: 'a.mp3', track: '1', length: '60' }] });
  await engine.playLecture({ id: 'l', title: 't', scholar: 's', duration: '', category: 'scholar', archiveId: 'L' } as any);
  expect(engine.getQueueOwner()).toBe('lecture');
  expect(engine.canPreviewAudio()).toBe(false);
  engine.__resetForTests();
  (Platform as any).OS = 'web';
  expect(engine.canPreviewAudio()).toBe(false);
});
it('P2: plays the verified file as a single preview track; owner preview; never touches playerStore', async () => {
  await engine.startReciterPreview(reciter, SRC);
  expect(engine.getQueueOwner()).toBe('preview');
  const added = (TrackPlayer.add as jest.Mock).mock.calls[0][0];
  expect(added).toMatchObject({ id: 'preview:r3', url: 'https://archive.org/download/Item_1/001%20Fatiha.mp3' });
  expect(TrackPlayer.play).toHaveBeenCalled();
  expect(fetchItemMetadata).not.toHaveBeenCalled(); // no metadata round trip
  expect(mockSetTrack).not.toHaveBeenCalled();
  expect(mockSetIsPlaying).not.toHaveBeenCalled();
  expect(mockSetVisible).not.toHaveBeenCalled();
});
it('P3: status becomes playing only once play() resolves', async () => {
  const d = deferred();
  (TrackPlayer.play as jest.Mock).mockImplementationOnce(() => d.p);
  const run = engine.startReciterPreview(reciter, SRC);
  await flush();
  expect(usePreviewStore.getState().status).toBe('loading');
  d.resolve(); await run;
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'r3', status: 'playing' });
});
it('P4: owner is set synchronously, before any await', () => {
  void engine.startReciterPreview(reciter, SRC);
  expect(engine.getQueueOwner()).toBe('preview');
  expect(usePreviewStore.getState().reciterId).toBe('r3');
});
it.each(['setupPlayer', 'reset', 'add', 'play'] as const)(
  'P5: a start superseded while awaiting %s issues no further command and never plays',
  async (stage) => {
    const d = deferred();
    (TrackPlayer[stage] as jest.Mock).mockImplementationOnce(() => d.p);
    const a = engine.startReciterPreview({ ...reciter, id: 'rA' }, SRC);
    const b = engine.startReciterPreview({ ...reciter, id: 'rB' }, SRC);
    d.resolve(); await a; await b;
    const addIds = (TrackPlayer.add as jest.Mock).mock.calls.map((c) => c[0].id);
    expect(addIds[addIds.length - 1]).toBe('preview:rB');
    expect(addIds.filter((id) => id === 'preview:rA').length).toBeLessThanOrEqual(stage === 'add' || stage === 'play' ? 1 : 0); // a mock records an add the moment it is issued
    expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'rB', status: 'playing' });
  },
);
it('P6: stop during an in-flight start — the stale start never plays; owner none; state idle', async () => {
  const d = deferred();
  (TrackPlayer.add as jest.Mock).mockImplementationOnce(() => d.p);
  const a = engine.startReciterPreview(reciter, SRC);
  await flush();
  await engine.stopReciterPreview();
  d.resolve(); await a;
  expect(TrackPlayer.play).not.toHaveBeenCalled();
  expect(engine.getQueueOwner()).toBe('none');
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});
it('P7: stop is a no-op unless a preview owns the queue (never resets a lecture)', async () => {
  await engine.stopReciterPreview();
  expect(TrackPlayer.reset).not.toHaveBeenCalled();
});
it('P8: stop resets the queue, owner none, state idle', async () => {
  await engine.startReciterPreview(reciter, SRC);
  (TrackPlayer.reset as jest.Mock).mockClear();
  await engine.stopReciterPreview();
  expect(TrackPlayer.reset).toHaveBeenCalledTimes(1);
  expect(engine.getQueueOwner()).toBe('none');
  expect(usePreviewStore.getState().reciterId).toBeNull();
});
it('P9: a current start that fails clears state, releases the owner, and rethrows', async () => {
  (TrackPlayer.add as jest.Mock).mockRejectedValueOnce(new Error('net'));
  await expect(engine.startReciterPreview(reciter, SRC)).rejects.toThrow('net');
  expect(usePreviewStore.getState().reciterId).toBeNull();
  expect(engine.getQueueOwner()).toBe('none');
});
it('P10: a superseded start that fails does not throw', async () => {
  const d = deferred();
  (TrackPlayer.add as jest.Mock).mockImplementationOnce(() => d.p.then(() => { throw new Error('net'); }));
  const a = engine.startReciterPreview({ ...reciter, id: 'rA' }, SRC);
  await flush();
  const b = engine.startReciterPreview({ ...reciter, id: 'rB' }, SRC);
  d.resolve();
  await expect(a).resolves.toBeUndefined();
  await b;
});
it('P11: auto-stops after PREVIEW_MAX_SEC', async () => {
  jest.useFakeTimers();
  try {
    await engine.startReciterPreview(reciter, SRC);
    (TrackPlayer.reset as jest.Mock).mockClear();
    jest.advanceTimersByTime(PREVIEW_MAX_SEC * 1000);
    await Promise.resolve();
    expect(TrackPlayer.reset).toHaveBeenCalled();
    expect(engine.getQueueOwner()).toBe('none');
  } finally {
    jest.useRealTimers();
  }
});
it('P12: playLecture takes the queue synchronously and clears an active preview', async () => {
  await engine.startReciterPreview(reciter, SRC);
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce({ files: [{ name: 'a.mp3', track: '1', length: '60' }] });
  const p = engine.playLecture({ id: 'l', title: 't', scholar: 's', duration: '', category: 'scholar', archiveId: 'L' } as any);
  expect(engine.getQueueOwner()).toBe('lecture');
  expect(usePreviewStore.getState().reciterId).toBeNull();
  await p;
});
it('P13: togglePlayback treats a preview-owned queue as "no queue" and rebuilds the lecture', async () => {
  await engine.startReciterPreview(reciter, SRC);
  mockTrack = { id: 'L/a.mp3', title: 't', reciter: 's' };
  (fetchItemMetadata as jest.Mock).mockResolvedValueOnce({ files: [{ name: 'a.mp3', track: '1', length: '60' }] });
  await engine.togglePlayback();
  expect(TrackPlayer.setQueue).toHaveBeenCalled(); // rebuilt via playLecture
  expect(engine.getQueueOwner()).toBe('lecture');
  mockTrack = null;
});
it('P14: setupPlayer adopts the owner of a queue that survived a JS restart', async () => {
  (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValueOnce({ id: 'preview:r3', url: 'u' });
  await engine.setupPlayer();
  expect(engine.getQueueOwner()).toBe('preview');
  engine.__resetForTests();
  (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValueOnce({ id: 'L/a.mp3', url: 'u' });
  await engine.setupPlayer();
  expect(engine.getQueueOwner()).toBe('lecture');
});
it('P15: web is a silent no-op', async () => {
  (Platform as any).OS = 'web';
  await engine.startReciterPreview(reciter, SRC);
  expect(TrackPlayer.add).not.toHaveBeenCalled();
});
```

Notes:
- The header's `mockTrack` is a `let` at `audioEngine.test.ts:5`. Keep it assignable.
- `flush()` uses a real `setTimeout(0)`. Do not call it while fake timers are on; only P11 uses them.

**Step 2: Run and expect FAIL.** `npx jest services/audioEngine/__tests__/preview.test.ts`

**Step 3: Implement** (in `services/audioEngine.ts`)

```ts
// ---------------------------------------------------------------------------
// QUEUE OWNER — synchronous, module-level. Who the RNTP queue currently belongs
// to. Written before the first await of every operation that takes or releases
// the queue, so the sync bridge can never observe a stale owner.
//   'lecture' — playLecture took it (the MiniPlayer's queue)
//   'preview' — a reciter preview took it (bridge drops all playerStore writes)
//   'none'    — nothing queued by this JS session
// ---------------------------------------------------------------------------
export type QueueOwner = 'none' | 'lecture' | 'preview';
let _queueOwner: QueueOwner = 'none';
export function getQueueOwner(): QueueOwner {
  return _queueOwner;
}

// RECITER PREVIEW (onboarding). A verified Al-Fatiha file, ≤ PREVIEW_MAX_SEC.
// Never offered while a lecture owns the queue; never writes playerStore;
// stop is a no-op unless a preview owns the queue.
const PREVIEW_ID_PREFIX = 'preview:';
export const PREVIEW_ERROR_MESSAGE = 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.';
let _previewToken = 0;
let _previewTimer: ReturnType<typeof setTimeout> | null = null;

function clearPreviewTimer(): void {
  if (_previewTimer) clearTimeout(_previewTimer);
  _previewTimer = null;
}

/** Drop any preview bookkeeping (token, timer, UI state). Does not touch RNTP. */
function abandonPreview(): void {
  _previewToken += 1;
  clearPreviewTimer();
  usePreviewStore.getState().clear();
}

export function canPreviewAudio(): boolean {
  return !isWeb() && _queueOwner !== 'lecture';
}

export async function stopReciterPreview(): Promise<void> {
  if (isWeb() || _queueOwner !== 'preview') return;
  abandonPreview();
  _queueOwner = 'none';
  await TrackPlayer.reset();
}

export async function startReciterPreview(reciter: Reciter, source: PreviewSource): Promise<void> {
  if (!canPreviewAudio()) return;
  abandonPreview();
  const token = _previewToken;
  _queueOwner = 'preview';
  usePreviewStore.getState().begin(reciter.id);
  const isCurrent = () => token === _previewToken && _queueOwner === 'preview';
  try {
    await setupPlayer();
    if (!isCurrent()) return;
    await TrackPlayer.reset();
    if (!isCurrent()) return;
    await TrackPlayer.add({
      id: `${PREVIEW_ID_PREFIX}${reciter.id}`,
      url: buildDownloadUrl(source.archiveId, source.file),
      title: 'سورة الفاتحة — عيّنة',
      artist: reciter.name,
    });
    if (!isCurrent()) return;
    await TrackPlayer.play();
    if (!isCurrent()) return;
    usePreviewStore.getState().markPlaying(reciter.id);
    _previewTimer = setTimeout(() => {
      if (isCurrent()) void stopReciterPreview().catch(() => undefined);
    }, PREVIEW_MAX_SEC * 1000);
  } catch (err) {
    if (!isCurrent()) return; // superseded — the newer owner handles the UI
    abandonPreview();
    _queueOwner = 'none';
    throw err;
  }
}
```

Elsewhere in the same file:
- **`playLecture`**: the first line after the web guard is `abandonPreview(); _queueOwner = 'lecture';`. This is synchronous, before the `archiveId` check and any await.
- **`togglePlayback`** (`:192-193`): `const hasQueue = _queueOwner !== 'preview' && idx !== undefined && idx !== null;`
- **`stop()`**: `abandonPreview(); _queueOwner = 'none';` before `TrackPlayer.reset()`.
- **`setupPlayer`**: at the end of the one-time block, after `updateOptions`, add:

  ```ts
  if (_queueOwner === 'none') {
    const active = await TrackPlayer.getActiveTrack();
    if (active) _queueOwner = String((active as { id?: unknown }).id ?? '').startsWith(PREVIEW_ID_PREFIX) ? 'preview' : 'lecture';
  }
  ```

- **`__resetForTests`**: also set `_queueOwner = 'none'; _previewToken = 0; clearPreviewTimer();`
- **Imports**: `Reciter` from `@/types/content`; `buildDownloadUrl` from `./archive/episodeResolver`; `usePreviewStore` from `@/store/previewStore`; `PREVIEW_MAX_SEC` and `type PreviewSource` from `@/constants/settings`.

**Step 4: Run and expect PASS.** `npx jest services/audioEngine` (the existing suites plus the new one) and tsc. The existing `audioEngine.test.ts` suites must pass unchanged. Its `getActiveTrack` default is `undefined`, so no owner gets adopted.

**Step 5: Commit.** `git commit -m "feat(audio): queue ownership and reciter previews that never touch the MiniPlayer"`

---

### Task 8: Sync bridge: drop MiniPlayer writes while a preview owns the queue

**Files:**
- Modify: `services/audioEngine/syncBridge.ts:30-67` (and update its header comment)
- Test: `services/audioEngine/__tests__/syncBridge.test.ts`. Mock the engine module and append cases. Do **not** add `progressStore` or `archiveClient` mocks: the engine module is mocked, so they would be dead.

**Step 1: Write the failing tests**

```ts
const mockStopPreview = jest.fn().mockResolvedValue(undefined);
let mockOwner: 'none' | 'lecture' | 'preview' = 'lecture';
jest.mock('../../audioEngine', () => ({
  getQueueOwner: () => mockOwner,
  stopReciterPreview: () => mockStopPreview(),
  PREVIEW_ERROR_MESSAGE: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
}));
import { usePreviewStore } from '@/store/previewStore';
```

In the existing top-level `beforeEach`, set `mockOwner = 'lecture'`. The existing tests then keep their meaning, because a lecture queue behaves exactly as before.

```ts
describe('while a reciter preview owns the queue', () => {
  beforeEach(() => { mockOwner = 'preview'; usePreviewStore.getState().begin('r3'); });
  afterEach(() => usePreviewStore.getState().clear());

  it('B1: ignores active-track changes (MiniPlayer keeps the user track)', () => {
    handlerFor(Event.PlaybackActiveTrackChanged)({ track: { id: 'preview:r3', url: 'u' } });
    expect(mockSetTrack).not.toHaveBeenCalled();
  });
  it('B2: ignores progress (no lecture tick into SQLite)', () => {
    handlerFor(Event.PlaybackProgressUpdated)({ position: 5, duration: 50 });
    expect(mockSetProgress).not.toHaveBeenCalled();
  });
  it('B3: never writes isPlaying', () => {
    handlerFor(Event.PlaybackState)({ state: State.Playing });
    handlerFor(Event.PlaybackState)({ state: State.Paused });
    expect(mockSetIsPlaying).not.toHaveBeenCalled();
  });
  it('B4: Stopped/None while loading (the preview\'s own reset) does not end it', () => {
    handlerFor(Event.PlaybackState)({ state: State.Stopped });
    handlerFor(Event.PlaybackState)({ state: State.None });
    expect(mockStopPreview).not.toHaveBeenCalled();
  });
  it.each([State.Paused, State.Stopped, State.Ended])('B5: %s while playing ends the preview', (s) => {
    usePreviewStore.getState().markPlaying('r3');
    handlerFor(Event.PlaybackState)({ state: s });
    expect(mockStopPreview).toHaveBeenCalled();
  });
  it('B6: queue end stops the preview and NEVER clears the MiniPlayer track', () => {
    handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
    expect(mockStopPreview).toHaveBeenCalled();
    expect(mockSetTrack).not.toHaveBeenCalled();
  });
  it('B7: an error stops the preview and shows the preview toast exactly once', () => {
    handlerFor(Event.PlaybackError)({ code: 'x', message: 'net' });
    expect(mockStopPreview).toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith({ message: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.' });
  });
});

describe('queue-end only clears the MiniPlayer for a lecture queue', () => {
  it('B8: owner none (e.g. a late event after a preview stopped) → ignored', () => {
    mockOwner = 'none';
    handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
    expect(mockSetTrack).not.toHaveBeenCalled();
    expect(mockStopPreview).not.toHaveBeenCalled();
  });
  it('B9: owner lecture → clears as before', () => {
    mockOwner = 'lecture';
    handlerFor(Event.PlaybackQueueEnded)({ track: 0, position: 50 });
    expect(mockSetTrack).toHaveBeenCalledWith(null);
  });
});
```

**Step 2: Run and expect FAIL.** `npx jest services/audioEngine/__tests__/syncBridge.test.ts`

**Step 3: Implement.** Import `{ getQueueOwner, stopReciterPreview, PREVIEW_ERROR_MESSAGE } from '../audioEngine'` and `usePreviewStore`. There is no import cycle: the engine does not import the bridge.

```ts
const previewOwns = () => getQueueOwner() === 'preview';
const endPreview = () => { stopReciterPreview().catch(() => undefined); };

// PlaybackState
if (previewOwns()) {
  const { status } = usePreviewStore.getState();
  if (status === 'playing' && (e.state === State.Paused || e.state === State.Stopped || e.state === State.Ended)) endPreview();
  return;
}
// ProgressUpdated, ActiveTrackChanged
if (previewOwns()) return;
// QueueEnded
if (previewOwns()) { endPreview(); return; }
if (getQueueOwner() !== 'lecture') return;   // spurious end — nothing of the user's to clear
store().setTrack(null); store().setIsPlaying(false);
// PlaybackError
if (previewOwns()) {
  Sentry.captureException(e instanceof Error ? e : new Error(`Preview error: ${JSON.stringify(e)}`));
  endPreview();
  useToastStore.getState().show({ message: PREVIEW_ERROR_MESSAGE });
  return;
}
```

**Step 4: Run and expect PASS.** `npx jest services/audioEngine` and tsc. **Step 5: Commit.** `git commit -m "fix(audio): keep reciter previews out of the MiniPlayer and progress log"`

---

### Task 9: UI facade `services/reciterPreview.ts`

**Files:**
- Create: `services/reciterPreview.ts`
- Test: `services/__tests__/reciterPreview.test.ts` (create)

**Step 1: Write the failing tests**

```ts
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockCanPreviewAudio = jest.fn().mockReturnValue(true);
jest.mock('@/services/audioEngine', () => ({
  PREVIEW_ERROR_MESSAGE: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
  canPreviewAudio: () => mockCanPreviewAudio(),
  startReciterPreview: (...a: unknown[]) => mockStart(...a),
  stopReciterPreview: () => mockStop(),
}));
const mockToastShow = jest.fn();
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({ show: mockToastShow }) } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
import { usePreviewStore } from '@/store/previewStore';
import { canPreview, previewSourceFor, stopPreview, toggleReciterPreview } from '@/services/reciterPreview';

const r = { id: 'r3', name: 'المنشاوي', style: 'murattal', styleLabel: 'x' } as const;
const S = { r3: { archiveId: 'Item_1', file: '001.mp3' } };
beforeEach(() => { jest.clearAllMocks(); mockCanPreviewAudio.mockReturnValue(true); usePreviewStore.getState().clear(); });

it('F1: previewSourceFor reads the verified map only', () => {
  expect(previewSourceFor(r, S)).toEqual(S.r3);
  expect(previewSourceFor({ ...r, archiveId: 'series' }, {})).toBeNull(); // a series id is not a file
});
it('F2: canPreview needs a source AND an engine that can preview', () => {
  expect(canPreview(r, {})).toBe(false);
  expect(canPreview(r, S)).toBe(true);
  mockCanPreviewAudio.mockReturnValue(false); // web, or a lecture owns the queue
  expect(canPreview(r, S)).toBe(false);
});
it('F3: toggling the active reciter stops it', async () => {
  usePreviewStore.getState().begin('r3');
  await toggleReciterPreview(r, S);
  expect(mockStop).toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
});
it('F4: toggling another reciter starts it with its verified source', async () => {
  await toggleReciterPreview(r, S);
  expect(mockStart).toHaveBeenCalledWith(r, S.r3);
});
it('F5: failure → Arabic network toast, never throws', async () => {
  mockStart.mockRejectedValueOnce(new Error('net'));
  await expect(toggleReciterPreview(r, S)).resolves.toBeUndefined();
  expect(mockToastShow).toHaveBeenCalledWith({ message: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.' });
});
it('F6: no source → nothing happens', async () => {
  await toggleReciterPreview(r, {});
  expect(mockStart).not.toHaveBeenCalled();
});
it('F7: stopPreview swallows engine errors', async () => {
  mockStop.mockRejectedValueOnce(new Error('bridge down'));
  await expect(stopPreview()).resolves.toBeUndefined();
});
```

**Step 2: FAIL. Step 3: Implement**

```ts
/**
 * services/reciterPreview.ts — UI-facing entry for reciter audio previews
 * (onboarding). Mirrors services/lecturePlayback.ts: call straight from onPress;
 * never throws; failures surface as an Arabic toast (root ToastOverlay).
 */
import * as Sentry from '@sentry/react-native';
import { ONBOARDING_RECITER_PREVIEW_SOURCES, type PreviewSource } from '@/constants/settings';
import {
  PREVIEW_ERROR_MESSAGE, canPreviewAudio, startReciterPreview, stopReciterPreview,
} from '@/services/audioEngine';
import { usePreviewStore } from '@/store/previewStore';
import { useToastStore } from '@/store/toastStore';
import type { Reciter } from '@/types/content';

type Sources = Readonly<Record<string, PreviewSource>>;

export function previewSourceFor(reciter: Reciter, sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES): PreviewSource | null {
  return sources[reciter.id] ?? null;
}

export function canPreview(reciter: Reciter, sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES): boolean {
  return canPreviewAudio() && previewSourceFor(reciter, sources) !== null;
}

export async function stopPreview(): Promise<void> {
  try { await stopReciterPreview(); } catch { /* best effort — the step is going away */ }
}

export async function toggleReciterPreview(reciter: Reciter, sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES): Promise<void> {
  if (usePreviewStore.getState().reciterId === reciter.id) return stopPreview();
  const source = previewSourceFor(reciter, sources);
  if (!source) return;
  try {
    await startReciterPreview(reciter, source);
  } catch (err) {
    Sentry.captureException(err);
    useToastStore.getState().show({ message: PREVIEW_ERROR_MESSAGE });
  }
}
```

**Step 4: PASS** plus tsc. **Step 5: Commit.** `git commit -m "feat(onboarding): reciter preview facade with an Arabic failure message"`

---

### Task 10: Selectable row slot contract + `PreviewButton`

**Files:**
- Modify: `constants/rtlContracts.ts`. Add after `RECITER_ROW_ORDER` (`:27-28`).
- Modify: `components/khazain/onboarding/SelectableRow.tsx` (`:8-101`)
- Create: `components/khazain/onboarding/PreviewButton.tsx`
- Modify: `__tests__/rtlPhysicalContract.test.ts:57-63`. Add `PreviewButton.tsx`.
- Test: `__tests__/rtlVisualContracts.test.ts` (append) and `__tests__/onboardingSteps.test.ts` (append)

**Step 1: Write the failing tests**

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
  it('the preview control is a SIBLING of the radio Pressable (VoiceOver can reach it)', () => {
    expect(row().match(/<Pressable/g)).toHaveLength(1);
    expect(row()).toMatch(/accessibilityRole="radio"/);
  });
  it('padding and minHeight stay on the select Pressable; the card View carries only chrome', () => {
    const src = row();
    const card = /card:\s*\{([^}]*)\}/.exec(src)?.[1] ?? '';
    const select = /select:\s*\{([^}]*)\}/.exec(src)?.[1] ?? '';
    expect(select).toMatch(/minHeight:\s*64/);
    expect(select).toMatch(/paddingVertical:\s*12/);
    expect(select).toMatch(/paddingHorizontal:\s*16/);
    expect(card).not.toMatch(/padding|minHeight/);
    expect(card).toMatch(/borderRadius:\s*16/);
    expect(card).toMatch(/backgroundColor/);
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

**Step 2: FAIL. Step 3: Implement**

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

`SelectableRow.tsx`:
- Add `preview?: React.ReactNode` to `Props`.
- The outer `View` is the card, with `styles.card` plus `KhazainShadows.card` plus `selected ? styles.cardSelected : null`. `card` is `{ ...PHYSICAL_ROW, alignItems: 'center', borderRadius: 16, backgroundColor: KhazainColors.cardBg, borderWidth: 1, borderColor: KhazainColors.cardBorder }`, with **no padding and no minHeight**. `cardSelected` keeps today's `rowSelected` values.
- The `select` slot is the existing `Pressable`, with **the same props and children as today** (radio role, state, label, pressed scale, tick → text). Its style is `select: { ...PHYSICAL_ROW, flex: 1, alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 16 }`.
- The `preview` slot is `preview ? <View style={styles.previewSlot}>{preview}</View> : null`, with `previewSlot: { marginLeft: 12 }`. That is a physical left, legal inside the pinned row.
- Render `SELECTABLE_ROW_ORDER.map((slot) => <React.Fragment key={slot}>{slots[slot]}</React.Fragment>)`.

`QiraaStep` passes no `preview`, so its rows are pixel-identical to today: same padding, minHeight, border and shadow. Keep the doc comment, and add a note explaining the sibling structure.

**Step 4: Run and expect PASS.** `npx jest __tests__/rtlVisualContracts.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/onboardingSteps.test.ts` and tsc.

**Step 5: Commit.** `git commit -m "feat(onboarding): selectable row gains a sibling preview control in a pinned slot order"`

---

### Task 11: Wire previews into the reciter step and stop them on every exit

**Files:**
- Modify: `components/khazain/onboarding/ReciterStep.tsx`:
  - replace the doc comment at `:11-16`;
  - list `selectOnboardingReciters(...)` instead of `data` at `:42`;
  - pass `preview`;
  - add the cleanup effects.
- Modify: `app/onboarding.tsx`. Make `void stopPreview();` the **first statement** of `goTo` (`:110-115`) and of `finish` (`:117-120`). `onSkip` reaches `finish`.
- Test: `__tests__/onboardingSteps.test.ts` (append)

**Step 1: Write the failing tests**

```ts
describe('reciter step previews (ticket QTQYqLBB: popular reciters with audio previews)', () => {
  const step = () => code('components/khazain/onboarding/ReciterStep.tsx');
  it('lists the verified reciters (plus the current pick), not the whole catalogue', () => {
    expect(step()).toMatch(/selectOnboardingReciters\(/);
    expect(step()).toMatch(/ONBOARDING_POPULAR_RECITER_IDS/);
  });
  it('renders a preview control only when the reciter can be previewed', () => {
    expect(step()).toMatch(/canPreview\(/);
    expect(step()).toMatch(/toggleReciterPreview\(/);
  });
  it('stops the preview on unmount', () => {
    expect(step()).toMatch(/useEffect\(\(\) => \(\) => \{\s*void stopPreview\(\);\s*\},\s*\[\]\)/);
  });
  it('stops the preview when the app leaves the foreground', () => {
    expect(step()).toMatch(/AppState\.addEventListener\('change'/);
  });
  it('no longer claims previews are deferred', () => {
    expect(fs.readFileSync(path.join(ROOT, 'components/khazain/onboarding/ReciterStep.tsx'), 'utf8')).not.toMatch(/deferred \(FR-006\)/);
  });
  it('the screen stops any preview first thing on step change and on finish (skip → finish)', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/const goTo = [^{]*\{\s*void stopPreview\(\);/);
    expect(src).toMatch(/const finish = [^{]*\{\s*void stopPreview\(\);/);
  });
});
```

**Step 2: FAIL. Step 3: Implement**

```tsx
// ReciterStep.tsx (additions)
const previewId = usePreviewStore((s) => s.reciterId);
const previewStatus = usePreviewStore((s) => s.status);
const reciters = useMemo(
  () => selectOnboardingReciters(data, ONBOARDING_POPULAR_RECITER_IDS, selectedId),
  [data, selectedId],
);

// Stop on unmount — step change, skip and finish all unmount this step.
useEffect(() => () => { void stopPreview(); }, []);

// Stop when backgrounded: a sample must not keep playing behind the lock screen.
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

The unmount effect has `[]` deps, so selecting a reciter (which changes `selectedId`) never stops a preview. That is intended.

Replace the doc comment with: "Onboarding reciter step: the reciters with a verified Al-Fatiha preview (`ONBOARDING_POPULAR_RECITER_IDS`) plus the user's current pick, each previewable row with a play/stop control (design 2026-10-21 §4.3). Selecting and previewing are separate controls; previewing never changes `preferredReciterId`."

**Step 4: Run and expect PASS.** `npx jest __tests__/onboardingSteps.test.ts __tests__/rtlPhysicalContract.test.ts` and tsc.

**Step 5: Commit.** `git commit -m "feat(onboarding): audio previews on the reciter step, stopped on every exit"`

---

### Task 12 (CONDITIONAL): Reconcile with the Expo Go guard

**Run only if** `git merge-base --is-ancestor 6e9d60d HEAD` succeeds when this task comes up. Otherwise skip it, and note in the PR: "once the Expo Go guard merges, `canPreviewAudio` becomes `!isInert() && _queueOwner !== 'lecture'`, and start/stop short-circuit on `isInert()`."

**Files:** `services/audioEngine.ts` (the preview section), `services/audioEngine/__tests__/inert.test.ts`

1. **Failing test** (with `nativeAudioAvailable` mocked false):
   - `expect(engine.canPreviewAudio()).toBe(false)`;
   - `startReciterPreview` resolves without calling `TrackPlayer.add`;
   - no toast is shown. The button is simply hidden.
2. Run it and confirm it FAILS.
3. Implement: `isWeb()` becomes `isInert()` in `canPreviewAudio`, `startReciterPreview` and `stopReciterPreview`.
4. `npx jest services/audioEngine` PASSES, and tsc is clean.
5. Commit: `git commit -m "fix(audio): hide reciter previews when the native audio module is absent"`

---

### Task 13: Full verification, visual QA, and PR source sign-off

**Step 1: Automated checks**

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "app/onboarding|components/khazain/onboarding|services/(audioEngine|reciterPreview|onboardingReciters)|store/(previewStore|settingsStore)|constants/(settings|rtlContracts)" -A 2
grep -rn "FeatureStep\|FEATURE_STEPS\|deferred (FR-006)\|pickPreviewEpisode\|_drainUntil" app components services constants __tests__
```

Expected results:
- jest: everything passes.
- tsc: 0 errors.
- The lint grep prints nothing. The `app/(tabs)/browse.tsx:603` errors are known and out of scope.
- The last grep prints nothing.

**Step 2: Visual QA on the iOS simulator**

Use argent: `list-devices`, then the `argent-ios-simulator-setup` skill, then `argent-react-native-app-workflow`. Take tap targets from `describe` or `debugger-component-tree`, never from screenshot pixels. Start from a fresh state: either a fresh install, or More → الإعدادات → "إعادة الإعداد الأولي" (`app/(tabs)/more/settings.tsx:261-264`, which is `__DEV__` only).

**No Figma frame covers onboarding.** Compare each screen against the contract named in the table, not a reference PNG, and never write "matches Figma".

| # | Route / state | Compare against | Must hold |
|---|---|---|---|
| A1 | `/onboarding` step 1/4, Welcome | no frame: `constants/layout.ts` (`PHYSICAL_ROW`, `RTL_TEXT`), Khazain tokens | FoundationMark (user-approved deviation), Wordmark, mission, and 4 highlight rows with the gold bullet at the **physical right**; **4** progress dots; skip reachable |
| A2 | Welcome at 320 pt × font scale 1.7 (`scripts/visual-audit/screen-matrix.mjs`) | same | scrolls; nothing clipped under the footer or the status bar |
| A3 | step 2/4, Qira'a | no frame: `SELECTABLE_ROW_ORDER` | rows **pixel-identical to before** (padding, minHeight 64, border, shadow); no preview button |
| A4 | step 3/4, Reciter | no frame: `SELECTABLE_ROW_ORDER`, `MIN_TOUCH_TARGET` | exactly the verified reciters, plus the current pick (default `r7`) **without** a button; the preview button at the **physical left**; title still at the right edge |
| A5 | step 4/4, Channels | no frame: unchanged `ChannelsStep` | Telegram, YouTube and WhatsApp CTAs open; "ابدأ" finishes onboarding |
| A6 | Transitions | `app/onboarding.tsx:53-108` | 280 ms slide+fade; instant with Reduce Motion on |
| A7 | VoiceOver on step 3 | a11y | the radio row and the preview button are separate focus stops, with the Arabic labels |

| # | Preview action | Expect |
|---|---|---|
| B1 | Tap play on row A | spinner, then audio, then the pause glyph; A is **not** selected |
| B2 | Tap play on B while A plays | A stops and B plays; only one sound at a time |
| B3 | Wait 30 s | the preview stops by itself and the button returns to play |
| B4 | Play, then back / next / skip / finish | audio stops immediately in each case |
| B5 | Play, then background the app | audio stops |
| B6 | Airplane mode, then tap play | Arabic toast `تعذّر تشغيل العيّنة…`; the button returns to play; no crash |
| B7 | Cold start with an in-progress lecture **restored but not played**, then reset onboarding, preview a reciter to the end, then finish | the MiniPlayer still shows **that lecture**; play resumes it at the saved position; Library shows it **not** completed; no preview session appears in progress |
| B8 | Play a lecture in the tabs, then reset onboarding and open step 3 | **no preview buttons**. This is by design: the lecture owns the queue. |
| B9 | Kill the app on step 3, then relaunch | resumes on step 3/4 |
| B10 | **Android:** start a preview, then swipe the app away | accepted: the whole Al-Fatiha may play (`ContinuePlayback`); on relaunch the MiniPlayer shows no preview track |

**Step 3: Migration spot-check.** Write `{"state":{"onboardingComplete":false,"onboardingStep":6,"schemaVersion":3},"version":0}` into the simulator container, using the same mechanism as `scripts/visual-audit/skip-onboarding-ios.sh:19`. The app should launch on step 4/4 (Channels) without crashing.

**Step 4: Record the results** in `docs/plans/2026-10-21-onboarding-flow-gaps-qa.md`. Put screenshots under `docs/audit/2026-10-21/onboarding/` (untracked). Commit the QA doc: `git commit -m "docs(qa): onboarding flow gaps verification"`

**Step 5: PR sign-off (user decision Q1).** The PR description must:
- include the Task 4 verification table (`$SCRATCH/preview-sources.md`), with item id, file, download URL and evidence for each verified reciter, plus the rejected candidates and their reasons;
- ask the user to sign off on the sources **before merge**;
- record the FoundationMark deviation as user-approved (Q6).

**Step 6: Session cleanup.** Call `stop-all-simulator-servers` with `devices: [<the udid used>]`.

---

## Preview source verification (Task 4, 2026-10-21) — for the PR, user sign-off before merge

Method: `curl https://archive.org/metadata/<id>` + `jq` for criteria (a)-(d); `curl -sIL` on the URL exactly as `buildDownloadUrl` builds it for (e). Additionally each shipped file was downloaded and probed (`afinfo` / `ffprobe`) for decoded duration and ID3 tags.

### Verified (shipped, in display order)

| Reciter | Item id | File | Creator / title evidence | Track / title | Length | Size | HTTP / content-type | Download URL |
|---|---|---|---|---|---|---|---|---|
| `r3` الشيخ محمد صديق المنشاوي | `Minshawi_Morattal_FullQuran` | `001.Al-Fatihah.mp3` (source: original) | title "القرآن الكريم كاملا الشيخ محمد صديق المنشاوي - المصحف المرتل - برواية حفص عن عاصم"; ID3 artist "Muhammad Siddiq Al-Minshawi" | track `01`, title `Al-Fatihah` | 51.97 s (decoded 51.97 s) | 1,071,502 B (128 kbps) | 302 → 200 `audio/mpeg`, content-length matches | https://archive.org/download/Minshawi_Morattal_FullQuran/001.Al-Fatihah.mp3 |
| `r12` الشيخ مشاري راشد العفاسي | `mishari-rashid-al-afasy-quran-mp3` | `001.mp3` (source: original) | creator "Mishari Rashid Al Afasy"; title "Mishary bin Rashid Alafasy Complete Quran MP3"; ID3 artist "Alafasy" | track `01`, name `001` | 52.06 s (decoded 52.04 s) | 682,391 B (64 kbps) | 302 → 200 `audio/mpeg`, content-length matches | https://archive.org/download/mishari-rashid-al-afasy-quran-mp3/001.mp3 |
| `r2` الشيخ محمود خليل الحصري | `QuranRecitation-Husary` | `001.Fatiha.mp3` (source: original) | title "Qur'an recitation - Husary"; subject "Husary Mahmood Mahmud Husari" (creator field is the uploader "Abdullhadi"; no ID3 tags) | name `001.Fatiha` (no track field) | 54.91 s (decoded 54.83 s) | 439,159 B (64 kbps, ≈ 8.0 KB/s — at the floor of criterion d) | 302 → 200 `audio/mpeg`, content-length matches | https://archive.org/download/QuranRecitation-Husary/001.Fatiha.mp3 |

**Flag for sign-off (r2):** it passes all five criteria, but its provenance is the weakest of the three (forum uploader, reciter named only in the title/subject, no ID3 artist). Also, the catalogue labels `r2` as المصحف المجوّد, while a ~55 s Al-Fatiha is consistent with Husary's murattal recording — fine for a voice sample, but worth a listen before merge. Dropping it is a one-line removal from `ONBOARDING_RECITER_PREVIEW_SOURCES`.

### Candidates not used

| Reciter | Item id | File checked | Result | Reason not shipped |
|---|---|---|---|---|
| `r3` | `mos7af_Siddeeq_al_Minshawi` | `001.mp3` (track `1/114`, title "001- Al-Fatiha", length 52.42 s) | 302 → 200 `audio/mpeg` | Not needed — the first candidate passed (plan: take the first passing candidate). Also weaker on (d): metadata size 262,144 B for 52 s (≈ 5 KB/s, a suspiciously round 2^18), below the ~8 KB/s floor. Rejected. |
| `r12` | `afasyrecitation` | `001 - Al-Fatihah.mp3` (length "00:51", size 1,019,438 B) | 302 → 200 `audio/mpeg` | Not needed — the first candidate passed. Also the mp3 is a `derivative` (the original is `.ogg`), and the item has no creator field; the plan prefers `source: original`. |

## Deviations

- **Task 3:** the Step-4 grep (`grep -rn "FeatureStep\|FEATURE_STEPS" … __tests__`) is not empty: it matches the new `__tests__/onboardingSteps.test.ts` assertions that prove FeatureStep is gone. No product code references remain.
- **Task 4:** the verification table lives here (committed) instead of only in `$SCRATCH/preview-sources.md`, at the coordinator's request, so it can be pasted into the PR. All three candidate reciters verified, so the preview list is `r3, r12, r2`.
