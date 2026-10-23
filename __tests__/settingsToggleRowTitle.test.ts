import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/settings/SettingsToggleRow.tsx'),
  'utf8',
);

describe('SettingsToggleRow title', () => {
  it('lets the title wrap to two lines instead of truncating at one', () => {
    const title = source.match(/<Text style=\{styles\.title\}([^>]*)>/);
    expect(title).not.toBeNull();
    // Two lines at the default text size, through useLineClamp (unclamped when enlarged).
    expect(title![1]).toMatch(/numberOfLines=\{twoLines\}/);
    expect(source).toMatch(/const twoLines = useLineClamp\(2\);/);
  });

  it('does not shrink-wrap the text column (Android 15 line-break mismatch)', () => {
    const body = source.match(/textCol:\s*\{([^}]*)\}/)![1];
    expect(body).not.toMatch(/alignItems:\s*'(flex-end|center|flex-start)'/);
  });

  it('lets the row grow (no fixed height) and keeps the toggle centred', () => {
    const card = source.match(/card:\s*\{([^}]*)\}/)![1];
    expect(card).not.toMatch(/\bheight:/);
    expect(card).toMatch(/alignItems:\s*'center'/);
  });
});
