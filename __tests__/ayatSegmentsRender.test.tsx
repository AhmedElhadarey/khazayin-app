import React, { useMemo } from 'react';
import { AyatSegments } from '@/components/khazain/mushaf/AyatSegments';
import { useMushafChromeGate } from '@/components/khazain/mushaf/useMushafChromeGate';
import { mushafAccessibilityActions } from '@/services/mushafChrome';

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(() => cb(), [cb]) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: any; unmount: () => void };
};

const ay = (number: number) => ({ surahId: '002', number, text: `نص ${number}` });

function setup() {
  const ayat = [ay(1), ay(2), ay(3)];
  const ayatMap = jest.fn(ayat.map.bind(ayat));
  (ayat as any).map = ayatMap;
  const segments = [{ page: 2, ayat }];
  const segmentsMap = jest.fn(segments.map.bind(segments));
  (segments as any).map = segmentsMap;
  const type = { fontSize: 22, lineHeight: 40 };
  const cb = { layout: jest.fn(), text: jest.fn(), a11y: jest.fn(), note: jest.fn() };
  let gate!: ReturnType<typeof useMushafChromeGate>;
  let bump!: () => void;

  function Shell() {
    const [, setN] = React.useState(0);
    bump = () => setN((n) => n + 1);
    gate = useMushafChromeGate(false);
    const actions = useMemo(() => mushafAccessibilityActions(gate.chromeShown, false), [gate.chromeShown]); // eslint-disable-line react-hooks/exhaustive-deps
    return (
      <AyatSegments
        segments={segments}
        type={type}
        targetAyah={null}
        typeKey="390:22"
        accessibilityActions={actions}
        onSegmentLayout={cb.layout}
        onSegmentTextLayout={cb.text}
        onA11yAction={cb.a11y}
        noteLongPress={gate.noteLongPress}
        takeAyahNote={cb.note}
      />
    );
  }
  let r!: { root: any; unmount: () => void };
  act(() => {
    r = create(<Shell />);
  });
  return { r, gate: () => gate, bump: () => act(bump), ayatMap, segmentsMap, cb };
}

const touch = { nativeEvent: { pageX: 1, pageY: 1, touches: [0] } } as any;
const toggle = (g: () => ReturnType<typeof useMushafChromeGate>) => {
  act(() => g().pageTouchHandlers.onTouchStart(touch));
  act(() => g().pageTouchHandlers.onTouchEnd());
};

describe('AyatSegments re-rendering', () => {
  it('a shell re-render with unchanged props does not re-render the segments', () => {
    const t = setup();
    const base = t.segmentsMap.mock.calls.length;
    t.bump();
    expect(t.segmentsMap.mock.calls.length).toBe(base);
  });

  it('a chrome toggle does not rebuild the ayah tree', () => {
    const t = setup();
    expect(t.ayatMap).toHaveBeenCalledTimes(1);
    toggle(t.gate);
    expect(t.gate().chromeShown).toBe(false);
    // The page Text follows the actions (hideControls leaves); its ayat do not re-render.
    expect(t.ayatMap).toHaveBeenCalledTimes(1);
    toggle(t.gate);
    expect(t.gate().chromeShown).toBe(true);
    expect(t.ayatMap).toHaveBeenCalledTimes(1);
  });

  it('long-pressing an ayah marks the touch and takes a note for that ayah', () => {
    const t = setup();
    const lp = t.r.root.findAll((n: any) => typeof n.props.onLongPress === 'function');
    act(() => lp[0].props.onLongPress());
    expect(t.cb.note).toHaveBeenCalledWith(1);
  });

  it('hands measurements back with the layout key they were taken under', () => {
    const t = setup();
    const withLayout = t.r.root.findAll((n: any) => typeof n.props.onLayout === 'function')[0];
    act(() => withLayout.props.onLayout({ nativeEvent: { layout: { y: 5, height: 50 } } }));
    expect(t.cb.layout).toHaveBeenCalledWith(2, { y: 5, height: 50 }, '390:22');
  });
});
