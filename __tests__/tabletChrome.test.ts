import * as fs from 'fs';
import * as path from 'path';

import { headerArtGeometry } from '@/components/khazain/patterns/HeaderArt';

const src = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('headerArtGeometry', () => {
  it('keeps the phone styles exactly as they were', () => {
    expect(headerArtGeometry(false, 16)).toEqual({
      tile: { position: 'absolute', left: 0, top: 0, right: 0, height: 549 },
      cornerLarge: { position: 'absolute', left: 84, top: -17, width: 96, height: 94 },
      cornerSmall: { position: 'absolute', left: 356, top: 36, width: 37, height: 36 },
    });
  });

  it('ignores the inset on phones', () => {
    expect(headerArtGeometry(false, 300)).toEqual(headerArtGeometry(false, 16));
  });

  it('anchors the tablet art from the physical right at the page column', () => {
    const g = headerArtGeometry(true, 156);
    expect(g.tile).toEqual({ position: 'absolute', top: 0, right: 140, width: 393, height: 549 });
    expect(g.cornerLarge).toEqual({
      position: 'absolute',
      right: 353,
      top: -17,
      width: 96,
      height: 94,
    });
    expect(g.cornerSmall).toEqual({
      position: 'absolute',
      right: 140,
      top: 36,
      width: 37,
      height: 36,
    });
  });

  it('does not stretch the tablet tile', () => {
    const g = headerArtGeometry(true, 156);
    expect(g.tile).not.toHaveProperty('left');
  });
});

describe('tablet chrome wiring', () => {
  it('sizes the tab bar and MiniPlayer from the responsive helpers', () => {
    const s = src('components/khazain/primitives/CustomTabBar.tsx');
    expect(s).toContain('tabBarRow');
    expect(s).toContain('miniPlayerMaxWidth');
    expect(s).toContain('isTablet');
  });

  it.each([
    'components/khazain/sheets/SheetShell.tsx',
    'app/note-editor.tsx',
    'app/notes-viewer.tsx',
  ])('%s caps the sheet on tablets only', (file) => {
    const s = src(file);
    expect(s).toMatch(/sheetMaxWidth|centredColumn/);
    expect(s).toContain('isTablet');
  });
});
