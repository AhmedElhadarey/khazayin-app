/**
 * One sheet chrome (NOFRAME-17) and the danger token (NOFRAME-29). No Figma
 * frame covers these sheets; the authority is constants/layout.ts SHEET_CHROME.
 * The qiraat list sheet keeps frame 2457:954's own geometry.
 */
import fs from 'fs';
import path from 'path';
import { SHEET_CHROME } from '@/constants/layout';
import { KhazainColors, withAlpha } from '@/constants/theme';
import { SHEET_LIST_GEOMETRY } from '@/components/khazain/sheets/SheetShell';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('withAlpha', () => {
  it('turns a 6-digit hex into rgba', () => {
    expect(withAlpha('#281E13', 0.18)).toBe('rgba(40, 30, 19, 0.18)');
    expect(withAlpha('#B43838', 0.25)).toBe('rgba(180, 56, 56, 0.25)');
  });
  it('rejects a non-hex input', () => {
    expect(() => withAlpha('rgba(0,0,0,1)' as `#${string}`, 0.5)).toThrow();
  });
});

describe('SHEET_CHROME', () => {
  it('states one chrome', () => {
    expect(SHEET_CHROME.handleWidth).toBe(44);
    expect(SHEET_CHROME.handleHeight).toBe(4);
    expect(SHEET_CHROME.handleColor).toBe(withAlpha(KhazainColors.inkTitle, 0.18));
    expect(SHEET_CHROME.topRadius).toBe(24);
    expect(SHEET_CHROME.paddingHorizontal).toBe(16);
    expect(typeof SHEET_CHROME.backdrop).toBe('string');
  });
});

const SHEETS = [
  'app/note-editor.tsx',
  'app/notes-viewer.tsx',
  'app/settings-qiraa.tsx',
  'app/settings-reciter.tsx',
  'app/settings-font-size.tsx',
  'app/settings-about.tsx',
  'app/settings-notifications.tsx',
  'app/settings-prayer.tsx',
  'app/settings-wird-goal.tsx',
  'app/settings-wird-reminder.tsx',
];

describe.each(SHEETS)('%s', (file) => {
  const src = read(file);
  it('draws the shared handle, not its own', () => {
    expect(src).toMatch(/<SheetHandle \/>/);
    expect(src).not.toMatch(/styles\.handle\b/);
    expect(src).not.toMatch(/rgba\((40,30,19|120,100,80),/);
  });
});

describe('note sheets', () => {
  it.each(['app/note-editor.tsx', 'app/notes-viewer.tsx'])('%s spreads SHEET_CHROME', (f) => {
    const src = read(f);
    expect(src).toMatch(/SHEET_CHROME\.backdrop/);
    expect(src).toMatch(/SHEET_CHROME\.topRadius/);
    expect(src).toMatch(/SHEET_CHROME\.paddingHorizontal/);
    expect(src).not.toMatch(/rgba\(20,30,30/);
  });
});

describe('SheetShell', () => {
  const src = read('components/khazain/sheets/SheetShell.tsx');
  it('default layout uses SHEET_CHROME', () => {
    expect(src).toMatch(/<SheetHandle \/>/);
    expect(src).toMatch(/backgroundColor: SHEET_CHROME\.backdrop/);
    expect(src).toMatch(/borderTopLeftRadius: SHEET_CHROME\.topRadius/);
    expect(src).toMatch(/paddingHorizontal: SHEET_CHROME\.paddingHorizontal/);
    expect(src).not.toMatch(/rgba\(141,107,52,0\.25\)|rgba\(20,15,8,0\.45\)/);
  });
  it('the qiraat list sheet keeps frame 2457:954 geometry', () => {
    expect(SHEET_LIST_GEOMETRY).toMatchObject({
      radius: 16,
      grabberWidth: 36,
      grabberHeight: 4,
      grabberTop: 8,
      titleTop: 28,
      titleBottom: 48,
      firstRowTop: 56,
    });
    const list = src.slice(src.indexOf('listWrap: {'), src.indexOf('sheet: {'));
    expect(list).not.toMatch(/SHEET_CHROME/);
    expect(list).toMatch(/hairlineWarm/);
  });
});

describe('danger token', () => {
  it('is one red with a derived border', () => {
    expect(KhazainColors.danger).toBe('#B43838');
    expect(KhazainColors.dangerBorder).toBe(withAlpha('#B43838', 0.18));
  });
  it.each([
    'app/note-editor.tsx',
    'app/(tabs)/more/settings-progress.tsx',
    'app/(tabs)/more/community/index.tsx',
    'app/(tabs)/more/community/create.tsx',
    'app/(tabs)/more/community/join.tsx',
    'app/(tabs)/more/community/group/[id].tsx',
    'components/khazain/community/Composer.tsx',
    'app/community-report-sheet.tsx',
    'app/(tabs)/sections/discussion/[lectureId].tsx',
    'components/khazain/community/PostRow.tsx',
  ])('%s has no stray red', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/#B43838|#C04A3A|rgba\(176,\s*52,\s*40|Colors\.light\.error/i);
  });
});

describe('settings-progress input and type', () => {
  const src = read('app/(tabs)/more/settings-progress.tsx');
  it('shows Arabic-Indic digits and stores ASCII', () => {
    expect(src).toMatch(/value=\{toArabicDigits\(draft\)\}/);
    expect(src).toMatch(/setDraft\(fromArabicDigits\(t\)\.replace\(\/\[\^0-9\]\/g, ''\)\)/);
  });
  it('uses roles and no literal type or colours', () => {
    expect(src).not.toMatch(/fontSize:|fontFace|#fff|rgba\(/);
    expect(src).toMatch(/hint: textStyle\('caption'/);
    expect(src).toMatch(/error: textStyle\('caption'/);
  });
});

describe('SheetShell structure', () => {
  const src = read('components/khazain/sheets/SheetShell.tsx');
  it('keeps list-only hooks inside ListSheetFrame', () => {
    const shell = src.slice(src.indexOf('export function SheetShell'));
    expect(shell).not.toMatch(/useWindowDimensions|useState/);
    expect(src).toMatch(/function ListSheetFrame/);
  });
  it('takes the list stroke from a token', () => {
    expect(src).not.toMatch(/rgba\(215/);
    expect(KhazainColors.sheetStroke).toBe(withAlpha(KhazainColors.goldCalligraphy as `#${string}`, 0.16));
  });
});

describe('note editor matches the Library quick-note card', () => {
  const src = read('app/note-editor.tsx');
  it('uses the library note contracts', () => {
    expect(src).toMatch(/height: 36,\s*paddingHorizontal: 16,\s*borderRadius: 8/);
    expect(src).toMatch(/borderColor: KhazainColors\.hairlineWarm/);
    expect(src).toMatch(/borderRadius: RECENT_NOTE_ROW\.radius/);
    expect(src).toMatch(/minHeight: RECENT_NOTE_ROW\.height/);
    expect(src).toMatch(/recentTitle: textStyle\('cardTitle', \{ color: KhazainColors\.ink500 \}\)/);
    expect(src).toMatch(/recentTime: textStyle\('label', \{ color: KhazainColors\.ink500 \}\)/);
    expect(src).toMatch(/saveLabel: textStyle\('cardTitle', \{ color: KhazainColors\.pageBg \}\)/);
    expect(src).not.toMatch(/#fff/);
  });
  it('notes-viewer row title is a cardTitle', () => {
    expect(read('app/notes-viewer.tsx')).toMatch(/rowTitle: textStyle\('cardTitle', \{ color: KhazainColors\.ink900 \}\)/);
  });
});
