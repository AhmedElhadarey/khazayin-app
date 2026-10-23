import { TEXT_ROLES } from '@/constants/typography';
/**
 * Pure decisions for the Mushaf reader's tap-to-show chrome (design
 * 2026-10-23 D3). Frame 2349:829 is the bare page; 2349:982 is the same page
 * with the header and footer over a 24% black scrim.
 *
 * The chrome is up on every visit, goes away only on a tap (never a timer,
 * never on scroll) and comes back on the next tap. Nothing here reads React or
 * React Native, so the whole decision table is unit-tested.
 */

/** A touch counts as a tap only when released inside this window. */
export const CHROME_TAP_MAX_MS = 300;
/** ...and only when the finger moved less than this many points. */
export const CHROME_TAP_MAX_MOVE_PT = 10;
/** The frame's dissolve is 0.3s OUT_CUBIC. */
export const CHROME_FADE_MS = 300;
/** Full-screen scrim behind the chrome, above the page. */
export const CHROME_SCRIM = 'rgba(0,0,0,0.24)';

export const SHOW_CONTROLS_LABEL = 'إظهار عناصر التحكم';
export const HIDE_CONTROLS_LABEL = 'إخفاء عناصر التحكم';

export type MushafA11yAction = {
  name: 'showControls' | 'hideControls' | 'addSurahNote';
  label: string;
};

/**
 * Custom actions on the page text. `showControls` is always there; `hideControls`
 * only while it could do something: not under a screen reader (the chrome is
 * pinned up) and not once the chrome is already down.
 */
export function mushafAccessibilityActions(
  shown: boolean,
  screenReaderOn: boolean,
): MushafA11yAction[] {
  const actions: MushafA11yAction[] = [{ name: 'showControls', label: SHOW_CONTROLS_LABEL }];
  if (shown && !screenReaderOn) actions.push({ name: 'hideControls', label: HIDE_CONTROLS_LABEL });
  actions.push({ name: 'addSurahNote', label: 'إضافة ملاحظة على السورة' });
  return actions;
}

export type TapSample = {
  pressMs: number;
  /** Largest distance from the touch-down point, in points. */
  movedPt: number;
  /** The page was in a drag or momentum scroll when the finger came down. */
  scrollingAtStart: boolean;
  /** The page is in a drag or momentum scroll as the finger lifts. */
  scrollingAtEnd: boolean;
  /** An ayah's long-press handler fired during this touch. */
  longPressFired: boolean;
  /** More than one finger was ever down (a pinch or two-finger scroll). */
  multiTouch: boolean;
};

/** Whether one completed touch on the page is a chrome toggle. */
export function isChromeTap(s: TapSample): boolean {
  if (s.longPressFired || s.multiTouch) return false;
  if (s.scrollingAtStart || s.scrollingAtEnd) return false;
  if (s.pressMs >= CHROME_TAP_MAX_MS) return false;
  if (s.movedPt >= CHROME_TAP_MAX_MOVE_PT) return false;
  return true;
}

/** Fade length: none under Reduce Motion. */
export function chromeFadeMs(reduceMotion: boolean): number {
  return reduceMotion ? 0 : CHROME_FADE_MS;
}

/** A screen reader keeps the chrome up permanently: there is no tap to find. */
export function chromeIsUp(shown: boolean, screenReaderOn: boolean): boolean {
  return screenReaderOn || shown;
}

/** The next `shown` after a tap; a screen reader pins it up. */
export function chromeAfterTap(shown: boolean, screenReaderOn: boolean): boolean {
  return screenReaderOn ? true : !shown;
}

/**
 * Accumulates one touch from raw touch events. The component only forwards
 * `start/move/end/cancel`; every gate lives in `isChromeTap`.
 */
export class ChromeTapTracker {
  private active = false;
  private startMs = 0;
  private x = 0;
  private y = 0;
  private moved = 0;
  private multi = false;
  private scrollingAtStart = false;
  private longPress = false;
  private consumed = false;

  start(p: { x: number; y: number; ms: number; touches: number; scrolling: boolean }): void {
    this.active = true;
    this.startMs = p.ms;
    this.x = p.x;
    this.y = p.y;
    this.moved = 0;
    this.multi = p.touches > 1;
    this.scrollingAtStart = p.scrolling;
    this.longPress = false;
    this.consumed = false;
  }

  move(p: { x: number; y: number; touches: number }): void {
    if (!this.active) return;
    if (p.touches > 1) this.multi = true;
    this.moved = Math.max(this.moved, Math.hypot(p.x - this.x, p.y - this.y));
  }

  /** An ayah's long-press fired during this touch: it never toggles. */
  noteLongPress(): void {
    this.longPress = true;
  }

  /**
   * An in-page control (a note row, a recommendation's dismiss, a retry button)
   * took this touch: it bubbles to the page, but it is not a tap on the page.
   */
  consumeTouch(): void {
    this.consumed = true;
  }

  cancel(): void {
    this.active = false;
  }

  /** `true` when the finished touch is a toggle. */
  end(p: { ms: number; scrolling: boolean }): boolean {
    if (!this.active) return false;
    this.active = false;
    if (this.consumed) return false;
    return isChromeTap({
      pressMs: p.ms - this.startMs,
      movedPt: this.moved,
      scrollingAtStart: this.scrollingAtStart,
      scrollingAtEnd: p.scrolling,
      longPressFired: this.longPress,
      multiTouch: this.multi,
    });
  }
}

/**
 * Al-Fatiha's basmala is its first ayah (it is already in the text) and
 * At-Tawbah has none, so the plain line above the text is for the rest.
 */
export function basmalaShown(surahNumber: number): boolean {
  return surahNumber !== 1 && surahNumber !== 9;
}

export const BASMALA_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/**
 * The footer band sits straight on the home-indicator inset (2349:1010); the
 * 8pt under the labels is the button's own padding. Devices without an inset
 * keep 8 so the labels do not touch the screen edge.
 */
export function chromeBottomPad(insetBottom: number): number {
  return Math.max(insetBottom, 8);
}

/** DIV-47 (2349:994): items 16 apart. `flexWrap` handles large type and narrow phones. */
export const META_GAP = 16;

/** The meta text box (89-109) is centred 54 below the status bar inset. */
export const META_CENTRE_BELOW_INSET = 54;
/** DIV-47's text is TheMixArab 14; the role's 1.5 floor makes the line 21, not the frame's 20. */
export const META_LINE_HEIGHT = TEXT_ROLES.bodyCompact.lineHeight;

/** Top padding that lands the meta line's centre on the frame, under a header of `headerHeight`. */
export function metaTopPad(headerHeight: number): number {
  return Math.max(0, META_CENTRE_BELOW_INSET - META_LINE_HEIGHT / 2 - headerHeight);
}
