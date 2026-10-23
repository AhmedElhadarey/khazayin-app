/**
 * Render checks for the screens that have no Figma frame; authority is the
 * in-repo RTL contract (constants/layout.ts). Flattened styles, not source text.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { SearchResultRow } from '@/components/khazain/search/SearchResultRow';
import { ToastOverlay } from '@/components/khazain/primitives/ToastOverlay';
import { WirdHistory } from '@/components/khazain/library/WirdHistory';
import { KhazainColors } from '@/constants/theme';
import { CHROME_MAX_FONT_SCALE, textStyle } from '@/constants/typography';
import { useToastStore } from '@/store/toastStore';

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@/store', () => ({
  useToastStore: jest.requireActual('@/store/toastStore').useToastStore,
  usePlayerStore: (sel: (s: { isVisible: boolean }) => unknown) => sel({ isVisible: false }),
}));

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
const flat = (n: Node) => StyleSheet.flatten(n.props.style) ?? {};
const hostViews = (r: { root: Node }) => r.root.findAll((n) => n.type === 'View');
const hostTexts = (n: Node) =>
  n.findAll((x) => x.type === 'Text').map((t) => [t.props.children].flat().join(''));

describe('SearchResultRow accessory', () => {
  it('renders the accessory first, with nothing absolutely positioned', () => {
    const r = render(
      <SearchResultRow
        iconNode={null}
        title="عنوان"
        meta="١٢ د"
        accessory={<Text>ACC</Text>}
        onPress={() => {}}
      />,
    );
    const row = hostViews(r).find((v) => flat(v).direction === 'ltr' && flat(v).flexDirection === 'row')!;
    expect(row).toBeDefined();
    const texts = hostTexts(row);
    expect(texts.indexOf('ACC')).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf('ACC')).toBeLessThan(texts.indexOf('١٢ د'));
    expect(texts.indexOf('١٢ د')).toBeLessThan(texts.indexOf('عنوان'));
    expect(hostViews(r).some((v) => flat(v).position === 'absolute')).toBe(false);
  });

  it('keeps the accessory out of the accessible row button (VoiceOver can focus it)', () => {
    const r = render(
      <SearchResultRow
        iconNode={null}
        title="عنوان"
        meta="١٢ د"
        accessory={<Text>ACC</Text>}
        onPress={() => {}}
      />,
    );
    const press = hostViews(r).find((v) => v.props.accessible === true)!;
    expect(press).toBeDefined();
    expect(press.props.accessibilityRole).toBe('button');
    expect(hostTexts(press)).not.toContain('ACC');
    expect(hostTexts(press)).toEqual(expect.arrayContaining(['١٢ د', 'عنوان']));
    const row = hostViews(r).find((v) => flat(v).direction === 'ltr' && flat(v).flexDirection === 'row')!;
    expect(row.props.accessible).not.toBe(true);
    expect(row.findAll((n) => n === press).length).toBeGreaterThan(0);
    expect(hostTexts(row)[0]).toBe('ACC');
  });

  it('without an accessory the row is still one button', () => {
    const r = render(<SearchResultRow iconNode={null} title="عنوان" onPress={() => {}} />);
    const btns = hostViews(r).filter((v) => v.props.accessible === true);
    expect(btns).toHaveLength(1);
    expect(btns[0].props.accessibilityRole).toBe('button');
  });
});

describe('ToastOverlay', () => {
  it('reads badge, message, action and lays out action left, badge right', () => {
    act(() => {
      useToastStore.getState().show({
        message: 'تم الحفظ',
        variant: 'achievement',
        action: { label: 'تراجع', onPress: () => {} },
      });
    });
    const r = render(<ToastOverlay />);
    const card = hostViews(r).find((v) => flat(v).minHeight === 48)!;
    expect(card).toBeDefined();
    const s = flat(card);
    expect(s.direction).toBe('ltr');
    expect(s.flexDirection).toBe('row-reverse'); // first child lands at the physical right
    const kids = card.children as Node[];
    expect(kids).toHaveLength(3);
    // first child (physical right) is the badge: no message text in it
    expect(hostTexts(kids[0])).not.toContain('تم الحفظ');
    expect(hostTexts(kids[0])).not.toContain('تراجع');
    expect(hostTexts(kids[1])).toEqual(['تم الحفظ']);
    const msg = kids[1].findAll((x) => x.type === 'Text')[0];
    // The size comes from the type scale (textStyle), not an ad-hoc fontSize override.
    const scale = (StyleSheet.flatten(textStyle('cardTitle')) as any).fontSize;
    const body = (StyleSheet.flatten(textStyle('bodyCompact')) as any).fontSize;
    expect([scale, body]).toContain(flat(msg).fontSize);
    expect(hostTexts(kids[2])).toEqual(['تراجع']);
    expect(kids[2].props.accessibilityRole).toBe('button');
    act(() => useToastStore.getState().dismiss());
  });
});

describe('WirdHistory calendar', () => {
  const WEEK = Array.from({ length: 7 }, (_, i) => ({
    localDay: `2026-10-${String(10 + i).padStart(2, '0')}`,
    weekday: i,
    state: 'completed' as const,
  }));
  const byWeekday = Array.from({ length: 7 }, () => ({ completed: 1, total: 2, rate: 0.5 }));
  const r = render(<WirdHistory byWeekday={byWeekday as any} weeks={[WEEK]} hasHistory />);

  it('header row is ltr and ends with السبت', () => {
    const header = hostViews(r).find((v) => {
      const kids = v.children as Node[];
      return kids.length === 7 && hostTexts(v).includes('الجمعة') && hostTexts(v).length === 7;
    })!;
    expect(flat(header).direction).toBe('ltr');
    const texts = hostTexts(header);
    expect(texts[texts.length - 1]).toBe('السبت');
  });

  it('barFill is pinned to the right edge only', () => {
    const fill = hostViews(r).find((v) => flat(v).position === 'absolute' && flat(v).backgroundColor === KhazainColors.goldAccent)!;
    expect(flat(fill).right).toBe(0);
    expect(flat(fill).left).toBeUndefined();
  });

  it('calendar header and weekday text cap the font scale', () => {
    const cap = r.root.findAll((n) => n.type === 'Text' && ['السبت', 'الجمعة'].includes([n.props.children].flat().join('')));
    expect(cap.length).toBeGreaterThan(0);
    for (const t of cap) expect(t.props.maxFontSizeMultiplier).toBe(CHROME_MAX_FONT_SCALE);
    const pct = r.root.findAll((n) => n.type === 'Text' && n.props.children === '٥٠٪');
    for (const t of pct) expect(t.props.maxFontSizeMultiplier).toBe(CHROME_MAX_FONT_SCALE);
  });

  it('no-data digits are not ink400', () => {
    const noData = render(
      <WirdHistory
        byWeekday={byWeekday as any}
        weeks={[[{ localDay: '2026-10-10', weekday: 0, state: 'no-data' }]]}
        hasHistory
      />,
    );
    const digit = noData.root.findAll((n) => n.type === 'Text' && n.props.children === '١٠')[0];
    expect(flat(digit).color).not.toBe(KhazainColors.ink400);
    const cell = noData.root.findAll((n) => n.type === 'View' && flat(n).borderColor === KhazainColors.hairlineFaint && flat(n).borderWidth === 1)[0];
    expect(flat(cell).backgroundColor).toBe('transparent');
    expect(flat(cell).borderColor).toBeDefined();
    expect(flat(cell).borderColor).not.toBe('transparent');
  });

  it('cell text inside the square cells caps the font scale', () => {
    const done = r.root
      .findAll((n) => n.type === 'View' && n.props.accessible === true && !!n.props.accessibilityLabel)
      .flatMap((c) => c.findAll((n) => n.type === 'Text' && n.props.children === '✓'));
    expect(done.length).toBeGreaterThan(0);
    for (const t of done) expect(t.props.maxFontSizeMultiplier).toBe(CHROME_MAX_FONT_SCALE);
    const day = render(
      <WirdHistory
        byWeekday={byWeekday as any}
        weeks={[[{ localDay: '2026-10-10', weekday: 0, state: 'missed' }]]}
        hasHistory
      />,
    ).root.findAll((n) => n.type === 'Text' && n.props.children === '١٠');
    expect(day.length).toBeGreaterThan(0);
    for (const t of day) expect(t.props.maxFontSizeMultiplier).toBe(CHROME_MAX_FONT_SCALE);
  });
});
