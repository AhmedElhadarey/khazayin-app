import { releaseMiniPlayerOnBlur } from '@/services/mushafPlayerVisibility';

function setup(opts: { tabGroupFocused?: boolean; selfFocused?: boolean }) {
  const setVisible = jest.fn();
  let fire: (() => void) | null = null;
  const off = jest.fn();
  const onTabGroupFocus = jest.fn((cb: () => void) => {
    fire = cb;
    return off;
  });
  const state = { selfFocused: opts.selfFocused ?? false };
  releaseMiniPlayerOnBlur({
    tabGroupFocused: opts.tabGroupFocused,
    onTabGroupFocus,
    selfFocused: () => state.selfFocused,
    setVisible,
  });
  return { setVisible, onTabGroupFocus, off, state, fire: () => fire?.() };
}

describe('releaseMiniPlayerOnBlur', () => {
  it('restores at once when a screen is pushed over the Mushaf', () => {
    const t = setup({ tabGroupFocused: true });
    expect(t.setVisible).toHaveBeenCalledWith(true);
    expect(t.onTabGroupFocus).not.toHaveBeenCalled();
  });
  it('restores at once when there is no tab group to watch', () => {
    const t = setup({ tabGroupFocused: undefined });
    expect(t.setVisible).toHaveBeenCalledWith(true);
  });
  it('does not restore when a root overlay blurred the tab group', () => {
    const t = setup({ tabGroupFocused: false });
    expect(t.setVisible).not.toHaveBeenCalled();
    expect(t.onTabGroupFocus).toHaveBeenCalledTimes(1);
  });
  it('keeps the player hidden when the overlay closes back onto the Mushaf', () => {
    const t = setup({ tabGroupFocused: false });
    t.state.selfFocused = true;
    t.fire();
    expect(t.off).toHaveBeenCalled();
    expect(t.setVisible).not.toHaveBeenCalled();
  });
  it('restores when the overlay navigates elsewhere', () => {
    const t = setup({ tabGroupFocused: false });
    t.state.selfFocused = false;
    t.fire();
    expect(t.off).toHaveBeenCalled();
    expect(t.setVisible).toHaveBeenCalledWith(true);
  });
});
