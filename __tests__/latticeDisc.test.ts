import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('the Library lattice disc (node 2207:17287)', () => {
  it('has pre-rendered PNGs that match the .fig', () => {
    const out = execFileSync('node', [path.join(ROOT, 'scripts/figma/extract-library-disc.js'), '--check'], {
      encoding: 'utf8',
    });
    expect(out).toMatch(/up to date/);
  });

  it('ships all three scales', () => {
    ['', '@2x', '@3x'].forEach((s) =>
      expect(fs.existsSync(path.join(ROOT, `assets/khazain/library/lattice-disc${s}.png`))).toBe(true),
    );
  });

  it('draws the raster, not hand-built diamonds', () => {
    const src = fs.readFileSync(path.join(ROOT, 'components/khazain/library/LatticeDisc.tsx'), 'utf8');
    expect(src).toMatch(/lattice-disc\.png/);
    expect(src).not.toMatch(/react-native-svg/);
  });
});
