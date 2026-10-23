/** Review fixes on the no-frame screens (T26). Source-level pins. */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('settings modals use SHEET_CHROME for side padding', () => {
  const files = fs.readdirSync(path.join(root, 'app')).filter((f) => /^settings-.*\.tsx$/.test(f));
  it('finds the modals', () => expect(files.length).toBeGreaterThanOrEqual(8));
  it.each(files)('%s has no literal body/list/footer padding 16', (f) => {
    const src = read(`app/${f}`);
    expect(src).not.toMatch(/(body|list|footerInner): \{[^}]*paddingHorizontal: 16/);
  });
});

describe('note editor', () => {
  const src = read('app/note-editor.tsx');
  it('save button has hitSlop and a button role', () => {
    expect(src).toMatch(/hitSlop=\{\{ top: 4, bottom: 4 \}\}/);
    expect(src).toMatch(/accessibilityRole="button"[\s\S]{0,120}accessibilityLabel="حفظ الملاحظة"/);
  });
  it('recent row matches the Library row padding', () => {
    expect(src).toMatch(/paddingHorizontal: 8,\s*paddingVertical: 4,/);
  });
  it('does not cite a Figma page', () => {
    expect(src).not.toMatch(/Figma page-0/);
    expect(read('app/notes-viewer.tsx')).not.toMatch(/Figma page-0/);
  });
});

describe('stale palette comment', () => {
  it('is gone', () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
        const rel = `${d}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(e.name) && read(rel).includes('Legacy palette: the Khazain tokens')) hits.push(rel);
      }
    };
    walk('app');
    walk('components');
    expect(hits).toEqual([]);
  });
});

describe('SettingsToggleRow', () => {
  it('pads vertically like StatusRow', () => {
    expect(read('components/khazain/settings/SettingsToggleRow.tsx')).toMatch(/paddingVertical: 8/);
  });
});
