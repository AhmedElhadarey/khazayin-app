// One-shot generator that reads assets/khazain/home/she5-{1,2,3}.svg
// and writes components/khazain/home/scholarSvgs.ts with their XML
// content as exported template-literal strings. Run with:
//   node scripts/generate-scholar-svgs.js
//
// The output TS module is committed; this script only needs to run when
// the source SVGs change.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'assets', 'khazain', 'home');
const outFile = path.join(repoRoot, 'components', 'khazain', 'home', 'scholarSvgs.ts');

const files = ['she5-1.svg', 'she5-2.svg', 'she5-3.svg'];
const exportNames = ['SCHOLAR_SVG_1', 'SCHOLAR_SVG_2', 'SCHOLAR_SVG_3'];

const escapeForTemplate = (s) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');

let out =
  '// Auto-generated from assets/khazain/home/she5-{1,2,3}.svg.\n' +
  '// Source SVGs contain embedded base64 raster patterns; rendered via SvgXml.\n' +
  '// Regenerate with: node scripts/generate-scholar-svgs.js\n' +
  '/* eslint-disable */\n\n';

for (let i = 0; i < files.length; i++) {
  const xml = fs.readFileSync(path.join(srcDir, files[i]), 'utf8').replace(/\r?\n/g, '\n').trim();
  out += `export const ${exportNames[i]} = \`${escapeForTemplate(xml)}\`;\n\n`;
}

fs.writeFileSync(outFile, out);
console.log('Wrote', fs.statSync(outFile).size, 'bytes →', path.relative(repoRoot, outFile));
