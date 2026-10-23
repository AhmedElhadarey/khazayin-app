import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app/_layout.tsx'), 'utf8');

/** Every transparentModal must let the page show through under the scrim. */
describe('sheet routes keep the page visible', () => {
  it('SHEET_OPTIONS is a fade transparentModal with a transparent content background', () => {
    const m = src.match(/const SHEET_OPTIONS = \{([\s\S]*?)\} as const;/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/presentation: 'transparentModal'/);
    expect(m![1]).toMatch(/animation: 'fade'/);
    expect(m![1]).toMatch(/contentStyle: \{ backgroundColor: 'transparent' \}/);
  });

  it('no Stack.Screen declares transparentModal inline; all use SHEET_OPTIONS', () => {
    const screens = src.match(/<Stack\.Screen[\s\S]*?\/>/g) ?? [];
    const inline = screens.filter((s) => /transparentModal/.test(s));
    expect(inline).toEqual([]);
    const sheets = screens.filter((s) => /options=\{SHEET_OPTIONS\}/.test(s));
    const names = sheets.map((s) => s.match(/name="([^"]+)"/)![1]);
    expect(names).toEqual(
      expect.arrayContaining([
        'note-editor', 'notes-viewer', 'telegram-sheet', 'qiraat-sheet',
        'youtube-sheet', 'share-sheet', 'community-report-sheet',
      ]),
    );
  });
});
