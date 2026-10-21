# Saved Content & Bookmarks — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Follow the repo workflow in `CLAUDE.md` §4. Each task gets a fresh implementer subagent with the full task text inline, then a spec-compliance review, then a code-quality review.

**Goal:** Close the audit gaps on the "Saved Content & Bookmarks System" ticket:
- every lecture becomes saveable, without changing Figma frames 18–24
- undo restores the original entry
- the Library saved list is newest-first across groups
- the saved system gets test coverage

**Architecture:**
- All save, unsave and undo behaviour moves into one pure-ish service, `services/savedToggle.ts`. `BookmarkButton` calls it, and so does a new `useSaveGesture` hook, which gives lecture rows long-press save, a VoiceOver/TalkBack custom action, and a bookmark that appears only once the lecture is saved.
- The store gains `restore()` so undo can put an item back with its original timestamp and position.
- Grouping moves into `constants/savedPresentation.ts` and orders groups by recency.

**Revision:** v2 applies the CTO review (APPROVE WITH CHANGES) and the user's approval of long-press-to-save:
- **Accessibility:** the hint depends on saved state, the row carries `accessibilityValue`, and the custom action announces its result.
- **Pure builder:** `saveGestureProps` in `services/savedToggle.ts` is unit-tested, and only one wiring regex remains for `LectureCard`.
- **QA hygiene:** QA compares against the existing baseline, ends with a teardown step, and the harness README gains a precondition.
- **Corrected icon position:** the saved icon sits between the duration and the title.
- **Recorded shift:** the empty-state hint adds one line on frame 06.
- **Accepted optional changes:**
  - `RibbonCard` memoises its target
  - telemetry logs `restore` as its own action

**Design:** `docs/plans/2026-10-21-saved-content-bookmarks-design.md`. Read §1.1 for why lecture rows can't show an always-on icon, and §5/§6 for the surah-list and group-order decisions.

**Tech stack:**
- Expo SDK 54, RN 0.81.5, React 19.1, TypeScript 5.9
- Zustand 5 with `persist` and AsyncStorage
- jest-expo; tests live under `__tests__/` and match `**/__tests__/**/*.test.ts(x)`
- `expo-haptics`, already declared in `package.json:35`

**Hard constraints:**
- No new dependencies. `react-test-renderer` is in `node_modules` but not in `package.json`, so it counts as new: **no component render tests**. Test behaviour through pure modules, and test wiring through source-contract tests in the style of `__tests__/miniPlayerReach.test.ts`.
- Don't touch legacy files (`app/(tabs)/saved.tsx` etc.).
- Commits must carry no `Co-Authored-By` or AI attribution. Never use `--no-verify`.

Shared commands:
```bash
cd /Users/ahmedelhadarey/samer/khazayin-worktrees/saved
npx jest <file>                      # one test file
npx tsc --noEmit --pretty false      # type-check
```

---

### Task 1: Characterisation tests for `savedStore` (G5)

These tests pin today's behaviour so later tasks can't regress it. They are expected to **pass on first run**. This task is coverage, not new behaviour. If any of them fails, stop and report: it would mean the audit misread the store.

**Files:**
- Create: `__tests__/savedStore.test.ts`
- Read only: `store/savedStore.ts:103-169`, `types/content.ts:162-187`

**Step 1: Write the tests**

```ts
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushSavedWritesNow, useSavedStore } from '../store/savedStore';
import type { SavedItem, SavedSnapshot } from '../types/content';

const LECTURE: SavedSnapshot = {
  type: 'lecture', title: 'السيرة النبوية', scholar: 'الشيخ عبد المحسن العباد',
  duration: '٣٢ دقيقة', category: 'prophet',
};
const SCHOLAR: SavedSnapshot = { type: 'scholar', name: 'عبد العزيز بن باز' };

let now = 1_000;
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useSavedStore.setState({ items: [] });
  now = 1_000;
});
afterEach(() => jest.restoreAllMocks());

const saveAt = (t: number, type: SavedItem['type'], id: string, snap: SavedSnapshot) => {
  now = t;
  useSavedStore.getState().save(type, id, snap);
};

describe('savedStore', () => {
  it('save stores a composite id, the entity id, the snapshot and a Date.now() timestamp', () => {
    saveAt(1_234, 'lecture', 'p1', LECTURE);
    expect(useSavedStore.getState().items).toEqual([
      { id: 'lecture:p1', type: 'lecture', entityId: 'p1', savedAt: 1_234, snapshot: LECTURE },
    ]);
  });

  it('keeps the newest save first', () => {
    saveAt(1, 'lecture', 'p1', LECTURE);
    saveAt(2, 'scholar', 's4', SCHOLAR);
    expect(useSavedStore.getState().items.map((i) => i.id)).toEqual(['scholar:s4', 'lecture:p1']);
  });

  it('re-saving an existing item moves it to the front with a fresh timestamp', () => {
    saveAt(1, 'lecture', 'p1', LECTURE);
    saveAt(2, 'scholar', 's4', SCHOLAR);
    saveAt(3, 'lecture', 'p1', LECTURE);
    const items = useSavedStore.getState().items;
    expect(items.map((i) => i.id)).toEqual(['lecture:p1', 'scholar:s4']);
    expect(items[0].savedAt).toBe(3);
  });

  it('unsave removes the item and returns it', () => {
    saveAt(5, 'lecture', 'p1', LECTURE);
    const removed = useSavedStore.getState().unsave('lecture', 'p1');
    expect(removed).toMatchObject({ id: 'lecture:p1', savedAt: 5 });
    expect(useSavedStore.getState().items).toEqual([]);
  });

  it('unsave of an unknown item returns null and changes nothing', () => {
    saveAt(5, 'lecture', 'p1', LECTURE);
    expect(useSavedStore.getState().unsave('lecture', 'nope')).toBeNull();
    expect(useSavedStore.getState().items).toHaveLength(1);
  });

  it('isSaved and getByType reflect the store', () => {
    saveAt(1, 'lecture', 'p1', LECTURE);
    saveAt(2, 'scholar', 's4', SCHOLAR);
    expect(useSavedStore.getState().isSaved('lecture', 'p1')).toBe(true);
    expect(useSavedStore.getState().isSaved('lecture', 's4')).toBe(false);
    expect(useSavedStore.getState().getByType('scholar').map((i) => i.entityId)).toEqual(['s4']);
  });

  it('caps the library at 500 items, dropping the oldest', () => {
    for (let i = 0; i < 501; i++) saveAt(i, 'lecture', `l${i}`, LECTURE);
    const items = useSavedStore.getState().items;
    expect(items).toHaveLength(500);
    expect(items[0].entityId).toBe('l500');
    expect(items.some((it) => it.entityId === 'l0')).toBe(false);
  });

  it('persists to AsyncStorage under @khazain/saved', async () => {
    (AsyncStorage.setItem as jest.Mock).mockClear();
    saveAt(7, 'lecture', 'p1', LECTURE);
    await flushSavedWritesNow();
    const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)!;
    expect(key).toBe('@khazain/saved');
    expect(JSON.parse(value).state.items[0]).toMatchObject({ id: 'lecture:p1', savedAt: 7 });
  });

  it('rehydrates saved items after a restart', async () => {
    const persisted: SavedItem = { id: 'lecture:p1', type: 'lecture', entityId: 'p1', savedAt: 9, snapshot: LECTURE };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ state: { items: [persisted] }, version: 1 }),
    );
    await useSavedStore.persist.rehydrate();
    expect(useSavedStore.getState().items).toEqual([persisted]);
  });
});
```

**Step 2: Run.** `npx jest __tests__/savedStore.test.ts`. Expected: 9 passing.

**Step 3: Commit.**
```bash
git add __tests__/savedStore.test.ts
git commit -m "test(saved): pin savedStore save, unsave, cap and persistence behaviour"
```

---

### Task 2: `savedStore.restore()` keeps the original timestamp and position (G3, store half)

**Files:**
- Modify: `store/savedStore.ts`
  - `logSavedToggle` `:95`: widen `action` to `'save' | 'unsave' | 'restore'`
  - interface `:104-125`: add `restore`
  - implementation after `unsave` `:146-153`
  - header JSDoc `:1-16`: mention restore and its behaviour at the cap
- Test: `__tests__/savedStore.test.ts` (append)

**Step 1: Write the failing tests.** Append inside the `describe`:

```ts
  it('restore puts an unsaved item back at its original index with its original savedAt', () => {
    saveAt(1, 'lecture', 'a', LECTURE);
    saveAt(2, 'lecture', 'b', LECTURE);
    saveAt(3, 'lecture', 'c', LECTURE);           // order: c, b, a
    const removed = useSavedStore.getState().unsave('lecture', 'b')!;
    now = 99;                                       // undo happens later
    useSavedStore.getState().restore(removed);
    const items = useSavedStore.getState().items;
    expect(items.map((i) => i.entityId)).toEqual(['c', 'b', 'a']);
    expect(items[1]).toBe(removed);                 // same entry, not a re-stamped copy
    expect(items[1].savedAt).toBe(2);
  });

  it('restore of the oldest item appends it', () => {
    saveAt(1, 'lecture', 'a', LECTURE);
    saveAt(2, 'lecture', 'b', LECTURE);
    const removed = useSavedStore.getState().unsave('lecture', 'a')!;
    useSavedStore.getState().restore(removed);
    expect(useSavedStore.getState().items.map((i) => i.entityId)).toEqual(['b', 'a']);
  });

  it('restore into an empty library', () => {
    saveAt(4, 'scholar', 's4', SCHOLAR);
    const removed = useSavedStore.getState().unsave('scholar', 's4')!;
    useSavedStore.getState().restore(removed);
    expect(useSavedStore.getState().items).toEqual([removed]);
  });

  it('restore is a no-op when the item is already saved', () => {
    saveAt(1, 'lecture', 'a', LECTURE);
    const stale = { ...useSavedStore.getState().items[0], savedAt: 0 };
    useSavedStore.getState().restore(stale);
    expect(useSavedStore.getState().items).toHaveLength(1);
    expect(useSavedStore.getState().items[0].savedAt).toBe(1);
  });

  it('restore logs its own telemetry action', () => {
    saveAt(1, 'lecture', 'a', LECTURE);
    const removed = useSavedStore.getState().unsave('lecture', 'a')!;
    useSavedStore.getState().restore(removed);
    expect(console.log).toHaveBeenLastCalledWith(
      '[khazayin]',
      { context: 'saved-toggle', action: 'restore', type: 'lecture', total: 1 },
    );
  });
```

**Step 2: Run** `npx jest __tests__/savedStore.test.ts`. Expected: FAIL with `restore is not a function`. TS may also complain that `restore` does not exist on `SavedState`.

**Step 3: Implement.** In the interface:

```ts
  /** Re-inserts a previously removed item UNCHANGED (original savedAt and
   *  snapshot) at the position its savedAt implies — i.e. where it was before
   *  unsave(). No-op if an item with the same id is already present. Used by
   *  the unsave toast's undo. At the 500 cap the oldest entry is dropped, which
   *  can be the restored item itself. */
  restore(item: SavedItem): void;
```

In the store body, after `unsave`:

```ts
      restore: (item) => {
        if (get().items.some((it) => it.id === item.id)) return;
        set((s) => {
          const at = s.items.findIndex((it) => it.savedAt < item.savedAt);
          const next = at === -1
            ? [...s.items, item]
            : [...s.items.slice(0, at), item, ...s.items.slice(at)];
          return { items: next.length > MAX_ITEMS ? next.slice(0, MAX_ITEMS) : next };
        });
        logSavedToggle('restore', item.type, get().items.length);
      },
```

Widen the logger's signature at `:95`: `function logSavedToggle(action: 'save' | 'unsave' | 'restore', type: SavedType, total: number)`.

**Step 4: Run** `npx jest __tests__/savedStore.test.ts`. Expected: 14 passing. Then run `npx tsc --noEmit --pretty false`. Expected: no new errors.

**Step 5: Commit.**
```bash
git add store/savedStore.ts __tests__/savedStore.test.ts
git commit -m "feat(saved): restore an unsaved item with its original timestamp and position"
```

---

### Task 3: `services/savedToggle.ts`: one toggle path with undo that restores, and the pure gesture/a11y builder (G3, UI half)

**Files:**
- Create: `services/savedToggle.ts`
- Modify: `components/khazain/primitives/BookmarkButton.tsx`
  - imports `:1-6`: drop `useToastStore`
  - header JSDoc `:8-27`
  - `onPress` `:51-81`
- Test: `__tests__/savedToggle.test.ts` (new)
- Test: `__tests__/savedWiring.test.ts` (new; extended in Tasks 4–6)

**Step 1: Write the failing tests.**

`__tests__/savedToggle.test.ts`:

```ts
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

import { AccessibilityInfo, type AccessibilityActionEvent } from 'react-native';
import {
  lectureSaveTarget, saveGestureProps, SAVE_ACTION_NAME, SAVE_TOAST_MS,
  SAVED_COPY, toggleSaved, UNSAVE_TOAST_MS, type SaveTarget,
} from '../services/savedToggle';
import { useSavedStore } from '../store/savedStore';
import { useToastStore } from '../store/toastStore';

const target = (id: string): SaveTarget => lectureSaveTarget({
  id, title: 'غزوة بدر', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'prophet',
});

let now = 1_000;
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useSavedStore.setState({ items: [] });
  useToastStore.setState({ current: null });
});
afterEach(() => jest.restoreAllMocks());

describe('toggleSaved', () => {
  it('saves an unsaved target, returns true and shows the 3s Arabic save toast with undo', () => {
    expect(toggleSaved(target('p1'))).toBe(true);
    expect(useSavedStore.getState().isSaved('lecture', 'p1')).toBe(true);
    const toast = useToastStore.getState().current!;
    expect(toast.message).toBe('تمت الإضافة إلى المحفوظات');
    expect(toast.durationMs).toBe(SAVE_TOAST_MS);
    expect(toast.action?.label).toBe('تراجع');
  });

  it('the save toast undo removes the item again', () => {
    toggleSaved(target('p1'));
    useToastStore.getState().current!.action!.onPress();
    expect(useSavedStore.getState().items).toEqual([]);
  });

  it('unsaves a saved target, returns false and shows the 5s Arabic unsave toast with undo', () => {
    toggleSaved(target('p1'));
    expect(toggleSaved(target('p1'))).toBe(false);
    expect(useSavedStore.getState().isSaved('lecture', 'p1')).toBe(false);
    const toast = useToastStore.getState().current!;
    expect(toast.message).toBe('تم الحذف من المحفوظات');
    expect(toast.durationMs).toBe(UNSAVE_TOAST_MS);
    expect(toast.action?.label).toBe('تراجع');
  });

  it('the unsave toast undo restores the original entry at its original position', () => {
    now = 1; toggleSaved(target('a'));
    now = 2; toggleSaved(target('b'));
    now = 3; toggleSaved(target('c'));            // c, b, a
    now = 4; toggleSaved(target('b'));            // unsave b
    now = 50; useToastStore.getState().current!.action!.onPress();
    const items = useSavedStore.getState().items;
    expect(items.map((i) => i.entityId)).toEqual(['c', 'b', 'a']);
    expect(items[1].savedAt).toBe(2);
  });
});

describe('saveGestureProps', () => {
  const action = (actionName: string) => ({ nativeEvent: { actionName } }) as AccessibilityActionEvent;
  let announce: jest.SpyInstance;
  beforeEach(() => {
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    // jest-expo already mocks this as a jest.fn, so spyOn reuses it and
    // restoreAllMocks does not reset its calls — clear them per test.
    announce.mockClear();
  });

  it('wires long-press to onToggle', () => {
    const onToggle = jest.fn(() => true);
    const props = saveGestureProps(false, onToggle);
    expect(props.onLongPress).toBeDefined();
    props.onLongPress!({} as never);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('the toggleSave custom action calls onToggle exactly once and announces the result', () => {
    const onSave = jest.fn(() => true);
    saveGestureProps(false, onSave).onAccessibilityAction!(action(SAVE_ACTION_NAME));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('تمت الإضافة إلى المحفوظات');

    const onUnsave = jest.fn(() => false);
    saveGestureProps(true, onUnsave).onAccessibilityAction!(action(SAVE_ACTION_NAME));
    expect(onUnsave).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('تم الحذف من المحفوظات');
  });

  it('activate and longpress actions do not toggle (a double-tap still plays)', () => {
    const onToggle = jest.fn(() => true);
    const props = saveGestureProps(false, onToggle);
    props.onAccessibilityAction!(action('activate'));
    props.onAccessibilityAction!(action('longpress'));
    expect(onToggle).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it('labels, hint and value flip with saved state', () => {
    const unsaved = saveGestureProps(false, () => true);
    expect(unsaved.accessibilityActions).toEqual([{ name: SAVE_ACTION_NAME, label: 'حفظ في المكتبة' }]);
    expect(unsaved.accessibilityHint).toBe('اضغط مطوّلاً للحفظ في المكتبة');
    expect(unsaved.accessibilityValue).toEqual({ text: undefined });

    const saved = saveGestureProps(true, () => false);
    expect(saved.accessibilityActions).toEqual([{ name: SAVE_ACTION_NAME, label: 'إزالة من المحفوظات' }]);
    expect(saved.accessibilityHint).toBe('اضغط مطوّلاً للإزالة من المحفوظات');
    expect(saved.accessibilityValue).toEqual({ text: 'محفوظة' });
  });
});

describe('lectureSaveTarget', () => {
  it('builds a lecture snapshot and defaults missing scholar/duration to empty strings', () => {
    expect(lectureSaveTarget({ id: 'ab1', title: 'كتاب صوتي', category: 'general' })).toEqual({
      type: 'lecture', entityId: 'ab1',
      snapshot: { type: 'lecture', title: 'كتاب صوتي', scholar: '', duration: '', category: 'general' },
    });
  });

  it('exposes Arabic copy only', () => {
    for (const s of Object.values(SAVED_COPY)) expect(s).toMatch(/[؀-ۿ]/);
  });
});
```

`__tests__/savedWiring.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

/**
 * Source contracts for the saved system's wiring. Behaviour is tested through
 * services/savedToggle and constants/savedPresentation; these pin WHO calls
 * them, which no pure test can see. Design: 2026-10-21-saved-content-bookmarks.
 */
const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('BookmarkButton', () => {
  const src = read('components/khazain/primitives/BookmarkButton.tsx');
  it('delegates to the single toggle path', () => {
    expect(src).toMatch(/toggleSaved\(\{ type, entityId, snapshot \}\)/);
  });
  it('no longer re-saves on undo (which restamped savedAt)', () => {
    expect(src).not.toMatch(/\.save\(removed\./);
    expect(src).not.toMatch(/useToastStore/);
  });
});
```

**Step 2: Run** `npx jest __tests__/savedToggle.test.ts __tests__/savedWiring.test.ts`. Expected: FAIL. `Cannot find module '../services/savedToggle'`, and the BookmarkButton contract fails.

**Step 3: Implement** `services/savedToggle.ts`:

```ts
/**
 * services/savedToggle.ts
 * -----------------------
 * The ONE save/unsave path. BookmarkButton (tap) and useSaveGesture (long-press
 * and the screen-reader custom action) both call toggleSaved, so the two
 * affordances cannot drift apart. saveGestureProps is the pure builder for a
 * saveable row's Pressable props (the hook only adds a haptic).
 *
 *   save   → toast SAVED_COPY.saved   (3s) — undo = unsave   (Board condition #3)
 *   unsave → toast SAVED_COPY.removed (5s) — undo = restore  (Board condition #6)
 *
 * Undo after unsave calls savedStore.restore(), which keeps the original
 * savedAt and position. It used to call save(), which restamped the item.
 *
 * Imports the stores directly (not the @/store barrel) so tests stay off SQLite.
 */
import { AccessibilityInfo, type AccessibilityActionEvent, type PressableProps } from 'react-native';
import { useSavedStore } from '@/store/savedStore';
import { useToastStore } from '@/store/toastStore';
import type { Lecture, SavedSnapshot, SavedType } from '@/types/content';

export interface SaveTarget {
  type: SavedType;
  entityId: string;
  snapshot: SavedSnapshot;
}

export const SAVED_COPY = Object.freeze({
  saved: 'تمت الإضافة إلى المحفوظات',
  removed: 'تم الحذف من المحفوظات',
  undo: 'تراجع',
  saveLabel: 'حفظ في المكتبة',
  unsaveLabel: 'إزالة من المحفوظات',
  saveHint: 'اضغط مطوّلاً للحفظ في المكتبة',
  unsaveHint: 'اضغط مطوّلاً للإزالة من المحفوظات',
  savedValue: 'محفوظة',
});

export const SAVE_TOAST_MS = 3000;
export const UNSAVE_TOAST_MS = 5000;
export const SAVE_ACTION_NAME = 'toggleSave';

/** Toggles `target` and shows the matching undo toast. Returns the new saved state. */
export function toggleSaved(target: SaveTarget): boolean {
  const { type, entityId, snapshot } = target;
  const saved = useSavedStore.getState();

  if (saved.isSaved(type, entityId)) {
    const removed = saved.unsave(type, entityId);
    if (removed !== null) {
      useToastStore.getState().show({
        message: SAVED_COPY.removed,
        durationMs: UNSAVE_TOAST_MS,
        action: { label: SAVED_COPY.undo, onPress: () => useSavedStore.getState().restore(removed) },
      });
    }
    return false;
  }

  saved.save(type, entityId, snapshot);
  useToastStore.getState().show({
    message: SAVED_COPY.saved,
    durationMs: SAVE_TOAST_MS,
    action: { label: SAVED_COPY.undo, onPress: () => { useSavedStore.getState().unsave(type, entityId); } },
  });
  return true;
}

export type SaveGestureProps = Pick<
  PressableProps,
  'onLongPress' | 'accessibilityActions' | 'onAccessibilityAction' | 'accessibilityHint' | 'accessibilityValue'
>;

/**
 * Pure builder for a saveable row's Pressable props. `onToggle` performs the
 * toggle and returns the new saved state. Only the `toggleSave` custom action
 * toggles — `activate` stays the row's own onPress (play). The custom-action
 * path announces the result because the toast has no live region.
 */
export function saveGestureProps(saved: boolean, onToggle: () => boolean): SaveGestureProps {
  return {
    onLongPress: () => {
      onToggle();
    },
    accessibilityActions: [
      { name: SAVE_ACTION_NAME, label: saved ? SAVED_COPY.unsaveLabel : SAVED_COPY.saveLabel },
    ],
    onAccessibilityAction: (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName !== SAVE_ACTION_NAME) return;
      const nowSaved = onToggle();
      AccessibilityInfo.announceForAccessibility(nowSaved ? SAVED_COPY.saved : SAVED_COPY.removed);
    },
    accessibilityHint: saved ? SAVED_COPY.unsaveHint : SAVED_COPY.saveHint,
    accessibilityValue: { text: saved ? SAVED_COPY.savedValue : undefined },
  };
}

export function lectureSaveTarget(lecture: {
  id: string;
  title: string;
  scholar?: string;
  duration?: string;
  category: Lecture['category'];
}): SaveTarget {
  return {
    type: 'lecture',
    entityId: lecture.id,
    snapshot: {
      type: 'lecture',
      title: lecture.title,
      scholar: lecture.scholar ?? '',
      duration: lecture.duration ?? '',
      category: lecture.category,
    },
  };
}
```

`BookmarkButton.tsx`:
- Replace the body of `onPress` (`:51-81`) with:
  ```ts
  const onPress = () => {
    onChange?.(toggleSaved({ type, entityId, snapshot }));
  };
  ```
- Import `toggleSaved` from `@/services/savedToggle`.
- Change the store import to `import { useSavedStore } from '@/store';` so `useToastStore` is gone.
- Replace the Behaviour block in the JSDoc with "Behaviour: see services/savedToggle.ts (single toggle path)."
- Keep the `saved` selector and every visual line unchanged.

**Step 4: Run** `npx jest __tests__/savedToggle.test.ts __tests__/savedWiring.test.ts __tests__/savedStore.test.ts`. Expected: all pass. Then `npx tsc --noEmit --pretty false`. Expected: clean.

**Step 5: Commit.**
```bash
git add services/savedToggle.ts components/khazain/primitives/BookmarkButton.tsx __tests__/savedToggle.test.ts __tests__/savedWiring.test.ts
git commit -m "refactor(saved): route every bookmark through one toggle whose undo restores the original entry"
```

---

### Task 4: Group the Library list by recency, and teach the lecture gesture in the empty state (G4)

There is no frame for this section. Frame 06 (`2031:4659`) goes straight from filters `DIV-141` to `books-progress-198` (design §6). It is governed by `constants/libraryPresentation.ts`, `constants/typography.ts`, and the new `constants/savedPresentation.ts`.

**Files:**
- Create: `constants/savedPresentation.ts`
- Modify: `components/khazain/library/MySavedSection.tsx`
  - `:21-28` delete `GROUP_ORDER` and `GROUP_TITLES`
  - `:37-39` use `groupSavedItems`
  - `:52` `title` / `count`
  - `:86-98` empty-state copy
  - styles: add `emptyHint`
- Test: `__tests__/savedPresentation.test.ts` (new)
- Test: `__tests__/savedWiring.test.ts` (append)

**Step 1: Write the failing tests.**

`__tests__/savedPresentation.test.ts`:

```ts
import { groupSavedItems, SAVED_EMPTY_COPY, SAVED_GROUP_TITLES } from '../constants/savedPresentation';
import type { SavedItem, SavedSnapshot, SavedType } from '../types/content';

const SNAP: Record<SavedType, SavedSnapshot> = {
  surah: { type: 'surah', name: 'الفاتحة', displayNumber: '١', meta: 'مكية' },
  scholar: { type: 'scholar', name: 'ابن باز' },
  book: { type: 'book', title: 'رياض الصالحين' },
  lecture: { type: 'lecture', title: 'غزوة بدر', scholar: 'العباد', duration: '', category: 'prophet' },
  dawah: { type: 'dawah', title: 'رمضان', body: '', tone: 'navy' },
};
const item = (type: SavedType, entityId: string, savedAt: number): SavedItem =>
  ({ id: `${type}:${entityId}`, type, entityId, savedAt, snapshot: SNAP[type] });

describe('groupSavedItems', () => {
  it('returns no groups for an empty library', () => {
    expect(groupSavedItems([])).toEqual([]);
  });

  it('groups by type with Arabic titles and counts', () => {
    const groups = groupSavedItems([item('lecture', 'p1', 3), item('surah', '001', 2), item('lecture', 'p2', 1)]);
    expect(groups.map((g) => [g.type, g.title, g.count])).toEqual([
      ['lecture', 'محاضرات', 2],
      ['surah', 'سور', 1],
    ]);
  });

  it('orders groups by their most recent save, not a fixed type order', () => {
    // Fixed order used to be surah, scholar, book, lecture, dawah.
    const groups = groupSavedItems([item('dawah', 'd1', 30), item('surah', '001', 20), item('dawah', 'd2', 10)]);
    expect(groups.map((g) => g.type)).toEqual(['dawah', 'surah']);
  });

  it('keeps entries newest-first inside a group even if the input is unsorted', () => {
    const groups = groupSavedItems([item('book', 'b1', 1), item('book', 'b3', 3), item('book', 'b2', 2)]);
    expect(groups[0].entries.map((e) => e.entityId)).toEqual(['b3', 'b2', 'b1']);
  });

  it('does not mutate its input', () => {
    const input = [item('book', 'b1', 1), item('book', 'b2', 2)];
    const copy = [...input];
    groupSavedItems(input);
    expect(input).toEqual(copy);
  });
});

describe('saved presentation copy', () => {
  it('titles every saved type in Arabic', () => {
    expect(Object.keys(SAVED_GROUP_TITLES).sort()).toEqual(['book', 'dawah', 'lecture', 'scholar', 'surah']);
  });

  it('empty state is encouraging and teaches the lecture long-press', () => {
    expect(SAVED_EMPTY_COPY.title).toBe('ابدأ مكتبتك الشخصية');
    expect(SAVED_EMPTY_COPY.body).toContain('احفظ ما تحب الرجوع إليه');
    expect(SAVED_EMPTY_COPY.lectureHint).toBe('لحفظ محاضرة، اضغط عليها مطوّلاً.');
  });
});
```

Append to `__tests__/savedWiring.test.ts`:

```ts
describe('MySavedSection', () => {
  const src = read('components/khazain/library/MySavedSection.tsx');
  it('orders groups through groupSavedItems, not a fixed type list', () => {
    expect(src).toMatch(/groupSavedItems\(items\)/);
    expect(src).not.toMatch(/GROUP_ORDER/);
  });
  it('renders the lecture hint in the empty state', () => {
    expect(src).toMatch(/SAVED_EMPTY_COPY\.lectureHint/);
  });
});
```

**Step 2: Run** `npx jest __tests__/savedPresentation.test.ts __tests__/savedWiring.test.ts`. Expected: FAIL (module not found, and the MySavedSection contract fails).

**Step 3: Implement** `constants/savedPresentation.ts`:

```ts
/**
 * The Library's محفوظاتي block — grouping, order and copy.
 *
 * Frame 2031:4659 draws no saved list (filters DIV-141 lead straight into
 * books-progress-198), so this file — not Figma — is the authority for the
 * section's internals. Design: docs/plans/2026-10-21-saved-content-bookmarks-design.md §6.
 *
 * Order: groups by their most recent save (newest group first), entries
 * newest-first inside each group — so the first row is always the last save.
 */
import type { SavedItem, SavedType } from '@/types/content';

export const SAVED_GROUP_TITLES: Readonly<Record<SavedType, string>> = Object.freeze({
  surah: 'سور',
  scholar: 'علماء',
  book: 'كتب',
  lecture: 'محاضرات',
  dawah: 'تصاميم',
});

export const SAVED_EMPTY_COPY = Object.freeze({
  title: 'ابدأ مكتبتك الشخصية',
  body: 'احفظ ما تحب الرجوع إليه — سوراً، علماء، كتباً ومحاضرات — لتجده هنا في أي وقت.',
  lectureHint: 'لحفظ محاضرة، اضغط عليها مطوّلاً.',
});

export interface SavedGroup {
  type: SavedType;
  title: string;
  count: number;
  entries: SavedItem[];
}

export function groupSavedItems(items: readonly SavedItem[]): SavedGroup[] {
  // Stable sort: equal timestamps keep store order.
  const newestFirst = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const byType = new Map<SavedType, SavedItem[]>(); // insertion order = recency of each group's newest entry
  for (const it of newestFirst) {
    const bucket = byType.get(it.type);
    if (bucket) bucket.push(it);
    else byType.set(it.type, [it]);
  }
  return Array.from(byType, ([type, entries]) => ({
    type,
    title: SAVED_GROUP_TITLES[type],
    count: entries.length,
    entries,
  }));
}
```

`MySavedSection.tsx`:
- Delete `GROUP_ORDER` and `GROUP_TITLES` (`:21-28`) and the `SavedType` import if it is no longer used.
- Use `const groups = groupSavedItems(items);`.
- In the map, use `<SearchGroupHeader title={g.title} count={g.count} />`.
- `EmptySaved` renders `SAVED_EMPTY_COPY.title`, `.body`, and a third `<Text style={styles.emptyHint}>{SAVED_EMPTY_COPY.lectureHint}</Text>`, with:
  ```ts
  emptyHint: textStyle('caption', { color: KhazainColors.ink500, textAlign: 'center' }),
  ```
- Do **not** touch `headerRow` or `rowBookmarkSlot`. That is out of scope (design §11).

**Step 4: Run** `npx jest __tests__/savedPresentation.test.ts __tests__/savedWiring.test.ts __tests__/libraryPresentation.test.ts __tests__/libraryLayout.test.ts`. Expected: all pass. Then `npx tsc --noEmit --pretty false`. Expected: clean.

**Step 5: Commit.**
```bash
git add constants/savedPresentation.ts components/khazain/library/MySavedSection.tsx __tests__/savedPresentation.test.ts __tests__/savedWiring.test.ts
git commit -m "feat(library): order saved groups by most recent save and teach lecture saving in the empty state"
```

---

### Task 5: `useSaveGesture` and long-press save on `LectureCard` (G1, six screens)

This covers prophet, queen, books, radio, audiobooks and exclusive. None of the callers changes. `LectureCard` builds the target from props it already receives.

**Files:**
- Create: `components/khazain/primitives/useSaveGesture.ts`
- Modify: `components/khazain/primitives/index.ts`: add `export { useSaveGesture } from './useSaveGesture';` next to `BookmarkButton` (`:33`)
- Modify: `components/khazain/primitives/LectureCard.tsx`
  - header comment `:10-23`: document long-press and the saved-only icon
  - props `:33`, `:44`: remove `showBookmark`
  - add `useMemo` target and the hook before `slots` (`:52`)
  - `meta` slot `:54-67`
  - `Pressable` `:90-91`: spread `gestureProps`
- Test: `__tests__/savedWiring.test.ts` (append)

**Step 1: Write the failing tests.** Append:

```ts
describe('lecture rows', () => {
  it('LectureCard wires the shared save gesture', () => {
    expect(read('components/khazain/primitives/LectureCard.tsx')).toMatch(/useSaveGesture\(/);
  });
});
```

This is the only wiring regex for this task. The gesture and accessibility behaviour is unit-tested through `saveGestureProps` in Task 3. The hook adds only a store selector and the haptic. The saved-only icon is verified in QA rows 1–9.

**Step 2: Run** `npx jest __tests__/savedWiring.test.ts`. Expected: FAIL. `LectureCard` does not call `useSaveGesture` yet.

**Step 3: Implement** `components/khazain/primitives/useSaveGesture.ts`:

```ts
import { saveGestureProps, toggleSaved, type SaveGestureProps, type SaveTarget } from '@/services/savedToggle';
import { useSavedStore } from '@/store/savedStore';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';

/**
 * Off-frame save affordance for rows whose Figma frame draws no bookmark
 * (lecture lists 2465:1911, 2510:1990, 2589:1772, 2597:2552, 2606:3830,
 * 2869:2088, 2869:2306). Long-press — or the screen-reader custom action —
 * toggles the save through services/savedToggle, so toasts and undo match the
 * BookmarkButton exactly. Props come from the pure saveGestureProps; this hook
 * adds only the store subscription and the haptic. `saved` lets the row show
 * a bookmark once saved.
 * Pass `undefined` to opt out; the hook still has to be called unconditionally.
 */
export function useSaveGesture(target: SaveTarget | undefined): { saved: boolean; gestureProps: SaveGestureProps } {
  const type = target?.type;
  const entityId = target?.entityId;
  const saved = useSavedStore((s) =>
    type !== undefined && s.items.some((it) => it.type === type && it.entityId === entityId),
  );

  const toggle = useCallback((): boolean => {
    if (!target) return false;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    return toggleSaved(target);
  }, [target]);

  const gestureProps = useMemo<SaveGestureProps>(
    () => (target ? saveGestureProps(saved, toggle) : {}),
    [target, saved, toggle],
  );

  return { saved, gestureProps };
}
```

`LectureCard.tsx`:
- Import `useMemo` from React, `lectureSaveTarget` from `@/services/savedToggle`, and `useSaveGesture` from `./useSaveGesture`.
- Remove `showBookmark` from both the destructure and the type.
- Before `slots`:
  ```ts
  const saveTarget = useMemo(
    () => lectureSaveTarget({ id, title, scholar, duration, category }),
    [id, title, scholar, duration, category],
  );
  const { saved, gestureProps } = useSaveGesture(saveTarget);
  ```
- `meta` slot:
  ```tsx
    // Physical left: duration, plus a bookmark once the lecture is saved. The
    // frames draw no bookmark, so the unsaved row stays exactly as they do;
    // saving is a long-press (useSaveGesture).
    meta:
      duration || saved ? (
        <View style={styles.endCluster}>
          {duration ? <Text style={styles.duration}>{duration}</Text> : null}
          {saved ? (
            <BookmarkButton
              type={saveTarget.type}
              entityId={saveTarget.entityId}
              snapshot={saveTarget.snapshot}
              variant="light"
            />
          ) : null}
        </View>
      ) : null,
  ```
- `<Pressable onPress={onPress} {...gestureProps} style={…}>`

**Step 4: Run** `npx jest __tests__/savedWiring.test.ts __tests__/sectionsLayout.test.ts __tests__/rtlVisualContracts.test.ts __tests__/rtlPhysicalContract.test.ts`. Expected: all pass. Then:
- `npx tsc --noEmit --pretty false`. Expected: clean.
- `grep -rn showBookmark app components`. Expected: no output.

**Step 5: Commit.**
```bash
git add components/khazain/primitives/useSaveGesture.ts components/khazain/primitives/index.ts components/khazain/primitives/LectureCard.tsx __tests__/savedWiring.test.ts
git commit -m "feat(saved): save lectures by long-press and show the bookmark once saved"
```

---

### Task 6: Scholar-detail lectures (`RibbonCard`) and the surah-list decision pin (G1 and G2)

**Files:**
- Modify: `components/khazain/primitives/RibbonCard.tsx`
  - JSDoc `:8-20`
  - props `:21-40`: add `save?: SaveTarget`
  - body `:41-51`: hook and saved cluster
  - styles `:72+`: add `metaCluster`
- Modify: `app/(tabs)/sections/scholar/[id].tsx`
  - import `lectureSaveTarget`
  - `RibbonCard` at `:56-61`: add `save={lectureSaveTarget(l)}`
- Do **not** modify: `app/(tabs)/sections/scholar.tsx:45` (scholar list, frame 09) or `ReciterSurahRow.tsx`
- Test: `__tests__/savedWiring.test.ts` (append)

**Step 1: Write the failing tests.** Append:

```ts
describe('scholar-detail lectures (RibbonCard, frame 2510:1990)', () => {
  const ribbon = read('components/khazain/primitives/RibbonCard.tsx');
  it('RibbonCard takes an optional save target and uses the shared hook', () => {
    expect(ribbon).toMatch(/save\?: SaveTarget/);
    expect(ribbon).toMatch(/useSaveGesture\(stableSave\)/);
  });
  it('only the scholar DETAIL list opts in; the scholar list (frame 2102:2975) does not', () => {
    expect(read('app/(tabs)/sections/scholar/[id].tsx')).toMatch(/save=\{lectureSaveTarget\(l\)\}/);
    expect(read('app/(tabs)/sections/scholar.tsx')).not.toMatch(/save=\{/);
  });
});

describe('surah list decision (design §5)', () => {
  it('the Mushaf list carries the surah bookmark', () => {
    expect(read('components/khazain/sections/SurahRow.tsx')).toMatch(/<BookmarkButton\s+type="surah"/);
  });
  it('the reciter list keeps the play glyph frame 2207:5270 draws, with no save control', () => {
    const src = read('components/khazain/sections/ReciterSurahRow.tsx');
    expect(src).not.toMatch(/BookmarkButton|useSaveGesture/);
    expect(src).toMatch(/FigmaIcon name="Play"/);
  });
});
```

**Step 2: Run** `npx jest __tests__/savedWiring.test.ts`. Expected: the RibbonCard and `[id].tsx` assertions fail. The surah-decision tests already pass; they pin the current state.

**Step 3: Implement.**

`RibbonCard.tsx`:
- Import `useMemo` from React, `type SaveTarget` from `@/services/savedToggle`, `useSaveGesture` from `./useSaveGesture`, and `BookmarkButton` from `./BookmarkButton`.
- Add the prop:
  ```ts
  /** Opt-in lecture save (long-press + bookmark once saved). Scholar detail only. */
  save?: SaveTarget;
  ```
- In the body:
  ```tsx
  // The caller builds a fresh target every render (lectureSaveTarget(l)); key
  // the memo on the identity that matters so useSaveGesture's memo holds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSave = useMemo(() => save, [save?.entityId]);
  const { saved, gestureProps } = useSaveGesture(stableSave);
  const durationNode = duration ? <Text style={styles.duration}>{duration}</Text> : null;
  …
  <Pressable onPress={onPress} {...gestureProps} style={…}>
    {/* Physical left — duration; plus a bookmark once saved (frame draws none). */}
    {saved && stableSave ? (
      <View style={styles.metaCluster}>
        {durationNode}
        <BookmarkButton type={stableSave.type} entityId={stableSave.entityId} snapshot={stableSave.snapshot} variant="light" />
      </View>
    ) : (
      durationNode
    )}
  ```
  The unsaved branch renders the same bare `Text` as today, so frames 09 and 19 are unchanged.
- Add the style:
  ```ts
  metaCluster: { ...PHYSICAL_ROW, alignItems: 'center', gap: 6, flexShrink: 0 },
  ```

`scholar/[id].tsx`:
- Add `import { lectureSaveTarget } from '@/services/savedToggle';`.
- Add `save={lectureSaveTarget(l)}` to the `RibbonCard` at `:56`.

**Step 4: Run** `npx jest __tests__/savedWiring.test.ts __tests__/sectionsLayout.test.ts __tests__/scholarCardLayout.test.ts`. Expected: all pass. Then `npx tsc --noEmit --pretty false`. Expected: clean.

**Step 5: Commit.**
```bash
git add components/khazain/primitives/RibbonCard.tsx "app/(tabs)/sections/scholar/[id].tsx" __tests__/savedWiring.test.ts
git commit -m "feat(saved): make scholar-detail lectures saveable and pin the surah-list decision"
```

---

### Task 7: Full verification and visual QA on the iOS simulator

**Step 1: Automated gates.**
```bash
npx jest                                   # full suite — no new failures vs. branch base
npx tsc --noEmit --pretty false            # clean
npm run lint 2>&1 | grep -E "savedStore|savedToggle|savedPresentation|useSaveGesture|BookmarkButton|LectureCard|RibbonCard|MySavedSection|scholar/\[id\]|savedWiring|savedPresentation" -A 2
                                           # expected: no output
```
If the full suite fails anywhere, compare against `git stash`, or run the same files on `fix/real-device-layout-2026-09-12`, to prove the failure existed before this work. Only failures that existed before are acceptable.

**Step 2: Visual QA.**

Use argent:
1. `list-devices`, then pick the booted iPhone simulator.
2. Run `npm run ios` or `npx expo start`.
3. Use the `argent-device-interact` / `argent-react-native-app-workflow` skills.

**Primary comparison target, the pre-change baseline.** The orchestrator captured it before any code changed:
`/private/tmp/claude-501/-Users-ahmedelhadarey-samer-khazayin-app/ad126e66-b973-46e5-9731-c506a3e034d8/scratchpad/qa/baseline/`
- Files are named `NN-<node>__<route>.png`, for example `18-2465-1911__sections-prophet.png` and `06-2031-4659__library.png`.
- Run metadata is in `capture-summary.json`.
- Every "unchanged" condition below means *matches this baseline*.

The Figma exports are a secondary reference. They live in the **main** checkout: `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/`.

**Precondition** (now also a safety rule in `scripts/visual-audit/README.md`): the saved library must be empty. Saved lectures add a bookmark to frames 18–24, and saved Home items fill bookmarks on 05. Open `/library`, unsave everything, and confirm the empty state before capturing default states.

| # | Route | Compare against | Pass condition |
|---|---|---|---|
| 1 | `/sections/prophet` (unsaved) | baseline `18-2465-1911__sections-prophet.png` (Figma `18-2465-1911.png`) | Identical to the baseline: badge right, duration left, **no bookmark**. |
| 2 | `/sections/prophet`: long-press row 1 | no frame (contract `LECTURE_CARD_ORDER` + `PHYSICAL_ROW`) | Toast `تمت الإضافة إلى المحفوظات` with `تراجع`. Gold filled bookmark appears between duration and title. Playback does **not** start. A haptic fires. |
| 3 | same: tap the new bookmark, then `تراجع` | no frame | Toast `تم الحذف من المحفوظات` (5 s). Undo brings the icon back. In Library the item is in its original position. |
| 4 | `/sections/queen` (unsaved) | baseline `20-2589-1772__sections-queen.png` | No bookmark; identical. |
| 5 | `/sections/books` (unsaved) | baseline `21-2597-2552__sections-books.png` | No bookmark; identical. |
| 6 | `/sections/radio` (unsaved) | baseline `22-2606-3830__sections-radio.png` | No bookmark; identical. |
| 7 | `/sections/audiobooks` (unsaved, then long-press while scrolling) | baseline `23-2869-2088__sections-audiobooks.png` (Figma `23-2869-2088.png`) | Unsaved is identical to the baseline. A scroll gesture does not trigger a save. Long-press on a still row saves, and the icon sits **between the duration and the title**: the meta cluster is `[duration, bookmark]` left to right (`LectureCard.tsx:56-65`), and every audiobook fixture has a duration. The rail stays on the right. |
| 8 | `/sections/exclusive` | baseline `24-2869-2306__sections-exclusive.png` (the Figma export is blank) | As 7. |
| 9 | `/sections/scholar/s1` (unsaved, then long-press) | baseline `19-2510-1990__sections-scholar-s1.png` | Unsaved matches: ribbon right, duration left. Once saved, the bookmark sits beside the duration. |
| 10 | `/sections/scholar` | baseline `09-2102-2975__sections-scholar.png` | **Fully unchanged.** Long-press does nothing. |
| 11 | `/sections/reciter/r1` | baseline `13-2207-5270__sections-reciter-r1.png` | **Fully unchanged.** Play glyph left. |
| 12 | `/sections/mushaf` | baseline `14-2207-17898__sections-mushaf.png` | Unchanged. Bookmark tap/undo still works. |
| 13 | `/` | baseline `05-2001-940__home.png` | With an empty library, scholar, book and dawah bookmarks are identical to the baseline. Tapping one shows the save toast. |
| 14 | `/library` (empty saved, `all` filter) | baseline `06-2031-4659__library.png`; the saved block has **no frame** (contract `constants/savedPresentation.ts`) | Everything above the saved block is identical to the baseline. The empty state shows the title, the body and the new hint `لحفظ محاضرة، اضغط عليها مطوّلاً.`, centred, in RTL text. **Expected and accepted:** everything below the saved block shifts down by exactly one caption line. Any other difference fails. |
| 15 | `/library` populated: save a surah, then a dawah poster, then a lecture | no frame (contract `constants/savedPresentation.ts`) | Groups are ordered محاضرات, تصاميم, سور (newest group first), each with a count. Newest-first within each group. The total chip equals the sum. |
| 16 | Persistence: save 2 items, then terminate and relaunch the app (`restart-app`) | no frame | Both items are still in Library, in the same order. |
| 17 | VoiceOver on `/sections/prophet` | no frame | The row reads hint `اضغط مطوّلاً للحفظ في المكتبة`. The custom action `حفظ في المكتبة` saves and VoiceOver **announces** `تمت الإضافة إلى المحفوظات`. The row then reads value `محفوظة`, the hint `اضغط مطوّلاً للإزالة من المحفوظات`, and the action `إزالة من المحفوظات`; using it announces `تم الحذف من المحفوظات`. Double-tap still plays and never toggles. |
| 18 | Width matrix: `npm run screens:matrix:quick` (320/393) for routes 1, 7, 9 in the **saved** state | contract `CARD_DENSITY` | The title still truncates cleanly at 320 with the bookmark present, with no overlap. |

| 19 | **Teardown** (always last) | baseline `06-2031-4659__library.png` | Unsave every item from `/library`. The empty state with the hint is visible, the `المحفوظات` filter count reads ٠, and routes 1 and 13 match the baseline again. The device is left clean for the next capture run. |

Save the captures under `docs/audit/2026-10-21/saved-content-bookmarks/` (untracked, like earlier audits). Only after row 19 passes, call `stop-all-simulator-servers` with the device used.

**Step 3: No commit unless the QA pass required a fix.** The `scripts/visual-audit/README.md` precondition already landed with the v2 plan commit. `conductor/` does not exist in this checkout, so there is no track record to update. Any QA-driven fix goes back through the TDD loop of the task it belongs to, with its own commit.

---

## Task list (summary)

1. Characterisation tests for `savedStore` (G5)
2. `savedStore.restore()` keeps the original timestamp and position (G3, store half)
3. `services/savedToggle.ts`: one toggle path with undo that restores, plus the pure `saveGestureProps` (G3, UI half)
4. Group the Library list by recency; teach the lecture gesture in the empty state (G4)
5. `useSaveGesture` and long-press save on `LectureCard` (G1, six screens)
6. Scholar-detail lectures (`RibbonCard`) and the surah-list decision pin (G1 and G2)
7. Full verification, visual QA against the pre-change baseline, and teardown
