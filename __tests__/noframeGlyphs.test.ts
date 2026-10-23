import fs from 'fs';
import path from 'path';
import { FIGMA_ICONS } from '@/components/khazain/icons/generated/figmaIcons';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/**
 * T25 — screens with no Figma frame still draw the file's own glyphs wherever
 * the file has one. Authority is the in-repo contracts plus the generated
 * glyph set; these pins keep hand-drawn stand-ins from creeping back.
 */
describe('NOFRAME-08: search / saved badges', () => {
  const src = read('services/search/rowProps.tsx');
  it('uses the surah star and the quill badge, not inline discs', () => {
    expect(src).toMatch(/<SurahStar[^>]*index=\{[^}]*displayNumber[^}]*\}/);
    expect(src).not.toMatch(/SurahNumberBadge|ScholarMedallion/);
    expect(src).toMatch(/CARD_DENSITY\.surahBadgeDisc/);
    expect(src).toMatch(/<QuillBadge size=\{40\}/);
    expect(src).not.toMatch(/badgeStyles|surahBadge:|scholarBadge:/);
  });
  it('the glyphs exist in the generated set', () => {
    expect(FIGMA_ICONS).toHaveProperty('SurahStar');
    expect(FIGMA_ICONS).toHaveProperty('BadgeQuill');
  });
});

describe('NOFRAME-13: note editor format toolbar', () => {
  const editor = read('app/note-editor.tsx');
  const library = read('app/(tabs)/library.tsx');
  const shared = read('components/khazain/primitives/FormatButton.tsx');
  it('draws the three file marks through the shared button', () => {
    for (const name of ['NoteBold', 'NoteItalic', 'NoteListFormat']) {
      expect(editor).toMatch(new RegExp(`name="${name}"`));
      expect(library).toMatch(new RegExp(`name="${name}"`));
    }
    expect(editor).toMatch(/FormatButton/);
    expect(library).toMatch(/FormatButton/);
    expect(editor).not.toMatch(/function FormatBtn|ListGlyph|fontFamily: 'System'/);
    expect(library).not.toMatch(/function FormatBtn/);
  });
  it('the shared button is 32 at radius 16 on cardBg with a 6pt hitSlop', () => {
    expect(shared).toMatch(/width: 32/);
    expect(shared).toMatch(/borderRadius: 16/);
    expect(shared).toMatch(/backgroundColor: KhazainColors\.cardBg/);
    expect(shared).toMatch(/hitSlop=\{6\}/);
  });
});

describe('NOFRAME-18: telegram / youtube sheets', () => {
  it('draw the file glyphs in cream50', () => {
    const tg = read('app/telegram-sheet.tsx');
    const yt = read('app/youtube-sheet.tsx');
    const share = read('app/share-sheet.tsx');
    expect(tg).toMatch(/name="MoreTelegram"[^>]*cream50/);
    expect(yt).toMatch(/name="MoreYoutube"[^>]*cream50/);
    expect(share).toMatch(/name="MoreTelegram"[^>]*INK/);
    expect(share).toMatch(/const INK = KhazainColors\.cream50/);
    for (const s of [tg, yt, share]) {
      expect(s).not.toMatch(/#2AABEE|#FF3B30/);
    }
    expect(share).not.toMatch(/gold200/);
    // one tint for the drawn marks
    expect(share).not.toMatch(/#fff/i);
  });
});

describe('NOFRAME-21: settings row glyphs', () => {
  const settings = read('app/(tabs)/more/settings.tsx');
  const notif = read('app/settings-notifications.tsx');
  const more = read('app/(tabs)/more/index.tsx');
  const glyphs = read('components/khazain/settings/SettingsGlyphs.tsx');
  it('pulls five rows from the file', () => {
    for (const [name, glyph] of [
      ['MoreAbout', 'AboutGlyph'],
      ['MoreWeb', 'LanguageGlyph'],
      ['LibraryReminders', 'NotificationsGlyph'],
      ['LibraryWird', 'WirdGoalGlyph'],
      ['LibraryNotes', 'ExportNotesGlyph'],
    ]) {
      expect(glyphs).toMatch(new RegExp(`${glyph} = \\(\\) => file\\('${name}'\\)`));
      expect(settings).toMatch(new RegExp(`<${glyph} />`));
      expect(FIGMA_ICONS).toHaveProperty(name);
    }
    expect(notif).toMatch(/<NotificationsGlyph \/>/);
  });
  it('shares one glyph size with More and no 28pt drawn marks remain', () => {
    expect(read('constants/rowGlyph.ts')).toMatch(/ROW_GLYPH\s*=\s*20/);
    expect(more).toMatch(/MORE_GLYPH = ROW_GLYPH/);
    expect(glyphs).toMatch(/size=\{ROW_GLYPH\}/);
    for (const s of [settings, notif, glyphs]) {
      expect(s).not.toMatch(/width=\{28\}/);
    }
    expect(settings).not.toMatch(/<Svg/);
    expect(notif).not.toMatch(/<Svg/);
  });
  it('no drawn path repeats an arc command back to back (zero-area subpath)', () => {
    const ds = [...glyphs.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    expect(ds.length).toBeGreaterThan(5);
    for (const d of ds) {
      const arcs = d.match(/[aA][^a-zA-Z]*/g) ?? [];
      for (let i = 1; i < arcs.length; i++) expect(arcs[i]).not.toBe(arcs[i - 1]);
    }
  });
  it('drawn marks are filled, not 1.5pt outlines', () => {
    expect(glyphs).not.toMatch(/strokeWidth=\{1\.5\}/);
  });
});

describe('NOFRAME-27: onboarding preview button', () => {
  const src = read('components/khazain/onboarding/PreviewButton.tsx');
  it('uses the file play (mirrored) and pause', () => {
    expect(src).toMatch(/name="Play"[^/>]*mirrored/);
    expect(src).toMatch(/name="Pause"/);
    expect(src).not.toMatch(/PlayIcon|PauseIcon|<Svg/);
  });
});
