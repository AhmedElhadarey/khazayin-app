/** The Library's smart-reminder cards (LIBRARY-11, 12, 21). */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { ReminderList, type ReminderSummary } from '@/components/khazain/library/ReminderCard';
import { NOTIFICATION_CATEGORIES } from '@/services/notificationRegistry';
import { KhazainColors } from '@/constants/theme';

type Node = {
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
  findAll: (p: (n: Node) => boolean) => Node[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};
const render = (el: React.ReactElement) => {
  let r!: { root: Node };
  act(() => {
    r = create(el);
  });
  return r;
};
const style = (n: Node) => (StyleSheet.flatten(n.props.style) ?? {}) as Record<string, any>;
const texts = (n: Node) =>
  n.findAll((x) => x.type === 'Text').map((x) => x.children.filter((c) => typeof c === 'string').join(''));

const summary = (extra: Partial<ReminderSummary> = {}): ReminderSummary => ({
  id: 'wird-daily',
  labelAr: 'تذكير ورد القرآن',
  descriptionAr: 'آخر قراءة أمس',
  ...extra,
});

describe('ReminderCard', () => {
  it('lays the header as [switch, title + navy disc] in a space-between pinned row', () => {
    const onToggle = jest.fn();
    const r = render(<ReminderList reminders={[summary({ armed: true, onToggle })]} />);
    const header = r.root.findAll(
      (n) => n.type === 'View' && style(n).justifyContent === 'space-between',
    )[0];
    expect(style(header)).toMatchObject({ direction: 'ltr', flexDirection: 'row' });
    const kids = header.children as Node[];
    expect(kids[0].props.accessibilityRole ?? kids[0].findAll((n) => n.props.accessibilityRole === 'switch').length).toBeTruthy();
    expect(texts(kids[1])).toEqual(['تذكير ورد القرآن']);
    const disc = kids[1].findAll((n) => n.type === 'View' && style(n).width === 32)[0];
    expect(style(disc)).toMatchObject({ height: 32, borderRadius: 16, backgroundColor: KhazainColors.navy800 });
  });

  it('pads 17 / 12 at radius 20, pinned', () => {
    const r = render(<ReminderList reminders={[summary()]} />);
    const card = r.root.findAll((n) => n.type === 'View' && style(n).paddingVertical === 17)[0];
    expect(style(card)).toMatchObject({ paddingHorizontal: 12, borderRadius: 20, direction: 'ltr' });
  });

  it('idle: flat card fill and the hairline border; no next-time line', () => {
    const r = render(
      <ReminderList reminders={[summary({ armed: false, nextLabel: 'التذكير التالي: غدًا', statusLabel: 'التذكير اليومي متوقّف' })]} />,
    );
    const card = r.root.findAll((n) => n.type === 'View' && style(n).paddingVertical === 17)[0];
    expect(style(card)).toMatchObject({ backgroundColor: KhazainColors.cardBg, borderColor: KhazainColors.hairline });
    expect(texts(r.root)).toContain('التذكير اليومي متوقّف');
    expect(texts(r.root).join('|')).not.toContain('التذكير التالي');
  });

  it('armed: gradient card with the navy border and the next-time line', () => {
    const r = render(
      <ReminderList reminders={[summary({ armed: true, nextLabel: 'التذكير التالي: اليوم ٨:٠٠ م' })]} />,
    );
    const grad = r.root.findAll((n) => Array.isArray(n.props.colors))[0];
    expect(grad.props.colors).toEqual(['#EEE8E1', '#D8C9B7']);
    expect(style(grad).borderColor).toBe(KhazainColors.navy800);
    expect(texts(r.root)).toContain('التذكير التالي: اليوم ٨:٠٠ م');
  });

  it('passes the switch change to onToggle', () => {
    const onToggle = jest.fn();
    const r = render(<ReminderList reminders={[summary({ armed: false, onToggle })]} />);
    const sw = r.root.findAll((n) => n.props.accessibilityRole === 'switch')[0];
    act(() => sw.props.onPress());
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('keeps the manage link', () => {
    const r = render(<ReminderList reminders={[summary()]} onManage={() => {}} />);
    expect(texts(r.root)).toContain('إدارة التذكيرات');
  });
});

describe('wiring', () => {
  const lib = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/library.tsx'), 'utf8');
  it('the wird card switch uses the permission-aware toggle, not the raw preference', () => {
    expect(lib).toMatch(/onToggle: onToggleWirdReminder/);
    expect(lib).toMatch(/armed: reminder\.armed/);
    expect(lib).not.toMatch(/setNotificationEnabled\('wird-daily'/);
  });
  it('names the wird reminder for the Library without renaming the settings row', () => {
    const wird = NOTIFICATION_CATEGORIES.find((c) => c.id === 'wird-daily')!;
    expect(wird.libraryLabelAr).toBe('تذكير ورد القرآن');
    expect(wird.labelAr).toBe('تذكير الورد');
  });
});
