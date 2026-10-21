import fs from 'fs';
import path from 'path';

import {
  LEGACY_ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEPS,
} from '@/constants/settings';

const ROOT = path.resolve(__dirname, '..');
/** Source with comments stripped, so prose mentions do not satisfy a contract. */
const code = (f: string) =>
  fs
    .readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('onboarding step list (ticket QTQYqLBB: 3-4 screens)', () => {
  it('is exactly welcome → qiraa → reciter → channels', () => {
    expect(ONBOARDING_STEPS).toEqual(['welcome', 'qiraa', 'reciter', 'channels']);
  });
  it('derives the count from the list and stays within the card', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(ONBOARDING_STEPS.length);
    expect(ONBOARDING_STEP_COUNT).toBeGreaterThanOrEqual(3);
    // ALSO protects the legacy resume remap in settingsStore: it relies on old
    // indices 0-2 keeping their meaning and every old index ≥ COUNT landing on
    // the last step. Growing past 4 means revisiting coerceSettings.
    expect(ONBOARDING_STEP_COUNT).toBeLessThanOrEqual(4);
  });
  it('remembers the 8-step layout older installs persisted against', () => {
    expect(LEGACY_ONBOARDING_STEP_COUNT).toBe(8);
  });
  it('is frozen', () => {
    expect(Object.isFrozen(ONBOARDING_STEPS)).toBe(true);
  });
});

describe('four-screen flow', () => {
  it('renders by step id with one case per id and no feature screens', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/ONBOARDING_STEPS\[step\]/);
    for (const id of ['welcome', 'qiraa', 'reciter', 'channels']) {
      expect(src).toMatch(new RegExp(`case '${id}':`));
    }
    expect(src).not.toMatch(/FEATURE_STEPS|FeatureStep/);
  });
  it('keeps the JS-driven, reduce-motion-aware 280ms transition', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/SLIDE_DURATION = 280/);
    expect(src).toMatch(/isReduceMotionEnabled/);
  });
  it('FeatureStep is deleted and gone from the barrel', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/khazain/onboarding/FeatureStep.tsx'))).toBe(false);
    expect(code('components/khazain/onboarding/index.ts')).not.toMatch(/FeatureStep/);
  });
  it('Welcome carries four highlights as RTL physical rows and keeps FoundationMark', () => {
    const src = code('components/khazain/onboarding/WelcomeStep.tsx');
    expect(src.match(/key: '/g)).toHaveLength(4);
    expect(src).toMatch(/WELCOME_HIGHLIGHTS\.map/);
    expect(src).toMatch(/\.\.\.PHYSICAL_ROW/);
    expect(src).toMatch(/\.\.\.RTL_TEXT/);
    expect(src).toMatch(/FoundationMark/); // Q6: user-approved deviation from "LogoBadge"
  });
});

describe('selectable row with a preview control', () => {
  const row = () => code('components/khazain/onboarding/SelectableRow.tsx');
  it('renders slots from SELECTABLE_ROW_ORDER inside a PHYSICAL_ROW', () => {
    expect(row()).toMatch(/SELECTABLE_ROW_ORDER\.map/);
    expect(row()).toMatch(/\.\.\.PHYSICAL_ROW/);
  });
  it('the preview control is a SIBLING of the radio Pressable (VoiceOver can reach it)', () => {
    expect(row().match(/<Pressable/g)).toHaveLength(1);
    expect(row()).toMatch(/accessibilityRole="radio"/);
  });
  it('padding and minHeight stay on the select Pressable; the card View carries only chrome', () => {
    const src = row();
    const card = /card:\s*\{([^}]*)\}/.exec(src)?.[1] ?? '';
    const select = /select:\s*\{([^}]*)\}/.exec(src)?.[1] ?? '';
    expect(select).toMatch(/minHeight:\s*64/);
    expect(select).toMatch(/paddingVertical:\s*12/);
    expect(select).toMatch(/paddingHorizontal:\s*16/);
    expect(card).not.toMatch(/padding|minHeight/);
    expect(card).toMatch(/borderRadius:\s*16/);
    expect(card).toMatch(/backgroundColor/);
  });
  it('PreviewButton is a labelled 44pt button with busy state', () => {
    const src = code('components/khazain/onboarding/PreviewButton.tsx');
    expect(src).toMatch(/accessibilityRole="button"/);
    expect(src).toMatch(/MIN_TOUCH_TARGET/);
    expect(src).toMatch(/busy/);
    expect(src).toMatch(/إيقاف العيّنة/);
    expect(src).toMatch(/استماع إلى عيّنة من تلاوة/);
  });
});
