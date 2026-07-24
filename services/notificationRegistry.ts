import { useSettingsStore } from '@/store/settingsStore';
import type { NotificationCategoryId } from '@/types/settings';

export type NotificationCategory = Readonly<{
  id: NotificationCategoryId;
  labelAr: string;
  descriptionAr: string;
  defaultOn: boolean;
  /**
   * Whether this category actually schedules a notification today. `false`
   * categories are registered (so their toggle state persists and migrates)
   * but have no working scheduler yet — the settings screen renders them as a
   * non-interactive "قريبًا" row rather than shipping a live toggle that fires
   * nothing.
   */
  available: boolean;
}>;

export const NOTIFICATION_CATEGORIES: ReadonlyArray<NotificationCategory> = [
  {
    id: 'wird-daily',
    labelAr: 'تذكير الورد',
    descriptionAr: 'تذكير يومي بقراءة الورد',
    defaultOn: true,
    available: true,
  },
  {
    id: 'announcements-general',
    labelAr: 'تنبيهات عامة',
    descriptionAr: 'إشعارات من المؤسسة عند توفرها',
    defaultOn: false,
    available: false,
  },
  {
    id: 'prayer-fajr',
    labelAr: 'الفجر',
    descriptionAr: 'تذكير عند دخول وقت صلاة الفجر',
    defaultOn: true,
    available: false,
  },
  {
    id: 'prayer-dhuhr',
    labelAr: 'الظهر',
    descriptionAr: 'تذكير عند دخول وقت صلاة الظهر',
    defaultOn: true,
    available: false,
  },
  {
    id: 'prayer-asr',
    labelAr: 'العصر',
    descriptionAr: 'تذكير عند دخول وقت صلاة العصر',
    defaultOn: true,
    available: false,
  },
  {
    id: 'prayer-maghrib',
    labelAr: 'المغرب',
    descriptionAr: 'تذكير عند دخول وقت صلاة المغرب',
    defaultOn: true,
    available: false,
  },
  {
    id: 'prayer-isha',
    labelAr: 'العشاء',
    descriptionAr: 'تذكير عند دخول وقت صلاة العشاء',
    defaultOn: true,
    available: false,
  },
];

// Compile-time exhaustiveness: this object MUST have exactly one key per member
// of `NotificationCategoryId`. Adding a member to the union without adding it
// here fails `tsc` (missing key); the keys are then used to build the runtime
// assertion below. This is the type-safe half that closes the `ReadonlyArray`
// gap documented in `types/settings.ts`.
const CATEGORY_ID_PRESENCE: Record<NotificationCategoryId, true> = {
  'wird-daily': true,
  'announcements-general': true,
  'prayer-fajr': true,
  'prayer-dhuhr': true,
  'prayer-asr': true,
  'prayer-maghrib': true,
  'prayer-isha': true,
};

const ALL_CATEGORY_IDS: ReadonlyArray<NotificationCategoryId> = Object.keys(
  CATEGORY_ID_PRESENCE,
) as NotificationCategoryId[];

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

// Runtime exhaustiveness: the registry array must contain exactly the set of
// ids in the `NotificationCategoryId` union — no more, no less. Guards against
// a union member that was type-checked into `CATEGORY_ID_PRESENCE` but never
// added to `NOTIFICATION_CATEGORIES` (which would compile cleanly yet silently
// never render). Throws at module load if the two sets diverge.
(() => {
  const registryIds = new Set(NOTIFICATION_CATEGORIES.map((c) => c.id));
  const missing = ALL_CATEGORY_IDS.filter((id) => !registryIds.has(id));
  const extra = [...registryIds].filter(
    (id) => !(id in CATEGORY_ID_PRESENCE),
  );
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `[notificationRegistry] category registry is out of sync with NotificationCategoryId` +
        ` (missing: ${missing.join(', ') || 'none'};` +
        ` extra: ${extra.join(', ') || 'none'})`,
    );
  }
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
