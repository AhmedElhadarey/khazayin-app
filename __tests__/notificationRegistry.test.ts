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
});
