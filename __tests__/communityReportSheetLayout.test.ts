import fs from 'fs';
import path from 'path';
import {
  REPORT_CHROME_RESERVE,
  REPORT_LIST_MIN_HEIGHT,
  reportListMaxHeight,
  shouldRevealNote,
} from '@/services/community/reportSheetLayout';

describe('reportListMaxHeight', () => {
  const phone = { windowHeight: 800, topInset: 24, bottomInset: 0, fontScale: 1 };

  it('keeps the original half-height cap while there is room', () => {
    expect(reportListMaxHeight({ ...phone, keyboardHeight: 0 })).toBe(400);
  });

  it('shrinks the list so the title stays below the status bar when the keyboard is open', () => {
    const h = reportListMaxHeight({ windowHeight: 844, topInset: 47, bottomInset: 34, fontScale: 1, keyboardHeight: 336 });
    expect(h).toBe(844 - 47 - 336 - REPORT_CHROME_RESERVE);
    // Everything stacked (chrome + list + keyboard) fits under the status bar.
    expect(h + REPORT_CHROME_RESERVE + 336 + 47).toBeLessThanOrEqual(844);
  });

  it('reserves more chrome at large font scales', () => {
    const a = reportListMaxHeight({ ...phone, keyboardHeight: 300 });
    const b = reportListMaxHeight({ ...phone, keyboardHeight: 300, fontScale: 1.3 });
    expect(b).toBeLessThan(a);
  });

  it('never collapses below a couple of rows', () => {
    expect(reportListMaxHeight({ ...phone, windowHeight: 500, keyboardHeight: 400 })).toBe(REPORT_LIST_MIN_HEIGHT);
  });

  it('accounts for the bottom inset when no keyboard is shown', () => {
    const noInset = reportListMaxHeight({ windowHeight: 500, topInset: 0, bottomInset: 0, fontScale: 1, keyboardHeight: 0 });
    const inset = reportListMaxHeight({ windowHeight: 500, topInset: 0, bottomInset: 60, fontScale: 1, keyboardHeight: 0 });
    expect(inset).toBeLessThanOrEqual(noInset);
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

  it('keeps the keyboard avoidance and shows a scroll indicator', () => {
    expect(src).toMatch(/<KeyboardAvoidingView/);
    expect(src).not.toMatch(/showsVerticalScrollIndicator=\{false\}/);
  });
});
