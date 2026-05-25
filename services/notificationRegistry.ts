import { useSettingsStore } from '@/store/settingsStore';
import type { NotificationCategoryId } from '@/types/settings';

export type NotificationCategory = Readonly<{
  id: NotificationCategoryId;
  labelAr: string;
  descriptionAr: string;
  defaultOn: boolean;
}>;

export const NOTIFICATION_CATEGORIES: ReadonlyArray<NotificationCategory> = [
  {
    id: 'wird-daily',
    labelAr: 'تذكير الورد',
    descriptionAr: 'تذكير يومي بقراءة الورد',
    defaultOn: true,
  },
  {
    id: 'announcements-general',
    labelAr: 'تنبيهات عامة',
    descriptionAr: 'إشعارات من المؤسسة عند توفرها',
    defaultOn: false,
  },
];

// Runtime invariant: every entry's id is unique. Throws at module load
// (developer error) if a duplicate ever slips in.
const CATEGORY_BY_ID: ReadonlyMap<NotificationCategoryId, NotificationCategory> =
  (() => {
    const map = new Map<NotificationCategoryId, NotificationCategory>();
    for (const category of NOTIFICATION_CATEGORIES) {
      if (map.has(category.id)) {
        throw new Error(
          `[notificationRegistry] duplicate category id: ${category.id}`,
        );
      }
      map.set(category.id, category);
    }
    return map;
  })();

/**
 * Imperative read for schedulers / side-effect code paths (e.g.,
 * `notificationScheduler`, `wirdStore` reschedule logic).
 *
 * **DO NOT use this from React components.** It calls `useSettingsStore.getState()`
 * (a snapshot read) and will NOT re-render the UI when the toggle changes.
 * Components MUST subscribe via a selector: `useSettingsStore((s) => s.notifications[id])`.
 */
export function isCategoryEnabled(id: NotificationCategoryId): boolean {
  const stored = useSettingsStore.getState().notifications[id];
  if (typeof stored === 'boolean') {
    return stored;
  }
  // Backfill semantics: user has a pre-existing settings record from before
  // this category was registered. Fall back to the registered defaultOn.
  const registered = CATEGORY_BY_ID.get(id);
  return registered?.defaultOn ?? false;
}

/** Returns the registered category record, or undefined if the id is unknown. */
export function getCategory(
  id: NotificationCategoryId,
): NotificationCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}
