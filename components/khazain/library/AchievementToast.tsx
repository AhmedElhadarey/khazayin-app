/**
 * Achievement toast helper.
 *
 * The actual rendering lives in `ToastOverlay` (mounted at app root); when
 * `variant: 'achievement'` is set on the toast config, the overlay switches
 * to a gold-bordered cream card with a checkmark badge. This module just
 * exposes a typed helper so callers don't repeat the variant string.
 */

import { useToastStore } from '@/store/toastStore';

export function showAchievementToast(message: string, durationMs = 4000): void {
  useToastStore.getState().show({ message, variant: 'achievement', durationMs });
}
