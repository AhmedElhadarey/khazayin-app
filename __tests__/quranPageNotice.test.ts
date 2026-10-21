import fs from 'fs';
import path from 'path';
import {
  QURAN_PAGE_DATA_CHANGES,
  QURAN_PAGE_DATA_CREDIT,
  QURAN_PAGE_DATA_LICENSE_LABEL,
  QURAN_PAGE_DATA_LICENSE_URL,
} from '@/constants/quranPages';

const about = fs.readFileSync(path.resolve(__dirname, '../app/settings-about.tsx'), 'utf8');
const data = fs.readFileSync(path.resolve(__dirname, '../constants/quranPageData.ts'), 'utf8');

/** CC BY 3.0 requires credit, the licence URI and a note of changes (design §4.6). */
describe('CC BY 3.0 notice for the Tanzil page data', () => {
  it('names the source, the licence URI and the changes', () => {
    expect(QURAN_PAGE_DATA_CREDIT).toContain('Tanzil.net');
    expect(QURAN_PAGE_DATA_LICENSE_URL).toBe('https://creativecommons.org/licenses/by/3.0/');
    expect(QURAN_PAGE_DATA_LICENSE_LABEL).toContain('CC BY 3.0');
    expect(QURAN_PAGE_DATA_CHANGES.length).toBeGreaterThan(0);
  });

  it('is rendered on About with a tappable licence link', () => {
    expect(about).toMatch(/مصادر البيانات/);
    expect(about).toMatch(/\{QURAN_PAGE_DATA_CREDIT\}/);
    expect(about).toMatch(/\{QURAN_PAGE_DATA_CHANGES\}/);
    expect(about).toMatch(/accessibilityRole="link"/);
    expect(about).toMatch(/openExternalUrl\(\s*QURAN_PAGE_DATA_LICENSE_URL\s*\)/);
  });

  it('opens links through canOpenURL with the Arabic fallback alert', () => {
    expect(about).toMatch(/async function openExternalUrl\(url: string\)/);
    expect(about).toMatch(/Linking\.canOpenURL\(url\)/);
    expect(about).toMatch(/Alert\.alert\('الرابط غير متاح'/);
  });

  it('keeps the licence and source in the generated data header', () => {
    expect(data).toContain('Creative Commons');
    expect(data).toContain('https://creativecommons.org/licenses/by/3.0/');
    expect(data).toContain('https://tanzil.net/res/text/metadata/quran-data.js');
  });
});
