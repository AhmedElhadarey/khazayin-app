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
