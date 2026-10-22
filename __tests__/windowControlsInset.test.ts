import fs from 'fs';
import path from 'path';
import {
  WINDOW_CONTROLS_CLEARANCE,
  WINDOW_CONTROLS_MIN_IOS,
  isRtlLanguage,
  systemRtlFrom,
  windowControlsInset,
} from '@/constants/responsive';

const fullScreen = { width: 1032, height: 1376 };

describe('windowControlsInset', () => {
  const base = { os: 'ios', osVersion: '26.5', isPad: true, screen: fullScreen, systemRtl: false };

  it('reserves nothing for a full-screen iPad app', () => {
    expect(windowControlsInset({ ...base, window: fullScreen })).toEqual({ left: 0, right: 0 });
  });

  it('reserves the top-left corner of a windowed or tiled app (iPadOS 26 window controls)', () => {
    expect(windowControlsInset({ ...base, window: { width: 375, height: 1376 } })).toEqual({
      left: WINDOW_CONTROLS_CLEARANCE,
      right: 0,
    });
    expect(windowControlsInset({ ...base, window: { width: 1032, height: 900 } }).left).toBe(WINDOW_CONTROLS_CLEARANCE);
  });

  it('mirrors to the top-right when the system language is right-to-left', () => {
    expect(windowControlsInset({ ...base, systemRtl: true, window: { width: 516, height: 1376 } })).toEqual({
      left: 0,
      right: WINDOW_CONTROLS_CLEARANCE,
    });
  });

  it('never applies to phones or Android', () => {
    const narrow = { width: 375, height: 800 };
    expect(windowControlsInset({ ...base, isPad: false, window: narrow })).toEqual({ left: 0, right: 0 });
    expect(windowControlsInset({ ...base, os: 'android', window: narrow })).toEqual({ left: 0, right: 0 });
  });

  it('reserves nothing before iPadOS 26, which has no corner window controls', () => {
    const half = { width: 516, height: 1376 };
    expect(windowControlsInset({ ...base, osVersion: '18.6', window: half })).toEqual({ left: 0, right: 0 });
    expect(windowControlsInset({ ...base, osVersion: `${WINDOW_CONTROLS_MIN_IOS}.0`, window: half }).left).toBe(
      WINDOW_CONTROLS_CLEARANCE,
    );
  });
});

describe('systemRtlFrom', () => {
  it('reads the first entry of AppleLanguages', () => {
    expect(systemRtlFrom(['ar-EG', 'en-EG'])).toBe(true);
    expect(systemRtlFrom(['en-EG', 'ar-EG'])).toBe(false);
    expect(systemRtlFrom([])).toBe(false);
    expect(systemRtlFrom(undefined)).toBe(false);
    expect(systemRtlFrom('ar')).toBe(false);
  });
});

describe('isRtlLanguage', () => {
  it('reads the primary language tag', () => {
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('ar-SA')).toBe(true);
    expect(isRtlLanguage('he-IL')).toBe(true);
    expect(isRtlLanguage('fa')).toBe(true);
    expect(isRtlLanguage('ur')).toBe(true);
    expect(isRtlLanguage('en-US')).toBe(false);
    expect(isRtlLanguage('fr')).toBe(false);
    expect(isRtlLanguage(undefined)).toBe(false);
  });
});

describe('Home header wiring', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'components/khazain/home/HomeHeader.tsx'),
    'utf8',
  );
  it('pads its physical row by the window-controls inset', () => {
    expect(src).toMatch(/useWindowControlsInset\(\)/);
    expect(src).toMatch(/style=\{\[styles\.row, \{ paddingLeft: controls\.left, paddingRight: controls\.right \}\]\}/);
    // The row must stay pinned to physical order, or paddingLeft would flip sides under forceRTL.
    expect(src).toMatch(/row: \{\s*\.\.\.PHYSICAL_ROW/);
  });
});

describe('top headers clear the window controls', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const margins = /\{ marginLeft: controls\.left, marginRight: controls\.right \}/;

  it('InlineHeader moves its back control and title clear of them', () => {
    const src = read('components/khazain/primitives/InlineHeader.tsx');
    expect(src).toMatch(/useWindowControlsInset\(\)/);
    expect(src).toMatch(/styles\.touchArea,\s*\{ marginLeft: controls\.left, marginRight: controls\.right/);
    expect(src).toMatch(/row: \{\s*\.\.\.PHYSICAL_ROW/);
  });

  it.each([
    ['app/(tabs)/sections/index.tsx', 'الأقسام'],
    ['app/(tabs)/more/index.tsx', 'المزيد'],
    ['app/(tabs)/library.tsx', 'مكتبتي'],
  ])('%s moves its page title clear of them', (file, title) => {
    const src = read(file);
    expect(src).toMatch(/useWindowControlsInset\(\)/);
    const line = src.split('\n').find((l) => l.includes(`>${title}</Text>`))!;
    expect(line).toMatch(/style=\{\[styles\.h1, /);
    expect(line).toMatch(margins);
    // The margin is physical only because the title's container is pinned to ltr.
    expect(src).toMatch(/headerBlock: \{\s*(?:\/\/[^\n]*\n\s*)*\.\.\.PHYSICAL_BOX/);
  });
});
