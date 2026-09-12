import fs from 'fs';
import path from 'path';

/**
 * The RTL contract, enforced on source text.
 *
 * `CLAUDE.md` bans relying on React Native's automatic left/right flipping
 * under `I18nManager.forceRTL(true)`: it differs between a cold native start,
 * a Fast Refresh and web, and some platform views apply it twice.
 *
 * The failure this test exists to catch is not theoretical. Every screen listed
 * below was authored before the contract landed and rendered its headings,
 * labels and values against the physical LEFT on both iOS and Android — the
 * defect the user reported as "all the headers on the more page is left sided
 * not right". Two mechanisms produced it, and both are checked here:
 *
 *   1. `alignItems: 'flex-end'` / `textAlign: 'right'` inside a container whose
 *      direction is left to forceRTL. The container is RTL, so `flex-end` and
 *      `right` are the physical LEFT. `PHYSICAL_BOX` pins `direction: 'ltr'`
 *      and makes them the physical right again.
 *   2. `flexDirection: 'row-reverse'` on an unpinned row. The row is already
 *      RTL, so `row-reverse` renders left -> right and the JSX-first child —
 *      normally the label — lands on the physical left. `PHYSICAL_ROW` plus
 *      children authored in physical left -> right order fixes the order
 *      without depending on the platform.
 */

const ROOT = path.resolve(__dirname, '..');

/**
 * Screens whose layout is authored directly rather than via a khazain
 * primitive, so the pin has to be on the screen itself.
 *
 * A screen leaves this list when it stops hand-rolling its chrome:
 * `app/(tabs)/more/settings.tsx` did, when its bare title became an
 * `InlineHeader` — which carries the pin, and the back control it was missing.
 */
const PINNED_SCREENS = [
  'app/settings-about.tsx',
  'app/settings-font-size.tsx',
  'app/settings-prayer.tsx',
  'app/settings-qiraa.tsx',
  'app/settings-reciter.tsx',
  'app/settings-wird-goal.tsx',
  'app/settings-wird-reminder.tsx',
  'app/note-editor.tsx',
  'app/notes-viewer.tsx',
  'app/search.tsx',
  'app/share-sheet.tsx',
  'app/(tabs)/more/settings-progress.tsx',
  'components/khazain/sheets/SheetRow.tsx',
  'components/khazain/settings/SettingsSection.tsx',
] as const;

/** Strip `//` and `/* *\/` comments so a prose mention of a banned rule passes. */
function code(file: string): string {
  return fs
    .readFileSync(path.join(ROOT, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('the physical RTL contract holds on every hand-authored screen', () => {
  it.each(PINNED_SCREENS)('%s imports the contract', (file) => {
    const src = code(file);
    expect(src).toMatch(/PHYSICAL_(BOX|ROW)/);
  });

  it.each(PINNED_SCREENS)('%s does not reach for row-reverse', (file) => {
    // `row-reverse` is the auto-flip reliance in its most common disguise: it
    // only reads correctly if the container is LTR, which under forceRTL it is
    // not. PHYSICAL_ROW states the order instead of inferring it.
    expect(code(file)).not.toMatch(/flexDirection:\s*'row-reverse'/);
  });
});

describe('no unpinned container claims a physical edge', () => {
  // A style object that positions against `left`/`right` — or stacks with
  // `flex-end` — is only unambiguous inside a container that has set its own
  // direction. These files were each caught doing it without one.
  it.each(PINNED_SCREENS)('%s pins before it uses a physical edge', (file) => {
    const src = code(file);
    const usesPhysicalEdge =
      /(?:^|\s)(?:right|left):\s*\d/.test(src) ||
      /padding(?:Right|Left):\s*\d/.test(src) ||
      /alignItems:\s*'flex-end'/.test(src);
    if (!usesPhysicalEdge) return;
    expect(src).toMatch(/\.\.\.PHYSICAL_(BOX|ROW)/);
  });
});

describe('the contract itself cannot drift', () => {
  it('pins direction rather than reading I18nManager', () => {
    const src = code('constants/layout.ts');
    expect(src).toMatch(/PHYSICAL_BOX = Object\.freeze\(\{ direction: 'ltr' \}/);
    expect(src).toMatch(/flexDirection: 'row',\s*\n\s*direction: 'ltr',/);
    // Nothing in the contract may branch on runtime RTL state.
    expect(src).not.toMatch(/I18nManager\./);
  });
});
