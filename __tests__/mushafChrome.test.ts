import {
  mushafAccessibilityActions,
  CHROME_FADE_MS,
  CHROME_SCRIM,
  ChromeTapTracker,
  HIDE_CONTROLS_LABEL,
  SHOW_CONTROLS_LABEL,
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

describe('one gate for showing and hiding', () => {
  // What the reader does with a finished touch: toggle only when the tracker says tap.
  const run = (
    shown: boolean,
    o: { holdMs?: number; moveTo?: number; consume?: boolean; longPress?: boolean; scrolling?: boolean },
  ) => {
    const t = new ChromeTapTracker();
    t.start({ x: 50, y: 50, ms: 0, touches: 1, scrolling: false });
    if (o.moveTo) t.move({ x: 50, y: 50 + o.moveTo, touches: 1 });
    if (o.longPress) t.noteLongPress();
    if (o.consume) t.consumeTouch();
    return t.end({ ms: o.holdMs ?? 100, scrolling: !!o.scrolling })
      ? chromeAfterTap(shown, false)
      : shown;
  };

  it.each([true, false])('a quick tap flips the chrome from shown=%s', (shown) => {
    expect(run(shown, {})).toBe(!shown);
  });
  it.each([true, false])('a hold over 300ms leaves shown=%s alone', (shown) => {
    expect(run(shown, { holdMs: 301 })).toBe(shown);
  });
  it.each([true, false])('a 10pt move leaves shown=%s alone', (shown) => {
    expect(run(shown, { moveTo: 10 })).toBe(shown);
  });
  it.each([true, false])('a long-press (NOTE) leaves shown=%s alone', (shown) => {
    expect(run(shown, { longPress: true, holdMs: 600 })).toBe(shown);
  });
  it.each([true, false])('a scroll leaves shown=%s alone', (shown) => {
    expect(run(shown, { scrolling: true })).toBe(shown);
  });
  it.each([true, false])('a touch an in-page control consumed leaves shown=%s alone', (shown) => {
    expect(run(shown, { consume: true })).toBe(shown);
  });

  it('a consumed touch does not poison the next one', () => {
    const t = new ChromeTapTracker();
    t.start({ x: 0, y: 0, ms: 0, touches: 1, scrolling: false });
    t.consumeTouch();
    expect(t.end({ ms: 50, scrolling: false })).toBe(false);
    t.start({ x: 0, y: 0, ms: 100, touches: 1, scrolling: false });
    expect(t.end({ ms: 150, scrolling: false })).toBe(true);
  });
});

describe('mushafAccessibilityActions', () => {
  const names = (shown: boolean, sr: boolean) => mushafAccessibilityActions(shown, sr).map((a) => a.name);
  it('offers both controls actions while the chrome is up and can be hidden', () => {
    expect(names(true, false)).toEqual(['showControls', 'hideControls', 'addSurahNote']);
  });
  it('leaves out hideControls once the chrome is down', () => {
    expect(names(false, false)).toEqual(['showControls', 'addSurahNote']);
  });
  it('leaves out hideControls while a screen reader pins the chrome up, and keeps showControls', () => {
    expect(names(true, true)).toEqual(['showControls', 'addSurahNote']);
    expect(names(false, true)).toEqual(['showControls', 'addSurahNote']);
  });
  it('labels them in Arabic', () => {
    const labels = mushafAccessibilityActions(true, false).map((a) => a.label);
    expect(labels).toEqual([SHOW_CONTROLS_LABEL, HIDE_CONTROLS_LABEL, 'إضافة ملاحظة على السورة']);
  });
});
