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
  describe('pixel parity with the 0635ea1 row (A3)', () => {
    /** Body of one `StyleSheet.create` entry, matched on the whole key. */
    const style = (src: string, key: string) =>
      new RegExp(`\\b${key}:\\s*\\{([^}]*)\\}`).exec(src)?.[1] ?? '';

    it('one BORDER constant carries both widths', () => {
      expect(row()).toMatch(/const BORDER = \{ idle: 1, selected: 1\.5 \} as const;/);
    });
    it('the card carries background, radius and minHeight 64 but no border', () => {
      // Yoga applies minHeight to the border-box; with no border on the card
      // its height is max(64, 2 * border + 24 + content), the base row's.
      const card = style(row(), 'card');
      expect(card).toMatch(/minHeight:\s*64/);
      expect(card).toMatch(/borderRadius:\s*16/);
      expect(card).toMatch(/backgroundColor/);
      expect(card).not.toMatch(/border(Width|Color)/);
      expect(card).not.toMatch(/padding/);
    });
    it('the border is a non-interactive overlay frame drawn after the slots', () => {
      const src = row();
      const frame = style(src, 'frame');
      const frameSelected = style(src, 'frameSelected');
      expect(frame).toMatch(/\.\.\.StyleSheet\.absoluteFillObject/);
      expect(frame).toMatch(/borderRadius:\s*16/);
      expect(frame).toMatch(/borderWidth:\s*BORDER\.idle\b/);
      expect(frameSelected).toMatch(/borderWidth:\s*BORDER\.selected\b/);
      expect(frameSelected).toMatch(/borderColor:\s*KhazainColors\.goldAccent/);
      const overlay = /<View\s+pointerEvents="none"[^>]*styles\.frame[^>]*\/>/.exec(src)?.[0] ?? '';
      expect(overlay).not.toBe('');
      expect(overlay).toMatch(/accessible=\{false\}/);
      expect(overlay).toMatch(/importantForAccessibility="no-hide-descendants"/);
      expect(src.indexOf('SELECTABLE_ROW_ORDER.map')).toBeLessThan(src.indexOf(overlay));
    });
    it('the radio pads by 12 / 16 plus the border, so its origin stays on the pixel grid', () => {
      const src = row();
      const select = style(src, 'select');
      expect(select).not.toMatch(/minHeight|padding/);
      expect(select).toMatch(/alignSelf:\s*'stretch'/);
      for (const [key, w] of [['selectIdle', 'idle'], ['selectSelected', 'selected']]) {
        const inset = style(src, key);
        expect(inset).toMatch(new RegExp(`paddingVertical:\\s*12 \\+ BORDER\\.${w}\\b`));
        expect(inset).toMatch(new RegExp(`paddingHorizontal:\\s*16 \\+ BORDER\\.${w}\\b`));
      }
    });
    it('the preview keeps its 12pt inset inside the border', () => {
      const src = row();
      expect(style(src, 'previewSlot')).toMatch(/marginLeft:\s*12 \+ BORDER\.idle\b/);
      expect(style(src, 'previewSlotSelected')).toMatch(/marginLeft:\s*12 \+ BORDER\.selected\b/);
    });
  });
  it('PreviewButton is a labelled 44pt button with busy state', () => {
    const src = code('components/khazain/onboarding/PreviewButton.tsx');
    expect(src).toMatch(/accessibilityRole="button"/);
    expect(src).toMatch(/MIN_TOUCH_TARGET/);
    expect(src).toMatch(/busy/);
    // Both labels name the reciter, so VoiceOver says whose sample it stops.
    expect(src).toMatch(/`إيقاف عيّنة تلاوة \$\{reciterName\}`/);
    expect(src).toMatch(/`استماع إلى عيّنة من تلاوة \$\{reciterName\}`/);
  });
});

describe('reciter step previews (ticket QTQYqLBB: popular reciters with audio previews)', () => {
  const step = () => code('components/khazain/onboarding/ReciterStep.tsx');
  it('lists the verified reciters (plus the current pick), not the whole catalogue', () => {
    expect(step()).toMatch(/selectOnboardingReciters\(/);
    expect(step()).toMatch(/ONBOARDING_POPULAR_RECITER_IDS/);
  });
  it('renders a preview control only when the reciter can be previewed', () => {
    expect(step()).toMatch(/canPreview\(/);
    expect(step()).toMatch(/toggleReciterPreview\(/);
  });
  it('stops the preview on unmount', () => {
    expect(step()).toMatch(/useEffect\(\(\) => \(\) => \{\s*void stopPreview\(\);\s*\},\s*\[\]\)/);
  });
  it('stops the preview when the app leaves the foreground', () => {
    expect(step()).toMatch(/AppState\.addEventListener\('change'/);
  });
  it('no longer claims previews are deferred', () => {
    expect(
      fs.readFileSync(path.join(ROOT, 'components/khazain/onboarding/ReciterStep.tsx'), 'utf8'),
    ).not.toMatch(/deferred \(FR-006\)/);
  });
  it('the screen stops any preview first thing on step change and on finish (skip → finish)', () => {
    const src = code('app/onboarding.tsx');
    expect(src).toMatch(/const goTo = [^{]*\{\s*void stopPreview\(\);/);
    expect(src).toMatch(/const finish = [^{]*\{\s*void stopPreview\(\);/);
  });
});
