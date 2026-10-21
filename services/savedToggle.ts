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
