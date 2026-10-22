import fs from 'fs';
import path from 'path';

import { COMMUNITY_POST_ORDER, COMPOSER_ORDER, GROUP_ROW_ORDER } from '@/constants/rtlContracts';

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
  'app/content-search.tsx',
  'app/share-sheet.tsx',
  'app/(tabs)/more/settings-progress.tsx',
  'app/(tabs)/more/settings.tsx',
  'app/(tabs)/more/community/index.tsx',
  'app/(tabs)/more/community/guidelines.tsx',
  'app/(tabs)/more/community/create.tsx',
  'app/(tabs)/more/community/join.tsx',
  'app/(tabs)/more/community/group/[id].tsx',
  'app/(tabs)/sections/book/[id].tsx',
  'components/khazain/sheets/SheetRow.tsx',
  'components/khazain/community/PreviewBanner.tsx',
  'components/khazain/community/GroupRow.tsx',
  'components/khazain/community/MemberRow.tsx',
  'components/khazain/community/ChallengeCard.tsx',
  'components/khazain/community/ProgressBar.tsx',
  'components/khazain/community/PostRow.tsx',
  'components/khazain/community/Composer.tsx',
  'app/(tabs)/sections/discussion/index.tsx',
  'app/(tabs)/sections/discussion/[lectureId].tsx',
  'app/community-report-sheet.tsx',
  'components/khazain/settings/SettingsSection.tsx',
  // Onboarding. Not in the original sweep because it is the one flow the
  // captures never reached: the persisted `onboardingComplete` flag meant a
  // installed-once emulator always booted past it. A release build on a
  // *fresh* install put it back on screen and it had the same two defects —
  // step 0's dot on the physical left, and تخطّي on the physical right.
  'components/khazain/onboarding/OnboardingProgress.tsx',
  'components/khazain/onboarding/OnboardingFooter.tsx',
  'components/khazain/onboarding/SelectableRow.tsx',
  'components/khazain/onboarding/QiraaStep.tsx',
  'components/khazain/onboarding/ReciterStep.tsx',
  'components/khazain/onboarding/WelcomeStep.tsx',
  'components/khazain/onboarding/PreviewButton.tsx',
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

describe('onboarding survives the first launch after install', () => {
  // `forceRTL` flips the layout direction on the very first launch, which
  // recreates the activity. A native-driven Animated value lives outside the
  // shadow tree, so the remounted view came back holding the last style JS had
  // rendered — `anim.setValue(1)`, i.e. opacity 0 — and the animation had
  // already run, so nothing ever corrected it. Step 0 rendered blank on every
  // fresh install; the text was mounted, just invisible.
  it('drives the step transition from JS, not the native driver', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/useNativeDriver:\s*false/);
    expect(src).not.toMatch(/useNativeDriver:\s*true/);
  });

  // The step area is revealed BY the animation, so an interrupted run must
  // settle to fully-visible rather than leave content parked mid-fade. The
  // first launch froze it at 0.39 until both of these landed.
  it('settles to visible when the run is interrupted', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/if \(!finished\) anim\.setValue\(0\)/);
    expect(src).toMatch(/animation\.stop\(\);\s*anim\.setValue\(0\);/);
  });
});

describe('PreviewBanner', () => {
  const src = code('components/khazain/community/PreviewBanner.tsx');

  it('returns early unless the mode is mock, so mode off renders nothing', () => {
    expect(src).toMatch(/if \(mode !== 'mock'\) return null;/);
  });

  it('is a static text banner, not an alert', () => {
    expect(src).toMatch(/accessibilityRole="text"/);
    expect(src).not.toMatch(/accessibilityRole="alert"/);
  });
});

describe('GroupRow and MemberRow', () => {
  const group = code('components/khazain/community/GroupRow.tsx');
  const member = code('components/khazain/community/MemberRow.tsx');

  it('GroupRow authors its children in GROUP_ROW_ORDER inside a PHYSICAL_ROW', () => {
    expect(group).toMatch(/\.\.\.PHYSICAL_ROW/);
    expect(group).toMatch(/GROUP_ROW_ORDER\.map\(/);
  });

  it('MemberRow pins its row and keeps the name at the physical right', () => {
    expect(member).toMatch(/\.\.\.PHYSICAL_ROW/);
    expect(member).toMatch(/\.\.\.RTL_TEXT/);
  });

  it('freezes the group row order left to right', () => {
    expect(GROUP_ROW_ORDER).toEqual(['disclosure', 'text', 'progress']);
  });
});

describe('PostRow and Composer', () => {
  const post = code('components/khazain/community/PostRow.tsx');
  const composer = code('components/khazain/community/Composer.tsx');

  it('PostRow authors its children in COMMUNITY_POST_ORDER inside a PHYSICAL_ROW', () => {
    expect(post).toMatch(/\.\.\.PHYSICAL_ROW/);
    expect(post).toMatch(/COMMUNITY_POST_ORDER\.map\(/);
    expect(post).toMatch(/\.\.\.RTL_TEXT/);
  });

  it('Composer authors its children in COMPOSER_ORDER inside a PHYSICAL_ROW', () => {
    expect(composer).toMatch(/\.\.\.PHYSICAL_ROW/);
    expect(composer).toMatch(/COMPOSER_ORDER\.map\(/);
    expect(composer).toMatch(/\.\.\.PHYSICAL_BOX/);
  });

  it('freezes the post and composer orders left to right', () => {
    expect(COMMUNITY_POST_ORDER).toEqual(['actions', 'text', 'avatar']);
    expect(COMPOSER_ORDER).toEqual(['send', 'field']);
    expect(Object.isFrozen(COMMUNITY_POST_ORDER)).toBe(true);
    expect(Object.isFrozen(COMPOSER_ORDER)).toBe(true);
  });
});
