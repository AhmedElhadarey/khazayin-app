import fs from 'fs';
import path from 'path';

// Android 15+ (targetSdk >= 35) breaks lines by glyph ink bounds
// (useBoundsForWidth) while RN 0.81 measures Text by advances, so a
// shrink-wrapped Text gets a box too narrow and loses its last word.
const source = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/primitives/DawahPosterRow.tsx'),
  'utf8',
);

describe('DawahPosterRow titleWrap', () => {
  it('does not shrink-wrap its title (Android 15 bounds-vs-advance line-break mismatch drops the last word)', () => {
    const match = source.match(/titleWrap:\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body).not.toMatch(/alignItems:\s*'(flex-end|center|flex-start)'/);
    expect(body).toMatch(/alignItems:\s*'stretch'/);
  });

  it('right-aligns the full-width title through its role', () => {
    // The whole `title: { ... }` entry: it nests textStyle's own braces.
    const at = source.indexOf('\n  title: {');
    expect(at).toBeGreaterThan(-1);
    const title = source.slice(at, source.indexOf('\n  },', at));
    expect(title).toMatch(/alignSelf:\s*'stretch'/);
    expect(title).toMatch(/textStyle\('cardTitle', \{ color: KhazainColors\.inkTitle \}\)/);
    // textStyle carries RTL_TEXT (textAlign 'right'); an override would undo it.
    expect(title).not.toMatch(/textAlign/);
  });
});
