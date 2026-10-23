import fs from 'fs';
import path from 'path';

/**
 * The Quran text and the basmala are drawn from the `Amiri-Bold` face itself.
 * `fontWeight: '700'` on top of it makes Android synthesise a system Naskh
 * bold instead of using the registered face, so the weight stays '400'.
 */
const src = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/mushaf.tsx'), 'utf8');

// The ayah tree, and its styles, live in AyatSegments.
const ayatSrc = fs.readFileSync(
  path.resolve(__dirname, '../components/khazain/mushaf/AyatSegments.tsx'),
  'utf8',
);
const styleBlock = (name: string): string => {
  const start = ayatSrc.indexOf(`  ${name}: {`);
  if (start < 0) return '';
  return ayatSrc.slice(start, ayatSrc.indexOf('\n  },', start));
};

describe('Mushaf reader Quran text face', () => {
  it('ayat body uses the Amiri-Bold face at weight 400', () => {
    const block = styleBlock('ayatBody');
    expect(block).toContain("fontFamily: 'Amiri-Bold'");
    expect(block).toContain("fontWeight: '400'");
    expect(block).not.toMatch(/fontWeight: '[5-9]00'/);
  });

  it('basmala line uses the Amiri-Bold face at weight 400', () => {
    const src2 = fs.readFileSync(
      path.resolve(__dirname, '../components/khazain/mushaf/SurahCartouche.tsx'),
      'utf8',
    );
    const start = src2.indexOf('  basmala: {');
    const block = src2.slice(start, src2.indexOf('\n  },', start));
    expect(block).toContain("fontFamily: 'Amiri-Bold'");
    expect(block).toContain("fontWeight: '400'");
  });
});
