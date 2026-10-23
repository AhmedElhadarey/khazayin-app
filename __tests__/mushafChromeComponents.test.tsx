import React from 'react';
import { Animated, Text, View } from 'react-native';
import { MushafChrome } from '@/components/khazain/mushaf/MushafChrome';
import { SurahCartouche } from '@/components/khazain/mushaf/SurahCartouche';
import { CHROME_SCRIM, HIDE_CONTROLS_LABEL } from '@/services/mushafChrome';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }) }));

type Node = { type: unknown; props: Record<string, any>; children: any[]; findAll: (p: (n: Node) => boolean) => Node[] };
type Renderer = { root: Node; unmount: () => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => Renderer;
};

const textOf = (r: Renderer): string[] =>
  r.root
    .findAll((n) => n.type === Text)
    .map((n) => [n.props.children].flat(5).filter((c) => typeof c === 'string').join(''));
const scrims = (r: Renderer) =>
  r.root.findAll((n) => n.props.accessibilityLabel === HIDE_CONTROLS_LABEL && typeof n.props.onPress === 'function');

function chrome(over: Partial<React.ComponentProps<typeof MushafChrome>> = {}) {
  const props = {
    visible: true,
    screenReaderOn: false,
    reduceMotion: false,
    onScrimPress: jest.fn(),
    onTopHeight: jest.fn(),
    onBottomHeight: jest.fn(),
    top: <Text>رأس</Text>,
    bottom: <Text>تذييل</Text>,
    ...over,
  };
  let r!: Renderer;
  act(() => {
    r = create(<MushafChrome {...props} />);
  });
  return { r, props };
}

describe('MushafChrome', () => {
  afterEach(() => jest.restoreAllMocks());

  it('draws the 24% scrim and closes on a scrim press', () => {
    const { r, props } = chrome();
    const s = scrims(r);
    expect(s).toHaveLength(1);
    const fills = r.root.findAll((n) => n.type === View || (n.type as any)?.displayName === 'Animated.View');
    expect(JSON.stringify(fills.map((n) => n.props.style))).toContain(CHROME_SCRIM);
    act(() => s[0].props.onPress());
    expect(props.onScrimPress).toHaveBeenCalledTimes(1);
  });

  it('has no scrim while a screen reader pins the chrome up', () => {
    const { r } = chrome({ screenReaderOn: true });
    expect(scrims(r)).toHaveLength(0);
    expect(textOf(r)).toEqual(expect.arrayContaining(['رأس', 'تذييل']));
  });

  it('fades over 300ms normally and not at all under Reduce Motion', () => {
    const spy = jest.spyOn(Animated, 'timing');
    const { r } = chrome({ visible: true });
    act(() => r.unmount());
    spy.mockClear();
    const a = chrome({ visible: false });
    expect(spy.mock.calls.at(-1)?.[1].duration).toBe(300);
    act(() => a.r.unmount());
    spy.mockClear();
    chrome({ visible: false, reduceMotion: true });
    expect(spy.mock.calls.at(-1)?.[1].duration).toBe(0);
  });

  it('hides the controls from the accessibility tree when it is down', () => {
    const { r } = chrome({ visible: false });
    const hidden = r.root.findAll((n) => n.props.accessibilityElementsHidden === true);
    expect(hidden.length).toBeGreaterThan(0);
    expect(scrims(r)[0]?.props.pointerEvents ?? 'none').not.toBe('auto');
  });

  it('reports the top and bottom block heights including the safe areas', () => {
    const { r, props } = chrome();
    const seen = new Set<unknown>();
    const withLayout = r.root.findAll((n) => {
      const f = n.props.onLayout;
      if (typeof f !== 'function' || seen.has(f)) return false;
      seen.add(f);
      return true;
    });
    act(() => withLayout[0].props.onLayout({ nativeEvent: { layout: { height: 111 } } }));
    act(() => withLayout[1].props.onLayout({ nativeEvent: { layout: { height: 99 } } }));
    expect(props.onTopHeight).toHaveBeenCalledWith(111);
    expect(props.onBottomHeight).toHaveBeenCalledWith(99);
  });
});

describe('SurahCartouche', () => {
  const render = (el: React.ReactElement) => {
    let r!: Renderer;
    act(() => {
      r = create(el);
    });
    return r;
  };

  it('names the surah and gives ayah count and order in Arabic-Indic digits', () => {
    const t = textOf(render(<SurahCartouche surahNumber={2} name="البقرة" ayahCount={286} />));
    expect(t).toContain('سورة البقرة');
    expect(t).toContain('آياتها ٢٨٦');
    expect(t).toContain('ترتيبها ٢');
    expect(t.join('')).not.toMatch(/[0-9]/);
  });

  it('never prints a middle dot', () => {
    const t = textOf(render(<SurahCartouche surahNumber={114} name="الناس" ayahCount={6} />));
    expect(t.join('')).not.toContain('·');
  });

  it('drops the ayah label rather than print a placeholder while the count is unknown', () => {
    const t = textOf(render(<SurahCartouche surahNumber={2} name="البقرة" />));
    expect(t.join('|')).not.toContain('آياتها');
    expect(t).toContain('ترتيبها ٢');
  });

  it('draws the basmala as a plain line, except for At-Tawbah and Al-Fatiha', () => {
    const has = (n: number) => textOf(render(<SurahCartouche surahNumber={n} name="x" ayahCount={5} />)).some((s) => s.includes('بِسْمِ'));
    expect(has(2)).toBe(true);
    expect(has(9)).toBe(false);
    expect(has(1)).toBe(false);
  });
});
