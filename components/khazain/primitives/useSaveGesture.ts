import { saveGestureProps, toggleSaved, type SaveGestureProps, type SaveTarget } from '@/services/savedToggle';
import { useSavedStore } from '@/store/savedStore';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

/** The light tick every save affordance plays — row long-press and bookmark tap alike. */
export function playSaveHaptic(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/**
 * Off-frame save affordance for rows whose Figma frame draws no bookmark
 * (lecture lists 2465:1911, 2510:1990, 2589:1772, 2597:2552, 2606:3830,
 * 2869:2088, 2869:2306). Long-press — or the screen-reader custom action —
 * toggles the save through services/savedToggle, so toasts and undo match the
 * BookmarkButton exactly. Props come from the pure saveGestureProps; this hook
 * adds only the store subscription and the haptic. `saved` lets the row show
 * a bookmark once saved.
 *
 * Callers may pass a fresh target object every render: the latest one is kept
 * in a ref, so the returned props only change when `saved` (or opting in/out)
 * does. Pass `undefined` to opt out; the hook still has to be called
 * unconditionally.
 */
export function useSaveGesture(target: SaveTarget | undefined): { saved: boolean; gestureProps: SaveGestureProps } {
  const targetRef = useRef(target);
  targetRef.current = target;

  const type = target?.type;
  const entityId = target?.entityId;
  const saved = useSavedStore((s) =>
    type !== undefined && s.items.some((it) => it.type === type && it.entityId === entityId),
  );

  const toggle = useCallback((): boolean => {
    playSaveHaptic();
    // Non-null: toggle is only reachable through gestureProps, which exist
    // only while a target is set.
    return toggleSaved(targetRef.current!);
  }, []);

  const hasTarget = target !== undefined;
  const gestureProps = useMemo<SaveGestureProps>(
    () => (hasTarget ? saveGestureProps(saved, toggle) : {}),
    [hasTarget, saved, toggle],
  );

  return { saved, gestureProps };
}
