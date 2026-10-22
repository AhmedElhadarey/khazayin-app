import { watchSignals } from '@/services/recommendations/watchSignals';

describe('watchSignals', () => {
  const makeSource = () => {
    let listener: (() => void) | null = null;
    const unsubscribe = jest.fn(() => { listener = null; });
    const subscribe = jest.fn((l: () => void) => { listener = l; return unsubscribe; });
    return { subscribe, unsubscribe, fire: () => listener?.() };
  };

  it('loads on a source change only when the gate is open', () => {
    const a = makeSource();
    const b = makeSource();
    const load = jest.fn();
    let open = false;
    watchSignals([a.subscribe, b.subscribe], () => open, load);
    a.fire();
    expect(load).not.toHaveBeenCalled();
    open = true;
    a.fire();
    b.fire();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('runs every unsubscriber on stop', () => {
    const a = makeSource();
    const b = makeSource();
    const stop = watchSignals([a.subscribe, b.subscribe], () => true, jest.fn());
    stop();
    expect(a.unsubscribe).toHaveBeenCalledTimes(1);
    expect(b.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
