/**
 * The one screen-reader announcement helper. Toasts have no live region, so
 * every write path that confirms itself with a toast also announces here.
 */
import { AccessibilityInfo } from 'react-native';

/** Queued where supported (iOS), so it does not cut off the press confirmation. */
export function announce(message: string): void {
  if (typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function') {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}
