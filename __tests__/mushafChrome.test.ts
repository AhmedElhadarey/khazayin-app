import {
  AYAH_LONG_PRESS_MS,
  CHROME_FADE_MS,
  CHROME_SCRIM,
  ChromeTapTracker,
  basmalaShown,
  chromeAfterTap,
  chromeFadeMs,
  chromeIsUp,
  isChromeTap,
  type TapSample,
} from '@/services/mushafChrome';

const tap: TapSample = {
  pressMs: 120,
  movedPt: 2,
  scrollingAtStart: false,
  scrollingAtEnd: false,
  longPressFired: false,
  multiTouch: false,
};

describe('isChromeTap decision table', () => {
  it('a quick, still touch on a resting page toggles', () => {
    expect(isChromeTap(tap)).toBe(true);
  });
  it('299ms toggles, 300ms does not', () => {
    expect(isChromeTap({ ...tap, pressMs: 299 })).toBe(true);
    expect(isChromeTap({ ...tap, pressMs: 300 })).toBe(false);
  });
  it('9pt of movement toggles, 10pt does not', () => {
    expect(isChromeTap({ ...tap, movedPt: 9 })).toBe(true);
    expect(isChromeTap({ ...tap, movedPt: 10 })).toBe(false);
  });
  it('a touch that lands on, or ends in, a scroll never toggles', () => {
    expect(isChromeTap({ ...tap, scrollingAtStart: true })).toBe(false);
    expect(isChromeTap({ ...tap, scrollingAtEnd: true })).toBe(false);
  });
  it('a long-press never toggles, whatever the timing', () => {
    expect(isChromeTap({ ...tap, longPressFired: true })).toBe(false);
    expect(isChromeTap({ ...tap, longPressFired: true, pressMs: 50 })).toBe(false);
  });
  it('the long-press window is longer than the tap window, so they never overlap', () => {
    expect(AYAH_LONG_PRESS_MS).toBeGreaterThan(299);
  });
  it('a second finger cancels the tap', () => {
    expect(isChromeTap({ ...tap, multiTouch: true })).toBe(false);
  });
});

describe('ChromeTapTracker', () => {
  const down = (t: ChromeTapTracker, o: Partial<{ ms: number; scrolling: boolean; touches: number }> = {}) =>
    t.start({ x: 100, y: 100, ms: 1000, touches: 1, scrolling: false, ...o });

  it('toggles on a short still touch', () => {
    const t = new ChromeTapTracker();
    down(t);
    expect(t.end({ ms: 1100, scrolling: false })).toBe(true);
  });
  it('remembers the furthest movement, not the last', () => {
    const t = new ChromeTapTracker();
    down(t);
    t.move({ x: 100, y: 130, touches: 1 });
    t.move({ x: 100, y: 101, touches: 1 });
    expect(t.end({ ms: 1100, scrolling: false })).toBe(false);
  });
  it('a long-press mid-touch means the release does not toggle', () => {
    const t = new ChromeTapTracker();
    down(t);
    t.noteLongPress();
    expect(t.end({ ms: 1100, scrolling: false })).toBe(false);
  });
  it('a touch that began during momentum does not toggle', () => {
    const t = new ChromeTapTracker();
    down(t, { scrolling: true });
    expect(t.end({ ms: 1050, scrolling: false })).toBe(false);
  });
  it('forgets the long-press on the next touch', () => {
    const t = new ChromeTapTracker();
    down(t);
    t.noteLongPress();
    t.end({ ms: 1700, scrolling: false });
    down(t);
    expect(t.end({ ms: 1100, scrolling: false })).toBe(true);
  });
  it('a cancelled touch (the scroll view took it) never toggles', () => {
    const t = new ChromeTapTracker();
    down(t);
    t.cancel();
    expect(t.end({ ms: 1100, scrolling: false })).toBe(false);
  });
  it('a second finger cancels the tap', () => {
    const t = new ChromeTapTracker();
    down(t);
    t.move({ x: 100, y: 100, touches: 2 });
    expect(t.end({ ms: 1100, scrolling: false })).toBe(false);
  });
});

describe('chrome visibility', () => {
  it('a tap flips it', () => {
    expect(chromeAfterTap(true, false)).toBe(false);
    expect(chromeAfterTap(false, false)).toBe(true);
  });
  it('a screen reader keeps it up, whatever was tapped', () => {
    expect(chromeIsUp(false, true)).toBe(true);
    expect(chromeAfterTap(true, true)).toBe(true);
    expect(chromeAfterTap(false, true)).toBe(true);
  });
  it('without a screen reader the shown flag decides', () => {
    expect(chromeIsUp(true, false)).toBe(true);
    expect(chromeIsUp(false, false)).toBe(false);
  });
  it('Reduce Motion removes the fade', () => {
    expect(chromeFadeMs(true)).toBe(0);
    expect(chromeFadeMs(false)).toBe(CHROME_FADE_MS);
    expect(CHROME_FADE_MS).toBe(300);
  });
  it('the scrim is 24% black', () => {
    expect(CHROME_SCRIM).toBe('rgba(0,0,0,0.24)');
  });
});

describe('basmalaShown', () => {
  it('is omitted for At-Tawbah and for Al-Fatiha (already ayah 1)', () => {
    expect(basmalaShown(9)).toBe(false);
    expect(basmalaShown(1)).toBe(false);
  });
  it('is shown for every other surah', () => {
    expect(basmalaShown(2)).toBe(true);
    expect(basmalaShown(114)).toBe(true);
    expect(basmalaShown(8)).toBe(true);
  });
});
