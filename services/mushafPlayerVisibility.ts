/**
 * Whether the MiniPlayer comes back when the Mushaf screen loses focus.
 *
 * Pushed screens (scholar, book) sit in the same stack, leave the tab group
 * focused, and need their player: restore at once. Root overlays (note editor,
 * notes viewer, the sheets) blur the whole tab group but leave the Mushaf on
 * screen under their backdrop: keep the player hidden and decide when the tab
 * group is focused again — restore only if the Mushaf is no longer the
 * focused screen.
 */
export function releaseMiniPlayerOnBlur(deps: {
  /** `undefined` when there is no tab group above the Mushaf. */
  tabGroupFocused: boolean | undefined;
  /** Subscribe to the next tab-group focus; returns the unsubscribe. */
  onTabGroupFocus: (cb: () => void) => () => void;
  selfFocused: () => boolean;
  setVisible: (visible: boolean) => void;
}): void {
  const { tabGroupFocused, onTabGroupFocus, selfFocused, setVisible } = deps;
  if (tabGroupFocused !== false) {
    setVisible(true);
    return;
  }
  const off = onTabGroupFocus(() => {
    off();
    if (!selfFocused()) setVisible(true);
  });
}
