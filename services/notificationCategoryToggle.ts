/**
 * notificationCategoryToggle — one permission-aware switch for every reminder
 * category the Library lists.
 *
 * The wird category keeps its own boundary (`setWirdReminderEnabled`, which
 * also re-arms the horizon). Any other category goes through the same
 * permission gate before its preference flips, so no card can advertise a
 * reminder the OS will never deliver. Switching off never asks.
 */
import { ensurePermission, setWirdReminderEnabled, type WirdToggleOutcome } from '@/services/wirdReminderToggle';
import { useSettingsStore } from '@/store/settingsStore';
import type { NotificationCategoryId } from '@/types/settings';

export async function setCategoryEnabled(
  id: NotificationCategoryId,
  next: boolean,
): Promise<WirdToggleOutcome> {
  if (id === 'wird-daily') return setWirdReminderEnabled(next);
  if (!next) {
    useSettingsStore.getState().setNotificationEnabled(id, false);
    return 'disabled';
  }
  if (!(await ensurePermission())) return 'permission-denied';
  useSettingsStore.getState().setNotificationEnabled(id, true);
  return 'enabled';
}
