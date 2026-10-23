import React from 'react';
import { useMushafChromeGate } from '@/components/khazain/mushaf/useMushafChromeGate';

// useFocusEffect runs once on mount; the test refocuses by calling the latest callback.
const focusCbs: (() => void | (() => void))[] = [];
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      R.useEffect(() => {
        focusCbs.push(cb);
        return cb();
      }, [cb]);
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { unmount: () => void };
};

type Gate = ReturnType<typeof useMushafChromeGate>;

function mount(screenReaderOn = false, onUserScrollBegin?: () => void) {
  const ref: { current: Gate | null; renders: number } = { current: null, renders: 0 };
  function Harness({ sr }: { sr: boolean }) {
    ref.current = useMushafChromeGate(sr, { onUserScrollBegin });
    ref.renders += 1;
    return null;
  }
  let r!: { unmount: () => void };
  act(() => {
    r = create(<Harness sr={screenReaderOn} />);
  });
  return { gate: () => ref.current as Gate, ref, r };
}

const touch = (x = 10, y = 10, touches = 1) => ({ nativeEvent: { pageX: x, pageY: y, touches: new Array(touches).fill(0) } }) as any;

let now = 1000;
beforeEach(() => {
  focusCbs.length = 0;
  now = 1000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

function tapOnce(g: () => Gate, dt = 80) {
  act(() => g().pageTouchHandlers.onTouchStart(touch()));
  now += dt;
  act(() => g().pageTouchHandlers.onTouchEnd());
}

describe('useMushafChromeGate', () => {
  it('starts with the chrome up and toggles on each tap, both ways', () => {
    const { gate } = mount();
    expect(gate().chromeShown).toBe(true);
    tapOnce(gate);
    expect(gate().chromeShown).toBe(false);
    tapOnce(gate);
    expect(gate().chromeShown).toBe(true);
  });

  it('a screen reader pins the chrome up', () => {
    const { gate } = mount(true);
    tapOnce(gate);
    expect(gate().chromeShown).toBe(true);
  });

  it('a long press, a drag, a slow press and a two-finger touch are not taps', () => {
    const { gate } = mount();
    act(() => gate().pageTouchHandlers.onTouchStart(touch()));
    act(() => gate().noteLongPress());
    now += 80;
    act(() => gate().pageTouchHandlers.onTouchEnd());
    expect(gate().chromeShown).toBe(true);

    act(() => gate().pageTouchHandlers.onTouchStart(touch()));
    act(() => gate().pageTouchHandlers.onTouchMove(touch(10, 60)));
    now += 80;
    act(() => gate().pageTouchHandlers.onTouchEnd());
    expect(gate().chromeShown).toBe(true);

    tapOnce(gate, 400);
    expect(gate().chromeShown).toBe(true);

    act(() => gate().pageTouchHandlers.onTouchStart(touch(10, 10, 2)));
    now += 80;
    act(() => gate().pageTouchHandlers.onTouchEnd());
    expect(gate().chromeShown).toBe(true);
  });

  it('a cancelled touch never toggles', () => {
    const { gate } = mount();
    act(() => gate().pageTouchHandlers.onTouchStart(touch()));
    act(() => gate().pageTouchHandlers.onTouchCancel());
    now += 80;
    act(() => gate().pageTouchHandlers.onTouchEnd());
    expect(gate().chromeShown).toBe(true);
  });

  it('a control inside the page consumes its touch', () => {
    const { gate } = mount();
    act(() => gate().pageTouchHandlers.onTouchStart(touch()));
    act(() => gate().consumeTouch());
    now += 80;
    act(() => gate().pageTouchHandlers.onTouchEnd());
    expect(gate().chromeShown).toBe(true);
  });

  it('a touch during a drag or momentum scroll is not a tap, until momentum ends', () => {
    const onBegin = jest.fn();
    const { gate } = mount(false, onBegin);
    act(() => gate().scrollStateHandlers.onScrollBeginDrag());
    expect(onBegin).toHaveBeenCalledTimes(1);
    tapOnce(gate);
    expect(gate().chromeShown).toBe(true);
    act(() => gate().scrollStateHandlers.onScrollEndDrag());
    act(() => gate().scrollStateHandlers.onMomentumScrollBegin());
    expect(onBegin).toHaveBeenCalledTimes(2);
    tapOnce(gate);
    expect(gate().chromeShown).toBe(true);
    act(() => gate().scrollStateHandlers.onMomentumScrollEnd());
    tapOnce(gate);
    expect(gate().chromeShown).toBe(false);
  });

  it('refocusing brings the chrome back and forgets a scroll that never reported its end', () => {
    const { gate } = mount();
    tapOnce(gate);
    expect(gate().chromeShown).toBe(false);
    act(() => gate().scrollStateHandlers.onMomentumScrollBegin()); // end lost to a blur
    act(() => {
      focusCbs[focusCbs.length - 1]();
    });
    expect(gate().chromeShown).toBe(true);
    tapOnce(gate);
    expect(gate().chromeShown).toBe(false);
  });

  it('hands out stable handlers, so a toggle does not invalidate memoised children', () => {
    const { gate } = mount();
    const before = gate();
    tapOnce(gate);
    const after = gate();
    expect(after.pageTouchHandlers).toBe(before.pageTouchHandlers);
    expect(after.scrollStateHandlers).toBe(before.scrollStateHandlers);
    expect(after.consumeTouch).toBe(before.consumeTouch);
    expect(after.noteLongPress).toBe(before.noteLongPress);
    expect(after.setChromeShown).toBe(before.setChromeShown);
  });
});
