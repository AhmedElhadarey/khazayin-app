/**
 * T10 — surah rows and badges against frames 2207:5270 / 2207:17898:
 * unpadded Arabic-Indic badge numerals, `•` meta separator, 8pt row gap,
 * 14/24 title and 12/20 meta, 20pt play icon, and the reciter tab labels.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ReciterSurahRow } from '@/components/khazain/sections/ReciterSurahRow';
import { SurahRow } from '@/components/khazain/sections/SurahRow';
import { SurahStar } from '@/components/khazain/primitives/SurahStar';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { RECITERS, RECITER_TABS, SURAHS } from '@/data/content/quran';
import { searchAll } from '@/services/search/searchAll';
import { TEXT_ROLES } from '@/constants/typography';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/services/audioEngine', () => ({}));
jest.mock('react-native-track-player', () => ({}));
jest.mock('@sentry/react-native', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};
const render = (el: React.ReactElement) => {
  let r!: ReturnType<typeof create>;
  act(() => {
    r = create(el);
  });
  return r;
};
const flat = (n: Node) =>
  StyleSheet.flatten(typeof n.props.style === 'function' ? n.props.style({ pressed: false }) : n.props.style) as any;
const textOf = (r: ReturnType<typeof create>, s: string) =>
  r.root.findAll((n) => n.type === Text && n.props.children === s)[0];
const rowOf = (r: ReturnType<typeof create>) => r.root.findAll((n) => typeof n.props.style === 'function')[0];

const pick = (n: number) =>
  SURAHS[n - 1] ?? { ...SURAHS[0], id: String(n), number: n, displayNumber: String(n) };

describe('badge numerals are unpadded', () => {
  it.each([1, 9, 10, 114])('SurahRow and ReciterSurahRow render surah %i without padding', (n) => {
    const expected = String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
    const a = render(<SurahRow surah={pick(n)} />);
    const b = render(<ReciterSurahRow surah={pick(n)} reciterName="x" />);
    expect(textOf(a, expected)).toBeTruthy();
    expect(textOf(b, expected)).toBeTruthy();
    if (n < 10) expect(textOf(a, pick(n).displayNumber)).toBeUndefined();
  });

  it('keeps displayNumber in the data and in search', () => {
    expect(pick(1).displayNumber).toBe('٠١');
    const run = (query: string) =>
      searchAll({ query, surahs: SURAHS, scholars: [], books: [], lectures: [] })[0]?.items ?? [];
    expect((run('٠١') as any[]).some((s) => s.number === 1)).toBe(true);
    expect((run('١') as any[]).some((s) => s.number === 1)).toBe(true);
    expect((run('1') as any[]).some((s) => s.number === 1)).toBe(true);
  });
});

describe('SurahStar labelRole', () => {
  it('defaults to label (12) and takes cardTitle (14)', () => {
    const a = render(<SurahStar index="١١٤" />);
    const b = render(<SurahStar index="١١٤" labelRole="cardTitle" />);
    expect(flat(textOf(a, '١١٤')).fontSize).toBe(TEXT_ROLES.label.fontSize);
    expect(flat(textOf(b, '١١٤')).fontSize).toBe(TEXT_ROLES.cardTitle.fontSize);
    expect(flat(textOf(b, '١١٤')).lineHeight).toBe(20);
  });
  it('has no fixed label height; the parent centres it', () => {
    const r = render(<SurahStar index="١" size={36} />);
    const label = textOf(r, '١');
    const s = flat(label);
    expect(s.height).toBeUndefined();
    expect(s.lineHeight).toBe(20);
    const wrap = r.root.findAll((n) => n.type === 'View' && n.props.style && flat(n).width === 36)[0];
    expect(flat(wrap)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
  });

});

describe('meta separator and tab labels', () => {
  it('uses U+2022 and never U+00B7 in SURAHS meta', () => {
    expect(SURAHS.length).toBeGreaterThan(0);
    for (const s of SURAHS) {
      expect(s.meta).toContain(' • ');
      expect(s.meta).not.toContain('·');
    }
    expect(pick(1).meta).toBe('مكية • ٧ آيات');
    expect(pick(4).meta).toBe('مدنية • ١٧٦ آية');
  });
  it('tab labels carry the file diacritics', () => {
    const l = RECITER_TABS.map((t) => t.label);
    // The .fig stores shadda first, then the vowel mark.
    const cps = (t: string) => Array.from(t.split(' ')[1]).map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0'));
    expect(cps(l[0]).slice(-4)).toEqual(['0648', '0651', '064e', '062f']);
    expect(cps(l[1]).slice(-4)).toEqual(['062a', '0651', '064e', '0644']);
    expect(cps(l[2]).slice(-4)).toEqual(['0644', '0651', '0650', '0645']);
    for (const [style, i] of [['tajweed', 0], ['murattal', 1], ['muallam', 2]] as const) {
      expect(RECITERS.filter((r) => r.style === style).every((r) => r.styleLabel === l[i])).toBe(true);
    }
  });
});

describe('row metrics', () => {
  it('SurahRow: gap 8, title 14/24, meta 12/20', () => {
    const s = pick(2);
    const r = render(<SurahRow surah={s} />);
    expect(flat(rowOf(r)).gap).toBe(8);
    expect(flat(textOf(r, s.name))).toMatchObject({ fontSize: 14, lineHeight: 24 });
    expect(flat(textOf(r, s.meta))).toMatchObject({ fontSize: 12, lineHeight: 20 });
  });
  it('ReciterSurahRow: title 14/24, meta 12/20, play icon 20, 14pt badge', () => {
    const s = pick(2);
    const r = render(<ReciterSurahRow surah={s} reciterName="x" />);
    expect(flat(textOf(r, s.name))).toMatchObject({ fontSize: 14, lineHeight: 24 });
    expect(flat(textOf(r, s.meta))).toMatchObject({ fontSize: 12, lineHeight: 20 });
    const play = r.root.findAll((n) => n.type === FigmaIcon && n.props.name === 'Play')[0];
    expect(play.props.size).toBe(20);
    expect(flat(textOf(r, '٢')).fontSize).toBe(14);
  });
});
