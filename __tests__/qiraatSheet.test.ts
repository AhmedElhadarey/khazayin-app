import fs from 'fs';
import path from 'path';
import { SHEET_LIST_GEOMETRY, sheetListHeight } from '@/components/khazain/sheets/SheetShell';
import { sheetMaxWidth } from '@/constants/responsive';
import {
  QIRAAT_SHEET_ROUTE,
  pickQiraa,
  qiraatRedirectPlan,
} from '@/services/reciterNavigation';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Figma node 2457:954 (+ design D4): the qiraat list is a bottom sheet. */
describe('qiraat sheet route', () => {
  it('is a root-level transparentModal with a fade', () => {
    const src = read('app/_layout.tsx');
    expect(src).toMatch(
      /name="qiraat-sheet"\s+options=\{\{\s+headerShown: false,\s+presentation: 'transparentModal',\s+animation: 'fade',/,
    );
    expect(fs.existsSync(path.join(ROOT, 'app/qiraat-sheet.tsx'))).toBe(true);
    expect(QIRAAT_SHEET_ROUTE).toBe('/qiraat-sheet');
  });

  it('is built on SheetShell in its list-sheet layout and sets the default before closing', () => {
    const src = read('app/qiraat-sheet.tsx');
    expect(src).toMatch(/<SheetShell[^>]*layout="list"/);
    expect(src).toMatch(/pickQiraa\(/);
    expect(src).not.toMatch(/onPress=\{\(\) => router\.back\(\)\}/);
  });

  it('keeps /sections/qiraat as a redirect, with no list of its own', () => {
    const src = read('app/(tabs)/sections/qiraat.tsx');
    expect(src).toMatch(/qiraatRedirectPlan/);
    expect(src).not.toMatch(/ReciterRow/);
  });

  it('redirect lands the sheet over the reciter screen (qiraat tab), never an empty stack', () => {
    const plan = qiraatRedirectPlan();
    expect(plan.replace).toBe('/sections/reciter?tab=qiraat');
    expect(plan.push).toBe(QIRAAT_SHEET_ROUTE);
  });
});

describe('pickQiraa', () => {
  it('persists the default BEFORE closing', () => {
    const calls: string[] = [];
    pickQiraa('q3', (id) => calls.push(`set:${id}`), () => calls.push('close'));
    expect(calls).toEqual(['set:q3', 'close']);
  });

  it('still closes if persisting throws', () => {
    const close = jest.fn();
    expect(() =>
      pickQiraa('q3', () => {
        throw new Error('x');
      }, close),
    ).not.toThrow();
    expect(close).toHaveBeenCalled();
  });
});

describe('list-sheet geometry (Figma 2457:954)', () => {
  it('matches the frame tokens', () => {
    expect(SHEET_LIST_GEOMETRY).toMatchObject({
      radius: 16,
      strokeWidth: 1,
      strokeColor: 'rgba(215,185,149,0.16)',
      grabberWidth: 36,
      grabberHeight: 4,
      grabberTop: 8,
      titleTop: 28,
      titleBottom: 48,
      firstRowTop: 56,
    });
  });

  it('is 712/844 of the window', () => {
    expect(sheetListHeight(844)).toBe(712);
    expect(sheetListHeight(800)).toBe(Math.round((800 * 712) / 844));
  });

  it('keeps the tablet width cap', () => {
    expect(sheetMaxWidth(1024)).toBe(600);
    expect(read('components/khazain/sheets/SheetShell.tsx')).toMatch(/sheetColumn\(/);
  });
});

describe('scrim', () => {
  it('list layout shares the one backdrop style the telegram/youtube sheets use', () => {
    const src = read('components/khazain/sheets/SheetShell.tsx');
    expect(src.match(/style=\{styles\.backdrop\}/g)).toHaveLength(2);
    expect(src.match(/rgba\(20,15,8,0\.45\)/g)).toHaveLength(1);
  });
});

describe('navigation and screen map', () => {
  it('reciterDestination targets the sheet for the qiraat style', () => {
    const src = read('services/reciterNavigation.ts');
    expect(src).toMatch(/return QIRAAT_SHEET_ROUTE/);
  });

  it('maps 2457:954 to the sheet and flags 2102:3187 as a tab-state deviation', () => {
    const map = JSON.parse(read('docs/visual-regression/figma-mobile-screen-map.json'));
    const q = map.find((r: any) => r.nodeId === '2457:954');
    expect(q.appRoute).toBe('/sections/qiraat');
    expect(q.presentation).toBe('sheet');
    const m = map.find((r: any) => r.nodeId === '2102:3187');
    expect(m.deviation).toBe('modelled as tab state (D5)');
  });
});
