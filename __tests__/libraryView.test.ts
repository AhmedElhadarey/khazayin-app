/** Pure view decisions for the Library: smart reminders and the audiobook section. */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

import { NOTIFICATION_CATEGORIES } from '@/services/notificationRegistry';
import { remindersSubtitle } from '@/services/libraryStats';
import { audiobookCardsFor, buildSmartReminders } from '@/services/libraryView';

const NOW = new Date(2026, 9, 23, 6, 0);
const base = {
  categories: NOTIFICATION_CATEGORIES,
  now: NOW,
  wirdTime: { hour: 8, minute: 0 },
  goalMetToday: false,
  trend: [{ pagesRead: 0 }, { pagesRead: 2 }],
  totalPagesRead: 2,
  onToggle: () => undefined,
};

describe('buildSmartReminders: a card is armed only when it can fire', () => {
  it('fresh install (preference on, permission undetermined) arms nothing and counts zero', () => {
    const cards = buildSmartReminders({ ...base, isEnabled: () => true, permission: 'undetermined' });
    expect(cards.map((c) => c.armed)).toEqual([false]);
    expect(cards[0].nextLabel).toBeUndefined();
    expect(cards[0].statusLabel).toBeTruthy();
    expect(remindersSubtitle(cards.filter((c) => c.armed).length)).toBe('لا تذكيرات نشطة');
  });

  it('permission denied keeps it unarmed', () => {
    const [c] = buildSmartReminders({ ...base, isEnabled: () => true, permission: 'denied' });
    expect(c.armed).toBe(false);
  });

  it('preference off is unarmed even with permission', () => {
    const [c] = buildSmartReminders({ ...base, isEnabled: () => false, permission: 'granted' });
    expect(c.armed).toBe(false);
  });

  it('wanted and permitted: armed, with «التذكير التالي» and the count of one', () => {
    const cards = buildSmartReminders({ ...base, isEnabled: () => true, permission: 'granted' });
    expect(cards[0].armed).toBe(true);
    expect(cards[0].nextLabel).toContain('التذكير التالي: اليوم الساعة');
    expect(cards[0].statusLabel).toBeUndefined();
    expect(remindersSubtitle(cards.filter((c) => c.armed).length)).toBe('تذكير واحد نشط');
  });

  it('lists only shipped categories, names the wird one for the Library, and wires the switch', () => {
    const onToggle = jest.fn();
    const cards = buildSmartReminders({ ...base, isEnabled: () => true, permission: 'granted', onToggle });
    expect(cards.map((c) => c.id)).toEqual(NOTIFICATION_CATEGORIES.filter((c) => c.available).map((c) => c.id));
    expect(cards[0].labelAr).toBe('تذكير ورد القرآن');
    cards[0].onToggle(false);
    expect(onToggle).toHaveBeenCalledWith('wird-daily', false);
  });
});

describe('audiobookCardsFor', () => {
  const lecture = {};
  it('default views: both cards, one, or the browse empty card', () => {
    expect(audiobookCardsFor('all', lecture, lecture)).toEqual({ inProgress: true, completed: true, empty: null });
    expect(audiobookCardsFor('notes', lecture, null)).toEqual({ inProgress: true, completed: false, empty: null });
    expect(audiobookCardsFor('all', null, lecture)).toEqual({ inProgress: false, completed: true, empty: null });
    expect(audiobookCardsFor('history', null, null)).toEqual({ inProgress: false, completed: false, empty: 'browse' });
  });
  it('المكتمل shows the completed card alone, or its own empty state', () => {
    expect(audiobookCardsFor('completed', lecture, lecture)).toEqual({ inProgress: false, completed: true, empty: null });
    expect(audiobookCardsFor('completed', lecture, null)).toEqual({ inProgress: false, completed: false, empty: 'completed' });
  });
});
