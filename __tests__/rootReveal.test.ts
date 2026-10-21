import { notifyRootRevealed, onRootRevealedOnce } from '@/services/search/rootReveal';

describe('root reveal signal', () => {
  // The slot is module state: clear it so no test inherits a subscriber.
  afterEach(() => {
    const off = onRootRevealedOnce(() => {});
    off();
  });

  it('calls the subscriber once when the root is revealed', () => {
    const fn = jest.fn();
    onRootRevealedOnce(fn);
    notifyRootRevealed();
    notifyRootRevealed();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does nothing after unsubscribe', () => {
    const fn = jest.fn();
    const off = onRootRevealedOnce(fn);
    off();
    notifyRootRevealed();
    expect(fn).not.toHaveBeenCalled();
  });

  it('holds one slot: a newer subscription replaces the older', () => {
    const older = jest.fn();
    const newer = jest.fn();
    const offOlder = onRootRevealedOnce(older);
    onRootRevealedOnce(newer);
    offOlder(); // a stale unsubscribe must not drop the newer one
    notifyRootRevealed();
    expect(older).not.toHaveBeenCalled();
    expect(newer).toHaveBeenCalledTimes(1);
  });

  it('ignores a reveal that happened before anyone subscribed', () => {
    notifyRootRevealed();
    const fn = jest.fn();
    onRootRevealedOnce(fn);
    expect(fn).not.toHaveBeenCalled();
    notifyRootRevealed();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
