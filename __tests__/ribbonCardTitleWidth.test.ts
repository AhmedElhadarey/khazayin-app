import fs from 'fs';
import path from 'path';

// Android 15+ (targetSdk >= 35) breaks lines by glyph ink bounds
// (useBoundsForWidth) while RN 0.81 measures Text by advances, so a
// shrink-wrapped Text gets a box too narrow and loses its last word.
const source = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/primitives/RibbonCard.tsx'),
  'utf8',
);

describe('RibbonCard titleBlock', () => {
  it('does not shrink-wrap its Texts (Android 15 bounds-vs-advance line-break mismatch drops the last word)', () => {
    const match = source.match(/titleBlock:\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body).not.toMatch(/alignItems:\s*'(flex-end|center|flex-start)'/);
    expect(body).toMatch(/alignItems:\s*'stretch'/);
  });
});
