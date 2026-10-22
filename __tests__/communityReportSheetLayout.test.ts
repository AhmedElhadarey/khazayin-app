import fs from 'fs';
import path from 'path';
import {
  REPORT_CHROME_RESERVE,
  REPORT_ERROR_RESERVE,
  REPORT_LIST_MIN_HEIGHT,
  reportListMaxHeight,
  sheetKeyboardLift,
  shouldRevealNote,
} from '@/services/community/reportSheetLayout';

describe('reportListMaxHeight', () => {
  const phone = { windowHeight: 800, topInset: 24, bottomInset: 0, fontScale: 1, errorShown: false };

  it('keeps the original half-height cap while there is room', () => {
    expect(reportListMaxHeight({ ...phone, keyboardHeight: 0 })).toBe(400);
  });

  it('reserves keyboard + bottom inset (the sheet shell still pads its safe area above the keyboard)', () => {
    const h = reportListMaxHeight({ windowHeight: 844, topInset: 47, bottomInset: 34, fontScale: 1, errorShown: false, keyboardHeight: 336 });
    expect(h).toBe(844 - 47 - (336 + 34) - REPORT_CHROME_RESERVE);
    expect(h + REPORT_CHROME_RESERVE + 336 + 34 + 47).toBeLessThanOrEqual(844);
  });

  it('reserves more chrome at large font scales, capped at 1.5x', () => {
    const base = { ...phone, windowHeight: 1000, keyboardHeight: 300 };
    const one = reportListMaxHeight(base);
    const big = reportListMaxHeight({ ...base, fontScale: 1.3 });
    expect(one - big).toBeCloseTo(REPORT_CHROME_RESERVE * 0.3);
    const cap = reportListMaxHeight({ ...base, fontScale: 1.5 });
    expect(one - cap).toBeCloseTo(REPORT_CHROME_RESERVE * 0.5);
    expect(reportListMaxHeight({ ...base, fontScale: 2 })).toBe(cap);
  });

  it('reserves room for the error line when it is shown', () => {
    const base = { ...phone, keyboardHeight: 300 };
    expect(reportListMaxHeight(base) - reportListMaxHeight({ ...base, errorShown: true })).toBe(REPORT_ERROR_RESERVE);
  });

  it('never collapses below two rows', () => {
    expect(REPORT_LIST_MIN_HEIGHT).toBeGreaterThanOrEqual(2 * 56 + 8);
    expect(reportListMaxHeight({ ...phone, windowHeight: 500, keyboardHeight: 400 })).toBe(REPORT_LIST_MIN_HEIGHT);
  });

  it('subtracts exactly the bottom inset when no keyboard is shown', () => {
    const at = (bottomInset: number) =>
      reportListMaxHeight({ windowHeight: 500, topInset: 0, bottomInset, fontScale: 1, errorShown: false, keyboardHeight: 0 });
    expect(at(0)).toBe(240);
    expect(at(60)).toBe(180);
  });
});

describe('sheetKeyboardLift', () => {
  it('lifts the sheet by the keyboard height on Android and drops back to 0 when it hides', () => {
    expect(sheetKeyboardLift('android', 280)).toBe(280);
    expect(sheetKeyboardLift('android', 0)).toBe(0);
  });
  it('leaves iOS to KeyboardAvoidingView', () => {
    expect(sheetKeyboardLift('ios', 280)).toBe(0);
  });
});

describe('shouldRevealNote', () => {
  it('scrolls only when «سبب آخر» becomes the choice', () => {
    expect(shouldRevealNote(null, 'other')).toBe(true);
    expect(shouldRevealNote('offensive', 'other')).toBe(true);
    expect(shouldRevealNote('other', 'other')).toBe(false);
    expect(shouldRevealNote('other', 'offensive')).toBe(false);
    expect(shouldRevealNote(null, 'offensive')).toBe(false);
  });
});

describe('report sheet wiring', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/community-report-sheet.tsx'), 'utf8');

  it('sizes the list from the keyboard and safe area, not a fixed half height', () => {
    expect(src).toMatch(/reportListMaxHeight\(/);
    expect(src).not.toMatch(/maxHeight:\s*height \* 0\.5/);
    expect(src).toMatch(/useSafeAreaInsets\(/);
  });

  it('scrolls the note into view and keeps the submit button outside the scroller', () => {
    expect(src).toMatch(/shouldRevealNote\(/);
    expect(src).toMatch(/scrollToEnd\(/);
    const scroller = src.slice(src.indexOf('<ScrollView'), src.indexOf('</ScrollView>'));
    expect(scroller).not.toMatch(/<PillButton/);
  });

  it('scrolls the note back into view when the field is focused or the list is resized by the keyboard', () => {
    expect(src).toMatch(/onFocus=\{/);
    expect(src).toMatch(/onLayout=\{/);
    expect(src.match(/scrollToEnd\(/g)!.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/errorShown:/);
  });

  it('keeps the keyboard avoidance and shows a scroll indicator', () => {
    expect(src).toMatch(/<KeyboardAvoidingView/);
    // On Android the sheet is a transparent modal over an edge-to-edge window: nothing
    // resizes it, and KeyboardAvoidingView's padding outlives the keyboard there.
    const kav = src.slice(src.indexOf('<KeyboardAvoidingView'), src.indexOf('<SheetShell'));
    expect(kav).toMatch(/behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
    expect(kav).toMatch(/paddingBottom: sheetKeyboardLift\(Platform\.OS, keyboardHeight\)/);
    expect(src).not.toMatch(/showsVerticalScrollIndicator=\{false\}/);
  });
});
