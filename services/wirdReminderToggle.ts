/**
 * wirdReminderToggle — the single place that decides what "turn the wird
 * reminder on" means.
 *
 * Two screens toggle this: the Library tab's inline `التذكير اليومي` switch and
 * the notifications settings screen. They MUST agree, because a persisted
 * `wird-daily: true` causes the Library card to render a next-reminder time.
 * If the OS has denied notification permission, `scheduleWirdReminderAsync`
 * silently no-ops — so flipping the preference anyway would leave the card
 * advertising a reminder that can never fire. That is the exact class of defect
 * this feature exists to remove (see the three deleted mock ReminderCards).
 *
 * The permission PROMPT (an Alert) stays in the screens; this module reports the
 * outcome and refuses to lie about state.
 */

import {
  getPermissionAsync,
  requestPermissionAsync,
} from '@/services/notificationScheduler';
import { useSettingsStore } from '@/store/settingsStore';
import { useWirdStore } from '@/store/wirdStore';
import type { TimeOfDay } from '@/types/settings';

export type WirdToggleOutcome = 'enabled' | 'disabled' | 'permission-denied';

/**
 * Resolve OS permission, prompting once when the user has never been asked.
 * Never prompts when already `denied` — iOS shows that dialog exactly once, and
 * a second `requestPermissionsAsync` resolves straight back to `denied` without
 * any UI. Recovery is via system settings, which the calling screens offer.
 */
async function ensurePermission(): Promise<boolean> {
  let permission = await getPermissionAsync();
  if (permission === 'undetermined') {
    permission = await requestPermissionAsync();
  }
  return permission === 'granted';
}

/**
 * Apply the requested wird-reminder state.
 *
 * Returns `'permission-denied'` WITHOUT flipping the stored preference when the
 * OS refuses notification permission. Callers should surface that to the user
 * (an Arabic Alert offering to open system settings) and leave their switch off.
 *
 * Disabling never asks for permission — you can always turn a reminder off.
 */
export async function setWirdReminderEnabled(next: boolean): Promise<WirdToggleOutcome> {
  if (!next) {
    useSettingsStore.getState().setNotificationEnabled('wird-daily', false);
    await useWirdStore.getState().setWirdEnabledFromSettings(false);
    return 'disabled';
  }

  if (!(await ensurePermission())) {
    return 'permission-denied';
  }

  useSettingsStore.getState().setNotificationEnabled('wird-daily', true);
  await useWirdStore.getState().setWirdEnabledFromSettings(true);
  return 'enabled';
}

/**
 * Persist a new wird reminder time and re-arm the repeating DAILY trigger.
 *
 * **This is the second place permission must be requested, and for a long while
 * it was the missing one.** `wird-daily` is registered `defaultOn: true`, so the
 * switch is already on for every new user — and `setWirdReminderEnabled` (the
 * only caller of `requestPermissionAsync`) runs solely when the user *flips* that
 * switch. A switch that starts on is never flipped on, so a fresh install never
 * saw an OS prompt, `scheduleWirdReminderAsync` hit its permission gate on every
 * boot, and the reminder could never fire. Choosing a time looked like it worked
 * and did nothing.
 *
 * Picking a reminder time is an unambiguous statement of intent, which is exactly
 * when a permission prompt belongs (Apple HIG: ask in context, never at cold
 * boot). So this asks, once, here.
 *
 * The chosen time is persisted FIRST and survives a denial — the user may grant
 * permission later from system settings, and their choice must outlive that round
 * trip. Applying a time never flips the on/off preference: *when* to be reminded
 * is orthogonal to *whether* to be reminded.
 */
export async function applyWirdReminderTime(time: TimeOfDay): Promise<WirdToggleOutcome> {
  const settings = useSettingsStore.getState();
  settings.setWirdReminderTime(time);

  if (!settings.notifications['wird-daily']) {
    // Reminder is off. The time is stored for whenever it is switched back on;
    // asking for notification permission now would be a prompt for nothing.
    return 'disabled';
  }

  if (!(await ensurePermission())) {
    return 'permission-denied';
  }

  await useWirdStore.getState().setWirdEnabledFromSettings(true);
  return 'enabled';
}
