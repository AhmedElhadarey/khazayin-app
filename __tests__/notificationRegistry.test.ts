import type { NotificationCategoryId } from '@/types/settings';

type MockState = {
  notifications: Partial<Record<NotificationCategoryId, boolean>>;
};

const mockGetState = jest.fn<MockState, []>();

jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: { getState: () => mockGetState() },
}));

import {
  NOTIFICATION_CATEGORIES,
  getCategory,
  isCategoryEnabled,
} from '@/services/notificationRegistry';

beforeEach(() => {
  mockGetState.mockReset();
});

describe('notificationRegistry', () => {
  // T-NR-1
  it('NOTIFICATION_CATEGORIES includes wird-daily (defaultOn=true) and announcements-general (defaultOn=false)', () => {
    const wird = NOTIFICATION_CATEGORIES.find((c) => c.id === 'wird-daily');
    const announcements = NOTIFICATION_CATEGORIES.find(
      (c) => c.id === 'announcements-general',
    );

    expect(wird).toBeDefined();
    expect(wird?.defaultOn).toBe(true);

    expect(announcements).toBeDefined();
    expect(announcements?.defaultOn).toBe(false);
  });

  // T-NR-2
  it('isCategoryEnabled returns the value from settingsStore (not defaultOn) when the user has toggled it', () => {
    // wird defaultOn is true, but the user has explicitly turned it off
    mockGetState.mockReturnValue({
      notifications: {
        'wird-daily': false,
        'announcements-general': true,
      },
    });

    expect(isCategoryEnabled('wird-daily')).toBe(false);
    expect(isCategoryEnabled('announcements-general')).toBe(true);
  });

  // T-NR-3
  it('falls back to the registered defaultOn when the category id is missing from the settings record', () => {
    // Simulates a pre-existing settings record from before a category was added.
    mockGetState.mockReturnValue({
      notifications: {},
    });

    expect(isCategoryEnabled('wird-daily')).toBe(true); // defaultOn: true
    expect(isCategoryEnabled('announcements-general')).toBe(false); // defaultOn: false
  });

  // T-NR-4
  it('getCategory returns undefined for an unknown id', () => {
    expect(
      getCategory('not-a-real-id' as NotificationCategoryId),
    ).toBeUndefined();
  });

  it('getCategory returns the registered record for a known id', () => {
    const wird = getCategory('wird-daily');
    expect(wird).toBeDefined();
    expect(wird?.id).toBe('wird-daily');
    expect(wird?.defaultOn).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Phase 2a (004-daily-wird-tracking): five prayer categories + available flag
  // -------------------------------------------------------------------------

  // T-NR-5
  it('registers exactly 7 categories including the five prayer times', () => {
    const ids = NOTIFICATION_CATEGORIES.map((c) => c.id).sort();
    expect(ids).toEqual(
      [
        'announcements-general',
        'prayer-asr',
        'prayer-dhuhr',
        'prayer-fajr',
        'prayer-isha',
        'prayer-maghrib',
        'wird-daily',
      ].sort(),
    );
  });

  // T-NR-6
  it('marks wird-daily available and the prayer + announcements categories unavailable', () => {
    const byId = new Map(NOTIFICATION_CATEGORIES.map((c) => [c.id, c]));
    expect(byId.get('wird-daily')?.available).toBe(true);
    expect(byId.get('announcements-general')?.available).toBe(false);
    expect(byId.get('prayer-fajr')?.available).toBe(false);
    expect(byId.get('prayer-dhuhr')?.available).toBe(false);
    expect(byId.get('prayer-asr')?.available).toBe(false);
    expect(byId.get('prayer-maghrib')?.available).toBe(false);
    expect(byId.get('prayer-isha')?.available).toBe(false);
  });

  // T-NR-7
  it('every prayer category defaults on with a non-empty Arabic label and description', () => {
    const prayers = NOTIFICATION_CATEGORIES.filter((c) => c.id.startsWith('prayer-'));
    expect(prayers).toHaveLength(5);
    for (const p of prayers) {
      expect(p.defaultOn).toBe(true);
      expect(p.labelAr.length).toBeGreaterThan(0);
      expect(p.descriptionAr.length).toBeGreaterThan(0);
    }
  });
});
