import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app/(tabs)/more/community/group/[id].tsx'),
  'utf8',
);
// Style keys sit at two-space indent; the block runs to the first closing brace.
const block = (name: string) => source.match(new RegExp(`\\n  ${name}: \\{([^}]*)\\}`))![1];

describe('group join-code chip', () => {
  it('keeps the code on one line, shrinking the font before it would wrap', () => {
    const text = source.match(/<Text style=\{styles\.code\}([^>]*)>/);
    expect(text).not.toBeNull();
    expect(text![1]).toMatch(/numberOfLines=\{1\}/);
    expect(text![1]).toMatch(/adjustsFontSizeToFit/);
    // `minimumFontScale` is a Fabric Text attribute and sets the shrink floor;
    // `minimumFontSize` is not one, so it would never reach native code.
    expect(text![1]).toMatch(/minimumFontScale=\{0\.6\}/);
    expect(text![1]).not.toMatch(/minimumFontSize|\{\.\.\./);
    expect(source).not.toMatch(/CODE_FIT/);
  });

  it('does not shrink-wrap the code Text (Android 15 line-break mismatch)', () => {
    expect(block('codeBox')).not.toMatch(/alignItems:\s*'(flex-end|center|flex-start)'/);
    expect(block('codeBox')).toMatch(/alignItems:\s*'stretch'/);
    expect(source.match(/\n  code: .*/)![0]).toMatch(/textAlign:\s*'center'/);
  });

  it('still announces the code letter by letter', () => {
    expect(source).toMatch(/accessibilityLabel=\{codeA11y\(detail\.group\.joinCode\)\}/);
  });
});
